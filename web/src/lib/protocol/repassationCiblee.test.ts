import { describe, expect, it } from 'vitest';

import { BESOIN_SOURCES } from '@/lib/equilibre/constants';
import { IDS_ASSIGNABLES } from '@/lib/bibliotheque';
import { questionnairesCiblesPourPriorite } from './repassationCiblee';

// Ce que ce banc défend (LOT-07, `D-058`) : la re-passation ciblée vise ce que
// la priorité FONDE (`needIds` → `BESOIN_SOURCES`), jamais le pack entier — et
// elle ne propose jamais un instrument que la route refuserait d'administrer.

describe('questionnairesCiblesPourPriorite', () => {
  it('cible les sources du besoin visé, et elles seules', () => {
    // Besoin 4 (digestif) : Q_GAS_01 et Q_INF_01 dans la table signée.
    const cibles = questionnairesCiblesPourPriorite([4]);
    const attendues = BESOIN_SOURCES[4]
      .map(source => source.idQuestionnaire)
      .filter(qid => IDS_ASSIGNABLES.has(qid));
    expect(cibles).toEqual(attendues);
    expect(cibles.length).toBeGreaterThan(0);
  });

  it('déduplique deux besoins partageant une source', () => {
    // Besoins 1 et 3 lisent tous deux Q_ALI_01 (total et sous-score) : une
    // seule proposition, pas deux boutons pour le même instrument.
    const cibles = questionnairesCiblesPourPriorite([1, 3]);
    expect(cibles.filter(qid => qid === 'Q_ALI_01')).toHaveLength(1);
  });

  it('une priorité sans provenance ne cible RIEN — jamais le pack entier à la place', () => {
    expect(questionnairesCiblesPourPriorite([])).toEqual([]);
  });

  it('un besoin sans source vivante ne cible rien', () => {
    // Besoin 2 : sources retirées en v4 (note en tête de constants.ts).
    expect(questionnairesCiblesPourPriorite([2])).toEqual([]);
  });

  it('un identifiant de besoin inconnu est ignoré sans lever', () => {
    expect(questionnairesCiblesPourPriorite([999])).toEqual([]);
  });

  it('l’ordre est déterministe : celui des besoins, puis des sources', () => {
    const unDeux = questionnairesCiblesPourPriorite([4, 9]);
    const memeAppel = questionnairesCiblesPourPriorite([4, 9]);
    expect(unDeux).toEqual(memeAppel);
  });

  it('ne propose que des instruments assignables par la file d’envoi', () => {
    // Tous les besoins d'un coup : pas un seul id hors de `IDS_ASSIGNABLES`,
    // LE prédicat de la route destinataire (`idsAssignablesPour`) — proposer
    // un instrument que la file refuserait serait un bouton cassé.
    const tous = questionnairesCiblesPourPriorite(Object.keys(BESOIN_SOURCES).map(Number));
    expect(tous.length).toBeGreaterThan(0);
    for (const qid of tous) {
      expect(IDS_ASSIGNABLES.has(qid), qid).toBe(true);
    }
  });
});
