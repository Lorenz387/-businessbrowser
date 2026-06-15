import type { Message } from '../types';

interface ApiMessage {
  role: string;
  content: string | ApiContentBlock[];
}

interface ApiContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

function toApiMessages(messages: Message[]): ApiMessage[] {
  return messages.map((m) => {
    if (m.imageBase64 && m.imageMimeType) {
      const blocks: ApiContentBlock[] = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: m.imageMimeType,
            data: m.imageBase64,
          },
        },
        {
          type: 'text',
          text: m.content || 'Analysiere dieses Bild bitte.',
        },
      ];
      return { role: m.role, content: blocks };
    }
    return { role: m.role, content: m.content };
  });
}

export async function streamChat(
  messages: Message[],
  agent: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): Promise<void> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: toApiMessages(messages),
        agent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Server-Fehler' }));
      throw new Error((errorData as { error: string }).error || `HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Kein Response-Body erhalten');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data) as { text?: string; error?: string };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) onToken(parsed.text);
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message !== data) {
            throw parseError;
          }
        }
      }
    }

    onDone();
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unbekannter Fehler'));
  }
}

export async function analyzeFile(
  file: File,
  agent: string,
  question: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('agent', agent);
  formData.append('question', question);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Server-Fehler' }));
    throw new Error((errorData as { error: string }).error || `HTTP ${response.status}`);
  }

  const data = await response.json() as { analysis: string };
  return data.analysis;
}

export async function checkHealth(): Promise<{ status: string; apiKeySet: boolean }> {
  const response = await fetch('/api/health');
  return response.json() as Promise<{ status: string; apiKeySet: boolean }>;
}
