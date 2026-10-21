// Brouillon LOCAL de « Ce qui compte pour moi aujourd'hui » — t06, arbitrage
// du 2026-10-21 : un brouillon sur l'appareil, sur le patron de
// `questionnaire-draft.ts`, jamais côté serveur (aucune donnée de santé non
// soumise en base ; le multi-appareil reste hors périmètre).
//
// LE MANQUE QU'IL FERME. Le champ ne survivait ni à un rechargement ni à une
// fermeture d'onglet : une parole longue, rédigée puis interrompue, était
// perdue. Les questionnaires gardaient déjà la leur 30 jours sur l'appareil.
//
// LA CLÉ PORTE L'`idPatient` DE LA SESSION VÉRIFIÉE, jamais le jeton de l'URL
// (même règle que le wizard et le Journal Alimentaire) : sur un appareil
// partagé, un autre patient connecté ne relit pas ce brouillon, et un nouveau
// lien magique ne le rend pas introuvable. Sans identité, rien ne s'écrit.
//
// Le brouillon s'efface au dépôt réussi ; un brouillon prouvé plus vieux que
// 30 jours est purgé à la lecture, un brouillon sans date jamais détruit sur
// supposition.

export type BrouillonCeQuiCompte = { texte: string; saisiLe: string };

const DUREE_VIE_JOURS = 30;

function cleBrouillon(idPatient: string): string {
  return `wellneuro:ce-qui-compte-brouillon:v1:${idPatient}`;
}

function cleDate(idPatient: string): string {
  return `wellneuro:ce-qui-compte-brouillon-meta:v1:${idPatient}`;
}

function lireForme(raw: string): BrouillonCeQuiCompte | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed.texte !== 'string' || typeof parsed.saisiLe !== 'string') return null;
    return { texte: parsed.texte, saisiLe: parsed.saisiLe };
  } catch {
    return null;
  }
}

function perime(idPatient: string): boolean {
  const raw = window.localStorage.getItem(cleDate(idPatient));
  if (!raw) return false;
  const le = new Date(raw);
  if (Number.isNaN(le.getTime())) return false;
  return Date.now() - le.getTime() > DUREE_VIE_JOURS * 24 * 60 * 60 * 1000;
}

export function lireBrouillonCeQuiCompte(idPatient: string | null | undefined): BrouillonCeQuiCompte | null {
  if (typeof window === 'undefined' || !idPatient) return null;
  try {
    if (perime(idPatient)) {
      effacerBrouillonCeQuiCompte(idPatient);
      return null;
    }
    const raw = window.localStorage.getItem(cleBrouillon(idPatient));
    const brouillon = raw ? lireForme(raw) : null;
    return brouillon && (brouillon.texte.trim() || brouillon.saisiLe) ? brouillon : null;
  } catch {
    return null;
  }
}

/** Un brouillon vide n'est pas un brouillon : il efface plutôt que d'écrire. */
export function ecrireBrouillonCeQuiCompte(idPatient: string | null | undefined, brouillon: BrouillonCeQuiCompte): void {
  if (typeof window === 'undefined' || !idPatient) return;
  if (!brouillon.texte.trim() && !brouillon.saisiLe) {
    effacerBrouillonCeQuiCompte(idPatient);
    return;
  }
  try {
    window.localStorage.setItem(
      cleBrouillon(idPatient),
      JSON.stringify({ texte: brouillon.texte, saisiLe: brouillon.saisiLe }),
    );
    window.localStorage.setItem(cleDate(idPatient), new Date().toISOString());
  } catch {
    // Quota / mode privé : ne pas interrompre la saisie.
  }
}

export function effacerBrouillonCeQuiCompte(idPatient: string | null | undefined): void {
  if (typeof window === 'undefined' || !idPatient) return;
  try {
    window.localStorage.removeItem(cleBrouillon(idPatient));
    window.localStorage.removeItem(cleDate(idPatient));
  } catch {
    // no-op
  }
}
