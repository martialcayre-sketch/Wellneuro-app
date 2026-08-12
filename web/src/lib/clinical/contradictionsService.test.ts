import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContradictionFinding } from './contradictionFinding';

// Ce banc garde les deux endroits où un constat déterministe peut devenir faux
// en changeant de forme : le VERROU (qui décide s'il sort) et la CONVERSION
// (qui décide de ce qu'il devient). Les deux sont fail-closed.

type Discordance = Extract<ContradictionFinding, { forme: 'DISCORDANCE' }>;

const constat = (surcharge: Partial<Discordance> = {}): Discordance => ({
  forme: 'DISCORDANCE',
  id: 'C-STR',
  audience: 'praticien_seul',
  sources: [
    {
      type: 'instrument',
      idQuestionnaire: 'Q_MOD_01',
      reponseId: 'rep-mod-1',
      dateReponse: '2026-08-10T09:00:00.000Z',
    },
  ],
  description: 'Signal fonctionnel non confirmé par les instruments spécifiques.',
  importance: 'useful_not_urgent',
  hypotheses: ['Une charge de stress réelle que les échelles ne captent pas.'],
  actionSuggeree: 'Clarifier en entretien.',
  resolution: { statut: 'ouverte' },
  justificationClaims: [{ claimId: 'WN-CL-0238-002', versionClaim: 'v1.0' }],
  regleId: 'C-STR',
  limitations: ['Un questionnaire isolé ne suffit pas à conclure.'],
  ecartJoursEntreSources: 151,
  recoupementJustifie: 'Recoupe R2-STR-01.',
  ...surcharge,
});

/** Recharge le module pour que le verrou relise `CONTRADICTIONS_METADATA`. */
async function service(metadata: { validationExterne: boolean; dateValidation: string | null; claimsSource: unknown[] }) {
  vi.resetModules();
  vi.doMock('./contradictionsV1', async () => {
    const reel = await vi.importActual<typeof import('./contradictionsV1')>('./contradictionsV1');
    return { ...reel, CONTRADICTIONS_METADATA: { ...reel.CONTRADICTIONS_METADATA, ...metadata } };
  });
  return import('./contradictionsService');
}

const SIGNEE = { validationExterne: true, dateValidation: '2026-09-01', claimsSource: [{ claimId: 'x' }] };

beforeEach(() => {
  delete process.env.WN_ENABLE_CONTRADICTIONS_NNPP2;
});

afterEach(() => {
  vi.doUnmock('./contradictionsV1');
  vi.resetModules();
});

describe('contradictionsActives — le double verrou', () => {
  it('table livrée (NON signée) + drapeau allumé ⇒ éteint', async () => {
    // L'état réel du dépôt à la livraison du LOT-01. Ce cas est le plus
    // important du fichier : il dit que ce lot n'allume rien.
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { contradictionsActives } = await import('./contradictionsService');
    expect(contradictionsActives()).toBe(false);
  });

  it('table signée mais drapeau éteint ⇒ éteint', async () => {
    const { contradictionsActives } = await service(SIGNEE);
    expect(contradictionsActives()).toBe(false);
  });

  it('table signée + drapeau allumé ⇒ allumé', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { contradictionsActives } = await service(SIGNEE);
    expect(contradictionsActives()).toBe(true);
  });

  it('un `validationExterne` seul ne suffit pas — la signature est auto-portante', async () => {
    // Sans ce cas, un flip d'un unique booléen ouvrirait le verrou. Une table
    // réellement signée porte AUSSI sa date et les claims qui la fondent.
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const sansDate = await service({ ...SIGNEE, dateValidation: null });
    expect(sansDate.contradictionsActives()).toBe(false);

    const sansClaims = await service({ ...SIGNEE, claimsSource: [] });
    expect(sansClaims.contradictionsActives()).toBe(false);
  });

  it('drapeau à une autre valeur que « 1 » ⇒ éteint', async () => {
    for (const valeur of ['true', 'oui', '0', '']) {
      process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = valeur;
      const { contradictionsActives } = await service(SIGNEE);
      expect(contradictionsActives()).toBe(false);
    }
  });
});

describe('contradictionsPourAffichage — le verrou porte aussi sur la conversion', () => {
  it('verrou fermé ⇒ liste vide, même avec des constats en entrée', async () => {
    const { contradictionsPourAffichage } = await import('./contradictionsService');
    expect(contradictionsPourAffichage([constat()])).toEqual([]);
  });

  it('verrou ouvert ⇒ le constat est converti, sans perdre ses limites', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { contradictionsPourAffichage } = await service(SIGNEE);
    const [affiche] = contradictionsPourAffichage([constat()]);

    expect(affiche.description).toBe('Signal fonctionnel non confirmé par les instruments spécifiques.');
    // Les limites suivent le constat jusqu'à l'écran : `DC-14`, `DC-25`,
    // `DC-28` — une conclusion se réduit, elle ne se replie pas en route.
    expect(affiche.limitations).toEqual(['Un questionnaire isolé ne suffit pas à conclure.']);
    expect(affiche.recoupementJustifie).toBe('Recoupe R2-STR-01.');
  });

  it('AUCUN champ de certitude n’apparaît sur l’objet converti', async () => {
    // Le motif pour lequel ce type existe séparément : convertir vers
    // `DiscordanceFinding` aurait forcé à inventer un `confidence`, dont
    // l'énumération ne propose que des degrés (`solide`, `probable`,
    // `fragile`, `à_documenter`) et aucune valeur « non applicable ».
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { contradictionsPourAffichage } = await service(SIGNEE);
    const [affiche] = contradictionsPourAffichage([constat()]);

    for (const cle of Object.keys(affiche)) {
      expect(cle.toLowerCase()).not.toMatch(/confian|confidence|certitud|certain|probabil|vraisembl|fiabilit|score/);
    }
  });
});

describe('contradictionsPourAffichage — la traçabilité survit à la conversion', () => {
  beforeEach(() => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
  });

  it('les passations confrontées sont NOMMÉES et DATÉES', async () => {
    // Le trou trouvé en revue : la première conversion jetait `sources`, donc le
    // praticien lisait une affirmation qu'il ne pouvait pas ouvrir
    // (`DC-34`, `DC-35`).
    const { contradictionsPourAffichage } = await service(SIGNEE);
    const [affiche] = contradictionsPourAffichage([constat({
      sources: [
        { type: 'instrument', idQuestionnaire: 'Q_STR_04', reponseId: 'r2', dateReponse: '2026-08-10T09:00:00.000Z' },
        { type: 'instrument', idQuestionnaire: 'Q_MOD_01', reponseId: 'r1', dateReponse: '2026-03-12T09:00:00.000Z' },
      ],
    })]);

    // Triées par date : le praticien lit une chronologie.
    expect(affiche.passations).toEqual([
      { idQuestionnaire: 'Q_MOD_01', date: '2026-03-12' },
      { idQuestionnaire: 'Q_STR_04', date: '2026-08-10' },
    ]);
  });

  it('les claims fondateurs survivent : sans eux rien n’est remontable', async () => {
    const { contradictionsPourAffichage } = await service(SIGNEE);
    const [affiche] = contradictionsPourAffichage([constat()]);
    expect(affiche.claims).toEqual([{ claimId: 'WN-CL-0238-002', versionClaim: 'v1.0' }]);
  });

  it('deux sous-scores du MÊME questionnaire ne font qu’une passation à l’écran', async () => {
    // C-STR interroge `Q_STR_04` deux fois. Afficher deux fois la même
    // passation ferait croire à deux mesures.
    const { contradictionsPourAffichage } = await service(SIGNEE);
    const [affiche] = contradictionsPourAffichage([constat({
      sources: [
        { type: 'instrument', idQuestionnaire: 'Q_STR_04', sousScore: 'D', reponseId: 'r1', dateReponse: '2026-08-10T09:00:00.000Z' },
        { type: 'instrument', idQuestionnaire: 'Q_STR_04', sousScore: 'S', reponseId: 'r1', dateReponse: '2026-08-10T09:00:00.000Z' },
      ],
    })]);
    expect(affiche.passations).toHaveLength(1);
  });

  it('TROIS passations : toutes nommées, aucune formule au duel', async () => {
    // Le défaut relevé en revue : la phrase disait « les deux passations » quel
    // que soit leur nombre, et l'écart max−min était présenté comme les
    // séparant toutes les deux.
    const { contradictionsPourAffichage } = await service(SIGNEE);
    const [affiche] = contradictionsPourAffichage([constat({
      sources: [
        { type: 'instrument', idQuestionnaire: 'Q_MOD_01', reponseId: 'r1', dateReponse: '2026-03-12T09:00:00.000Z' },
        { type: 'instrument', idQuestionnaire: 'Q_STR_04', reponseId: 'r2', dateReponse: '2026-07-30T09:00:00.000Z' },
        { type: 'instrument', idQuestionnaire: 'Q_SOM_07', reponseId: 'r3', dateReponse: '2026-08-10T09:00:00.000Z' },
      ],
    })]);
    expect(affiche.passations).toHaveLength(3);
    expect(affiche.passations.map(p => p.date)).toEqual(['2026-03-12', '2026-07-30', '2026-08-10']);
  });

  it('une date illisible n’invente pas de passation', async () => {
    const { contradictionsPourAffichage } = await service(SIGNEE);
    const [affiche] = contradictionsPourAffichage([constat({
      sources: [
        { type: 'instrument', idQuestionnaire: 'Q_MOD_01', reponseId: 'r1', dateReponse: 'pas une date' },
        { type: 'instrument', idQuestionnaire: 'Q_STR_04', reponseId: 'r2', dateReponse: '2026-08-10T09:00:00.000Z' },
      ],
    })]);
    expect(affiche.passations).toEqual([{ idQuestionnaire: 'Q_STR_04', date: '2026-08-10' }]);
  });

  it('l’écart accompagne les dates, et reste `null` quand il ne s’applique pas', async () => {
    const { contradictionsPourAffichage } = await service(SIGNEE);
    expect(contradictionsPourAffichage([constat({ ecartJoursEntreSources: 151 })])[0].ecartJours).toBe(151);
    expect(contradictionsPourAffichage([constat({ ecartJoursEntreSources: null })])[0].ecartJours).toBeNull();
  });
});
