import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { getRecommendedPlate } from '@/lib/food-compass/plates';
import { cleClaim, type ClaimRef } from './catalogueConduitesV1';

/**
 * PORTES BIOLOGIQUES DES ASSIETTES — premier étage, DOCUMENTAIRE ([[D-245]]).
 *
 * Pour une assiette dont un claim du corpus cite un marqueur biologique, cette
 * table dit QUELS marqueurs regarder et QUELS claims citer. Elle ne dit RIEN
 * d'autre, et c'est sa raison d'être :
 *
 * - AUCUN NOMBRE. Pas de borne, pas de sens de comparaison, pas d'unité. Les
 *   bornes vivent dans le TEXTE des claims, que l'écran cite entier ; les en
 *   extraire serait déjà interpréter ([[D-157]]), et les sources se contredisent
 *   (`D-245` §4 : `DC-30`, une discordance se montre, elle ne se tranche pas).
 * - AUCUNE INDICATION. Une ligne ne rend jamais une assiette « indiquée » : elle
 *   pose côte à côte ce que disent les sources et ce que le dossier mesure. Le
 *   rapprochement reste au praticien, qui porte le contexte que `DC-46` exige.
 *
 * UN MODULE À PART, ET NON DES LIGNES DE PLUS DANS `indicationsAssiettesV1.ts`.
 * L'empreinte de celle-ci couvre toutes ses lignes : y toucher éteindrait les
 * sept assiettes servies en production jusqu'à une nouvelle signature
 * (`D-245` §3). Ce module a donc sa propre signature, son propre verrou, sa
 * propre empreinte.
 *
 * LES CODES D'ANALYTES SONT CEUX DU CATALOGUE (`biology_analytes.code`). Ce
 * module ne lit aucune base : son banc de garde vérifie que chacun est inséré
 * par une migration, et le lecteur du LOT-03 dira « aucun résultat au dossier »
 * d'un code qui n'aurait aucune mesure.
 */

export type StatutPorteBiologique = 'publiee' | 'brouillon';

export type LignePorteBiologique = {
  readonly id: string;
  /** Assiette du catalogue C5B, d'axe `indication`. */
  readonly plateCode: string;
  /** Codes `biology_analytes.code` que les claims de la ligne nomment. */
  readonly analyteCodes: readonly string[];
  /** Claims cités ENTIERS à l'écran, dans cet ordre. */
  readonly claims: readonly ClaimRef[];
  readonly statut: StatutPorteBiologique;
};

export type PortesBiologiquesMetadata = {
  readonly validationExterne: boolean;
  readonly dateValidation: string | null;
  readonly claimsSource: readonly ClaimRef[];
  readonly shaPerimetre: string | null;
};

/**
 * LA SÉLECTION DU RESPONSABLE, rendue le 2026-09-23 (cadrage §6) — textes lus au
 * corpus en production, statut `VALIDE`, actifs, non remplacés, une source
 * chacun (constat du 2026-09-24).
 *
 * Écartés, avec leur motif, pour qu'on ne les « rajoute » pas par oubli :
 * `WN-CL-0340-007` (double borne 1/3, prescriptif — contredit les cinq autres
 * sur la CRP-us) et `WN-CL-0292-005` (une association, pas une indication :
 * l'assiette antioxydante n'a donc aucune ligne).
 */
export const PORTES_BIOLOGIQUES_ASSIETTES_V1: readonly LignePorteBiologique[] = [
  {
    id: 'PB-SEROTONINERGIQUE',
    plateCode: 'ASSIETTE_SEROTONINERGIQUE',
    analyteCodes: ['BIO_CRP_US', 'BIO_RATIO_KYN_TRP'],
    claims: [{ claimId: 'WN-CL-0290-007', versionClaim: 'v1.0' }],
    statut: 'publiee',
  },
  {
    id: 'PB-ANTI-INFLAMMATOIRE',
    plateCode: 'ASSIETTE_ANTI_INFLAMMATOIRE',
    analyteCodes: ['BIO_CRP_US', 'BIO_RATIO_KYN_TRP', 'BIO_RATIO_AA_EPA'],
    claims: [{ claimId: 'WN-CL-0293-013', versionClaim: 'v1.0' }],
    statut: 'publiee',
  },
  {
    // Dans l'ordre où `WN-CL-0294-004` les nomme — statut des acides gras
    // érythrocytaires, index, rapport —, puis la CRP-us de `WN-CL-0294-005`. Le
    // statut érythrocytaire a été AJOUTÉ par le responsable au moment de signer
    // (2026-09-24) : le claim le nomme en premier.
    id: 'PB-OMEGA-3',
    plateCode: 'ASSIETTE_OMEGA_3',
    analyteCodes: ['BIO_AG_ERYTHROCYTAIRES', 'BIO_INDEX_OMEGA3', 'BIO_RATIO_AA_EPA', 'BIO_CRP_US'],
    claims: [
      { claimId: 'WN-CL-0294-004', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0294-005', versionClaim: 'v1.0' },
    ],
    statut: 'publiee',
  },
  {
    // Dans l'ordre où `WN-CL-0289-005` les nomme : HVA, HOMA, CRP-us. Le HVA
    // urinaire a été AJOUTÉ à la re-signature du 2026-09-24 : la première
    // relecture le disait, à tort, absent du catalogue (constat de revue, PR
    // #1217). Le MHPG, lui, n'y est pas.
    id: 'PB-DOPAMINERGIQUE',
    plateCode: 'ASSIETTE_DOPAMINERGIQUE',
    analyteCodes: ['BIO_HVA_URINAIRE', 'BIO_RATIO_HOMA', 'BIO_CRP_US'],
    claims: [{ claimId: 'WN-CL-0289-005', versionClaim: 'v1.0' }],
    statut: 'publiee',
  },
  {
    // TROIS SEUILS POUR TROIS QUESTIONS — normale, méthylation insuffisante,
    // risque vasculaire. Les trois sont cités : choisir le « bon » serait
    // trancher à la place du praticien.
    id: 'PB-METHYLATION',
    plateCode: 'ASSIETTE_METHYLATION',
    analyteCodes: ['BIO_HOMOCYSTEINE'],
    claims: [
      { claimId: 'WN-CL-0043-013', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0043-014', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0043-015', versionClaim: 'v1.0' },
    ],
    statut: 'publiee',
  },
];

/**
 * L'EMPREINTE DU PÉRIMÈTRE — lignes ET claims déclarés, par `canonicalSha256`
 * (l'ordre des clés d'un objet ne change pas le sha, l'ordre des lignes si).
 * Exportée pour que les bancs CALCULENT au lieu de recopier.
 */
export function shaPerimetrePortesBiologiques(
  lignes: readonly LignePorteBiologique[],
  claimsSource: PortesBiologiquesMetadata['claimsSource'],
): string {
  return canonicalSha256({ lignes, claimsSource });
}

/**
 * MÉTADONNÉE SIGNÉE — verrou OUVERT depuis [[D-246]]. **Une signature clinique
 * ne se pose jamais par l'outil** : celle-ci a été transcrite sur la déclaration
 * du responsable, rendue en séance après lecture des huit claims ENTIERS, en
 * face de leurs marqueurs — et après deux ajouts : le statut des acides gras
 * érythrocytaires (`WN-CL-0294-004`), de sa main ; puis le HVA urinaire
 * (`WN-CL-0289-005`), à la RE-SIGNATURE, quand la revue a montré que la
 * première relecture le disait à tort absent du catalogue.
 *
 * RE-SIGNER REMPLACE. Toute ligne retouchée, tout marqueur ou claim ajouté
 * périme cette attestation : le périmètre se hache en entier.
 */
export const PORTES_BIOLOGIQUES_ASSIETTES_METADATA: PortesBiologiquesMetadata = {
  validationExterne: true,
  // DÉCLARATION RENDUE EN SÉANCE, APRÈS LECTURE — attestée claim par claim :
  // chaque claim fonde l'affichage de ses marqueurs en face de son assiette.
  dateValidation: '2026-09-24T06:44:55.000Z',
  claimsSource: [
    { claimId: 'WN-CL-0043-013', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0043-014', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0043-015', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0289-005', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0290-007', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0293-013', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0294-004', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0294-005', versionClaim: 'v1.0' },
  ],
  // LITTÉRAL FIGÉ — surtout pas `shaPerimetrePortesBiologiques(...)`, qui rendrait
  // la comparaison tautologique et ferait entrer toute ligne ajoutée plus tard
  // sous une signature acquise ([[D-063]]). Calculé une fois sur le périmètre
  // relu, puis RECOPIÉ ici.
  shaPerimetre: '56575ab47a40bbaebcca5c2523db7f9c60479bb0c856a4f2820c4c955139149c',
};

function estIsoCanonique(valeur: string | null): valeur is string {
  if (valeur === null) return false;
  const date = new Date(valeur);
  // `getTime()` D'ABORD : `toISOString()` jette sur une date invalide, et un
  // verrou doit FERMER, jamais jeter.
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString() === valeur;
}

/**
 * CE QUI REND UNE TABLE INSIGNABLE, ligne par ligne — rendu en texte pour que le
 * banc et la surface de relecture disent la MÊME chose. Vide = rien à redire.
 */
export function anomaliesPortesBiologiques(
  lignes: readonly LignePorteBiologique[] = PORTES_BIOLOGIQUES_ASSIETTES_V1,
): string[] {
  const anomalies: string[] = [];
  const ids = new Set<string>();
  const assiettes = new Set<string>();
  for (const ligne of lignes) {
    if (ids.has(ligne.id)) anomalies.push(`${ligne.id} : identifiant en double`);
    ids.add(ligne.id);
    // UNE LIGNE PAR ASSIETTE : deux lignes pour la même assiette se liraient
    // comme deux portes, alors qu'il n'y a qu'un encart à l'écran.
    if (assiettes.has(ligne.plateCode)) anomalies.push(`${ligne.id} : assiette ${ligne.plateCode} déjà portée`);
    assiettes.add(ligne.plateCode);
    const assiette = getRecommendedPlate(ligne.plateCode);
    // L'EXISTENCE NE SUFFIT PAS : le catalogue porte aussi des repères
    // d'OBSERVATION ([[D-230]]), qu'une porte ne doit jamais désigner.
    if (assiette === null || assiette.axe !== 'indication') {
      anomalies.push(`${ligne.id} : ${ligne.plateCode} n'est pas une assiette d'indication du catalogue`);
    }
    if (ligne.analyteCodes.length === 0) anomalies.push(`${ligne.id} : aucun marqueur`);
    if (new Set(ligne.analyteCodes).size !== ligne.analyteCodes.length) {
      anomalies.push(`${ligne.id} : marqueur en double`);
    }
    if (ligne.claims.length === 0) anomalies.push(`${ligne.id} : aucun claim`);
    if (new Set(ligne.claims.map(cleClaim)).size !== ligne.claims.length) {
      anomalies.push(`${ligne.id} : claim cité deux fois`);
    }
  }
  return anomalies;
}

/**
 * LE VERROU — la table entière sort, ou rien.
 *
 * Six termes : signature posée, date canonique, au moins une ligne, claims
 * déclarés = claims cités (en ensemble), empreinte égale au littéral figé,
 * aucune anomalie. Le dernier n'est pas redondant avec l'empreinte : le sha
 * atteste le CONTENU d'une ligne, pas l'existence de sa cible au catalogue.
 */
export function portesBiologiquesSignees(
  signature: PortesBiologiquesMetadata = PORTES_BIOLOGIQUES_ASSIETTES_METADATA,
  lignes: readonly LignePorteBiologique[] = PORTES_BIOLOGIQUES_ASSIETTES_V1,
): boolean {
  if (signature.validationExterne !== true) return false;
  if (!estIsoCanonique(signature.dateValidation)) return false;
  if (lignes.length === 0) return false;
  if (signature.claimsSource.length === 0) return false;

  const declares = [...new Set(signature.claimsSource.map(cleClaim))].sort();
  const cites = [...new Set(lignes.flatMap(l => l.claims.map(cleClaim)))].sort();
  if (declares.length !== cites.length) return false;
  if (declares.some((claim, index) => claim !== cites[index])) return false;

  if (signature.shaPerimetre === null) return false;
  if (signature.shaPerimetre !== shaPerimetrePortesBiologiques(lignes, signature.claimsSource)) {
    return false;
  }
  return anomaliesPortesBiologiques(lignes).length === 0;
}

/**
 * LES LIGNES QU'UN ÉCRAN A LE DROIT DE RECEVOIR — point de sortie UNIQUE, même
 * contrat que `lignesIndicationAssietteServables` : `claimsValides` est fourni
 * par l'appelant (clés construites par `cleClaim`), et `null` — « je n'ai pas pu
 * lire le corpus » — ferme autant qu'un ensemble vide, sans se confondre avec
 * lui. Une ligne dont UN claim n'est plus valide ne sort pas : citer à moitié
 * serait montrer une source sans son contrepoint.
 */
export function lignesPortesBiologiquesServables(
  claimsValides: ReadonlySet<string> | null,
  signature: PortesBiologiquesMetadata = PORTES_BIOLOGIQUES_ASSIETTES_METADATA,
  lignes: readonly LignePorteBiologique[] = PORTES_BIOLOGIQUES_ASSIETTES_V1,
): readonly LignePorteBiologique[] {
  if (claimsValides === null) return [];
  if (!portesBiologiquesSignees(signature, lignes)) return [];
  return lignes.filter(
    ligne => ligne.statut === 'publiee' && ligne.claims.every(claim => claimsValides.has(cleClaim(claim))),
  );
}
