/**
 * LES CLAIMS QUI NE SERVENT QUE DE PROVENANCE, PAR BESOIN SIGNÉ — une constante,
 * et un banc qui la garde (J3-12f, vague 1 : [[D-548]] §2.2 à §2.5).
 *
 * L'ÉTIQUETAGE NE VAUT PAS AUTORISATION. Seuls les claims cités par une position
 * signée fondent un constat, dans le rôle que la position leur donne. Ceux-ci
 * n'ont, dans les positions signées, qu'un rôle de provenance, de contexte ou de
 * limite : ils ne fondent ni conduite ni déclencheur ([[D-516]] §5.4,
 * [[D-526]] §5.5, [[D-529]] §5.5, [[D-541]] §5.5).
 *
 * MODULE-FEUILLE, FORME OPAQUE ([[D-251]] §4) : des identifiants et des renvois à
 * des décisions, aucun texte de claim. Le banc `claimsProvenanceSeule.guard.test.ts`
 * vérifie qu'aucun de ces identifiants n'est cité par le code qui fonde un
 * déclencheur ou une conduite — les tables de règles, d'indications et de
 * conduites, et les modules qui les évaluent.
 */

const serie = (prefixe: string, de: number, a: number): string[] =>
  Array.from({ length: a - de + 1 }, (_, i) => `WN-CL-${prefixe}-${String(de + i).padStart(3, '0')}`);

export type ListeProvenanceSeule = {
  besoin: number;
  decision: string;
  section: string;
  /** Les claims, groupés par rôle que les positions signées leur donnent. */
  roles: Readonly<Record<string, readonly string[]>>;
};

export const CLAIMS_PROVENANCE_SEULE: readonly ListeProvenanceSeule[] = [
  {
    besoin: 1,
    decision: 'D-516',
    section: '§5.4',
    roles: {
      'bandes et conduites par bande': serie('0471', 61, 68),
      HOMA: ['WN-CL-0658-001'],
      'démarches globales d’exploration ou de prise en charge': [
        'WN-CL-0132-026',
        'WN-CL-0319-013',
        'WN-CL-0376-015',
        'WN-CL-0377-009',
        'WN-CL-0366-009',
        'WN-CL-0045-018',
        'WN-CL-0168-002',
      ],
      'formulation causale excessive': ['WN-CL-0018-019'],
    },
  },
  {
    besoin: 4,
    decision: 'D-526',
    section: '§5.5',
    roles: {
      'population et épidémiologie': ['WN-CL-0349-003', 'WN-CL-0553-001'],
      'instruments cités sans entrer au score': ['WN-CL-0349-010', 'WN-CL-0349-012', 'WN-CL-0163-037', 'WN-CL-0665-002'],
      'limites des deux questionnaires et des examens': ['WN-CL-0446-002', 'WN-CL-0446-006', 'WN-CL-0348-011'],
      'limites et contexte de l’instrument d’intéroception': [
        ...serie('0553', 3, 6),
        ...serie('0553', 8, 10),
        ...serie('0665', 3, 6),
      ],
      'limites des biomarqueurs de perméabilité': [
        ...serie('0660', 1, 4),
        ...serie('0661', 1, 3),
        'WN-CL-0662-001',
        'WN-CL-0662-002',
        'WN-CL-0663-001',
        'WN-CL-0664-001',
      ],
    },
  },
  {
    besoin: 5,
    decision: 'D-529',
    section: '§5.5',
    roles: {
      'population et contexte de validation': [
        'WN-CL-0666-003',
        'WN-CL-0667-002',
        'WN-CL-0668-003',
        'WN-CL-0668-004',
        'WN-CL-0669-002',
      ],
      'instrument de référence cité sans être servi (GPAQ)': ['WN-CL-0669-001', ...serie('0669', 4, 9)],
      'instrument de mobilité retenu pour instruction seulement': [
        'WN-CL-0671-001',
        'WN-CL-0671-003',
        'WN-CL-0671-004',
        'WN-CL-0671-006',
      ],
      'limites de la règle précédente du guide': ['WN-CL-0670-007', 'WN-CL-0670-009'],
      'tensions internes au corpus': ['WN-CL-0052-007', 'WN-CL-0323-021', 'WN-CL-0116-016', 'WN-CL-0048-015'],
    },
  },
  {
    besoin: 9,
    decision: 'D-541',
    section: '§5.5',
    roles: {
      'population et contexte de validation': [
        'WN-CL-0540-001',
        'WN-CL-0541-001',
        'WN-CL-0542-002',
        'WN-CL-0605-004',
        'WN-CL-0605-006',
        'WN-CL-0605-012',
      ],
      'limites des instruments et des études': [
        ...serie('0543', 1, 4),
        'WN-CL-0680-011',
        'WN-CL-0693-007',
        'WN-CL-0693-008',
        'WN-CL-0684-001',
        'WN-CL-0684-003',
        'WN-CL-0682-004',
      ],
      'bandes et diagnostic rapportés par les auteurs, cités sans être repris': ['WN-CL-0622-003', 'WN-CL-0622-005'],
    },
  },
];

/** Tous les identifiants de provenance seule, à plat. */
export function tousLesClaimsProvenanceSeule(): string[] {
  return CLAIMS_PROVENANCE_SEULE.flatMap(l => Object.values(l.roles).flat());
}

/** Les claims de provenance seule d'un besoin ; `[]` si le besoin n'a pas de liste. */
export function claimsProvenanceSeuleDuBesoin(besoin: number): string[] {
  return CLAIMS_PROVENANCE_SEULE.filter(l => l.besoin === besoin).flatMap(l => Object.values(l.roles).flat());
}
