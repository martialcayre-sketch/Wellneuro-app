// La demande d'un geste de constat sur un besoin, lue et validée AVANT toute
// écriture ([[D-347]] §2-§4, t40) — PUR. La base refuse de son côté (CHECK,
// triggers) ; la route le dit avant, avec un refus nommé. Ce que la base ne
// tient pas, la demande le tient : une note normalisée (blancs Unicode), une
// date « à revoir le » postérieure au jour, et le refus d'une pose sur un
// besoin qui porte une source de score (§2 — la route seule le suit).

import { identifiant } from '@/lib/bio-parcours/constats/demande';
import { normaliserNote } from '@/lib/bio-parcours/constats/liste';
import {
  estBesoinConstatable,
  estMotifDuVerdict,
  estVerdict,
  NOTE_MAX,
  PIECES_MAX,
  type BesoinConstatable,
  type Verdict,
} from './liste';

export type PieceDemandee = { type: 'resultat' | 'reponse'; id: string };

export type DemandeConstatBesoin =
  | {
      acte: 'pose';
      besoin: BesoinConstatable;
      remplace: string | null;
      verdict: Verdict;
      motif: string | null;
      note: string | null;
      /** AAAA-MM-JJ, ou `null`. */
      aRevoirLe: string | null;
      pieces: PieceDemandee[];
    }
  | { acte: 'retrait'; besoin: BesoinConstatable; remplace: string };

export type LectureDemande = { ok: true; demande: DemandeConstatBesoin } | { ok: false; raison: string };

export type ContexteDemande = {
  /** Le jour, AAAA-MM-JJ, Europe/Paris. */
  aujourdhui: string;
  /** Les besoins qui portent une source de score : aucune pose neuve ([[D-347]] §2, §5.3). */
  besoinsAvecScore: ReadonlySet<number>;
  /** Une ligne de biologie ne se cite que si l'étage des résultats est ouvert. */
  biologieCitable: boolean;
};

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Une date civile réelle (le 31 février n'en est pas une). */
function estDateCivile(valeur: string): boolean {
  if (!RE_DATE.test(valeur)) return false;
  const d = new Date(`${valeur}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valeur;
}

const absent = (v: unknown) => v === undefined || v === null;

function lirePieces(valeur: unknown, biologieCitable: boolean): PieceDemandee[] | 'trop' | null {
  if (absent(valeur)) return [];
  if (!Array.isArray(valeur)) return null;
  if (valeur.length > PIECES_MAX) return 'trop';
  const vues = new Set<string>();
  const pieces: PieceDemandee[] = [];
  for (const brute of valeur) {
    if (brute === null || typeof brute !== 'object') return null;
    const { type, id } = brute as { type?: unknown; id?: unknown };
    const cle = identifiant(id);
    const typeConnu = type === 'reponse' || (biologieCitable && type === 'resultat');
    if (!typeConnu || !cle) return null;
    if (vues.has(`${type}:${cle}`)) return null;
    vues.add(`${type}:${cle}`);
    pieces.push({ type: type as PieceDemandee['type'], id: cle });
  }
  return pieces;
}

export function lireDemandeConstatBesoin(corps: Record<string, unknown>, contexte: ContexteDemande): LectureDemande {
  const acte = corps.acte;
  if (acte !== 'pose' && acte !== 'retrait') return { ok: false, raison: 'acte_invalide' };
  const besoin = corps.besoin;
  if (!estBesoinConstatable(besoin)) return { ok: false, raison: 'besoin_invalide' };

  if (acte === 'retrait') {
    const remplace = identifiant(corps.remplace);
    if (!remplace) return { ok: false, raison: 'remplacement_invalide' };
    if (!absent(corps.verdict) || !absent(corps.motif) || !absent(corps.note) || !absent(corps.aRevoirLe) || !absent(corps.pieces)) {
      return { ok: false, raison: 'acte_invalide' };
    }
    // Un retrait reste offert sur un besoin qui a gagné un score : c'est la
    // sortie du constat « à relire » pour cette raison (§5.3).
    return { ok: true, demande: { acte, besoin, remplace } };
  }

  if (contexte.besoinsAvecScore.has(besoin)) return { ok: false, raison: 'besoin_avec_score' };

  let remplace: string | null = null;
  if (!absent(corps.remplace)) {
    remplace = identifiant(corps.remplace);
    if (!remplace) return { ok: false, raison: 'remplacement_invalide' };
  }

  const verdict = corps.verdict;
  if (!estVerdict(verdict)) return { ok: false, raison: 'verdict_invalide' };
  const motif = absent(corps.motif) ? null : corps.motif;
  if (!estMotifDuVerdict(verdict, motif)) return { ok: false, raison: 'motif_invalide' };

  if (!absent(corps.note) && typeof corps.note !== 'string') return { ok: false, raison: 'note_invalide' };
  const note = normaliserNote(corps.note);
  if (note !== null && note.length > NOTE_MAX) return { ok: false, raison: 'note_trop_longue' };
  if (motif === 'autre' && note === null) return { ok: false, raison: 'note_requise' };

  let aRevoirLe: string | null = null;
  if (!absent(corps.aRevoirLe)) {
    if (typeof corps.aRevoirLe !== 'string' || !estDateCivile(corps.aRevoirLe)) return { ok: false, raison: 'date_invalide' };
    if (corps.aRevoirLe <= contexte.aujourdhui) return { ok: false, raison: 'date_passee' };
    aRevoirLe = corps.aRevoirLe;
  }

  // Facultatives pour les quatre verdicts ([[D-347]] §2, arbitrage 4).
  const pieces = lirePieces(corps.pieces, contexte.biologieCitable);
  if (pieces === null) return { ok: false, raison: 'pieces_invalides' };
  if (pieces === 'trop') return { ok: false, raison: 'pieces_trop_nombreuses' };

  return {
    ok: true,
    demande: { acte, besoin, remplace, verdict, motif: motif as string | null, note, aRevoirLe, pieces },
  };
}
