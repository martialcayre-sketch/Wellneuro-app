// LE MASQUAGE DE L'IDENTITÉ AVANT L'ENVOI ([[D-284]] §5, lot (j)) — bornes,
// géométrie des zones et messages. MODULE PUR : l'écran du praticien
// l'importe ('use client'), il ne charge ni Prisma, ni sharp, ni node:crypto.
//
// Le praticien noircit l'identité du patient sur chaque page ; le navigateur
// brûle les zones dans les pixels et envoie une image JPEG par page. Ce sont
// ces pages, et elles seules, que la lecture envoie à Anthropic. Les bornes
// sont celles des CHECK et du trigger de `bio_ingest_masquage_identite_v1`.

/** Pages d'un masquage : au-delà de 20 images, le fournisseur refuse toute image de plus de 2 000 px. */
export const PAGES_MAX = 20;

/** Une page : 5 Mio en base64 chez le fournisseur, soit 3,75 Mio d'octets. */
export const TAILLE_MAX_PAGE_OCTETS = (5 * 1024 * 1024 * 3) / 4;

/** Toutes les pages : moins de 27 Mo en base64, sous le plafond de 32 Mo d'une requête. */
export const TOTAL_MAX_OCTETS = 20 * 1024 * 1024;

/** Borne technique du compte des zones (CHECK `zones_check`). */
export const ZONES_MAX = 1000;

/**
 * Plus grand côté d'une page rendue, en pixels : le fournisseur ramène toute
 * image à 1 568 px de grand côté avant de la lire. Rendre plus grand ne
 * donnerait rien au modèle et coûterait la mémoire du navigateur.
 */
export const COTE_RENDU_PX = 1568;

/** Qualité JPEG des pages masquées (le serveur les réencode à 85). */
export const QUALITE_JPEG = 0.85;

/** Une zone noircie, en pixels de la page rendue. */
export type Zone = { x: number; y: number; largeur: number; hauteur: number };

/** En deçà de ce côté (pixels de la page), un tracé est un clic, pas une zone. */
export const COTE_MIN_ZONE_PX = 4;

/**
 * La zone tracée entre deux points, dans n'importe quel sens, bornée à la
 * page. `null` si elle est trop petite pour être voulue.
 */
export function zoneEntre(
  depart: { x: number; y: number },
  arrivee: { x: number; y: number },
  page: { largeur: number; hauteur: number },
): Zone | null {
  const borne = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  const x1 = borne(Math.min(depart.x, arrivee.x), page.largeur);
  const y1 = borne(Math.min(depart.y, arrivee.y), page.hauteur);
  const x2 = borne(Math.max(depart.x, arrivee.x), page.largeur);
  const y2 = borne(Math.max(depart.y, arrivee.y), page.hauteur);
  if (x2 - x1 < COTE_MIN_ZONE_PX || y2 - y1 < COTE_MIN_ZONE_PX) return null;
  return { x: Math.round(x1), y: Math.round(y1), largeur: Math.round(x2 - x1), hauteur: Math.round(y2 - y1) };
}

/**
 * Un point de l'écran ramené aux pixels de la page : le canevas est affiché
 * à la largeur de la colonne, pas à sa taille réelle.
 */
export function pointDansPage(
  client: { x: number; y: number },
  cadre: { left: number; top: number; width: number; height: number },
  page: { largeur: number; hauteur: number },
): { x: number; y: number } {
  return {
    x: ((client.x - cadre.left) / cadre.width) * page.largeur,
    y: ((client.y - cadre.top) / cadre.height) * page.hauteur,
  };
}

/**
 * L'échelle de rendu d'une page : son plus grand côté porté à `COTE_RENDU_PX`.
 * Une page de PDF (mesurée en points) s'agrandit ; une photo ne s'agrandit
 * jamais, elle se réduit seulement.
 */
export function echelleRendu(largeur: number, hauteur: number, agrandir: boolean): number {
  const facteur = COTE_RENDU_PX / Math.max(largeur, hauteur);
  return agrandir ? facteur : Math.min(1, facteur);
}

/**
 * La déclaration du praticien est-elle recevable ? Des zones, OU la case
 * « aucune identité », jamais les deux ni aucun des deux (CHECK
 * `declaration_check`).
 */
export function declarationValide(zonesMasquees: number, aucuneIdentite: boolean): boolean {
  if (!Number.isInteger(zonesMasquees) || zonesMasquees < 0 || zonesMasquees > ZONES_MAX) return false;
  return aucuneIdentite ? zonesMasquees === 0 : zonesMasquees > 0;
}

/** Le jugement d'UNE page : ses zones masquées (au moins une), ou « aucune » identité déclarée. */
export type JugementPage = number | 'aucune';

/**
 * Chaque page est-elle jugée, et l'ensemble répond-il à la déclaration ? Un
 * jugement par page ; la somme des zones est le compte déclaré ; la case du
 * document veut toutes les pages « aucune ». L'écran l'exige déjà, mais le
 * navigateur ne fait pas foi : le serveur rejuge (revue Copilot de #1428).
 */
export function jugementsValides(
  jugements: readonly JugementPage[],
  nombrePages: number,
  zonesMasquees: number,
  aucuneIdentite: boolean,
): boolean {
  if (!declarationValide(zonesMasquees, aucuneIdentite)) return false;
  if (jugements.length !== nombrePages) return false;
  let somme = 0;
  for (const j of jugements) {
    if (j === 'aucune') continue;
    if (!Number.isInteger(j) || j < 1 || j > ZONES_MAX) return false;
    somme += j;
  }
  if (aucuneIdentite) return jugements.every(j => j === 'aucune');
  return somme === zonesMasquees;
}

export const MESSAGES_MASQUAGE: Record<string, string> = {
  compte_rendu_introuvable: 'Ce compte rendu est introuvable dans ce dossier.',
  document_purge: 'Le document de ce compte rendu a été effacé : il ne peut plus être masqué.',
  lecture_demandee: 'Une lecture de ce compte rendu est demandée ou en cours : attendez son issue.',
  extraction_en_cours: 'Une lecture de ce compte rendu est en cours : attendez son issue.',
  ligne_validee: 'Une ligne de ce compte rendu a déjà été validée : il ne sera plus relu.',
  longueur_requise: 'La taille de l’envoi doit être annoncée.',
  pages_trop_lourdes: 'Les pages masquées dépassent 20 Mo au total.',
  pages_absentes: 'Aucune page masquée n’a été reçue.',
  trop_de_pages: `Un compte rendu de plus de ${PAGES_MAX} pages ne peut pas être masqué ni lu.`,
  pages_incompletes: 'Le nombre de pages masquées ne correspond pas au document.',
  page_non_jpeg: 'Une page masquée n’est pas une image JPEG.',
  page_illisible: 'Une page masquée n’a pas pu être lue.',
  page_trop_grande: 'Une page masquée dépasse 8 000 pixels de côté.',
  page_trop_lourde: 'Une page masquée dépasse 3,75 Mo.',
  declaration_invalide:
    'Chaque page doit porter une zone masquée, ou la déclaration « aucune identité » ; la case du document exclut toute zone.',
};
