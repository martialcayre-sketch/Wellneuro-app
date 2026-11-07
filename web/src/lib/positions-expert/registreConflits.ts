import { createHash } from 'node:crypto';
import { CONFLITS_SOURCES_V1, type ConflitSourcesDeclare } from '@/lib/clinical/conflitsSourcesV1';
import { FICHE_ID_RE } from './vocabulaire';

// CE QUE L'ARBITRAGE LIT DU REGISTRE SIGNÉ DES CONFLITS (D-439 §3, A2, A3).
// Ce module LIT `conflitsSourcesV1` et ne le modifie pas : ce fichier est un
// chemin clinique, et sa re-signature est la PR 4 de BP-12b (§4).
//
// LA LISTE CURÉE DES FICHES PAR CONFLIT (A2) est le champ `fichesUsage` de
// chaque entrée, posé par la re-signature ([[D-452]] §2) : exactement les
// fiches de la structure signée qui épinglent l'un des deux claims. Avant elle
// (PR 3), aucune entrée ne la portait et toute pose était refusée « fiche hors
// de la liste curée ». La lecture reste défensive : une liste mal formée se lit
// vide, et rien ne s'arbitre sur une liste qu'on ne sait pas lire.
//
// L'EMPREINTE D'UNE ENTRÉE (A3) est le SHA-256 du JSON de l'entrée, comme
// `CONFLITS_SOURCES_SHA256` l'est de toute la liste. Une entrée retouchée
// (objet, positions, claims, liste des fiches…) change d'empreinte, et
// l'arbitrage qui l'attestait se lit « à relire ».

export type RegistreConflits = readonly ConflitSourcesDeclare[];

export const REGISTRE_DU_DEPOT: RegistreConflits = CONFLITS_SOURCES_V1;

/** L'entrée PUBLIÉE de ce conflit, ou `null` (inconnu, brouillon ou suspendu). */
export function conflitPublie(conflitId: string, registre: RegistreConflits = REGISTRE_DU_DEPOT): ConflitSourcesDeclare | null {
  return registre.find(c => c.id === conflitId && c.statut === 'publiee') ?? null;
}

/**
 * Les fiches sur lesquelles le conflit pèse, d'après le registre signé. Un
 * champ absent ou mal formé rend une liste vide : rien ne s'arbitre sur une
 * liste qu'on ne sait pas lire.
 */
export function fichesCurees(entree: ConflitSourcesDeclare): readonly string[] {
  const brut = (entree as ConflitSourcesDeclare & { fichesUsage?: unknown }).fichesUsage;
  if (!Array.isArray(brut)) return [];
  if (!brut.every(f => typeof f === 'string' && FICHE_ID_RE.test(f))) return [];
  return brut as string[];
}

/** Les deux claims du conflit, en `identifiant@version`. */
export function claimsDuConflit(entree: ConflitSourcesDeclare): readonly [string, string] {
  const [a, b] = entree.claims;
  return [`${a.claimId}@${a.versionClaim}`, `${b.claimId}@${b.versionClaim}`];
}

export function empreinteEntreeConflit(entree: ConflitSourcesDeclare): string {
  return createHash('sha256').update(JSON.stringify(entree), 'utf8').digest('hex');
}
