import { PACKS_REGISTRY, type PackId } from '@/lib/questionnaires-functional';

// Garde de restitution (LOT-06) — fonction PURE, sans I/O.
//
// La synthèse IA reçoit la recommandation d'orientation déterministe et doit la
// RESTITUER, jamais la produire. Ce module vérifie l'énoncé inverse : le texte
// rendu cite-t-il une cible qui ne lui a pas été donnée ?
//
// Pourquoi c'est vérifiable ici, alors que « le modèle a-t-il inventé quelque
// chose » ne l'est pas en général : packs et questionnaires forment des
// **vocabulaires fermés** — seize entrées déclarées dans `PACKS_REGISTRY`, et
// des identifiants de questionnaire de forme fixe. On ne cherche pas une
// invention quelconque, on cherche l'apparition d'un nom d'une liste connue en
// dehors de ceux fournis. C'est une question décidable.
//
// CE QUE CE GARDE NE FAIT PAS, et pourquoi : il ne neutralise pas la synthèse.
// L'objet actionnable — la carte d'orientation et son bouton d'assignation —
// vient de la route déterministe, jamais du modèle. Un pack cité à tort dans la
// prose ne peut donc rien déclencher. Priver le praticien de sa synthèse sur une
// correspondance textuelle coûterait plus que l'écart lui-même. L'appelant
// journalise ; il ne censure pas.
//
// CE QU'IL NE VOIT PAS, et qu'il ne faut pas croire couvert :
// - un pack désigné par son titre SANS le mot « pack » nulle part avant lui
//   (« je propose Sommeil et chronobiologie ») — voir l'adjacence plus bas ;
// - un pack cité très loin derrière son « pack » introducteur : l'adjacence
//   tolère le pluriel et quelques mots intercalés (« les packs X et Y »,
//   « le pack d'exploration X »), mais pas une énumération longue ;
// - une exploration décrite en langage libre, sans nommer de cible ;
// - un RÉORDONNANCEMENT de la recommandation, qui est pourtant interdit par la
//   consigne. Cela demanderait de comparer des positions dans une prose, pas
//   des occurrences.
//
// Angles morts propres au volet éteinte ≠ recommandée ([[D-055]]), du même
// aveu : une paraphrase d'extinction hors du vocabulaire fermé des marqueurs
// (« je ne la propose plus ») compte comme un écart alors qu'elle est fidèle ;
// deux cibles dans la même fenêtre de 200 caractères partagent leurs marqueurs
// — une éteinte peut être blanchie par la phrase d'à côté, une recommandée
// accusée par elle. Le régime reste le même que le garde d'origine : on
// journalise, on ne censure pas, et l'objet actionnable vient toujours de la
// route déterministe.

/** Les champs de `SyntheseSchema` qui portent du texte libre. */
export type TexteSynthese = {
  resume_praticien?: string;
  axes_prioritaires?: { axe?: string; arguments?: string[]; points_a_confirmer?: string[] }[];
  points_de_vigilance?: string[];
  questions_entretien?: string[];
  narratif_patient?: string;
  limites?: string;
};

export type EcartRestitution =
  | { type: 'pack'; identifiant: PackId }
  | { type: 'questionnaire'; identifiant: string }
  /**
   * Éteinte ≠ recommandée ([[D-053]] §5 pour la dette, [[D-055]] arbitrage 5
   * pour le critère). Deux sens : une cible ÉTEINTE citée sans marqueur
   * d'extinction à proximité (présentée comme une exploration courante), ou
   * une cible RECOMMANDÉE vivante citée avec un marqueur à proximité
   * (présentée comme éteinte).
   */
  | {
      type: 'extinction';
      identifiant: string;
      sens: 'eteinte_presentee_recommandee' | 'recommandee_presentee_eteinte';
    }
  /**
   * Un complément nommé EN CONTEXTE PRESCRIPTIF sans intention déterministe qui
   * le porte (`D-056`, arbitrage 5). En synthèse, la liste autorisée est
   * toujours vide : la synthèse précède la carte de décision dans la chaîne,
   * donc aucun complément n'y est encore déterministe.
   */
  | { type: 'complement'; identifiant: string };

// Plage des diacritiques combinants (U+0300–U+036F), construite depuis une
// chaîne : écrits littéralement dans un littéral d'expression régulière, ces
// caractères sont invisibles à la relecture d'un diff.
const DIACRITIQUES_COMBINANTS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Identifiants de questionnaire du catalogue : `Q_SOM_09`, `Q_ALI_01`… */
const MOTIF_QUESTIONNAIRE = /\bQ_[A-Z]{3}_\d{2}\b/g;

/**
 * Fenêtre, en caractères normalisés, dans laquelle le mot « pack » doit
 * précéder un titre pour que celui-ci compte comme une citation de pack.
 *
 * 40 est un arbitrage, pas une constante de la nature. Assez large pour
 * « les packs X et Y » (l'énumération est la formulation naturelle d'un bloc
 * numéroté) et « le pack d'exploration X » ; assez étroite pour qu'une mention
 * légitime de pack en début de phrase ne contamine pas un syntagme clinique
 * ordinaire qui la suit.
 */
const FENETRE_ADJACENCE_PACK = 40;

const MOT_PACK = /\bpacks?\b/;

/** Le titre est-il cité comme un pack, et non comme un syntagme clinique ? */
function citeCommePack(texte: string, titre: string): boolean {
  let depuis = 0;
  for (;;) {
    const position = texte.indexOf(titre, depuis);
    if (position === -1) return false;
    const amont = texte.slice(Math.max(0, position - FENETRE_ADJACENCE_PACK), position);
    if (MOT_PACK.test(amont)) return true;
    depuis = position + 1;
  }
}

/**
 * Normalise pour une comparaison robuste : minuscules, accents retirés, et
 * toute suite de non-alphanumériques ramenée à un espace unique.
 *
 * Les accents comptent : le registre écrit « Cognition, vieillissement et
 * aidants » quand un modèle écrira volontiers « cognition, vieillissement et
 * aidants ». Comparer sans normaliser reviendrait à ne rien vérifier.
 */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(DIACRITIQUES_COMBINANTS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Vocabulaire fermé des marqueurs d'extinction, en forme NORMALISÉE.
 *
 * Ce sont les formulations que la consigne v25 impose déjà au modèle quand il
 * mentionne une exploration éteinte — « dis qu'elle n'est pas nécessaire en
 * l'état, et reprends le motif d'arrêt tel qu'il t'est donné » — plus le
 * libellé servi (`LIBELLE_EXTINCTION`, « pas d'exploration supplémentaire »)
 * et le motif de STOP-STR (« n'ont pas d'objet en l'état »). Aucun bump de
 * consigne : le garde mesure ce que la consigne exige déjà ([[D-055]]).
 *
 * « eteint » attrape par préfixe éteinte/éteints/éteintes ; « extinction » se
 * couvre lui-même.
 */
const MARQUEURS_EXTINCTION = [
  'eteint',
  'extinction',
  'pas d objet',
  'pas necessaire',
  'plus necessaire',
  'pas lieu',
  'plus lieu',
  'pas d exploration supplementaire',
];

/**
 * Fenêtre, en caractères normalisés, dans laquelle un marqueur d'extinction
 * est cherché autour d'une citation — ASYMÉTRIQUE, et la mesure qui l'impose
 * est dans le dépôt.
 *
 * Deux arbitrages de la même famille que `FENETRE_ADJACENCE_PACK` :
 *  · 200 en AMONT — assez pour « Le BMS-10 avait été proposé. Il n'est plus
 *    nécessaire en l'état. » malgré la frontière de phrase, assez étroit pour
 *    qu'un marqueur portant sur une autre cible ne déborde pas à coup sûr ;
 *  · 420 en AVAL — la consigne exige de reprendre le motif d'arrêt « tel
 *    qu'il t'est donné », APRÈS la cible qu'il éteint, et le motif de STOP-STR
 *    porte son unique marqueur (« n'ont pas d'objet ») à ~235 caractères
 *    normalisés de sa tête. Une fenêtre de 200 accusait donc la restitution
 *    la plus fidèle possible ; 420 couvre un motif de cette taille cité
 *    entier, sans s'étendre au paragraphe suivant. Le banc des marqueurs tire
 *    ces textes des constantes de production, et celui de la borne haute
 *    rougit si l'une des deux fenêtres s'élargit en silence.
 */
const FENETRE_EXTINCTION_AMONT = 200;
const FENETRE_EXTINCTION_AVAL = 420;

/**
 * Vocabulaire fermé des formulations PRESCRIPTIVES, en forme normalisée.
 *
 * Ce que le garde vise n'est pas le NOM d'un ingrédient — « carence en fer »,
 * « statut en zinc », « magnesemie basse » sont de la biologie légitime, et un
 * garde qui les accuse crie tout le temps, donc ne se lit plus. Ce qui se
 * mesure est le CONSEIL : le modèle qui passe du constat à la recommandation.
 *
 * « supplement » attrape par préfixe supplémentation/supplémenter/supplémenté ;
 * « complementation » et « complement alimentaire » sont pris entiers, parce que
 * « complement » seul attraperait « complément d'information ». Aucun verbe
 * générique (« prendre », « conseiller ») : ils voisinent trop de prose normale
 * — « prendre en compte le statut en fer » n'est pas un conseil de complément.
 */
const MARQUEURS_PRESCRIPTION = [
  'supplement',
  'complementation',
  'complement alimentaire',
  'posologie',
  'prescrire',
  'prescription de',
  'cure de',
  'mg par jour',
  'ui par jour',
];

/**
 * Fenêtre autour d'un nom d'ingrédient, symétrique : la formulation
 * prescriptive précède le nom (« supplémentation en oméga-3 ») aussi souvent
 * qu'elle le suit (« oméga-3, 1000 mg par jour »). 60 caractères normalisés
 * couvrent les deux tournures sans franchir la phrase voisine.
 */
const FENETRE_PRESCRIPTION = 60;

/** Positions de chaque occurrence de `cible` dans `texte` (déjà normalisés). */
function positionsDe(texte: string, cible: string): number[] {
  const positions: number[] = [];
  if (!cible) return positions;
  let depuis = 0;
  for (;;) {
    const position = texte.indexOf(cible, depuis);
    if (position === -1) return positions;
    positions.push(position);
    depuis = position + 1;
  }
}

/**
 * Positions de `cible` en tant que MOT ENTIER dans un texte normalisé.
 *
 * Indispensable sur les noms d'ingrédient : le catalogue contient « fer », et
 * une recherche par sous-chaîne le trouverait dans « ferritine » — soit
 * exactement le faux positif que ce garde doit éviter, sur le mot le plus
 * fréquent de la prose biologique.
 */
function positionsDeMot(texte: string, cible: string): number[] {
  return positionsDe(texte, cible).filter(position => {
    const avant = position === 0 ? ' ' : texte[position - 1];
    const apresIndex = position + cible.length;
    const apres = apresIndex >= texte.length ? ' ' : texte[apresIndex];
    return avant === ' ' && apres === ' ';
  });
}

/** Une formulation prescriptive vit-elle dans la fenêtre autour de ce nom ? */
function prescriptionPresDe(texte: string, position: number, longueur: number): boolean {
  const fenetre = texte.slice(
    Math.max(0, position - FENETRE_PRESCRIPTION),
    Math.min(texte.length, position + longueur + FENETRE_PRESCRIPTION),
  );
  return MARQUEURS_PRESCRIPTION.some(marqueur => fenetre.includes(marqueur));
}

/** Un marqueur d'extinction vit-il dans la fenêtre autour de cette citation ? */
function marqueurPresDe(texte: string, position: number, longueur: number): boolean {
  const fenetre = texte.slice(
    Math.max(0, position - FENETRE_EXTINCTION_AMONT),
    Math.min(texte.length, position + longueur + FENETRE_EXTINCTION_AVAL),
  );
  return MARQUEURS_EXTINCTION.some(marqueur => fenetre.includes(marqueur));
}

function morceaux(synthese: TexteSynthese): string[] {
  const out: string[] = [
    synthese.resume_praticien ?? '',
    synthese.narratif_patient ?? '',
    synthese.limites ?? '',
    ...(synthese.points_de_vigilance ?? []),
    ...(synthese.questions_entretien ?? []),
  ];
  for (const axe of synthese.axes_prioritaires ?? []) {
    out.push(axe.axe ?? '');
    out.push(...(axe.arguments ?? []));
    out.push(...(axe.points_a_confirmer ?? []));
  }
  return out;
}

/**
 * Rend les cibles citées par la synthèse mais absentes de la recommandation qui
 * lui a été transmise. Tableau vide = restitution fidèle.
 *
 * **Adjacence exigée sur les titres de pack.** Un titre seul ne suffit pas : il
 * faut « pack » juste avant. Quatre des seize titres sont des syntagmes
 * cliniques français ordinaires — « digestif et intestin-cerveau », « stress
 * chronique et burnout », « sommeil et chronobiologie », « migraine et
 * cephalees » — qu'un praticien écrit dans une synthèse sans jamais désigner un
 * pack. Sans cette contrainte, le garde accusait la prose clinique normale, et
 * ce faux signal aurait noyé le vrai dès le premier jour. Le slug, lui, n'a
 * aucun homonyme naturel : il est cherché partout.
 */
export function verifierRestitutionOrientation(
  synthese: TexteSynthese,
  fournis: {
    packs: readonly PackId[];
    questionnaires: readonly string[];
    /**
     * Cibles dont la recommandation est ÉTEINTE, parmi celles transmises —
     * l'appelant n'y met PAS les instruments déjà passés du dossier : une
     * passation se cite comme un résultat, sans marqueur d'extinction, et
     * l'y laisser ferait accuser la prose clinique normale.
     */
    eteints?: { packs: readonly PackId[]; questionnaires: readonly string[] };
    /**
     * Cibles RECOMMANDÉES vivantes — même restriction : pas les instruments
     * déjà passés, dont le résultat peut légitimement voisiner une phrase
     * d'extinction portant sur une autre cible.
     */
    recommandes?: { packs: readonly PackId[]; questionnaires: readonly string[] };
    /**
     * Compléments : `vocabulaire` est la liste des noms d'ingrédient du
     * catalogue C4 (forme brute, normalisée ici) ; `autorises` sont ceux
     * portés par une intention déterministe. En synthèse, `autorises` est
     * vide — la synthèse précède la carte de décision (`D-056`).
     */
    complements?: { vocabulaire: readonly string[]; autorises?: readonly string[] };
  },
): EcartRestitution[] {
  const parties = morceaux(synthese);
  const texte = normaliser(parties.join(' \n '));
  const ecarts: EcartRestitution[] = [];

  if (texte) {
    const packsAutorises = new Set<PackId>(fournis.packs);
    for (const pack of PACKS_REGISTRY) {
      if (packsAutorises.has(pack.id)) continue;
      const titre = normaliser(pack.titre);
      const slug = normaliser(pack.id);
      if (!titre) continue;
      if (citeCommePack(texte, titre) || texte.includes(slug)) {
        ecarts.push({ type: 'pack', identifiant: pack.id });
      }
    }
  }

  // Les identifiants de questionnaire sont cherchés sur le texte NON normalisé :
  // leur forme est déjà canonique, et la normalisation détruirait les
  // séparateurs qui la définissent.
  const questionnairesAutorises = new Set(fournis.questionnaires);
  const vus = new Set<string>();
  for (const partie of parties) {
    for (const trouve of partie.match(MOTIF_QUESTIONNAIRE) ?? []) {
      if (questionnairesAutorises.has(trouve) || vus.has(trouve)) continue;
      vus.add(trouve);
      ecarts.push({ type: 'questionnaire', identifiant: trouve });
    }
  }

  // ── ÉTEINTE ≠ RECOMMANDÉE ([[D-055]], arbitrage 5) ─────────────────────────
  //
  // Une cible ÉTEINTE reste citable — la retirer de l'allowlist ci-dessus
  // reprocherait au modèle de parler de ce qu'on lui a transmis. Ce qui se
  // mesure ici est la PRÉSENTATION : chaque citation d'une cible éteinte doit
  // voisiner un marqueur d'extinction (la consigne l'exige), et aucune citation
  // d'une cible recommandée vivante ne doit en voisiner un. La fenêtre court
  // sur le texte joint : un marqueur en début de morceau suivant compte — le
  // choix le moins accusateur des deux.
  const positionsCitationQuestionnaire = (id: string) => {
    const cible = normaliser(id);
    return positionsDe(texte, cible).map(position => ({ position, longueur: cible.length }));
  };
  const positionsCitationPack = (packId: PackId) => {
    const pack = PACKS_REGISTRY.find(candidat => candidat.id === packId);
    const citations: { position: number; longueur: number }[] = [];
    if (!pack) return citations;
    const titre = normaliser(pack.titre);
    if (titre) {
      // Même adjacence que l'allowlist : un titre sans « pack » en amont est un
      // syntagme clinique, pas une citation de pack.
      for (const position of positionsDe(texte, titre)) {
        const amont = texte.slice(Math.max(0, position - FENETRE_ADJACENCE_PACK), position);
        if (MOT_PACK.test(amont)) citations.push({ position, longueur: titre.length });
      }
    }
    const slug = normaliser(packId);
    for (const position of positionsDe(texte, slug)) {
      citations.push({ position, longueur: slug.length });
    }
    return citations;
  };

  if (texte) {
    for (const identifiant of fournis.eteints?.questionnaires ?? []) {
      const citations = positionsCitationQuestionnaire(identifiant);
      if (citations.some(citation => !marqueurPresDe(texte, citation.position, citation.longueur))) {
        ecarts.push({ type: 'extinction', identifiant, sens: 'eteinte_presentee_recommandee' });
      }
    }
    for (const identifiant of fournis.eteints?.packs ?? []) {
      const citations = positionsCitationPack(identifiant);
      if (citations.some(citation => !marqueurPresDe(texte, citation.position, citation.longueur))) {
        ecarts.push({ type: 'extinction', identifiant, sens: 'eteinte_presentee_recommandee' });
      }
    }
    for (const identifiant of fournis.recommandes?.questionnaires ?? []) {
      const citations = positionsCitationQuestionnaire(identifiant);
      if (citations.some(citation => marqueurPresDe(texte, citation.position, citation.longueur))) {
        ecarts.push({ type: 'extinction', identifiant, sens: 'recommandee_presentee_eteinte' });
      }
    }
    for (const identifiant of fournis.recommandes?.packs ?? []) {
      const citations = positionsCitationPack(identifiant);
      if (citations.some(citation => marqueurPresDe(texte, citation.position, citation.longueur))) {
        ecarts.push({ type: 'extinction', identifiant, sens: 'recommandee_presentee_eteinte' });
      }
    }
  }

  if (fournis.complements) {
    ecarts.push(...verifierRestitutionComplements(synthese, fournis.complements));
  }

  return ecarts;
}

/**
 * Un complément nommé EN CONTEXTE PRESCRIPTIF, sans intention déterministe qui
 * le porte ([[D-056]], arbitrage 5).
 *
 * Fonction SÉPARÉE, et pas seulement une branche de la précédente : le garde
 * d'orientation ne tourne que si un bloc de recommandation a été injecté —
 * sans bloc, il n'y a rien à restituer, et le lancer avec une liste blanche
 * vide accuserait tout pack cité dans la prose. Les compléments n'ont pas
 * cette dépendance : ils se mesurent sur toute synthèse, injectée ou non,
 * parce que le déterministe n'en propose aucun tant que le catalogue de
 * décision est vide.
 *
 * Le nom seul ne suffit jamais : il faut une formulation prescriptive dans la
 * fenêtre.
 */
export function verifierRestitutionComplements(
  synthese: TexteSynthese,
  complements: { vocabulaire: readonly string[]; autorises?: readonly string[] },
): EcartRestitution[] {
  const texte = normaliser(morceaux(synthese).join(' \n '));
  if (!texte) return [];
  const autorises = new Set((complements.autorises ?? []).map(normaliser));
  const vus = new Set<string>();
  const ecarts: EcartRestitution[] = [];
  for (const nom of complements.vocabulaire) {
    const cible = normaliser(nom);
    if (!cible || autorises.has(cible) || vus.has(cible)) continue;
    const cite = positionsDeMot(texte, cible)
      .some(position => prescriptionPresDe(texte, position, cible.length));
    if (cite) {
      vus.add(cible);
      ecarts.push({ type: 'complement', identifiant: nom });
    }
  }
  return ecarts;
}

/**
 * Rendu court pour un journal : `pack:slug`, `questionnaire:Q_SOM_09`,
 * `extinction:eteinte_presentee_recommandee:Q_STR_05`.
 */
export function formaterEcarts(ecarts: readonly EcartRestitution[]): string {
  return ecarts
    .map(ecart =>
      ecart.type === 'extinction'
        ? `extinction:${ecart.sens}:${ecart.identifiant}`
        : `${ecart.type}:${ecart.identifiant}`,
    )
    .join(', ');
}
