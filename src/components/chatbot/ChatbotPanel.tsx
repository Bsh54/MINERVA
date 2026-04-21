'use client';

import { useChatbot } from '@/contexts/ChatbotContext';
import { X, Send, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function ChatbotPanel() {
  const { messages, isOpen, displayMode, isLoading, sendMessage, toggleOpen, setDisplayMode, clearHistory } = useChatbot();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const isResizable = displayMode === 'resizable';

  return (
    <div
      className={`fixed bg-white shadow-2xl border border-stem-200 flex flex-col z-50 transition-all ${
        isResizable
          ? 'top-20 right-6 bottom-6 w-[700px] rounded-2xl'
          : 'bottom-28 right-6 w-[450px] h-[700px] rounded-2xl md:bottom-6'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stem-100 bg-gradient-to-r from-stem-600 to-stem-800 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <div>
            <h3 className="font-bold text-white">Assistant MINERVA</h3>
            <p className="text-xs text-white/80">Posez vos questions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearHistory}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Effacer l'historique"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>

          {/* Desktop only: toggle resizable mode */}
          <button
            onClick={() => setDisplayMode(isResizable ? 'panel' : 'resizable')}
            className="hidden md:block p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={isResizable ? 'Mode panneau' : 'Mode redimensionnable'}
          >
            {isResizable ? (
              <Minimize2 className="w-4 h-4 text-white" />
            ) : (
              <Maximize2 className="w-4 h-4 text-white" />
            )}
          </button>

          <button
            onClick={toggleOpen}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-stem-400 py-12">
            <p className="font-medium mb-2">Bonjour ! 👋</p>
            <p className="text-sm">Comment puis-je vous aider aujourd'hui ?</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-stem-600 text-white'
                  : 'bg-stem-50 text-stem-900 border border-stem-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-stem-50 border border-stem-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-stem-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-stem-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-stem-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-stem-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tapez votre message..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-stem-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stem-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-stem-600 hover:bg-stem-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
