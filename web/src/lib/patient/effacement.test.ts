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
    'auditSynthese', 'bookletEnvoi', 'protocolCheckin', 'protocolDiffusionApproval',
    'protocolDraft', 'assessmentEpisode', 'syntheseIA', 'questionnaireReponse',
    'assignation', 'consultation', 'trustAcknowledgement', 'trustChoiceEvent',
    'trustAdverseEffectReport', 'trustPrivacyIncident', 'trustRightsRequest',
    'filCardRejection', 'relectureNote', 'portailMagicLink',
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
