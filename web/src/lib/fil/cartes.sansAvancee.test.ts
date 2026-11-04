import { describe, expect, it } from 'vitest';
import {
  CE_QUI_RETIENT_T0_NON_VERIFIE,
  SEUIL_SANS_AVANCEE_JOURS,
  SOURCES_PAS_DU_PARCOURS,
  TYPES_CARTE_DE_GESTE,
  cartesSansAvancee,
  dernierPasDuParcours,
  ligneCeQuiRetientT0,
  placerSansAvancee,
  resumeFil,
  type CarteFil,
  type DossierParcoursRow,
  type TypeCarteFil,
} from './cartes';

// [[D-440]] — la carte « Sans avancée ». Patients fictifs autorisés
// uniquement (CLAUDE.md) ; un dossier de fixture prouve un mécanisme, il ne
// décrit aucun parcours réel (D-125).
const NOMS = new Map([
  ['P-SOPHIE', 'Sophie Nicola'],
  ['P-JENNIFER', 'Jennifer Martin'],
  ['P-MICHEL', 'Michel Dogné'],
]);

const MAINTENANT = new Date('2026-11-04T12:00:00.000Z');
const JOUR = 24 * 60 * 60 * 1000;
const ilYa = (jours: number) => new Date(MAINTENANT.getTime() - jours * JOUR);

function dossier(idPatient: string, surcharge: Partial<DossierParcoursRow> = {}): DossierParcoursRow {
  return {
    idPatient,
    actif: true,
    suiviClos: false,
    rendezVousAVenir: false,
    aDesReponses: true,
    t0ConsigneLe: null,
    diffuse: false,
    pas: { reponse: ilYa(45) },
    questionnairesSansReponse: [],
    ...surcharge,
  };
}

function carteDe(type: TypeCarteFil, idPatient: string): CarteFil {
  return {
    type, idPatient, patient: 'x', titre: 'x', pourquoi: 'x', date: null, href: '/', actionLabel: 'x',
    cle: `${type}:${idPatient}`,
  };
}

const produire = (dossiers: DossierParcoursRow[], filServi: CarteFil[] = [], refusees = new Set<string>()) =>
  cartesSansAvancee(dossiers, filServi, refusees, NOMS, MAINTENANT);

describe('cartesSansAvancee — les trois situations (D-440 §1, §6)', () => {
  it('situation 1 : réponses reçues, aucun épisode T0', () => {
    const [r] = produire([dossier('P-SOPHIE')]);
    expect(r.situation).toBe(1);
    expect(r.carte).toEqual({
      type: 'sans_avancee',
      idPatient: 'P-SOPHIE',
      patient: 'Sophie Nicola',
      titre: 'Réponses reçues, T0 non consigné',
      pourquoi: 'Aucun pas du dossier depuis le 20 septembre, il y a 45 jours.',
      date: ilYa(45).toISOString(),
      href: '/dashboard/patients/P-SOPHIE',
      actionLabel: 'Ouvrir la fiche',
      cle: `sans_avancee:P-SOPHIE:${ilYa(45).toISOString()}`,
    });
  });

  it('situation 2 : T0 consigné, aucune diffusion — la date du T0 s’ajoute', () => {
    const [r] = produire([
      dossier('P-JENNIFER', { t0ConsigneLe: ilYa(60), pas: { reponse: ilYa(80), episode_confirme: ilYa(60) } }),
    ]);
    expect(r.situation).toBe(2);
    expect(r.carte.titre).toBe('T0 consigné, aucun protocole diffusé');
    expect(r.carte.pourquoi).toBe(
      'Aucun pas du dossier depuis le 5 septembre, il y a 60 jours. Le T0 a été consigné le 5 septembre.',
    );
  });

  it('situation 3 seule : le plus ancien questionnaire, il y a n jours, et « Aucun n’a d’échéance »', () => {
    const [r] = produire([
      dossier('P-MICHEL', {
        aDesReponses: false,
        pas: { assignation: ilYa(35) },
        questionnairesSansReponse: [
          { dateAssignation: ilYa(35), dateLimite: null },
          { dateAssignation: ilYa(40), dateLimite: null },
        ],
      }),
    ]);
    expect(r.situation).toBe(3);
    expect(r.carte.titre).toBe('Questionnaires sans réponse');
    expect(r.carte.pourquoi).toBe(
      '2 questionnaires assignés restent sans réponse ; le plus ancien date du 25 septembre, il y a 40 jours. '
        + 'Aucun n’a d’échéance.',
    );
    // Clé ancrée sur le PLUS ANCIEN questionnaire resté sans réponse (§5).
    expect(r.carte.cle).toBe(`sans_avancee:P-MICHEL:${ilYa(40).toISOString()}`);
  });

  it('situation 3 : une échéance renseignée suffit à taire « Aucun n’a d’échéance »', () => {
    const [r] = produire([
      dossier('P-MICHEL', {
        aDesReponses: false,
        pas: {},
        questionnairesSansReponse: [
          { dateAssignation: ilYa(40), dateLimite: null },
          { dateAssignation: ilYa(38), dateLimite: '2026-10-01' },
        ],
      }),
    ]);
    expect(r.carte.pourquoi).not.toContain('échéance');
  });

  it('situation 3 au singulier', () => {
    const [r] = produire([
      dossier('P-MICHEL', {
        aDesReponses: false,
        pas: {},
        questionnairesSansReponse: [{ dateAssignation: ilYa(40), dateLimite: null }],
      }),
    ]);
    expect(r.carte.pourquoi).toBe(
      '1 questionnaire assigné reste sans réponse ; il date du 25 septembre, il y a 40 jours. Il n’a pas d’échéance.',
    );
  });

  it('un dossier diffusé n’entre que par la situation 3', () => {
    const diffuse = { t0ConsigneLe: ilYa(90), diffuse: true, pas: { livret_envoye: ilYa(60) } };
    expect(produire([dossier('P-SOPHIE', diffuse)])).toEqual([]);
    const [r] = produire([
      dossier('P-SOPHIE', { ...diffuse, questionnairesSansReponse: [{ dateAssignation: ilYa(50), dateLimite: null }] }),
    ]);
    expect(r.situation).toBe(3);
  });

  it('plusieurs situations, une seule carte : le titre de l’étape, la situation 3 en phrase', () => {
    const cartes = produire([
      dossier('P-SOPHIE', {
        pas: { reponse: ilYa(45), assignation: ilYa(50) },
        questionnairesSansReponse: [{ dateAssignation: ilYa(50), dateLimite: null }],
      }),
    ]);
    expect(cartes).toHaveLength(1);
    expect(cartes[0].carte.titre).toBe('Réponses reçues, T0 non consigné');
    // Ajoutée, la phrase ne porte ni « il y a » ni l'échéance.
    expect(cartes[0].carte.pourquoi).toBe(
      'Aucun pas du dossier depuis le 20 septembre, il y a 45 jours. '
        + '1 questionnaire assigné reste sans réponse ; il date du 15 septembre.',
    );
    // Clé ancrée sur le dernier pas, situation 3 ou non (§5).
    expect(cartes[0].carte.cle).toBe(`sans_avancee:P-SOPHIE:${ilYa(45).toISOString()}`);
  });

  it('un dossier sans réponse ni questionnaire ouvert n’a pas de carte', () => {
    expect(produire([dossier('P-SOPHIE', { aDesReponses: false, pas: {} })])).toEqual([]);
  });

  it('la carte ne dit jamais « oublié » ni qui doit agir', () => {
    const textes = produire([
      dossier('P-SOPHIE'),
      dossier('P-MICHEL', { aDesReponses: false, pas: {}, questionnairesSansReponse: [{ dateAssignation: ilYa(40), dateLimite: null }] }),
    ]).map(r => `${r.carte.titre} ${r.carte.pourquoi}`).join(' ');
    expect(textes).not.toMatch(/oubli|vous devez|le patient doit|à relancer/i);
  });
});

describe('cartesSansAvancee — le seuil (D-440 §3)', () => {
  it('vaut 30 jours', () => {
    expect(SEUIL_SANS_AVANCEE_JOURS).toBe(30);
  });

  it('PLUS de 30 jours : à 30 jours pile, rien ; une minute de plus, la carte', () => {
    expect(produire([dossier('P-SOPHIE', { pas: { reponse: ilYa(30) } })])).toEqual([]);
    const auDela = new Date(ilYa(30).getTime() - 60_000);
    expect(produire([dossier('P-SOPHIE', { pas: { reponse: auDela } })])).toHaveLength(1);
  });

  it('même borne pour la situation 3', () => {
    const ouvert = (jours: number) => dossier('P-MICHEL', {
      aDesReponses: false, pas: {}, questionnairesSansReponse: [{ dateAssignation: ilYa(jours), dateLimite: null }],
    });
    expect(produire([ouvert(30)])).toEqual([]);
    expect(produire([ouvert(31)])).toHaveLength(1);
  });
});

describe('cartesSansAvancee — l’ancre : le dernier pas du parcours (D-440 §2)', () => {
  it.each(SOURCES_PAS_DU_PARCOURS)('un pas récent « %s » remet le silence à zéro', source => {
    const pas = { reponse: ilYa(60), [source]: ilYa(10) };
    expect(dernierPasDuParcours(pas)).toEqual(ilYa(10));
    expect(produire([dossier('P-SOPHIE', { pas })])).toEqual([]);
  });

  it('liste fermée : une connexion, un agenda, un e-mail ou une lecture ne comptent pas', () => {
    expect(SOURCES_PAS_DU_PARCOURS).toEqual([
      'reponse', 'assignation', 'synthese_generee', 'synthese_validee', 'consultation_validee',
      'episode_confirme', 'priorite_choisie', 'objectif_negocie', 'brouillon_protocole', 'livret_envoye',
    ]);
    const pas = {
      reponse: ilYa(60),
      connexion: ilYa(1), agenda: ilYa(1), email: ilYa(1), lecture: ilYa(1),
    } as unknown as DossierParcoursRow['pas'];
    expect(dernierPasDuParcours(pas)).toEqual(ilYa(60));
    expect(produire([dossier('P-SOPHIE', { pas })])).toHaveLength(1);
  });

  it('un pas récent ne protège pas un questionnaire ancien : la situation 3 prend le relais, ancrée sur lui', () => {
    const [r] = produire([
      dossier('P-SOPHIE', {
        pas: { reponse: ilYa(60), synthese_validee: ilYa(5) },
        questionnairesSansReponse: [{ dateAssignation: ilYa(45), dateLimite: null }],
      }),
    ]);
    expect(r.situation).toBe(3);
    expect(r.carte.cle).toBe(`sans_avancee:P-SOPHIE:${ilYa(45).toISOString()}`);
  });
});

describe('cartesSansAvancee — exclusions (D-440 §4)', () => {
  it.each([
    ['désactivé', { actif: false }],
    ['suivi clos', { suiviClos: true }],
    ['rendez-vous à venir', { rendezVousAVenir: true }],
  ] as const)('dossier %s : aucune carte', (_libelle, surcharge) => {
    expect(produire([dossier('P-SOPHIE', surcharge)])).toEqual([]);
  });

  it('la liste des cartes de geste est celle du §4, retard compris', () => {
    expect([...TYPES_CARTE_DE_GESTE].sort()).toEqual([
      'assignation_en_retard', 'reprise', 'signal_securite', 'synthese_a_generer',
      'synthese_a_valider', 'synthese_non_servie', 't0_a_confirmer',
    ]);
  });

  it.each(TYPES_CARTE_DE_GESTE)('une carte « %s » servie pour le dossier : pas de seconde carte', type => {
    expect(produire([dossier('P-SOPHIE')], [carteDe(type, 'P-SOPHIE')])).toEqual([]);
  });

  it.each(['consultation_prevue', 'signalement_trust', 'jalon_j21', 'geste_objectif', 'biologie_arbitree'] as const)(
    'une carte « %s » ne demande pas de geste au sens du §4 : la carte reste',
    type => {
      expect(produire([dossier('P-SOPHIE')], [carteDe(type, 'P-SOPHIE')])).toHaveLength(1);
    },
  );

  it('la carte de geste d’un AUTRE dossier ne retient rien', () => {
    expect(produire([dossier('P-SOPHIE')], [carteDe('reprise', 'P-MICHEL')])).toHaveLength(1);
  });
});

describe('cartesSansAvancee — affichage, clé et plafond (D-440 §5)', () => {
  it('le plus ancien silence d’abord, cinq cartes au plus', () => {
    const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const dossiers = ids.map((id, i) => dossier(`P-${id}`, { pas: { reponse: ilYa(40 + i) } }));
    const cartes = produire(dossiers);
    expect(cartes).toHaveLength(5);
    expect(cartes.map(r => r.carte.idPatient)).toEqual(['P-G', 'P-F', 'P-E', 'P-D', 'P-C']);
  });

  it('une carte écartée ne prend pas de place sous le plafond', () => {
    const dossiers = ['A', 'B', 'C', 'D', 'E', 'F'].map((id, i) => dossier(`P-${id}`, { pas: { reponse: ilYa(40 + i) } }));
    const refusees = new Set([`sans_avancee:P-F:${ilYa(45).toISOString()}`]);
    const cartes = produire(dossiers, [], refusees);
    expect(cartes.map(r => r.carte.idPatient)).toEqual(['P-E', 'P-D', 'P-C', 'P-B', 'P-A']);
  });

  it('un nouveau pas déplace la clé : la carte écartée revient si le silence reprend', () => {
    const refusees = new Set([`sans_avancee:P-SOPHIE:${ilYa(80).toISOString()}`]);
    expect(produire([dossier('P-SOPHIE', { pas: { reponse: ilYa(80) } })], [], refusees)).toEqual([]);
    const apresUnPas = produire([dossier('P-SOPHIE', { pas: { reponse: ilYa(80), synthese_generee: ilYa(40) } })], [], refusees);
    expect(apresUnPas.map(r => r.carte.cle)).toEqual([`sans_avancee:P-SOPHIE:${ilYa(40).toISOString()}`]);
  });

  it('situation 3 : la réponse ou l’annulation du plus ancien questionnaire déplace la clé', () => {
    const ouverts = [
      { dateAssignation: ilYa(60), dateLimite: null },
      { dateAssignation: ilYa(40), dateLimite: null },
    ];
    const base = { aDesReponses: false, pas: {} };
    const avant = produire([dossier('P-MICHEL', { ...base, questionnairesSansReponse: ouverts })]);
    const apres = produire([dossier('P-MICHEL', { ...base, questionnairesSansReponse: ouverts.slice(1) })]);
    expect(avant[0].carte.cle).not.toBe(apres[0].carte.cle);
    expect(apres[0].carte.cle).toBe(`sans_avancee:P-MICHEL:${ilYa(40).toISOString()}`);
  });
});

describe('ligneCeQuiRetientT0 (D-440 §7)', () => {
  it('recopie les libellés des conditions dures manquantes', () => {
    expect(ligneCeQuiRetientT0(['Anamnèse consignée', 'Premier rideau renseigné et cotable']))
      .toBe('Ce qui retient le T0 : Anamnèse consignée · Premier rideau renseigné et cotable');
  });

  it('aucune condition manquante : pas de ligne', () => {
    expect(ligneCeQuiRetientT0([])).toBeUndefined();
  });

  it('évaluation en échec : le repli arbitré, jamais un silence', () => {
    expect(ligneCeQuiRetientT0(null)).toBe(CE_QUI_RETIENT_T0_NON_VERIFIE);
    expect(CE_QUI_RETIENT_T0_NON_VERIFIE).toBe('Ce qui retient le T0 : non vérifié, voir la fiche.');
  });
});

describe('placerSansAvancee et résumé', () => {
  const sa = carteDe('sans_avancee', 'P-SOPHIE');

  it('entre le retard et la reprise', () => {
    const fil = [carteDe('jalon_j21', 'P-A'), carteDe('assignation_en_retard', 'P-B'), carteDe('reprise', 'P-C')];
    expect(placerSansAvancee(fil, [sa]).map(c => c.type))
      .toEqual(['jalon_j21', 'assignation_en_retard', 'sans_avancee', 'reprise']);
  });

  it('sans reprise : en fin de Fil', () => {
    const fil = [carteDe('assignation_en_retard', 'P-B')];
    expect(placerSansAvancee(fil, [sa]).map(c => c.type)).toEqual(['assignation_en_retard', 'sans_avancee']);
  });

  it('résumé : « dossier(s) sans avancée », après les retards', () => {
    expect(resumeFil([sa])).toBe('1 dossier sans avancée');
    expect(resumeFil([carteDe('assignation_en_retard', 'P-B'), sa, carteDe('sans_avancee', 'P-C')]))
      .toBe('1 retard · 2 dossiers sans avancée');
  });
});
