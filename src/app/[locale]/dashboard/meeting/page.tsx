'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, Mic, Loader2, PhoneOff, Volume2, AlertCircle } from 'lucide-react';
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
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const API_URL = 'https://shads229-meetme.hf.space/api/config';

  const stopAllAudio = () => {
    currentAudioSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });
    currentAudioSourcesRef.current = [];
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const playAudioChunk = (base64Audio: string) => {
    audioQueueRef.current.push(base64Audio);
    if (!isPlayingRef.current) {
      processAudioQueue();
    }
  };

  const processAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const base64Audio = audioQueueRef.current.shift();
      if (!base64Audio) continue;

      try {
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const pcm16 = new Int16Array(bytes.buffer);

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          break;
        }

        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        const audioBuffer = audioContextRef.current.createBuffer(1, pcm16.length, 24000);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < pcm16.length; i++) {
          channelData[i] = pcm16[i] / 32768.0;
        }

        const bufferSource = audioContextRef.current.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(audioContextRef.current.destination);

        const currentTime = audioContextRef.current.currentTime;
        const startTime = Math.max(currentTime, nextPlayTimeRef.current);
        bufferSource.start(startTime);
        nextPlayTimeRef.current = startTime + audioBuffer.duration;

        currentAudioSourcesRef.current.push(bufferSource);

        await new Promise(resolve => {
          bufferSource.onended = () => {
            const index = currentAudioSourcesRef.current.indexOf(bufferSource);
            if (index > -1) {
              currentAudioSourcesRef.current.splice(index, 1);
            }
            resolve(null);
          };
        });
      } catch (err) {
        console.error('[MEETING] Audio playback error:', err);
      }
    }

    isPlayingRef.current = false;
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
      processorRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1);

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
    nextPlayTimeRef.current = 0;

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
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-stem-50 via-white to-accent-50">

      {/* Header */}
      <div className="shrink-0 border-b bg-white/80 backdrop-blur-md px-4 md:px-6 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-semibold transition-colors duration-200">
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">{t('backHub')}</span>
            </Link>
            <div className="hidden md:block h-5 w-px bg-stem-200"></div>
            <h1 className="hidden md:block text-lg font-bold text-stem-900">MINERVA Voice</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              status === 'online'
                ? 'bg-green-50 border-green-200 text-green-700'
                : status === 'connecting'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                : 'bg-stem-100 border-stem-200 text-stem-600'
            }`}>
              {status === 'online' && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
              {status === 'offline' && (locale === 'fr' ? 'Hors ligne' : 'Offline')}
              {status === 'connecting' && (locale === 'fr' ? 'Connexion...' : 'Connecting...')}
              {status === 'online' && (locale === 'fr' ? 'Connecté' : 'Connected')}
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden">
        <div className="w-full max-w-2xl">

          {/* Voice visualization */}
          <div className="flex flex-col items-center justify-center gap-6 py-8">

            {/* Status indicators */}
            {status === 'connecting' && (
              <div className="flex items-center gap-2 text-stem-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">{locale === 'fr' ? 'Connexion...' : 'Connecting...'}</span>
              </div>
            )}

            {status === 'online' && isSpeaking && (
              <div className="flex items-center gap-2 text-accent-600">
                <Volume2 className="h-5 w-5 animate-pulse" />
                <span className="text-sm font-medium">MINERVA {locale === 'fr' ? 'parle...' : 'is speaking...'}</span>
              </div>
            )}

            {status === 'online' && !isSpeaking && (
              <div className="flex flex-col items-center gap-3">
                {/* Mic icon with fill level */}
                <div className="relative h-16 w-16">
                  <Mic className="absolute inset-0 h-full w-full text-stem-300" />
                  <div
                    className="absolute inset-0 overflow-hidden transition-[clip-path] duration-150 ease-out"
                    style={{ clipPath: `inset(${(1 - audioLevel / 100) * 100}% 0 0 0)` }}
                  >
                    <Mic className="h-full w-full text-accent-500" />
                  </div>
                </div>
                <span className="text-sm font-medium text-accent-600">
                  {locale === 'fr' ? 'À l\'écoute...' : 'Listening...'}
                </span>
              </div>
            )}

            {/* Audio waveform */}
            {status === 'online' && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 20 }).map((_, i) => {
                  const level = isSpeaking ? 0.5 : audioLevel / 100;
                  const barVariance = Math.sin((i + Date.now() / 200) * 0.7) * 0.3 + 0.7;
                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        level > 0.02 ? 'bg-accent-500' : 'bg-stem-200'
                      }`}
                      style={{
                        height: `${8 + level * barVariance * 32}px`,
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* AI Name & Avatar - only when NOT connected or when idle */}
            {status !== 'online' && (
              <>
                <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-stem-200 shadow-lg">
                  <img
                    src="https://api.dicebear.com/7.x/bottts-neutral/svg?seed=MINERVA&backgroundColor=f8fafc&scale=90"
                    alt="MINERVA"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-stem-900 font-display mb-1">
                    MINERVA
                  </h2>
                  <p className="text-sm text-stem-600 font-medium">
                    {locale === 'fr' ? 'Votre tuteur STEM personnel' : 'Your personal STEM tutor'}
                  </p>
                </div>
              </>
            )}

            {/* Control Button */}
            {status === 'offline' ? (
              <button
                onClick={startMeeting}
                className="group relative px-8 py-4 bg-gradient-to-r from-accent-500 to-stem-500 hover:from-accent-600 hover:to-stem-600 text-white font-bold rounded-full shadow-lg shadow-accent-500/20 transition-all duration-200 flex items-center gap-3 text-base"
              >
                <Mic className="w-5 h-5" />
                {locale === 'fr' ? 'Démarrer la conversation' : 'Start Voice Interview'}
              </button>
            ) : status === 'connecting' ? (
              <button
                disabled
                className="px-8 py-4 bg-stem-200 text-stem-500 font-bold rounded-full flex items-center gap-3 text-base cursor-not-allowed"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                {locale === 'fr' ? 'Connexion...' : 'Connecting...'}
              </button>
            ) : (
              <button
                onClick={stopMeeting}
                className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full shadow-lg shadow-red-500/20 transition-all duration-200 flex items-center gap-3 text-base"
              >
                <PhoneOff className="w-5 h-5" />
                {locale === 'fr' ? 'Terminer' : 'End Interview'}
              </button>
            )}

            {/* Hint text */}
            {status === 'offline' && (
              <p className="text-center text-stem-500 text-sm font-medium max-w-md">
                {locale === 'fr'
                  ? 'Cliquez pour commencer une conversation vocale avec votre tuteur IA'
                  : 'Click to start a voice conversation with your AI tutor'}
              </p>
            )}

            {status === 'connecting' && (
              <p className="text-center text-stem-500 text-sm">
                {locale === 'fr'
                  ? 'Connexion à l\'interview. Cela peut prendre quelques secondes.'
                  : 'Connecting to the interview. This can take a few seconds.'}
              </p>
            )}

            {status === 'online' && !isSpeaking && (
              <p className="text-center text-stem-500 text-sm">
                {locale === 'fr'
                  ? 'Parlez naturellement — l\'IA répondra automatiquement'
                  : 'Speak naturally — AI will respond automatically'}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
