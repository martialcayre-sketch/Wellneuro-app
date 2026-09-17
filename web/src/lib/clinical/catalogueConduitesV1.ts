import { canonicalSha256 } from '@/lib/clinical-engine/canonical';

// CATALOGUE DE CONDUITES — LOT-01, table SIGNÉE, UNE LIGNE ([[D-206]], [[D-224]]).
//
// CE QUE CE MODULE EST, ET CE QU'IL N'EST PAS. Il porte la FORME d'une ligne de
// catalogue et le verrou qui la garde. La ligne qu'il porte n'a pas été écrite
// par l'outil : elle a été PROPOSÉE sur une surface de relecture
// (`docs/claude/campagnes/SURFACE_RELECTURE_CATALOGUE_CONDUITES_2026-09-16.md`),
// corrigée après vérification en production, puis ATTESTÉE par le praticien le
// 2026-09-17. Une signature clinique ne se pose jamais par l'outil — celle-ci a
// été demandée, puis transcrite.
//
// L'UNITÉ EST LE TABLEAU CLINIQUE ([[D-206]] A2), pas l'axe ni la plainte. Trois
// documents du corpus traitent l'insomnie et proposent trois conduites
// différentes, départagées par le tableau — un axe « sommeil » ne peut pas
// arbitrer entre elles.
//
// UNE LIGNE DÉSIGNE, ELLE NE RECOPIE PAS. Le gate G6 est fermé : les 507 notices
// sont `rightsStatus: to_verify` et non relues. Une ligne porte un identifiant de
// source et des identifiants de claim — jamais une phrase du corpus.

export type ClaimRef = {
  claimId: string;
  versionClaim: string;
};

export type LigneConduite = {
  /** Clé de tableau clinique, en snake_case. L'identité de la ligne. */
  cleTableau: string;
  /** Source désignée (`WN-SRC-nnnn`). Le contenu reste hors dépôt. */
  sourceId: string;
  /**
   * TROIS LISTES PLATES, ET LE NOM DU CHAMP EST LE DISCRIMINANT — arbitrage du
   * 2026-09-16. Une première version portait un champ `fonde` sur chaque claim ;
   * dès que chaque catégorie a reçu son champ, ce discriminant est devenu
   * redondant, et une énumération qu'on doit maintenir vaut moins qu'un nom qui
   * se lit. Les cinq tables signées du dépôt n'en portent aucun : ce qu'un claim
   * fonde y vit en prose, hors de toute vérification. Ces trois champs le
   * ramènent DANS le périmètre haché, sans énumération à faire vivre.
   *
   * Ce qui fonde QUAND la conduite s'applique. **Au moins un** — une ligne sans
   * indication fondée n'est pas une ligne.
   */
  claimsIndication: readonly ClaimRef[];
  /**
   * Ce qui fonde l'INSTRUMENT de tête dont le déclencheur lit le score. Patron
   * `WN-CL-0228-010` dans `orientationRulesV1.ts:510` : les deux y sont cités
   * côte à côte, et le commentaire dit lequel fait quoi. Peut être vide.
   */
  claimsInstrument: readonly ClaimRef[];
  /**
   * Ce qui fonde une RÈGLE DE SÉCURITÉ portée par la conduite — une
   * contre-indication, une interdiction, un « ne pas traiter isolément ».
   *
   * ELLE S'AFFICHE, ELLE NE BLOQUE PAS (arbitrage du 2026-09-16). La ligne se
   * propose, et sa règle de sécurité se lit avec elle ; le praticien décide.
   * Bloquer aurait demandé un prédicat de « levée », donc un second moteur de
   * règles à côté de `orientationRulesV1` — écarté.
   *
   * Le champ est SÉPARÉ plutôt que noyé dans `claimsIndication` pour qu'un banc
   * puisse exiger qu'une ligne qui en porte un l'affiche : une sécurité qu'on ne
   * sait pas distinguer est une sécurité qu'aucun écran ne peut mettre en avant.
   */
  claimsSecurite: readonly ClaimRef[];
  /**
   * CE QUE LA LIGNE AJOUTE AU-DELÀ DE SES CLAIMS, nommé ICI et non dans un
   * commentaire ([[D-206]] A1 : « un raccourci clinique assumé, nommé sur place,
   * avec ses appuis »). Le champ est DANS le périmètre haché : un raccourci
   * reformulé périme l'attestation. Écrit dans un commentaire, il se
   * reformulerait sans que rien ne bouge — c'est exactement l'état actuel du
   * régime `WN-CL-0287-009`, qui vit hors du sha.
   *
   * `null` = la ligne n'ajoute rien à ses claims. C'est une déclaration, pas une
   * absence : une clé manquante se lirait comme un oubli.
   */
  raccourciAssume: string | null;
  statut: 'publiee' | 'brouillon';
};

/** Les claims d'une ligne, toutes catégories confondues. */
export function claimsDeLaLigne(ligne: LigneConduite): readonly ClaimRef[] {
  return [...ligne.claimsIndication, ...ligne.claimsInstrument, ...ligne.claimsSecurite];
}

/**
 * LA TABLE — UNE SEULE LIGNE, attestée le 2026-09-17 ([[D-224]]).
 *
 * POURQUOI UNE SEULE, ALORS QUE LA SURFACE EN PROPOSAIT TROIS. Le praticien a
 * attesté celle-ci et retenu les deux autres. Ce n'est pas un demi-geste : le
 * périmètre se hache EN ENTIER, donc les deux lignes retenues arriveront par une
 * NOUVELLE attestation sur un périmètre élargi — c'est le fonctionnement normal
 * du verrou, pas une dette.
 *
 * CE QUE LA RELECTURE DU 2026-09-17 A CORRIGÉ, et il faut le dire parce que
 * l'erreur était dans la surface, pas dans le corpus. Les trois lignes
 * proposées citaient `WN-CL-0320-002` en claim d'instrument. Lu en production ce
 * jour-là, ce claim fonde le **HAD** — or cette ligne-ci se déclenche sur
 * l'**IRLS** (`Q_SOM_04`). Le citer aurait attesté un rôle que le claim ne porte
 * pas, ce que ni le CI ni le sha n'auraient jamais vu : le sha atteste le
 * contenu relu, pas sa pertinence.
 */
export const CATALOGUE_CONDUITES_V1: readonly LigneConduite[] = [
  {
    cleTableau: 'insomnie_jambes_sans_repos',
    // LA SOURCE DÉSIGNÉE EST CELLE DU TABLEAU, pas l'union des sources citées.
    // `WN-CL-0318-020` vient de `WN-SRC-0318` et corrobore : la provenance de
    // chaque claim vit sur le claim, ce champ nomme le document qui porte le
    // tableau clinique.
    sourceId: 'WN-SRC-0320',
    // DEUX CLAIMS PRESCRIPTIFS INDÉPENDANTS, chacun fondant l'indication ET la
    // conduite — deux documents distincts disant la même chose. C'est l'assise
    // la plus solide que le corpus permette aujourd'hui sur ce tableau.
    claimsIndication: [
      { claimId: 'WN-CL-0320-003', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0318-020', versionClaim: 'v1.0' },
    ],
    // VIDE, ET C'EST UNE DÉCLARATION. Aucun claim du corpus ne fonde l'IRLS
    // comme instrument de tête de cette ligne — vérifié claim par claim sur
    // `WN-SRC-0320` et sur les quatre appuis de `BIO-SJS-01`, le 2026-09-17. La
    // légitimité du déclencheur ne vient pas d'ici : elle vient de la bande
    // publiée de `Q_SOM_04`, déjà en service dans la table signée des
    // indications de biologie.
    claimsInstrument: [],
    // VIDE, ET C'EST UNE DÉCLARATION AUSSI. Cette conduite ne porte aucune
    // contre-indication ni interdiction — contrairement aux deux lignes
    // retenues, qui en portent chacune une.
    claimsSecurite: [],
    raccourciAssume:
      'Les claims fondent la conduite sur le syndrome constaté ; le déclencheur, lui, '
      + 'lit une bande warning/danger de l’IRLS. Le passage du score au syndrome est '
      + 'assumé par l’outil — c’est le même pas que la règle de biologie BIO-SJS-01, '
      + 'déjà signée.',
    statut: 'publiee',
  },
];

export type CatalogueConduitesMetadata = {
  validationExterne: boolean;
  dateValidation: string | null;
  claimsSource: readonly ClaimRef[];
  /**
   * SURTOUT PAS la constante recalculée : la comparaison deviendrait
   * tautologique — recalculée à chaque chargement des deux côtés — et toute ligne
   * ajoutée entrerait sous une signature acquise. Un littéral de 64 hex, recopié
   * à la main le jour de l'attestation.
   */
  shaPerimetre: string | null;
};

/**
 * LE PÉRIMÈTRE SIGNÉ : `{ lignes, claimsSource }` EN ENTIER, jamais une sélection
 * de champs. Patron `{ regles, abstention }` de `priorityRulesV1.ts`.
 *
 * POURQUOI `claimsSource` EST DEDANS. C'est le champ que le balayage du contrat
 * de fraîcheur lit pour savoir quels claims garder. Laissé hors du périmètre, il
 * se retoucherait sous une signature acquise, et la liste gardée cesserait
 * silencieusement de correspondre à la table.
 *
 * POURQUOI `canonicalSha256` ET NON `sha256(JSON.stringify(...))`. `JSON.stringify`
 * respecte l'ordre d'insertion : déplacer `statut` au-dessus de `sourceId` dans
 * une ligne changerait le sha sans changer un caractère de contenu clinique, et
 * périmerait l'attestation pour rien. La forme canonique trie les clés. C'est le
 * choix déjà fait par `grillesSignees.ts`, avec ce motif écrit — pas une
 * divergence.
 *
 * EXPORTÉE pour que les bancs CALCULENT au lieu de recopier (patron
 * `shaPerimetreBiologie`, `biology-library/statuts.ts`) : un périmètre élargi
 * rougit alors partout à la fois.
 */
export function shaPerimetreConduites(
  lignes: readonly LigneConduite[],
  claimsSource: CatalogueConduitesMetadata['claimsSource'],
): string {
  return canonicalSha256({ lignes, claimsSource });
}

/**
 * MÉTADONNÉE SIGNÉE — attestation du 2026-09-17 ([[D-224]]).
 *
 * LE JOUR DE L'ATTESTATION A BIEN ÉTÉ UNE ÉDITION, et c'est ce que les champs
 * dormants visaient : aucune structure ajoutée, quatre valeurs posées. Le geste
 * qui atteste est la déclaration du praticien en séance ; la recopie ci-dessous
 * est mécanique et ne vaut que portée par elle ([[D-195]] §1).
 *
 * LES DEUX CLAIMS ENTRENT MAINTENANT AU CONTRAT SQL DE FRAÎCHEUR. Le balayage
 * reconnaissait déjà la table à son `claimsSource` même vide ; il en tire
 * désormais deux paires, inscrites dans
 * `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` et dans son
 * négatif. L'exigence `prescriptif` de la table y est déclarée FALSE — arbitrage
 * de [[D-224]], motivé dans `claimsEpinglesFraicheur.guard.test.ts`.
 */
export const CATALOGUE_CONDUITES_METADATA: CatalogueConduitesMetadata = {
  validationExterne: true,
  dateValidation: '2026-09-17T06:06:41.000Z',
  // L'UNION EXACTE des claims que la ligne cite, ni plus ni moins — le verrou
  // refuse la divergence dans les deux sens.
  claimsSource: [
    { claimId: 'WN-CL-0320-003', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0318-020', versionClaim: 'v1.0' },
  ],
  // LITTÉRAL FIGÉ — surtout pas `shaPerimetreConduites(...)`, qui rendrait la
  // comparaison tautologique et ferait entrer toute ligne ajoutée plus tard sous
  // une signature acquise ([[D-063]]).
  shaPerimetre: '933dacb20e22a087ce7d6834878e2bc742216638abc0492a34cf49cccbb937b9',
};

function estIsoCanonique(valeur: string | null): valeur is string {
  if (valeur === null) return false;
  const date = new Date(valeur);
  // `getTime()` D'ABORD : `toISOString()` JETTE sur une date invalide, et un
  // verrou doit FERMER, jamais jeter.
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString() === valeur;
}

export function cleClaim(claim: ClaimRef): string {
  return `${claim.claimId}::${claim.versionClaim}`;
}

/**
 * HUIT TERMES, et les deux termes de non-vacuité ne sont pas une redite de
 * l'égalité.
 *
 * L'ÉGALITÉ EXACTE NE FERME PAS SUR UNE TABLE VIDE, et c'est un piège démontré
 * par l'exécution avant d'être écrit ici : sur zéro ligne, l'union des claims est
 * ∅ et `claimsSource` est ∅ ; `∅ = ∅` est VRAI, donc le terme est SATISFAIT. Une
 * table vide passerait le verrou. `lignes.length > 0` et
 * `claimsSource.length > 0` restent donc nécessaires — « signer zéro ligne
 * n'atteste aucune relecture ».
 */
export function catalogueConduitesSigne(
  signature: CatalogueConduitesMetadata,
  lignes: readonly LigneConduite[] = CATALOGUE_CONDUITES_V1,
): boolean {
  if (signature.validationExterne !== true) return false;
  if (!estIsoCanonique(signature.dateValidation)) return false;
  if (lignes.length === 0) return false;
  if (signature.claimsSource.length === 0) return false;
  // Une ligne sans indication fondée n'est pas une ligne — et ce terme ne se
  // déduit pas de l'égalité ci-dessous : une ligne ne citant qu'un claim
  // d'instrument y passerait sans que rien ne fonde son QUAND.
  if (lignes.some(ligne => ligne.claimsIndication.length === 0)) return false;

  // Le périmètre relu est EXACTEMENT l'union des claims que les lignes citent :
  // ni un claim gardé qu'aucune ligne n'invoque, ni un claim invoqué que le
  // contrat de fraîcheur ne garderait pas.
  const declares = [...new Set(signature.claimsSource.map(cleClaim))].sort();
  const cites = [...new Set(lignes.flatMap(ligne => claimsDeLaLigne(ligne).map(cleClaim)))].sort();
  if (declares.length !== cites.length) return false;
  if (declares.some((claim, index) => claim !== cites[index])) return false;

  if (signature.shaPerimetre === null) return false;
  return signature.shaPerimetre === shaPerimetreConduites(lignes, signature.claimsSource);
}

/**
 * POINT DE SORTIE UNIQUE, fail-closed et MUET — patron `baremeChargeV1`. Une
 * table non signée ne rend pas « un défaut raisonnable » : elle rend RIEN. Le
 * dépôt a mesuré ce que devient une table livrée vide dont le chemin sert quand
 * même — `clinical_rules` et le catalogue d'alertes portent zéro ligne chacun, et
 * leurs lecteurs ont continué de servir comme si de rien n'était.
 *
 * `claimsValides` EST UN PARAMÈTRE, ET C'EST LA DOCTRINE DU DÉPÔT — patron de
 * `gatePopulationV1`, dont la table de curation est un paramètre pour qu'un banc
 * exerce toutes les branches sans qu'aucune donnée non relue n'existe hors du
 * test. Ce module ne lit aucune base : l'appelant fournit les clés
 * `claimId@versionClaim` des claims **VALIDE et actifs**, et porte le coût de la
 * lecture.
 *
 * UNE LIGNE DONT UN CLAIM N'EST PLUS VALIDE CESSE D'ÊTRE SERVIE (arbitrage du
 * 2026-09-16). Les trois catégories comptent : une sécurité retirée pèse autant
 * qu'une indication retirée — davantage même, puisque c'est elle qui devait
 * s'afficher.
 *
 * `null` = STATUTS NON LUS, et ce n'est pas `new Set()`. Les deux ferment, mais
 * pas pour la même raison : « je n'ai pas pu lire » n'est pas « aucun claim n'est
 * valide ». L'appelant doit pouvoir le dire au praticien ; confondre les deux est
 * le silence que `DC-24` interdit.
 *
 * AUCUN APPELANT DE PRODUCTION AU LOT-01, et c'est dit plutôt que masqué. Le
 * dépôt a déjà SUPPRIMÉ une fonction de ce profil (`suggererCharge` serveur,
 * motif écrit dans `baremeChargeV1.ts`). La différence est bornée et vérifiable :
 * celle-ci est le seul chemin de service prévu, elle est exercée par son banc de
 * garde, et son consommateur est le LOT-04. Si ce lot ne vient pas, cette
 * fonction se supprime — elle ne se reconduit pas.
 */
export function lignesConduitesServables(
  claimsValides: ReadonlySet<string> | null,
  signature: CatalogueConduitesMetadata = CATALOGUE_CONDUITES_METADATA,
  lignes: readonly LigneConduite[] = CATALOGUE_CONDUITES_V1,
): readonly LigneConduite[] {
  if (claimsValides === null) return [];
  if (!catalogueConduitesSigne(signature, lignes)) return [];
  return lignes.filter(
    ligne =>
      ligne.statut === 'publiee'
      && claimsDeLaLigne(ligne).every(claim => claimsValides.has(cleClaim(claim))),
  );
}
