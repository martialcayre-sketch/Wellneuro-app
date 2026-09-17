import { canonicalSha256 } from '@/lib/clinical-engine/canonical';

// CATALOGUE DE CONDUITES — LOT-01, table SIGNÉE, TROIS LIGNES ([[D-206]],
// [[D-224]], [[D-227]]).
//
// CE QUE CE MODULE EST, ET CE QU'IL N'EST PAS. Il porte la FORME d'une ligne de
// catalogue et le verrou qui la garde. Les lignes qu'il porte n'ont pas été
// écrites par l'outil : elles ont été PROPOSÉES sur une surface de relecture
// (`docs/claude/campagnes/SURFACE_RELECTURE_CATALOGUE_CONDUITES_2026-09-16.md`),
// corrigées après vérification en production, puis ATTESTÉES par le praticien —
// la première le 2026-09-17 au matin, les deux autres le même soir, chacun de
// leurs claims ayant été lu sur pièce d'ici là. Une signature clinique ne se
// pose jamais par l'outil — celles-ci ont été demandées, puis transcrites.
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
 * LA TABLE — TROIS LIGNES, attestées le 2026-09-17 en DEUX gestes ([[D-224]]
 * puis [[D-227]]).
 *
 * POURQUOI DEUX GESTES ET NON UN. Le praticien a d'abord attesté la seule ligne
 * dont tous les claims avaient été lus sur pièce, et retenu les deux autres. Ce
 * n'était pas un demi-geste : le périmètre se hache EN ENTIER, donc les deux
 * lignes retenues sont arrivées par une NOUVELLE attestation sur un périmètre
 * élargi — fonctionnement normal du verrou. L'attente a payé deux fois.
 *
 * CE QUE LA LECTURE SUR PIÈCE A CORRIGÉ, DEUX FOIS, et il faut le dire parce que
 * l'erreur était dans la surface de relecture, jamais dans le corpus.
 *
 * Le matin : les trois lignes proposées citaient `WN-CL-0320-002` en claim
 * d'instrument. Lu en production, ce claim fonde le HAD — juste pour les deux
 * lignes qui se déclenchent sur ses sous-scores, faux pour celle qui se
 * déclenche sur l'IRLS (`Q_SOM_04`).
 *
 * Le soir : la relecture des deux lignes restantes a trouvé, pour chacune, ce
 * que la surface NE proposait PAS. Une interdiction explicite
 * (`WN-CL-0315-004`) là où elle ne citait que la règle de redirection
 * (`WN-CL-0315-006`) ; une règle de sécurité dont l'interdiction était citée
 * sans sa levée, restée dans un claim voisin non désigné (`WN-CL-0316-029`) ;
 * et, dans `WN-SRC-0318`, le claim PRESCRIPTIF qui nomme chaque tableau, comme
 * `WN-CL-0318-020` l'avait fait pour la ligne déjà signée.
 *
 * LA MORALE EST OPPOSABLE, ET ELLE EST PLUS LARGE QUE CELLE DE [[D-224]]. Le
 * sha atteste le contenu relu, pas sa pertinence — c'était le constat du matin.
 * Il ne dit RIEN NON PLUS de ce qui MANQUE au périmètre relu, et c'est le
 * constat du soir : une désignation incomplète passe toutes les gardes,
 * exactement comme une désignation fausse. La seule parade connue est de relire
 * la source ENTIÈRE, claim par claim, et non les seuls claims proposés.
 */
export const CATALOGUE_CONDUITES_V1: readonly LigneConduite[] = [
  {
    cleTableau: 'insomnie_depression',
    sourceId: 'WN-SRC-0315',
    // DEUX CLAIMS DESCRIPTIFS POUR LE QUAND — le trouble du sommeil parmi les
    // critères de la dépression majeure, puis sa forme — ET UN PRESCRIPTIF qui
    // nomme le tableau et fonde la conduite (`WN-CL-0318-023`). Ce dernier
    // n'était pas proposé par la surface : il a été trouvé en relisant
    // `WN-SRC-0318` claim par claim, comme `WN-CL-0318-020` l'avait été pour la
    // ligne jambes sans repos.
    claimsIndication: [
      { claimId: 'WN-CL-0315-001', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0315-002', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0318-023', versionClaim: 'v1.0' },
    ],
    // `WN-CL-0320-002` FONDE L'EMPLOI DU HAD, et sur ses DEUX dimensions — d'où
    // sa justesse ici comme sur la ligne suivante. C'est bien l'instrument de
    // tête de cette ligne, dont le déclencheur lit le sous-score dépressif. Ce
    // que le claim ne fonde PAS — le passage de la bande au syndrome — est
    // déclaré dans `raccourciAssume`, pas supposé ici.
    claimsInstrument: [{ claimId: 'WN-CL-0320-002', versionClaim: 'v1.0' }],
    // DEUX RÈGLES, ET LA SECONDE N'ÉTAIT PAS PROPOSÉE. `WN-CL-0315-006` dit vers
    // quoi rediriger la prise en charge ; `WN-CL-0315-004` porte l'interdiction
    // explicite, avec le risque nommé. Signer sans elle aurait servi cette ligne
    // sans la seule interdiction écrite de son document.
    claimsSecurite: [
      { claimId: 'WN-CL-0315-006', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0315-004', versionClaim: 'v1.0' },
    ],
    raccourciAssume:
      'Les claims fondent l’indication sur la dépression majeure constatée ; le '
      + 'déclencheur, lui, lit une bande du sous-score D du HAD. Le passage de la '
      + 'bande au syndrome est assumé par l’outil — WN-CL-0320-002 fonde l’emploi '
      + 'du HAD, jamais l’équivalence entre une bande et un diagnostic. C’est le '
      + 'même pas que celui déjà assumé par insomnie_jambes_sans_repos (D-224).',
    statut: 'publiee',
  },
  {
    cleTableau: 'insomnie_anxiete',
    sourceId: 'WN-SRC-0316',
    // MÊME COMPOSITION QUE LA LIGNE AU-DESSUS : deux descriptifs pour le QUAND,
    // un prescriptif de `WN-SRC-0318` qui nomme le tableau. Les deux lignes se
    // départagent par la COMORBIDITÉ, jamais par la forme de l'insomnie —
    // celle-ci n'est lisible par aucun déclencheur aujourd'hui.
    claimsIndication: [
      { claimId: 'WN-CL-0316-001', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0316-002', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0318-018', versionClaim: 'v1.0' },
    ],
    // Le même claim d'instrument que la ligne dépression, et pour la même
    // raison : il fonde l'emploi du HAD sur ses DEUX sous-scores. Le déclencheur
    // de cette ligne-ci lit le sous-score anxieux — autre échelle, donc aucun
    // recouvrement avec la ligne au-dessus.
    claimsInstrument: [{ claimId: 'WN-CL-0320-002', versionClaim: 'v1.0' }],
    // TROIS CLAIMS, PARCE QU'UNE RÈGLE DE SÉCURITÉ TRONQUÉE EST PIRE QU'ABSENTE.
    //
    // `WN-CL-0316-016` est le seul des trois cadré EXACTEMENT sur le tableau de
    // cette ligne : il fixe l'ORDRE de la prise en charge. Les deux autres
    // portent sur l'insomnie psychophysiologique — un sous-tableau que le
    // sous-score anxieux ne sait pas distinguer —, et ils vont ENSEMBLE :
    // `WN-CL-0316-006` porte l'interdiction de prescription, `WN-CL-0316-029`
    // porte sa levée partielle.
    //
    // La surface ne proposait que l'interdiction. Le praticien aurait lu une
    // défense dont l'exception vivait deux claims plus loin, dans un outil qui
    // prescrit des compléments alimentaires. Constat de la relecture du soir.
    claimsSecurite: [
      { claimId: 'WN-CL-0316-016', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0316-006', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0316-029', versionClaim: 'v1.0' },
    ],
    raccourciAssume:
      'Deux pas sont assumés par l’outil. Le premier est celui de la ligne '
      + 'dépression : les claims fondent l’indication sur le trouble anxieux '
      + 'constaté, le déclencheur lit une bande du sous-score A du HAD. Le second '
      + 'lui est propre : WN-CL-0316-002 fonde l’indication sur une latence '
      + 'd’endormissement supérieure à 30 minutes, qu’aucun indicateur n’expose — '
      + 'l’agenda 21 nuits l’exclut explicitement — et le sous-score anxieux en '
      + 'tient lieu.',
    statut: 'publiee',
  },
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
    // ci-dessus, qui en portent deux et trois.
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
 * MÉTADONNÉE SIGNÉE — SECONDE attestation du 2026-09-17 ([[D-227]]), qui
 * REMPLACE celle du matin ([[D-224]]) au lieu de s'y ajouter.
 *
 * C'EST LE FONCTIONNEMENT DU VERROU, PAS UNE REPRISE. Le périmètre se hache en
 * entier : ajouter deux lignes change le sha, donc l'attestation précédente ne
 * couvre plus rien. Le praticien a relu le périmètre ÉLARGI — les trois lignes
 * et les quatorze claims — et c'est cette relecture-là que le littéral atteste.
 * La date du matin n'est pas conservée : elle attestait un autre contenu.
 *
 * LA RECOPIE CI-DESSOUS EST MÉCANIQUE et ne vaut que portée par la déclaration
 * du praticien en séance ([[D-195]] §1).
 *
 * DOUZE CLAIMS DE PLUS ENTRENT AU CONTRAT SQL DE FRAÎCHEUR, portant la liste de
 * `conduites` à quatorze paires — inscrites dans
 * `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` et dans son
 * négatif. L'exigence `prescriptif` de la table reste déclarée FALSE, et la
 * relecture du soir CONFIRME l'arbitrage de [[D-224]] au lieu de le supposer :
 * `WN-CL-0320-002`, désormais réellement cité en claim d'instrument par deux
 * lignes, est bien `prescriptif = false` en production. Une exigence à `true`
 * aurait rejeté ces deux lignes.
 */
export const CATALOGUE_CONDUITES_METADATA: CatalogueConduitesMetadata = {
  validationExterne: true,
  dateValidation: '2026-09-17T20:26:03.000Z',
  // L'UNION EXACTE des claims que les TROIS lignes citent, ni plus ni moins — le
  // verrou refuse la divergence dans les deux sens. `WN-CL-0320-002` n'y figure
  // qu'une fois alors que deux lignes le citent : c'est une UNION, et le verrou
  // dédoublonne des deux côtés avant de comparer.
  claimsSource: [
    { claimId: 'WN-CL-0315-001', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0315-002', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0315-004', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0315-006', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0316-001', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0316-002', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0316-006', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0316-016', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0316-029', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0318-018', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0318-020', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0318-023', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0320-002', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0320-003', versionClaim: 'v1.0' },
  ],
  // LITTÉRAL FIGÉ — surtout pas `shaPerimetreConduites(...)`, qui rendrait la
  // comparaison tautologique et ferait entrer toute ligne ajoutée plus tard sous
  // une signature acquise ([[D-063]]).
  shaPerimetre: '36e7ec3ac4e8802dca3cac4ea0070060b3ab958ecca80e21fa4c313f560265ff',
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
 * test. Ce module ne lit aucune base : l'appelant fournit l'ensemble des claims
 * **VALIDE et actifs**, et porte le coût de la lecture.
 *
 * LES CLÉS SE CONSTRUISENT PAR `cleClaim`, JAMAIS À LA MAIN. Cette prose
 * annonçait un séparateur `@` depuis la pose du module, là où `cleClaim` en pose
 * un tout autre — un appelant qui l'aurait suivie
 * aurait construit des clés qui ne correspondent JAMAIS, et reçu zéro ligne **en
 * silence** (constat de revue du 2026-09-17, sur le module voisin qui avait
 * hérité de la même phrase). Le format n'est plus réécrit : on désigne la
 * fonction.
 *
 * UNE LIGNE DONT UN CLAIM N'EST PLUS VALIDE CESSE D'ÊTRE SERVIE (arbitrage du
 * 2026-09-16). Les trois catégories comptent : une sécurité retirée pèse autant
 * qu'une indication retirée — davantage même, puisque c'est elle qui devait
 * s'afficher.
 *
 * `null` = L'ENSEMBLE N'A PAS PU ÊTRE LU, et ce n'est pas `new Set()`. Les deux
 * ferment, mais pas pour la même raison : « je n'ai pas pu lire » n'est pas « aucun claim n'est
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
