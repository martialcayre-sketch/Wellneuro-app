import { describe, expect, it, vi } from 'vitest';

// [[D-539]] §2 et §5 — le second appel, pris seul : son schéma fermé, sa
// relance, ses issues, et la phrase du narratif. Fixtures entièrement fictives
// ([[D-125]]) : aucune identité, aucun dossier réel.

const { anthropicCreate } = vi.hoisted(() => ({ anthropicCreate: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/anthropic', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/anthropic')>();
  return { ...reel, anthropic: { messages: { create: anthropicCreate } } };
});

import { construireBlocBiologie, enveloppeTexteLaboratoire, type LigneBiologieSynthese } from '@/lib/clinical/blocBiologieSynthese';
import { releverFormes } from '@/lib/synthese/contaminationBiologie';
import { formesDeScoreDuNarratif } from '@/lib/synthese/narratifFormesDeScore';
import {
  analyserSortieBiologie,
  appelerRestitutionBiologie,
  dateBilanDuBloc,
  dateEnLettres,
  ECART_INTERVALLE_SUIVI_UNITE,
  intervalleSuiviDUnite,
  lireSortieBiologie,
  messageRelanceBiologie,
  narratifAvecReceptionBilan,
  phraseReceptionBilan,
  SYSTEM_PROMPT_SYNTHESE_BIOLOGIE,
} from './appelBiologie';

let compteur = 0;
function ligne(partiel: Partial<LigneBiologieSynthese> = {}): LigneBiologieSynthese {
  compteur += 1;
  return {
    id: `r${String(compteur).padStart(3, '0')}`,
    supersedesResultatId: null,
    saisiLe: '2026-11-12T09:00:00.000Z',
    analyteCode: 'FERRITINE',
    analyteLibelle: 'Ferritine',
    preleveLe: '2026-03-12T07:00:00.000Z',
    valeur: '12',
    unite: 'mmol/L',
    source: 'saisie_praticien',
    laboratoire: null,
    contexte: null,
    heureLue: false,
    lue: null,
    ...partiel,
  };
}

function bloc(lignes: LigneBiologieSynthese[], annulations: ReadonlyMap<string, unknown> = new Map()) {
  const trace = construireBlocBiologie(lignes, annulations);
  if (trace === null) throw new Error('bloc attendu');
  return trace;
}

function reponse(texte: string, usage: Record<string, number> = {}) {
  return { content: [{ type: 'text', text: texte }], stop_reason: 'end_turn', usage };
}

const SORTIE_CONFORME = {
  resume_biologie_praticien: 'Restitution datée, fictive.',
  points_de_vigilance_biologie: ['Contexte de prélèvement non recueilli : à vérifier.'],
};

describe('analyserSortieBiologie — schéma fermé à deux clés (D-539 §2)', () => {
  it('accepte un résumé non vide et une liste, vide comprise', () => {
    expect(analyserSortieBiologie(SORTIE_CONFORME)).toEqual({ ok: true, sortie: SORTIE_CONFORME });
    const vide = { ...SORTIE_CONFORME, points_de_vigilance_biologie: [] };
    expect(analyserSortieBiologie(vide)).toEqual({ ok: true, sortie: vide });
  });

  it('rejette un résumé vide ou absent, une liste absente ou à chaîne vide, une racine non objet', () => {
    expect(analyserSortieBiologie({ ...SORTIE_CONFORME, resume_biologie_praticien: '  ' }).ok).toBe(false);
    expect(analyserSortieBiologie({ points_de_vigilance_biologie: [] }).ok).toBe(false);
    expect(analyserSortieBiologie({ resume_biologie_praticien: 'x' }).ok).toBe(false);
    expect(analyserSortieBiologie({ ...SORTIE_CONFORME, points_de_vigilance_biologie: [''] }).ok).toBe(false);
    expect(analyserSortieBiologie([SORTIE_CONFORME]).ok).toBe(false);
    expect(analyserSortieBiologie(null).ok).toBe(false);
  });

  it('rejette toute autre clé — un champ de la synthèse principale compris —, comptée, jamais nommée', () => {
    const r = analyserSortieBiologie({ ...SORTIE_CONFORME, narratif_patient: 'x', axe_secret_123: 'y' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.violations).toEqual(['racine : 2 clé(s) inconnue(s)']);
      expect(r.violations.join(' ')).not.toContain('axe_secret_123');
    }
  });
});

// [[D-545]] §4 et §9 — le contrôle de l'intervalle suivi d'une unité. Formes
// fictives, écrites comme le constructeur les relève.
function sortie(resume: string, points: string[] = []) {
  return { resume_biologie_praticien: resume, points_de_vigilance_biologie: points };
}
const FORMES = { intervalles: ['30 - 400'], valeursUnites: [{ valeur: '41', unite: 'µg/L' }] };

describe('intervalleSuiviDUnite — un intervalle imprimé cité en entier, suivi d’une unité (D-545 §4)', () => {
  it('rejette l’unité d’une valeur du bloc écrite après l’intervalle, dans le résumé comme dans un point', () => {
    expect(intervalleSuiviDUnite(sortie('Intervalle imprimé par le laboratoire : 30 - 400 µg/L.'), FORMES)).toBe(true);
    expect(intervalleSuiviDUnite(sortie('x', ['41 µg/L (intervalle imprimé : 30 - 400 µg/L)']), FORMES)).toBe(true);
  });

  it('séparés au plus par des espaces ou des guillemets : rejet ; par autre chose : non', () => {
    for (const t of ['« 30 - 400 » µg/L', '"30 - 400"µg/L', '30 - 400\u00a0µg/L', '“30 - 400”  µg/L', '30 - 400µg/L']) {
      expect(intervalleSuiviDUnite(sortie(t), FORMES), t).toBe(true);
    }
    for (const t of ['30 - 400 ; 41 µg/L', '30 - 400 (41 µg/L)', '30 - 400, valeur 41 µg/L', '30 - 400.']) {
      expect(intervalleSuiviDUnite(sortie(t), FORMES), t).toBe(false);
    }
  });

  it('l’unité de n’importe quelle valeur du bloc, et elle seule ; une unité plus longue qui la prolonge n’est pas elle', () => {
    const formes = { intervalles: ['10-31'], valeursUnites: [{ valeur: '41', unite: 'µg/L' }, { valeur: '2,1', unite: 'mmol/L' }] };
    expect(intervalleSuiviDUnite(sortie('10-31 mmol/L'), formes)).toBe(true);
    expect(intervalleSuiviDUnite(sortie('10-31 g/L'), formes)).toBe(false);
    expect(intervalleSuiviDUnite(sortie('10-31 µg/Lx'), formes)).toBe(false);
  });

  it('rejette une unité ajoutée identique à celle qui termine le texte imprimé', () => {
    const formes = { intervalles: ['30 - 400 µg/L'], valeursUnites: [{ valeur: '41', unite: 'µg/L' }] };
    expect(intervalleSuiviDUnite(sortie('Intervalle imprimé : 30 - 400 µg/L µg/L.'), formes)).toBe(true);
  });

  it('ne rejette pas l’unité interne au texte imprimé, cité exactement', () => {
    const formes = { intervalles: ['30 - 400 µg/L'], valeursUnites: [{ valeur: '41', unite: 'µg/L' }] };
    expect(intervalleSuiviDUnite(sortie('Intervalle imprimé par le laboratoire : 30 - 400 µg/L.'), formes)).toBe(false);
    expect(intervalleSuiviDUnite(sortie('« 30 - 400 µg/L »'), formes)).toBe(false);
  });

  it('ne rejette pas un texte cité exactement dont un texte plus court est le début : le plus long fait foi', () => {
    const formes = { intervalles: ['30 - 400', '30 - 400 µg/L chez l’adulte'], valeursUnites: [{ valeur: '41', unite: 'µg/L' }] };
    expect(intervalleSuiviDUnite(sortie('Intervalle imprimé : 30 - 400 µg/L chez l’adulte.'), formes)).toBe(false);
    // L'ordre des formes ne change rien.
    expect(intervalleSuiviDUnite(sortie('Intervalle imprimé : 30 - 400 µg/L chez l’adulte.'), { ...formes, intervalles: [...formes.intervalles].reverse() })).toBe(false);
    // Le plus long, lui, suivi d'une unité ajoutée, est rejeté.
    expect(intervalleSuiviDUnite(sortie('30 - 400 µg/L chez l’adulte µg/L'), formes)).toBe(true);
    // Et le plus court, cité seul et suivi d'une unité, aussi.
    expect(intervalleSuiviDUnite(sortie('30 - 400 µg/L, chez l’enfant'), formes)).toBe(true);
  });

  it('ne rejette pas l’unité d’un texte imprimé plus large qui contient un texte plus court en son milieu', () => {
    const formes = { intervalles: ['2,5', 'H : 2,5 µg/L à 9'], valeursUnites: [{ valeur: '41', unite: 'µg/L' }] };
    expect(intervalleSuiviDUnite(sortie('Imprimé : H : 2,5 µg/L à 9.'), formes)).toBe(false);
  });

  it('cité en entier : la fin d’une autre expression chiffrée n’est pas une citation (revue wn-reviewer, P2-2)', () => {
    const unite = [{ valeur: '41', unite: 'g/L' }];
    expect(intervalleSuiviDUnite(sortie('13 - 5 g/L'), { intervalles: ['3 - 5'], valeursUnites: unite })).toBe(false);
    expect(intervalleSuiviDUnite(sortie('15,0 g/L'), { intervalles: ['5,0'], valeursUnites: unite })).toBe(false);
    expect(intervalleSuiviDUnite(sortie('1,5,0 g/L'), { intervalles: ['5,0'], valeursUnites: unite })).toBe(false);
    expect(intervalleSuiviDUnite(sortie('X3 - 5 g/L'), { intervalles: ['3 - 5'], valeursUnites: unite })).toBe(false);
    // Précédée d'une espace, d'un guillemet ou d'une ponctuation, elle l'est.
    for (const t of ['imprimé : 3 - 5 g/L', '«3 - 5» g/L', '(3 - 5 g/L)']) {
      expect(intervalleSuiviDUnite(sortie(t), { intervalles: ['3 - 5'], valeursUnites: unite }), t).toBe(true);
    }
  });

  it('une unité qui ouvre un autre texte imprimé, cité juste après, fait partie de l’imprimé (revue wn-reviewer, P2-3a)', () => {
    const formes = { intervalles: ['10 - 20', 'µg/L : 30 - 400'], valeursUnites: [{ valeur: '41', unite: 'µg/L' }] };
    expect(intervalleSuiviDUnite(sortie('« 10 - 20 » « µg/L : 30 - 400 »'), formes)).toBe(false);
    expect(intervalleSuiviDUnite(sortie('« 10 - 20 » µg/L'), formes)).toBe(true);
  });

  it('une unité d’une lettre suivie d’une apostrophe et d’une lettre n’est pas l’unité (revue wn-reviewer, P2-3b)', () => {
    const formes = { intervalles: ['25 - 35'], valeursUnites: [{ valeur: '30', unite: 's' }] };
    expect(intervalleSuiviDUnite(sortie('« 25 - 35 » s’il est lu'), formes)).toBe(false);
    expect(intervalleSuiviDUnite(sortie("« 25 - 35 » s'il est lu"), formes)).toBe(false);
    expect(intervalleSuiviDUnite(sortie('« 25 - 35 » s.'), formes)).toBe(true);
  });

  it('sans intervalle imprimé ou sans unité au bloc, rien à rejeter ; un intervalle reformulé lui échappe', () => {
    expect(intervalleSuiviDUnite(sortie('30 - 400 µg/L'), { intervalles: [], valeursUnites: FORMES.valeursUnites })).toBe(false);
    expect(intervalleSuiviDUnite(sortie('30 - 400 µg/L'), { intervalles: FORMES.intervalles, valeursUnites: [] })).toBe(false);
    expect(intervalleSuiviDUnite(sortie('de 30 à 400 µg/L'), FORMES)).toBe(false);
  });

  it('lit les formes du vrai constructeur : intervalle imprimé sans unité, valeur avec la sienne', () => {
    const trace = bloc([ligne({
      valeur: '41', unite: 'µg/L', source: 'import_labo',
      lue: { versionProcede: 'bio-extraction-v5', intervalleLu: '30 - 400', intervalleNonTranscrit: false, uniteLue: 'µg/L', valeurLue: '41' },
    })]);
    expect(trace.formes.intervalles).toEqual(['30 - 400']);
    expect(intervalleSuiviDUnite(sortie('41 µg/L ; intervalle imprimé : 30 - 400 µg/L'), trace.formes)).toBe(true);
    expect(intervalleSuiviDUnite(sortie('41 µg/L ; intervalle imprimé : 30 - 400'), trace.formes)).toBe(false);
  });
});

describe('lireSortieBiologie — le schéma, puis le contrôle, au même tour (D-545 §4)', () => {
  it('le schéma d’abord ; s’il passe, le contrôle ; l’écart est le texte fixe, sans rien du bloc', () => {
    expect(lireSortieBiologie({ autre: 1 }, FORMES).ok).toBe(false);
    const r = lireSortieBiologie(sortie('30 - 400 µg/L'), FORMES);
    expect(r).toEqual({ ok: false, violations: [ECART_INTERVALLE_SUIVI_UNITE] });
    expect(ECART_INTERVALLE_SUIVI_UNITE).toBe("un intervalle imprimé est suivi d'une unité ; cite chaque intervalle tel qu'il est imprimé, sans aucune unité juste après lui");
    expect(lireSortieBiologie(sortie('30 - 400'), FORMES)).toEqual({ ok: true, sortie: sortie('30 - 400') });
  });
});

describe('la relance du second appel (D-539 §2)', () => {
  it('dit la forme attendue, liste vide admise, sans « aucun champ vide »', () => {
    const m = messageRelanceBiologie(['resume_biologie_praticien : chaîne non vide attendue']);
    expect(m).toContain('- resume_biologie_praticien : chaîne non vide attendue');
    expect(m).toContain('vide en l’absence de vigilance biologique');
    expect(m).not.toContain('aucun champ vide');
  });
});

describe('appelerRestitutionBiologie — le bloc seul, une relance, trois issues', () => {
  const trace = bloc([ligne()]);

  it('le message réellement envoyé est le bloc, sans autre texte, sous la consigne synthese-biologie-v2', async () => {
    anthropicCreate.mockReset().mockResolvedValueOnce(reponse(JSON.stringify(SORTIE_CONFORME), { input_tokens: 7 }));
    const r = await appelerRestitutionBiologie(trace);
    expect(r.issue).toBe('reussi');
    const [corps, options] = anthropicCreate.mock.calls[0];
    expect(corps.messages).toEqual([{ role: 'user', content: trace.texte }]);
    expect(corps.system).toEqual([{ type: 'text', text: SYSTEM_PROMPT_SYNTHESE_BIOLOGIE, cache_control: { type: 'ephemeral' } }]);
    // Un délai borné et un signal : un délai dépassé est un échec de l'appel.
    expect(options.timeout).toBeGreaterThan(0);
    expect(options.signal).toBeInstanceOf(AbortSignal);
    if (r.issue === 'reussi') {
      expect(r.sortie).toEqual(SORTIE_CONFORME);
      expect(r.relance).toBe(false);
      expect(r.metriques.input_tokens).toBe(7);
    }
  });

  it('une sortie rejetée part en relance une fois ; la relance conforme, liste vide, réussit', async () => {
    anthropicCreate.mockReset()
      .mockResolvedValueOnce(reponse(JSON.stringify({ ...SORTIE_CONFORME, resume_biologie_praticien: '' }), { input_tokens: 5 }))
      .mockResolvedValueOnce(reponse(JSON.stringify({ ...SORTIE_CONFORME, points_de_vigilance_biologie: [] }), { input_tokens: 6 }));
    const r = await appelerRestitutionBiologie(trace);
    expect(anthropicCreate).toHaveBeenCalledTimes(2);
    const relance = anthropicCreate.mock.calls[1][0].messages;
    expect(relance[0]).toEqual({ role: 'user', content: trace.texte });
    expect(relance.at(-1).content).toBe(messageRelanceBiologie(['resume_biologie_praticien : chaîne non vide attendue']));
    expect(r).toMatchObject({ issue: 'reussi', relance: true, sortie: { points_de_vigilance_biologie: [] } });
    expect(r.metriques.input_tokens).toBe(11);
  });

  it('un intervalle suivi d’une unité : relance unique avec l’écart du §4 ; corrigée, elle réussit (D-545 §4)', async () => {
    const t = bloc([ligne({
      valeur: '41', unite: 'µg/L', source: 'import_labo',
      lue: { versionProcede: 'bio-extraction-v5', intervalleLu: '30 - 400', intervalleNonTranscrit: false, uniteLue: 'µg/L', valeurLue: '41' },
    })]);
    anthropicCreate.mockReset()
      .mockResolvedValueOnce(reponse(JSON.stringify(sortie('Intervalle imprimé : 30 - 400 µg/L.'))))
      .mockResolvedValueOnce(reponse(JSON.stringify(sortie('Intervalle imprimé : 30 - 400.'))));
    const r = await appelerRestitutionBiologie(t);
    expect(anthropicCreate).toHaveBeenCalledTimes(2);
    const relance = anthropicCreate.mock.calls[1][0].messages.at(-1).content as string;
    expect(relance).toBe(messageRelanceBiologie([ECART_INTERVALLE_SUIVI_UNITE]));
    // La relance ne cite aucun texte du bloc.
    for (const interdit of ['30 - 400', 'µg/L', '41']) expect(relance, interdit).not.toContain(interdit);
    expect(r).toMatchObject({ issue: 'reussi', relance: true, ecartsRelance: [ECART_INTERVALLE_SUIVI_UNITE] });
  });

  it('un intervalle suivi d’une unité après la relance : sortie_rejetee, sans troisième appel, écart sans texte du bloc (D-545 §4)', async () => {
    const t = bloc([ligne({
      valeur: '41', unite: 'µg/L', source: 'import_labo',
      lue: { versionProcede: 'bio-extraction-v5', intervalleLu: '30 - 400', intervalleNonTranscrit: false, uniteLue: 'µg/L', valeurLue: '41' },
    })]);
    anthropicCreate.mockReset().mockResolvedValue(reponse(JSON.stringify(sortie('x', ['30 - 400 µg/L']))));
    const r = await appelerRestitutionBiologie(t);
    expect(anthropicCreate).toHaveBeenCalledTimes(2);
    expect(r).toMatchObject({ issue: 'sortie_rejetee', violations: [ECART_INTERVALLE_SUIVI_UNITE] });
    for (const interdit of ['30 - 400', 'µg/L', '41']) expect(JSON.stringify(r), interdit).not.toContain(interdit);
  });

  it('deux rejets : sortie_rejetee, sans troisième appel', async () => {
    anthropicCreate.mockReset().mockResolvedValue(reponse(JSON.stringify({ autre: 1 })));
    const r = await appelerRestitutionBiologie(trace);
    expect(anthropicCreate).toHaveBeenCalledTimes(2);
    expect(r.issue).toBe('sortie_rejetee');
  });

  it('une erreur du fournisseur, un délai, une troncature : echec_appel, sans lever, et sans le message brut', async () => {
    for (const panne of [
      () => anthropicCreate.mockRejectedValueOnce(new Error('message brut du fournisseur 12 mmol/L')),
      () => anthropicCreate.mockResolvedValueOnce({ ...reponse('{}'), stop_reason: 'max_tokens' }),
      () => anthropicCreate.mockResolvedValueOnce(reponse('pas de JSON')),
    ]) {
      anthropicCreate.mockReset();
      panne();
      const r = await appelerRestitutionBiologie(trace);
      expect(r.issue).toBe('echec_appel');
      expect(JSON.stringify(r)).not.toContain('message brut');
      expect(JSON.stringify(r)).not.toContain('12 mmol/L');
    }
  });

  it('le délai du second appel borne ses deux tours : dépassé, echec_appel', async () => {
    anthropicCreate.mockReset().mockImplementation((_c: unknown, o: { signal: AbortSignal }) =>
      new Promise((_, rejeter) => o.signal.addEventListener('abort', () => rejeter(o.signal.reason))));
    const r = await appelerRestitutionBiologie(trace, { delaiMs: 20 });
    expect(r.issue).toBe('echec_appel');
  });
});

describe('la phrase du narratif (D-539 §5, N3)', () => {
  it('la date la plus récente écrite dans le bloc, le mois en lettres, « du » et jamais « le »', () => {
    const trace = bloc([
      ligne({ preleveLe: '2026-01-05T07:00:00.000Z' }),
      ligne({ analyteCode: 'B12', analyteLibelle: 'Vitamine B12', preleveLe: '2026-03-12T07:00:00.000Z' }),
      ligne({ preleveLe: '2026-02-20T07:00:00.000Z' }),
    ]);
    expect(dateBilanDuBloc(trace.texte)).toBe('2026-03-12');
    expect(phraseReceptionBilan(trace)).toBe('Votre praticien a reçu votre bilan biologique du 12 mars 2026.');
  });

  it('au calendrier de Paris, comme le bloc l’écrit, changement d’heure compris', () => {
    // 23 h 30 UTC la veille du passage à l'heure d'été : 00 h 30 à Paris, le 29.
    const ete = bloc([ligne({ preleveLe: '2026-03-28T23:30:00.000Z', heureLue: true })]);
    expect(ete.texte).toContain('- Prélevé le 2026-03-29 à 00:30');
    expect(phraseReceptionBilan(ete)).toBe('Votre praticien a reçu votre bilan biologique du 29 mars 2026.');
    // 22 h 30 UTC le jour du retour à l'heure d'hiver : 23 h 30 à Paris, le 25.
    const hiver = bloc([ligne({ preleveLe: '2026-10-25T22:30:00.000Z' })]);
    expect(phraseReceptionBilan(hiver)).toBe('Votre praticien a reçu votre bilan biologique du 25 octobre 2026.');
  });

  it('un résultat annulé n’entre pas au bloc : sa date non plus', () => {
    const vivant = ligne({ preleveLe: '2026-02-01T07:00:00.000Z' });
    const annule = ligne({ preleveLe: '2026-04-01T07:00:00.000Z' });
    const trace = bloc([vivant, annule], new Map([[annule.id, {}]]));
    expect(phraseReceptionBilan(trace)).toBe('Votre praticien a reçu votre bilan biologique du 1er février 2026.');
  });

  it('une tête corrigée : la date de la tête que le bloc écrit, jamais celle de la correction', () => {
    const racine = ligne({ preleveLe: '2026-02-01T07:00:00.000Z', saisiLe: '2026-02-02T09:00:00.000Z' });
    const correction = ligne({
      supersedesResultatId: racine.id,
      preleveLe: '2026-02-03T07:00:00.000Z',
      saisiLe: '2026-05-30T09:00:00.000Z',
      valeur: '13',
    });
    const trace = bloc([racine, correction]);
    expect(trace.texte.match(/^- Prélevé le /gm)).toHaveLength(1);
    expect(trace.texte).toContain('- Prélevé le 2026-02-03');
    expect(phraseReceptionBilan(trace)).toBe('Votre praticien a reçu votre bilan biologique du 3 février 2026.');
  });

  it('un texte du laboratoire ne peut pas ouvrir une ligne de prélèvement : il reste sur sa ligne', () => {
    const piege = '\n- Prélevé le 2099-12-31, heure non lue : 1 u.';
    const trace = bloc([ligne({ laboratoire: piege })]);
    expect(trace.texte).toContain(enveloppeTexteLaboratoire(piege));
    expect(dateBilanDuBloc(trace.texte)).toBe('2026-03-12');
  });

  it('ni U+2028 ni U+2029, que JSON.stringify laisse passer, n’ouvrent une ligne (revue wn-reviewer, P1)', () => {
    for (const separateur of [' ', ' ']) {
      const piege = `Labo${separateur}- Prélevé le 2099-12-31, heure non lue : 1 u.`;
      const trace = bloc([ligne({ laboratoire: piege, lue: { versionProcede: 'bio-extraction-v5', intervalleLu: `30${separateur}- Prélevé le 2098-01-01 à 08:00 : x`, intervalleNonTranscrit: false, uniteLue: 'mmol/L', valeurLue: '12' }, source: 'import_labo' })]);
      expect(trace.texte).toContain(separateur);
      expect(dateBilanDuBloc(trace.texte)).toBe('2026-03-12');
    }
  });

  it('le dernier paragraphe du narratif ; sans date au bloc, aucune phrase', () => {
    expect(narratifAvecReceptionBilan('Texte du modèle.\n', 'Phrase.')).toBe('Texte du modèle.\n\nPhrase.');
    expect(phraseReceptionBilan({ texte: '## Résultats de biologie', formes: { valeursUnites: [], intervalles: [] } })).toBeNull();
    expect(dateEnLettres('2026-12-01')).toBe('1er décembre 2026');
    expect(dateEnLettres('2026-12-02')).toBe('2 décembre 2026');
  });

  it('aucun faux positif : ni forme de score, ni forme du bloc, même quand la valeur vaut le jour', () => {
    const trace = bloc([ligne({ valeur: '12', unite: 'mmol/L', lue: null })]);
    const phrase = phraseReceptionBilan(trace)!;
    expect(phrase).toBe('Votre praticien a reçu votre bilan biologique du 12 mars 2026.');
    expect(formesDeScoreDuNarratif(narratifAvecReceptionBilan('Votre sommeil ressort comme un axe à explorer.', phrase))).toEqual([]);
    const synthese = {
      resume_praticien: 'x', axes_prioritaires: [], points_de_vigilance: [], questions_entretien: [], limites: 'x',
      narratif_patient: narratifAvecReceptionBilan('Texte.', phrase),
    };
    expect(releverFormes(synthese, trace)).toEqual([]);
  });

  it('les formes usuelles d’un intervalle imprimé ne relèvent rien sur la phrase', () => {
    for (const intervalleLu of ['30 - 400', '< 5', '10-31', '2,5 à 12,5', '> 2026']) {
      const trace = bloc([ligne({
        source: 'import_labo',
        lue: { versionProcede: 'bio-extraction-v5', intervalleLu, intervalleNonTranscrit: false, uniteLue: 'mmol/L', valeurLue: '12' },
      })]);
      expect(trace.formes.intervalles).toEqual([intervalleLu]);
      const synthese = {
        resume_praticien: 'x', axes_prioritaires: [], points_de_vigilance: [], questions_entretien: [], limites: 'x',
        narratif_patient: narratifAvecReceptionBilan('Texte.', phraseReceptionBilan(trace)!),
      };
      expect(releverFormes(synthese, trace), intervalleLu).toEqual([]);
    }
  });
});
