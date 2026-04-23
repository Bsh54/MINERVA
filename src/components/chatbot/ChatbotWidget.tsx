'use client';

import { useChatbot } from '@/contexts/ChatbotContext';
import { MessageCircle } from 'lucide-react';
import ChatbotPanel from './ChatbotPanel';
import { useTranslations } from 'next-intl';

export default function ChatbotWidget() {
  const { isOpen, toggleOpen } = useChatbot();
  const tChat = useTranslations('Chatbot');

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-stem-600 to-stem-800 hover:from-stem-700 hover:to-stem-900 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-50"
          aria-label={tChat('openChatbot')}
        >
          <MessageCircle className="w-8 h-8" />
        </button>
      )}

      {/* Chatbot Panel */}
      <ChatbotPanel />
    </>
  );
}
