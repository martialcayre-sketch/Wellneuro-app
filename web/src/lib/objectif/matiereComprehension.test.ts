import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    syntheseIA: { findMany: vi.fn() },
    desaccordComprehension: { findMany: vi.fn() },
    assignation: { count: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  constaterOuverture,
  lireDesaccords,
  lireMatiereComprehension,
  lireSynthesesCitables,
} from './matiereComprehension';

const NARRATIF_1 = 'Vos réponses évoquent un sommeil qui se rompt vers le milieu de la nuit.';
const NARRATIF_2 = 'Le rythme s’est stabilisé, mais la récupération reste courte.';

/** Un axe tel que le contrat JSON le décrit — quatre champs, trois interdits. */
const axe = (nom: string) => ({
  axe: nom,
  niveau_priorite: 'eleve',
  arguments: ['Score PSQI élevé', 'Interprétation chronotype'],
  points_a_confirmer: ['Demander l’heure du coucher'],
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.syntheseIA.findMany.mockResolvedValue([]);
  prisma.desaccordComprehension.findMany.mockResolvedValue([]);
  prisma.assignation.count.mockResolvedValue(0);
});

describe('la matière du résumé global — ce qui sort, et ce qui ne sort pas', () => {
  it('ne rend d’un axe que son LIBELLÉ — ni bande, ni score, ni consigne d’entretien', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([
      {
        idSynthese: 'SYN_1',
        syntheseJson: {
          resume_praticien: 'Sommeil fragmenté.',
          narratif_patient: NARRATIF_1,
          axes_prioritaires: [axe('Sommeil'), axe('Digestif')],
          points_de_vigilance: ['ne pas manquer X'],
        },
      },
    ]);

    const syntheses = await lireSynthesesCitables('PAT_1');

    expect(syntheses[0].axes).toEqual(['Sommeil', 'Digestif']);
    // Le test qui compte : la sortie SÉRIALISÉE ne contient aucun des trois
    // champs interdits. Vérifier `axes` seul laisserait passer une fuite par
    // une autre clé de l'objet rendu.
    const serialise = JSON.stringify(syntheses);
    expect(serialise).not.toContain('niveau_priorite');
    expect(serialise).not.toContain('eleve');
    expect(serialise).not.toContain('Score PSQI');
    expect(serialise).not.toContain('points_a_confirmer');
    expect(serialise).not.toContain('points_de_vigilance');
    expect(serialise).not.toContain('resume_praticien');
    expect(serialise).not.toContain('Sommeil fragmenté');
  });

  it('l’ORDRE des axes est celui de la synthèse, sans retri', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([
      {
        idSynthese: 'SYN_1',
        syntheseJson: {
          narratif_patient: NARRATIF_1,
          // Un ordre NON alphabétique, exprès : un `sort()` glissé un jour dans
          // l'adaptateur inventerait une hiérarchie que personne n'a validée.
          axes_prioritaires: [axe('Sommeil'), axe('Alimentation'), axe('Digestif')],
        },
      },
    ]);

    const syntheses = await lireSynthesesCitables('PAT_1');
    expect(syntheses[0].axes).toEqual(['Sommeil', 'Alimentation', 'Digestif']);
  });

  it('les synthèses sortent de la plus ancienne à la plus récente', async () => {
    await lireSynthesesCitables('PAT_1');
    expect(prisma.syntheseIA.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { dateValidation: 'asc' } }),
    );
  });

  it('seules les synthèses VALIDÉES sont lues, et le blob n’est pas demandé en entier', async () => {
    await lireSynthesesCitables('PAT_1');
    const appel = prisma.syntheseIA.findMany.mock.calls[0][0];
    expect(appel.where).toEqual({ idPatient: 'PAT_1', statut: 'Validee_Praticien' });
    // `select` NOMME ses colonnes : ni donneesEntree, ni modele, ni notesPraticien.
    expect(Object.keys(appel.select).sort()).toEqual(['idSynthese', 'syntheseJson']);
  });

  it('une synthèse SANS narratif est écartée, pas rendue à moitié', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([
      { idSynthese: 'SYN_1', syntheseJson: { axes_prioritaires: [axe('Sommeil')] } },
      { idSynthese: 'SYN_2', syntheseJson: { narratif_patient: NARRATIF_2 } },
    ]);

    const syntheses = await lireSynthesesCitables('PAT_1');
    expect(syntheses.map((s) => s.idSynthese)).toEqual(['SYN_2']);
  });

  it('un narratif vide ou fait d’espaces est une ABSENCE, pas un texte', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([
      { idSynthese: 'SYN_1', syntheseJson: { narratif_patient: '   ' } },
      { idSynthese: 'SYN_2', syntheseJson: { narratif_patient: NARRATIF_2 } },
    ]);

    const syntheses = await lireSynthesesCitables('PAT_1');
    expect(syntheses.map((s) => s.idSynthese)).toEqual(['SYN_2']);
  });

  it('une entrée d’axe inexploitable est SAUTÉE, jamais remplacée par un marqueur', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([
      {
        idSynthese: 'SYN_1',
        syntheseJson: {
          narratif_patient: NARRATIF_1,
          axes_prioritaires: [
            axe('Sommeil'),
            null,
            'Digestif',
            { niveau_priorite: 'eleve' },
            { axe: 42 },
            { axe: '   ' },
            axe('Alimentation'),
          ],
        },
      },
    ]);

    // Ni « (sans nom) », ni chaîne vide, ni `undefined` : un marqueur ferait
    // écrire au modèle une phrase sur un axe qui n'existe pas.
    const syntheses = await lireSynthesesCitables('PAT_1');
    expect(syntheses[0].axes).toEqual(['Sommeil', 'Alimentation']);
  });

  it('un libellé d’axe est nettoyé de ses espaces', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([
      {
        idSynthese: 'SYN_1',
        syntheseJson: { narratif_patient: NARRATIF_1, axes_prioritaires: [axe('  Sommeil  ')] },
      },
    ]);
    const syntheses = await lireSynthesesCitables('PAT_1');
    expect(syntheses[0].axes).toEqual(['Sommeil']);
  });

  it('des axes absents ou d’une autre forme rendent une liste VIDE, pas une erreur', async () => {
    for (const blob of [
      { narratif_patient: NARRATIF_1 },
      { narratif_patient: NARRATIF_1, axes_prioritaires: null },
      { narratif_patient: NARRATIF_1, axes_prioritaires: 'Sommeil' },
      { narratif_patient: NARRATIF_1, axes_prioritaires: {} },
    ]) {
      prisma.syntheseIA.findMany.mockResolvedValue([{ idSynthese: 'SYN_1', syntheseJson: blob }]);
      const syntheses = await lireSynthesesCitables('PAT_1');
      // La synthèse RESTE dans la matière : son narratif vaut. L'absence d'axes
      // n'est pas l'absence de matière (`DC-24`).
      expect(syntheses).toHaveLength(1);
      expect(syntheses[0].axes).toEqual([]);
    }
  });

  it('un blob qui n’est pas un objet ne fait pas tomber la lecture', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([
      { idSynthese: 'SYN_1', syntheseJson: null },
      { idSynthese: 'SYN_2', syntheseJson: 'du texte' },
      { idSynthese: 'SYN_3', syntheseJson: { narratif_patient: NARRATIF_2 } },
    ]);
    const syntheses = await lireSynthesesCitables('PAT_1');
    expect(syntheses.map((s) => s.idSynthese)).toEqual(['SYN_3']);
  });
});

describe('les désaccords — la parole écrite, et elle seule', () => {
  it('un désaccord SANS texte est écarté de la matière, sans être nié', async () => {
    prisma.desaccordComprehension.findMany.mockResolvedValue([
      { id: 'DES_1', texte: null },
      { id: 'DES_2', texte: '   ' },
      { id: 'DES_3', texte: 'Ce n’est pas la fatigue, c’est l’ennui.' },
    ]);

    const desaccords = await lireDesaccords('PAT_1');
    expect(desaccords).toEqual([
      { idDesaccord: 'DES_3', texte: 'Ce n’est pas la fatigue, c’est l’ennui.' },
    ]);
  });

  it('les désaccords sortent dans l’ordre où ils ont été posés', async () => {
    await lireDesaccords('PAT_1');
    expect(prisma.desaccordComprehension.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { creeLe: 'asc' } }),
    );
  });

  it('le texte est nettoyé de ses espaces', async () => {
    prisma.desaccordComprehension.findMany.mockResolvedValue([{ id: 'DES_1', texte: '  Pas ça.  ' }]);
    const desaccords = await lireDesaccords('PAT_1');
    expect(desaccords[0].texte).toBe('Pas ça.');
  });
});

describe('les deux pièces, lues ensemble', () => {
  it('rend les deux listes, chacune bornée au dossier demandé', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([
      { idSynthese: 'SYN_1', syntheseJson: { narratif_patient: NARRATIF_1 } },
    ]);
    prisma.desaccordComprehension.findMany.mockResolvedValue([{ id: 'DES_1', texte: 'Pas ça.' }]);

    const matiere = await lireMatiereComprehension('PAT_9');

    expect(matiere.syntheses).toHaveLength(1);
    expect(matiere.desaccords).toHaveLength(1);
    expect(prisma.syntheseIA.findMany.mock.calls[0][0].where.idPatient).toBe('PAT_9');
    expect(prisma.desaccordComprehension.findMany.mock.calls[0][0].where).toEqual({ idPatient: 'PAT_9' });
  });

  it('un dossier sans rien rend deux listes VIDES, jamais une erreur ni un null', async () => {
    const matiere = await lireMatiereComprehension('PAT_1');
    expect(matiere).toEqual({ syntheses: [], desaccords: [] });
  });
});

describe('la barre d’ouverture — deux règles déjà écrites, lues ensemble', () => {
  const validee = (jour: string) => ({ dateValidation: new Date(jour) });

  it('deux synthèses validées et un rideau postérieur : la barre est franchie', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([validee('2026-07-07'), validee('2026-08-29')]);
    prisma.assignation.count.mockResolvedValue(18);
    expect(await constaterOuverture('PAT_1')).toEqual({
      deuxSynthesesValidees: true,
      secondRideau: true,
    });
  });

  it('une seule synthèse validée ne franchit pas la barre', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([validee('2026-07-07')]);
    prisma.assignation.count.mockResolvedValue(18);
    const ouverture = await constaterOuverture('PAT_1');
    expect(ouverture.deuxSynthesesValidees).toBe(false);
    expect(ouverture.secondRideau).toBe(true);
  });

  it('le second rideau se compte DEPUIS la première synthèse validée (D-158)', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([validee('2026-07-07'), validee('2026-08-29')]);
    await constaterOuverture('PAT_1');
    expect(prisma.assignation.count).toHaveBeenCalledWith({
      where: { idPatient: 'PAT_1', dateAssignation: { gt: new Date('2026-07-07') } },
    });
  });

  it('aucune assignation postérieure : pas de second rideau', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([validee('2026-07-07'), validee('2026-08-29')]);
    prisma.assignation.count.mockResolvedValue(0);
    expect((await constaterOuverture('PAT_1')).secondRideau).toBe(false);
  });

  it('un dossier sans aucune synthèse validée ne compte RIEN, et n’interroge pas les assignations', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([]);
    expect(await constaterOuverture('PAT_1')).toEqual({
      deuxSynthesesValidees: false,
      secondRideau: false,
    });
    expect(prisma.assignation.count).not.toHaveBeenCalled();
  });

  it('des synthèses SANS date comptent quand même comme synthèses', async () => {
    // Les confondre ferait dire « il manque une synthèse » à un dossier qui en a
    // deux, dont les dates sont absentes (`DC-24`). Le rideau, lui, ne se
    // constate pas sans date — et c’est deux phrases différentes.
    prisma.syntheseIA.findMany.mockResolvedValue([
      { dateValidation: null },
      { dateValidation: null },
    ]);
    expect(await constaterOuverture('PAT_1')).toEqual({
      deuxSynthesesValidees: true,
      secondRideau: false,
    });
    expect(prisma.assignation.count).not.toHaveBeenCalled();
  });

  it('la première date TROUVÉE fait référence, même si des lignes sans date la précèdent', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([
      { dateValidation: null },
      validee('2026-07-07'),
      validee('2026-08-29'),
    ]);
    await constaterOuverture('PAT_1');
    expect(prisma.assignation.count.mock.calls[0][0].where.dateAssignation.gt)
      .toEqual(new Date('2026-07-07'));
  });

  it('ne rend AUCUN décompte — deux booléens, et rien d’autre', async () => {
    prisma.syntheseIA.findMany.mockResolvedValue([validee('2026-07-07'), validee('2026-08-29')]);
    prisma.assignation.count.mockResolvedValue(18);
    const ouverture = await constaterOuverture('PAT_1');
    // Un nombre servi finirait par être affiché comme une mesure du dossier.
    expect(Object.keys(ouverture).sort()).toEqual(['deuxSynthesesValidees', 'secondRideau']);
    expect(JSON.stringify(ouverture)).not.toContain('18');
  });
});
