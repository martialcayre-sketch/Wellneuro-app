import { prisma } from '@/lib/prisma';
import { cleVerrouCompteRendu, PEREMPTION_EN_COURS_MS } from './verrou';

// RETRAIT D'UN DÉPÔT ERRONÉ (BIO-INGEST LOT-02, arbitrage du 2026-10-01) — le
// compte rendu déposé dans le mauvais dossier. SECOND auteur de suppression
// du staging, admis nommément par `staging.guard.test.ts` (le premier est
// l'effacement du dossier).
//
// TANT QU'AUCUNE LIGNE N'EST VALIDÉE. Une ligne validée désigne un résultat
// entré au dossier : supprimer sa provenance effacerait d'où vient ce
// résultat (A5). Le retrait est alors refusé ; la purge après validation
// attend l'arbitrage de la rubrique 8 du dossier RGPD, et une migration.
//
// Sous le verrou du compte rendu, que prennent aussi les décisions : une
// validation ne peut pas se glisser entre la vérification et la suppression.
// Et la suppression des lignes ne vise que les non validées — si l'une
// l'était malgré tout, la FK RESTRICT de l'import ferait échouer la
// transaction entière, sans résidu.

export type IssueRetrait =
  | { ok: true }
  | { ok: false; reason: 'compte_rendu_introuvable' | 'ligne_validee' | 'extraction_en_cours' };

export const MESSAGES_RETRAIT: Record<string, string> = {
  compte_rendu_introuvable: 'Ce compte rendu est introuvable dans ce dossier.',
  ligne_validee:
    'Une ligne de ce compte rendu a déjà été validée : il n’est plus retirable.',
  extraction_en_cours: 'Une extraction est en cours sur ce compte rendu : réessayez dans quelques minutes.',
};

export async function retirerCompteRendu(params: {
  idPatient: string;
  idCompteRendu: string;
  maintenant?: Date;
}): Promise<IssueRetrait> {
  const { idPatient, idCompteRendu } = params;
  const maintenant = params.maintenant ?? new Date();
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(idCompteRendu)}))`;
    const compteRendu = await tx.compteRenduBiologique.findFirst({
      where: { id: idCompteRendu, idPatient },
      select: { id: true },
    });
    if (!compteRendu) return { ok: false as const, reason: 'compte_rendu_introuvable' as const };

    const validees = await tx.ligneBiologiqueCandidate.count({
      where: { idPatient, statut: 'validee', import: { idCompteRendu } },
    });
    if (validees > 0) return { ok: false as const, reason: 'ligne_validee' as const };

    const limite = new Date(maintenant.getTime() - PEREMPTION_EN_COURS_MS);
    const enCours = await tx.importBiologique.count({
      where: { idCompteRendu, idPatient, statut: 'en_cours', lanceLe: { gte: limite } },
    });
    if (enCours > 0) return { ok: false as const, reason: 'extraction_en_cours' as const };

    // L'ordre des FK RESTRICT : lignes, puis imports, puis le document.
    await tx.ligneBiologiqueCandidate.deleteMany({
      where: { idPatient, statut: { not: 'validee' }, import: { idCompteRendu } },
    });
    await tx.importBiologique.deleteMany({ where: { idCompteRendu, idPatient } });
    await tx.compteRenduBiologique.delete({ where: { id: idCompteRendu } });
    return { ok: true as const };
  }, { timeout: 20_000 });
}
