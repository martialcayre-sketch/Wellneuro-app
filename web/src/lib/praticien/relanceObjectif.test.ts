import { describe, expect, it } from 'vitest';

import {
  JOURS_ENTRE_RELANCES_OBJECTIF,
  deciderRelance,
  type EntreeRelance,
} from './relanceObjectif';

const MAINTENANT = new Date('2026-09-10T12:00:00Z');
const ilYA = (jours: number) =>
  new Date(MAINTENANT.getTime() - jours * 24 * 60 * 60 * 1000);

const base: EntreeRelance = {
  tetesActives: 1,
  etatTeteActive: 'en_attente',
  envoisPrecedents: [],
  maintenant: MAINTENANT,
};

describe('deciderRelance — renvoyer le courrier d’un objectif déjà écrit', () => {
  it('relance quand un objectif attend une réponse et qu’aucun courrier n’est parti', () => {
    expect(deciderRelance(base).ok).toBe(true);
  });

  it('sans objectif courant, il n’y a rien à annoncer', () => {
    const d = deciderRelance({ ...base, tetesActives: 0, etatTeteActive: null });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.raison).toBe('aucun_objectif');
  });

  it('DEUX TÊTES : relancer mènerait le patient à un 409 — le départage vient d’abord', () => {
    const d = deciderRelance({ ...base, tetesActives: 2 });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.raison).toBe('objectif_discordant');
  });

  it('un patient qui S’EST DÉJÀ PRONONCÉ ne se relance pas — ce serait dire qu’on ne l’a pas lu', () => {
    for (const etat of ['ratifie', 'conteste', 'dit_autrement'] as const) {
      const d = deciderRelance({ ...base, etatTeteActive: etat });
      expect(d.ok, etat).toBe(false);
      if (!d.ok) expect(d.raison).toBe('deja_repondu');
    }
  });

  it('« dit autrement » COMPTE comme une réponse : le patient a écrit sa version', () => {
    const d = deciderRelance({ ...base, etatTeteActive: 'dit_autrement' });
    expect(d.ok).toBe(false);
  });

  it('la cadence mord, et elle dit QUAND ce sera possible', () => {
    const d = deciderRelance({ ...base, envoisPrecedents: [{ enregistreLe: ilYA(1) }] });
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(d.raison).toBe('cadence');
      expect(d.possibleLe?.toISOString()).toBe(
        new Date(ilYA(1).getTime() + JOURS_ENTRE_RELANCES_OBJECTIF * 86400000).toISOString(),
      );
    }
  });

  it('passé le délai, la relance redevient possible', () => {
    const d = deciderRelance({
      ...base,
      envoisPrecedents: [{ enregistreLe: ilYA(JOURS_ENTRE_RELANCES_OBJECTIF + 0.01) }],
    });
    expect(d.ok).toBe(true);
  });

  it('LE PLUS RÉCENT DÉCIDE, quel que soit l’ordre reçu — la garde ne dépend d’aucun `orderBy`', () => {
    // Un vieil envoi placé EN TÊTE ne doit pas rouvrir la porte : se fier au
    // premier élément ferait dépendre une cadence d'un tri qu'une lecture
    // voisine pourrait changer sans le savoir.
    const d = deciderRelance({
      ...base,
      envoisPrecedents: [{ enregistreLe: ilYA(30) }, { enregistreLe: ilYA(1) }],
    });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.raison).toBe('cadence');
  });

  it('la borne est FRANCHE : exactement à l’échéance, la relance passe', () => {
    const d = deciderRelance({
      ...base,
      envoisPrecedents: [{ enregistreLe: ilYA(JOURS_ENTRE_RELANCES_OBJECTIF) }],
    });
    expect(d.ok).toBe(true);
  });
});
