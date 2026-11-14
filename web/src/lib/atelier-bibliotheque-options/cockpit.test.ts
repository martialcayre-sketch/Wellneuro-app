import { describe, expect, it, vi } from 'vitest';

// La lecture des textes est injectée dans chaque cas ; le client de base n'est
// jamais appelé ici.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
import { cockpitOptionsActif } from './drapeau';
import { lireOptionsAuCockpit, optionsDesHypotheses } from './cockpit';
import type { AtelierOptions, RubriqueAffichee } from './lecture';
import type { ContexteAtelier } from './structure';

// Banc du cockpit de la bibliothèque des options ([[D-480]] §1, §8 ; BP-17
// PR 6). Identifiants et textes synthétiques : aucune option ni aucun texte
// réel au dépôt (D-480 §3, D-251 §4).

const LE = '2026-11-13T10:00:00.000Z';
const SHA = 'c'.repeat(64);
const RUBRIQUES = ['produit_statut_reglementaire', 'dose', 'duree', 'precautions', 'contre_indications', 'interactions', 'surveillance', 'critere_arret', 'role_praticien'];

const version = (texte: string) => ({
  id: `v-${texte.length}`,
  numero: 1,
  texte,
  texteSha256: SHA,
  auteur: 'responsable@exemple.fr',
  creeLe: LE,
  dernierActe: null,
  jeton: null,
  nombreVersions: 1,
});

const rubrique = (nom: string, autre: Partial<RubriqueAffichee> = {}): RubriqueAffichee => ({
  rubrique: nom,
  renvois: [],
  version: null,
  etat: { etat: 'vide' },
  etatActes: null,
  ...autre,
});

function atelier(etat: AtelierOptions['structure']['etat'] = 'signee'): AtelierOptions {
  const validee: Partial<RubriqueAffichee> = {
    renvois: ['WN-PE-0001@v1.0'],
    version: version('Texte validé synthétique.'),
    etat: { etat: 'validee', ordre: '2', le: LE, validateur: 'responsable@exemple.fr' },
  };
  const aValider: Partial<RubriqueAffichee> = { version: version('Texte non validé synthétique.'), etat: { etat: 'a_valider' } };
  const aRelire: Partial<RubriqueAffichee> = { version: version('Texte à relire synthétique.'), etat: { etat: 'a_relire' } };
  const retire: Partial<RubriqueAffichee> = {
    version: version('Texte retiré synthétique.'),
    etat: { etat: 'retiree', ordre: '3', le: LE, validateur: 'responsable@exemple.fr', motif: 'motif de banc' },
  };
  return {
    structure: { etat, empreinte: 'd'.repeat(64), nombreOptions: 3 },
    rubriques: RUBRIQUES,
    options: [
      // Déclarées hors de l'ordre alphabétique : le cockpit trie par identifiant.
      {
        id: 'OPT_BANC_B',
        hypothese: 'HYP_BANC_1',
        populations: ['POP_BANC'],
        rubriques: RUBRIQUES.map(r =>
          r === 'dose' ? rubrique(r, validee) : r === 'duree' ? rubrique(r, aValider) : r === 'precautions' ? rubrique(r, aRelire) : r === 'surveillance' ? rubrique(r, retire) : rubrique(r),
        ),
      },
      { id: 'OPT_BANC_A', hypothese: 'HYP_BANC_1', populations: ['POP_BANC'], rubriques: RUBRIQUES.map(r => rubrique(r)) },
      { id: 'OPT_BANC_C', hypothese: 'HYP_BANC_2', populations: ['POP_BANC'], rubriques: RUBRIQUES.map(r => rubrique(r)) },
    ],
    horsStructure: [],
  };
}

const contexte = (etatStructure: ContexteAtelier['etatStructure'] = 'signee'): ContexteAtelier => ({
  empreinteStructure: 'd'.repeat(64),
  etatStructure,
  options: [],
});

describe('drapeau du cockpit (WN_BIBLIOTHEQUE_OPTIONS_COCKPIT)', () => {
  it('seule la valeur exacte `true` l’allume', () => {
    expect(cockpitOptionsActif({ WN_BIBLIOTHEQUE_OPTIONS_COCKPIT: 'true' })).toBe(true);
    for (const v of [undefined, '', '1', 'oui', 'TRUE', 'true ']) expect(cockpitOptionsActif({ WN_BIBLIOTHEQUE_OPTIONS_COCKPIT: v })).toBe(false);
    // Le drapeau de l'atelier n'ouvre pas le cockpit.
    expect(cockpitOptionsActif({ WN_BIBLIOTHEQUE_OPTIONS_ATELIER: 'true' })).toBe(false);
  });
});

describe('options des hypothèses confirmées (pur)', () => {
  it('toutes les options de l’hypothèse confirmée, dans l’ordre des identifiants ; aucune d’une autre hypothèse', () => {
    const rendu = optionsDesHypotheses(atelier(), ['HYP_BANC_1'], true);
    expect(rendu).toMatchObject({ lecture: 'ok', etatStructure: 'signee' });
    if (rendu.lecture !== 'ok') throw new Error('lecture attendue');
    expect(rendu.hypotheses.map(h => h.hypotheseCode)).toEqual(['HYP_BANC_1']);
    expect(rendu.hypotheses[0].options.map(o => o.id)).toEqual(['OPT_BANC_A', 'OPT_BANC_B']);
  });

  it('seul un texte VALIDÉ sort, avec sa date ; les autres états ne montrent que leur nom', () => {
    const rendu = optionsDesHypotheses(atelier(), ['HYP_BANC_1'], false);
    if (rendu.lecture !== 'ok') throw new Error('lecture attendue');
    const b = rendu.hypotheses[0].options.find(o => o.id === 'OPT_BANC_B')!;
    const par = Object.fromEntries(b.rubriques.map(r => [r.rubrique, r]));
    expect(par.dose).toEqual({ rubrique: 'dose', renvois: ['WN-PE-0001@v1.0'], etat: 'validee', texte: 'Texte validé synthétique.', valideLe: LE });
    expect(par.duree).toMatchObject({ etat: 'a_valider', texte: null, valideLe: null });
    expect(par.precautions).toMatchObject({ etat: 'a_relire', texte: null });
    expect(par.surveillance).toMatchObject({ etat: 'retiree', texte: null });
    expect(par.interactions).toMatchObject({ etat: 'vide', texte: null });
    // Ni auteur, ni validateur, ni texte non validé ne sortent.
    const brut = JSON.stringify(rendu);
    expect(brut).not.toMatch(/responsable@exemple\.fr|non validé|à relire synthétique|retiré synthétique|motif de banc/);
  });

  it('une hypothèse confirmée sans option se rend vide, jamais omise ; les doublons ne se répètent pas', () => {
    const rendu = optionsDesHypotheses(atelier(), ['HYP_BANC_9', 'HYP_BANC_2', 'HYP_BANC_9'], false);
    if (rendu.lecture !== 'ok') throw new Error('lecture attendue');
    expect(rendu.hypotheses.map(h => [h.hypotheseCode, h.options.map(o => o.id)])).toEqual([
      ['HYP_BANC_2', ['OPT_BANC_C']],
      ['HYP_BANC_9', []],
    ]);
  });

  it.each([
    ['non_signee', false, 'non_signee'],
    ['non_signee', true, 'signature_rompue'],
    ['a_relire', true, 'a_relire'],
  ] as const)('structure %s (signature déclarée : %s) : état « %s », aucune option', (etat, declaree, attendu) => {
    expect(optionsDesHypotheses(atelier(etat), ['HYP_BANC_1'], declaree)).toEqual({ lecture: 'ok', etatStructure: attendu, hypotheses: [] });
  });
});

describe('lecture au cockpit', () => {
  const actif = () => true;

  it('drapeau éteint : `null`, rien n’est lu', async () => {
    const lire = vi.fn();
    expect(await lireOptionsAuCockpit(['HYP_BANC_1'], { lire, actif: () => false, contexte: () => contexte() })).toBeNull();
    expect(lire).not.toHaveBeenCalled();
  });

  it('structure non signée ou aucune hypothèse confirmée : l’état seul, sans lecture des textes', async () => {
    const lire = vi.fn();
    expect(await lireOptionsAuCockpit(['HYP_BANC_1'], { lire, actif, contexte: () => contexte('non_signee'), signatureDeclaree: () => false })).toEqual({
      lecture: 'ok',
      etatStructure: 'non_signee',
      hypotheses: [],
    });
    expect(await lireOptionsAuCockpit([], { lire, actif, contexte: () => contexte(), signatureDeclaree: () => true })).toEqual({
      lecture: 'ok',
      etatStructure: 'signee',
      hypotheses: [],
    });
    expect(lire).not.toHaveBeenCalled();
  });

  it('structure signée : lit l’atelier sur le contexte du jour et assemble', async () => {
    const ctx = contexte();
    const lire = vi.fn(async () => atelier());
    const rendu = await lireOptionsAuCockpit(['HYP_BANC_2'], { lire, actif, contexte: () => ctx, signatureDeclaree: () => true });
    expect(lire).toHaveBeenCalledWith(ctx);
    expect(rendu).toMatchObject({ lecture: 'ok', hypotheses: [{ hypotheseCode: 'HYP_BANC_2', options: [{ id: 'OPT_BANC_C' }] }] });
  });

  it('un échec de lecture se dit (`echec`), sans lever ni journaliser de texte', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    const rendu = await lireOptionsAuCockpit(['HYP_BANC_1'], {
      lire: async () => {
        throw new Error('Texte synthétique qui ne doit pas sortir');
      },
      actif,
      contexte: () => contexte(),
      signatureDeclaree: () => true,
    });
    expect(rendu).toEqual({ lecture: 'echec' });
    expect(JSON.stringify(journal.mock.calls)).not.toMatch(/synthétique/);
    journal.mockRestore();
  });

  it('dépôt réel : structure vide et non signée, drapeau éteint par défaut', async () => {
    const avant = process.env.WN_BIBLIOTHEQUE_OPTIONS_COCKPIT;
    delete process.env.WN_BIBLIOTHEQUE_OPTIONS_COCKPIT;
    try {
      expect(await lireOptionsAuCockpit(['HYP_BANC_1'])).toBeNull();
      process.env.WN_BIBLIOTHEQUE_OPTIONS_COCKPIT = 'true';
      expect(await lireOptionsAuCockpit(['HYP_BANC_1'])).toEqual({ lecture: 'ok', etatStructure: 'non_signee', hypotheses: [] });
    } finally {
      if (avant === undefined) delete process.env.WN_BIBLIOTHEQUE_OPTIONS_COCKPIT;
      else process.env.WN_BIBLIOTHEQUE_OPTIONS_COCKPIT = avant;
    }
  });
});
