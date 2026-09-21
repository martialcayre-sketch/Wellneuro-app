import type { RecommendedPlateRef, RepliAssietteDeclare } from './types';

export const C5B_PLATE_CATALOG_VERSION = 'c5b-plate-catalog-v1' as const;

/**
 * Empreinte du catalogue ENTIER — elle a changé le 2026-09-18 ([[D-230]]) en
 * passant de trois à quinze entrées : `7f8440be…` → `2a2742ac…`.
 *
 * `catalogVersion` NE CHANGE PAS, et c'est le point délicat. Le faire changer
 * aurait périmé d'un coup toutes les références d'assiette consignées en
 * production (`assertCurrentRecommendedPlateRef` compare `catalogVersion` entre
 * autres). Or le contrat de référence n'est pas rompu : les trois repères
 * gardent leurs quatre champs hachés, donc leur `contentHash` et leur `refHash`
 * à l'octet près. Le catalogue s'AJOUTE, il ne se réécrit pas — et c'est la
 * seule forme d'extension qui n'exige pas de migrer des références existantes.
 */
export const C5B_PLATE_CATALOG_HASH = '2a2742acd152e17fa58f1eb9193bfdbedec51a7ff7eae552db0ca69c3d6d0a8f' as const;

export type C5bRecommendedPlate = {
  catalogVersion: typeof C5B_PLATE_CATALOG_VERSION;
  plateCode: string;
  label: string;
  /**
   * L'AXE SUR LEQUEL CETTE ASSIETTE SE DÉPARTAGE DES AUTRES, et il décide quelle
   * liste a le droit de la proposer ([[D-230]]).
   *
   * `moment_repas` — les trois repères historiques de `JA5-03`. Ils répondent à
   * « quand », n'ont **aucune source** et ne prétendent rien.
   * `indication` — les douze assiettes du corpus. Elles répondent à « pour qui »,
   * et chacune est adossée à un protocole prescriptif.
   *
   * POURQUOI CE CHAMP EXISTE PLUTÔT QU'UNE CONVENTION. L'arbitrage « ne pas
   * fondre les trois dans les douze » était écrit dans la surface de relecture
   * depuis le 2026-09-16, et **rien dans le code ne le portait** : le catalogue
   * était une liste plate, et son unique consommateur la rendait ENTIÈRE. Les
   * douze entrées ajoutées sans ce champ auraient mélangé les deux axes à
   * l'endroit précis où le praticien les voit, et fait croire aux trois une
   * provenance qu'elles n'ont pas.
   *
   * IL N'ENTRE PAS DANS `contentHash`, ET C'EST DÉLIBÉRÉ — voir le commentaire
   * de `contentHash` ci-dessous.
   */
  axe: 'moment_repas' | 'indication';
  /**
   * Le protocole du corpus qui fonde cette assiette — `null` pour les trois
   * repères, qui n'en ont aucun.
   *
   * IL REND L'AXE VÉRIFIABLE AU LIEU DE DÉCLARATIF. Sans lui, `axe` serait une
   * étiquette que rien ne contrôle et qu'un futur éditeur pourrait retourner
   * sans qu'aucun banc ne bouge. Avec lui, le banc confronte les deux au
   * registre des sources : une assiette d'`indication` doit nommer un protocole
   * `prescriptive: true`, une assiette de `moment_repas` ne doit en nommer aucun.
   *
   * C'EST UNE DÉSIGNATION, PAS UNE RECOPIE. Gate G6 fermée : l'identifiant de la
   * source entre, jamais son contenu — et la composition de l'assiette reste
   * écrite par le praticien, comme le dit le commentaire du catalogue.
   */
  sourceProtocole: string | null;
  /**
   * SUPPLANTÉ PAR LA TABLE DE REPLIS ([[D-241]]), ET POURTANT IL RESTE — parce
   * qu'il est HACHÉ.
   *
   * Ce champ était l'étiquette d'appartenance dont la comparaison faisait une
   * CLIQUE COMPLÈTE : trois assiettes déclarées valaient six substitutions,
   * dans les deux sens. La relation orientée vit désormais dans
   * `lib/clinical/replisAssietteV1.ts`, hors du catalogue.
   *
   * POURQUOI ON NE LE SUPPRIME PAS. Il est l'un des QUATRE champs du
   * `contentHash` — le retirer changerait l'empreinte de chaque entrée, donc
   * périmerait toute référence déjà consignée, protocoles compris depuis
   * [[D-240]]. Mesuré, pas supposé : le banc recalcule les deux cas. Il reste
   * donc `null` partout, et un garde l'y tient.
   */
  substitutionFamily: string | null;
  /**
   * Empreinte d'intégrité de l'entrée, sur `{ catalogVersion, plateCode, label,
   * substitutionFamily }` — et **sur ces quatre champs seulement**.
   *
   * POURQUOI `axe` ET `sourceProtocole` EN SONT EXCLUS, et ce n'est pas un
   * oubli. Une référence d'assiette déjà consignée sur un dossier patient porte
   * ce `contentHash` ; `assertCurrentRecommendedPlateRef` refuse toute référence
   * dont il a bougé. Faire entrer les deux champs neufs dans le calcul aurait
   * périmé, d'un coup, **toutes les références déjà posées en production** sur
   * les trois repères. Or ces deux champs ne disent pas ce que l'assiette EST :
   * ils disent quelle liste a le droit de la proposer et d'où elle vient. La
   * référence reste exacte quand ils changent. Ils sont scellés par
   * `C5B_PLATE_CATALOG_HASH`, qui porte l'entrée entière.
   */
  contentHash: string;
  ref: RecommendedPlateRef;
};

/**
 * Catalogue C5B V1 — QUINZE entrées sur DEUX axes, et les deux ne se mélangent
 * pas ([[D-230]]).
 *
 * LES TROIS PREMIÈRES reprennent sans enrichissement clinique les repères
 * historiquement codés dans `JA5-03`. Elles se départagent par le **moment du
 * repas**, n'ont aucune source, et sont **inchangées** : leurs quatre champs
 * hachés sont ceux du 2026-07, donc les références déjà consignées en production
 * restent valides.
 *
 * LES DOUZE SUIVANTES sont les assiettes du corpus, adossées une à une aux
 * protocoles `WN-SRC-0284` → `0295` (`prescriptive: true`, tous curés au
 * registre des interventions). Elles se départagent par l'**indication**. Leur
 * libellé est celui que le corpus leur donne — il le DÉSIGNE, il ne recopie
 * aucun claim.
 *
 * Le contenu précis de l'assiette reste une décision manuelle du praticien ;
 * aucune composition n'est inventée ici. `substitutionFamily` reste `null`
 * partout : [[D-216]] §4 refuse toute famille avant un mécanisme orienté.
 *
 * **CE CATALOGUE NE SE REND JAMAIS EN ENTIER À UN ÉCRAN.** Passer par
 * `assiettesParMomentDeRepas` ou `assiettesParIndication` — c'est le point de
 * service, et il existe parce que son absence était le défaut.
 */
export const C5B_RECOMMENDED_PLATES: readonly C5bRecommendedPlate[] = [
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_PETIT_DEJEUNER_SIMPLE',
    label: 'Assiette recommandée — Petit-déjeuner simple',
    axe: 'moment_repas',
    sourceProtocole: null,
    substitutionFamily: null,
    contentHash: '2c3650b80985de2819205a8e982e27a6dd26feb2fdd9eda6ba6f8dc36ddd3cdc',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_PETIT_DEJEUNER_SIMPLE',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '2c3650b80985de2819205a8e982e27a6dd26feb2fdd9eda6ba6f8dc36ddd3cdc',
      refHash: '7f89d226226fc7c411b8c1ac640126b4bca2978844e26388305adb7dfa8e34ea',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_DEJEUNER_EXTERIEUR',
    label: 'Assiette recommandée — Déjeuner extérieur',
    axe: 'moment_repas',
    sourceProtocole: null,
    substitutionFamily: null,
    contentHash: 'd063a62aad641c68955331754e7f6ea098dddfbd3fd2de44ba58bee5e0d232db',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_DEJEUNER_EXTERIEUR',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: 'd063a62aad641c68955331754e7f6ea098dddfbd3fd2de44ba58bee5e0d232db',
      refHash: 'd070a4eb1884a015f2b0676ed2d5413ef71edbd5d308056c2b3c02db45f5adb7',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_SOIR_LEGER',
    label: 'Assiette recommandée — Soir léger',
    axe: 'moment_repas',
    sourceProtocole: null,
    substitutionFamily: null,
    contentHash: '4140aa2ca64887edd7cce0e40661f49d77b51fbda6d575ca2a0c32ba1baf9454',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_SOIR_LEGER',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '4140aa2ca64887edd7cce0e40661f49d77b51fbda6d575ca2a0c32ba1baf9454',
      refHash: 'de3ddfaba871e778f84cca076247bf4e30a230121c974faa06bc797811d34e86',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_VEGETALE',
    label: 'Assiette végétale',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0284',
    substitutionFamily: null,
    contentHash: 'f083b16c8a12cbc32f9090abfe25bb7287960a4b33971415c4db112f65bac69b',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_VEGETALE',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: 'f083b16c8a12cbc32f9090abfe25bb7287960a4b33971415c4db112f65bac69b',
      refHash: '44ec6690ddea4668fdee0d1f9bdf6cec902f4fa4864dfdd6e7a7e3d46160690b',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_EPARGNE_DIGESTIVE',
    label: 'Assiette d’épargne digestive',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0285',
    substitutionFamily: null,
    contentHash: '89e86a4212bc74651c9e34d816598b1c5fbed4a152bdeef07d9eae48444febfb',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_EPARGNE_DIGESTIVE',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '89e86a4212bc74651c9e34d816598b1c5fbed4a152bdeef07d9eae48444febfb',
      refHash: '4dc9ee7ab034b975a81c89184a91d663b27990da400a8a86ddb99b8927d41a91',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_METHYLATION',
    label: 'Assiette de méthylation optimale',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0286',
    substitutionFamily: null,
    contentHash: '32845f790769a40490eb6152645178a6bddee0ef4bd6fec34a14926c69d63504',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_METHYLATION',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '32845f790769a40490eb6152645178a6bddee0ef4bd6fec34a14926c69d63504',
      refHash: 'd76b455c17188d84e753270b79617af6791f849f582de2a6e7f56c639231907b',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_DETOXICATION',
    label: 'Assiette de détoxication',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0287',
    substitutionFamily: null,
    contentHash: '332107dcb421a5935668ccac4b1d5ff3e3e835c7101cb98692d5f44658235370',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_DETOXICATION',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '332107dcb421a5935668ccac4b1d5ff3e3e835c7101cb98692d5f44658235370',
      refHash: '43191d11291b2cdebff3e6448dc4e06f80188598ada9810bd6268a876b24e9b9',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_PROTEINEE',
    label: 'Assiette protéinée',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0288',
    substitutionFamily: null,
    contentHash: 'f976e4fd801381b9572699d415906e6f9def55e894d524a154e8c808dbc83483',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_PROTEINEE',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: 'f976e4fd801381b9572699d415906e6f9def55e894d524a154e8c808dbc83483',
      refHash: '7122217e59d66f90fdeb0943d089d2cbdf07236c52e666df087f6dbe96ecbdc7',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_DOPAMINERGIQUE',
    label: 'Assiette dopaminergique',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0289',
    substitutionFamily: null,
    contentHash: '309951299f4e69dc69085b3ba2858aad298accb542c72616961f241e0a29d785',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_DOPAMINERGIQUE',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '309951299f4e69dc69085b3ba2858aad298accb542c72616961f241e0a29d785',
      refHash: 'a6bd7265cb59d94b86915ece9c186e84c3a3b026646bfdc4f22ac3300ceed707',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_SEROTONINERGIQUE',
    label: 'Assiette sérotoninergique',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0290',
    substitutionFamily: null,
    contentHash: '7bb2e02b4e1d8be10c1389c846a4b6813e2917d7b5dd3c83c075b730a6f98aad',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_SEROTONINERGIQUE',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '7bb2e02b4e1d8be10c1389c846a4b6813e2917d7b5dd3c83c075b730a6f98aad',
      refHash: 'be09d2c8ec588238c450a0adf3c8224b94a97393d57627b709c44b8375e3af89',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_PSYCHOBIOTIQUE',
    label: 'Assiette psychobiotique',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0291',
    substitutionFamily: null,
    contentHash: 'ba7ca543ecc4180dd5629b17fdd65630b4142fe05ba5e5c5473cb8c381f5328d',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_PSYCHOBIOTIQUE',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: 'ba7ca543ecc4180dd5629b17fdd65630b4142fe05ba5e5c5473cb8c381f5328d',
      refHash: '7bad3f2d5ae28595b60779b17d82e9de42b1bbefc9324a6a1ddc2a5685ce63a1',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_ANTIOXYDANTE',
    label: 'Assiette antioxydante',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0292',
    substitutionFamily: null,
    contentHash: '42177459a9c6709f5edb9c80623ba29050eb30387d766e714d844f91e916e201',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_ANTIOXYDANTE',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '42177459a9c6709f5edb9c80623ba29050eb30387d766e714d844f91e916e201',
      refHash: '4304fa3ecf858ba6d65e4f0a46a43c0c7bb268f4d0090c52bd84a12870c5bf7d',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_ANTI_INFLAMMATOIRE',
    label: 'Assiette anti-inflammatoire',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0293',
    substitutionFamily: null,
    contentHash: '81c5792ac141f73c70919db8b5fdaac66e9c534b3677ec71618ac8e1042fd9b2',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_ANTI_INFLAMMATOIRE',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '81c5792ac141f73c70919db8b5fdaac66e9c534b3677ec71618ac8e1042fd9b2',
      refHash: '75d240567bd53fbd8df232612c561c86917d76ffb6bb0d97688641c64526d969',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_OMEGA_3',
    label: 'Assiette oméga 3',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0294',
    substitutionFamily: null,
    contentHash: '52ad11e533e954f13e75c7d4839f620f640f01f5613c663850dbd7c113b27312',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_OMEGA_3',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '52ad11e533e954f13e75c7d4839f620f640f01f5613c663850dbd7c113b27312',
      refHash: '577a0e159d80477f37ba27c6cc1b2ff2cdad9474a95f9e316a56090811daed53',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_CHRONOBIOLOGIQUE',
    label: 'Assiette chronobiologique',
    axe: 'indication',
    sourceProtocole: 'WN-SRC-0295',
    substitutionFamily: null,
    contentHash: '96dc3ae5825aa75359f23f9371d2c8417eb063f4bb48bc3777482f2ba8b97880',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_CHRONOBIOLOGIQUE',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '96dc3ae5825aa75359f23f9371d2c8417eb063f4bb48bc3777482f2ba8b97880',
      refHash: '35a0b8e03b20191cb5daccc4a626f4adb83ea64fd416efeb7f2afa791e7eeab5',
    },
  },
] as const;

export function getRecommendedPlate(plateCode: string): C5bRecommendedPlate | null {
  return C5B_RECOMMENDED_PLATES.find(plate => plate.plateCode === plateCode) ?? null;
}

/**
 * LES ASSIETTES QU'UNE LISTE A LE DROIT DE PROPOSER — deux points de service,
 * et le catalogue n'en a plus d'autre ([[D-230]]).
 *
 * POURQUOI DEUX FONCTIONS PLUTÔT QU'UN CHAMP QUE L'APPELANT FILTRE. Le champ
 * seul se contourne par oubli : il suffit d'un second écran qui mappe
 * `C5B_RECOMMENDED_PLATES` pour que les quinze ressortent, et c'est exactement
 * le défaut que ce lot ferme — la liste d'observation du praticien rendait le
 * catalogue ENTIER, sans condition, et l'arbitrage qui l'interdisait ne vivait
 * que dans un document. Le patron est celui de `lignesIndicationAssietteServables`
 * ([[D-225]]) : le filtre est un POINT DE SORTIE, pas une consigne.
 *
 * `assiettesParMomentDeRepas` SERT L'OBSERVATION — ce que le patient a mangé,
 * repéré par le moment du repas. Elle rend les trois repères historiques, et
 * c'est la liste que le journal alimentaire a toujours servie : **ce lot ne
 * change donc rien à ce que le praticien voit**.
 *
 * `assiettesParIndication` SERT LA PRESCRIPTION — pour qui cette assiette est
 * indiquée. Elle rend les douze du corpus. **Son appelant existe depuis
 * [[D-237]]** : `indicationsAssiettesService.ts`, qui en fait sa table de
 * correspondance `plateCode` → libellé avant de servir le cockpit. Elle a vécu
 * un jour sans consommateur, sous la réserve écrite ici même — « si le lot
 * d'exposition ne vient pas, elle se supprime ». Le lot est venu.
 *
 * ET LE SERVICE PASSE PAR ELLE PLUTÔT QUE PAR `getRecommendedPlate`, ce qui
 * n'est pas indifférent : la recherche brute trouverait aussi les trois repères
 * d'OBSERVATION. Refaire la partition au point de service ferme le chemin
 * qu'une ligne d'indication mal formée emprunterait si elle échappait au verrou.
 */
export function assiettesParMomentDeRepas(): readonly C5bRecommendedPlate[] {
  return C5B_RECOMMENDED_PLATES.filter(plate => plate.axe === 'moment_repas');
}

export function assiettesParIndication(): readonly C5bRecommendedPlate[] {
  return C5B_RECOMMENDED_PLATES.filter(plate => plate.axe === 'indication');
}

/**
 * CETTE ASSIETTE PEUT-ELLE S'ATTACHER À UNE OBSERVATION ALIMENTAIRE ?
 *
 * POURQUOI CE PRÉDICAT EXISTE — constat de revue, vérifié et fondé. Filtrer la
 * liste déroulante ne protégeait que l'ÉCRAN. Deux chemins la contournent : un
 * brouillon `sessionStorage` rouvert plus tard, et un POST forgé — tous deux
 * passent par `assertCurrentRecommendedPlateRef`, qui vérifie l'appartenance au
 * catalogue et **rien d'autre**. Tant que le catalogue portait trois entrées,
 * cette porte valait partition ; en le portant à quinze, ce lot l'a ÉLARGIE, et
 * une assiette d'indication pouvait rejoindre un épisode d'observation.
 *
 * La garde est donc au DOMAINE, et l'écran la réutilise — l'inverse aurait
 * laissé la seule surface honnête garder ce que la route laisse passer.
 */
export function estAssietteDObservation(plateCode: string): boolean {
  return getRecommendedPlate(plateCode)?.axe === 'moment_repas';
}

/**
 * La référence d'assiette d'une observation alimentaire — courante ET du bon axe.
 *
 * Elle ne remplace pas `assertCurrentRecommendedPlateRef` : elle l'appelle, puis
 * ajoute le terme d'axe. L'ordre compte — une référence caduque doit se dire
 * caduque, pas « du mauvais axe ».
 */
export function assertRefAssietteDObservation(value: unknown): RecommendedPlateRef {
  const ref = assertCurrentRecommendedPlateRef(value);
  if (!estAssietteDObservation(ref.plateCode)) {
    throw new TypeError('Une assiette d’indication ne s’attache pas à une observation alimentaire.');
  }
  return ref;
}

/**
 * CETTE ASSIETTE PEUT-ELLE PORTER UNE ACTION DE PROTOCOLE ?
 *
 * LE MIROIR EXACT D'`estAssietteDObservation`, ET IL LUI DOIT SON EXISTENCE.
 * [[D-230]] a fermé un sens : une assiette d'INDICATION ne rejoint pas un
 * épisode d'observation alimentaire. L'autre sens était resté ouvert faute de
 * chemin — rien ne prescrivait. Ce lot ouvre ce chemin, donc il doit fermer ce
 * sens-là : un repère de MOMENT DE REPAS — « Petit-déjeuner simple », « Soir
 * léger » — n'est adossé à aucun protocole du corpus et ne fonde donc aucune
 * indication. L'attacher à une action de protocole ferait prescrire un repère
 * de journal alimentaire.
 *
 * LA GARDE EST AU DOMAINE, ET L'ÉCRAN LA RÉUTILISE. Même motif que sa jumelle :
 * un brouillon rouvert plus tard et un POST forgé contournent tous deux la
 * liste affichée, et ne rencontrent qu'`assertCurrentRecommendedPlateRef` —
 * laquelle vérifie l'appartenance au catalogue et **rien d'autre**.
 */
export function estAssietteDIndication(plateCode: string): boolean {
  return getRecommendedPlate(plateCode)?.axe === 'indication';
}

/**
 * La référence d'assiette d'une action de protocole — courante ET du bon axe.
 *
 * L'ordre compte, comme pour sa jumelle : une référence caduque doit se dire
 * caduque, et non « du mauvais axe ».
 */
export function assertRefAssietteDIndication(value: unknown): RecommendedPlateRef {
  const ref = assertCurrentRecommendedPlateRef(value);
  if (!estAssietteDIndication(ref.plateCode)) {
    throw new TypeError('Une assiette d’observation ne se prescrit pas dans un protocole.');
  }
  return ref;
}

export function getCurrentRecommendedPlateRef(plateCode: string): RecommendedPlateRef {
  const plate = getRecommendedPlate(plateCode);
  if (!plate) throw new TypeError('Référence d’assiette inconnue.');
  return { ...plate.ref };
}

export function assertCurrentRecommendedPlateRef(value: unknown): RecommendedPlateRef {
  if (!value || typeof value !== 'object') throw new TypeError('Référence d’assiette invalide.');
  const candidate = value as Partial<RecommendedPlateRef>;
  const plate = typeof candidate.plateCode === 'string' ? getRecommendedPlate(candidate.plateCode) : null;
  if (!plate
    || candidate.contractVersion !== plate.ref.contractVersion
    || candidate.catalogVersion !== plate.ref.catalogVersion
    || candidate.contentHash !== plate.ref.contentHash
    || candidate.refHash !== plate.ref.refHash) {
    throw new TypeError('Référence d’assiette inconnue ou caduque.');
  }
  return { ...plate.ref };
}

export type PlateSubstitutionDecision =
  | {
      status: 'none';
      source: RecommendedPlateRef;
      reason: 'practitioner_declined' | 'no_validated_alternative';
      decidedBy: 'practitioner';
    }
  | {
      status: 'proposed';
      source: RecommendedPlateRef;
      target: RecommendedPlateRef;
      /** Le repli ATTESTÉ qui autorise cette cible — orienté, et gradué. */
      repli: RepliAssietteDeclare;
      justification: string;
      decidedBy: 'practitioner';
    };

/**
 * LA SUBSTITUTION EST ORIENTÉE, ET ELLE NE PART QUE D'UNE ASSIETTE
 * PRESCRIPTIBLE ([[D-241]]).
 *
 * CE QUI A CHANGÉ, ET POURQUOI. Elle lisait `substitutionFamily` — une étiquette
 * d'appartenance, comparée par égalité, donc sans sens de lecture : A et B
 * partageant l'étiquette, elle attestait A→B ET B→A, et par transitivité toute
 * la clique. Trois assiettes déclarées valaient SIX substitutions. Un repli est
 * presque toujours asymétrique : le mécanisme le trahissait en l'élargissant en
 * silence. Elle lit désormais une relation ORIENTÉE, et `depuis` → `vers` ne
 * dit rien de `vers` → `depuis`.
 *
 * LES REPLIS ARRIVENT EN PARAMÈTRE, ET C'EST STRUCTUREL. La table vit dans
 * `lib/clinical/replisAssietteV1.ts`, qui importe ce module : l'importer en
 * retour ferait un cycle. Le paramètre n'a donc PAS de valeur par défaut — un
 * appelant ne peut pas oublier de dire quelle table fait foi, et le verrou
 * fail-closed reste à un seul endroit, au point de service de la table.
 *
 * L'AXE EST GARDÉ AUX DEUX BOUTS — [[D-240]] §10 nommait ce trou. Un repère de
 * MOMENT DE REPAS n'est adossé à aucun protocole du corpus : il ne se prescrit
 * pas, donc il ne se replie ni ne sert de repli. Sans ce terme, la substitution
 * serait le SEUL chemin du dépôt produisant une référence d'assiette sans
 * passer par `assertRefAssietteDIndication`.
 *
 * CE QU'ELLE NE PEUT PAS GARDER, ET QUI RESTE AU CHEMIN D'INTÉGRATION : que
 * l'assiette source soit réellement PRESCRITE sur ce dossier. Elle ne reçoit
 * qu'une référence de catalogue ; la prescription se lit sur les actions du
 * protocole, et c'est à l'appelant de l'établir.
 *
 * AUCUNE PROPOSITION AUTOMATIQUE : la cible reste un choix praticien, et la
 * justification explicite reste exigée à chaque substitution.
 */
export function decidePlateSubstitution(input: {
  source: RecommendedPlateRef;
  replis: readonly RepliAssietteDeclare[];
  /**
   * L'INDICATION POUR LAQUELLE L'ASSIETTE A ÉTÉ PRESCRITE — obligatoire.
   *
   * Constat de revue. Sans ce terme, deux lignes attestant le même couple pour
   * des indications différentes rendaient `.find()` arbitraire : la décision
   * retenait la première et perdait la condition qui l'autorise. Un repli n'est
   * jamais valable « en général » — la table le dit, la décision doit le lire.
   */
  indication: string;
  targetPlateCode?: string | null;
  justification?: string;
  noProposalReason?: 'practitioner_declined' | 'no_validated_alternative';
}): PlateSubstitutionDecision {
  const source = assertCurrentRecommendedPlateRef(input.source);
  if (!input.targetPlateCode) {
    return {
      status: 'none',
      source,
      reason: input.noProposalReason ?? 'no_validated_alternative',
      decidedBy: 'practitioner',
    };
  }
  if (!estAssietteDIndication(source.plateCode)) {
    throw new TypeError('Une assiette d’observation ne se replie pas : elle ne se prescrit pas.');
  }
  const target = getRecommendedPlate(input.targetPlateCode);
  if (!target || target.plateCode === source.plateCode) {
    throw new TypeError('Assiette de substitution invalide.');
  }
  if (!estAssietteDIndication(target.plateCode)) {
    throw new TypeError('Une assiette d’observation ne peut pas servir de repli.');
  }
  // LA DIRECTION SE LIT DANS UN SEUL SENS, ET LA CONDITION COMPTE AUTANT.
  // Chercher la ligne inverse rétablirait la clique ; ignorer l'indication
  // élargirait un repli attesté pour une raison à toutes les autres.
  const repli = input.replis.find(
    ligne => ligne.depuis === source.plateCode
      && ligne.vers === target.plateCode
      && ligne.indication === input.indication,
  );
  if (!repli) {
    throw new TypeError('Aucun repli attesté ne va de cette assiette vers celle-là pour cette indication.');
  }
  const justification = input.justification?.trim() ?? '';
  if (justification.length < 10) {
    throw new TypeError('Une justification praticien explicite est requise.');
  }
  return {
    status: 'proposed',
    source,
    target: { ...target.ref },
    repli: {
      depuis: repli.depuis,
      vers: repli.vers,
      indication: repli.indication,
      degre: repli.degre,
    },
    justification,
    decidedBy: 'practitioner',
  };
}
