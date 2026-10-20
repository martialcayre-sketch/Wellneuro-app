// « MES ÉCHANGES » — le journal daté du portail patient ([[D-293]], lettre u ;
// J3-base, H61). Domaine PUR, client-safe : aucune dépendance Prisma ni React.
//
// ── CE QUE C'EST ────────────────────────────────────────────────────────────
//
// Une liste datée, EN LECTURE, de ce que le praticien a remis (bilan et sa note,
// fiches, courrier pour le médecin, protocole) et de ce que le patient a
// transmis (questionnaires, comptes rendus d'analyses, documents déposés,
// signalements avec leur statut). Chaque ligne ouvre la page du portail où l'élément se trouve DÉJÀ :
// le journal ne montre aucun contenu qui ne soit servi ailleurs (§1).
//
// ── CE QUE CE N'EST PAS ─────────────────────────────────────────────────────
//
// Ni une messagerie, ni la liste des e-mails (un objet d'e-mail affiché
// deviendrait un texte patient), ni la réponse du praticien à une demande de
// droit, ni l'issue d'un effet indésirable (§2). Aucune écriture du patient.
//
// ── LA FORME, ARBITRÉE LE 2026-10-18 ────────────────────────────────────────
//
// Une seule liste, le plus récent en haut, groupée par jour. Chaque ligne dit
// qui a agi (« Remis » / « Transmis »), puis l'objet nommé comme sur sa page.
// Le statut d'un signalement reprend les mots de « Informations » — mêmes
// libellés, même source.
//
// ── LA LECTURE DATÉE ([[D-297]]) ────────────────────────────────────────────
//
// Elle ne s'écrit pas ici : « Mes échanges » ne fait que mener à la page du
// document, et c'est cette page qui consigne — et qui sert la phrase « Votre
// lecture est datée », en tête. Le journal la sert aussi, parmi ses blocs.

export type SensEchange = 'remis' | 'transmis';

export type EspeceEchange =
  | 'bilan'
  | 'fiche_assiette'
  | 'lettre_adressage'
  | 'protocole'
  | 'questionnaire'
  | 'compte_rendu'
  | 'document_depose'
  | 'signalement';

export type EntreeEchange = {
  /** Unique dans le journal : la clé de rendu. */
  cle: string;
  sens: SensEchange;
  espece: EspeceEchange;
  /** L'objet, nommé comme sur sa page. Jamais un contenu. */
  objet: string;
  /** Instant de la remise ou de la transmission (ISO). Sert à ordonner et à dater. */
  date: string;
  /** Le chemin sous `/portail/<token>/`. Le token vient de l'écran, jamais du serveur. */
  chemin: string;
  /**
   * Jour d'ouverture de la surface (AAAA-MM-JJ, Paris), présent seulement quand
   * l'élément est daté d'AVANT : remis ce jour-là, il n'est visible que depuis.
   */
  afficheDepuis?: string;
};

export type JourEchanges = { jour: string; libelle: string; entrees: EntreeEchange[] };

// Mots repris de la page « Informations » (`informations/page.tsx`) : le
// journal ne nomme pas autrement ce que l'écran du signalement nomme déjà.
export const LIBELLE_CATEGORIE_SIGNALEMENT: Readonly<Record<string, string>> = Object.freeze({
  effet_indesirable: 'Effet indésirable suspecté',
  incident_confidentialite: 'Incident de confidentialité',
  demande_droit: 'Demande de droit',
});
export const LIBELLE_STATUT_TRAITEMENT: Readonly<Record<string, string>> = Object.freeze({
  recu: 'Reçu',
  en_cours: 'En cours d’examen',
  traite: 'Traité',
  clos: 'Clos',
});

export const LIBELLE_SENS: Readonly<Record<SensEchange, string>> = Object.freeze({
  remis: 'Remis',
  transmis: 'Transmis',
});

/**
 * Ce que le serveur a lu, espèce par espèce. Une espèce dont la surface est
 * fermée par son propre drapeau arrive VIDE : le journal ne devient pas la porte
 * dérobée d'un écran clos.
 */
export type SourcesMesEchanges = {
  bilan: { id: string; envoyeLe: Date } | null;
  fiches: { idRemise: string; libelle: string; remiseLe: Date }[];
  lettre: { id: string; remiseLe: Date } | null;
  protocole: { approbationId: string; approuveLe: Date } | null;
  questionnaires: { idAssignation: string; titre: string; transmisLe: Date }[];
  comptesRendus: { deposeLe: Date }[];
  /** Les documents déposés par le patient ([[D-330]]) : la date seule. */
  documentsDeposes: { deposeLe: Date }[];
  signalements: { categorie: string; statutTraitement: string; soumisLe: Date }[];
};

/**
 * Jour d'ouverture de chaque surface fermée par son propre drapeau (t14) : une
 * fois ouverte, elle fait paraître d'un coup des éléments anciens, vrais et
 * datés de leur jour, mais que le patient ne voyait pas. La ligne le dit.
 */
export type OuverturesMesEchanges = Partial<Record<EspeceEchange, string>>;

export function entreesMesEchanges(
  sources: SourcesMesEchanges,
  ouvertures: OuverturesMesEchanges = {},
): EntreeEchange[] {
  const entrees: EntreeEchange[] = [];
  if (sources.bilan) {
    entrees.push({
      cle: `bilan:${sources.bilan.id}`,
      sens: 'remis',
      espece: 'bilan',
      objet: 'Votre bilan',
      date: sources.bilan.envoyeLe.toISOString(),
      chemin: 'bilan',
    });
  }
  for (const fiche of sources.fiches) {
    entrees.push({
      cle: `fiche_assiette:${fiche.idRemise}`,
      sens: 'remis',
      espece: 'fiche_assiette',
      objet: `Votre fiche — ${fiche.libelle}`,
      date: fiche.remiseLe.toISOString(),
      chemin: `fiches/${encodeURIComponent(fiche.idRemise)}`,
    });
  }
  if (sources.lettre) {
    entrees.push({
      cle: `lettre_adressage:${sources.lettre.id}`,
      sens: 'remis',
      espece: 'lettre_adressage',
      objet: 'Le courrier pour votre médecin',
      date: sources.lettre.remiseLe.toISOString(),
      chemin: 'courrier-medecin',
    });
  }
  if (sources.protocole) {
    entrees.push({
      // Clé CONSTANTE : il n'y a qu'un protocole en vigueur, et le navigateur ne
      // connaît pas l'identifiant de l'approbation (`api/portail/lectures`).
      cle: 'protocole',
      sens: 'remis',
      espece: 'protocole',
      objet: 'Votre protocole',
      date: sources.protocole.approuveLe.toISOString(),
      // Le protocole se lit dans « Mon accompagnement », sur l'accueil du parcours.
      chemin: 'questionnaires',
    });
  }
  for (const q of sources.questionnaires) {
    entrees.push({
      cle: `questionnaire:${q.idAssignation}`,
      sens: 'transmis',
      espece: 'questionnaire',
      objet: `Questionnaire « ${q.titre} »`,
      date: q.transmisLe.toISOString(),
      chemin: `questionnaires/${encodeURIComponent(q.idAssignation)}`,
    });
  }
  sources.comptesRendus.forEach((cr, rang) => {
    entrees.push({
      // Aucun identifiant ne sort de la route des comptes rendus (§4 de sa
      // lettre) : la date et le rang suffisent à une clé de rendu.
      cle: `compte_rendu:${cr.deposeLe.toISOString()}:${rang}`,
      sens: 'transmis',
      espece: 'compte_rendu',
      objet: 'Compte rendu d’analyses',
      date: cr.deposeLe.toISOString(),
      chemin: 'comptes-rendus',
    });
  });
  sources.documentsDeposes.forEach((d, rang) => {
    entrees.push({
      // [[D-330]] §2 : une ligne datée, SANS nom de fichier — il n'est jamais
      // gardé — ni catégorie : l'objet dit seulement qu'un document est parti.
      cle: `document_depose:${d.deposeLe.toISOString()}:${rang}`,
      sens: 'transmis',
      espece: 'document_depose',
      objet: 'Document déposé',
      date: d.deposeLe.toISOString(),
      chemin: 'documents',
    });
  });
  sources.signalements.forEach((s, rang) => {
    const categorie = LIBELLE_CATEGORIE_SIGNALEMENT[s.categorie] ?? 'Signalement';
    const statut = LIBELLE_STATUT_TRAITEMENT[s.statutTraitement] ?? null;
    entrees.push({
      cle: `signalement:${s.categorie}:${s.soumisLe.toISOString()}:${rang}`,
      sens: 'transmis',
      espece: 'signalement',
      objet: statut ? `Signalement — ${categorie} · ${statut}` : `Signalement — ${categorie}`,
      date: s.soumisLe.toISOString(),
      chemin: 'informations',
    });
  });
  // L'élément reste à SON jour (le fait est vrai) ; seule une mention s'ajoute.
  for (const entree of entrees) {
    const ouverture = ouvertures[entree.espece];
    if (ouverture && jourParis(new Date(entree.date)) < ouverture) entree.afficheDepuis = ouverture;
  }
  // Le plus récent en haut. À instant égal, la clé départage : l'ordre ne
  // dépend jamais de l'ordre des lectures en base.
  return entrees.sort((a, b) => b.date.localeCompare(a.date) || a.cle.localeCompare(b.cle));
}

/**
 * Lit un réglage d'ouverture : `AAAA-MM-JJ`, jour civil existant, sinon `null`.
 * Une valeur illisible n'invente pas de jour : la mention ne s'affiche pas.
 */
export function jourOuverture(valeur: string | undefined): string | null {
  if (!valeur || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
  const instant = new Date(`${valeur}T12:00:00Z`);
  return !Number.isNaN(instant.getTime()) && instant.toISOString().slice(0, 10) === valeur ? valeur : null;
}

/** « Affiché à partir d'aujourd'hui », ou du jour d'ouverture s'il est passé. */
export function libelleAfficheDepuis(afficheDepuis: string, maintenant: Date): string {
  if (afficheDepuis === jourParis(maintenant)) return 'Affiché à partir d’aujourd’hui';
  return `Affiché à partir du ${LIBELLE_JOUR.format(new Date(`${afficheDepuis}T12:00:00Z`))}`;
}

const JOUR_PARIS = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const LIBELLE_JOUR = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Jour civil `AAAA-MM-JJ` d'un instant, en heure de Paris. */
export function jourParis(instant: Date): string {
  return JOUR_PARIS.format(instant);
}

/** Groupe des entrées déjà triées par jour civil, en heure de Paris. */
export function regrouperParJour(entrees: EntreeEchange[]): JourEchanges[] {
  const jours: JourEchanges[] = [];
  for (const entree of entrees) {
    const instant = new Date(entree.date);
    const jour = jourParis(instant);
    const dernier = jours[jours.length - 1];
    if (dernier && dernier.jour === jour) dernier.entrees.push(entree);
    else jours.push({ jour, libelle: LIBELLE_JOUR.format(instant), entrees: [entree] });
  }
  return jours;
}
