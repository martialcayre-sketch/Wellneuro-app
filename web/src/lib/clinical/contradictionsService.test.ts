import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContradictionFinding } from './contradictionFinding';

// Ce banc garde les deux endroits où un constat déterministe peut devenir faux
// en changeant de forme : le VERROU (qui décide s'il sort) et la CONVERSION
// (qui décide de ce qu'il devient). Les deux sont fail-closed. Depuis le
// câblage ([[D-050]]), il garde un troisième point : que le verrou soit franchi
// AVANT toute lecture du dossier.

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/generated/prisma', () => ({ Prisma: { DbNull: Symbol('DbNull') } }));

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

/**
 * Recharge le module pour que le verrou relise `CONTRADICTIONS_METADATA`.
 *
 * `registreSigne` signe EN PLUS le registre des conflits ([[D-103]]) : depuis
 * ce lot, un `CONFLIT_SOURCES` répond de SA table, pas de celle-ci. Un cas qui
 * porte un conflit sans ce second geste éprouve désormais le verrou, pas ce
 * qu'il croyait éprouver.
 */
async function service(
  metadata: { validationExterne: boolean; dateValidation: string | null; claimsSource: unknown[]; shaPerimetre?: string | null },
  registreSigne = false,
) {
  vi.resetModules();
  vi.doMock('./contradictionsV1', async () => {
    const reel = await vi.importActual<typeof import('./contradictionsV1')>('./contradictionsV1');
    return { ...reel, CONTRADICTIONS_METADATA: { ...reel.CONTRADICTIONS_METADATA, ...metadata } };
  });
  // LES DEUX POSITIONS SONT POSÉES EXPLICITEMENT, jamais héritées du dépôt —
  // corrigé après [[D-104]], qui a signé le registre. Un `doUnmock` sur la
  // branche « non signé » lisait le registre réel : le cas est passé de vert à
  // rouge le jour de la signature, alors qu'il éprouve un verrou, pas un état.
  vi.doMock('./conflitsSourcesV1', async () => {
    const reel = await vi.importActual<typeof import('./conflitsSourcesV1')>('./conflitsSourcesV1');
    return {
      ...reel,
      CONFLITS_SOURCES_METADATA: {
        ...reel.CONFLITS_SOURCES_METADATA,
        validationExterne: registreSigne,
        dateValidation: registreSigne ? '2026-09-01T00:00:00.000Z' : null,
        shaPerimetre: registreSigne ? reel.CONFLITS_SOURCES_SHA256 : null,
      },
    };
  });
  return import('./contradictionsService');
}

// Cinq termes depuis [[D-067]] : date ISO canonique et SHA de périmètre
// concordant avec le contenu RÉEL du module (le harnais étend la métadonnée
// réelle, la constante `CONTRADICTIONS_RULES_SHA256` reste celle de la table
// vivante — le littéral d'une fixture divergerait à chaque édition de règle).
const SIGNEE = {
  validationExterne: true,
  dateValidation: '2026-09-01T00:00:00.000Z',
  claimsSource: [{ claimId: 'x' }],
};
const NON_SIGNEE = { validationExterne: false, dateValidation: null, claimsSource: [] };

beforeEach(() => {
  delete process.env.WN_ENABLE_CONTRADICTIONS_NNPP2;
  prismaMock.questionnaireReponse.findMany.mockReset();
  prismaMock.consultation.findFirst.mockReset();
  prismaMock.questionnaireReponse.findMany.mockResolvedValue([]);
  prismaMock.consultation.findFirst.mockResolvedValue(null);
});

afterEach(() => {
  vi.doUnmock('./contradictionsV1');
  vi.resetModules();
});

describe('contradictionsActives — le double verrou', () => {
  it('table livrée (SIGNÉE depuis [[D-061]]) + drapeau allumé ⇒ ALLUMÉ', async () => {
    // L'état réel du dépôt a changé le 2026-08-15 : la table est signée. Ce cas
    // reste le plus important du fichier, mais il dit maintenant l'inverse —
    // seul le drapeau d'exploitation sépare encore la production du constat
    // servi au praticien.
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { contradictionsActives } = await import('./contradictionsService');
    expect(contradictionsActives()).toBe(true);
  });

  it('table NON signée + drapeau allumé ⇒ éteint (verrou simulé fermé)', async () => {
    // Le verrou de signature existe toujours : sans ce cas, plus rien ne le
    // dirait, la table réelle étant désormais signée.
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { contradictionsActives } = await service(NON_SIGNEE);
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

    const dateNonCanonique = await service({ ...SIGNEE, dateValidation: '2026-09-01' });
    expect(dateNonCanonique.contradictionsActives()).toBe(false);
  });

  // LE CINQUIÈME TERME, PROUVÉ PAR LA PÉREMPTION ([[D-067]], finding M1 de la
  // revue — VÉRIFIÉ PAR MUTATION : sans ce cas, supprimer le terme
  // `shaPerimetre === CONTRADICTIONS_RULES_SHA256` du verrou laissait 1441
  // tests verts, sur la SEULE table dont le drapeau est déjà posé en
  // production. Une règle de contradiction retouchée après signature aurait
  // servi des constats à l'écran praticien sous une signature qui ne l'a
  // jamais couverte.
  it('un `shaPerimetre` qui ne concorde plus ferme le verrou — la péremption se voit', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    // Témoin : la signature réelle (spread de la métadonnée vivante) ouvre.
    const concordant = await service(SIGNEE);
    expect(concordant.contradictionsActives()).toBe(true);
    // Péremption : le littéral ne concorde plus ⇒ fermé, sans autre terme changé.
    const perime = await service({ ...SIGNEE, shaPerimetre: 'sha-perime' });
    expect(perime.contradictionsActives()).toBe(false);
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
      { idQuestionnaire: 'Q_MOD_01', date: '2026-03-12', dateLisible: '12/03/2026' },
      { idQuestionnaire: 'Q_STR_04', date: '2026-08-10', dateLisible: '10/08/2026' },
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
    expect(affiche.passations).toEqual([
      { idQuestionnaire: 'Q_STR_04', date: '2026-08-10', dateLisible: '10/08/2026' },
    ]);
  });

  it('l’objet minimal de `DC-30` survit : importance, résolution, règle', async () => {
    // `DC-30` est ACTÉE, donc opposable : « sources, description, importance,
    // hypothèses, action suggérée, résolue ou non ». La première conversion en
    // jetait trois, dont celle qui a fait l'objet d'un arbitrage entier.
    const { contradictionsPourAffichage } = await service(SIGNEE);
    const [affiche] = contradictionsPourAffichage([constat()]);
    expect(affiche.importance).toBe('useful_not_urgent');
    expect(affiche.resolution).toEqual({ statut: 'ouverte' });
    expect(affiche.regleId).toBe('C-STR');
  });

  it('une passation de nuit reste au bon jour civil parisien', async () => {
    // 00 h 40 à Paris le 11/08 = 22 h 40 UTC le 10/08. Un jour civil UTC
    // rendrait « 10/08 » là où le praticien a rempli le 11.
    const { contradictionsPourAffichage } = await service(SIGNEE);
    const [affiche] = contradictionsPourAffichage([constat({
      sources: [
        { type: 'instrument', idQuestionnaire: 'Q_SOM_07', reponseId: 'r1', dateReponse: '2026-08-10T22:40:00.000Z' },
        { type: 'instrument', idQuestionnaire: 'Q_MOD_01', reponseId: 'r2', dateReponse: '2026-08-11T12:00:00.000Z' },
      ],
    })]);
    expect(affiche.passations.map(p => p.date)).toEqual(['2026-08-11', '2026-08-11']);
    expect(affiche.passations[0].dateLisible).toBe('11/08/2026');
  });
});

// LE CÂBLAGE — [[D-050]]. Le LOT-01 livrait jusqu'ici une capacité qu'aucun
// site d'appel n'utilisait ; le critère de sortie du lot n'était donc pas tenu.
// Ce bloc garde ce que le câblage ne doit jamais perdre.
describe('contradictionsPourPatient — le verrou passe AVANT la lecture', () => {
  it('verrou fermé ⇒ liste vide ET aucune requête vers le dossier', async () => {
    // Le point n'est pas la liste vide, c'est l'ABSENCE DE LECTURE. Un service
    // qui lirait le dossier puis filtrerait à la sortie toucherait la donnée
    // d'un patient pour un affichage qui n'a pas lieu — et le jour où le filtre
    // de sortie s'oublie, la lecture est déjà faite.
    const { contradictionsPourPatient } = await import('./contradictionsService');
    expect(await contradictionsPourPatient('PAT_SEED_01')).toEqual([]);
    expect(prismaMock.questionnaireReponse.findMany).not.toHaveBeenCalled();
    expect(prismaMock.consultation.findFirst).not.toHaveBeenCalled();
  });

  it('verrou ouvert ⇒ le dossier est lu, et scopé au patient demandé', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { contradictionsPourPatient } = await service(SIGNEE);
    await contradictionsPourPatient('PAT_SEED_01');
    expect(prismaMock.questionnaireReponse.findMany).toHaveBeenCalledTimes(1);
    const argument = prismaMock.questionnaireReponse.findMany.mock.calls[0][0];
    expect(argument.where).toEqual({ idPatient: 'PAT_SEED_01' });
  });

  it('le score est RECALCULÉ depuis rawAnswers, jamais l’instantané stocké', async () => {
    // L'en-tête de `contradictionsEngine.ts` en fait une obligation de
    // l'APPELANT. Un `scoresJson` figé porte la doctrine de scoring qui avait
    // cours à la soumission : une garde ajoutée depuis ne mordrait sur aucune
    // passation déjà en base — la classe de défaut trouvée en revue sur
    // l'orientation le 2026-08-04.
    //
    // Ce banc regarde CE QUE LE MOTEUR REÇOIT, et non ce que le service rend :
    // sur une table à une seule règle, un dossier qui ne la déclenche pas rend
    // `[]` que le score soit recalculé ou relayé — un banc de sortie serait
    // tautologique, exactement le défaut que ce lot dénonce ailleurs.
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const espion = vi.fn().mockReturnValue([]);
    vi.resetModules();
    vi.doMock('./contradictionsV1', async () => {
      const reel = await vi.importActual<typeof import('./contradictionsV1')>('./contradictionsV1');
      return { ...reel, CONTRADICTIONS_METADATA: { ...reel.CONTRADICTIONS_METADATA, ...SIGNEE } };
    });
    vi.doMock('./contradictionsEngine', async () => {
      const reel = await vi.importActual<typeof import('./contradictionsEngine')>('./contradictionsEngine');
      return { ...reel, evaluerContradictions: espion };
    });
    prismaMock.questionnaireReponse.findMany.mockResolvedValue([
      {
        idReponse: 'r1',
        idQuestionnaire: 'Q_MOD_01',
        dateReponse: new Date('2026-08-10T09:00:00.000Z'),
        // Total délibérément aberrant : s'il était relayé, il ressortirait tel
        // quel dans ce que le moteur reçoit.
        scoresJson: { total: 999, rawAnswers: { MOD1: 3, MOD2: 3 } },
        statutValidite: 'VALID',
      },
    ]);

    const { contradictionsPourPatient } = await import('./contradictionsService');
    await contradictionsPourPatient('PAT_SEED_01');

    expect(espion).toHaveBeenCalledTimes(1);
    const recue = espion.mock.calls[0][0].reponses[0];
    expect(recue.idReponse).toBe('r1');
    expect(recue.scores?.total).not.toBe(999);
    vi.doUnmock('./contradictionsEngine');
  });

  it('aucune anamnèse ⇒ aucun drapeau inventé', async () => {
    // `DC-24` : une donnée absente n'est ni zéro ni normale. Passer un objet aux
    // drapeaux vides affirmerait que le patient n'a rien déclaré.
    //
    // Assertion sur CE QUE LE MOTEUR REÇOIT, corrigé après revue : une version
    // antérieure attendait `[]` en sortie, ce qui est vrai que l'on passe
    // `undefined` ou `{}` — aucune règle de la V1 n'a de déclencheur `drapeau`.
    // Le banc ne pouvait pas rougir sur le défaut qu'il nomme.
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const espion = vi.fn().mockReturnValue([]);
    vi.resetModules();
    vi.doMock('./contradictionsV1', async () => {
      const reel = await vi.importActual<typeof import('./contradictionsV1')>('./contradictionsV1');
      return { ...reel, CONTRADICTIONS_METADATA: { ...reel.CONTRADICTIONS_METADATA, ...SIGNEE } };
    });
    vi.doMock('./contradictionsEngine', async () => {
      const reel = await vi.importActual<typeof import('./contradictionsEngine')>('./contradictionsEngine');
      return { ...reel, evaluerContradictions: espion };
    });
    prismaMock.consultation.findFirst.mockResolvedValue(null);

    const { contradictionsPourPatient } = await import('./contradictionsService');
    await contradictionsPourPatient('PAT_SEED_01');

    expect(espion).toHaveBeenCalledTimes(1);
    expect(espion.mock.calls[0][0].drapeaux).toBeUndefined();
    expect('drapeaux' in espion.mock.calls[0][0]).toBe(true);
    vi.doUnmock('./contradictionsEngine');
  });

  it('une passation ÉCARTÉE n’entre pas dans le raisonnement, drapeau ou pas', async () => {
    // La classe de défaut fermée trois jours plus tôt sur le repère de synthèse,
    // et rouverte ici par le chemin du recalcul partagé : le motif de validité
    // de `scoresRecalculesPourRaisonnement` passe par `estExclueDuRaisonnement`,
    // gaté par `WN_ENABLE_VALIDITE_PASSATIONS` — éteint en production. Sans le
    // filtre sans drapeau, une passation qu'un praticien a marquée INVALID
    // produisait un constat daté, affiché sans réserve.
    //
    // Un constat n'a pas de place où porter une réserve : il est vrai, ou il ne
    // se produit pas. D'où le retrait, là où la synthèse marque.
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const espion = vi.fn().mockReturnValue([]);
    vi.resetModules();
    vi.doMock('./contradictionsV1', async () => {
      const reel = await vi.importActual<typeof import('./contradictionsV1')>('./contradictionsV1');
      return { ...reel, CONTRADICTIONS_METADATA: { ...reel.CONTRADICTIONS_METADATA, ...SIGNEE } };
    });
    vi.doMock('./contradictionsEngine', async () => {
      const reel = await vi.importActual<typeof import('./contradictionsEngine')>('./contradictionsEngine');
      return { ...reel, evaluerContradictions: espion };
    });
    const ligne = (idReponse: string, statutValidite: string) => ({
      idReponse,
      idQuestionnaire: 'Q_MOD_01',
      dateReponse: new Date('2026-08-10T09:00:00.000Z'),
      scoresJson: { total: 12, rawAnswers: { MOD1: 3 } },
      statutValidite,
    });
    prismaMock.questionnaireReponse.findMany.mockResolvedValue([
      ligne('r-invalide', 'INVALID'),
      ligne('r-saine', 'VALID'),
      ligne('r-ambigue', 'AMBIGUOUS'),
    ]);

    const { contradictionsPourPatient } = await import('./contradictionsService');
    await contradictionsPourPatient('PAT_SEED_01');

    const recues = espion.mock.calls[0][0].reponses;
    const parId = new Map(recues.map((r: { idReponse: string; scores: unknown }) => [r.idReponse, r.scores]));
    // TOUTES LES LIGNES RESTENT — c'est le score de l'écartée qui tombe.
    expect([...parId.keys()]).toEqual(['r-invalide', 'r-saine', 'r-ambigue']);
    expect(parId.get('r-invalide')).toBeNull();
    // `AMBIGUOUS` garde son score : ce n'est pas un statut écarté, et l'exclure
    // serait une dérive silencieuse qu'aucun autre banc ne verrait.
    expect(parId.get('r-ambigue')).not.toBeNull();
  });

  it('une INVALID récente ÉTEINT l’instrument — elle ne le fait pas reculer dans le temps', async () => {
    // LE DÉFAUT QU'UN CORRECTIF AVAIT INTRODUIT, et que la revue a sondé.
    //
    // Une première rédaction RETIRAIT la ligne écartée au lieu de nuller son
    // score. Conséquence : la passation antérieure devenait « la dernière » aux
    // yeux de `derniereReponseParQuestionnaire`, et le constat se bâtissait sur
    // une mesure de 2024 pendant que le panneau d'orientation du même écran en
    // lisait une de 2026 — deux passations du même instrument sur le même
    // écran, sans que rien ne le dise.
    //
    // `orientationService` refuse ce repli en toutes lettres : le praticien qui
    // invalide attend une re-passation, il ne demande pas qu'on ressorte la
    // mesure précédente. Les trois moteurs doivent répondre la même chose à
    // « quelle passation fait foi ».
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const espion = vi.fn().mockReturnValue([]);
    vi.resetModules();
    vi.doMock('./contradictionsV1', async () => {
      const reel = await vi.importActual<typeof import('./contradictionsV1')>('./contradictionsV1');
      return { ...reel, CONTRADICTIONS_METADATA: { ...reel.CONTRADICTIONS_METADATA, ...SIGNEE } };
    });
    vi.doMock('./contradictionsEngine', async () => {
      const reel = await vi.importActual<typeof import('./contradictionsEngine')>('./contradictionsEngine');
      return { ...reel, evaluerContradictions: espion };
    });
    prismaMock.questionnaireReponse.findMany.mockResolvedValue([
      {
        idReponse: 'recente-invalide',
        idQuestionnaire: 'Q_MOD_01',
        dateReponse: new Date('2026-08-10T09:00:00.000Z'),
        scoresJson: { total: 12, rawAnswers: { MOD1: 3 } },
        statutValidite: 'INVALID',
      },
      {
        idReponse: 'ancienne-valide',
        idQuestionnaire: 'Q_MOD_01',
        dateReponse: new Date('2024-01-05T09:00:00.000Z'),
        scoresJson: { total: 12, rawAnswers: { MOD1: 3 } },
        statutValidite: 'VALID',
      },
    ]);

    const { contradictionsPourPatient } = await import('./contradictionsService');
    await contradictionsPourPatient('PAT_SEED_01');

    const recues = espion.mock.calls[0][0].reponses;
    // La ligne récente est TOUJOURS LÀ : c'est elle qui reste « la dernière »,
    // et son score nul éteint l'instrument. Si elle disparaissait, l'ancienne
    // prendrait sa place et fonderait un constat vieux de deux ans.
    expect(recues.map((r: { idReponse: string }) => r.idReponse)).toContain('recente-invalide');
    const { derniereReponseParQuestionnaire } = await import('./orientationEngine');
    const derniere = derniereReponseParQuestionnaire(recues).get('Q_MOD_01');
    expect(derniere?.idReponse).toBe('recente-invalide');
    expect(derniere?.scores).toBeNull();
  });
});

describe('vigilancesDiscordancePourSynthese — ce qui atteint la synthèse praticien', () => {
  // Quatrième point gardé par ce banc depuis le LOT-09 ([[D-057]]) : ce qu'un
  // constat devient quand il quitte le cockpit pour la synthèse. Le verrou et
  // la conversion restent fail-closed, comme au-dessus.

  it('rend une vigilance portant description ET action, mot pour mot', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE);
    const lignes = vigilancesDiscordancePourSynthese([constat()]);
    // Deux points : le constat, puis ce qu'il ne dit pas — le plafond de 500
    // caractères par point interdit de les réunir.
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toContain('Signal fonctionnel non confirmé par les instruments spécifiques.');
    expect(lignes[0]).toContain('Clarifier en entretien.');
  });

  it('ne reformule pas — la phrase du déterministe traverse intacte', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE);
    const description = 'Phrase déterministe très particulière, à ne pas retoucher.';
    const actionSuggeree = 'Geste précis proposé au praticien.';
    const [ligne] = vigilancesDiscordancePourSynthese([constat({ description, actionSuggeree })]);
    expect(ligne).toContain(description);
    expect(ligne).toContain(actionSuggeree);
  });

  it('écarte un constat RÉSOLU', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE);
    expect(vigilancesDiscordancePourSynthese([
      constat({ resolution: { statut: 'resolue', motif: 'Clarifié en entretien.' } }),
    ])).toEqual([]);
  });

  it('CONSERVE un constat escaladé — l’escalade n’est pas une résolution', async () => {
    // Même critère d'« ouvert » que le moteur d'arrêt ([[D-053]] §5) : deux
    // définitions dans le même dépôt divergeraient en silence.
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE);
    expect(vigilancesDiscordancePourSynthese([
      constat({ resolution: { statut: 'escaladee_praticien', motif: 'Avis demandé.' } }),
    ])[0]).toContain('[C-STR]');
  });

  it('ne hiérarchise pas : une importance basse passe comme les autres', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE);
    expect(vigilancesDiscordancePourSynthese([
      constat({ importance: 'useful_not_urgent' }),
    ])[0]).toContain('[C-STR]');
  });

  it('verrou fermé (table non signée) ⇒ rien, même sur un constat ouvert', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { vigilancesDiscordancePourSynthese } = await service({
      validationExterne: false, dateValidation: null, claimsSource: [],
    });
    expect(vigilancesDiscordancePourSynthese([constat()])).toEqual([]);
  });

  it('drapeau éteint ⇒ rien, table signée ou non', async () => {
    delete process.env.WN_ENABLE_CONTRADICTIONS_NNPP2;
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE);
    expect(vigilancesDiscordancePourSynthese([constat()])).toEqual([]);
  });

  it('aucun constat ⇒ aucune vigilance, sans ligne vide', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE);
    expect(vigilancesDiscordancePourSynthese([])).toEqual([]);
  });
});

describe('Discordances — parité de critère avec le moteur d’arrêt', () => {
  // Test réclamé en revue : comparer les PRÉDICATS, pas les paraphraser. La
  // première version du LOT-09 recopiait `statut !== 'resolue'` en omettant
  // l'exclusion des convergences ; les deux consommateurs auraient divergé dès
  // qu'une règle CONVERGENCE aurait été publiée, et personne ne l'aurait vu.

  it('une CONVERGENCE non résolue n’atteint pas la synthèse', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE);
    const convergence = {
      ...constat(), forme: 'CONVERGENCE' as const, graduation: 'CONVERGENCE_MODEREE' as const,
    };
    expect(vigilancesDiscordancePourSynthese([convergence])).toEqual([]);
  });

  it('une CONVERGENCE n’entre pas non plus dans le garde de restitution', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { discordancesPourGardeRestitution } = await service(SIGNEE);
    const convergence = {
      ...constat(), forme: 'CONVERGENCE' as const, graduation: 'CONVERGENCE_MODEREE' as const,
    };
    expect(discordancesPourGardeRestitution([convergence])).toEqual([]);
  });

  it('le prédicat est CELUI du moteur d’arrêt, pas une copie', async () => {
    // Si quelqu'un réécrit l'un des deux, cette égalité tombe.
    const { contradictionEstOuverte } = await import('./contradictionFinding');
    const cas = [
      constat(),
      constat({ resolution: { statut: 'resolue', motif: 'Clarifié.' } }),
      constat({ resolution: { statut: 'escaladee_praticien', motif: 'Avis demandé.' } }),
      { ...constat(), forme: 'CONVERGENCE' as const, graduation: 'CONVERGENCE_MODEREE' as const },
    ];
    expect(cas.map(contradictionEstOuverte)).toEqual([true, false, true, false]);
  });

  it('un CONFLIT_SOURCES porte son propre intitulé, jamais « entre instruments »', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    // LES DEUX SIGNATURES, depuis [[D-103]]. Ce cas éprouvait l'INTITULÉ, et il
    // le faisait sur la seule signature de la table de contradictions — c'est
    // précisément le chemin que la revue a fermé : un conflit ne se publie pas
    // sous la signature d'un registre que personne n'a relu.
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE, true);
    const conflit = { ...constat(), forme: 'CONFLIT_SOURCES' as const };
    const [ligne] = vigilancesDiscordancePourSynthese([conflit]);
    expect(ligne).toContain('Conflit entre sources');
    expect(ligne).not.toContain('entre instruments');
  });

  // L'AUTRE MOITIÉ, qui manquait : registre non signé, le conflit ne sort pas —
  // quelle que soit la signature de la table de contradictions.
  it('registre des conflits non signé : aucun CONFLIT_SOURCES en synthèse', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE);
    const conflit = { ...constat(), forme: 'CONFLIT_SOURCES' as const };
    expect(vigilancesDiscordancePourSynthese([conflit])).toEqual([]);
  });

  it('la vigilance reste explicable : elle porte sa règle et ses limitations', async () => {
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE);
    const lignes = vigilancesDiscordancePourSynthese([constat()]);
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toContain('[C-STR]');
    expect(lignes[1]).toContain('Un questionnaire isolé ne suffit pas à conclure.');
  });

  it('aucune ligne ne dépasse le plafond d’un point de vigilance', async () => {
    // Constat et limitations réunis faisaient 730 caractères pour C-STR, contre
    // un plafond de 500 à l'enregistrement d'un brouillon praticien : le refus
    // serait tombé avec un message ne nommant pas la cause. Ce banc mesure
    // TOUTES les règles de la table, pas seulement celle du jour.
    process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
    const { vigilancesDiscordancePourSynthese } = await service(SIGNEE);
    const { LONGUEUR_MAX_POINT } = await import('@/lib/synthese-praticien');
    const { CONTRADICTIONS_RULES_V1 } = await import('./contradictionsV1');
    for (const regle of CONTRADICTIONS_RULES_V1) {
      const lignes = vigilancesDiscordancePourSynthese([constat({
        regleId: regle.id,
        description: regle.description,
        actionSuggeree: regle.actionSuggeree,
        limitations: regle.limitations,
      })]);
      for (const ligne of lignes) {
        expect(ligne.length, `règle ${regle.id}`).toBeLessThanOrEqual(LONGUEUR_MAX_POINT);
      }
    }
  });
});
