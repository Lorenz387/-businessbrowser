import { useState, useCallback } from 'react';
import type { Message, AgentType } from '../types';
import { streamChat } from '../utils/api';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useChat(defaultAgent: AgentType = 'research') {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<AgentType>(defaultAgent);

  const sendMessage = useCallback(
    async (text: string, agent?: AgentType, file?: File) => {
      const activeAgent = agent ?? currentAgent;

      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      let imageName: string | undefined;

      if (file?.type.startsWith('image/')) {
        try {
          const result = await readFileAsBase64(file);
          imageBase64 = result.base64;
          imageMimeType = result.mimeType;
          imageName = file.name;
        } catch {
          // if reading fails just send text
        }
      }

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: text,
        agent: activeAgent,
        timestamp: new Date(),
        imageBase64,
        imageMimeType,
        imageName,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const assistantId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          agent: activeAgent,
          timestamp: new Date(),
        },
      ]);

      await streamChat(
        [...messages, userMessage],
        activeAgent,
        (token) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: msg.content + token } : msg
            )
          );
        },
        () => {
          setIsLoading(false);
        },
        (error) => {
          setIsLoading(false);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: `## ⚠️ Fehler\n\nEs ist ein Fehler aufgetreten: **${error.message}**\n\nBitte überprüfe deine API-Konfiguration und versuche es erneut.`,
                  }
                : msg
            )
          );
        }
      );
    },
    [messages, currentAgent]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    currentAgent,
    setCurrentAgent,
    sendMessage,
    clearMessages,
  };
}

export default useChat;
