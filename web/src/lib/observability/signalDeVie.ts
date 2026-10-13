// LE SIGNAL DE VIE D'UN PROCESSUS DE FOND ([[D-282]], G3, lot 4 — P2-2
// arbitré le 2026-10-13 : une alerte par e-mail, pas un état d'écran). Sans
// processus vivant, un travail demandé ne finit jamais et l'écran reste
// « Lecture en cours » ; le processus se signale donc à une surveillance
// externe qui prévient le responsable quand il se tait.
//
// L'adresse vient de l'environnement — elle porte le jeton de la surveillance,
// ni committée ni journalisée. Absente : aucun appel (dev, CI). L'appel est
// borné et ne lève jamais : une surveillance injoignable ne doit pas arrêter
// le processus qu'elle surveille.
import { classeEtCode } from './classeEtCode';

const DELAI_SIGNAL_MS = 5_000;

export async function signalerVie(
  url: string | undefined,
  envoyer: typeof fetch = fetch,
): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await envoyer(url, { method: 'GET', signal: AbortSignal.timeout(DELAI_SIGNAL_MS) });
    if (!res.ok) console.error(`[signal de vie] refusé : ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error('[signal de vie] injoignable :', ...classeEtCode(err));
    return false;
  }
}
