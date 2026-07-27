import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRES_CATALOG, IDS_SUSPENDUS } from '@/lib/questionnaires-catalog';
import {
  ETIQUETTE_NON_INTERPRETABLE,
  MOTIFS_PASSATION_NON_INTERPRETABLE,
  estNonInterpretable,
  motifNonInterpretable,
  scoresSansMesure,
} from './passationsNonInterpretables';

// Banc du registre des passations non interprétables.
//
// La leçon du lot précédent (#406) est ici appliquée deux fois. La première
// version de SON banc était verte AVANT le changement, parce qu'un instrument
// déjà suspendu satisfaisait seul les invariants génériques : un invariant
// générique et une assertion nommée ne s'excluent pas, il faut les deux. La
// seconde leçon est la clause d'anti-vacuité — sans elle, un registre vidé par
// mégarde ferait passer tous les `for` de ce fichier au vert.

describe('registre — contenu', () => {
  it('nomme Q_SOM_07, et pas seulement « au moins une entrée »', () => {
    // Assertion nommée : un renommage ou une suppression de l'entrée fait
    // échouer ce test, là où l'invariant générique plus bas resterait vert.
    expect([...MOTIFS_PASSATION_NON_INTERPRETABLE.keys()]).toContain('Q_SOM_07');
  });

  it('n’est pas vide (anti-vacuité des invariants ci-dessous)', () => {
    expect(MOTIFS_PASSATION_NON_INTERPRETABLE.size).toBeGreaterThan(0);
  });

  it('donne un motif exploitable, pas une étiquette creuse', () => {
    for (const [id, motif] of MOTIFS_PASSATION_NON_INTERPRETABLE) {
      // Le motif s'affiche tel quel au praticien et part dans le prompt :
      // « non interprétable » sans le pourquoi ne l'aide ni ne le protège.
      expect(motif.length, `${id} : motif trop court`).toBeGreaterThan(80);
      expect(motif, `${id} : motif non ponctué`).toMatch(/\.$/);
    }
  });
});

describe('registre — inclusion dans les suspendus', () => {
  // C'est LA garde du piège de réactivation. La table est indexée par
  // instrument, pas par passation : réactiver `Q_SOM_07` sans statuer sur les
  // passations historiques marquerait les nouvelles à tort. Le CI le refuse.
  it.each([...MOTIFS_PASSATION_NON_INTERPRETABLE.keys()])(
    '%s est suspendu dans le catalogue',
    id => {
      const entree = QUESTIONNAIRES_CATALOG.find(q => q.id === id);
      expect(entree, `${id} absent du catalogue`).toBeDefined();
      expect(
        entree?.actif,
        `${id} est de nouveau actif : statuer sur ses passations historiques avant de le retirer du registre`,
      ).toBe(false);
      expect(IDS_SUSPENDUS.has(id)).toBe(true);
    },
  );

  it('n’impose PAS la réciproque — un suspendu peut rester parfaitement lisible', () => {
    // `Q_FIB_03` (ELFE) est inactif depuis toujours parce qu'il n'a jamais été
    // déployé, non parce que ses résultats seraient faux. Confondre les deux
    // ensembles est exactement l'erreur que le lot #406 a écartée en refusant
    // `IDS_ASSIGNABLES` comme garde. Ce test échoue si quelqu'un « simplifie »
    // le registre en le dérivant de `!actif`.
    const suspendusLisibles = [...IDS_SUSPENDUS].filter(id => !estNonInterpretable(id));
    expect(
      suspendusLisibles.length,
      'le registre a été dérivé de `actif` : ce sont deux décisions distinctes',
    ).toBeGreaterThan(0);
  });
});

describe('motifNonInterpretable', () => {
  it('rend null sur un instrument courant, et sur les entrées vides', () => {
    expect(motifNonInterpretable('Q_SOM_06')).toBeNull();
    expect(motifNonInterpretable('')).toBeNull();
    expect(motifNonInterpretable(null)).toBeNull();
    expect(motifNonInterpretable(undefined)).toBeNull();
  });

  it('rend le motif sur un instrument du registre', () => {
    expect(motifNonInterpretable('Q_SOM_07')).toBe(
      MOTIFS_PASSATION_NON_INTERPRETABLE.get('Q_SOM_07'),
    );
    expect(estNonInterpretable('Q_SOM_07')).toBe(true);
  });
});

describe('scoresSansMesure — liste blanche', () => {
  // Les deux formes RÉELLEMENT présentes en production le 2026-07-27, relevées
  // par `execute_sql` sur les 4 passations de `Q_SOM_07`. Une liste noire de
  // clés interprétatives aurait couvert la première et laissé passer `global`
  // de la seconde.
  const FORME_COURANTE = {
    type: 'sum',
    total: 45,
    maxTotal: 80,
    note: 'une note',
    interpretation: { label: 'Fatigue notable', color: 'warning' },
    certification: null,
    rawAnswers: { M1: 2, M2: 3 },
  };
  const FORME_HERITEE = {
    GF: 18,
    AM: 13,
    global: 31,
    rawAnswers: { M1: 1 },
  };

  it('ne laisse subsister que rawAnswers, sur la forme courante', () => {
    expect(scoresSansMesure(FORME_COURANTE)).toEqual({ rawAnswers: { M1: 2, M2: 3 } });
  });

  it('ne laisse subsister que rawAnswers, sur la forme héritée', () => {
    // `global: 31` est le total qu'un praticien lisait « Fatigue
    // multidimensionnelle sévère » — quand 33, sur les bandes actuelles, se
    // lisait « dans les limites normales ». Deux formats, deux lectures qui
    // s'inversent : c'est le cœur du lot.
    expect(scoresSansMesure(FORME_HERITEE)).toEqual({ rawAnswers: { M1: 1 } });
  });

  it('ne laisse échapper aucun nombre du bloc de scores', () => {
    // Contrôle indépendant de la forme : rien de numérique ne doit survivre
    // hors de `rawAnswers`. Falsifié si la liste blanche devient une liste
    // noire incomplète.
    for (const forme of [FORME_COURANTE, FORME_HERITEE]) {
      const { rawAnswers: _ignore, ...reste } = scoresSansMesure(forme) as Record<string, unknown>;
      expect(Object.keys(reste)).toEqual([]);
    }
  });

  it('supporte les entrées dégénérées sans lever', () => {
    expect(scoresSansMesure(null)).toEqual({});
    expect(scoresSansMesure(undefined)).toEqual({});
    expect(scoresSansMesure('texte')).toEqual({});
    expect(scoresSansMesure([1, 2])).toEqual({});
    expect(scoresSansMesure({})).toEqual({});
  });

  it('n’altère pas l’objet d’origine', () => {
    const original = { ...FORME_COURANTE };
    scoresSansMesure(original);
    expect(original).toEqual(FORME_COURANTE);
  });
});

describe('étiquette affichable', () => {
  it('est en français et tient sur une ligne', () => {
    expect(ETIQUETTE_NON_INTERPRETABLE).toBe('Interprétation retirée');
  });
});
