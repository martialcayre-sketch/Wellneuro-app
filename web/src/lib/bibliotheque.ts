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
  // `Q_GEO_04` (MMSE) REVIENT le 2026-07-31, sur arbitrage praticien. Son
  // retrait du 2026-07-29 fermait l'usage en consultation d'un instrument dont
  // les droits ne sont pas dégagés (« © PAR, licence requise »). La décision est
  // reprise pour une raison d'asymétrie : six instruments portant la même
  // classe de réserve sont, eux, ENVOYÉS AU PATIENT — ce qui expose davantage
  // que d'afficher une grille au praticien qui porte la déclaration d'usage.
  //
  // `actif: false` est CONSERVÉ au catalogue : la route d'assignation reste
  // fermée, et le MMSE ne part chez personne. C'est un test administré par le
  // clinicien ; les deux gestes de #460 restent indépendants, seul celui-ci est
  // repris.
  //
  // La réserve « © PAR, licence requise » ne se lève PAS pour autant, et le
  // registre la porte. Elle n'est pas non plus d'une nature à part : une
  // première rédaction affirmait ici que PAR serait le seul ayant droit de cette
  // population à vendre activement sa licence — c'est FAUX, QualityMetric
  // (HIT-6) et GL Assessment (HAD) sont dans le même cas, et tous deux sont déjà
  // ENVOYÉS AU PATIENT. Le fait rectifié renforce l'asymétrie qui motive cette
  // ligne au lieu de l'affaiblir.
  { id: 'Q_GEO_04', categorie: 'Gérontologie' },
  // `Q_GEO_04` (MMSE) est sorti d'ici le 2026-07-29, sur arbitrage praticien :
  // droits non dégagés (« © PAR, licence requise »). Cette ligne portait son
  // AFFICHAGE et l'aperçu de sa grille — le seul accès, dans l'application, aux
  // 30 items pour une passation en consultation. La retirer retire donc l'usage
  // lui-même, et c'est bien l'objet de la décision : fermer un instrument à la
  // seule assignation, tout en continuant d'en afficher la grille, laisserait
  // l'usage licencié se poursuivre sur papier.
  //
  // Les deux gestes sont INDÉPENDANTS, et une rédaction antérieure les avait
  // confondus : elle justifiait ce retrait par un doublon d'affichage qui
  // n'existe pas — `listeBibliotheque` ne montre jamais une entrée inactive, le
  // MMSE ne serait donc apparu qu'une fois. Relevé en revue adversariale,
  // contre-épreuve à l'appui. Le retrait tient, la raison change.
  { id: 'Q_GEO_05', categorie: 'Gérontologie' },
  { id: 'Q_GEO_06', categorie: 'Gérontologie' },
  // `Q_NEU_06` (MMT) ENTRE ici le 2026-07-31, et pour un motif levé sur pièce.
  //
  // Il était fermé parce que « le registre ne nomme aucun auteur, on ne sait pas
  // dire ce qu'il est ». La recherche bibliographique du 2026-07-31 l'instruit :
  // c'est le « MMT ou Mini Mental Test » diffusé par l'IEDM (Institut Européen
  // de Diététique et Micronutrition), document de 2005 — dix items au mot près,
  // mêmes options, même cotation 0/1/2, mêmes quatre bandes que le servi.
  //
  // Et il n'est PAS le MMSE, contrairement à ce que la parenté de ses six
  // premières épreuves laissait craindre : sa propre bande 5-10 ordonne « Faire
  // MMS ». Un instrument qui prescrit le MMSE n'est pas le MMSE, et la réserve
  // « © PAR » ne le concerne pas.
  //
  // Il ne peut pas être auto-administré, et c'est indépendant de ses droits :
  // trois de ses items forment un enregistrement de trois mots puis deux
  // rappels. Dans un formulaire rempli seul, le patient remonte la page et les
  // deux items les plus discriminants deviennent des points offerts.
  { id: 'Q_NEU_06', categorie: 'Gérontologie' },
  // `Q_PED_02` ENTRE ici le 2026-08-01, avec sa débaptisation. Sa place n'est pas
  // au portail patient : la grille est renseignée par un ENSEIGNANT. L'y envoyer
  // ferait remplir le parent à la place de l'informant annoncé, ou ferait
  // transiter le lien magique du patient vers un tiers — qui accéderait alors à
  // tout son portail. Même position que `Q_GEO_03`, renseigné avec l'informant.
  { id: 'Q_PED_02', categorie: 'Pédiatrie' },
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
  /** Présent sur les instruments du cabinet (CAB_) : jamais certifiés,
   * assignables seulement une fois la grille relue puis publiée. */
  cabinet?: { statutRelecture: string };
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
