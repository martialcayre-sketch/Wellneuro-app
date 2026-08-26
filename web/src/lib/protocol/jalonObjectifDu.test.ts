import { describe, expect, it } from 'vitest';

import { JOURS_JALON, TOLERANCE_JOURS_JALON } from '@/lib/equilibre/constants';
import { ANCRE_JALON, JALONS_OBJECTIF } from '@/lib/praticien/objectifNegocie';
import { jalonObjectifDu } from './jalonObjectifDu';

const JOUR_MS = 24 * 60 * 60 * 1000;
const T0 = new Date('2026-01-01T09:00:00.000Z');

/** L'instant situé `jours` après le T0 du cycle. */
function apresT0(jours: number): Date {
  return new Date(T0.getTime() + jours * JOUR_MS);
}

describe('jalonObjectifDu — quelle étape le patient peut renseigner', () => {
  it('sans cycle confirmé, AUCUNE étape — et surtout pas `T0`', () => {
    const verdict = jalonObjectifDu(null, apresT0(0));
    expect(verdict.statut).toBe('aucune');
    // La distinction qui compte : `resoudreJalonDu` rend `T0` dans ce cas.
    // Ici, `T0` ne peut pas sortir — il n'est pas une étape.
    expect(JSON.stringify(verdict)).not.toContain(ANCRE_JALON);
  });

  it('une date d’ancre illisible ne propose rien, sans lever', () => {
    expect(jalonObjectifDu(new Date('pas une date'), apresT0(21)).statut).toBe('aucune');
  });

  it('au centre de chaque fenêtre, l’étape correspondante est ouverte', () => {
    for (const jalon of JALONS_OBJECTIF) {
      expect(jalonObjectifDu(T0, apresT0(JOURS_JALON[jalon]))).toMatchObject({
        statut: 'ouverte',
        jalon,
      });
    }
  });

  it('les DEUX BORNES de la tolérance sont dedans, le jour d’après ne l’est pas', () => {
    const centre = JOURS_JALON.J21;
    expect(jalonObjectifDu(T0, apresT0(centre - TOLERANCE_JOURS_JALON))).toMatchObject({
      statut: 'ouverte',
      jalon: 'J21',
    });
    expect(jalonObjectifDu(T0, apresT0(centre + TOLERANCE_JOURS_JALON))).toMatchObject({
      statut: 'ouverte',
      jalon: 'J21',
    });
    expect(jalonObjectifDu(T0, apresT0(centre - TOLERANCE_JOURS_JALON - 1)).statut).toBe('aucune');
    expect(jalonObjectifDu(T0, apresT0(centre + TOLERANCE_JOURS_JALON + 1)).statut).toBe('aucune');
  });

  it('HORS FENÊTRE, RIEN — pas même l’étape la plus proche', () => {
    // Le troisième jour, aucune étape : proposer J21 « puisqu'il approche »
    // daterait un récit d'un moment que le patient n'a pas vécu.
    const verdict = jalonObjectifDu(T0, apresT0(3));
    expect(verdict.statut).toBe('aucune');
    if (verdict.statut !== 'aucune') return;
    expect(verdict.prochainJalon).toBe('J21');
    expect(verdict.prochaineOuverture).toBe(
      new Date(T0.getTime() + (JOURS_JALON.J21 - TOLERANCE_JOURS_JALON) * JOUR_MS).toISOString(),
    );
  });

  it('après la dernière fenêtre, le motif ne reproche rien', () => {
    const verdict = jalonObjectifDu(T0, apresT0(JOURS_JALON.J90 + TOLERANCE_JOURS_JALON + 30));
    expect(verdict.statut).toBe('aucune');
    if (verdict.statut !== 'aucune') return;

    expect(verdict.prochainJalon).toBeUndefined();
    // `DC-24` : un silence n'est pas un manquement. Le libellé ne doit porter
    // aucun mot de reproche ni de retard.
    for (const reproche of ['manqué', 'oubli', 'retard', 'aurait dû', 'raté']) {
      expect(verdict.motif.toLowerCase()).not.toContain(reproche);
    }
  });

  it('une étape déjà renseignée reste ouverte — répondre deux fois est permis', () => {
    // La fenêtre ne dépend QUE du temps. Aucune ligne existante ne la ferme :
    // c'est `D-111` §5, et c'est aussi ce qui distingue cette fonction de
    // `resoudreJalonDu`, qui retire les jalons déjà confirmés.
    expect(jalonObjectifDu(T0, apresT0(JOURS_JALON.J21))).toMatchObject({ statut: 'ouverte' });
    expect(jalonObjectifDu(T0, apresT0(JOURS_JALON.J21))).toMatchObject({ statut: 'ouverte' });
  });

  it('les fenêtres servies sont celles des constantes, pas des nombres recopiés', () => {
    const verdict = jalonObjectifDu(T0, apresT0(JOURS_JALON.J42));
    expect(verdict.statut).toBe('ouverte');
    if (verdict.statut !== 'ouverte') return;

    expect(verdict.ouvertLe).toBe(
      new Date(T0.getTime() + (JOURS_JALON.J42 - TOLERANCE_JOURS_JALON) * JOUR_MS).toISOString(),
    );
    expect(verdict.fermeLe).toBe(
      new Date(T0.getTime() + (JOURS_JALON.J42 + TOLERANCE_JOURS_JALON) * JOUR_MS).toISOString(),
    );
  });
});
