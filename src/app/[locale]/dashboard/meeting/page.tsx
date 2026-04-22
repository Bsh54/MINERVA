'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, Mic, Loader2, Phone, PhoneOff } from 'lucide-react';
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
      console.error('[MEETING] Audio playback error:', err);
    }
  };

  const startAudioCapture = async () => {
    try {
      console.log('[MEETING] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('[MEETING] Microphone access granted');

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
      console.log('[MEETING] Audio pipeline connected');

    } catch (err: any) {
      console.error('[MEETING] Microphone error:', err);
      setError(`Impossible d'accéder au microphone: ${err.message}`);
    }
  };

  const startMeeting = async () => {
    try {
      console.log('[MEETING] Starting meeting...');
      stopMeeting();

      setStatus('connecting');
      setError(null);

      console.log('[MEETING] Fetching config from:', API_URL);
      const response = await fetch(API_URL);
      console.log('[MEETING] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const { wsUrl, apiKey } = await response.json();
      console.log('[MEETING] Config received:', { wsUrl: wsUrl?.substring(0, 50), hasApiKey: !!apiKey });

      if (!wsUrl || !apiKey) {
        throw new Error('Configuration WebSocket manquante');
      }

      const wsUrlWithKey = `${wsUrl}&api-key=${encodeURIComponent(apiKey)}`;
      console.log('[MEETING] Connecting to WebSocket...');
      wsRef.current = new WebSocket(wsUrlWithKey);

      wsRef.current.onopen = () => {
        console.log('[MEETING] WebSocket connected!');
        const sessionConfig = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            voice: "alloy",
            instructions: locale === 'fr'
              ? "Tu es MINERVA, un tuteur STEM amical et pédagogue. Aide les étudiants à comprendre les concepts scientifiques de manière claire et concise. Réponds en français de façon naturelle et encourageante."
              : "You are MINERVA, a friendly and pedagogical STEM tutor. Help students understand scientific concepts clearly and concisely. Respond in English naturally and encouragingly.",
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

        console.log('[MEETING] Sending session config...');
        wsRef.current?.send(JSON.stringify(sessionConfig));
        setStatus('online');
        console.log('[MEETING] Starting audio capture...');
        startAudioCapture();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[MEETING] Message received:', message.type);

          switch (message.type) {
            case "session.created":
            case "session.updated":
              console.log('[MEETING] Session configured');
              break;

            case "response.audio.delta":
              if (message.delta) {
                playAudioChunk(message.delta);
              }
              break;

            case "conversation.item.input_audio_transcription.completed":
              if (message.transcript) {
                console.log('[MEETING] User transcript:', message.transcript);
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
              console.log('[MEETING] Speech started');
              stopAllAudio();
              setIsSpeaking(true);
              break;

            case "input_audio_buffer.speech_stopped":
              console.log('[MEETING] Speech stopped');
              setIsSpeaking(false);
              break;

            case "response.created":
              console.log('[MEETING] AI response created');
              stopAllAudio();
              break;

            case "error":
              console.error('[MEETING] Error from server:', message.error);
              setError(message.error?.message || 'Erreur inconnue');
              break;
          }
        } catch (e) {
          console.error('[MEETING] Error parsing message:', e);
        }
      };

      wsRef.current.onerror = (err) => {
        console.error('[MEETING] WebSocket error:', err);
        setError('Erreur de connexion WebSocket');
      };

      wsRef.current.onclose = () => {
        console.log('[MEETING] WebSocket closed');
        setStatus('offline');
      };

    } catch (error: any) {
      console.error('[MEETING] Error in startMeeting:', error);
      setError(error.message);
      setStatus('offline');
    }
  };

  const stopMeeting = () => {
    console.log('[MEETING] Stopping meeting');
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
    <div className="min-h-screen bg-gradient-to-br from-stem-50 via-white to-accent-50 flex flex-col">

      {/* Top Bar */}
      <div className="p-4 md:p-6 bg-white/80 backdrop-blur-md border-b border-stem-100">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-semibold transition-colors duration-200">
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">{t('backHub')}</span>
          </Link>

          {status === 'online' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-green-700">
                {locale === 'fr' ? 'En ligne' : 'Online'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-lg">

          {/* Avatar Container */}
          <div className="relative mb-6">

            {/* Avatar Image */}
            <div className={`relative w-32 h-32 md:w-40 md:h-40 mx-auto rounded-full overflow-hidden transition-all duration-500 ${
              status === 'online'
                ? 'ring-4 ring-accent-500/50 shadow-xl shadow-accent-500/20'
                : 'ring-2 ring-stem-200'
            }`}>

              {/* Background Glow */}
              {status === 'online' && (
                <div className="absolute inset-0 bg-gradient-to-br from-accent-500/10 via-stem-500/10 to-accent-500/10 animate-pulse"></div>
              )}

              {/* Avatar Image */}
              <img
                src="https://api.dicebear.com/7.x/bottts-neutral/svg?seed=MINERVA&backgroundColor=f8fafc&scale=90"
                alt="MINERVA AI Avatar"
                className="w-full h-full object-cover"
              />

              {/* Speaking Indicator Overlay */}
              {status === 'online' && isSpeaking && (
                <div className="absolute inset-0 bg-accent-500/10 animate-pulse"></div>
              )}

              {/* Audio Visualization */}
              {status === 'online' && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-accent-500 to-stem-500 rounded-full transition-all duration-100"
                      style={{
                        height: `${Math.max(4, (audioLevel / 100) * 24 * (1 + Math.sin(Date.now() / 60 + i * 0.4)))}px`,
                        opacity: 0.7 + (audioLevel / 300)
                      }}
                    ></div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-300 ${
              status === 'offline' ? 'bg-stem-100 border-stem-200 text-stem-600' :
              status === 'connecting' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 animate-pulse' :
              'bg-green-50 border-green-200 text-green-700'
            }`}>
              {status === 'offline' && (locale === 'fr' ? 'Hors ligne' : 'Offline')}
              {status === 'connecting' && (locale === 'fr' ? 'Connexion...' : 'Connecting...')}
              {status === 'online' && (locale === 'fr' ? 'En ligne' : 'Online')}
            </div>
          </div>

          {/* AI Name & Description */}
          <div className="text-center mb-6 mt-6">
            <h1 className="text-3xl md:text-4xl font-extrabold text-stem-900 font-display mb-2">
              MINERVA
            </h1>
            <p className="text-sm md:text-base text-stem-600 font-medium">
              {locale === 'fr' ? 'Votre tuteur STEM personnel' : 'Your personal STEM tutor'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium text-center">
              {error}
            </div>
          )}

          {/* Audio Level Indicator */}
          {status === 'online' && (
            <div className="mb-4 bg-white rounded-xl p-4 border border-stem-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-4 h-4 text-accent-500" />
                <span className="text-sm font-semibold text-stem-900">
                  {locale === 'fr' ? 'Votre microphone' : 'Your microphone'}
                </span>
                <span className="ml-auto text-xs font-mono text-stem-500">
                  {audioLevel.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-stem-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-500 to-stem-500 transition-all duration-100 rounded-full"
                  style={{ width: `${audioLevel}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Control Button */}
          <div className="flex justify-center">
            {status === 'offline' ? (
              <button
                onClick={startMeeting}
                className="group relative px-6 py-3 bg-gradient-to-r from-accent-500 to-stem-500 hover:from-accent-600 hover:to-stem-600 text-white font-bold rounded-full shadow-lg shadow-accent-500/20 transition-all duration-200 flex items-center gap-2 text-base"
              >
                <Phone className="w-5 h-5" />
                {locale === 'fr' ? 'Démarrer l\'appel' : 'Start Call'}
              </button>
            ) : status === 'connecting' ? (
              <button
                disabled
                className="px-6 py-3 bg-stem-200 text-stem-500 font-bold rounded-full flex items-center gap-2 text-base cursor-not-allowed"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                {locale === 'fr' ? 'Connexion...' : 'Connecting...'}
              </button>
            ) : (
              <button
                onClick={stopMeeting}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full shadow-lg shadow-red-500/20 transition-all duration-200 flex items-center gap-2 text-base"
              >
                <PhoneOff className="w-5 h-5" />
                {locale === 'fr' ? 'Raccrocher' : 'End Call'}
              </button>
            )}
          </div>

          {/* Hint Text */}
          {status === 'offline' && (
            <p className="text-center text-stem-500 text-xs md:text-sm font-medium mt-4 max-w-md mx-auto">
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
