// Le moteur de proposition d'objectif (Alliance 6.0-B, LOT-02) — domaine PUR,
// aucune dépendance Prisma, aucun import du moteur clinique.
//
// « LA MACHINE CITE, ELLE N'INVENTE PAS » (`D-094`). Une proposition est un
// ASSEMBLAGE DE FRAGMENTS qui portent chacun leur provenance ; ce module ne
// rédige aucun texte d'objectif, il recopie ce que d'autres ont déjà écrit ou
// publié. Les trois sources admissibles sont une LISTE FERMÉE (`D-094` §1) :
// les mots du patient à l'anamnèse, la restitution d'un instrument certifié,
// une règle signée avec le SHA de son périmètre. Toute extension est une
// décision `D-xxx` neuve, pas un champ de plus.
//
// DÉTERMINISTE, AUCUN LLM (`D-094` §4). Mêmes entrées ⇒ mêmes propositions ⇒
// même empreinte. C'est ce qui rend la caducité calculable.
//
// LE MODULE NE RECALCULE RIEN DE CLINIQUE. La plainte dominante et les
// candidats de la carte de décision arrivent EN ENTRÉE, produits par le
// cockpit ; ce fichier ne sait pas comment ils ont été obtenus et ne doit pas
// l'apprendre (garde G7, `propositionObjectif.guard.test.ts`).
//
// NI RANG, NI SCORE, NI NUMÉRO D'ORDRE (`D-094` §3, `DC-19`/`DC-20`) : l'ordre
// des candidats n'est couvert par aucune ligne signée (`D-093`), il ne doit
// pas se lire comme un classement. L'ordre d'entrée est conservé tel quel, il
// n'est jamais persisté ni exposé comme une position.

import { createHash } from 'node:crypto';

/**
 * Au plus TROIS propositions simultanées — `D-094` §3, pas un nombre choisi
 * ici. Ce plafond borne la PRODUCTION (ce module) et le SERVICE (la route),
 * jamais le stock : la table est append-only, l'accumulation historique y est
 * normale et ne se purge pas.
 */
export const MAX_PROPOSITIONS = 3;

/**
 * Le motif d'un écart : même borne que le « non traité pour l'instant »
 * (`LONGUEUR_MAX_MOTIF = 2000`, `objectifNegocie.ts`). Un praticien qui écarte
 * une proposition explique en quelques paragraphes ; au-delà, ce n'est plus un
 * motif, c'est une note de consultation — et elle a son lieu.
 *
 * REFUS, JAMAIS TRONCATURE : tronquer un motif d'écart produirait une phrase
 * que personne n'a écrite, rangée dans le matériau du bilan LOT-06 comme si
 * elle avait été dite.
 */
export const LONGUEUR_MAX_MOTIF_ECART = 2000;

// ── LE FRAGMENT SOURCÉ ──────────────────────────────────────────────────────

/**
 * Les trois champs de l'anamnèse cités verbatim (`D-094` §1). Liste fermée :
 * un quatrième champ n'est pas une constante à rallonger, c'est une décision.
 */
export const CHAMPS_ANAMNESE = ['motif_principal', 'objectif_prioritaire', 'attentes'] as const;
export type ChampAnamnese = (typeof CHAMPS_ANAMNESE)[number];

/** Les mots du patient, recopiés — jamais paraphrasés, jamais résumés. */
export type SourceAnamnese = {
  nature: 'anamnese';
  champ: ChampAnamnese;
  /** La consultation validée d'où vient le verbatim : une citation se date. */
  dateConsultation: string;
};

/**
 * La restitution publiée par un instrument certifié.
 *
 * `restitution` ET NON le mot que l'usage attendrait ici, ET CE N'EST PAS UN
 * CONTOURNEMENT DE GARDE. Le balayage ci-dessous refuse ce mot comme clé,
 * parce qu'une valeur ordonnée déposée dans un JSONB libre est indiscernable
 * d'un rang. Or ce que le fragment cite n'est PAS la mesure : c'est le libellé
 * que l'instrument a lui-même publié — le nom que `D-094` §1 donne à cette
 * source (« la restitution d'instrument certifié »). Précédent assumé du
 * dépôt : `marqueurPrisma` renommé plutôt qu'une garde assouplie
 * (`objectifs/route.ts`).
 *
 * L'INTENSITÉ DÉCLARÉE N'ENTRE PAS ICI, sous aucun nom. Elle est un nombre ;
 * un nombre déposé dans une proposition se trierait (`DC-19`/`DC-20`).
 */
export type SourceInstrument = {
  nature: 'instrument';
  /** L'instrument, tel que le catalogue le nomme (`Q_MOD_03`). */
  instrument: string;
  /** Le domaine restitué, identifiant du catalogue (`digestion`…). */
  domaine: string;
  /** Le libellé publié par l'instrument, ou `null` s'il n'en sert pas. */
  restitution: string | null;
};

/** Une règle signée, avec le SHA du périmètre sous lequel elle l'a été. */
export type SourceRegleSignee = {
  nature: 'regle_signee';
  regle: string;
  shaPerimetre: string;
};

export type SourceFragment = SourceAnamnese | SourceInstrument | SourceRegleSignee;

/**
 * LA MARQUE QUI REND UN FRAGMENT NU INCONSTRUCTIBLE.
 *
 * `D-094` exige un INVARIANT DE TYPE, pas une validation : « un fragment sans
 * source est inconstructible ». Un validateur se contourne en appelant l'autre
 * chemin d'écriture ; un type, non. Ce symbole ambiant n'a aucune valeur à
 * l'exécution et n'est produit par AUCUN littéral — les trois fabriques
 * ci-dessous sont les seules à pouvoir rendre un `FragmentSource`, et le
 * compilateur refuse tout objet écrit à la main, `{ texte }` comme
 * `{ texte, source }`.
 *
 * Arbitrage 1 du LOT-02, tranché le 2026-08-23 : `fragments` est un JSONB
 * LIBRE, aucune contrainte de base ne peut tenir sa forme (dette nommée au
 * LOT-01, `schema.prisma`). L'invariant vit donc ici — ou nulle part.
 */
declare const MARQUE_FRAGMENT: unique symbol;

export type FragmentSource = {
  readonly texte: string;
  readonly source: SourceFragment;
  readonly [MARQUE_FRAGMENT]: true;
};

/**
 * Fabrique interne — LE SEUL ENDROIT DU DÉPÔT où la marque est apposée.
 *
 * Un texte vide ne fait pas un fragment : citer le silence d'un patient
 * produirait une parole qu'il n'a pas dite (`DC-24` — une donnée absente n'est
 * ni zéro ni une réponse). L'appelant reçoit `null` et n'assemble rien.
 */
function marquer(texte: string, source: SourceFragment): FragmentSource | null {
  const utile = texte.trim();
  if (utile.length === 0) return null;
  return { texte: utile, source } as FragmentSource;
}

/** Fabrique — les mots écrits du patient à l'anamnèse, verbatim. */
export function depuisAnamnese(
  champ: ChampAnamnese,
  texte: string,
  dateConsultation: string,
): FragmentSource | null {
  return marquer(texte, { nature: 'anamnese', champ, dateConsultation });
}

/** Fabrique — la restitution publiée par un instrument certifié. */
export function depuisInstrument(
  instrument: string,
  domaine: string,
  restitution: string | null,
): FragmentSource | null {
  // Le texte cité EST la restitution publiée. Sans elle, l'instrument n'a rien
  // publié pour ce domaine, et il n'y a rien à citer : on ne fabrique pas une
  // phrase de remplacement.
  return marquer(restitution ?? '', { nature: 'instrument', instrument, domaine, restitution });
}

/** Fabrique — une règle signée et son SHA de périmètre. */
export function depuisRegleSignee(
  regle: string,
  texte: string,
  shaPerimetre: string,
): FragmentSource | null {
  // Une règle sans SHA de périmètre n'est PAS une règle signée : la citer
  // reviendrait à se réclamer d'une signature qu'on ne peut pas montrer
  // (`DC-17`, `DC-26`).
  const sha = shaPerimetre.trim();
  if (sha.length === 0) return null;
  return marquer(texte, { nature: 'regle_signee', regle, shaPerimetre: sha });
}

// ── LE BALAYAGE DU BLOB ─────────────────────────────────────────────────────

/**
 * Les clés INTERDITES dans la valeur sérialisée, à quelque profondeur que ce
 * soit. C'est le pendant, pour un JSONB libre, de ce que la liste blanche de
 * colonnes fait pour une table.
 *
 * ÉGALITÉ EXACTE, PAS SOUS-CHAÎNE, et la nuance est le sujet : `disposition`
 * contient « position », `restitution` ne contient rien d'interdit. Une garde
 * par sous-chaîne rougirait sur des noms sains, serait assouplie au premier
 * faux positif — donc désarmée. Ce qu'on refuse, c'est qu'une valeur ordonnée
 * s'installe SOUS SON PROPRE NOM dans un blob que rien ne contraint.
 *
 * La liste est celle de l'arbitrage 1, tranché le 2026-08-23. Elle ne se
 * confond pas avec les racines de la garde de nommage, qui balaye le SOURCE et
 * travaille, elle, par sous-chaîne.
 */
export const CLES_INTERDITES: readonly string[] = [
  // Français — les mots que ce module écrirait lui-même.
  'score',
  'seuil',
  'bande',
  'rang',
  'position',
  'ordre',
  'niveau',
  'priorite',
  // Anglais — LES MOTS QUE LA DONNÉE AMONT PORTE DÉJÀ, et c'est le point.
  // `DecisionPriorityCandidate` nomme ses champs `rank` et `confidence`
  // (`clinical-engine/decisionCard.ts`) : la mutation la plus probable n'est
  // pas d'inventer un `rangCandidat`, c'est de RECOPIER le champ tel qu'il
  // arrive. Une liste en français seul aurait laissé passer exactement ce
  // geste-là — même défaut que le banc du LOT-09, qui épinglait le
  // vocabulaire de l'interdit et non l'interdit.
  'rank',
  'confidence',
  'priority',
  'threshold',
  'weight',
  'level',
  'order',
];

/**
 * Les clés interdites présentes dans une valeur, à toute profondeur — vide si
 * la valeur est propre. Rend une LISTE et non un booléen : un refus qui ne dit
 * pas ce qu'il a trouvé n'est pas actionnable.
 *
 * Le balayage suit les tableaux ET les objets : un rang rangé dans
 * `fragments[0].source.detail.ordre` n'est pas moins un rang.
 */
export function clesInterdites(valeur: unknown): string[] {
  const trouvees: string[] = [];
  const vues = new Set<object>();
  const parcourir = (noeud: unknown): void => {
    if (noeud === null || typeof noeud !== 'object') return;
    // Les références circulaires ne sont pas sérialisables en JSONB ; les
    // suivre ferait boucler sans fin sur une valeur que la base refusera de
    // toute façon.
    if (vues.has(noeud)) return;
    vues.add(noeud);
    if (Array.isArray(noeud)) {
      for (const entree of noeud) parcourir(entree);
      return;
    }
    for (const [cle, sousValeur] of Object.entries(noeud as Record<string, unknown>)) {
      if (CLES_INTERDITES.includes(cle.toLowerCase())) trouvees.push(cle);
      parcourir(sousValeur);
    }
  };
  parcourir(valeur);
  return trouvees;
}

// ── L'EMPREINTE DES SOURCES (caducité) ──────────────────────────────────────

/**
 * SÉRIALISATION CANONIQUE — DUPLIQUÉE, ET C'EST L'ARBITRAGE 2.
 *
 * L'original est `lib/clinical-engine/canonical.ts`, dont le `proposalHash` du
 * cockpit est déjà l'usager ; la caducité de 6.0-B en est la copie
 * conceptuelle. Mais G7 interdit d'importer `clinical-engine/`, et l'exception
 * aurait été parfaitement justifiable ici — c'est précisément ce qui la rend
 * dangereuse : UNE GARDE QUI GAGNE UNE EXCEPTION LES PERD TOUTES. Quinze
 * lignes recopiées coûtent moins qu'un interdit devenu négociable.
 *
 * Les deux implémentations doivent rendre la MÊME chaîne : un banc les compare
 * sur les mêmes valeurs (`propositionObjectif.test.ts`), et c'est LUI qui
 * importe l'original — pas ce fichier.
 */
function serialiser(valeur: unknown, vues: Set<object>, undefinedAdmis: boolean): string | undefined {
  if (valeur === undefined) {
    if (undefinedAdmis) return undefined;
    throw new TypeError('Une valeur undefined n’est pas autorisée dans un tableau canonique.');
  }
  if (valeur === null || typeof valeur === 'string' || typeof valeur === 'boolean') {
    return JSON.stringify(valeur);
  }
  if (typeof valeur === 'number') {
    if (!Number.isFinite(valeur)) throw new TypeError('Les nombres non finis ne sont pas sérialisables.');
    return JSON.stringify(valeur);
  }
  if (typeof valeur !== 'object') throw new TypeError('Valeur non JSON dans la sérialisation canonique.');
  if (valeur instanceof Date) {
    throw new TypeError('Les dates doivent être converties en chaîne ISO avant sérialisation.');
  }
  if (vues.has(valeur)) throw new TypeError('Les références circulaires ne sont pas sérialisables.');

  vues.add(valeur);
  try {
    if (Array.isArray(valeur)) {
      for (let index = 0; index < valeur.length; index++) {
        if (!(index in valeur)) throw new TypeError('Les tableaux creux ne sont pas sérialisables.');
      }
      return `[${valeur.map((entree) => serialiser(entree, vues, false)).join(',')}]`;
    }
    const prototype = Object.getPrototypeOf(valeur);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Seuls les objets JSON simples sont sérialisables.');
    }
    const entrees: string[] = [];
    for (const cle of Object.keys(valeur as object).sort()) {
      const serialisee = serialiser((valeur as Record<string, unknown>)[cle], vues, true);
      if (serialisee !== undefined) entrees.push(`${JSON.stringify(cle)}:${serialisee}`);
    }
    return `{${entrees.join(',')}}`;
  } finally {
    vues.delete(valeur);
  }
}

/** Sérialisation canonique — clés triées, formes exotiques refusées. */
export function jsonCanonique(valeur: unknown): string {
  const serialisee = serialiser(valeur, new Set<object>(), false);
  if (serialisee === undefined) throw new TypeError('La racine canonique ne peut pas être undefined.');
  return serialisee;
}

/** Empreinte d’intégrité uniquement : elle n’anonymise ni ne pseudonymise. */
export function empreinte(valeur: unknown): string {
  return createHash('sha256').update(jsonCanonique(valeur), 'utf8').digest('hex');
}

// ── LES ENTRÉES DE L'ASSEMBLAGE ─────────────────────────────────────────────

/**
 * Ce que le patient a écrit à l'anamnèse validée. MÊMES CHAMPS que l'ancrage
 * déjà servi par la route objectifs — pas un contrat parallèle.
 */
export type AnamneseCitable = {
  dateConsultation: string;
  motifPrincipal: string | null;
  objectifPrioritaire: string | null;
  attentes: string[];
};

/**
 * La plainte dominante, REÇUE EN ENTRÉE. Le champ d'intensité de la sortie
 * cockpit n'est délibérément pas repris : ce module cite un libellé publié, il
 * ne transporte pas une mesure.
 */
export type PlainteCitable = {
  instrument: string;
  domaine: string;
  restitution: string | null;
};

/**
 * Un candidat de la carte de décision, REÇU EN ENTRÉE. `texte` est le libellé
 * publié de la règle ; `regle` son identifiant signé.
 *
 * NI `rank`, NI `confidence`, ET C'EST DÉLIBÉRÉ : la carte les porte, ce
 * module ne les lit pas. Les faire entrer ici les rendrait persistables, donc
 * triables — l'ordre des candidats n'est couvert par aucune ligne signée
 * (`D-093`).
 */
export type CandidatCitable = {
  regle: string;
  texte: string;
};

export type EntreesAssemblage = {
  anamnese: AnamneseCitable | null;
  plainte: PlainteCitable | null;
  candidats: CandidatCitable[];
  /** Le SHA du périmètre signé sous lequel les candidats ont été produits. */
  shaPerimetre: string | null;
};

/** Une proposition assemblée, telle qu'elle part en base. */
export type PropositionAssemblee = {
  fragments: FragmentSource[];
  hashSources: string;
};

/**
 * Les fragments d'anamnèse citables — verbatim, jamais paraphrasés. `attentes`
 * est une liste ; chaque entrée devient un fragment, aucune n'est fusionnée
 * dans une phrase de synthèse.
 */
function fragmentsAnamnese(anamnese: AnamneseCitable | null): FragmentSource[] {
  if (!anamnese) return [];
  const date = anamnese.dateConsultation;
  const fragments = [
    depuisAnamnese('motif_principal', anamnese.motifPrincipal ?? '', date),
    depuisAnamnese('objectif_prioritaire', anamnese.objectifPrioritaire ?? '', date),
    ...anamnese.attentes.map((attente) => depuisAnamnese('attentes', attente, date)),
  ];
  return fragments.filter((fragment): fragment is FragmentSource => fragment !== null);
}

/**
 * Assemble les propositions — UNE PAR CANDIDAT SIGNÉ, au plus trois.
 *
 * SANS CANDIDAT, AUCUNE PROPOSITION, et ce n'est pas un manque à combler.
 * Table des priorités non signée, abstention requise, canal de plainte non
 * mesurable : dans les trois cas le cockpit ne sert aucun candidat, et la
 * machine n'a alors rien de signé à citer. Assembler quand même, sur la seule
 * anamnèse, ferait de Wellneuro l'auteur d'une proposition que rien ne fonde —
 * exactement ce que `D-094` interdit.
 *
 * L'ORDRE D'ENTRÉE EST CONSERVÉ, JAMAIS INTERPRÉTÉ. Ce module ne trie pas, ne
 * numérote pas et n'expose aucune position : `D-094` §3 interdit jusqu'à la
 * numérotation tant que le classement n'est pas signé (`D-093`).
 *
 * CHAQUE PROPOSITION PORTE SA PROPRE EMPREINTE, calculée sur les DONNÉES
 * SOURCES et jamais sur le texte des fragments : une reformulation praticien
 * ne doit pas rendre caduque une proposition dont les sources n'ont pas bougé
 * (arbitrage 2).
 */
export function assemblerPropositions(entrees: EntreesAssemblage): PropositionAssemblee[] {
  const sha = (entrees.shaPerimetre ?? '').trim();
  if (sha.length === 0) return [];

  const communs = fragmentsAnamnese(entrees.anamnese);
  const fragmentPlainte = entrees.plainte
    ? depuisInstrument(entrees.plainte.instrument, entrees.plainte.domaine, entrees.plainte.restitution)
    : null;

  // LE FILTRAGE PRÉCÈDE LA COUPE, et l'ordre n'est pas indifférent : couper
  // d'abord ferait qu'un candidat au libellé vide CONSOMMERAIT un des trois
  // créneaux, et le quatrième candidat — parfaitement citable — ne serait
  // jamais examiné. Le plafond borne ce qu'on PROPOSE, pas ce qu'on inspecte.
  //
  // LA DÉDUPLICATION PAR RÈGLE, ensuite, tient une propriété dont la caducité
  // dépend : l'empreinte porte la règle et non son libellé (arbitrage 2), si
  // bien que deux candidats de MÊME règle produiraient deux propositions au
  // hachage IDENTIQUE. La comparaison d'ensembles de la route ne verrait plus
  // l'assemblée rétrécir de deux lignes à une, et servirait indéfiniment une
  // proposition que le cockpit ne propose plus.
  const citables: CandidatCitable[] = [];
  const reglesVues = new Set<string>();
  for (const candidat of entrees.candidats) {
    if (candidat.texte.trim().length === 0) continue;
    if (reglesVues.has(candidat.regle)) continue;
    reglesVues.add(candidat.regle);
    citables.push(candidat);
    if (citables.length === MAX_PROPOSITIONS) break;
  }

  return citables.flatMap((candidat) => {
    const fragmentRegle = depuisRegleSignee(candidat.regle, candidat.texte, sha);
    // Inatteignable après le filtrage ci-dessus (le SHA est non vide, le
    // libellé aussi), mais la fabrique reste seule juge de ce qu'elle accepte :
    // s'en remettre à l'appelant pour le savoir serait rendre l'invariant
    // dépendant du site d'appel.
    if (!fragmentRegle) return [];

    const fragments = [fragmentRegle, ...(fragmentPlainte ? [fragmentPlainte] : []), ...communs];

    // L'EMPREINTE PORTE LES SOURCES, PAS LES FRAGMENTS : les identifiants et
    // les valeurs telles qu'elles ont été LUES, plus le SHA du périmètre
    // signé — rien du texte assemblé.
    const hashSources = empreinte({
      anamnese: entrees.anamnese,
      plainte: entrees.plainte,
      regle: candidat.regle,
      shaPerimetre: sha,
    });

    return [{ fragments, hashSources }];
  });
}

// ── LA DISPOSITION (ce que le praticien fait d'une proposition) ─────────────

/**
 * Les deux seuls gestes, et ils sont ceux du CHECK de migration. `caduque`
 * n'en est pas un et n'aura jamais sa ligne : personne ne décide qu'une
 * proposition est caduque, cela se DÉRIVE des sources (`schema.prisma`).
 *
 * La liste double le CHECK sans faire doublon : le CHECK est un FILET, pas une
 * validation. Sans contrôle en TypeScript, un geste hors taxonomie remonterait
 * en erreur Prisma — donc en 500 — pour ce qui est une requête malformée.
 */
export const GESTES_DISPOSITION = ['reprise', 'ecartee'] as const;
export type GesteDisposition = (typeof GESTES_DISPOSITION)[number];

export type RefusDisposition =
  | 'proposition_absente'
  | 'geste_invalide'
  | 'motif_absent'
  | 'motif_sur_reprise'
  | 'motif_trop_long';

/**
 * Ce qui part en base. AUCUNE DATE — ni `disposeLe`, ni `creeLe`, et les deux
 * absences n'ont pas le même motif (patron `DonneesRatification`).
 *
 * `creeLe` est posée par `@default(now())` : c'est ce qui rend une disposition
 * inantidatable. `disposeLe` reste nulle parce que le praticien ne DÉCLARE
 * rien ici — il clique ; la renseigner depuis l'horloge du serveur en ferait
 * une déclaration qu'il n'a pas faite, et elle ne pourrait que dupliquer sa
 * voisine.
 */
export type DonneesDisposition = {
  idPatient: string;
  idProposition: string;
  praticienEmail: string;
  geste: GesteDisposition;
  motif: string | null;
};

export type PreparationDisposition =
  | { ok: true; donnees: DonneesDisposition }
  | { ok: false; raison: RefusDisposition };

export type EntreeDisposition = {
  idPatient: string;
  praticienEmail: string;
  idProposition: string | null | undefined;
  geste: string | null | undefined;
  motif: string | null | undefined;
};

/**
 * Prépare UNE ligne de disposition. Elle ne remplace jamais rien : se raviser
 * est une ligne de plus, et `dispositionCourante` lit le dernier geste.
 *
 * DEUX REFUS SYMÉTRIQUES, ET LE SECOND EST L'ARBITRAGE 3.
 *
 * Un écart SANS motif est refusé : le motif est le matériau du bilan LOT-06 —
 * une proposition écartée sans raison ne dit rien de ce qu'il fallait changer.
 *
 * Une reprise AVEC motif est refusée elle aussi, plutôt que normalisée en
 * silence. Absorber `''` en `null` couvrirait un écran qui envoie un champ
 * qu'il ne devrait pas envoyer : c'est un bug à voir, pas à rattraper. Le
 * dépôt a tranché ce genre de cas dans le même sens — par refus, jamais par
 * accommodement.
 *
 * Ce module est PUR : il ne vérifie pas que `idProposition` existe ni qu'elle
 * appartient au dossier. `id_proposition` n'a pas de clé étrangère (référence
 * souple assumée par la migration du LOT-01) ; ces vérifications appartiennent
 * à la route, qui seule lit la base.
 */
export function preparerDisposition(entree: EntreeDisposition): PreparationDisposition {
  const idProposition = (entree.idProposition ?? '').trim();
  if (idProposition.length === 0) return { ok: false, raison: 'proposition_absente' };

  const geste = (entree.geste ?? '').trim();
  if (!(GESTES_DISPOSITION as readonly string[]).includes(geste)) {
    return { ok: false, raison: 'geste_invalide' };
  }

  // `?? ''` puis `trim` : un motif fait d'espaces n'est pas un motif.
  const motif = (entree.motif ?? '').trim();

  if (geste === 'ecartee') {
    if (motif.length === 0) return { ok: false, raison: 'motif_absent' };
    if (motif.length > LONGUEUR_MAX_MOTIF_ECART) return { ok: false, raison: 'motif_trop_long' };
  } else if (motif.length > 0) {
    return { ok: false, raison: 'motif_sur_reprise' };
  }

  return {
    ok: true,
    donnees: {
      idPatient: entree.idPatient,
      idProposition,
      praticienEmail: entree.praticienEmail,
      geste: geste as GesteDisposition,
      motif: geste === 'ecartee' ? motif : null,
    },
  };
}

export type LigneDisposition = {
  id: string;
  idProposition: string;
  geste: string;
  creeLe: Date;
};

/**
 * Le geste COURANT porté sur une proposition — DERNIER GESTE, jamais un
 * décompte (arbitrage 4).
 *
 * Exactement la mécanique d'`etatRatification` : `creeLe` décroissant,
 * l'identifiant départageant les ex aequo pour que la lecture soit
 * déterministe. Deux règles de résolution différentes dans un même dossier
 * seraient un piège — celui qui lit l'une croirait connaître l'autre.
 *
 * `null` = aucune disposition, et cela ne veut pas dire « refusée » : la
 * proposition attend, tout simplement (`DC-24`).
 *
 * CE QUE CETTE FONCTION NE DIT PAS, ET QUI COMPTE : une proposition REPRISE
 * PUIS ÉCARTÉE reste reprise EN FAIT — l'objectif négocié existe, il porte
 * `sourcePropositionId`, et le patient a pu le voir. Le dernier geste est le
 * bon état de DISPOSITION ; il n'efface pas ce qui a eu lieu. C'est l'écran
 * qui affiche la trajectoire (LOT-03), pas cette lecture.
 */
export function dispositionCourante(
  idProposition: string,
  dispositions: LigneDisposition[],
): GesteDisposition | null {
  const dernier = dispositions
    .filter((ligne) => ligne.idProposition === idProposition)
    .sort((gauche, droite) => {
      const delta = droite.creeLe.getTime() - gauche.creeLe.getTime();
      if (delta !== 0) return delta;
      return gauche.id < droite.id ? 1 : gauche.id > droite.id ? -1 : 0;
    })[0];

  if (!dernier) return null;
  if (dernier.geste === 'reprise') return 'reprise';
  if (dernier.geste === 'ecartee') return 'ecartee';
  // Hors taxonomie : le CHECK l'interdit en base, et si une telle ligne
  // existait, la lire comme un geste serait pire que de la taire.
  return null;
}

// ── LA CADUCITÉ ─────────────────────────────────────────────────────────────

export type LigneProposition = {
  id: string;
  hashSources: string;
  assembleeLe: Date | null;
  creeLe: Date;
};

/**
 * L'assemblée COURANTE d'un dossier : les lignes qui partagent le
 * `assembleeLe` le plus récent. Tout ce qui précède est CADUC.
 *
 * POURQUOI `assembleeLe` PORTE UN RÔLE ICI, alors que la campagne 6.0-A a
 * établi qu'une colonne de date ne devait pas dupliquer `creeLe`. Elle n'en
 * est pas une duplication : elle est la CLÉ D'ASSEMBLÉE. Les lignes d'un même
 * assemblage la partagent à l'identique parce qu'un seul `createMany` la pose,
 * là où les `creeLe` par défaut peuvent différer. Sans elle, « les
 * propositions issues du même calcul » ne serait pas exprimable, et la
 * caducité devrait se deviner à la milliseconde.
 *
 * LA CADUCITÉ NE SE DÉCIDE PAS, ELLE SE DÉRIVE. C'est l'empreinte des sources
 * qui commande : la route ne réassemble que si les empreintes ont bougé, donc
 * un `assembleeLe` neuf signifie exactement « les données sources ont changé ».
 * Une proposition caduque n'est pas effacée pour autant — on ne réécrit pas
 * l'histoire d'un dossier.
 *
 * Une ligne sans `assembleeLe` est traitée comme caduque plutôt que comme
 * courante : la colonne est nullable, et rien ne garantit qu'une ligne
 * étrangère à cette mécanique la porte. Se tromper du côté de la caducité
 * retire une proposition d'un écran ; se tromper de l'autre côté en sert une
 * dont les sources ont peut-être bougé.
 */
export function assembleeCourante<T extends LigneProposition>(lignes: T[]): T[] {
  const datees = lignes.filter((ligne) => ligne.assembleeLe !== null);
  if (datees.length === 0) return [];
  // `reduce` et non `Math.max(...tableau)` : la table est append-only et la
  // lecture n'est pas bornée — un dossier très ancien dépasserait la limite
  // d'arguments d'un appel, et la lecture d'un dossier lèverait.
  const plusRecente = datees.reduce(
    (max, ligne) => Math.max(max, (ligne.assembleeLe as Date).getTime()),
    Number.NEGATIVE_INFINITY,
  );
  return datees.filter((ligne) => (ligne.assembleeLe as Date).getTime() === plusRecente);
}

/**
 * Les propositions à SERVIR : celles de l'assemblée courante qu'aucun geste
 * n'a disposées, au plus trois.
 *
 * LE PLAFOND EST TENU DEUX FOIS, à la production et au service, et ce n'est
 * pas une redondance : aucun index ne peut le tenir en base (arbitrage 5), et
 * une table append-only accumule. Le `slice` final est ce qui rend la
 * propriété vraie quoi qu'il arrive au stock.
 */
export function propositionsVivantes<T extends LigneProposition>(
  lignes: T[],
  dispositions: LigneDisposition[],
): T[] {
  return assembleeCourante(lignes)
    .filter((ligne) => dispositionCourante(ligne.id, dispositions) === null)
    .slice(0, MAX_PROPOSITIONS);
}
