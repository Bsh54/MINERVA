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
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-teal-900 flex flex-col">

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6 bg-gradient-to-b from-black/50 to-transparent">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/80 hover:text-white font-bold transition-colors">
          <ChevronLeft className="w-5 h-5" />
          {t('backHub')}
        </Link>
      </div>

      {/* Main Avatar Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">

          {/* Outer Glow Ring */}
          <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
            status === 'online'
              ? 'bg-gradient-to-br from-purple-500/30 via-blue-500/30 to-teal-500/30 blur-3xl scale-150 animate-pulse'
              : 'bg-white/5 blur-2xl scale-125'
          }`}></div>

          {/* Avatar Container */}
          <div className={`relative w-80 h-80 md:w-96 md:h-96 rounded-full bg-gradient-to-br from-purple-400 via-blue-500 to-teal-400 p-2 transition-all duration-500 ${
            status === 'online' ? 'shadow-2xl shadow-purple-500/50' : 'shadow-xl'
          }`}>
            <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center relative overflow-hidden">

              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500"></div>
              </div>

              {/* Main Avatar Icon */}
              <div className="relative z-10">
                <Sparkles className={`w-32 h-32 md:w-40 md:h-40 transition-all duration-500 ${
                  status === 'online' ? 'text-purple-400' : 'text-gray-600'
                }`} />
              </div>

              {/* Speaking Pulse Effect */}
              {status === 'online' && isSpeaking && (
                <>
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" style={{ animationDelay: '0.2s' }}></div>
                </>
              )}

              {/* Audio Visualization Bars */}
              {status === 'online' && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 bg-gradient-to-t from-purple-400 via-blue-400 to-teal-400 rounded-full transition-all duration-100"
                      style={{
                        height: `${Math.max(8, (audioLevel / 100) * 48 * (1 + Math.sin(Date.now() / 80 + i * 0.5)))}px`,
                        opacity: 0.8 + (audioLevel / 200)
                      }}
                    ></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-sm font-bold shadow-2xl backdrop-blur-md ${
            status === 'offline' ? 'bg-gray-800/90 text-gray-300' :
            status === 'connecting' ? 'bg-yellow-500/90 text-gray-900' :
            'bg-green-500/90 text-white'
          }`}>
            {status === 'offline' && (locale === 'fr' ? 'Hors ligne' : 'Offline')}
            {status === 'connecting' && (locale === 'fr' ? 'Connexion...' : 'Connecting...')}
            {status === 'online' && (locale === 'fr' ? 'En ligne' : 'Online')}
          </div>
        </div>
      </div>

      {/* AI Name */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-64 md:translate-y-72 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white font-display mb-2 drop-shadow-lg">
          MINERVA AI
        </h2>
        <p className="text-white/70 font-medium">
          {locale === 'fr' ? 'Votre tuteur STEM personnel' : 'Your personal STEM tutor'}
        </p>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/50 to-transparent">
        <div className="max-w-2xl mx-auto">

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/90 backdrop-blur-md text-white border border-red-400 rounded-2xl text-sm font-medium text-center">
              {error}
            </div>
          )}

          {/* Audio Level Indicator */}
          {status === 'online' && (
            <div className="mb-6 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <Mic className="w-5 h-5 text-white" />
                <span className="text-sm font-bold text-white">
                  {locale === 'fr' ? 'Votre microphone' : 'Your microphone'}
                </span>
              </div>
              <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 via-blue-400 to-teal-400 transition-all duration-100 rounded-full"
                  style={{ width: `${audioLevel}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Main Control Button */}
          <div className="flex justify-center">
            {status === 'offline' ? (
              <button
                onClick={startMeeting}
                className="btn-3d bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-extrabold py-5 px-12 rounded-full shadow-2xl flex items-center justify-center gap-3 text-lg"
              >
                <Phone className="w-6 h-6" />
                {locale === 'fr' ? 'Démarrer l\'appel' : 'Start Call'}
              </button>
            ) : status === 'connecting' ? (
              <button
                disabled
                className="bg-white/20 backdrop-blur-md text-white font-extrabold py-5 px-12 rounded-full flex items-center justify-center gap-3 text-lg cursor-not-allowed"
              >
                <Loader2 className="w-6 h-6 animate-spin" />
                {locale === 'fr' ? 'Connexion...' : 'Connecting...'}
              </button>
            ) : (
              <button
                onClick={stopMeeting}
                className="btn-3d bg-red-600 hover:bg-red-700 text-white font-extrabold py-5 px-12 rounded-full shadow-2xl flex items-center justify-center gap-3 text-lg"
              >
                <PhoneOff className="w-6 h-6" />
                {locale === 'fr' ? 'Raccrocher' : 'End Call'}
              </button>
            )}
          </div>

          {/* Hint Text */}
          {status === 'offline' && (
            <p className="text-center text-white/60 text-sm font-medium mt-6">
              {locale === 'fr'
                ? 'Cliquez pour commencer une conversation vocale avec votre tuteur IA'
                : 'Click to start a voice conversation with your AI tutor'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
