'use client';

import { useChatbot } from '@/contexts/ChatbotContext';
import { X, Send, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

// Simple markdown to HTML converter for chat messages
function formatMarkdown(text: string): string {
  if (!text) return '';

  let html = text;

  // Code blocks (before inline code) - protect them from further processing
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODEBLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre class="bg-stem-100 p-3 rounded-lg my-2 overflow-x-auto"><code>${code}</code></pre>`);
    return placeholder;
  });

  // Inline code - protect from further processing
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `__INLINECODE_${inlineCodes.length}__`;
    inlineCodes.push(`<code class="bg-stem-100 px-1.5 py-0.5 rounded text-sm font-mono">${code}</code>`);
    return placeholder;
  });

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bold (non-greedy to avoid capturing too much)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>');

  // Italic (non-greedy, avoid matching ** for bold)
  html = html.replace(/\*([^*]+?)\*/g, '<em class="italic">$1</em>');

  // Restore inline code
  inlineCodes.forEach((code, i) => {
    html = html.replace(`__INLINECODE_${i}__`, code);
  });

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODEBLOCK_${i}__`, block);
  });

  // Line breaks
  html = html.replace(/\n/g, '<br />');

  return html;
}

export default function ChatbotPanel() {
  const { messages, isOpen, displayMode, isLoading, sendMessage, toggleOpen, setDisplayMode, clearHistory } = useChatbot();
  const tChat = useTranslations('Chatbot');
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
          ? 'top-20 right-6 w-[700px] max-h-[calc(100vh-7rem)] rounded-2xl hidden md:flex'
          : 'inset-0 md:bottom-6 md:right-6 md:left-auto md:top-auto md:w-[450px] md:h-[700px] md:max-h-[calc(100vh-3rem)] md:rounded-2xl'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stem-100 bg-gradient-to-r from-stem-600 to-stem-800 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <div>
            <h3 className="font-bold text-white">{tChat('title')}</h3>
            <p className="text-xs text-white/80">{tChat('subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearHistory}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={tChat('clearHistory')}
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>

          {/* Desktop only: toggle resizable mode */}
          <button
            onClick={() => setDisplayMode(isResizable ? 'panel' : 'resizable')}
            className="hidden md:block p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={isResizable ? tChat('panelMode') : tChat('resizableMode')}
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
            <p className="font-medium mb-2">{tChat('welcome')}</p>
            <p className="text-sm">{tChat('welcomeDesc')}</p>
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
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
              />
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
            placeholder={tChat('inputPlaceholder')}
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
