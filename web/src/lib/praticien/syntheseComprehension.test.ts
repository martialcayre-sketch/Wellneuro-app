import { describe, expect, it } from 'vitest';

import {
  LONGUEUR_MAX_DESACCORD,
  LONGUEUR_MAX_SYNTHESE,
  TOLERANCE_FUSEAU_MS,
  chaineDeSynthese,
  desaccordsDeLaSynthese,
  etatDesaccord,
  preparerDesaccord,
  preparerSynthese,
  syntheseServieAuPatient,
  synthesesCourantes,
  type EntreeDesaccord,
  type EntreeSynthese,
  type LigneSynthese,
} from './syntheseComprehension';

const BASE: EntreeSynthese = {
  idPatient: 'PAT_TEST',
  praticienEmail: 'praticien@wellneuro.fr',
  texte: "Vous venez pour un sommeil qui se casse au milieu de la nuit, et ce qui vous pèse le plus, c'est la journée d'après.",
  redigeeLe: null,
  publier: false,
};

const BASE_DESACCORD: EntreeDesaccord = {
  idPatient: 'PAT_TEST',
  idSynthese: 'syn_1',
  texte: null,
  exprimeLe: null,
};

/** Fabrique une ligne de synthèse ; `creeLe` en minutes depuis une origine fixe. */
function ligne(
  id: string,
  minutes: number,
  options: { publiee?: boolean; supersede?: string | null } = {},
): LigneSynthese {
  return {
    id,
    creeLe: new Date(Date.UTC(2026, 7, 22, 8, minutes)),
    publieeLe: options.publiee ? new Date(Date.UTC(2026, 7, 22, 8, minutes)) : null,
    supersedesSyntheseId: options.supersede ?? null,
  };
}

describe('preparerSynthese', () => {
  it('accepte une synthèse simple et n’invente aucune date', () => {
    const resultat = preparerSynthese(BASE);
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.donnees.texte).toBe(BASE.texte);
    expect(resultat.donnees.redigeeLe).toBeNull();
    expect(resultat.donnees.publieeLe).toBeNull();
    expect(resultat.donnees.supersedesSyntheseId).toBeNull();
    // La date d'ÉCRITURE n'est jamais transmise : `@default(now())` la pose.
    expect(resultat.donnees).not.toHaveProperty('creeLe');
  });

  it('refuse un texte absent ou seulement des espaces', () => {
    expect(preparerSynthese({ ...BASE, texte: null })).toEqual({
      ok: false,
      raison: 'texte_absent',
    });
    expect(preparerSynthese({ ...BASE, texte: '   \n  ' })).toEqual({
      ok: false,
      raison: 'texte_absent',
    });
  });

  it('refuse au-delà de la borne — et ne tronque JAMAIS', () => {
    const limite = 'a'.repeat(LONGUEUR_MAX_SYNTHESE);
    const accepte = preparerSynthese({ ...BASE, texte: limite });
    expect(accepte.ok).toBe(true);
    if (accepte.ok) expect(accepte.donnees.texte).toHaveLength(LONGUEUR_MAX_SYNTHESE);

    expect(preparerSynthese({ ...BASE, texte: `${limite}a` })).toEqual({
      ok: false,
      raison: 'texte_trop_long',
    });
  });

  it('pose `publieeLe` à la publication, et la fabrique elle-même', () => {
    const avant = Date.now();
    const resultat = preparerSynthese({ ...BASE, publier: true });
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.donnees.publieeLe).toBeInstanceOf(Date);
    // Publier, c'est publier MAINTENANT : la date ne vient pas de l'appelant.
    expect(resultat.donnees.publieeLe!.getTime()).toBeGreaterThanOrEqual(avant);
    expect(resultat.donnees.publieeLe!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('accepte une date de rédaction passée et refuse une date illisible ou future', () => {
    const passee = preparerSynthese({ ...BASE, redigeeLe: '2026-08-01' });
    expect(passee.ok).toBe(true);
    if (passee.ok) expect(passee.donnees.redigeeLe).toEqual(new Date('2026-08-01'));

    expect(preparerSynthese({ ...BASE, redigeeLe: 'hier' })).toEqual({
      ok: false,
      raison: 'date_invalide',
    });

    const future = new Date(Date.now() + TOLERANCE_FUSEAU_MS * 3).toISOString();
    expect(preparerSynthese({ ...BASE, redigeeLe: future })).toEqual({
      ok: false,
      raison: 'date_future',
    });
  });

  it('tolère le décalage de fuseau d’une journée', () => {
    const presqueDemain = new Date(Date.now() + TOLERANCE_FUSEAU_MS / 2).toISOString();
    expect(preparerSynthese({ ...BASE, redigeeLe: presqueDemain }).ok).toBe(true);
  });
});

describe('preparerDesaccord', () => {
  it('accepte un désaccord SANS texte — « ce n’est pas exactement ça » suffit', () => {
    const resultat = preparerDesaccord(BASE_DESACCORD);
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.donnees.texte).toBeNull();
    expect(resultat.donnees.idSynthese).toBe('syn_1');
  });

  it('exige la version contestée — un désaccord orphelin ne conteste rien', () => {
    expect(preparerDesaccord({ ...BASE_DESACCORD, idSynthese: null })).toEqual({
      ok: false,
      raison: 'synthese_absente',
    });
    expect(preparerDesaccord({ ...BASE_DESACCORD, idSynthese: '   ' })).toEqual({
      ok: false,
      raison: 'synthese_absente',
    });
  });

  it('donne au patient la MÊME place qu’au praticien', () => {
    expect(LONGUEUR_MAX_DESACCORD).toBe(LONGUEUR_MAX_SYNTHESE);
    expect(
      preparerDesaccord({ ...BASE_DESACCORD, texte: 'a'.repeat(LONGUEUR_MAX_DESACCORD) }).ok,
    ).toBe(true);
    expect(
      preparerDesaccord({ ...BASE_DESACCORD, texte: 'a'.repeat(LONGUEUR_MAX_DESACCORD + 1) }),
    ).toEqual({ ok: false, raison: 'texte_trop_long' });
  });

  it('ne porte aucun auteur : la route le tient de la session', () => {
    const resultat = preparerDesaccord(BASE_DESACCORD);
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(Object.keys(resultat.donnees).sort()).toEqual([
      'exprimeLe',
      'idPatient',
      'idSynthese',
      'texte',
    ]);
  });
});

describe('synthesesCourantes', () => {
  it('ne garde que les têtes de chaîne, plus récente d’abord', () => {
    const lignes = [
      ligne('a', 0),
      ligne('b', 10, { supersede: 'a' }),
      ligne('c', 20, { supersede: 'b' }),
    ];
    expect(synthesesCourantes(lignes).map((l) => l.id)).toEqual(['c']);
  });

  it('SIGNALE une course au lieu de la départager en silence', () => {
    // Deux révisions concurrentes de la même ligne : deux têtes, et les deux
    // remontent. Départager ici ferait disparaître une synthèse de praticien.
    const lignes = [ligne('a', 0), ligne('b', 10, { supersede: 'a' }), ligne('c', 10, { supersede: 'a' })];
    expect(synthesesCourantes(lignes).map((l) => l.id)).toEqual(['c', 'b']);
  });
});

describe('syntheseServieAuPatient', () => {
  it('ne sert jamais un brouillon', () => {
    expect(syntheseServieAuPatient([ligne('a', 0)])).toBeUndefined();
  });

  it('sert la tête publiée', () => {
    const lignes = [ligne('a', 0, { publiee: true }), ligne('b', 10, { publiee: true, supersede: 'a' })];
    expect(syntheseServieAuPatient(lignes)?.id).toBe('b');
  });

  it('CONTINUE de servir une version publiée qu’un BROUILLON supplante', () => {
    // `b` est un brouillon qui supplante la version publiée `a`. Le patient
    // continue de voir `a` : tant que la révision n'est pas publiée, rien ne
    // lui a été retiré. Cesser de la servir serait une dépublication de fait —
    // et le portail dirait « rien n'a jamais été publié », une absence
    // fabriquée (revue LOT-04, B1).
    const lignes = [ligne('a', 0, { publiee: true }), ligne('b', 10, { supersede: 'a' })];
    expect(syntheseServieAuPatient(lignes)?.id).toBe('a');
  });

  it('sert la révision dès qu’elle est PUBLIÉE, et pas avant', () => {
    const brouillon = [ligne('a', 0, { publiee: true }), ligne('b', 10, { supersede: 'a' })];
    expect(syntheseServieAuPatient(brouillon)?.id).toBe('a');

    const publiee = [ligne('a', 0, { publiee: true }), ligne('b', 10, { publiee: true, supersede: 'a' })];
    expect(syntheseServieAuPatient(publiee)?.id).toBe('b');
  });

  it('sert la dernière publiée même sous un brouillon en cours de rédaction', () => {
    // A publiée, B publiée qui la révise, C brouillon qui révise B : le patient
    // voit B — la dernière chose que le praticien lui a effectivement adressée.
    const lignes = [
      ligne('a', 0, { publiee: true }),
      ligne('b', 10, { publiee: true, supersede: 'a' }),
      ligne('c', 20, { supersede: 'b' }),
    ];
    expect(syntheseServieAuPatient(lignes)?.id).toBe('b');
  });
});

describe('chaineDeSynthese', () => {
  it('remonte la chaîne complète', () => {
    const lignes = [ligne('a', 0), ligne('b', 10, { supersede: 'a' }), ligne('c', 20, { supersede: 'b' })];
    expect(chaineDeSynthese(lignes, 'c').map((l) => l.id)).toEqual(['c', 'b', 'a']);
  });

  it('ne boucle pas sur un cycle — la référence est SOUPLE, sans clé étrangère', () => {
    const lignes = [ligne('a', 0, { supersede: 'b' }), ligne('b', 10, { supersede: 'a' })];
    expect(chaineDeSynthese(lignes, 'a').map((l) => l.id)).toEqual(['a', 'b']);
  });
});

describe('etatDesaccord', () => {
  const desaccord = { id: 'des_1', idSynthese: 'a', creeLe: new Date(Date.UTC(2026, 7, 22, 8, 5)) };

  it('reste en attente tant que rien n’a été publié après lui', () => {
    const lignes = [ligne('a', 0, { publiee: true })];
    expect(etatDesaccord(desaccord, lignes)).toBe('en_attente');
  });

  it('devient répondu quand une version publiée DESCEND de la version contestée', () => {
    const lignes = [ligne('a', 0, { publiee: true }), ligne('b', 10, { publiee: true, supersede: 'a' })];
    expect(etatDesaccord(desaccord, lignes)).toBe('repondu');
  });

  it('reste en attente si la nouvelle version n’est qu’un brouillon', () => {
    const lignes = [ligne('a', 0, { publiee: true }), ligne('b', 10, { supersede: 'a' })];
    expect(etatDesaccord(desaccord, lignes)).toBe('en_attente');
  });

  it('reste en attente si la version publiée ne descend pas de la version contestée', () => {
    // Une autre synthèse du dossier, sur un tout autre sujet, n'est pas une
    // réponse à ce désaccord-ci.
    const lignes = [ligne('a', 0, { publiee: true }), ligne('z', 10, { publiee: true })];
    expect(etatDesaccord(desaccord, lignes)).toBe('en_attente');
  });

  it('reste en attente si la descendance publiée est ANTÉRIEURE au désaccord', () => {
    const tardif = { id: 'des_2', idSynthese: 'a', creeLe: new Date(Date.UTC(2026, 7, 22, 8, 30)) };
    const lignes = [ligne('a', 0, { publiee: true }), ligne('b', 10, { publiee: true, supersede: 'a' })];
    expect(etatDesaccord(tardif, lignes)).toBe('en_attente');
  });

  it('reconnaît une réponse à distance dans la chaîne', () => {
    const lignes = [
      ligne('a', 0, { publiee: true }),
      ligne('b', 10, { supersede: 'a' }),
      ligne('c', 20, { publiee: true, supersede: 'b' }),
    ];
    expect(etatDesaccord(desaccord, lignes)).toBe('repondu');
  });

  it('n’a AUCUN état « résolu » : le désaccord reste après la réponse', () => {
    const lignes = [ligne('a', 0, { publiee: true }), ligne('b', 10, { publiee: true, supersede: 'a' })];
    // Répondu ≠ effacé : la ligne est toujours là, toujours accrochée à `a`.
    expect(etatDesaccord(desaccord, lignes)).toBe('repondu');
    expect(desaccordsDeLaSynthese('a', [desaccord])).toHaveLength(1);
  });
});

describe('desaccordsDeLaSynthese', () => {
  it('rend les désaccords de CETTE version, plus récent d’abord, sans dédoublonner', () => {
    const desaccords = [
      { id: 'd1', idSynthese: 'a', creeLe: new Date(Date.UTC(2026, 7, 22, 8, 5)) },
      { id: 'd2', idSynthese: 'a', creeLe: new Date(Date.UTC(2026, 7, 22, 9, 0)) },
      { id: 'd3', idSynthese: 'b', creeLe: new Date(Date.UTC(2026, 7, 22, 9, 30)) },
    ];
    // Contester deux fois la même version, c'est avoir contesté deux fois.
    expect(desaccordsDeLaSynthese('a', desaccords).map((d) => d.id)).toEqual(['d2', 'd1']);
  });
});
