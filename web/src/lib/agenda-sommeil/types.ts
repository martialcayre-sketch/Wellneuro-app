// Domaine PUR de l'agenda du sommeil 21 nuits (Q_SOM_09) — aucune dépendance
// Prisma, importable côté client (formulaire portail) comme côté serveur.
// La persistance vit dans `persistence.ts` (qui réexporte ce domaine pour les
// routes). Instrument de RECUEIL longitudinal : le patient saisit une nuit par
// matin ; les agrégats et le score ne sont produits qu'à la CLÔTURE, jamais
// renvoyés au patient (réserve R1). Une correction est une NOUVELLE ligne
// chaînée (`supersedesNuitId`), jamais un `update` — même doctrine que les
// check-ins J7/J14/J21 (§8.5).

export const AGENDA_SOMMEIL_ID = 'Q_SOM_09' as const;
export const AGENDA_SOMMEIL_TITRE = 'Agenda du sommeil — 21 nuits' as const;

// Contrat de persistance du JSON d'une nuit (distinct de la version de score de
// « Mon équilibre »). Toute évolution du sens des champs impose un nouveau
// suffixe versionné, jamais une réécriture silencieuse de `-v1`.
//
// v1 → v2 (2026-07-27) — trois changements de SENS, pas de forme :
//   (a) Ancres temporelles. `heureCoucher` désigne désormais l'EXTINCTION DE LA
//       LUMIÈRE (ancre « tentative de sommeil » du Consensus Sleep Diary) et
//       `heureLever` la SORTIE DU LIT. En v1 les libellés disaient « couché » /
//       « levé », ce qui laissait la lecture au lit dans le temps au lit et
//       faussait la latence.
//   (b) Réveils obligatoires. En v1 l'accordéon facultatif faisait qu'une nuit
//       sans réponse était agrégée comme « 0 réveil, 0 minute éveillée » : le
//       recueil récompensait la non-réponse en gonflant l'efficacité. En v2 la
//       durée cumulée est requise et porte une classe `aucun` EXPLICITE.
//   (c) Facteurs enrichis, avec `rienDeParticulier` — la seule valeur qui
//       distingue « aucun facteur ce soir » de « pas répondu ».
//   (d) Réveil final. `leverImmediat` + `heureReveilFinal` mesurent le temps
//       passé éveillé AU LIT le matin. En v1 le champ existait mais n'était ni
//       saisi ni lu : ces minutes étaient comptées comme du sommeil, et le
//       réveil matinal précoce n'apparaissait nulle part.
//   (e) Aide au sommeil, et rebornage de l'éveil nocturne sur 15 / 30 / 60 —
//       le seuil conventionnel de 30 min devient applicable (cf.
//       `ClasseDureeReveils`).
//   (f) Mise au lit. `extinctionImmediate` + `heureMiseAuLit` ferment le dernier
//       item du noyau du Consensus Sleep Diary. Conséquence lourde et voulue :
//       le TEMPS AU LIT court désormais de la mise au lit à la sortie du lit, et
//       non de l'extinction — l'efficacité, qui s'y rapporte, BAISSE pour tout
//       patient qui passe du temps au lit avant d'éteindre. Les valeurs d'avant
//       étaient plus flatteuses que celles de tout service calculant le temps au
//       lit selon la convention.
// Les lignes v1 restent lisibles telles quelles (cf. `ensureNuitReponses`) :
// leurs champs manquants valent `null`, jamais 0, et leurs classes d'éveil
// héritées sont acceptées en lecture (cf. `CLASSES_DUREE_REVEILS_LUES`).
//
// Pourquoi pas un `-v3` : v2 n'a jamais été mergé ni déployé, aucune ligne en
// base ne le porte (vérifié sur `origin/main` le 2026-07-28). Le numéroter v3
// inventerait une version que nulle base n'a contenue.
export const AGENDA_CONTRACT_VERSION = 'agenda-sommeil-v2' as const;
export const AGENDA_CONTRACT_VERSIONS_LUES = ['agenda-sommeil-v1', 'agenda-sommeil-v2'] as const;

// Fenêtre de recueil : 21 emplacements (une culture « protocole 21 jours » et le
// jalon J21 partagés par le produit).
export const NB_JOURS_AGENDA = 21;

// En dessous de ce nombre de nuits plausibles, le recueil est transmis au
// praticien mais NON agrégé — jamais un 0 par défaut. Sept nuits, pas cinq :
// c'est le minimum pour qu'une moyenne couvre une semaine entière.
export const MIN_NUITS_AGREGATS = 7;

// L'INDICE composite /100 demande davantage que les agrégats : une moyenne se
// stabilise vite, une variabilité non. Quatorze nuits DONT au moins quatre de
// week-end — un patient assidu du lundi au vendredi produit sinon une
// régularité excellente et fausse (cf. `couvertureSuffisante`).
export const MIN_NUITS_INDICE = 14;
export const MIN_NUITS_WEEKEND_INDICE = 4;

// ─── Classes qualitatives (jamais de minutes exactes : anti-anxiogène) ───────
// Latence d'endormissement — le patient choisit une classe, pas un chronomètre
// (aucune incitation à regarder l'horloge la nuit).
export type ClasseLatence = 'lt15' | 'e15_30' | 'e30_60' | 'gt60';
export const CLASSES_LATENCE: readonly ClasseLatence[] = ['lt15', 'e15_30', 'e30_60', 'gt60'];

// Durée cumulée des réveils nocturnes (WASO). `aucun` est une RÉPONSE — « nuit
// continue » —, distincte de l'absence de réponse qui reste `undefined`.
//
// Bornes 15 / 30 / 60, identiques à celles de la latence. Ce n'est pas une
// symétrie décorative : le seuil conventionnel des critères quantitatifs de
// l'insomnie est de 30 minutes, et les bornes v1 (15 / 45) le faisaient tomber
// À L'INTÉRIEUR de la classe « 15 à 45 » — impossible de dire si une nuit
// dépassait la borne, donc aucune métrique de fréquence calculable côté éveil
// alors qu'elle l'était côté latence. L'asymétrie n'était pas voulue.
export type ClasseDureeReveils = 'aucun' | 'lt15' | 'e15_30' | 'e30_60' | 'gt60';
export const CLASSES_DUREE_REVEILS: readonly ClasseDureeReveils[] = [
  'aucun',
  'lt15',
  'e15_30',
  'e30_60',
  'gt60',
];

// Classes d'éveil héritées de la v1, acceptées EN LECTURE SEULE. Les lignes déjà
// en base les portent ; sans elles, `toNuitRow` lèverait sur chaque lecture et
// l'historique deviendrait illisible. Elles ne sont JAMAIS converties vers les
// nouvelles : « 15 à 45 » n'est ni « 15 à 30 » ni « 30 à 60 », et trancher
// inventerait une précision que le patient n'a pas donnée. Elles comptent donc
// dans la moyenne d'éveil (leur centre reste défini) et sortent de la seule
// métrique de fréquence, avec leur propre compteur de couverture.
export type ClasseDureeReveilsHeritee = 'e15_45' | 'gt45';
export const CLASSES_DUREE_REVEILS_LUES: readonly (ClasseDureeReveils | ClasseDureeReveilsHeritee)[] =
  [...CLASSES_DUREE_REVEILS, 'e15_45', 'gt45'];

// Prise d'une aide au sommeil pour la nuit notée. Binaire : le nom et la dose du
// produit vivent au dossier médicamenteux, pas dans une saisie de 60 secondes
// répétée 21 matins. Obligatoire — sans elle, une efficacité de 90 % sous
// hypnotique se lit comme une efficacité de 90 % sans rien.
export type ClasseAideSommeil = 'aucune' | 'prise';
export const CLASSES_AIDE_SOMMEIL: readonly ClasseAideSommeil[] = ['aucune', 'prise'];

// Sieste de la veille.
export type ClasseSieste = 'aucune' | 'lt20' | 'e20_60' | 'gt60';
export const CLASSES_SIESTE: readonly ClasseSieste[] = ['aucune', 'lt20', 'e20_60', 'gt60'];

// ─── Contrat JSON d'une nuit ─────────────────────────────────────────────────
// Les heures sont des chaînes `HH:MM` en horloge murale LOCALE — jamais de
// conversion de fuseau (cf. `agregats.ts`).
//
// `rienDeParticulier` est EXCLUSIF des autres facteurs : une nuit ne peut pas
// être à la fois « rien de particulier » et « alcool le soir ». C'est ce qui
// permet de lire un objet `facteurs` vide comme « pas répondu » et non comme
// « aucun facteur ».
export const CLES_FACTEURS = [
  'cafeApres14h',
  'alcool',
  'ecransAuLit',
  'activitePhysique',
  'stress',
  'douleurs',
  'maladie',
  'repasTardif',
] as const;

export type CleFacteur = (typeof CLES_FACTEURS)[number];

export type FacteursNuit = Partial<Record<CleFacteur, boolean>> & {
  rienDeParticulier?: boolean;
};

export type ReveilsNuit = {
  // Durée cumulée d'éveil nocturne — c'est elle qui porte le critère clinique
  // et qui entre dans l'efficacité, pas le compte. Le type accepte les classes
  // héritées : elles existent en base, seule l'écriture les refuse.
  dureeTotale: ClasseDureeReveils | ClasseDureeReveilsHeritee;
  // Nombre de réveils : raffinement FACULTATIF, proposé seulement quand la nuit
  // n'a pas été continue. Absent = inconnu ; il n'entre dans aucun calcul
  // structurel, donc son absence ne biaise rien (contrairement au WASO).
  nombre?: number; // 0..3 (3 = « 3 ou plus »)
};

export type NuitReponses = {
  // — Obligatoire —
  heureCoucher: string; // HH:MM, pas de 15 min — extinction de la lumière (v2)
  heureLever: string; // HH:MM, pas de 15 min — sortie du lit (v2)
  // La latence reste une CLASSE et non une heure : demander l'heure exacte
  // d'endormissement supposerait que le patient l'ait observée, donc qu'il ait
  // regardé sa montre en essayant de dormir. Le Consensus Sleep Diary la
  // recueille lui aussi comme une durée estimée.
  latence: ClasseLatence;
  qualite: number; // 1..5 (emoji)
  // Les trois champs suivants sont obligatoires en ÉCRITURE v2
  // (`ensureNuitReponses(..., { exigerObligatoires: true })`) et facultatifs dans
  // le type : les lignes v1 déjà en base n'en portent aucun.
  reveils?: ReveilsNuit;
  aideSommeil?: ClasseAideSommeil;
  // `true` = lumière éteinte en se couchant. `false` impose `heureMiseAuLit`.
  // Symétrique de `leverImmediat`, et pour la même raison : le temps passé au
  // lit SANS chercher à dormir est une grandeur distincte de la latence
  // d'endormissement. Les confondre, c'est confondre deux conduites opposées —
  // lire une heure au lit relève du contrôle du stimulus, éteindre et ne pas
  // s'endormir non.
  extinctionImmediate?: boolean;
  // Requis si et seulement si `extinctionImmediate === false`. Doit précéder
  // l'extinction.
  heureMiseAuLit?: string; // HH:MM
  // `true` = levé dès le réveil. `false` impose `heureReveilFinal` : c'est le
  // seul moyen de mesurer le temps passé éveillé au lit le matin, donc de voir
  // le réveil matinal précoce — l'une des trois présentations de l'insomnie, et
  // jusqu'ici entièrement invisible (ces minutes étaient comptées en sommeil).
  leverImmediat?: boolean;
  // Requis si et seulement si `leverImmediat === false`. Doit tomber entre
  // l'extinction et la sortie du lit.
  heureReveilFinal?: string; // HH:MM
  // — Facultatif —
  forme?: number; // 1..5 au réveil
  siesteVeille?: ClasseSieste;
  facteurs?: FacteursNuit;
  // Retiré de la saisie patient en v2 (objectif « sans saisie textuelle ») ;
  // conservé en lecture pour les nuits v1 qui en portent un.
  commentaire?: string; // ≤ 200 caractères
};

// ─── Formes de lecture + chaînage append-only ────────────────────────────────
export type NuitRow = {
  id: string;
  idPatient: string;
  idAssignation: string;
  dateNuit: string; // AAAA-MM-JJ = matin du réveil, horloge murale locale
  reponses: NuitReponses;
  canal: string;
  supersedesNuitId: string | null;
  soumisLe: string; // ISO
};

export type NuitInput = {
  idPatient: string;
  idAssignation: string;
  dateNuit: string;
  reponses: NuitReponses;
  supersedesNuitId?: string | null;
};
