import { describe, expect, it } from 'vitest';
import { libelleTemporel } from './horodatage';

const MAINTENANT = new Date('2026-07-15T10:00:00');

describe('libelleTemporel', () => {
  it('affiche l’heure pour un événement du jour', () => {
    expect(libelleTemporel('2026-07-15T09:30:00', MAINTENANT)).toEqual({
      texte: '09:30',
      estAujourdhui: true,
    });
  });

  it('reste dans le jour civil : 23:59 est aujourd’hui, 00:01 demain ne l’est pas', () => {
    expect(libelleTemporel('2026-07-15T23:59:00', MAINTENANT).estAujourdhui).toBe(true);
    expect(libelleTemporel('2026-07-16T00:01:00', MAINTENANT).estAujourdhui).toBe(false);
  });

  it('affiche « hier » pour la veille — y compris une échéance stockée à minuit', () => {
    expect(libelleTemporel('2026-07-14T23:00:00', MAINTENANT).texte).toBe('hier');
    // Cas des assignations en retard : dateLimite posée à 00:00:00.
    expect(libelleTemporel('2026-07-14T00:00:00', MAINTENANT).texte).toBe('hier');
  });

  it('affiche une date courte dans l’année, avec l’année au-delà', () => {
    expect(libelleTemporel('2026-07-01T08:00:00', MAINTENANT).texte).toBe('1 juil.');
    expect(libelleTemporel('2025-11-03T08:00:00', MAINTENANT).texte).toBe('3 nov. 2025');
  });

  it('rend « — » sans affirmer aujourd’hui pour une date absente ou illisible', () => {
    expect(libelleTemporel(null, MAINTENANT)).toEqual({ texte: '—', estAujourdhui: false });
    expect(libelleTemporel('pas-une-date', MAINTENANT)).toEqual({ texte: '—', estAujourdhui: false });
  });
});
