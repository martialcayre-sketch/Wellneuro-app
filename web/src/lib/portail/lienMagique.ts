import { createHmac, randomBytes } from 'crypto';

// Lien magique d'accès au portail patient — gate G4 (IDP LOT-01).
//
// Le portail s'ouvre aujourd'hui avec un jeton PERMANENT stocké en clair
// (`patients.access_token`) : un lien envoyé il y a six mois ouvre encore
// l'espace. Ce module porte le remplacement progressif — un jeton haché en
// base, valable 24 h, à usage unique, dont le rejeu est refusé et tracé.
//
// Les deux chemins coexistent pendant la bascule : ce module n'enlève rien, il
// ajoute une entrée. Le jeton permanent reste la clé de l'URL du portail et
// l'ancrage de la session (voir `web/src/lib/patient-session.ts`).
//
// Tout ce qui décide — la validité, l'expiration, la cadence — est ici, en
// fonctions pures avec l'instant injecté. Les routes ne font que lire la base
// et appliquer ce que ces fonctions répondent.

/** 24 h : arbitrage du 2026-07-20. La session qu'il ouvre reste à 12 h glissantes. */
export const DUREE_VALIDITE_MS = 24 * 60 * 60 * 1000;

/** Plafond de redemandes d'un même patient sur une heure glissante. */
export const PLAFOND_DEMANDES_PAR_HEURE = 3;
export const FENETRE_DEMANDES_MS = 60 * 60 * 1000;

/**
 * Plafond de tentatives par origine réseau sur la même heure glissante.
 *
 * Le plafond par patient ne borne rien face à l'énumération : celui qui essaie
 * mille adresses inconnues n'atteint jamais le plafond d'un patient, puisqu'il
 * n'en touche aucun. C'est ce plafond-ci qui rend l'essai en masse impraticable.
 *
 * 20, et non 3 : plusieurs personnes peuvent partager une même sortie réseau —
 * un foyer, un cabinet, un opérateur mobile. Le seuil doit gêner l'énumération,
 * jamais la deuxième tentative d'un patient qui a mal recopié son adresse.
 */
export const PLAFOND_TENTATIVES_PAR_IP = 20;

/**
 * Durée de conservation des tentatives. Au-delà, la ligne n'a plus d'usage :
 * elle sort de la fenêtre de comptage et ne sert plus qu'à conserver une trace
 * d'origine réseau — ce qu'on ne veut pas garder.
 */
export const RETENTION_TENTATIVES_MS = 24 * 60 * 60 * 1000;

/**
 * Plancher de réponse, commun à toutes les sorties indifférenciées.
 *
 * Le corps et le code sont déjà identiques ; restait le *temps*. Une adresse
 * connue déclenche une écriture et une poignée SMTP, une adresse inconnue ne
 * déclenche rien : l'écart se mesure, et il dit ce que la réponse tait.
 */
export const PLANCHER_REPONSE_MS = 1500;

/**
 * Palier d'arrondi au-delà du plancher. Un envoi SMTP anormalement lent peut
 * dépasser le plancher ; l'arrondi ramène alors le temps observable à un petit
 * nombre de valeurs au lieu d'une mesure continue.
 */
export const PALIER_REPONSE_MS = 500;

/**
 * Le message unique. Consommé, expiré, inconnu : la personne lit exactement la
 * même phrase dans les trois cas.
 *
 * Un refus muet serait incompréhensible pour elle ; un message précis
 * (« déjà utilisé », « expiré ») dirait à un attaquant si le jeton qu'il tente
 * a existé. Cette phrase est exportée d'un seul endroit pour qu'aucune surface
 * ne puisse en dire une autre.
 */
export const MESSAGE_LIEN_INDISPONIBLE =
  'Ce lien n’est plus valable. Vous pouvez en recevoir un nouveau par e-mail.';

/**
 * La réponse du canal de redemande — la même que l'adresse corresponde ou non
 * à un espace patient. C'est ce qui empêche d'énumérer les adresses connues.
 */
export const MESSAGE_DEMANDE_ENVOYEE =
  'Si cette adresse correspond à un espace patient, vous recevrez un lien dans quelques minutes.';

export type EtatLien = 'valide' | 'consomme' | 'expire';

/** Ce que la base sait d'un lien. Volontairement réduit : le jeton n'y est pas. */
export type LigneLienMagique = {
  expireLe: Date;
  consommeLe: Date | null;
};

/**
 * Génère un jeton de lien magique.
 *
 * 32 octets aléatoires, et non `createPublicId` : celui-ci tire 18 octets, ce
 * qui suffit à un identifiant public mais pas à un secret d'authentification.
 * Le jeton n'est renvoyé qu'ici, une fois — il part dans l'e-mail et n'est
 * jamais réécrit nulle part.
 */
export function creerJeton(): string {
  return randomBytes(32).toString('base64url');
}

function secret(): string {
  const valeur = process.env.NEXTAUTH_SECRET;
  if (!valeur) {
    // Même exigence que la session portail : on échoue explicitement plutôt
    // que de calculer une empreinte avec un secret vide.
    throw new Error('NEXTAUTH_SECRET manquant : impossible de hacher un lien magique.');
  }
  return valeur;
}

/**
 * Empreinte stockée en base. Le jeton lui-même n'y entre jamais : un dump de la
 * base ne permet donc pas d'ouvrir un espace patient.
 *
 * HMAC plutôt que hachage nu — sans le secret, une empreinte ne peut pas être
 * vérifiée hors ligne contre des candidats. Le préfixe de domaine reprend le
 * motif de `fingerprintAccessToken` (`lib/patient-session.ts`) : une empreinte
 * calculée dans un domaine ne vaut pas dans l'autre.
 */
export function empreinteJeton(jeton: string): string {
  return createHmac('sha256', secret())
    .update(`portail-lien-magique:${jeton}`)
    .digest('base64url');
}

/** Instant d'expiration d'un lien créé à `maintenant`. */
export function expirationDepuis(maintenant: Date): Date {
  return new Date(maintenant.getTime() + DUREE_VALIDITE_MS);
}

/**
 * L'état d'un lien. L'ordre compte : un lien consommé **puis** expiré reste
 * « consommé » — c'est l'information juste pour la trace, et de toute façon
 * les trois états produisent le même message côté patient.
 */
export function etatLien(ligne: LigneLienMagique, maintenant: Date): EtatLien {
  if (ligne.consommeLe) return 'consomme';
  if (ligne.expireLe.getTime() <= maintenant.getTime()) return 'expire';
  return 'valide';
}

/**
 * Cadence de redemande : au plus `PLAFOND_DEMANDES_PAR_HEURE` sur l'heure
 * glissante, comptés sur les liens que le patient s'est envoyés lui-même.
 *
 * Le comptage se fait **en base**, pas en mémoire de processus : en serverless
 * plusieurs instances répondent, et un compteur local ne borne rien.
 */
export function debutFenetreDemandes(maintenant: Date): Date {
  return new Date(maintenant.getTime() - FENETRE_DEMANDES_MS);
}

export function plafondAtteint(demandesRecentes: number): boolean {
  return demandesRecentes >= PLAFOND_DEMANDES_PAR_HEURE;
}

export function plafondIpAtteint(tentativesRecentes: number): boolean {
  return tentativesRecentes > PLAFOND_TENTATIVES_PAR_IP;
}

/** Les tentatives antérieures à cet instant n'ont plus d'usage : elles se purgent. */
export function debutRetentionTentatives(maintenant: Date): Date {
  return new Date(maintenant.getTime() - RETENTION_TENTATIVES_MS);
}

/**
 * Origine réseau d'une requête, telle que Vercel la présente.
 *
 * `x-forwarded-for` est une liste : le premier élément est le client, les
 * suivants sont les relais. Absente en local ; toutes les requêtes sans en-tête
 * tombent alors dans le même seau — conservateur, jamais permissif.
 */
export function origineReseau(entetes: Headers): string {
  const chaine = entetes.get('x-forwarded-for') ?? entetes.get('x-real-ip') ?? '';
  return chaine.split(',')[0]?.trim() || 'origine-inconnue';
}

/**
 * Empreinte de l'origine réseau. L'adresse IP est une donnée personnelle : on
 * en garde de quoi compter, pas de quoi identifier.
 *
 * Même construction que `empreinteJeton` — HMAC clé `NEXTAUTH_SECRET`, préfixe
 * de domaine distinct pour qu'une empreinte d'un domaine ne vaille pas dans
 * l'autre.
 */
export function empreinteOrigine(origine: string): string {
  return createHmac('sha256', secret()).update(`portail-demande-ip:${origine}`).digest('base64url');
}

/**
 * Temps restant à attendre avant de répondre, pour que la durée observable ne
 * dise rien de ce qui s'est passé.
 *
 * En dessous du plancher, on attend le plancher. Au-dessus, on arrondit au
 * palier suivant : le temps observable ne prend qu'un petit nombre de valeurs.
 * Ce n'est pas une égalisation parfaite — un envoi très lent reste dans un
 * palier plus haut — mais couplé au plafond par origine réseau, exploiter ce
 * qui reste demande un volume de tentatives que ce plafond interdit.
 */
export function delaiAvantReponse(ecouleMs: number): number {
  if (ecouleMs <= PLANCHER_REPONSE_MS) return PLANCHER_REPONSE_MS - ecouleMs;
  const paliers = Math.ceil(ecouleMs / PALIER_REPONSE_MS);
  return paliers * PALIER_REPONSE_MS - ecouleMs;
}

/** Origine d'un lien, telle qu'écrite dans `cree_par`. */
export function originePraticien(email: string): string {
  return `praticien:${email.toLowerCase()}`;
}

export const ORIGINE_PATIENT = 'patient';
