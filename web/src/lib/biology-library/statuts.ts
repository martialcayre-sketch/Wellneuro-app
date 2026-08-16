import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import {
  derniereReponseParQuestionnaire,
  evaluerDeclencheur,
  type ReponseOrientation,
} from '@/lib/clinical/orientationEngine';
import type { OrientationClaimRef } from '@/lib/clinical/orientationRulesV1';
import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import type { Remboursement } from './remboursable';
import { signatureIndicationsValide } from './indicationsBiologieV1';
import type { IndicationsBiologieMetadata, RegleIndicationPanel } from './indicationsBiologieV1';

// Moteur de statuts biologie (LOT-06, D-059 §3 et §5) — domaine PUR, sans I/O.
// Il dérive du tableau clinique le statut de chaque panel du catalogue, à
// partir de la table d'indications signée (`indicationsBiologieV1.ts`). Il
// APPLIQUE et COMBINE ; il n'invente ni seuil, ni indication, ni claim
// (`DC-01`, `DC-19`).
//
// FAIL-CLOSED, dans l'ordre, avec un motif lisible en français (même patron
// que `D-055`→`D-058`) : table non signée → rien ; aucune règle publiée →
// rien ; catalogue sans panel actif → rien. Jamais une proposition « au cas
// où », jamais un statut déduit d'une table absente.

export type StatutPanel =
  | 'recommande'
  | 'optionnel'
  | 'conditionnel'
  | 'non_indique_actuellement'
  | 'deja_documente'
  | 'a_repeter';

/** Composition d'un panel telle que lue du catalogue (jamais recopiée ici). */
export type PanelCatalogue = {
  code: string;
  libelle: string;
  niveau: string;
  objectif: string | null;
  actif: boolean;
  analytes: Array<{ code: string; libelle: string }>;
};

/**
 * Panel documenté hors outil, déclaré par le praticien (V1 sans valeurs : le
 * bilan revient sur papier, l'outil n'en connaît que l'existence et la date).
 */
export type PanelDocumente = {
  panelCode: string;
  /** ISO 8601 — date du bilan documenté. */
  documenteLe: string;
};

export type LigneAnalyteProposition = {
  code: string;
  libelle: string;
  validationMedicaleRequise: boolean;
  remboursement: Remboursement;
};

export type LignePanelProposition = {
  panelCode: string;
  libelle: string;
  niveau: string;
  objectif: string | null;
  statut: StatutPanel;
  /**
   * Mode `conditionnel` uniquement : `true` si TOUS les déclencheurs de la
   * règle sont atteints, `false` sinon, `null` hors mode conditionnel. Un
   * déclencheur non rempli ne cache jamais le panel : il s'affiche avec sa
   * condition (`D-059` §5).
   */
  declencheurRempli: boolean | null;
  /** Libellé français de la condition (mode conditionnel). */
  condition: string | null;
  /** Descriptions lisibles : déclencheurs atteints, motif de non-indication… */
  motifs: string[];
  justificationClaims: OrientationClaimRef[];
  analytes: LigneAnalyteProposition[];
};

export type EntreeStatutsBiologie = {
  /** Panels du catalogue publié (composition seule) — vide tant que non peuplé. */
  panels: PanelCatalogue[];
  /** Règles d'indication (la table signée en production, une fixture au banc). */
  regles: RegleIndicationPanel[];
  /**
   * Métadonnées de signature de la table fournie.
   *
   * LES CINQ TERMES, plus le seul booléen ([[D-063]]) : une signature réelle
   * porte sa date, ses claims et le SHA du périmètre relu. Injectable pour que
   * le banc éprouve les deux positions du verrou.
   */
  signature: Pick<
    IndicationsBiologieMetadata,
    'validationExterne' | 'dateValidation' | 'claimsSource' | 'shaPerimetre'
  >;
  /** Passations du dossier — mêmes objets que le moteur d'orientation. */
  reponses: ReponseOrientation[];
  /** Drapeaux d'anamnèse ; absent = aucun déclencheur drapeau atteint (fail-closed). */
  drapeaux?: DrapeauxAnamnese;
  /** Panels déjà documentés hors outil, déclarés par le praticien. */
  documentes?: PanelDocumente[];
  /** Codes d'analytes dont l'interprétation exige une validation médicale. */
  validationMedicale?: ReadonlySet<string>;
  /** Remboursement dérivé par analyte (`deriverRemboursement`), si résolu. */
  remboursements?: ReadonlyMap<string, Remboursement>;
  /** ISO 8601 — « aujourd'hui » pour juger une répétition. Jamais lu de l'horloge ici. */
  dateReference: string;
};

export type PropositionBilan =
  | { ok: false; motif: string }
  | { ok: true; lignes: LignePanelProposition[] };

/** Ordre de présentation : ce qui appelle une action d'abord. */
const ORDRE_STATUTS: Record<StatutPanel, number> = {
  recommande: 0,
  a_repeter: 1,
  conditionnel: 2,
  optionnel: 3,
  deja_documente: 4,
  non_indique_actuellement: 5,
};

/** Une donnée absente n'est jamais un remboursement : `non_evalue` explicite (`DC-24`). */
const REMBOURSEMENT_NON_EVALUE: Remboursement = {
  statut: 'non_evalue',
  conditions: [],
  codesActesRetenus: [],
};

const JOUR_MS = 24 * 60 * 60 * 1000;

function reglesExploitables(regles: RegleIndicationPanel[]): RegleIndicationPanel[] {
  return regles.filter(regle =>
    regle.statut === 'publiee'
    // Une règle sans claim n'est pas traçable jusqu'à sa source : ignorée,
    // même invariant que `evaluerOrientation`.
    && regle.justificationClaims.length > 0
    // Les déclencheurs n'ont de sémantique qu'en mode `conditionnel` ; une
    // règle d'un autre mode qui en porte est ambiguë, donc écartée.
    && (regle.mode === 'conditionnel' ? true : regle.declencheurs.length === 0)
    // Une règle conditionnelle sans condition lisible n'affiche rien
    // d'honnête au praticien quand le déclencheur n'est pas rempli.
    && (regle.mode !== 'conditionnel' || (regle.condition ?? '').trim() !== ''),
  );
}

function statutDocumente(
  regle: RegleIndicationPanel,
  documente: PanelDocumente,
  dateReference: string,
): StatutPanel {
  if (!regle.repetition) return 'deja_documente';
  const documenteLe = Date.parse(documente.documenteLe);
  const reference = Date.parse(dateReference);
  if (Number.isNaN(documenteLe) || Number.isNaN(reference)) return 'deja_documente';
  const ageJours = (reference - documenteLe) / JOUR_MS;
  return ageJours > regle.repetition.delaiJours ? 'a_repeter' : 'deja_documente';
}

/**
 * Dérive la proposition de bilan hiérarchisée. Chaque ligne porte ses claims,
 * son remboursement par analyte et `validationMedicaleRequise` — jamais un
 * statut sans règle publiée pour le fonder (`DC-25` : donnée insuffisante ⇒
 * réduire la conclusion, jamais l'inventer).
 */
export function deriverStatutsBiologie(entree: EntreeStatutsBiologie): PropositionBilan {
  // LE SHA ATTENDU SE CALCULE DEPUIS LES RÈGLES RÉELLEMENT ÉVALUÉES (finding M4
  // de la revue du 2026-08-16). Il était auparavant INJECTÉ par l'appelant
  // (`shaPerimetreAttendu`), à côté des `regles` : un couple signature/sha
  // parfaitement cohérent entre eux mais ÉTRANGER aux règles passées franchissait
  // le verrou, et la table dérivée n'était alors couverte par aucune relecture.
  // Le contournement devient inconstructible : le périmètre haché est celui-là
  // même que la boucle ci-dessous applique.
  if (!signatureIndicationsValide(entree.signature, sha256(JSON.stringify(entree.regles)))) {
    return {
      ok: false,
      motif:
        'La table des indications biologiques n’est pas signée par le praticien — '
        + 'signature incomplète ou périmètre modifié depuis la relecture : '
        + 'aucune proposition de bilan n’est dérivée.',
    };
  }
  const regles = reglesExploitables(entree.regles);
  if (regles.length === 0) {
    return {
      ok: false,
      motif:
        'Aucune règle d’indication biologique publiée et sourcée : '
        + 'aucune proposition de bilan n’est dérivée.',
    };
  }
  const panelsActifs = new Map(
    entree.panels.filter(panel => panel.actif).map(panel => [panel.code, panel]),
  );
  if (panelsActifs.size === 0) {
    return {
      ok: false,
      motif:
        'Le catalogue biologique publié ne contient aucun panel actif : '
        + 'aucune proposition de bilan n’est dérivée.',
    };
  }

  // Deux règles publiées sur un même panel sont une discordance : elle se
  // signale, jamais ne se départage en silence (`DC-30`).
  const parPanel = new Map<string, RegleIndicationPanel[]>();
  for (const regle of regles) {
    const existantes = parPanel.get(regle.panelCode) ?? [];
    existantes.push(regle);
    parPanel.set(regle.panelCode, existantes);
  }

  const dernieres = derniereReponseParQuestionnaire(entree.reponses);
  const documentes = new Map(
    (entree.documentes ?? []).map(doc => [doc.panelCode, doc]),
  );

  const lignes: LignePanelProposition[] = [];
  for (const [panelCode, reglesDuPanel] of parPanel) {
    const panel = panelsActifs.get(panelCode);
    // Règle sans panel actif au catalogue : rien à proposer — la composition
    // vit en base, pas ici.
    if (!panel) continue;
    if (reglesDuPanel.length > 1) {
      lignes.push({
        panelCode,
        libelle: panel.libelle,
        niveau: panel.niveau,
        objectif: panel.objectif,
        statut: 'non_indique_actuellement',
        declencheurRempli: null,
        condition: null,
        motifs: [
          `Discordance de la table d’indications : ${reglesDuPanel.length} règles publiées `
          + `visent ce panel (${reglesDuPanel.map(r => r.id).join(', ')}). `
          + 'Panel écarté jusqu’à arbitrage de la table.',
        ],
        justificationClaims: [],
        analytes: composerAnalytes(panel, entree),
      });
      continue;
    }
    const regle = reglesDuPanel[0];
    const documente = documentes.get(panelCode);

    let statut: StatutPanel;
    let declencheurRempli: boolean | null = null;
    const motifs: string[] = [];

    if (documente) {
      statut = statutDocumente(regle, documente, entree.dateReference);
      motifs.push(
        statut === 'a_repeter'
          ? `Documenté le ${documente.documenteLe.slice(0, 10)}, au-delà du délai de répétition de la règle ${regle.id}.`
          : `Documenté le ${documente.documenteLe.slice(0, 10)} — non reproposé.`,
      );
    } else if (regle.mode === 'conditionnel') {
      statut = 'conditionnel';
      const atteints: string[] = [];
      let tousAtteints = regle.declencheurs.length > 0;
      for (const declencheur of regle.declencheurs) {
        const atteint = evaluerDeclencheur(declencheur, dernieres, entree.drapeaux);
        if (atteint === null) {
          tousAtteints = false;
        } else {
          atteints.push(atteint);
        }
      }
      declencheurRempli = tousAtteints;
      motifs.push(...atteints);
    } else {
      statut = regle.mode;
      if (regle.mode === 'non_indique_actuellement' && regle.motif) {
        motifs.push(regle.motif);
      }
    }

    lignes.push({
      panelCode,
      libelle: panel.libelle,
      niveau: panel.niveau,
      objectif: panel.objectif,
      statut,
      declencheurRempli,
      condition: regle.mode === 'conditionnel' ? regle.condition : null,
      motifs,
      justificationClaims: regle.justificationClaims,
      analytes: composerAnalytes(panel, entree),
    });
  }

  lignes.sort((gauche, droite) =>
    ORDRE_STATUTS[gauche.statut] - ORDRE_STATUTS[droite.statut]
    || gauche.panelCode.localeCompare(droite.panelCode));
  return { ok: true, lignes };
}

function composerAnalytes(
  panel: PanelCatalogue,
  entree: EntreeStatutsBiologie,
): LigneAnalyteProposition[] {
  return panel.analytes.map(analyte => ({
    code: analyte.code,
    libelle: analyte.libelle,
    validationMedicaleRequise: entree.validationMedicale?.has(analyte.code) ?? false,
    remboursement: entree.remboursements?.get(analyte.code) ?? REMBOURSEMENT_NON_EVALUE,
  }));
}
