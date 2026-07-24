// Instruments du cabinet — resolver commun catalogue/cabinet (décision
// utilisateur du 2026-07-23 : « instruments du cabinet complets d'emblée »).
//
// Un instrument du cabinet (id CAB_xxx) vit en base (`cabinet_instruments`),
// jamais dans le catalogue en code. Il n'est JAMAIS certifié automatiquement,
// et n'est servi au chemin patient que publié (`statutRelecture: 'valide'`).
// Le resolver rend une forme unique aux deux familles : le chemin patient
// (rendu + scoring) et l'aperçu praticien ne connaissent plus la provenance.

import { prisma } from '@/lib/prisma';
import {
  CATALOGUE_DEFINITIONS,
  IDS_ASSIGNABLES,
  type DefinitionCatalogue,
} from '@/lib/bibliotheque';
import type { CabinetInstrument } from '@/generated/prisma';
import { type OptionCabinet } from '@/lib/echelles-cabinet';

export const PREFIXE_CABINET = 'CAB_';

export function estInstrumentCabinet(id: string): boolean {
  return id.startsWith(PREFIXE_CABINET);
}

// ── Formes stockées (definition_json / scoring_json) ────────────────────────

export type QuestionCabinet = {
  id: string;
  texte: string;
  type: 'likert';
  options: OptionCabinet[];
};

export type SectionCabinet = { id: string; titre?: string; questions: QuestionCabinet[] };

export type DefinitionCabinet = { instructions?: string; sections: SectionCabinet[] };

export type BandeInterpretation = {
  min: number;
  max: number;
  label: string;
  color: 'success' | 'warning' | 'danger';
};

// Seuls ces trois types de scoring sont admis : le moteur de score
// (computeScoreFromDef, @/lib/questions) n'a AUCUN catch-all — tout autre
// type casserait la soumission patient.
export const TYPES_SCORING_CABINET = ['sum', 'sum_reversed', 'count_threshold'] as const;

export type ScoringCabinet = {
  type: (typeof TYPES_SCORING_CABINET)[number];
  reversed?: string[];
  threshold?: number;
  /** Dérivé à la validation (jamais saisi) : borne haute du score, pour
   * l'affichage et le résultat `maxTotal` du moteur de score. */
  maxTotal?: number;
  interpretation: BandeInterpretation[];
};

// ── Resolver commun ─────────────────────────────────────────────────────────

export type DefinitionResolue = DefinitionCatalogue & { cabinet: boolean };

export async function resolveDefinition(
  id: string,
  opts?: { praticienEmail?: string; inclureNonPublies?: boolean; pourPassation?: boolean },
): Promise<DefinitionResolue | null> {
  if (!estInstrumentCabinet(id)) {
    const def = CATALOGUE_DEFINITIONS[id];
    return def ? { ...def, cabinet: false } : null;
  }
  const row = await prisma.cabinetInstrument.findUnique({ where: { idInstrument: id } });
  if (!row) return null;
  // Passation (routes patient UNIQUEMENT) : l'assignation fait autorité — un
  // envoi déjà parti doit pouvoir être rendu et scoré même si l'instrument a
  // été désactivé ou dépublié entre-temps. La légitimité d'accès vient de
  // l'assignation, déjà contrôlée en amont ; les NOUVEAUX envois restent
  // gatés par idsAssignablesPour (valide + actif).
  if (opts?.pourPassation === true) {
    return definitionDepuisRow(row);
  }
  if (!row.actif) return null;
  // Côté praticien (praticienEmail fourni), la propriété est exigée pour TOUT
  // statut : un instrument du cabinet, même publié, reste privé à son cabinet.
  if (
    typeof opts?.praticienEmail === 'string' &&
    row.praticienEmail.toLowerCase() !== opts.praticienEmail.toLowerCase()
  ) {
    return null;
  }
  if (row.statutRelecture !== 'valide') {
    // Le chemin patient ne sert JAMAIS un instrument non publié. Seul le
    // praticien propriétaire (vérifié ci-dessus) prévisualise ses brouillons.
    if (opts?.inclureNonPublies !== true || typeof opts?.praticienEmail !== 'string') return null;
  }
  return definitionDepuisRow(row);
}

function definitionDepuisRow(row: CabinetInstrument): DefinitionResolue {
  const definition = row.definitionJson as unknown as DefinitionCabinet | null;
  const scoring = row.scoringJson as unknown as ScoringCabinet | null;
  return {
    id: row.idInstrument,
    titre: row.titre,
    instructions: definition?.instructions || undefined,
    sections: Array.isArray(definition?.sections) ? definition.sections : [],
    scoring: (scoring ?? undefined) as DefinitionCatalogue['scoring'],
    cabinet: true,
  };
}

/** Instruments du cabinet d'un praticien — actifs, tous statuts (UI praticien). */
export async function listeInstrumentsCabinet(praticienEmail: string): Promise<CabinetInstrument[]> {
  return prisma.cabinetInstrument.findMany({
    where: { praticienEmail: { equals: praticienEmail, mode: 'insensitive' }, actif: true },
    orderBy: { createdAt: 'asc' },
  });
}

/** Ids assignables pour un praticien : catalogue ∪ instruments CAB publiés. */
export async function idsAssignablesPour(praticienEmail: string): Promise<Set<string>> {
  const ids = new Set(IDS_ASSIGNABLES);
  const publies = await prisma.cabinetInstrument.findMany({
    where: {
      praticienEmail: { equals: praticienEmail, mode: 'insensitive' },
      actif: true,
      statutRelecture: 'valide',
    },
    select: { idInstrument: true },
  });
  for (const p of publies) ids.add(p.idInstrument);
  return ids;
}

/** Compte questions et borne de score depuis les JSON stockés (DTO liste). */
export function resumeInstrumentCabinet(row: CabinetInstrument): {
  nbQuestions: number | null;
  scoreMax: number | null;
} {
  const definition = row.definitionJson as unknown as DefinitionCabinet | null;
  const scoring = row.scoringJson as unknown as ScoringCabinet | null;
  const sections = Array.isArray(definition?.sections) ? definition.sections : [];
  const questions = sections.flatMap(s => (Array.isArray(s?.questions) ? s.questions : []));
  const nbQuestions = questions.length > 0 ? questions.length : null;
  if (typeof scoring?.maxTotal === 'number') {
    return { nbQuestions, scoreMax: scoring.maxTotal };
  }
  const bornes = bornesScore(questions, scoring?.type ?? 'sum');
  return { nbQuestions, scoreMax: bornes ? bornes.max : null };
}

// ── Normalisation des payloads praticien (create/import/édition) ────────────

/** Borne les chaînes et pose des ids de section S1..Sn si absents. Ne rejette
 * rien : c'est `validerInstrumentCabinet` qui juge le résultat. */
export function normaliserDefinitionCabinet(brut: unknown): DefinitionCabinet {
  const d = (brut ?? {}) as { instructions?: unknown; sections?: unknown };
  const instructions =
    typeof d.instructions === 'string' ? d.instructions.trim().slice(0, 2000) : '';
  const sections = Array.isArray(d.sections) ? d.sections : [];
  return {
    ...(instructions ? { instructions } : {}),
    sections: sections.map((section: unknown, iSection: number) => {
      const s = (section ?? {}) as { id?: unknown; titre?: unknown; questions?: unknown };
      const titreSection = typeof s.titre === 'string' ? s.titre.trim().slice(0, 200) : '';
      const questions = Array.isArray(s.questions) ? s.questions : [];
      return {
        id:
          typeof s.id === 'string' && s.id.trim().length > 0
            ? s.id.trim().slice(0, 20)
            : `S${iSection + 1}`,
        ...(titreSection ? { titre: titreSection } : {}),
        questions: questions.map((question: unknown) => {
          const q = (question ?? {}) as {
            id?: unknown;
            texte?: unknown;
            type?: unknown;
            options?: unknown;
          };
          return {
            id: typeof q.id === 'string' ? q.id.trim() : '',
            texte: typeof q.texte === 'string' ? q.texte.trim().slice(0, 300) : '',
            type: (q.type === undefined ? 'likert' : q.type) as 'likert',
            options: Array.isArray(q.options)
              ? q.options.map((option: unknown) => {
                  const o = (option ?? {}) as { v?: unknown; l?: unknown };
                  return {
                    v: o.v as number,
                    l: typeof o.l === 'string' ? o.l.trim().slice(0, 80) : '',
                  };
                })
              : [],
          };
        }),
      };
    }),
  };
}

/** Borne les chaînes de la grille ; la structure reste jugée par la validation. */
export function normaliserScoringCabinet(brut: unknown): ScoringCabinet {
  const s = (brut ?? {}) as {
    type?: unknown;
    reversed?: unknown;
    threshold?: unknown;
    interpretation?: unknown;
  };
  return {
    type: (typeof s.type === 'string' ? s.type : '') as ScoringCabinet['type'],
    ...(Array.isArray(s.reversed)
      ? { reversed: s.reversed.filter((x): x is string => typeof x === 'string') }
      : {}),
    ...(s.threshold !== undefined ? { threshold: s.threshold as number } : {}),
    interpretation: Array.isArray(s.interpretation)
      ? s.interpretation.map((bande: unknown) => {
          const b = (bande ?? {}) as { min?: unknown; max?: unknown; label?: unknown; color?: unknown };
          return {
            min: b.min as number,
            max: b.max as number,
            label: typeof b.label === 'string' ? b.label.trim().slice(0, 120) : '',
            color: b.color as BandeInterpretation['color'],
          };
        })
      : [],
  };
}

export const LABEL_GRILLE_A_DEFINIR = 'Grille à définir — relecture requise';

/** Grille par défaut d'un import sans scoring : une bande unique warning
 * couvrant tout l'intervalle possible — assignable seulement après relecture
 * et publication, comme tout instrument du cabinet. */
export function scoringParDefaut(definition: DefinitionCabinet): ScoringCabinet {
  const questions = definition.sections.flatMap(s => s.questions);
  const bornes = bornesScore(questions, 'sum') ?? { min: 0, max: 0 };
  return {
    type: 'sum',
    interpretation: [
      { min: bornes.min, max: bornes.max, label: LABEL_GRILLE_A_DEFINIR, color: 'warning' },
    ],
  };
}

// ── Validation partagée (create/import ET publier) ──────────────────────────

export type ResultatValidation =
  | { ok: true; nbQuestions: number; scoreMax: number }
  | { ok: false; erreurs: string[] };

const ID_QUESTION_REGEX = /^[A-Za-z0-9_]{1,20}$/;
const MAX_SECTIONS = 5;
const MAX_QUESTIONS = 60;
const MAX_BANDES = 6;
const COULEURS_BANDE = new Set(['success', 'warning', 'danger']);

function estEntier(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isInteger(valeur);
}

/** Bornes [min..max] du score selon le type. `null` si une option est invalide. */
function bornesScore(
  questions: { options?: { v?: unknown }[] }[],
  type: string,
): { min: number; max: number } | null {
  if (type === 'count_threshold') return { min: 0, max: questions.length };
  let min = 0;
  let max = 0;
  for (const q of questions) {
    const valeurs = (q.options ?? []).map(o => o?.v).filter(estEntier);
    if (valeurs.length === 0) return null;
    min += Math.min(...valeurs);
    max += Math.max(...valeurs);
  }
  return { min, max };
}

/**
 * Valide un instrument du cabinet complet (titre + définition + grille).
 * Utilisée à la création, à l'import, à l'édition ET au moment de publier :
 * une grille invalide ne peut ni entrer en base ni être publiée.
 */
export function validerInstrumentCabinet(input: {
  titre: unknown;
  definition: unknown;
  scoring: unknown;
}): ResultatValidation {
  const erreurs: string[] = [];

  const titre = typeof input.titre === 'string' ? input.titre.trim() : '';
  if (titre.length < 3 || titre.length > 120) {
    erreurs.push('Le titre doit compter entre 3 et 120 caractères.');
  }

  // ── Définition ────────────────────────────────────────
  const definition = (input.definition ?? {}) as {
    instructions?: unknown;
    sections?: unknown;
  };
  if (definition.instructions !== undefined && typeof definition.instructions !== 'string') {
    erreurs.push('La consigne doit être un texte.');
  }
  const sections = Array.isArray(definition.sections) ? definition.sections : [];
  if (sections.length === 0) {
    erreurs.push('Au moins une section avec des questions est requise.');
  }
  if (sections.length > MAX_SECTIONS) {
    erreurs.push(`Au plus ${MAX_SECTIONS} sections.`);
  }

  const questions: QuestionCabinet[] = [];
  const idsVus = new Set<string>();
  sections.forEach((section: unknown, iSection: number) => {
    const s = (section ?? {}) as { questions?: unknown };
    const liste = Array.isArray(s.questions) ? s.questions : [];
    if (liste.length === 0) {
      erreurs.push(`La section ${iSection + 1} ne contient aucune question.`);
      return;
    }
    liste.forEach((question: unknown, iQuestion: number) => {
      const q = (question ?? {}) as {
        id?: unknown;
        texte?: unknown;
        type?: unknown;
        options?: unknown;
      };
      const position = `question ${iQuestion + 1} de la section ${iSection + 1}`;
      const id = typeof q.id === 'string' ? q.id : '';
      if (!ID_QUESTION_REGEX.test(id)) {
        erreurs.push(
          `Identifiant invalide pour la ${position} (lettres, chiffres ou _, 20 caractères max).`,
        );
      } else if (idsVus.has(id)) {
        erreurs.push(`Identifiant de question en double : ${id}.`);
      } else {
        idsVus.add(id);
      }
      const texte = typeof q.texte === 'string' ? q.texte.trim() : '';
      if (texte.length < 3 || texte.length > 300) {
        erreurs.push(`Le texte de la ${position} doit compter entre 3 et 300 caractères.`);
      }
      if (q.type !== 'likert') {
        erreurs.push(`Type non pris en charge pour la ${position} (seul « likert » est admis).`);
      }
      const options = Array.isArray(q.options) ? q.options : [];
      if (options.length < 2 || options.length > 8) {
        erreurs.push(`La ${position} doit proposer entre 2 et 8 options.`);
      }
      options.forEach((option: unknown, iOption: number) => {
        const o = (option ?? {}) as { v?: unknown; l?: unknown };
        if (!estEntier(o.v)) {
          erreurs.push(`L'option ${iOption + 1} de la ${position} doit porter une valeur entière.`);
        }
        if (typeof o.l !== 'string' || o.l.trim().length === 0) {
          erreurs.push(`L'option ${iOption + 1} de la ${position} doit porter un libellé.`);
        }
      });
      questions.push(q as QuestionCabinet);
    });
  });
  if (questions.length > MAX_QUESTIONS) {
    erreurs.push(`Au plus ${MAX_QUESTIONS} questions au total.`);
  }

  // ── Grille de score ───────────────────────────────────
  const scoring = (input.scoring ?? {}) as {
    type?: unknown;
    reversed?: unknown;
    threshold?: unknown;
    interpretation?: unknown;
  };
  const type = typeof scoring.type === 'string' ? scoring.type : '';
  if (!(TYPES_SCORING_CABINET as readonly string[]).includes(type)) {
    erreurs.push(
      'Type de scoring non pris en charge : seuls « sum », « sum_reversed » et « count_threshold » sont admis.',
    );
  }
  if (type === 'sum_reversed') {
    const reversed = Array.isArray(scoring.reversed) ? scoring.reversed : null;
    if (!reversed) {
      erreurs.push('« sum_reversed » exige la liste des questions inversées (reversed).');
    } else {
      for (const id of reversed) {
        if (typeof id !== 'string' || !idsVus.has(id)) {
          erreurs.push(`Question inversée inconnue : ${String(id)}.`);
        }
      }
    }
  }
  if (type === 'count_threshold' && !estEntier(scoring.threshold)) {
    erreurs.push('« count_threshold » exige un seuil entier (threshold).');
  }

  const bandes = Array.isArray(scoring.interpretation) ? scoring.interpretation : [];
  if (bandes.length < 1 || bandes.length > MAX_BANDES) {
    erreurs.push(`L'interprétation doit compter entre 1 et ${MAX_BANDES} bandes.`);
  }
  let bandesValides = bandes.length >= 1 && bandes.length <= MAX_BANDES;
  bandes.forEach((bande: unknown, iBande: number) => {
    const b = (bande ?? {}) as { min?: unknown; max?: unknown; label?: unknown; color?: unknown };
    if (!estEntier(b.min) || !estEntier(b.max) || b.min > b.max) {
      erreurs.push(`La bande ${iBande + 1} doit porter des bornes entières min ≤ max.`);
      bandesValides = false;
    }
    if (typeof b.label !== 'string' || b.label.trim().length === 0) {
      erreurs.push(`La bande ${iBande + 1} doit porter un libellé.`);
      bandesValides = false;
    }
    if (typeof b.color !== 'string' || !COULEURS_BANDE.has(b.color)) {
      erreurs.push(
        `La bande ${iBande + 1} doit porter une couleur parmi success, warning ou danger.`,
      );
      bandesValides = false;
    }
  });

  // Contiguïté et couverture : les bandes croissantes doivent couvrir tout
  // [minPossible..maxPossible] — un score patient sans bande n'aurait pas
  // d'interprétation.
  const bornes = erreurs.length === 0 ? bornesScore(questions, type) : null;
  if (bandesValides && bornes) {
    const triees = bandes as BandeInterpretation[];
    if (triees[0].min !== bornes.min) {
      erreurs.push(`La première bande doit commencer au score minimal (${bornes.min}).`);
    }
    for (let i = 1; i < triees.length; i += 1) {
      if (triees[i].min !== triees[i - 1].max + 1) {
        erreurs.push(
          `Les bandes doivent être contiguës et croissantes : la bande ${i + 1} doit commencer à ${
            triees[i - 1].max + 1
          }.`,
        );
      }
    }
    if (triees[triees.length - 1].max !== bornes.max) {
      erreurs.push(`La dernière bande doit finir au score maximal (${bornes.max}).`);
    }
  }

  if (erreurs.length > 0) return { ok: false, erreurs };
  return { ok: true, nbQuestions: questions.length, scoreMax: (bornes as { max: number }).max };
}
