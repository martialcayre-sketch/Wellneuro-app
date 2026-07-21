import { describe, expect, it } from 'vitest';
import { lienPermanentHonore, lireBascule } from './lienPermanent';

const AVANT = new Date('2026-10-20T23:59:59.000Z');
const PILE = new Date('2026-10-21T00:00:00.000Z');
const APRES = new Date('2026-10-21T00:00:01.000Z');

describe('lireBascule', () => {
  it('variable absente ou vide : aucune bascule', () => {
    expect(lireBascule(undefined)).toEqual({ etat: 'aucune' });
    expect(lireBascule('')).toEqual({ etat: 'aucune' });
    expect(lireBascule('   ')).toEqual({ etat: 'aucune' });
  });

  it('date ISO, avec ou sans heure', () => {
    expect(lireBascule('2026-10-21')).toEqual({ etat: 'programmee', fin: PILE });
    expect(lireBascule('2026-10-21T00:00:00.000Z')).toEqual({ etat: 'programmee', fin: PILE });
  });

  // Une faute de frappe ne doit pas verrouiller la production, mais elle ne doit
  // pas non plus disparaître : l'état est distinct de « aucune » pour que
  // l'appelant puisse le signaler.
  it('valeur illisible : signalée, et distincte d’une absence', () => {
    expect(lireBascule('bientôt')).toEqual({ etat: 'invalide', valeur: 'bientôt' });
    expect(lireBascule('21/10/2026')).toEqual({ etat: 'invalide', valeur: '21/10/2026' });
  });
});

describe('lienPermanentHonore', () => {
  it('sans bascule, le lien est honoré — c’est le comportement actuel', () => {
    expect(lienPermanentHonore(APRES, { etat: 'aucune' })).toBe(true);
  });

  // Le point de la conception : fail-OPEN. Une bascule illisible ne met
  // personne dehors.
  it('bascule illisible : le lien reste honoré', () => {
    expect(lienPermanentHonore(APRES, { etat: 'invalide', valeur: 'bientôt' })).toBe(true);
  });

  it('avant la date, honoré ; à la date et après, refusé', () => {
    const bascule = lireBascule('2026-10-21');
    expect(lienPermanentHonore(AVANT, bascule)).toBe(true);
    expect(lienPermanentHonore(PILE, bascule)).toBe(false);
    expect(lienPermanentHonore(APRES, bascule)).toBe(false);
  });

  it('la bascule est globale, elle ne dépend d’aucun patient', () => {
    // Rien dans la signature ne permet de basculer un patient et pas un autre :
    // c'est voulu. Une bascule par dossier serait une révocation, qui existe
    // déjà (`access_token_revoked`) et n'est pas le sujet.
    expect(lienPermanentHonore.length).toBeLessThanOrEqual(2);
  });
});
