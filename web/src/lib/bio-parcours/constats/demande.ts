// La demande d'un geste de constat, lue et validée AVANT toute écriture
// ([[D-331]] §2-§4, BP-11) — PUR. La base refuse de son côté (CHECK,
// triggers) ; la route le dit avant, avec un refus nommé. Ce que la base ne
// tient pas, la demande le tient : une note normalisée (blancs Unicode), une
// date « à revoir le » postérieure au jour, l'appartenance de l'hypothèse à la
// structure signée (une table TS, hors de portée d'un CHECK).

import { RE_HYPOTHESE } from '@/lib/fiches-usage/vocabulaire';
import {
  estMotifDuVerdict,
  estVerdict,
  normaliserNote,
  NOTE_MAX,
  PIECES_MAX,
  VERDICTS_A_PIECE,
  type Verdict,
} from './liste';
import type { StructureDuParcours } from './structure';

export type PieceDemandee = { type: 'resultat' | 'reponse' | 'traitement'; id: string };

export type DemandeConstat =
  | {
      acte: 'pose';
      hypotheseCode: string;
      remplace: string | null;
      verdict: Verdict;
      motif: string | null;
      note: string | null;
      /** AAAA-MM-JJ, ou `null`. */
      aRevoirLe: string | null;
      pieces: PieceDemandee[];
    }
  | { acte: 'retrait'; hypotheseCode: string; remplace: string };

export type LectureDemande = { ok: true; demande: DemandeConstat } | { ok: false; raison: string };

/** Longueur maximale d'un identifiant : borne technique de saisie, comme la garde des résultats. */
const IDENTIFIANT_MAX = 64;

/** Longueur maximale d'un code d'hypothèse : celle du CHECK de `constats_praticien_v1` (technique). */
const HYPOTHESE_MAX = 128;

/** Un identifiant borné, ou `''` — même discipline que les autres gestes de biologie. */
export function identifiant(valeur: unknown): string {
  const v = typeof valeur === 'string' ? valeur.trim() : '';
  return v.length > 0 && v.length <= IDENTIFIANT_MAX ? v : '';
}

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Une date civile réelle (le 31 février n'en est pas une). */
function estDateCivile(valeur: string): boolean {
  if (!RE_DATE.test(valeur)) return false;
  const d = new Date(`${valeur}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valeur;
}

const absent = (v: unknown) => v === undefined || v === null;

/**
 * Les pièces citées. Une ligne de traitement ([[D-335]] §7) ne se cite que
 * sous `WN_PHYSIO_TRAITEMENTS` : drapeau éteint, le type est inconnu.
 */
function lirePieces(valeur: unknown, traitementsCitables: boolean): PieceDemandee[] | 'trop' | null {
  if (absent(valeur)) return [];
  if (!Array.isArray(valeur)) return null;
  if (valeur.length > PIECES_MAX) return 'trop';
  const vues = new Set<string>();
  const pieces: PieceDemandee[] = [];
  for (const brute of valeur) {
    if (brute === null || typeof brute !== 'object') return null;
    const { type, id } = brute as { type?: unknown; id?: unknown };
    const cle = identifiant(id);
    const typeConnu = type === 'resultat' || type === 'reponse' || (traitementsCitables && type === 'traitement');
    if (!typeConnu || !cle) return null;
    if (vues.has(`${type}:${cle}`)) return null;
    vues.add(`${type}:${cle}`);
    pieces.push({ type: type as PieceDemandee['type'], id: cle });
  }
  return pieces;
}

export function lireDemandeConstat(
  corps: Record<string, unknown>,
  structure: StructureDuParcours,
  aujourdhui: string,
  traitementsCitables = false,
): LectureDemande {
  const acte = corps.acte;
  if (acte !== 'pose' && acte !== 'retrait') return { ok: false, raison: 'acte_invalide' };
  const hypotheseCode = typeof corps.hypothese === 'string' ? corps.hypothese.trim() : '';
  if (!RE_HYPOTHESE.test(hypotheseCode) || hypotheseCode.length > HYPOTHESE_MAX) return { ok: false, raison: 'hypothese_invalide' };

  if (acte === 'retrait') {
    const remplace = identifiant(corps.remplace);
    if (!remplace) return { ok: false, raison: 'remplacement_invalide' };
    if (!absent(corps.verdict) || !absent(corps.motif) || !absent(corps.note) || !absent(corps.aRevoirLe) || !absent(corps.pieces)) {
      return { ok: false, raison: 'acte_invalide' };
    }
    // Un retrait reste offert sur une hypothèse sortie de la structure : c'est
    // la sortie du constat « à relire » pour cette raison (§5.7).
    return { ok: true, demande: { acte, hypotheseCode, remplace } };
  }

  if (!structure.signee) return { ok: false, raison: 'structure_non_signee' };
  if (!structure.hypotheses.includes(hypotheseCode)) return { ok: false, raison: 'hypothese_hors_structure' };

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
    if (corps.aRevoirLe <= aujourdhui) return { ok: false, raison: 'date_passee' };
    aRevoirLe = corps.aRevoirLe;
  }

  const pieces = lirePieces(corps.pieces, traitementsCitables);
  if (pieces === null) return { ok: false, raison: 'pieces_invalides' };
  if (pieces === 'trop') return { ok: false, raison: 'pieces_trop_nombreuses' };
  if (VERDICTS_A_PIECE.includes(verdict) && pieces.length === 0) return { ok: false, raison: 'piece_requise' };

  return {
    ok: true,
    demande: { acte, hypotheseCode, remplace, verdict, motif: motif as string | null, note, aRevoirLe, pieces },
  };
}
