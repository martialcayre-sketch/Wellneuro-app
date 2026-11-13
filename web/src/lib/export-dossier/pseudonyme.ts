// Export PDF du dossier patient — le pseudonyme de la version « IA externe »
// ([[D-252]] §2, amendé par [[D-512]] §1).
//
// `PATnnn` est la clé interne de la base : stable, séquentielle, et table de
// correspondance de la pseudonymisation pour quiconque accède à l'application.
// La version « IA externe » porte à sa place un pseudonyme CALCULÉ — jamais
// stocké — par HMAC-SHA256 de l'identifiant sous un secret serveur. Le même
// dossier garde le même pseudonyme d'un export à l'autre (l'outil externe suit
// le dossier, ce que [[D-252]] §1 voulait), sans que le destinataire puisse
// remonter à `PATnnn` ni deviner l'ordre d'arrivée des dossiers.
//
// SERVEUR SEULEMENT : `node:crypto`. Le tiroir lit le pseudonyme dans l'en-tête
// de la réponse, jamais en important ce module.

import { createHmac } from 'node:crypto';

/** La variable d'environnement qui porte le secret — Scalingo, et `web/.env.local` en développement. */
export const VARIABLE_SECRET_PSEUDONYME = 'WN_EXPORT_PSEUDONYME_SECRET';

// Borne technique : un secret plus court se devine. 32 caractères, soit ce que
// `openssl rand -base64 24` produit.
const LONGUEUR_MIN_SECRET = 32;

// Base 32 de Crockford : ni I, L, O ni U — rien qui se lise de deux façons.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
// Six caractères, 30 bits : à cent dossiers, une chance sur deux cent mille
// que deux dossiers partagent un pseudonyme.
const LONGUEUR_PSEUDONYME = 6;
const PREFIXE = 'EXT-';
// Séparation de domaine : une empreinte calculée ici ne vaut nulle part ailleurs.
const DOMAINE = 'wellneuro-export-ia-externe:v1:';

export const FORME_PSEUDONYME = /^EXT-[0-9A-HJKMNP-TV-Z]{6}$/;

/** Levée quand la version « IA externe » est demandée sans secret configuré. */
export class SecretPseudonymeAbsent extends Error {
  constructor() {
    super(`${VARIABLE_SECRET_PSEUDONYME} absent ou trop court : export pseudonymisé impossible.`);
    this.name = 'SecretPseudonymeAbsent';
  }
}

/** Le secret, ou `null` s'il manque ou s'il est trop court pour en être un. */
export function lireSecretPseudonyme(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  const valeur = env[VARIABLE_SECRET_PSEUDONYME]?.trim();
  return valeur && valeur.length >= LONGUEUR_MIN_SECRET ? valeur : null;
}

/** `EXT-XXXXXX` : les 30 premiers bits du HMAC, en base 32 de Crockford. */
export function pseudonymeExport(idPatient: string, secret: string): string {
  if (secret.length < LONGUEUR_MIN_SECRET) throw new SecretPseudonymeAbsent();
  const empreinte = createHmac('sha256', secret).update(`${DOMAINE}${idPatient}`).digest();
  let bits = empreinte.readUInt32BE(0) >>> 2;
  let corps = '';
  for (let i = 0; i < LONGUEUR_PSEUDONYME; i++) {
    corps = ALPHABET[bits & 31] + corps;
    bits >>>= 5;
  }
  return `${PREFIXE}${corps}`;
}
