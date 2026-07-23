// Bibliothèque — rayon Questionnaires (arbitrages utilisateur du 2026-07-23).
//
// Réconcilie les deux catalogues qui coexistent sans table :
// - QUESTIONNAIRES_CATALOG (affichage/assignation, `actif`) ;
// - QUESTIONNAIRE_CATALOGUE (questions.ts — définitions et scoring).
// Trois familles en sortent : les assignables (présents des deux côtés), les
// alias historiques (affichés mais sans définition propre — leur grille vit
// ailleurs), et les instruments à passation praticien (définis mais jamais
// proposés à l'auto-remplissage : tests cliniciens ou journaux).

import { QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';

export type DefinitionCatalogue = QuestionnaireDef & {
  scoring?: { maxTotal?: number; certification?: { status?: string } };
  administrationMode?: string;
};

export const CATALOGUE_DEFINITIONS = QUESTIONNAIRE_CATALOGUE as Record<
  string,
  DefinitionCatalogue | undefined
>;

// Les entrées d'affichage dont la grille est portée par une autre clé du
// catalogue de scoring. Assigner l'alias échouerait (l'id n'existe pas côté
// scoring) : on l'affiche, badge « Alias historique », jamais assignable.
export const ALIAS_HISTORIQUES: Record<string, string> = {
  Q_SOM_08: 'Q_NEU_12',
  Q_STR_07: 'Q_NEU_11',
};

// Instruments scorables absents du catalogue d'affichage : passation en
// consultation (clinicien/informant/journal), jamais auto-administrés.
export const PASSATION_PRATICIEN: { id: string; categorie: string }[] = [
  { id: 'Q_GEO_03', categorie: 'Gérontologie' },
  { id: 'Q_GEO_04', categorie: 'Gérontologie' },
  { id: 'Q_GEO_05', categorie: 'Gérontologie' },
  { id: 'Q_GEO_06', categorie: 'Gérontologie' },
  { id: 'Q_URO_02', categorie: 'Urologie' },
];

export function nbQuestions(def: DefinitionCatalogue | undefined): number | null {
  if (!def?.sections) return null;
  return def.sections.reduce((n, s) => n + (s.questions?.length ?? 0), 0);
}

export function scoreMax(def: DefinitionCatalogue | undefined): number | null {
  const max = def?.scoring?.maxTotal;
  return typeof max === 'number' ? max : null;
}

export function estCertifie(def: DefinitionCatalogue | undefined): boolean {
  return def?.scoring?.certification?.status === 'certifie';
}

// Les ids réellement assignables depuis la bibliothèque : actifs à
// l'affichage ET porteurs d'une définition. Exclut de fait les alias
// historiques (pas de définition) — et les passations praticien (absentes
// de l'affichage) n'y entrent jamais.
export const IDS_ASSIGNABLES: ReadonlySet<string> = new Set(
  QUESTIONNAIRES_CATALOG.filter(q => q.actif && CATALOGUE_DEFINITIONS[q.id]).map(q => q.id),
);

export type BibliothequeEntree = {
  id: string;
  titre: string;
  categorie: string;
  duree: string | null;
  description: string | null;
  nbQuestions: number | null;
  scoreMax: number | null;
  certifie: boolean;
  assignable: boolean;
  aliasVers: string | null;
  passationPraticien: boolean;
};

export function listeBibliotheque(): BibliothequeEntree[] {
  const affiches: BibliothequeEntree[] = QUESTIONNAIRES_CATALOG.filter(q => q.actif).map(q => {
    const aliasVers = ALIAS_HISTORIQUES[q.id] ?? null;
    const def = CATALOGUE_DEFINITIONS[aliasVers ?? q.id];
    return {
      id: q.id,
      titre: q.titre,
      categorie: q.categorie,
      duree: q.duree ?? null,
      description: q.description ?? null,
      nbQuestions: nbQuestions(def),
      scoreMax: scoreMax(def),
      certifie: estCertifie(def),
      assignable: IDS_ASSIGNABLES.has(q.id),
      aliasVers,
      passationPraticien: false,
    };
  });
  const passations: BibliothequeEntree[] = PASSATION_PRATICIEN.flatMap(({ id, categorie }) => {
    const def = CATALOGUE_DEFINITIONS[id];
    if (!def) return [];
    return [
      {
        id,
        titre: def.titre,
        categorie,
        duree: null,
        description: null,
        nbQuestions: nbQuestions(def),
        scoreMax: scoreMax(def),
        certifie: estCertifie(def),
        assignable: false,
        aliasVers: null,
        passationPraticien: true,
      },
    ];
  });
  return [...affiches, ...passations];
}
