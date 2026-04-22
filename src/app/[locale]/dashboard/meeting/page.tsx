'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, Mic, MicOff, Loader2, Phone, PhoneOff } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-stem-600 hover:text-stem-900 font-bold mb-8 transition-colors">
        <ChevronLeft className="w-5 h-5" />
        {t('backHub')}
      </Link>

      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-stem-900 font-display mb-2">
          {locale === 'fr' ? 'Rencontre avec l\'IA' : 'AI Meeting'}
        </h1>
        <p className="text-stem-600 text-lg font-medium">
          {locale === 'fr' ? 'Discutez vocalement avec votre tuteur IA' : 'Talk vocally with your AI tutor'}
        </p>
      </header>

      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-soft border border-gray-100">

        {/* Status Circle */}
        <div className={`w-40 h-40 rounded-full mx-auto mb-8 flex items-center justify-center text-2xl font-bold transition-all ${
          status === 'offline' ? 'bg-gray-200 text-gray-600' :
          status === 'connecting' ? 'bg-yellow-400 text-gray-900 animate-pulse' :
          'bg-green-500 text-white'
        }`}>
          {status === 'offline' && '⚪ Offline'}
          {status === 'connecting' && '🟡 Connecting...'}
          {status === 'online' && '🟢 Online'}
        </div>

        {/* Audio Level */}
        {status === 'online' && (
          <div className="mb-8">
            <div className="text-center text-sm text-stem-600 font-medium mb-2">
              {locale === 'fr' ? 'Niveau audio' : 'Audio level'}: {audioLevel.toFixed(0)}%
            </div>
            <div className="w-full h-3 bg-stem-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-stem-400 to-accent-500 transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Transcript */}
        {transcript.length > 0 && (
          <div className="mb-8 bg-stem-50/50 rounded-2xl p-6 max-h-80 overflow-y-auto">
            <h3 className="font-bold text-stem-900 mb-4">
              {locale === 'fr' ? 'Transcription' : 'Transcript'}
            </h3>
            <div className="space-y-3">
              {transcript.map((msg, idx) => (
                <div key={idx} className={`text-sm ${msg.role === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
                  <strong>{msg.role === 'user' ? (locale === 'fr' ? 'Vous' : 'You') : 'IA'}:</strong> {msg.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {status === 'offline' ? (
            <button
              onClick={startMeeting}
              className="btn-3d bg-stem-600 hover:bg-stem-800 text-white font-extrabold py-4 px-8 rounded-2xl shadow-button-teal flex items-center justify-center gap-3 text-lg"
            >
              <Phone className="w-6 h-6" />
              {locale === 'fr' ? 'Démarrer l\'appel' : 'Start Call'}
            </button>
          ) : status === 'connecting' ? (
            <button
              disabled
              className="btn-3d bg-gray-300 text-gray-600 font-extrabold py-4 px-8 rounded-2xl flex items-center justify-center gap-3 text-lg cursor-not-allowed"
            >
              <Loader2 className="w-6 h-6 animate-spin" />
              {locale === 'fr' ? 'Connexion...' : 'Connecting...'}
            </button>
          ) : (
            <button
              onClick={stopMeeting}
              className="btn-3d bg-red-500 hover:bg-red-600 text-white font-extrabold py-4 px-8 rounded-2xl shadow-button flex items-center justify-center gap-3 text-lg"
            >
              <PhoneOff className="w-6 h-6" />
              {locale === 'fr' ? 'Raccrocher' : 'Hang Up'}
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-stem-500 space-y-1">
          <p>{locale === 'fr' ? 'Cliquez pour démarrer' : 'Click to start'}</p>
          <p>{locale === 'fr' ? 'Autorisez le microphone' : 'Allow microphone access'}</p>
          <p>{locale === 'fr' ? 'Parlez naturellement' : 'Speak naturally'}</p>
        </div>
      </div>
    </div>
  );
}
