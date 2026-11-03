// @vitest-environment jsdom
import { existsSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  ENTREES_AUTRES_ESPACES,
  GROUPES_AUTRES_ESPACES,
  entreesServies,
  hrefEntree,
  useEtatsSondes,
  type CleSonde,
  type EtatsSondes,
} from './entreesAutresEspaces';

// Lot L1 de l'audit « rails et menus » : la liste déclarée une fois. Ces bancs
// épinglent les libellés, segments, groupes et conditions TELS QU'ILS SONT
// SERVIS au 2026-11-03 ; un changement de libellé ou d'ordre doit les rougir.

const RACINE_WEB = path.resolve(__dirname, '../../../..');

const ATTENDU = [
  ['bilan', 'Consulter mon bilan', 'bilan', 'recu', 'bilanConsultable'],
  ['fiches', 'Fiches remises par mon praticien', 'fiches', 'recu', 'sonde'],
  ['bibliotheque', 'Ma bibliothèque', 'bibliotheque', 'recu', 'sonde'],
  ['courrierMedecin', 'Courrier pour votre médecin', 'courrier-medecin', 'recu', 'sonde'],
  ['courrierComplement', 'Courrier à remettre à votre médecin', 'courrier-complement', 'recu', 'sonde'],
  ['pourVotreMedecin', 'Pour votre médecin', 'pour-votre-medecin', 'recu', 'sonde'],
  ['compteRendu', 'Transmettre un compte rendu d’analyses', 'comptes-rendus', 'transmis', 'sonde'],
  ['depot', 'Déposer un document', 'documents', 'transmis', 'sonde'],
  ['renseignements', 'Ma fiche de renseignements', 'renseignements', 'transmis', 'sonde'],
  ['carnet', 'Ouvrir Mon carnet alimentaire', 'alimentation', 'au_jour_le_jour', 'aucune'],
  ['suivi', 'Ouvrir mes rendez-vous de suivi', 'suivi', 'au_jour_le_jour', 'aucune'],
  ['echanges', 'Ouvrir mes échanges', 'echanges', 'avec_mon_praticien', 'sonde'],
  ['dossier', 'Ouvrir mon dossier à deux voix', 'dossier', 'avec_mon_praticien', 'sonde'],
] as const;

const SONDES: CleSonde[] = [
  'fiches',
  'bibliotheque',
  'courrierMedecin',
  'courrierComplement',
  'pourVotreMedecin',
  'compteRendu',
  'depot',
  'renseignements',
  'echanges',
  'dossier',
];

describe('ENTREES_AUTRES_ESPACES — la liste exacte', () => {
  it('treize emplacements, dans l’ordre actuel du hub, libellés servis', () => {
    expect(ENTREES_AUTRES_ESPACES.map(e => [e.cle, e.libelle, e.segment, e.groupe, e.condition])).toEqual(
      ATTENDU.map(ligne => [...ligne]),
    );
  });

  it('dix entrées sondées, trois écrites dans le JSX (bilan, carnet, suivi)', () => {
    expect(ENTREES_AUTRES_ESPACES.filter(e => e.condition === 'sonde').map(e => e.cle)).toEqual(SONDES);
    expect(ENTREES_AUTRES_ESPACES.filter(e => e.condition !== 'sonde').map(e => e.cle)).toEqual([
      'bilan',
      'carnet',
      'suivi',
    ]);
  });

  it('chaque clé, chaque libellé, chaque segment une seule fois', () => {
    for (const champ of ['cle', 'libelle', 'segment'] as const) {
      const valeurs = ENTREES_AUTRES_ESPACES.map(e => e[champ]);
      expect(new Set(valeurs).size).toBe(valeurs.length);
    }
  });

  it('href : chemin absolu sous le segment du patient', () => {
    expect(ENTREES_AUTRES_ESPACES.map(e => hrefEntree('TOK', e))).toEqual(
      ATTENDU.map(([, , segment]) => `/portail/TOK/${segment}`),
    );
  });

  it('garde fs : chaque segment a un page.tsx sous portail/[token]', () => {
    const manquants = ENTREES_AUTRES_ESPACES.filter(
      e => !existsSync(path.join(RACINE_WEB, 'src/app/portail/[token]', e.segment, 'page.tsx')),
    ).map(e => e.segment);
    expect(manquants).toEqual([]);
  });

  it('garde fs : la garde rougit sur un segment inventé', () => {
    expect(existsSync(path.join(RACINE_WEB, 'src/app/portail/[token]', 'segment-invente', 'page.tsx'))).toBe(false);
    expect(existsSync(path.join(RACINE_WEB, 'src/app/portail/[token]', 'questionnaires', 'page.tsx'))).toBe(true);
  });
});

describe('Groupes de D-423 §2 — portés, pas encore rendus', () => {
  it('quatre noms acceptés mot pour mot, dans l’ordre de la décision', () => {
    expect(GROUPES_AUTRES_ESPACES.map(g => g.libelle)).toEqual([
      'Au jour le jour',
      "Ce que j'ai reçu",
      'Ce que je transmets',
      'Avec mon praticien',
    ]);
  });

  it('les entrées de chaque groupe sont celles de D-423 §2', () => {
    const parGroupe = Object.fromEntries(
      GROUPES_AUTRES_ESPACES.map(g => [g.id, ENTREES_AUTRES_ESPACES.filter(e => e.groupe === g.id).map(e => e.cle).sort()]),
    );
    expect(parGroupe).toEqual({
      au_jour_le_jour: ['carnet', 'suivi'],
      recu: ['bibliotheque', 'bilan', 'courrierComplement', 'courrierMedecin', 'fiches', 'pourVotreMedecin'],
      transmis: ['compteRendu', 'depot', 'renseignements'],
      avec_mon_praticien: ['dossier', 'echanges'],
    });
  });
});

describe('entreesServies', () => {
  const tout = (valeur: boolean): EtatsSondes => Object.fromEntries(SONDES.map(c => [c, valeur]));

  it('sondes fermées, bilan non consultable : carnet et suivi seuls', () => {
    expect(entreesServies(tout(false), { bilanConsultable: false }).map(e => e.cle)).toEqual(['carnet', 'suivi']);
  });

  it('sondes sans réponse : fermées (fail-closed)', () => {
    expect(entreesServies({}, { bilanConsultable: false }).map(e => e.cle)).toEqual(['carnet', 'suivi']);
  });

  it('sondes ouvertes, bilan consultable : les treize, dans l’ordre', () => {
    expect(entreesServies(tout(true), { bilanConsultable: true }).map(e => e.cle)).toEqual(ATTENDU.map(([cle]) => cle));
  });

  it('n’ajoute aucune règle : l’exclusion fiches / bibliothèque reste aux sondes', () => {
    const etats = { ...tout(true), fiches: false };
    expect(entreesServies(etats, { bilanConsultable: false }).map(e => e.cle)).not.toContain('fiches');
    expect(entreesServies(etats, { bilanConsultable: false }).map(e => e.cle)).toContain('bibliotheque');
  });
});

describe('useEtatsSondes', () => {
  it('rappels stables d’un rendu à l’autre, état reporté par clé', () => {
    const { result, rerender } = renderHook(() => useEtatsSondes());
    const premiers = result.current.rapporteurs;
    act(() => premiers.echanges(true));
    act(() => premiers.depot(false));
    rerender();
    expect(result.current.rapporteurs).toBe(premiers);
    expect(result.current.etats).toEqual({ echanges: true, depot: false });
  });

  it('un même état reporté deux fois ne crée pas un nouvel objet', () => {
    const { result } = renderHook(() => useEtatsSondes());
    act(() => result.current.rapporteurs.dossier(true));
    const avant = result.current.etats;
    act(() => result.current.rapporteurs.dossier(true));
    expect(result.current.etats).toBe(avant);
  });
});
