// La minute d'après (SP-COP LOT-02) — domaine PUR, aucune dépendance Prisma.
//
// Juste après la consultation, trois objets doivent exister avant que quoi que
// ce soit puisse partir vers le patient : la **décision** (priorité retenue), le
// **protocole** (version relue) et le **document** (source validée praticien).
// Ce module ne les produit pas — ils sont déjà là, produits par C1/C2A/C3. Il
// dit seulement, d'un coup d'œil, **où en est la chaîne** et **ce qui manque**.
//
// Trois refus, hérités du pré-vol et resserrés ici :
//   1. aucun envoi — `pretPourDiffusion` est un constat, jamais un déclencheur ;
//   2. aucune écriture — la relecture et l'approbation se posent là où elles
//      vivent déjà (`/api/praticien/protocoles`, `.../diffusion`) ; dupliquer
//      ces chemins ferait diverger deux vérités sur le même invariant ;
//   3. aucune supposition — une étape dont l'état n'est pas lisible est
//      `indisponible`, jamais optimistement « faite ».
//
// Le chaînage append-only (tête de fil des versions et des approbations) N'EST
// PAS refait ici : l'appelant fournit la version et l'approbation déjà résolues
// par `resolveActiveVersion` / `resolveActiveApproval`. Une seule implémentation
// de cette règle, celle de C2A.

/**
 * `caduque` n'est pas `a_faire` : l'étape a bien été franchie, mais sur une
 * version qui n'est plus la version active. La distinction est clinique — on ne
 * redemande pas la même chose, on signale qu'un contenu a changé depuis.
 */
export type StatutEtape = 'faite' | 'a_faire' | 'caduque' | 'indisponible';

export type CleEtape = 'protocole_relu' | 'diffusion_approuvee' | 'document_diffusable';

export type EtapeCloture = {
  cle: CleEtape;
  libelle: string;
  statut: StatutEtape;
  /** ISO — date de franchissement quand l'étape est faite ou caduque. */
  date: string | null;
  /** Patron « pourquoi maintenant » du Fil : ce que cet état signifie, ici et maintenant. */
  pourquoiMaintenant: string;
};

export type DecisionCloture = {
  selectedPriorityId: string;
  versionInputHash: string;
  enregistreLe: string; // ISO
};

export type Cloture = {
  decision: DecisionCloture | null;
  etapes: EtapeCloture[];
  /** Une phrase par étape non franchie, en français, adressée au praticien. */
  blocages: string[];
  /** Constat : les trois étapes sont franchies sur la version active. N'envoie rien. */
  pretPourDiffusion: boolean;
};

/** Version active du protocole, déjà résolue en tête de fil par l'appelant. */
export type VersionActiveCloture = {
  inputHash: string;
  selectedPriorityId: string;
  status: string;
  reviewedAt: Date | null;
  createdAt: Date;
};

/** Approbation « pour diffusion » active, déjà résolue en tête de chaîne. */
export type ApprobationActiveCloture = {
  protocolDraftInputHash: string;
  approvedAt: Date;
};

/**
 * Synthèse IA source d'un éventuel document. Le statut est une chaîne libre en
 * base : la garde de régime vit donc en code (cf. `lib/documents/types.ts`).
 */
export type SyntheseSourceCloture = {
  statut: string;
  dateValidation: Date | null;
};

export type EntreesCloture = {
  versionActive: VersionActiveCloture | null;
  approbationActive: ApprobationActiveCloture | null;
  syntheses: SyntheseSourceCloture[];
};

/**
 * Statuts de synthèse validés praticien — recopiés de `STATUTS_SYNTHESE_VALIDES`
 * (C3) plutôt qu'importés, pour que ce domaine reste sans dépendance. Les deux
 * listes doivent rester identiques ; un test le vérifie.
 */
const STATUTS_SYNTHESE_DIFFUSABLES: readonly string[] = ['Validee_Praticien', 'Corrigee_Praticien'];

function etapeIndisponible(cle: CleEtape, libelle: string, pourquoi: string): EtapeCloture {
  return { cle, libelle, statut: 'indisponible', date: null, pourquoiMaintenant: pourquoi };
}

function dateLisible(date: Date | null | undefined): string | null {
  const instant = date?.getTime?.();
  return Number.isFinite(instant) ? (date as Date).toISOString() : null;
}

function composerProtocoleRelu(version: VersionActiveCloture): EtapeCloture {
  const relu = version.status === 'practitioner_reviewed' && dateLisible(version.reviewedAt) !== null;
  return {
    cle: 'protocole_relu',
    libelle: 'Protocole relu',
    statut: relu ? 'faite' : 'a_faire',
    date: relu ? dateLisible(version.reviewedAt) : null,
    pourquoiMaintenant: relu
      ? 'La version active du protocole porte une relecture praticien datée.'
      : 'La version active du protocole n’a pas encore été relue : rien ne peut être approuvé avant.',
  };
}

function composerDiffusion(
  version: VersionActiveCloture,
  approbation: ApprobationActiveCloture | null,
): EtapeCloture {
  const libelle = 'Validé pour diffusion';
  if (approbation === null) {
    return {
      cle: 'diffusion_approuvee',
      libelle,
      statut: 'a_faire',
      date: null,
      pourquoiMaintenant: 'Aucune approbation de diffusion n’existe pour ce protocole.',
    };
  }
  // Une approbation ancrée sur une version supplantée ne vaut plus : le contenu
  // approuvé n'est plus celui qui partirait.
  if (approbation.protocolDraftInputHash !== version.inputHash) {
    return {
      cle: 'diffusion_approuvee',
      libelle,
      statut: 'caduque',
      date: dateLisible(approbation.approvedAt),
      pourquoiMaintenant:
        'L’approbation porte sur une version antérieure du protocole : le contenu a changé depuis, elle est à reprendre.',
    };
  }
  return {
    cle: 'diffusion_approuvee',
    libelle,
    statut: 'faite',
    date: dateLisible(approbation.approvedAt),
    pourquoiMaintenant: 'Le contenu de la version active est approuvé pour diffusion.',
  };
}

function composerDocument(syntheses: SyntheseSourceCloture[]): EtapeCloture {
  const validees = syntheses
    .filter((synthese) => STATUTS_SYNTHESE_DIFFUSABLES.includes(synthese.statut))
    .map((synthese) => dateLisible(synthese.dateValidation))
    .filter((date): date is string => date !== null)
    .sort((gauche, droite) => new Date(droite).getTime() - new Date(gauche).getTime());

  const diffusable = validees.length > 0;
  return {
    cle: 'document_diffusable',
    libelle: 'Document validé praticien',
    statut: diffusable ? 'faite' : 'a_faire',
    date: diffusable ? validees[0] : null,
    pourquoiMaintenant: diffusable
      ? 'Une synthèse validée par le praticien peut alimenter le document destiné au patient.'
      : 'Aucune synthèse validée praticien : un contenu généré ne peut pas être diffusé en l’état.',
  };
}

const BLOCAGE_PAR_ETAPE: Readonly<Record<CleEtape, string>> = {
  protocole_relu: 'Relire la version active du protocole avant toute approbation.',
  diffusion_approuvee: 'Approuver le contenu pour diffusion depuis la fiche du protocole.',
  document_diffusable: 'Faire valider une synthèse praticien avant de composer le document.',
};

/**
 * Compose l'état de clôture. Ne persiste rien, ne déclenche rien : le retour est
 * un constat recalculé à chaque ouverture, comme le pré-vol.
 */
export function construireCloture(entrees: EntreesCloture): Cloture {
  const { versionActive, approbationActive, syntheses } = entrees;

  if (versionActive === null) {
    // Sans protocole enregistré, les trois étapes n'ont pas d'objet — les
    // afficher « à faire » laisserait croire qu'il suffit de cocher.
    return {
      decision: null,
      etapes: [
        etapeIndisponible(
          'protocole_relu',
          'Protocole relu',
          'Aucun protocole n’est enregistré pour ce patient : il n’y a rien à relire.',
        ),
        etapeIndisponible(
          'diffusion_approuvee',
          'Validé pour diffusion',
          'Sans protocole enregistré, aucune approbation de diffusion n’a d’objet.',
        ),
        etapeIndisponible(
          'document_diffusable',
          'Document validé praticien',
          'Sans protocole enregistré, aucun document de clôture n’est composé.',
        ),
      ],
      blocages: ['Enregistrer un protocole pour ce patient avant de clôturer la consultation.'],
      pretPourDiffusion: false,
    };
  }

  const etapes = [
    composerProtocoleRelu(versionActive),
    composerDiffusion(versionActive, approbationActive),
    composerDocument(syntheses),
  ];

  const blocages = etapes
    .filter((etape) => etape.statut !== 'faite')
    .map((etape) => BLOCAGE_PAR_ETAPE[etape.cle]);

  return {
    decision: {
      selectedPriorityId: versionActive.selectedPriorityId,
      versionInputHash: versionActive.inputHash,
      enregistreLe: dateLisible(versionActive.createdAt) ?? new Date(0).toISOString(),
    },
    etapes,
    blocages,
    pretPourDiffusion: etapes.every((etape) => etape.statut === 'faite'),
  };
}
