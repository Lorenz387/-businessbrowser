import type { Message } from '../types';

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
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        agent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Server-Fehler' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
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
          const parsed = JSON.parse(data);
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
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.analysis as string;
}

export async function checkHealth(): Promise<{ status: string; apiKeySet: boolean }> {
  const response = await fetch('/api/health');
  return response.json() as Promise<{ status: string; apiKeySet: boolean }>;
}
