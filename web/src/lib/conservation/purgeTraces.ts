import { prisma } from '@/lib/prisma';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { debutRetentionJournalAcces } from '@/lib/praticien/journalAcces';
import { debutRetentionConnexionsGoogle } from '@/lib/portail/googleIdentite';
import { debutRetentionTentatives } from '@/lib/portail/lienMagique';

// LES TRACES ÉCHUES, PURGÉES SANS ATTENDRE LE TRAFIC ([[D-451]], Q1).
//
// Trois tables ne se purgeaient qu'à l'écriture d'une ligne neuve (purge
// opportuniste) : le journal des accès praticien (12 mois), les connexions
// Google (12 mois), les tentatives de demande de lien (24 h). Sans nouvel
// accès, nouvelle connexion ni nouvelle demande, les lignes échues restaient.
// Ce module les purge à chaque passage du cron horaire
// (`scripts/purgeComptesRendusEcheance.ts`, `web/cron.json`). La purge à
// l'écriture reste : elle n'est plus seule.
//
// LES DURÉES NE CHANGENT PAS : chaque table garde sa fenêtre et son seuil
// (`debutRetention…`), ceux de sa purge à l'écriture — même horloge, celle du
// processus, comme à l'écriture.
//
// UNE PANNE N'EMPORTE QU'ELLE : chaque table à part ; l'échec est compté et
// journalisé par sa classe et son code, jamais par son message.

export type BilanTraces = {
  journalAcces: number;
  connexionsGoogle: number;
  tentativesLien: number;
  echecs: number;
};

export async function purgerTracesEchues(maintenant: Date = new Date()): Promise<BilanTraces> {
  const bilan: BilanTraces = { journalAcces: 0, connexionsGoogle: 0, tentativesLien: 0, echecs: 0 };
  const purges: Array<[Exclude<keyof BilanTraces, 'echecs'>, () => Promise<{ count: number }>]> = [
    ['journalAcces', () => prisma.journalAccesDossier.deleteMany({
      where: { creeLe: { lt: debutRetentionJournalAcces(maintenant) } },
    })],
    ['connexionsGoogle', () => prisma.portailConnexionGoogle.deleteMany({
      where: { creeLe: { lt: debutRetentionConnexionsGoogle(maintenant) } },
    })],
    ['tentativesLien', () => prisma.portailDemandeTentative.deleteMany({
      where: { creeLe: { lt: debutRetentionTentatives(maintenant) } },
    })],
  ];
  for (const [table, purger] of purges) {
    try {
      bilan[table] = (await purger()).count;
    } catch (err) {
      bilan.echecs += 1;
      console.error(`[purge traces] ${table} :`, ...classeEtCode(err));
    }
  }
  return bilan;
}
