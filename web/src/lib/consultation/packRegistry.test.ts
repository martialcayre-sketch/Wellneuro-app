import { beforeEach, describe, expect, it, vi } from 'vitest';

// LOT-03 (dette 4) — le garde qui ferme le GÉNÉRATEUR de la dérive registre/packs.
//
// Jusqu'au 2026-08-08, `syncPackToRegistry` ignorait silencieusement tout qid
// sans `QuestionnaireDefinition`. C'est le mécanisme qui a produit la dérive du
// 2026-08-05 : le pack de base portait `Q_SOM_09`, dont la ligne de définition
// n'a été créée que le 2026-08-06 14:59 — le miroir ne POUVAIT pas le porter.
//
// Ce banc éprouve le PRÉDICAT et l'ÉCRITURE : lever, mais aussi ne RIEN écrire
// quand on lève. Un garde qui refuse après avoir purgé `pack_questionnaires`
// aurait remplacé une dérive par un miroir vide.

// `packRegistry.ts` importe `@/lib/prisma` au chargement du module ; il n'est
// pas utilisé par `syncPackToRegistry` (qui reçoit son `tx`), mais l'import doit
// être neutralisé pour ne pas ouvrir de connexion.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { QidsSansDefinitionError, syncPackToRegistry } from './packRegistry';

type Definition = { id: string; questionnaireId: string };

const upsert = vi.fn();
const findMany = vi.fn();
const deleteMany = vi.fn();
const createMany = vi.fn();

// Reproduit la surface de `Prisma.TransactionClient` réellement touchée. Le
// `as never` borne le mensonge de typage à ce seul point.
const tx = {
  questionnairePack: { upsert },
  questionnaireDefinition: { findMany },
  questionnairePackQuestionnaire: { deleteMany, createMany },
} as never;

function definitions(...qids: string[]): Definition[] {
  return qids.map(qid => ({ id: `def_${qid}`, questionnaireId: qid }));
}

function pack(qids: string[], idPack = 'PACK_TEST') {
  return { idPack, nom: 'Pack de banc', description: null, actif: true, qids };
}

describe('syncPackToRegistry — un qid sans définition fait ÉCHOUER la synchro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue({ id: 'registre_1' });
    deleteMany.mockResolvedValue({ count: 0 });
    createMany.mockResolvedValue({ count: 0 });
  });

  it('lève, en nommant les qids manquants et le pack', async () => {
    findMany.mockResolvedValue(definitions('Q_STR_01'));

    await expect(syncPackToRegistry(tx, pack(['Q_STR_01', 'Q_SOM_09', 'Q_ALI_09']))).rejects.toThrow(
      QidsSansDefinitionError,
    );

    // Le message porte les DEUX manquants et le pack : sans eux, le refus
    // remonté à l'écran ne dit pas quoi retirer.
    await expect(syncPackToRegistry(tx, pack(['Q_STR_01', 'Q_SOM_09', 'Q_ALI_09']))).rejects.toThrow(
      /PACK_TEST.*Q_SOM_09.*Q_ALI_09/,
    );
  });

  it('n’écrit RIEN quand il lève — ni purge, ni recréation', async () => {
    findMany.mockResolvedValue(definitions('Q_STR_01'));

    await expect(syncPackToRegistry(tx, pack(['Q_STR_01', 'Q_SOM_09']))).rejects.toThrow(QidsSansDefinitionError);

    // L'ordre compte : le refus se pose AVANT `deleteMany`. Posé après, il
    // laisserait le miroir vidé — pire que la dérive qu'il prétend empêcher.
    expect(deleteMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it('porte la liste des manquants sur l’erreur, pas seulement dans son texte', async () => {
    findMany.mockResolvedValue(definitions('Q_STR_01'));

    const erreur = await syncPackToRegistry(tx, pack(['Q_STR_01', 'Q_SOM_09'])).catch(e => e);

    expect(erreur).toBeInstanceOf(QidsSansDefinitionError);
    expect((erreur as QidsSansDefinitionError).qids).toEqual(['Q_SOM_09']);
    expect((erreur as QidsSansDefinitionError).idPack).toBe('PACK_TEST');
  });

  // CONTRÔLE NÉGATIF. Sans lui, un `throw` inconditionnel passerait tout ce
  // fichier en vert et casserait toute sauvegarde de pack en production.
  it('ne lève PAS quand toutes les définitions existent, et écrit le miroir', async () => {
    findMany.mockResolvedValue(definitions('Q_STR_01', 'Q_STR_02'));

    await expect(syncPackToRegistry(tx, pack(['Q_STR_01', 'Q_STR_02']))).resolves.toBeUndefined();

    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0].data).toEqual([
      { packId: 'registre_1', questionnaireId: 'def_Q_STR_01', ordre: 0 },
      { packId: 'registre_1', questionnaireId: 'def_Q_STR_02', ordre: 1 },
    ]);
  });

  // Le prédicat se lit sur l'ENSEMBLE des qids. Écrit en
  // `items.length !== pack.qids.length`, il rendrait un FAUX POSITIF ici — le
  // backfill relit `packs.qids` tel quel, doublons compris, et une sauvegarde
  // parfaitement saine serait refusée.
  //
  // ET LA CHARGE EST DÉDUPLIQUÉE : `pack_questionnaires` porte
  // `@@unique([packId, questionnaireId])`. Deux lignes identiques feraient
  // échouer `createMany` en P2002 — un mock qui n'assère que « ça n'a pas levé »
  // déclarerait saine une sauvegarde que la base refuse.
  it('un doublon dans pack.qids ne déclenche pas le refus, et n’insère qu’une ligne', async () => {
    findMany.mockResolvedValue(definitions('Q_STR_01', 'Q_STR_02'));

    await expect(syncPackToRegistry(tx, pack(['Q_STR_01', 'Q_STR_01', 'Q_STR_02']))).resolves.toBeUndefined();

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0].data).toEqual([
      { packId: 'registre_1', questionnaireId: 'def_Q_STR_01', ordre: 0 },
      { packId: 'registre_1', questionnaireId: 'def_Q_STR_02', ordre: 1 },
    ]);
  });

  // Un pack vide n'a rien à refuser : `createMany` n'est pas appelé, mais la
  // purge doit l'être — c'est ainsi qu'on vide légitimement un miroir.
  it('un pack sans qid ne lève pas, purge et n’insère rien', async () => {
    findMany.mockResolvedValue([]);

    await expect(syncPackToRegistry(tx, pack([]))).resolves.toBeUndefined();

    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(createMany).not.toHaveBeenCalled();
  });
});
