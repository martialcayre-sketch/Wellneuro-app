import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONFLITS_SOURCES_SHA256, CONFLITS_SOURCES_V1 } from './conflitsSourcesV1';
import type { ContradictionFinding } from './contradictionFinding';

// Ce banc garde le VERROU du registre des conflits et le filtre d'affichage par
// forme. Les deux sont fail-closed, et les deux ont un piège propre :
//
//   - le verrou est celui du REGISTRE, pas celui de la table de contradictions.
//     Signer l'une ne saurait allumer l'autre : ce sont deux relectures ;
//   - le filtre d'affichage porte sur la FORME. Un filtre global en tête de
//     fonction — l'écriture d'avant [[D-103]] — aurait fait disparaître les
//     conflits signés sous une table de contradictions non signée.

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/generated/prisma', () => ({ Prisma: { DbNull: Symbol('DbNull') } }));

const SIGNATURE_VALIDE = {
  validationExterne: true,
  dateValidation: '2026-08-24T00:00:00.000Z',
  shaPerimetre: CONFLITS_SOURCES_SHA256,
};

type MetadataPartielle = {
  validationExterne?: boolean;
  dateValidation?: string | null;
  shaPerimetre?: string | null;
};

/**
 * Recharge le service pour qu'il relise une métadonnée de registre modifiée.
 *
 * `contradictionsV1` est laissée RÉELLE — elle est signée dans le dépôt : c'est
 * ce qui permet d'éprouver les deux verrous séparément.
 */
async function service(registre: MetadataPartielle, contradictions?: MetadataPartielle) {
  vi.resetModules();
  vi.doMock('./conflitsSourcesV1', async () => {
    const reel = await vi.importActual<typeof import('./conflitsSourcesV1')>('./conflitsSourcesV1');
    return {
      ...reel,
      CONFLITS_SOURCES_METADATA: { ...reel.CONFLITS_SOURCES_METADATA, ...registre },
    };
  });
  if (contradictions) {
    vi.doMock('./contradictionsV1', async () => {
      const reel = await vi.importActual<typeof import('./contradictionsV1')>('./contradictionsV1');
      return {
        ...reel,
        CONTRADICTIONS_METADATA: { ...reel.CONTRADICTIONS_METADATA, ...contradictions },
      };
    });
  } else {
    vi.doUnmock('./contradictionsV1');
  }
  return import('./contradictionsService');
}

/**
 * Le service avec le registre RÉEL du dépôt — non signé.
 *
 * `vi.doUnmock` est indispensable : une simulation posée par `service()` survit
 * à `vi.resetModules()` pour tout le fichier. Sans lui, ce banc lisait un
 * registre encore signé par le cas précédent, et le filtre par forme paraissait
 * laisser passer un conflit sous verrou fermé — un faux rouge qui aurait pu se
 * lire comme un vrai.
 */
async function serviceReel() {
  vi.resetModules();
  vi.doUnmock('./conflitsSourcesV1');
  vi.doUnmock('./contradictionsV1');
  return import('./contradictionsService');
}

/** Table de contradictions NON signée — l'autre moitié du filtre par forme. */
const CONTRADICTIONS_NON_SIGNEES: MetadataPartielle = {
  validationExterne: false,
  dateValidation: null,
  shaPerimetre: null,
};

const conflitPublie = CONFLITS_SOURCES_V1.find(c => c.statut === 'publiee');

beforeEach(() => {
  process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 = '1';
});

afterEach(() => {
  delete process.env.WN_ENABLE_CONTRADICTIONS_NNPP2;
  vi.resetModules();
  vi.clearAllMocks();
});

describe('conflits de sources — le verrou de signature', () => {
  it('l’état livré est fermé : aucun conflit ne sort', async () => {
    const svc = await serviceReel();
    expect(svc.conflitsSourcesActifs()).toBe(false);
    expect(svc.conflitsSourcesPourDossier([conflitPublie!.claims[0]])).toEqual([]);
  });

  it('s’ouvre sur une signature complète et canonique', async () => {
    const svc = await service(SIGNATURE_VALIDE);
    expect(svc.conflitsSourcesActifs()).toBe(true);
    expect(svc.conflitsSourcesPourDossier([conflitPublie!.claims[0]])).toHaveLength(1);
  });

  // LE TERME QUI COMPTE : un conflit retouché après signature ferait servir au
  // praticien un texte qu'il n'a pas relu.
  it('se ferme sur un périmètre périmé', async () => {
    const svc = await service({ ...SIGNATURE_VALIDE, shaPerimetre: 'a'.repeat(64) });
    expect(svc.conflitsSourcesActifs()).toBe(false);
  });

  // Durcissement hérité de la revue Copilot de [[D-054]] : une date non
  // canonique FERME le verrou, au lieu de l'ouvrir puis de jeter.
  it('se ferme sur une date non canonique', async () => {
    for (const dateValidation of ['2026-08-24', '24/08/2026', 'pas une date']) {
      const svc = await service({ ...SIGNATURE_VALIDE, dateValidation });
      expect(svc.conflitsSourcesActifs()).toBe(false);
    }
  });

  it('se ferme sur le seul drapeau `validationExterne`', async () => {
    const svc = await service({ validationExterne: true });
    expect(svc.conflitsSourcesActifs()).toBe(false);
  });

  it('se ferme quand le drapeau d’environnement est absent', async () => {
    delete process.env.WN_ENABLE_CONTRADICTIONS_NNPP2;
    const svc = await service(SIGNATURE_VALIDE);
    expect(svc.conflitsSourcesActifs()).toBe(false);
    expect(svc.conflitsSourcesPourDossier([conflitPublie!.claims[0]])).toEqual([]);
  });

  // Un dossier qui ne cite aucun claim n'a aucun conflit, registre signé ou
  // non : le verrou ouvert n'invente rien.
  it('ouvert, ne produit rien sur un dossier qui ne cite aucun claim', async () => {
    const svc = await service(SIGNATURE_VALIDE);
    expect(svc.conflitsSourcesPourDossier([])).toEqual([]);
  });

  // LE VERROU PASSE AVANT TOUTE LECTURE, invariant gardé depuis [[D-050]] —
  // et la première écriture de D-103 l'avait cassé dans un cas précis (relevé
  // en revue) : table de contradictions NON signée et registre signé faisaient
  // partir deux requêtes Prisma pour un moteur de conflits qui ne lit aucune
  // passation. Les conflits sont désormais calculés hors de cette porte.
  it('configuration mixte : le dossier n’est pas lu', async () => {
    const svc = await service(SIGNATURE_VALIDE, CONTRADICTIONS_NON_SIGNEES);
    const affichees = await svc.contradictionsPourPatient('PAT_TEST', [
      conflitPublie!.claims[0],
    ]);
    expect(prismaMock.questionnaireReponse.findMany).not.toHaveBeenCalled();
    expect(prismaMock.consultation.findFirst).not.toHaveBeenCalled();
    // Et le conflit sort quand même : la porte fermée ne le retient pas.
    expect(affichees.map(a => a.id)).toEqual([conflitPublie!.id]);
  });

  // Les deux verrous fermés : rien ne sort, et rien n'est lu — le comportement
  // d'avant le lot, inchangé.
  it('les deux verrous fermés : ni lecture, ni constat', async () => {
    const svc = await service({}, CONTRADICTIONS_NON_SIGNEES);
    expect(await svc.contradictionsPourPatient('PAT_TEST', [conflitPublie!.claims[0]])).toEqual([]);
    expect(prismaMock.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });
});

describe('conflits de sources — le filtre d’affichage par forme', () => {
  const conflit = (): ContradictionFinding => ({
    forme: 'CONFLIT_SOURCES',
    id: 'CS-TEST-01',
    audience: 'praticien_seul',
    sources: [
      { type: 'claim', claim: { claimId: 'WN-CL-1111-001', versionClaim: 'v1.0' } },
      { type: 'claim', claim: { claimId: 'WN-CL-2222-002', versionClaim: 'v1.0' } },
    ],
    description: 'Deux claims du corpus certifié se contredisent.',
    importance: 'useful_not_urgent',
    hypotheses: ['Les deux sources viseraient des situations différentes.'],
    actionSuggeree: 'Trancher pour ce dossier.',
    resolution: { statut: 'escaladee_praticien', motif: 'Aucun axe comparable.' },
    justificationClaims: [
      { claimId: 'WN-CL-1111-001', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-2222-002', versionClaim: 'v1.0' },
    ],
    regleId: 'CS-TEST-01',
    limitations: ['Le conflit porte sur un seul objet.'],
    ecartJoursEntreSources: null,
  });

  const discordance = (): ContradictionFinding => ({
    forme: 'DISCORDANCE',
    id: 'C-STR',
    audience: 'praticien_seul',
    sources: [
      {
        type: 'instrument',
        idQuestionnaire: 'Q_MOD_01',
        reponseId: 'rep-1',
        dateReponse: '2026-08-10T09:00:00.000Z',
      },
    ],
    description: 'Signal fonctionnel non confirmé.',
    importance: 'useful_not_urgent',
    hypotheses: ['Une charge de stress réelle.'],
    actionSuggeree: 'Clarifier en entretien.',
    resolution: { statut: 'ouverte' },
    justificationClaims: [{ claimId: 'WN-CL-0238-002', versionClaim: 'v1.0' }],
    regleId: 'C-STR',
    limitations: ['Deux instruments déclaratifs.'],
    ecartJoursEntreSources: null,
  });

  // LE CAS QUE LE FILTRE PAR FORME EXISTE POUR TENIR : registre signé, et les
  // conflits sortent — même si l'on ne compte que sur eux.
  it('registre signé : le conflit atteint l’écran', async () => {
    const svc = await service(SIGNATURE_VALIDE);
    const affichees = svc.contradictionsPourAffichage([conflit()]);
    expect(affichees.map(a => a.id)).toEqual(['CS-TEST-01']);
  });

  it('registre non signé : le conflit est tu, la discordance passe', async () => {
    const svc = await serviceReel();
    const affichees = svc.contradictionsPourAffichage([conflit(), discordance()]);
    expect(affichees.map(a => a.id)).toEqual(['C-STR']);
  });

  // LE SENS INVERSE, que le commentaire du module affirmait sans qu'aucun banc
  // ne le montre (relevé en revue). Signer la table de contradictions ne doit
  // pas publier des conflits que personne n'a relus — et ne pas la signer ne
  // doit pas faire disparaître des conflits que quelqu'un a relus.
  it('table de contradictions non signée, registre signé : le conflit passe, la discordance est tue', async () => {
    const svc = await service(SIGNATURE_VALIDE, CONTRADICTIONS_NON_SIGNEES);
    const affichees = svc.contradictionsPourAffichage([conflit(), discordance()]);
    expect(affichees.map(a => a.id)).toEqual(['CS-TEST-01']);
  });

  // LES DEUX AUTRES CONSOMMATEURS. `lignesDeVigilance` sait nommer un conflit
  // (`INTITULE_PAR_FORME`) : elle est donc prête à en servir un, et son verrou
  // doit être celui du REGISTRE. La première écriture de D-103 avait laissé les
  // deux sur `contradictionsActives()`.
  it('la synthèse ne publie pas un conflit sous la signature des contradictions', async () => {
    const svc = await service({}, undefined);
    // Registre NON signé (état livré), table de contradictions signée.
    expect(svc.conflitsSourcesActifs()).toBe(false);
    expect(svc.vigilancesDiscordancePourSynthese([conflit()])).toEqual([]);
    // La discordance, elle, sort : le verrou qui la gouverne est ouvert.
    expect(svc.vigilancesDiscordancePourSynthese([discordance()]).length).toBeGreaterThan(0);
  });

  it('le garde de restitution ne voit pas un conflit sous la signature des contradictions', async () => {
    const svc = await serviceReel();
    expect(svc.discordancesPourGardeRestitution([conflit()])).toEqual([]);
    expect(svc.discordancesPourGardeRestitution([discordance()])).toHaveLength(1);
  });

  // Registre signé, le conflit atteint la synthèse — sinon les deux cas
  // ci-dessus seraient verts sur une fonction qui ne rend jamais rien.
  it('registre signé : le conflit atteint bien la synthèse', async () => {
    const svc = await service(SIGNATURE_VALIDE);
    const lignes = svc.vigilancesDiscordancePourSynthese([conflit()]);
    expect(lignes.length).toBeGreaterThan(0);
    expect(lignes[0]).toContain('Conflit entre sources');
  });

  // Un conflit n'a aucune passation : ses sources sont des claims. L'écran doit
  // rendre une liste vide et un écart NON APPLICABLE, jamais un `0` qui dirait
  // « les deux passations sont du même jour » (`DC-24`, [[D-048]]).
  it('un conflit s’affiche sans passation et sans écart', async () => {
    const svc = await service(SIGNATURE_VALIDE);
    const [affichee] = svc.contradictionsPourAffichage([conflit()]);
    expect(affichee.passations).toEqual([]);
    expect(affichee.ecartJours).toBeNull();
    expect(affichee.claims).toHaveLength(2);
    expect(affichee.resolution.statut).toBe('escaladee_praticien');
  });
});
