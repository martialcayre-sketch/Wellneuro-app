import { describe, expect, it, vi } from 'vitest';
import { BESOINS, BESOIN_SOURCES, VERSION_SCORE_EQUILIBRE } from '@/lib/equilibre/constants';
import { construireReponsesParQuestionnaire, type ReponseBrute } from '@/lib/equilibre/depuisPrisma';
import { calculerCouverturesTousLesBesoins } from '@/lib/equilibre/score';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { MOTIFS_PASSATION_NON_INTERPRETABLE } from '@/lib/scoring/passationsNonInterpretables';
import { TEXTE_MOTIF, construireBlocBesoins } from './blocBesoins';

// H95 part A, [[D-462]]. Fixtures synthétiques : ce banc prouve le mécanisme du
// bloc, il ne décrit aucun parcours (D-125).

function passation(idQuestionnaire: string, rawAnswers: Record<string, string | number>, jour = '2026-03-12', statutValidite: string | null = null): ReponseBrute {
  return { idQuestionnaire, dateReponse: new Date(`${jour}T10:00:00.000Z`), scoresJson: { rawAnswers }, statutValidite };
}

/** Toutes les questions de l'instrument répondues à la même valeur. */
function reponsesCompletes(idQuestionnaire: string, valeur: string | number): Record<string, string | number> {
  const definition = (QUESTIONNAIRE_CATALOGUE as unknown as Record<string, { sections: { questions: { id: string }[] }[] }>)[idQuestionnaire];
  const questions = definition.sections.flatMap(section => section.questions);
  return Object.fromEntries(questions.map(question => [question.id, valeur]));
}

function ligne(bloc: string, besoin: number): string {
  const trouvee = bloc.split('\n').find(l => l.startsWith(`Besoin ${besoin},`));
  if (!trouvee) throw new Error(`ligne du besoin ${besoin} absente`);
  return trouvee;
}

const DOSSIER: ReponseBrute[] = [
  passation('Q_STR_01', reponsesCompletes('Q_STR_01', 1)),
  passation('Q_STR_02', reponsesCompletes('Q_STR_02', 1), '2026-03-14'),
  passation('Q_GAS_01', reponsesCompletes('Q_GAS_01', 1), '2026-02-01'),
];

describe('bloc des besoins — côté modèle', () => {
  it('porte son en-tête, sa version de calcul, et les douze besoins dans l’ordre fixe', () => {
    const lignes = construireBlocBesoins(DOSSIER).split('\n');
    expect(lignes[0]).toBe('## Besoins mesurés et non mesurés');
    expect(lignes[1]).toBe(`Version du calcul : ${VERSION_SCORE_EQUILIBRE}`);
    expect(lignes[2]).toBe('');
    expect(lignes.slice(3).map(l => l.match(/^Besoin (\d+),/)?.[1])).toEqual(BESOINS.map(b => String(b.id)));
  });

  it('un dossier vide : douze besoins non mesurés, aucun zéro', () => {
    const bloc = construireBlocBesoins([]);
    for (const besoin of BESOINS) expect(ligne(bloc, besoin.id)).toContain(': non mesuré, ');
    expect(bloc).not.toMatch(/: mesuré\./);
  });

  it('« mesuré » est exactement ce que le calcul du cockpit dit mesuré', () => {
    const couvertures = calculerCouverturesTousLesBesoins(construireReponsesParQuestionnaire(DOSSIER));
    const bloc = construireBlocBesoins(DOSSIER);
    expect(Object.values(couvertures).some(c => c !== null)).toBe(true);
    for (const besoin of BESOINS) {
      const mesure = couvertures[besoin.id] !== null;
      expect(ligne(bloc, besoin.id).includes(': mesuré. '), `besoin ${besoin.id}`).toBe(mesure);
      expect(ligne(bloc, besoin.id).includes(': non mesuré, '), `besoin ${besoin.id}`).toBe(!mesure);
    }
  });

  it('un besoin mesuré nomme ses sources lues, datées, et les deux libellés', () => {
    const l = ligne(construireBlocBesoins(DOSSIER), 9);
    const besoin = BESOINS.find(b => b.id === 9)!;
    expect(l).toContain(`Besoin 9, ${besoin.libellePraticien} (au patient : « ${besoin.libellePatient} ») : mesuré. Sources : `);
    expect(l).toContain('Q_STR_01, passation du 2026-03-12');
    expect(l).toContain('Q_STR_02, passation du 2026-03-14');
    // La troisième source du besoin n'a pas été passée : elle n'est pas citée.
    expect(l).not.toContain('Q_STR_03');
    expect(l.endsWith('.')).toBe(true);
  });

  it('une source unique se dit au singulier', () => {
    const bloc = construireBlocBesoins([passation('Q_STR_01', reponsesCompletes('Q_STR_01', 1))]);
    expect(ligne(bloc, 9)).toContain(': mesuré. Source : Q_STR_01, passation du 2026-03-12.');
  });

  it('les besoins sans source portent leur motif, au mot près', () => {
    const bloc = construireBlocBesoins(DOSSIER);
    expect(ligne(bloc, 2)).toContain(': non mesuré, hors score : ce besoin ne se mesure pas par un questionnaire.');
    for (const id of [6, 7, 11]) {
      expect(ligne(bloc, id)).toContain(": non mesuré, aucun questionnaire de l'application ne le mesure.");
    }
  });

  it('une source jamais passée ne nomme aucun instrument', () => {
    const l = ligne(construireBlocBesoins(DOSSIER), 8);
    expect(l).toContain(': non mesuré, aucune passation exploitable pour ce calcul.');
    expect(l).not.toMatch(/Q_[A-Z]{3}_\d{2}/);
  });

  it('une passation écartée se dit écartée, sans nommer l’instrument', () => {
    const avantValidite = process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    process.env.WN_ENABLE_VALIDITE_PASSATIONS = '1';
    try {
      const l = ligne(construireBlocBesoins([passation('Q_NEU_11', reponsesCompletes('Q_NEU_11', 1), '2026-03-12', 'INVALID')]), 8);
      expect(l).toContain(': non mesuré, passation écartée du raisonnement.');
      expect(l).not.toMatch(/Q_[A-Z]{3}_\d{2}/);
    } finally {
      if (avantValidite === undefined) delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
      else process.env.WN_ENABLE_VALIDITE_PASSATIONS = avantValidite;
    }
  });

  it('un recueil incomplet nomme le questionnaire et sa date, seul motif à le faire', () => {
    const l = ligne(construireBlocBesoins([passation('Q_NEU_11', { D2: '0' }, '2026-02-01')]), 8);
    expect(l).toContain(': non mesuré, recueil incomplet sur les items lus (Q_NEU_11, passation du 2026-02-01).');
  });

  it('une passation incomplète hors des items lus reste mesurée, et le dit', () => {
    const itemsD = Object.keys(reponsesCompletes('Q_NEU_11', 0)).filter(id => id.startsWith('D'));
    const reponses = Object.fromEntries(itemsD.map(id => [id, '0']));
    const l = ligne(construireBlocBesoins([passation('Q_NEU_11', reponses, '2026-02-01')]), 8);
    expect(l).toContain(': mesuré. Source : Q_NEU_11 (sous-score D), passation du 2026-02-01 (incomplète hors des items lus).');
  });

  it('deux passations datées : la plus récente, quel que soit l’ordre de lecture', () => {
    const passations = [
      passation('Q_STR_01', reponsesCompletes('Q_STR_01', 1), '2026-01-05'),
      passation('Q_STR_01', reponsesCompletes('Q_STR_01', 1), '2026-03-12'),
    ];
    const attendu = ': mesuré. Source : Q_STR_01, passation du 2026-03-12.';
    expect(ligne(construireBlocBesoins(passations), 9)).toContain(attendu);
    expect(ligne(construireBlocBesoins([...passations].reverse()), 9)).toContain(attendu);
  });

  // Les textes validés mot pour mot : une retouche ne passe pas en silence, y
  // compris pour les motifs qu'aucune fixture ne provoque.
  it('les textes des motifs sont ceux validés par le responsable', () => {
    expect(TEXTE_MOTIF).toEqual({
      hors_score: 'hors score : ce besoin ne se mesure pas par un questionnaire',
      sans_instrument: "aucun questionnaire de l'application ne le mesure",
      aucune_passation: 'aucune passation exploitable pour ce calcul',
      passation_ecartee: 'passation écartée du raisonnement',
      source_suspendue: 'source suspendue',
      forme_sans_sous_score: 'sous-score non servi par la forme du questionnaire',
      calcul_en_erreur: 'calcul du questionnaire en erreur',
      sous_score_absent_ou_double: 'sous-score absent ou en double dans le résultat',
    });
  });

  // La forme servie se fixe au CHARGEMENT de `alimentaire.ts` : poser le drapeau ne
  // suffit pas, il faut recharger les modules pour jouer réellement chaque position.
  it.each([
    ['allumé', 'true'],
    ['éteint', 'false'],
  ])('Q_ALI_01 passé deux fois, drapeau %s : le besoin 1 cite la plus récente, seule', async (_position, valeur) => {
    vi.resetModules();
    vi.stubEnv('WN_ALI_01_SIIN57', valeur);
    try {
      const { QUESTIONNAIRE_CATALOGUE: catalogue } = await import('@/lib/questions');
      const { construireBlocBesoins: construire } = await import('./blocBesoins');
      const definition = (catalogue as unknown as Record<string, { sections: { questions: { id: string }[] }[] }>).Q_ALI_01;
      const reponses = Object.fromEntries(definition.sections.flatMap(s => s.questions).map(q => [q.id, 0]));
      // Preuve du rechargement : sans elle, le banc jouerait deux fois la même forme.
      expect(Object.keys(reponses)).toHaveLength(valeur === 'true' ? 57 : 14);
      const l = ligne(
        construire([passation('Q_ALI_01', reponses, '2026-01-05'), passation('Q_ALI_01', reponses, '2026-03-12')]),
        1,
      );
      expect(l).toContain(': mesuré. Source : Q_ALI_01, passation du 2026-03-12');
      expect(l).not.toContain('2026-01-05');
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe('bloc des besoins — côté patient, aucune valeur', () => {
  it('une fois retirés numéros, dates, identifiants et version, il ne reste aucun chiffre', () => {
    const bloc = construireBlocBesoins(DOSSIER)
      .replace(`Version du calcul : ${VERSION_SCORE_EQUILIBRE}`, '')
      .replace(/^Besoin \d+,/gm, '')
      .replace(/passation du \d{4}-\d{2}-\d{2}/g, '')
      .replace(/Q_[A-Z]{3}_\d{2}/g, '');
    expect(bloc).not.toMatch(/\d/);
  });

  it('la valeur ne change rien au bloc : deux cotations opposées donnent le même texte', () => {
    const bas = construireBlocBesoins([passation('Q_STR_01', reponsesCompletes('Q_STR_01', 0))]);
    const haut = construireBlocBesoins([passation('Q_STR_01', reponsesCompletes('Q_STR_01', 2))]);
    // Sans cette assertion, deux lignes passées à « non mesuré » rendraient le banc vide.
    expect(ligne(bas, 9)).toContain(': mesuré. ');
    expect(bas).toBe(haut);
  });

  it('ne parle ni d’indice, ni de plafond, ni de fondation, ni de niveau de preuve', () => {
    expect(construireBlocBesoins(DOSSIER)).not.toMatch(/indice|plafond|fondation|preuve|couverture|score global/i);
  });
});

describe('bloc des besoins — ce qui doit rester vrai demain', () => {
  // [[D-438]] fera entrer `Q_SOM_07` au besoin 5, et ses anciennes passations sont
  // déclarées non interprétables : le bloc dirait « mesuré » à côté d'une passation
  // dont le modèle ne reçoit aucun chiffre. Ce banc rougit le jour où cela arrive :
  // le lot qui ouvre la source tranche alors ce que le bloc en dit.
  it('aucune source d’un besoin n’est au registre des passations non interprétables', () => {
    const sources = Object.values(BESOIN_SOURCES).flat().map(source => source.idQuestionnaire);
    const communes = sources.filter(id => MOTIFS_PASSATION_NON_INTERPRETABLE.has(id));
    expect(communes).toEqual([]);
  });
});
