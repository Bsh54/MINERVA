'use client';

import { useChatbot } from '@/contexts/ChatbotContext';
import { MessageCircle } from 'lucide-react';
import ChatbotPanel from './ChatbotPanel';

export default function ChatbotWidget() {
  const { isOpen, toggleOpen } = useChatbot();

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-stem-600 to-stem-800 hover:from-stem-700 hover:to-stem-900 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-50"
          aria-label="Ouvrir le chatbot"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chatbot Panel */}
      <ChatbotPanel />
    </>
  );
}
