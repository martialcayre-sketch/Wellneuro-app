import { prisma } from '@/lib/prisma';
import { residuEffacement } from './cycleDeVie';

// Effacement d'un dossier patient — campagne IDP2, LOT-01a.
//
// L'application PROMET l'effacement au patient
// (`lib/trust/contenus/registre.ts`) et le canal de demande existe depuis TRUST
// (`api/portail/trust/signalement`, type `effacement`). Jusqu'ici rien ne
// l'exécutait : le seul bouton nommé « suppression » écrivait `actif: false`.
//
// TOUT OU RIEN. La suppression et l'écriture du résidu se font dans une seule
// transaction : un effacement à moitié fait laisserait des lignes orphelines
// portant encore de la donnée patient, ce qui est exactement ce qu'on vient
// détruire.
//
// LE PIÈGE, ET LA RAISON DE L'ORDRE EXPLICITE : `audit_syntheses` et
// `booklet_envois` portent un `id_patient` SANS clé étrangère vers `patients`
// — ils référencent `SyntheseIA`. Une suppression qui se fierait aux seules
// contraintes les laisserait en place, avec l'identifiant du patient et, pour
// `booklet_envois`, une adresse e-mail masquée. Ils sont donc supprimés
// nommément, par `id_patient`, avant tout le reste.

export type ResultatEffacement = {
  /** Nombre de lignes supprimées, par table. Aucune donnée patient. */
  supprimees: Record<string, number>;
  residu: { anneeNaissance: number | null; initialesNom: string };
};

/**
 * Efface définitivement un dossier et tout ce qui s'y rattache.
 *
 * Ne vérifie NI l'authentification NI l'appartenance : c'est le rôle de la
 * route appelante, qui dispose de la session. Cette fonction ne fait qu'une
 * chose, et la fait entièrement.
 *
 * @throws si le patient n'existe pas — la transaction est alors annulée.
 */
export async function effacerDossier(idPatient: string): Promise<ResultatEffacement> {
  return prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findUnique({
      where: { idPatient },
      select: { nom: true, dateNaissance: true },
    });
    if (!patient) throw new Error(`Dossier introuvable : ${idPatient}`);

    // Le résidu est calculé AVANT toute suppression : après, la matière a
    // disparu. Il ne retient que l'année et trois lettres — ni prénom, ni
    // e-mail, ni identifiant (voir `cycleDeVie.residuEffacement`).
    const residu = residuEffacement(patient);

    const supprimees: Record<string, number> = {};
    const par = { idPatient };

    // 1. Les deux tables SANS clé étrangère vers `patients`. En premier, parce
    //    que rien dans la base ne les protégerait d'un oubli.
    supprimees.auditSyntheses = (await tx.auditSynthese.deleteMany({ where: par })).count;
    supprimees.bookletEnvois = (await tx.bookletEnvoi.deleteMany({ where: par })).count;

    // 2. Petits-enfants : ce qui dépend d'un brouillon de protocole.
    supprimees.protocolCheckins = (await tx.protocolCheckin.deleteMany({ where: par })).count;
    supprimees.protocolDiffusionApprovals = (
      await tx.protocolDiffusionApproval.deleteMany({ where: par })
    ).count;
    supprimees.protocolDrafts = (await tx.protocolDraft.deleteMany({ where: par })).count;
    supprimees.assessmentEpisodes = (await tx.assessmentEpisode.deleteMany({ where: par })).count;

    // 3. Enfants directs.
    supprimees.synthesesIA = (await tx.syntheseIA.deleteMany({ where: par })).count;
    supprimees.questionnaireReponses = (await tx.questionnaireReponse.deleteMany({ where: par })).count;
    supprimees.assignations = (await tx.assignation.deleteMany({ where: par })).count;
    supprimees.consultations = (await tx.consultation.deleteMany({ where: par })).count;

    // 4. Le dossier TRUST du patient — y compris la demande d'effacement
    //    elle-même, supprimée par son propre traitement. La ligne
    //    `dossiers_effaces` écrite plus bas en devient l'unique trace.
    supprimees.trustAcknowledgements = (await tx.trustAcknowledgement.deleteMany({ where: par })).count;
    supprimees.trustChoiceEvents = (await tx.trustChoiceEvent.deleteMany({ where: par })).count;
    supprimees.trustAdverseEffectReports = (
      await tx.trustAdverseEffectReport.deleteMany({ where: par })
    ).count;
    supprimees.trustPrivacyIncidents = (await tx.trustPrivacyIncident.deleteMany({ where: par })).count;
    supprimees.trustRightsRequests = (await tx.trustRightsRequest.deleteMany({ where: par })).count;

    // 5. Le reste, dont les liens magiques — en `onDelete: Restrict`, ils
    //    feraient échouer la suppression du patient s'ils subsistaient.
    supprimees.filCardRejections = (await tx.filCardRejection.deleteMany({ where: par })).count;
    supprimees.relectureNotes = (await tx.relectureNote.deleteMany({ where: par })).count;
    supprimees.portailMagicLinks = (await tx.portailMagicLink.deleteMany({ where: par })).count;
    supprimees.packPropositions = (await tx.packProposition.deleteMany({ where: par })).count;

    // 6. Le dossier lui-même. Toute contrainte oubliée échoue ICI, bruyamment,
    //    et annule l'ensemble — un effacement partiel serait pire que rien.
    supprimees.patient = (await tx.patient.deleteMany({ where: par })).count;

    await tx.dossierEfface.create({ data: residu });

    return { supprimees, residu };
  });
}
