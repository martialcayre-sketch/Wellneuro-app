// La demande d'une décision de parcours, lue et validée AVANT toute écriture
// ([[D-343]] §2-§6, BP-15) — PUR. La base refuse de son côté (CHECK,
// trigger) ; la route le dit avant, avec un refus nommé. Ce que la base ne
// tient pas, la demande le tient : une note normalisée (blancs Unicode), et
// aucune date d'événement future (§4).
//
// L'auteur vient de la ROUTE (la session), jamais du corps.

import { normaliserTexte } from '@/lib/physio-traitements/liste';
import {
  ACTION_MAX,
  estIssue,
  estNature,
  estSource,
  motifsPermis,
  NATURES_MISE_EN_OEUVRE,
  NOTE_MAX,
  noteRequise,
  type Issue,
  type Nature,
  type Source,
} from './liste';

export type Demande =
  | { acte: 'retrait'; idVersion: string; remplace: string }
  | {
      acte: 'pose';
      idVersion: string;
      idAction: string | null;
      nature: Nature;
      issue: Issue | null;
      motif: string | null;
      note: string | null;
      /** `AAAA-MM-JJ`, ou `null` quand la date est inconnue ou sans objet. */
      evenementLe: string | null;
      /** Mise en œuvre seule : `true` = « date inconnue », écrit. */
      evenementInconnu: boolean | null;
      source: Source | null;
      idVersionSuivante: string | null;
      /** La tête remplacée (correction, révision nouvelle), ou `null`. */
      remplace: string | null;
    };

export type Lecture<T> = { ok: true; demande: T } | { ok: false; raison: string };

/** L'identifiant d'une version : `proto_…#<empreinte>`, plus long qu'un identifiant de dossier. */
const IDENTIFIANT_MAX = 512;
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;

const absent = (v: unknown) => v === undefined || v === null;

function identifiant(valeur: unknown): string {
  const v = typeof valeur === 'string' ? valeur.trim() : '';
  return v.length > 0 && v.length <= IDENTIFIANT_MAX ? v : '';
}

/** Une date civile réelle (le 31 février n'en est pas une). */
function estDateCivile(valeur: string): boolean {
  if (!RE_DATE.test(valeur)) return false;
  const d = new Date(`${valeur}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valeur;
}

const refus = (raison: string): { ok: false; raison: string } => ({ ok: false, raison });

/** `aujourdhui` : la date du jour à Paris (`AAAA-MM-JJ`), donnée par la route. */
export function lireDemande(brut: Record<string, unknown>, aujourdhui: string): Lecture<Demande> {
  const idVersion = identifiant(brut.idVersion);
  if (!idVersion) return refus('version_invalide');

  const remplace = absent(brut.remplace) ? null : identifiant(brut.remplace);
  if (remplace === '') return refus('remplacement_invalide');

  if (brut.acte === 'retrait') {
    if (remplace === null) return refus('remplacement_invalide');
    return { ok: true, demande: { acte: 'retrait', idVersion, remplace } };
  }
  if (brut.acte !== 'pose') return refus('acte_invalide');

  if (!estNature(brut.nature)) return refus('nature_invalide');
  const nature = brut.nature;
  const estRevision = nature === 'revision';

  // L'action : facultative, jamais sur une révision (§2).
  let idAction: string | null = null;
  if (!absent(brut.idAction)) {
    if (estRevision) return refus('action_sur_revision');
    const action = typeof brut.idAction === 'string' ? brut.idAction.trim() : '';
    if (action.length === 0 || action.length > ACTION_MAX) return refus('action_invalide');
    idAction = action;
  }

  // L'issue : la révision seule (§3).
  let issue: Issue | null = null;
  if (estRevision) {
    if (!estIssue(brut.issue)) return refus('issue_invalide');
    issue = brut.issue;
  } else if (!absent(brut.issue)) {
    return refus('issue_invalide');
  }

  // La source : choix et mise en œuvre ; jamais une révision (§5).
  let source: Source | null = null;
  if (estRevision) {
    if (!absent(brut.source)) return refus('source_invalide');
  } else {
    if (!estSource(brut.source)) return refus('source_invalide');
    source = brut.source;
  }

  // Le motif, de SA liste (§4).
  const permis = motifsPermis(nature, issue);
  let motif: string | null = null;
  if (permis.length === 0) {
    if (!absent(brut.motif)) return refus('motif_interdit');
  } else {
    if (typeof brut.motif !== 'string' || !permis.includes(brut.motif)) return refus('motif_invalide');
    motif = brut.motif;
  }

  // La note : normalisée ; obligatoire avec `autre` et pour une préférence.
  const note = normaliserTexte(brut.note);
  if (note !== null && note.length > NOTE_MAX) return refus('texte_trop_long');
  if (note === null && noteRequise(nature, motif)) return refus('note_requise');

  // La date de l'événement : la mise en œuvre seule, au jour ou inconnue.
  let evenementLe: string | null = null;
  let evenementInconnu: boolean | null = null;
  if (NATURES_MISE_EN_OEUVRE.includes(nature)) {
    if (brut.evenementInconnu === true) {
      if (!absent(brut.evenementLe)) return refus('date_invalide');
      evenementInconnu = true;
    } else {
      if (absent(brut.evenementLe)) return refus('date_requise');
      if (typeof brut.evenementLe !== 'string' || !estDateCivile(brut.evenementLe)) return refus('date_invalide');
      if (brut.evenementLe > aujourdhui) return refus('date_future');
      evenementLe = brut.evenementLe;
      evenementInconnu = false;
    }
  } else if (!absent(brut.evenementLe) || !absent(brut.evenementInconnu)) {
    return refus('date_interdite');
  }

  // La version suivante : `ajuster` seule, autre que la version révisée (§6).
  let idVersionSuivante: string | null = null;
  if (!absent(brut.idVersionSuivante)) {
    const suivante = identifiant(brut.idVersionSuivante);
    if (!suivante || issue !== 'ajuster' || suivante === idVersion) return refus('version_suivante_invalide');
    idVersionSuivante = suivante;
  }

  return {
    ok: true,
    demande: {
      acte: 'pose',
      idVersion,
      idAction,
      nature,
      issue,
      motif,
      note,
      evenementLe,
      evenementInconnu,
      source,
      idVersionSuivante,
      remplace,
    },
  };
}
