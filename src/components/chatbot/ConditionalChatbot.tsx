'use client';

import { usePathname } from 'next/navigation';
import ChatbotWidget from './ChatbotWidget';

export default function ConditionalChatbot() {
  const pathname = usePathname();

  // Exclure le chatbot des pages quiz
  const isQuizPage = pathname?.includes('/quiz');

  if (isQuizPage) {
    return null;
  }

  return <ChatbotWidget />;
}
