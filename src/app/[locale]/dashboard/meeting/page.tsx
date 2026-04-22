'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, Mic, MicOff, Loader2, Phone, PhoneOff, Sparkles, Volume2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export default function MeetingPage() {
  const t = useTranslations('Dashboard');
  const params = useParams();
  const locale = params.locale as string;

  const [status, setStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const currentAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const API_URL = 'https://shads229-meetme.hf.space/api/config';

  const stopAllAudio = () => {
    currentAudioSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });
    currentAudioSourcesRef.current = [];
  };

  const playAudioChunk = (base64Audio: string) => {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        return;
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const audioBuffer = audioContextRef.current.createBuffer(1, pcm16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }

      const bufferSource = audioContextRef.current.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(audioContextRef.current.destination);
      bufferSource.start();

      currentAudioSourcesRef.current.push(bufferSource);
      bufferSource.onended = () => {
        const index = currentAudioSourcesRef.current.indexOf(bufferSource);
        if (index > -1) {
          currentAudioSourcesRef.current.splice(index, 1);
        }
      };
    } catch (err) {
      console.error('Erreur lecture audio:', err);
    }
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          sum += Math.abs(s);
        }
        const avgLevel = sum / inputData.length;
        setAudioLevel(Math.min(avgLevel * 1000, 100));

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
          wsRef.current.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: base64Audio
          }));
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

    } catch (err: any) {
      setError(`Impossible d'accéder au microphone: ${err.message}`);
    }
  };

  const startMeeting = async () => {
    try {
      stopMeeting();

      setStatus('connecting');
      setError(null);

      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const { wsUrl, apiKey } = await response.json();

      if (!wsUrl || !apiKey) {
        throw new Error('Configuration WebSocket manquante');
      }

      const wsUrlWithKey = `${wsUrl}&api-key=${encodeURIComponent(apiKey)}`;
      wsRef.current = new WebSocket(wsUrlWithKey);

      wsRef.current.onopen = () => {
        const sessionConfig = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            voice: "alloy",
            instructions: locale === 'fr'
              ? "Tu es un tuteur STEM amical et pédagogue pour la plateforme MINERVA. Aide les étudiants à comprendre les concepts scientifiques de manière claire et concise. Réponds en français de façon naturelle et encourageante."
              : "You are a friendly and pedagogical STEM tutor for the MINERVA platform. Help students understand scientific concepts clearly and concisely. Respond in English naturally and encouragingly.",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        };

        wsRef.current?.send(JSON.stringify(sessionConfig));
        setStatus('online');
        startAudioCapture();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case "response.audio.delta":
              if (message.delta) {
                playAudioChunk(message.delta);
              }
              break;

            case "conversation.item.input_audio_transcription.completed":
              if (message.transcript) {
                setTranscript(prev => [...prev, {
                  role: 'user',
                  text: message.transcript,
                  timestamp: Date.now()
                }]);
              }
              break;

            case "response.audio_transcript.delta":
            case "response.text.delta":
              if (message.delta) {
                setTranscript(prev => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant' && Date.now() - lastMsg.timestamp < 1000) {
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMsg, text: lastMsg.text + message.delta }
                    ];
                  }
                  return [...prev, {
                    role: 'assistant',
                    text: message.delta,
                    timestamp: Date.now()
                  }];
                });
              }
              break;

            case "input_audio_buffer.speech_started":
              stopAllAudio();
              setIsSpeaking(true);
              break;

            case "input_audio_buffer.speech_stopped":
              setIsSpeaking(false);
              break;

            case "response.created":
              stopAllAudio();
              break;

            case "error":
              setError(message.error?.message || 'Erreur inconnue');
              break;
          }
        } catch (e) {
          console.error('Erreur parsing message:', e);
        }
      };

      wsRef.current.onerror = () => {
        setError('Erreur de connexion WebSocket');
      };

      wsRef.current.onclose = () => {
        setStatus('offline');
      };

    } catch (error: any) {
      setError(error.message);
      setStatus('offline');
    }
  };

  const stopMeeting = () => {
    stopAllAudio();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setStatus('offline');
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => {
      stopMeeting();
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold mb-8 transition-colors">
        <ChevronLeft className="w-5 h-5" />
        {t('backHub')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Panel - Avatar & Controls */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-3xl shadow-soft border border-purple-100 sticky top-8">

            {/* AI Avatar */}
            <div className="relative mb-8">
              <div className={`w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-purple-400 via-blue-500 to-teal-400 p-1 transition-all duration-300 ${
                status === 'online' ? 'animate-pulse shadow-2xl' : ''
              }`}>
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center relative overflow-hidden">
                  {/* Avatar Face */}
                  <div className="relative">
                    <Sparkles className={`w-20 h-20 transition-all duration-300 ${
                      status === 'online' ? 'text-purple-500' : 'text-gray-300'
                    }`} />

                    {/* Speaking Animation */}
                    {status === 'online' && isSpeaking && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-purple-400/20 animate-ping"></div>
                      </div>
                    )}
                  </div>

                  {/* Audio Waves */}
                  {status === 'online' && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-gradient-to-t from-purple-500 to-blue-500 rounded-full transition-all duration-150"
                          style={{
                            height: `${Math.max(4, (audioLevel / 100) * 32 * (1 + Math.sin(Date.now() / 100 + i)))}px`
                          }}
                        ></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg ${
                status === 'offline' ? 'bg-gray-200 text-gray-600' :
                status === 'connecting' ? 'bg-yellow-400 text-gray-900' :
                'bg-green-500 text-white'
              }`}>
                {status === 'offline' && (locale === 'fr' ? 'Hors ligne' : 'Offline')}
                {status === 'connecting' && (locale === 'fr' ? 'Connexion...' : 'Connecting...')}
                {status === 'online' && (locale === 'fr' ? 'En ligne' : 'Online')}
              </div>
            </div>

            {/* AI Name */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold text-stem-900 font-display mb-1">
                MINERVA AI
              </h2>
              <p className="text-sm text-stem-600 font-medium">
                {locale === 'fr' ? 'Votre tuteur STEM personnel' : 'Your personal STEM tutor'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Controls */}
            <div className="space-y-3">
              {status === 'offline' ? (
                <button
                  onClick={startMeeting}
                  className="w-full btn-3d bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3"
                >
                  <Phone className="w-5 h-5" />
                  {locale === 'fr' ? 'Démarrer la conversation' : 'Start Conversation'}
                </button>
              ) : status === 'connecting' ? (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-600 font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 cursor-not-allowed"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {locale === 'fr' ? 'Connexion...' : 'Connecting...'}
                </button>
              ) : (
                <button
                  onClick={stopMeeting}
                  className="w-full btn-3d bg-red-500 hover:bg-red-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3"
                >
                  <PhoneOff className="w-5 h-5" />
                  {locale === 'fr' ? 'Terminer' : 'End Call'}
                </button>
              )}

              {/* Audio Level Indicator */}
              {status === 'online' && (
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-stem-900">
                      {locale === 'fr' ? 'Votre micro' : 'Your microphone'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-100 rounded-full"
                      style={{ width: `${audioLevel}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-purple-100">
              <p className="text-xs text-stem-600 font-medium leading-relaxed">
                {locale === 'fr'
                  ? 'Posez vos questions STEM naturellement. L\'IA vous écoute et répond en temps réel.'
                  : 'Ask your STEM questions naturally. The AI listens and responds in real-time.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Transcript */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-8 min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h3 className="text-2xl font-extrabold text-stem-900 font-display">
                {locale === 'fr' ? 'Conversation' : 'Conversation'}
              </h3>
              {transcript.length > 0 && (
                <button
                  onClick={() => setTranscript([])}
                  className="text-xs font-bold text-stem-600 hover:text-stem-900 px-3 py-1.5 bg-stem-50 rounded-lg hover:bg-stem-100 transition-colors"
                >
                  {locale === 'fr' ? 'Effacer' : 'Clear'}
                </button>
              )}
            </div>

            {/* Transcript Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Volume2 className="w-10 h-10 text-purple-500" />
                  </div>
                  <p className="text-stem-600 font-medium max-w-md">
                    {locale === 'fr'
                      ? 'Démarrez la conversation pour voir la transcription apparaître ici en temps réel.'
                      : 'Start the conversation to see the transcript appear here in real-time.'}
                  </p>
                </div>
              ) : (
                transcript.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                          : 'bg-stem-50 text-stem-900 border border-stem-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold opacity-70">
                          {msg.role === 'user'
                            ? (locale === 'fr' ? 'Vous' : 'You')
                            : 'MINERVA AI'}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
