import { prisma } from '@/lib/prisma';
import {
  ORIGINE_PATIENT,
  creerJeton,
  debutFenetreDemandes,
  empreinteJeton,
  expirationDepuis,
  plafondAtteint,
} from '@/lib/portail/lienMagique';

// L'ÉMISSION D'UN LIEN SUR DEMANDE DU PATIENT — la transaction de
// `api/portail/lien/demande`, sortie de la route pour que le banc à deux
// sessions joue le VRAI écrivain (`scripts/banc-naissance-lien-deux-sessions.test.ts`).
//
// Cadence bornée EN BASE, pas en mémoire de processus : plusieurs conteneurs
// peuvent répondre (Scalingo scale horizontalement), et un compteur local ne
// bornerait rien.
//
// Comptage et création partagent une TRANSACTION sous verrou consultatif par
// patient (revue de sécurité du 2026-08-22, constat M) : séparés, des demandes
// concurrentes observaient toutes un compteur sous le plafond avant qu'aucune
// n'ait créé son lien, et le franchissaient ensemble. Le verrou
// `pg_advisory_xact_lock` se relâche seul au COMMIT/ROLLBACK ; un échec de la
// transaction ne crée rien et n'envoie rien — fail-closed.
//
// L'ÉLIGIBILITÉ SE RELIT SOUS VERROU DE LIGNE (t16, écart résiduel n° 3 de
// [[D-126]]). La route lit `actif` et `accessTokenRevoked` AVANT la
// transaction ; sous contention du verrou consultatif, une désactivation ou une
// révocation pouvait commettre entre cette lecture et la création — elle
// fermait les liens en vol, mais pas celui qui naissait après elle, et ce lien
// redevenait utile si le dossier était réactivé sous 24 h. Le `FOR SHARE` sur la
// ligne du dossier sérialise contre les deux gestes, qui écrivent cette ligne
// en premier (`api/praticien/patients` PATCH, `api/praticien/token` DELETE) :
//   - geste d'abord : la relecture attend son COMMIT, puis lit le dossier fermé
//     (READ COMMITTED relit la dernière version) — aucun lien ne naît ;
//   - demande d'abord : le geste attend ce COMMIT, puis son `updateMany` (nouvel
//     instantané) voit le lien neuf et le ferme.
// Ordre des verrous : consultatif, puis ligne du dossier. Aucun des deux gestes
// ne prend le consultatif : pas d'interblocage.

export type IssueEmissionSurDemande =
  | { jeton: string }
  | { refus: 'plafond' | 'dossier_ferme' };

type LigneEligibilite = { actif: boolean; access_token_revoked: boolean };

export async function emettreLienSurDemande(idPatient: string, maintenant: Date): Promise<IssueEmissionSurDemande> {
  return prisma.$transaction(async (tx) => {
    // Forme à DEUX arguments : la classe 74 sépare cet espace de clés de
    // celui, mono-clé, des imports (`hashtext($1)` nu dans importNabm /
    // importCiqual) — et `hashtext` est la fonction que ces imports ont
    // déjà éprouvée sur cette base (revue adversariale, constats M1/L6 ;
    // résolution constatée en one-off le 2026-08-22).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(74, hashtext(${idPatient}))`;
    const [ligne] = await tx.$queryRaw<LigneEligibilite[]>`
      SELECT actif, access_token_revoked FROM patients WHERE id_patient = ${idPatient} FOR SHARE`;
    if (!ligne || !ligne.actif || ligne.access_token_revoked) return { refus: 'dossier_ferme' as const };
    const demandesRecentes = await tx.portailMagicLink.count({
      where: {
        idPatient,
        creePar: ORIGINE_PATIENT,
        creeLe: { gte: debutFenetreDemandes(maintenant) },
      },
    });
    if (plafondAtteint(demandesRecentes)) return { refus: 'plafond' as const };
    const neuf = creerJeton();
    await tx.portailMagicLink.create({
      data: {
        idPatient,
        jetonEmpreinte: empreinteJeton(neuf),
        expireLe: expirationDepuis(maintenant),
        creePar: ORIGINE_PATIENT,
      },
    });
    return { jeton: neuf };
  });
}
