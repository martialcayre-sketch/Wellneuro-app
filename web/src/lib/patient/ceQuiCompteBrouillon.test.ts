// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ecrireBrouillonCeQuiCompte,
  effacerBrouillonCeQuiCompte,
  lireBrouillonCeQuiCompte,
} from './ceQuiCompteBrouillon';
import { aDesDonneesPatientLocales, effacerDonneesPatientLocales } from '@/lib/portail/stockageAppareil';

const CLE = 'wellneuro:ce-qui-compte-brouillon:v1:PAT_1';
const CLE_DATE = 'wellneuro:ce-qui-compte-brouillon-meta:v1:PAT_1';

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('brouillon local de « Ce qui compte » (t06)', () => {
  it('relit ce qui a été écrit, sous l’identité de la session', () => {
    ecrireBrouillonCeQuiCompte('PAT_1', { texte: 'Dormir mieux.', saisiLe: '2026-10-21' });
    expect(lireBrouillonCeQuiCompte('PAT_1')).toEqual({ texte: 'Dormir mieux.', saisiLe: '2026-10-21' });
    expect(window.localStorage.getItem(CLE_DATE)).not.toBeNull();
  });

  it('un autre patient sur le même appareil ne le relit pas', () => {
    ecrireBrouillonCeQuiCompte('PAT_1', { texte: 'Dormir mieux.', saisiLe: '' });
    expect(lireBrouillonCeQuiCompte('PAT_2')).toBeNull();
  });

  it('sans identité, rien ne s’écrit ni ne se lit', () => {
    ecrireBrouillonCeQuiCompte(null, { texte: 'Dormir mieux.', saisiLe: '' });
    expect(window.localStorage.length).toBe(0);
    expect(lireBrouillonCeQuiCompte(null)).toBeNull();
  });

  it('un brouillon vidé s’efface au lieu de s’écrire', () => {
    ecrireBrouillonCeQuiCompte('PAT_1', { texte: 'Dormir mieux.', saisiLe: '' });
    ecrireBrouillonCeQuiCompte('PAT_1', { texte: '   ', saisiLe: '' });
    expect(window.localStorage.getItem(CLE)).toBeNull();
    expect(window.localStorage.getItem(CLE_DATE)).toBeNull();
  });

  it('effacer retire le brouillon et sa date', () => {
    ecrireBrouillonCeQuiCompte('PAT_1', { texte: 'Dormir mieux.', saisiLe: '' });
    effacerBrouillonCeQuiCompte('PAT_1');
    expect(window.localStorage.length).toBe(0);
  });

  it('un brouillon prouvé plus vieux que 30 jours est purgé à la lecture', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T10:00:00Z'));
    ecrireBrouillonCeQuiCompte('PAT_1', { texte: 'Dormir mieux.', saisiLe: '' });
    vi.setSystemTime(new Date('2026-10-02T10:00:01Z'));
    expect(lireBrouillonCeQuiCompte('PAT_1')).toBeNull();
    expect(window.localStorage.getItem(CLE)).toBeNull();
  });

  it('un brouillon sans date n’est pas détruit sur supposition', () => {
    window.localStorage.setItem(CLE, JSON.stringify({ texte: 'Dormir mieux.', saisiLe: '' }));
    expect(lireBrouillonCeQuiCompte('PAT_1')).toEqual({ texte: 'Dormir mieux.', saisiLe: '' });
  });

  it('une forme inattendue est ignorée', () => {
    window.localStorage.setItem(CLE, JSON.stringify({ texte: 42 }));
    expect(lireBrouillonCeQuiCompte('PAT_1')).toBeNull();
    window.localStorage.setItem(CLE, '{pas du json');
    expect(lireBrouillonCeQuiCompte('PAT_1')).toBeNull();
  });
});

// « Se déconnecter » doit annoncer puis emporter ce brouillon : sa famille est
// inscrite à `FAMILLES_DONNEES_PATIENT` (revue CodeRabbit de #1617).
describe('brouillon « Ce qui compte » et déconnexion', () => {
  it('un brouillon non vide compte comme du travail à perdre, et la déconnexion l’emporte', () => {
    ecrireBrouillonCeQuiCompte('PAT_1', { texte: 'Dormir mieux.', saisiLe: '' });
    expect(aDesDonneesPatientLocales()).toBe(true);
    effacerDonneesPatientLocales();
    expect(window.localStorage.getItem(CLE)).toBeNull();
    expect(window.localStorage.getItem(CLE_DATE)).toBeNull();
  });

  it('une date orpheline n’annonce aucune perte', () => {
    window.localStorage.setItem(CLE_DATE, new Date().toISOString());
    expect(aDesDonneesPatientLocales()).toBe(false);
  });
});
