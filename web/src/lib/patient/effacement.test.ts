import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Toutes les tables filles sont appelées via `tx.<modele>.deleteMany` : on
// capture l'ordre exact des appels, qui est la garantie du lot.
const { prisma, appels } = vi.hoisted(() => {
  const appels: string[] = [];
  const modele = (nom: string) => ({
    deleteMany: vi.fn(async () => {
      appels.push(nom);
      return { count: 1 };
    }),
  });
  const tx: Record<string, unknown> = {
    patient: {
      findUnique: vi.fn(async () => ({ nom: 'Dogné', dateNaissance: '1975-03-12' })),
      deleteMany: vi.fn(async () => {
        appels.push('patient');
        return { count: 1 };
      }),
    },
    dossierEfface: { create: vi.fn(async () => ({})) },
  };
  for (const nom of [
    'auditSynthese', 'bookletEnvoi', 'protocolCheckin', 'ficheAssietteRemise', 'lettreAdressageRemise', 'protocolDiffusionApproval',
    'arbitrageBiologique', 'panelBiologieDocumente',
    'protocolDraft', 'assessmentEpisode', 'decisionPrioritySelection',
    'ecartementProposition',
    'critereDossierConstate',
    'adressageSignalAlerte',
    'syntheseIA', 'questionnaireReponse',
    'questionnaireLecturePraticien', 'assignation', 'consultation', 'trustAcknowledgement',
    'trustChoiceEvent', 'trustAdverseEffectReport', 'trustPrivacyIncident',
    'trustRightsRequest', 'filCardRejection', 'filCardLecture',
    'portailLecturePatient',
    'relectureNote', 'portailMagicLink',
    'packProposition', 'envoiBrouillon', 'portailConnexionGoogle',
    'correspondanceMedecin', 'correspondancePatient', 'documentPatientBiologie',
    'lectureImportBiologique',
    'ligneBiologiqueCandidate', 'importBiologique', 'compteRenduBiologique',
    'resultatBiologique',
    'rendezVous', 'journalAccesDossier',
    'agendaSommeilNuit', 'agendaAlimentaireJour',
    'objectifNegocie', 'entreeCeQuiCompte', 'syntheseComprehension',
    'desaccordComprehension', 'ratificationObjectif',
    'propositionObjectif', 'dispositionProposition', 'amendementObjectif',
    'reponseJalonObjectif', 'finObjectif', 'accordAtteste',
    // `D-167` §11 — les propositions de priorité assistées par IA.
    'propositionPrioriteIA',
    // Les propositions de résumé global assistées par IA (2026-09-11).
    'propositionComprehensionIA',
    // La demande de correction de l'objectif (2026-09-11).
    'demandeCorrectionObjectif',
  ]) {
    tx[nom] = modele(nom);
  }
  const client = { ...tx, $transaction: vi.fn(async (f: (t: unknown) => unknown) => f(tx)) };
  return { appels, prisma: client as typeof client & Record<string, { create: unknown; deleteMany: unknown; findUnique: unknown }> };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import { effacerDossier } from './effacement';

beforeEach(() => {
  appels.length = 0;
  vi.clearAllMocks();
});

describe('effacerDossier', () => {
  it('supprime le dossier en dernier, après tout ce qui en dépend', async () => {
    await effacerDossier('PAT_SEED_03');
    expect(appels[appels.length - 1]).toBe('patient');
    // Les liens magiques sont en `onDelete: Restrict` : s'ils passaient après,
    // la suppression du patient échouerait.
    expect(appels.indexOf('portailMagicLink')).toBeLessThan(appels.indexOf('patient'));
    // Les brouillons de protocole portent leurs propres enfants.
    expect(appels.indexOf('protocolCheckin')).toBeLessThan(appels.indexOf('protocolDraft'));
    expect(appels.indexOf('protocolDraft')).toBeLessThan(appels.indexOf('assessmentEpisode'));
  });

  // LE piège du lot : ces deux tables portent `id_patient` SANS clé étrangère
  // vers `patients`. Aucune contrainte ne les protège d'un oubli — et
  // `booklet_envois` contient une adresse e-mail masquée.
  it('supprime aussi les deux tables sans clé étrangère vers le patient', async () => {
    await effacerDossier('PAT_SEED_03');
    expect(appels).toContain('auditSynthese');
    expect(appels).toContain('bookletEnvoi');
  });

  it('supprime les accusés de lecture questionnaires avant les réponses', async () => {
    await effacerDossier('PAT_SEED_03');
    expect(appels).toContain('questionnaireLecturePraticien');
    expect(appels.indexOf('questionnaireLecturePraticien')).toBeLessThan(appels.indexOf('questionnaireReponse'));
  });

  // Même exposition pour les journaux d'accès (G5, G-TRUST-04) : sans clé
  // étrangère, seul cet appel nommé les efface. L'assertion est
  // comportementale — la garde structurelle plus bas, elle, est textuelle.
  it('supprime les journaux d’accès qui nomment le dossier', async () => {
    await effacerDossier('PAT_SEED_03');
    expect(appels).toContain('portailConnexionGoogle');
    expect(appels).toContain('journalAccesDossier');
  });

  it('supprime le journal de correspondance patient avec le dossier', async () => {
    await effacerDossier('PAT_SEED_03');
    expect(appels).toContain('correspondancePatient');
    expect(appels.indexOf('correspondancePatient')).toBeLessThan(appels.indexOf('patient'));
  });

  // Écartements de propositions d'orientation : FK RESTRICT vers `patients`
  // seule, donc l'ordre relatif aux autres tables est libre — ce test ne garde
  // qu'une chose, et c'est la seule qui casse en production : la ligne doit
  // passer AVANT la suppression du dossier. Le garde structurel plus bas est un
  // `source.includes` : il attrape la ligne retirée, il est aveugle à la ligne
  // DÉPLACÉE.
  it('supprime les écartements de propositions avant le dossier', async () => {
    await effacerDossier('PAT_SEED_03');
    expect(appels).toContain('ecartementProposition');
    expect(appels.indexOf('ecartementProposition')).toBeLessThan(appels.indexOf('patient'));
  });

  // Nuits d'agenda du sommeil : FK RESTRICT vers patients ET assignations. Si
  // elles passaient après les assignations, la contrainte ferait échouer tout
  // l'effacement.
  it('supprime les nuits d’agenda du sommeil avant les assignations', async () => {
    await effacerDossier('PAT_SEED_03');
    expect(appels).toContain('agendaSommeilNuit');
    expect(appels.indexOf('agendaSommeilNuit')).toBeLessThan(appels.indexOf('assignation'));
  });

  // Journées d'agenda alimentaire : même FK RESTRICT, donc même exigence.
  //
  // CE TEST GARDE LA POSITION, ET RIEN D'AUTRE NE LE FAIT. Le garde structurel
  // plus bas est un `source.includes('tx.agendaAlimentaireJour.deleteMany')` :
  // il attrape la ligne RETIRÉE, il est aveugle à la ligne DÉPLACÉE. Or c'est
  // le déplacement qui casse en production — un futur lot réordonnant le bloc
  // « petits-enfants » ferait lever `effacerDossier` sur la contrainte, la
  // transaction serait annulée, et l'effacement RGPD deviendrait IMPOSSIBLE
  // pour tout dossier portant une journée d'agenda. Sans ce test, aucune suite
  // ne rougirait ; le défaut se découvrirait sur la demande d'effacement d'un
  // patient, avec un message qui ne désigne pas le coupable.
  it('supprime les journées d’agenda alimentaire avant les assignations', async () => {
    await effacerDossier('PAT_SEED_03');
    expect(appels).toContain('agendaAlimentaireJour');
    expect(appels.indexOf('agendaAlimentaireJour')).toBeLessThan(appels.indexOf('assignation'));
  });

  // Fiches d'assiette remises (D-251, M2) : FK RESTRICT vers patients ET vers
  // l'approbation de diffusion qui les a remises. Même lecture que l'agenda
  // alimentaire : le garde structurel attrape la ligne retirée, ce test-ci la
  // ligne DÉPLACÉE après les approbations — qui rendrait l'effacement
  // impossible pour tout dossier ayant reçu une fiche.
  it('supprime les fiches d’assiette remises avant les approbations de diffusion', async () => {
    await effacerDossier('PAT_SEED_03');
    expect(appels).toContain('ficheAssietteRemise');
    expect(appels.indexOf('ficheAssietteRemise')).toBeLessThan(appels.indexOf('protocolDiffusionApproval'));
  });

  // Lettres d'adressage remises (D-262, LOT-01) : FK RESTRICT vers patients,
  // vers l'approbation de diffusion ET vers la lettre consignée. Déplacée
  // après l'une ou l'autre, elle rendrait l'effacement impossible pour tout
  // dossier qui a reçu sa lettre.
  it('supprime les lettres d’adressage remises avant les approbations et les correspondances', async () => {
    await effacerDossier('PAT_SEED_03');
    expect(appels).toContain('lettreAdressageRemise');
    expect(appels.indexOf('lettreAdressageRemise')).toBeLessThan(appels.indexOf('protocolDiffusionApproval'));
    expect(appels.indexOf('lettreAdressageRemise')).toBeLessThan(appels.indexOf('correspondanceMedecin'));
  });

  // Staging d'import biologique (D-256, LOT-02) : la ligne validée retient son
  // résultat, l'import retient ses lignes, le compte rendu ses imports — tout
  // en FK RESTRICT. Une ligne déplacée rendrait l'effacement impossible pour
  // tout dossier où un compte rendu a été déposé.
  it('supprime le staging biologique dans l’ordre de ses clés, avant les résultats', async () => {
    await effacerDossier('PAT_SEED_03');
    const rang = (nom: string) => appels.indexOf(nom);
    expect(rang('ligneBiologiqueCandidate')).toBeGreaterThanOrEqual(0);
    expect(rang('ligneBiologiqueCandidate')).toBeLessThan(rang('importBiologique'));
    expect(rang('importBiologique')).toBeLessThan(rang('compteRenduBiologique'));
    expect(rang('ligneBiologiqueCandidate')).toBeLessThan(rang('resultatBiologique'));
  });

  // Adressages sur signal d'alerte (D-257, LOT-02) : FK RESTRICT vers la
  // consultation porteuse et la lettre d'adressage. Une ligne déplacée après
  // l'une ou l'autre rendrait l'effacement impossible pour tout dossier
  // adressé.
  it('supprime les adressages sur signal d’alerte avant les consultations et les lettres', async () => {
    await effacerDossier('PAT_SEED_03');
    const rang = (nom: string) => appels.indexOf(nom);
    expect(rang('adressageSignalAlerte')).toBeGreaterThanOrEqual(0);
    expect(rang('adressageSignalAlerte')).toBeLessThan(rang('consultation'));
    expect(rang('adressageSignalAlerte')).toBeLessThan(rang('correspondanceMedecin'));
  });

  // Actes de lecture d'un import validé (D-268, BP-10) : FK RESTRICT vers
  // l'import. Une ligne déplacée après lui rendrait l'effacement impossible
  // pour tout dossier dont un import a été lu.
  it('supprime les actes de lecture biologique avant les imports', async () => {
    await effacerDossier('PAT_SEED_03');
    const rang = (nom: string) => appels.indexOf(nom);
    expect(rang('lectureImportBiologique')).toBeGreaterThanOrEqual(0);
    expect(rang('lectureImportBiologique')).toBeLessThan(rang('importBiologique'));
  });

  it('tout passe par une seule transaction', async () => {
    await effacerDossier('PAT_SEED_03');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('le résidu est écrit, et ne contient ni prénom ni adresse', async () => {
    const resultat = await effacerDossier('PAT_SEED_03');
    const data = (prisma.dossierEfface.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(data).toEqual({ anneeNaissance: 1975, initialesNom: 'DOG' });
    expect(JSON.stringify(data)).not.toContain('@');
    expect(resultat.residu.initialesNom).toBe('DOG');
  });

  it('un dossier introuvable échoue, et n’écrit aucun résidu', async () => {
    (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    await expect(effacerDossier('PAT_INEXISTANT')).rejects.toThrow(/introuvable/i);
    expect(prisma.dossierEfface.create).not.toHaveBeenCalled();
  });

  // Le seul coût nommé de la migration `panels_biologie_documentes` (D-071
  // §3) : entre le déploiement Vercel et l'approbation `release-db`, la table
  // n'existe pas encore et ce `deleteMany` lève (42P01 → P2021). La promesse
  // écrite au schéma est que l'échec est FERMÉ. Ce banc la vérifie au lieu de
  // la croire — sans lui, « rien de supprimé à moitié » reste une affirmation.
  it('une table absente fait échouer l’effacement en entier, sans résidu', async () => {
    (prisma.panelBiologieDocumente.deleteMany as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('The table `public.panels_biologie_documentes` does not exist'));
    await expect(effacerDossier('PAT_SEED_03')).rejects.toThrow(/does not exist/i);
    expect(prisma.dossierEfface.create).not.toHaveBeenCalled();
  });
});

// Garde structurelle. Le risque réel n'est pas de se tromper aujourd'hui : c'est
// qu'une campagne future ajoute une table portant `id_patient` et que
// l'effacement l'ignore en silence — laissant de la donnée patient derrière un
// dossier « effacé ». Cette liste se dérive du schéma, pas d'une mémoire.
describe('complétude vis-à-vis du schéma', () => {
  it('toute table portant id_patient est effacée', async () => {
    const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    const source = readFileSync(join(process.cwd(), 'src/lib/patient/effacement.ts'), 'utf8');

    const attendus = new Set<string>();
    let modeleCourant = '';
    for (const ligne of schema.split('\n')) {
      const debut = ligne.match(/^model\s+(\w+)\s*\{/);
      if (debut) modeleCourant = debut[1];
      if (/@map\("id_patient"\)/.test(ligne) && modeleCourant && modeleCourant !== 'Patient') {
        attendus.add(modeleCourant[0].toLowerCase() + modeleCourant.slice(1));
      }
    }

    // Le schéma doit rester la source : si l'extraction ne trouve plus rien,
    // c'est la garde qui est cassée, pas le code qui est devenu parfait.
    expect(attendus.size).toBeGreaterThan(10);

    const oublies = [...attendus].filter((modele) => !source.includes(`tx.${modele}.deleteMany`));
    expect(oublies, `tables liées au patient non effacées : ${oublies.join(', ')}`).toEqual([]);
  });
});
