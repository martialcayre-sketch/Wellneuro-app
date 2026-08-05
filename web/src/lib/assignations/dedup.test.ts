import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@/generated/prisma';

import {
  MESSAGE_DEJA_ASSIGNE,
  STATUTS_ASSIGNATION_TERMINAL,
  qidsDejaOuverts,
  verrouillerPatient,
} from './dedup';

function clientMock(findManyResult: { idQuestionnaire: string }[] = []) {
  return {
    assignation: { findMany: vi.fn().mockResolvedValue(findManyResult) },
    $queryRaw: vi.fn(),
  };
}

describe('qidsDejaOuverts', () => {
  it('rend l’ensemble des qids portés par une assignation ouverte', async () => {
    const client = clientMock([{ idQuestionnaire: 'Q_NEU_03' }]);
    const ouverts = await qidsDejaOuverts(
      client as unknown as Prisma.TransactionClient,
      'PAT_TEST',
      ['Q_NEU_03', 'Q_SOM_06'],
    );
    expect([...ouverts]).toEqual(['Q_NEU_03']);
  });

  // Fail-closed : la liste est une exclusion des terminaux, pas une liste
  // blanche d'ouverts — un statut inconnu (import legacy, statut futur) BLOQUE
  // le doublon au lieu de le laisser passer en silence.
  it('filtre par exclusion des statuts terminaux, jamais par liste blanche', async () => {
    const client = clientMock();
    await qidsDejaOuverts(
      client as unknown as Prisma.TransactionClient,
      'PAT_TEST',
      ['Q_NEU_03'],
    );
    const where = client.assignation.findMany.mock.calls[0][0].where as {
      statut: { notIn: string[] };
    };
    expect(where.statut).toEqual({ notIn: [...STATUTS_ASSIGNATION_TERMINAL] });
    expect(STATUTS_ASSIGNATION_TERMINAL).toEqual(['Complété', 'Annulée']);
  });

  it('ne requête rien sur une liste vide', async () => {
    const client = clientMock();
    const ouverts = await qidsDejaOuverts(
      client as unknown as Prisma.TransactionClient,
      'PAT_TEST',
      [],
    );
    expect(ouverts.size).toBe(0);
    expect(client.assignation.findMany).not.toHaveBeenCalled();
  });
});

describe('verrouillerPatient', () => {
  it('lève quand la ligne patient n’existe pas — un FOR UPDATE sans ligne ne verrouille rien', async () => {
    const client = clientMock();
    client.$queryRaw.mockResolvedValue([]);
    await expect(
      verrouillerPatient(client as unknown as Prisma.TransactionClient, 'PAT_ABSENT'),
    ).rejects.toThrow('Verrou patient impossible');
  });

  it('passe quand exactement une ligne est verrouillée', async () => {
    const client = clientMock();
    client.$queryRaw.mockResolvedValue([{ id: 1 }]);
    await expect(
      verrouillerPatient(client as unknown as Prisma.TransactionClient, 'PAT_TEST'),
    ).resolves.toBeUndefined();
  });
});

describe('MESSAGE_DEJA_ASSIGNE', () => {
  // « Un geste proposé doit être possible » : le refus nomme la sortie
  // réellement disponible (annuler puis réassigner) — il n'existe aucune
  // route de renvoi d'e-mail pour une assignation.
  it('nomme le geste possible, pas seulement l’état', () => {
    expect(MESSAGE_DEJA_ASSIGNE).toContain('annulez');
    expect(MESSAGE_DEJA_ASSIGNE).toContain('réassignez');
  });
});
