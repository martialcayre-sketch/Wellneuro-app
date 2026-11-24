/**
 * LES BANDES DES DEUX QUESTIONNAIRES DU BESOIN 4 — chaque borne en constante
 * nommée, avec l'identifiant du claim qui la porte ([[D-526]] §5.2, appliquée
 * par [[D-548]] §2.3, vague 1 de J3-12f).
 *
 * MODULE-FEUILLE, ET IL DOIT LE RESTER : il n'importe rien. `questions.ts` le
 * lit pour bâtir le `scoring` de `Q_GAS_01` et de `Q_INF_01`, le banc
 * `bandesBesoin4.guard.test.ts` le lit pour le confronter au catalogue. Même
 * patron que `bandesPsqi.ts`.
 *
 * CE QUI EST TRANSCRIT, ET CE QUI NE L'EST PAS. Les barèmes de la pièce pro sont
 * transcrits tels que les claims les portent ([[D-526]] §3.1) : « inférieur à »,
 * « entre … et … », « supérieur à ». Les valeurs que ces énoncés ne couvrent pas
 * — 7 et 13 pour le digestif supérieur, par exemple — ne sont PAS comblées par
 * la source ; elles se rangent par la convention ci-dessous, et par elle seule.
 * Aucune borne n'est inventée : un nombre écrit ici est un nombre de claim, ou
 * une valeur frontière que ce claim laisse sans bande.
 *
 * AUCUN TEXTE DE CLAIM : seuls les identifiants et les nombres ([[D-251]] §4).
 * Les libellés A, B, C sont ceux que le catalogue servait déjà, et que le claim
 * `WN-CL-0464-007` nomme ; ils ne changent pas.
 */

/**
 * LA CONVENTION DES VALEURS FRONTIÈRES — un ARBITRAGE du praticien, et non une
 * donnée de la source ([[D-526]] §6.2, question `20261115-1101-b`, option B) :
 * la valeur basse va à la bande inférieure, la valeur haute à la bande
 * supérieure, dans toutes les grilles des deux questionnaires.
 *
 * Écartés par la même décision : aucune bande pour ces valeurs ; garder le
 * rangement servi avant elle, sans provenance et non uniforme.
 */
export const CONVENTION_FRONTIERE_BESOIN_4 = {
  decision: 'D-526',
  section: '§6.2',
  question: '20261115-1101-b',
  option: 'B',
  nature: 'arbitrage du praticien, non une donnée de la source',
} as const;

export type BandeBesoin4 = { min: number; max: number; label: string; color: string };

// ── TFD SIIN 2021 (`Q_GAS_01`) ──────────────────────────────────────────────

/** Les libellés des trois lettres, nommés par `WN-CL-0464-007`. Inchangés. */
export const LIBELLES_TFD = {
  A: 'A — Absence de troubles fonctionnels',
  B: 'B — Troubles fonctionnels modérés à importants',
  C: 'C — Prédominance de troubles fonctionnels majeurs',
} as const;
export const CLAIM_LIBELLES_TFD = 'WN-CL-0464-007';

const COULEURS_TFD = { A: 'success', B: 'warning', C: 'danger' } as const;

/**
 * Une grille du TFD telle que son claim l'énonce : « a. score inférieur à
 * `aInferieurA` ; b. score entre `bDe` et `bA` ; c. supérieur à `cSuperieurA` ».
 */
export type GrilleTfdSource = {
  claimId: string;
  aInferieurA: number;
  bDe: number;
  bA: number;
  cSuperieurA: number;
  /** Maximum de la catégorie ou du total (affiché par le claim). */
  max: number;
};

/**
 * Les six grilles : cinq catégories et le score global. Les nombres sont ceux
 * des claims `WN-CL-0464-001` à `-006`, dans l'ordre des catégories du
 * questionnaire.
 */
export const GRILLES_TFD_SOURCE = {
  C1: { claimId: 'WN-CL-0464-001', aInferieurA: 7, bDe: 8, bA: 12, cSuperieurA: 13, max: 24 },
  C2: { claimId: 'WN-CL-0464-002', aInferieurA: 7, bDe: 8, bA: 10, cSuperieurA: 11, max: 21 },
  C3: { claimId: 'WN-CL-0464-003', aInferieurA: 3, bDe: 4, bA: 6, cSuperieurA: 7, max: 15 },
  C4: { claimId: 'WN-CL-0464-004', aInferieurA: 4, bDe: 5, bA: 9, cSuperieurA: 10, max: 18 },
  C5: { claimId: 'WN-CL-0464-005', aInferieurA: 3, bDe: 4, bA: 6, cSuperieurA: 7, max: 15 },
  GLOBAL: { claimId: 'WN-CL-0464-006', aInferieurA: 23, bDe: 24, bA: 49, cSuperieurA: 50, max: 93 },
} as const satisfies Record<string, GrilleTfdSource>;

export type CleGrilleTfd = keyof typeof GRILLES_TFD_SOURCE;

/**
 * Les deux valeurs que l'énoncé du claim laisse sans bande : la basse
 * (`aInferieurA`, ni « inférieur à » elle-même ni dans « entre ») et la haute
 * (`cSuperieurA`, ni dans « entre » ni « supérieur à » elle-même).
 */
export function valeursFrontieresTfd(g: GrilleTfdSource): { basse: number; haute: number } {
  return { basse: g.aInferieurA, haute: g.cSuperieurA };
}

/**
 * Les trois bandes servies d'une grille, par la convention : la valeur basse va
 * à A (bande inférieure), la valeur haute à C (bande supérieure).
 */
export function bandesTfd(cle: CleGrilleTfd): BandeBesoin4[] {
  const g: GrilleTfdSource = GRILLES_TFD_SOURCE[cle];
  const { basse, haute } = valeursFrontieresTfd(g);
  return [
    { min: 0, max: basse, label: LIBELLES_TFD.A, color: COULEURS_TFD.A },
    { min: g.bDe, max: g.bA, label: LIBELLES_TFD.B, color: COULEURS_TFD.B },
    { min: haute, max: g.max, label: LIBELLES_TFD.C, color: COULEURS_TFD.C },
  ];
}

// ── Questionnaire d'hyperexcitabilité SIIN (`Q_INF_01`) ─────────────────────

/**
 * Les cinq bandes de la pièce pro, posées sans évaluation consensuelle : l'instrument
 * n'a pas fait l'objet d'évaluation. Les deux claims de limites qui le disent
 * sont des claims de PROVENANCE SEULE ([[D-526]] §5.5) : ils ne sont pas cités
 * ici, et ne fondent rien. Les nombres sont ceux de `WN-CL-0446-007` à `-011`.
 *
 * La dernière bande est énoncée « supérieur à 81 » : la valeur 81 n'a donc AUCUNE
 * bande dans la source (80, puis « supérieur à 81 »). C'est la seule valeur
 * frontière de cette grille.
 */
export const BANDES_HYPEREXCITABILITE_SOURCE = [
  { claimId: 'WN-CL-0446-007', de: 0, a: 20, label: "Pas de syndrome d'hyperexcitabilité" },
  { claimId: 'WN-CL-0446-008', de: 21, a: 40, label: "Très léger syndrome d'hyperexcitabilité possible" },
  { claimId: 'WN-CL-0446-009', de: 41, a: 60, label: "Syndrome d'hyperexcitabilité modérée" },
  { claimId: 'WN-CL-0446-010', de: 61, a: 80, label: "Syndrome d'hyperexcitabilité sévère" },
  {
    claimId: 'WN-CL-0446-011',
    superieurA: 81,
    label: "Syndrome d'hyperexcitabilité très sévère ou invalidant",
  },
] as const;

/** Le maximum du questionnaire (`WN-CL-0446-005`). */
export const MAX_HYPEREXCITABILITE = 96;
export const CLAIM_MAX_HYPEREXCITABILITE = 'WN-CL-0446-005';

/**
 * LA VALEUR FRONTIÈRE DE LA GRILLE D'HYPEREXCITABILITÉ — 81 — ET SON RANG.
 *
 * ARBITRÉ PAR LE RESPONSABLE (liste commune `20261124-0800-b`) : la bande
 * SUPÉRIEURE. 81 entre dans « très sévère ou invalidant ».
 *
 * C'est une EXTENSION EXPRESSE de la convention de [[D-526]] §6.2 à une valeur
 * frontière UNIQUE. §6.2 ne la formule que pour des paires de valeurs (la basse
 * va à la bande inférieure, la haute à la bande supérieure) ; la grille
 * d'hyperexcitabilité n'a qu'UNE valeur frontière, à sa frontière HAUTE (entre
 * la quatrième et la cinquième bande), et §6.2 écarte « aucune bande ». Codex,
 * rendu à l'aveugle, n'a retenu aucune option et demandait une règle explicite :
 * la voici — une valeur frontière unique, placée à la frontière haute d'une
 * grille, va à la bande supérieure. Aucune règle ne lit ces bandes ([[D-526]]
 * §3.1). L'autre lecture rangerait 81 dans « sévère » ; elle reste exprimable
 * par `bandesHyperexcitabilite('bande_inferieure')`, pour le banc seulement.
 */
export const RANG_VALEUR_FRONTIERE_81 = 'bande_superieure' as const;

/**
 * Les couleurs des cinq bandes. NI LA PIÈCE NI [[D-526]] NE LES DONNENT ; elles
 * sont VALIDÉES par le responsable (liste commune `20261124-0803-b`) : success,
 * info, warning, danger, dark. Une couleur est une présentation — aucune règle ne
 * lit la bande de cet instrument.
 */
export const COULEURS_HYPEREXCITABILITE = ['success', 'info', 'warning', 'danger', 'dark'] as const;

/** L'autre lecture de la valeur frontière, pour le banc qui la fige. */
export type RangFrontiere = 'bande_inferieure' | 'bande_superieure';

export function bandesHyperexcitabilite(rang: RangFrontiere = RANG_VALEUR_FRONTIERE_81): BandeBesoin4[] {
  const src = BANDES_HYPEREXCITABILITE_SOURCE;
  const derniere = src[src.length - 1];
  const valeurFrontiere = 'superieurA' in derniere ? derniere.superieurA : MAX_HYPEREXCITABILITE;
  return src.map((b, i): BandeBesoin4 => {
    const color = COULEURS_HYPEREXCITABILITE[i];
    if ('superieurA' in b) {
      // La valeur frontière (81) ouvre la bande supérieure, ou reste à la précédente.
      const min = rang === 'bande_superieure' ? valeurFrontiere : valeurFrontiere + 1;
      return { min, max: MAX_HYPEREXCITABILITE, label: b.label, color };
    }
    const avantDerniere = i === src.length - 2;
    const max = avantDerniere && rang === 'bande_inferieure' ? valeurFrontiere : b.a;
    return { min: b.de, max, label: b.label, color };
  });
}
