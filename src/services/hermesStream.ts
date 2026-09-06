import type { HermesProgressEvent } from '../types/hermes';

/** SSE via fetch : en-tête Authorization conservé, UTF-8 et trames fragmentées. */
export async function readHermesStream(response: Response, onEvent: (event: HermesProgressEvent) => void): Promise<void> {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    const result = await response.json();
    if (typeof result.response !== 'string' || !result.response.trim()) throw new Error('Réponse serveur vide. Aucun succès ne peut être confirmé.');
    onEvent({ type: 'done', result });
    return;
  }
  if (!response.body) throw new Error('Le navigateur ne peut pas lire le flux de réponse.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;
  const consumeFrame = (frame: string) => {
    const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data) return; // heartbeat / commentaires SSE
    const event: HermesProgressEvent = JSON.parse(data);
    if (event.type === 'error') throw new Error(event.message);
    if (event.type === 'done') {
      if (!event.result?.response?.trim()) throw new Error('Conclusion serveur vide.');
      done = true;
    }
    onEvent(event);
  };
  try {
    while (!done) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      // Normalisation après concaténation, pour les CRLF coupés entre deux chunks.
      buffer = buffer.replace(/\r\n/g, '\n');
      if (buffer.length > 1_000_000) throw new Error('Trame serveur trop volumineuse.');
      let split: number;
      while ((split = buffer.indexOf('\n\n')) !== -1 && !done) {
        consumeFrame(buffer.slice(0, split));
        buffer = buffer.slice(split + 2);
      }
      if (chunk.done) break;
    }
    if (!done) throw new Error('Connexion interrompue avant la conclusion. Les étapes reçues sont conservées ; vérifiez-les avant de relancer une action.');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
