'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatbotContextType {
  messages: Message[];
  isOpen: boolean;
  displayMode: 'panel' | 'resizable';
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  toggleOpen: () => void;
  setDisplayMode: (mode: 'panel' | 'resizable') => void;
  clearHistory: () => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

const STORAGE_KEY = 'minerva_chatbot_messages';

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const [isOpen, setIsOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<'panel' | 'resizable'>('panel');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create placeholder for assistant message
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulatedContent += data.content;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: accumulatedContent }
                      : m
                  )
                );
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

    } catch (error) {
      console.error('Erreur envoi message:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Erreur lors de la génération de la réponse.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <ChatbotContext.Provider value={{
      messages,
      isOpen,
      displayMode,
      isLoading,
      sendMessage,
      toggleOpen,
      setDisplayMode,
      clearHistory
    }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbot must be used within ChatbotProvider');
  }
  return context;
}
