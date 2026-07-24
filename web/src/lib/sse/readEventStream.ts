// Lecteur SSE minimal côté client, pour les réponses `text/event-stream`
// consommées par `fetch` (POST + cookies → pas d'`EventSource`, réservé au GET).
//
// Sert les routes longues passées en streaming pour tenir le seuil « premier
// octet » du routeur Scalingo (30 s) : le serveur émet des heartbeats (`:` en
// commentaire) puis un événement terminal `done`/`error`. Ce lecteur ignore les
// heartbeats et remonte chaque événement NOMMÉ avec sa donnée.

export type SseEvent = { event: string; data: string };

/** Découpe une trame SSE (`event:`/`data:`, commentaires `:` ignorés). */
export function parseSseFrame(raw: string): SseEvent | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const ligne of raw.split('\n')) {
    if (!ligne || ligne.startsWith(':')) continue; // heartbeat / commentaire
    if (ligne.startsWith('event:')) event = ligne.slice(6).trim();
    else if (ligne.startsWith('data:')) dataLines.push(ligne.slice(5).replace(/^ /, ''));
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

/**
 * Lit `response.body` (flux SSE) jusqu'à sa fermeture et invoque `onEvent` pour
 * chaque événement nommé. Les trames sont séparées par `\n\n`. Ne rejette pas
 * sur un flux vide (retour silencieux) — l'appelant juge de l'absence
 * d'événement terminal.
 */
export async function readEventStream(
  response: Response,
  onEvent: (e: SseEvent) => void,
): Promise<void> {
  const body = response.body;
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = parseSseFrame(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
      if (frame) onEvent(frame);
    }
  }
  // Dernière trame éventuelle sans séparateur final.
  const reste = parseSseFrame(buffer);
  if (reste) onEvent(reste);
}
