import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRES_CATALOG, IDS_SUSPENDUS } from '@/lib/questionnaires-catalog';
import {
  ETIQUETTE_NON_INTERPRETABLE,
  MOTIFS_PASSATION_NON_INTERPRETABLE,
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
    for (const [id, entree] of MOTIFS_PASSATION_NON_INTERPRETABLE) {
      // Le motif s'affiche tel quel au praticien et part dans le prompt :
      // « non interprétable » sans le pourquoi ne l'aide ni ne le protège.
      expect(entree.motif.length, `${id} : motif trop court`).toBeGreaterThan(80);
      expect(entree.motif, `${id} : motif non ponctué`).toMatch(/\.$/);
    }
  });
});

describe('frontière datée — la reconstruction ne blanchit pas le passé', () => {
  const AVANT = new Date('2026-07-21T08:00:00.000Z');
  const APRES = new Date('2026-08-01T08:00:00.000Z');

  it('une passation ANTÉRIEURE à la reconstruction reste non interprétable', () => {
    // Les quatre passations de production du MFI-20 datent d'avant : ce qui a
    // été calculé sur l'ancienne grille l'a été, et le redater ne le corrige pas.
    expect(motifNonInterpretable('Q_SOM_07', AVANT)).toContain('inversions');
  });

  it('une passation POSTÉRIEURE est une mesure ordinaire', () => {
    // C'est ce que la reconstruction achète : sans cette branche, réactiver
    // l'instrument marquerait ses passations neuves du défaut de l'ancien.
    expect(motifNonInterpretable('Q_SOM_07', APRES)).toBeNull();
  });

  it('le jour même de la mise en service compte comme APRÈS', () => {
    // La frontière est « à partir de », pas « après » : une passation du
    // 2026-07-31 porte déjà le servi corrigé.
    expect(motifNonInterpretable('Q_SOM_07', new Date('2026-07-31T00:00:00.000Z'))).toBeNull();
    expect(motifNonInterpretable('Q_SOM_07', '2026-07-31')).toBeNull();
    expect(motifNonInterpretable('Q_SOM_07', '2026-07-30')).not.toBeNull();
  });

  it('FRONTIÈRE FERMÉE : sans date, ou sur une date illisible, la passation est marquée', () => {
    // Le sens de l'erreur est choisi. Marquer à tort affiche « interprétation
    // retirée » sur une mesure saine — visible, corrigible d'un regard. Ne pas
    // marquer servirait au praticien un score qui n'en est pas un, en silence.
    expect(motifNonInterpretable('Q_SOM_07')).not.toBeNull();
    expect(motifNonInterpretable('Q_SOM_07', null)).not.toBeNull();
    expect(motifNonInterpretable('Q_SOM_07', 'pas une date')).not.toBeNull();
  });

  // BRANCHE NON ÉPROUVÉE, et nommée plutôt que faussement couverte : celle d'une
  // entrée SANS `reconstruitLe`, qui doit marquer ses passations pour toujours.
  // Aucune entrée du registre n'est dans ce cas aujourd'hui, et le seul test
  // possible serait une réimplémentation de la fonction sur une table forgée —
  // c'est-à-dire un test de sa copie, pas d'elle. La garde ci-dessous couvre le
  // risque réel : une entrée sans date DOIT alors être suspendue au catalogue.
});

describe('registre — suspendu, OU daté', () => {
  // C'ÉTAIT la garde du piège de réactivation, et elle a changé de forme le
  // 2026-07-31 sans changer de rôle. Elle exigeait que tout instrument listé ici
  // soit `actif: false` — ce qui tenait la porte FERMÉE : elle interdisait la
  // réactivation au lieu de la rendre possible. Le MFI-20 ayant été reconstruit,
  // il fallait une troisième voie, et c'est la date.
  //
  // L'alternative est exclusive dans les faits mais pas dans la forme : un
  // instrument peut être daté ET suspendu (reconstruit mais pas encore rouvert).
  // Ce que la garde interdit, c'est le cas dangereux — ACTIF et SANS date, où
  // chaque passation neuve serait marquée du défaut de l'ancien servi.
  it.each([...MOTIFS_PASSATION_NON_INTERPRETABLE.keys()])(
    '%s est suspendu au catalogue, ou porte une date de reconstruction',
    id => {
      const auCatalogue = QUESTIONNAIRES_CATALOG.find(q => q.id === id);
      expect(auCatalogue, `${id} absent du catalogue`).toBeDefined();
      const entree = MOTIFS_PASSATION_NON_INTERPRETABLE.get(id);
      expect(
        auCatalogue?.actif === false || entree?.reconstruitLe !== undefined,
        `${id} est actif au catalogue SANS date de reconstruction : ses passations neuves porteraient le motif de l'ancien servi. Le reconstruire et dater, ou le suspendre.`,
      ).toBe(true);
      // Pas d'assertion sur `IDS_SUSPENDUS` ici : il est DÉRIVÉ de `!actif`
      // (`questionnaires-catalog.ts`), donc la vérifier après `actif === false`
      // est une tautologie — elle donnerait l'impression d'une double garde là
      // où il n'y en a qu'une. Relevé en revue le 2026-07-27.
    },
  );

  it('ANTI-VACUITÉ : la garde ci-dessus discrimine réellement', () => {
    // Sans ceci, une entrée dont les DEUX branches seraient fausses passerait
    // inaperçue si la boucle venait à ne plus itérer. Et surtout : la branche
    // « datée » doit être celle qui porte aujourd'hui, sinon la garde serait
    // encore l'ancienne sous un nouveau nom.
    const mfi = MOTIFS_PASSATION_NON_INTERPRETABLE.get('Q_SOM_07');
    expect(mfi?.reconstruitLe, 'Q_SOM_07 doit porter sa date de reconstruction').toBeInstanceOf(Date);
  });

  it('n’impose PAS la réciproque — Q_FIB_03 est suspendu ET parfaitement lisible', () => {
    // `Q_FIB_03` (ELFE) est inactif depuis toujours parce qu'il n'a jamais été
    // déployé, non parce que ses résultats seraient faux. Confondre les deux
    // ensembles est exactement l'erreur que le lot #406 a écartée en refusant
    // `IDS_ASSIGNABLES` comme garde. Ce test échoue si quelqu'un « simplifie »
    // le registre en le dérivant de `!actif`.
    //
    // Nommé, et pas seulement « il existe un suspendu lisible » : la version
    // anonyme de cette assertion dépendait d'un tiers muet — réactiver ou
    // retirer ELFE l'aurait fait échouer pour une raison sans rapport, et la
    // pression aurait été de l'affaiblir plutôt que de la comprendre.
    expect(IDS_SUSPENDUS.has('Q_FIB_03'), 'Q_FIB_03 n’est plus suspendu : revoir ce test').toBe(true);
    expect(
      motifNonInterpretable('Q_FIB_03'),
      'le registre a été dérivé de `actif` : ce sont deux décisions distinctes',
    ).toBeNull();
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
    // L'entrée porte désormais `{ motif, reconstruitLe }` : c'est le MOTIF qui
    // ressort, pas l'entrée entière.
    expect(motifNonInterpretable('Q_SOM_07')).toBe(
      MOTIFS_PASSATION_NON_INTERPRETABLE.get('Q_SOM_07')?.motif,
    );
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
    // `rawAnswers: null` est une absence, pas une clé vide à propager : livrer
    // `{ rawAnswers: null }` annoncerait un contenu que chaque consommateur
    // devrait revalider. Relevé en revue le 2026-07-27.
    expect(scoresSansMesure({ total: 45, rawAnswers: null })).toEqual({});
  });

  it('rend {} sur la forme héritée réellement en base, qui n’a AUCUN rawAnswers', () => {
    // Vérifié en production : la passation du 2026-06-15 ne porte pas même la
    // clé, quand les trois autres portent 20 items. Elle n'est donc pas
    // rescorable, et « les réponses brutes restent » ne vaut pas pour elle.
    expect(scoresSansMesure({ GF: 18, AM: 13, global: 31 })).toEqual({});
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
