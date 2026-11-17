import { beforeEach, describe, expect, it, vi } from 'vitest';

// [[D-513]] §5, §7 et §11 : chaque sortie est construite par sa liste de champs
// autorisés, et un banc par sortie vérifie l'absence des deux champs
// biologiques ET de leur contenu. Données entièrement fictives.

const { prisma } = vi.hoisted(() => ({
  prisma: { syntheseIA: { findFirst: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { analyserSortieSynthese, CHAMPS_BIOLOGIE_SYNTHESE } from '@/lib/anthropic';
import { compositionDepuisSynthese } from '@/lib/documents/compositionSynthese';
import { lireSyntheseCitable } from '@/lib/objectif/matierePriorite';
import { logger } from '@/lib/observability/logger';
import {
  CHAMPS_APPEL_PRIORITE,
  CHAMPS_DOCUMENT_MEDECIN,
  CHAMPS_EXPORT_DOSSIER,
  projeterSynthese,
} from './projectionSorties';

const MARQUE_RESUME = 'RESTITUTION-BIOLOGIQUE-FICTIVE';
const MARQUE_VIGILANCE = 'VIGILANCE-BIOLOGIQUE-FICTIVE';

const JSON_COMPLET = {
  resume_praticien: 'Résumé sans biologie.',
  axes_prioritaires: [{ axe: 'Sommeil', niveau_priorite: 'modere', arguments: ['PSQI'], points_a_confirmer: ['Horaires'] }],
  points_de_vigilance: ['Interaction possible avec un traitement.'],
  questions_entretien: ['Comment dormez-vous ?'],
  narratif_patient: 'Votre praticien a reçu votre bilan biologique du 12 mars 2026.',
  limites: 'À valider par le praticien.',
  resume_biologie_praticien: MARQUE_RESUME,
  points_de_vigilance_biologie: [MARQUE_VIGILANCE],
  _schema_version: 'synthese-json-v4',
};

const TRACE_SANS_FORME = {
  blocBiologie: { texte: '## Résultats de biologie', formes: { valeursUnites: [], intervalles: [] } },
  metadonneesPrompt: { versionSchema: 'synthese-json-v4' },
};

describe('les listes de champs autorisés', () => {
  it('aucune ne nomme un champ biologique', () => {
    for (const liste of [CHAMPS_DOCUMENT_MEDECIN, CHAMPS_EXPORT_DOSSIER, CHAMPS_APPEL_PRIORITE]) {
      for (const champ of CHAMPS_BIOLOGIE_SYNTHESE) expect(liste as readonly string[]).not.toContain(champ);
    }
  });

  it('la projection ne reprend que les champs nommés : un champ ajouté au schéma n’entre pas', () => {
    const projete = projeterSynthese({ ...JSON_COMPLET, champ_neuf: 'x' }, CHAMPS_EXPORT_DOSSIER);
    expect(Object.keys(projete).sort()).toEqual([...CHAMPS_EXPORT_DOSSIER].sort());
    expect(JSON.stringify(projete)).not.toContain(MARQUE_RESUME);
    expect(JSON.stringify(projete)).not.toContain(MARQUE_VIGILANCE);
  });

  it('un JSON illisible projette un objet vide', () => {
    expect(projeterSynthese(null, CHAMPS_EXPORT_DOSSIER)).toEqual({});
    expect(projeterSynthese([1], CHAMPS_EXPORT_DOSSIER)).toEqual({});
  });
});

describe('schéma v4 — la sortie du modèle', () => {
  it('refuse une sortie sans les deux champs biologiques', () => {
    const { resume_biologie_praticien: _r, points_de_vigilance_biologie: _p, _schema_version: _v, ...sans } = JSON_COMPLET;
    const analyse = analyserSortieSynthese(sans);
    expect(analyse.ok).toBe(false);
    if (!analyse.ok) {
      expect(analyse.violations.some((v) => v.startsWith('resume_biologie_praticien'))).toBe(true);
      expect(analyse.violations.some((v) => v.startsWith('points_de_vigilance_biologie'))).toBe(true);
    }
  });

  it('accepte les deux champs vides', () => {
    const { _schema_version: _v, ...base } = JSON_COMPLET;
    const analyse = analyserSortieSynthese({ ...base, resume_biologie_praticien: '', points_de_vigilance_biologie: [] });
    expect(analyse.ok).toBe(true);
  });
});

describe('sortie 1 — document au médecin (aperçu, impression, téléchargement au portail)', () => {
  it('aucun champ ni contenu biologique dans les blocs composés', () => {
    const composition = compositionDepuisSynthese({
      syntheseJson: JSON_COMPLET,
      statut: 'Validee_Praticien',
      versionPrompt: 'synthese-v36',
      dateValidation: new Date('2026-11-17T09:00:00.000Z'),
      dateGeneration: new Date('2026-11-17T08:00:00.000Z'),
      modele: 'modele-ia-fictif',
    }, { prenom: 'Sophie', nom: 'Nicola' });
    const rendu = JSON.stringify(composition);
    expect(rendu).not.toContain(MARQUE_RESUME);
    expect(rendu).not.toContain(MARQUE_VIGILANCE);
    for (const champ of CHAMPS_BIOLOGIE_SYNTHESE) expect(rendu).not.toContain(champ);
    // La restitution non biologique, elle, reste.
    expect(rendu).toContain('Interaction possible avec un traitement.');
  });
});

describe('sortie 4 — appel de priorité de l’objectif', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ne lit que ses deux textes, jamais la biologie', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue({ idSynthese: 'SYN_1', syntheseJson: JSON_COMPLET, donneesEntree: TRACE_SANS_FORME });
    const matiere = await lireSyntheseCitable('PAT_FICTIF');
    expect(matiere).toEqual({
      idSynthese: 'SYN_1',
      resumePraticien: 'Résumé sans biologie.',
      narratifPatient: 'Votre praticien a reçu votre bilan biologique du 12 mars 2026.',
    });
    expect(JSON.stringify(matiere)).not.toContain(MARQUE_RESUME);
  });

  it('une synthèse suspecte n’est pas citable, et le blocage est journalisé sans texte', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue({
      idSynthese: 'SYN_1',
      syntheseJson: { ...JSON_COMPLET, resume_praticien: 'Ferritine à 32 µg/L.' },
      donneesEntree: {
        ...TRACE_SANS_FORME,
        blocBiologie: { texte: '## Résultats de biologie', formes: { valeursUnites: [{ valeur: '32', unite: 'µg/L' }], intervalles: [] } },
      },
    });
    expect(await lireSyntheseCitable('PAT_FICTIF')).toBeNull();
    const ligne = vi.mocked(logger.warn).mock.calls[0][0];
    expect(ligne.event).toBe('SYNTHESE_IA.BIOLOGIE_HORS_CHAMPS');
    expect(ligne.message).toContain('SYN_1');
    expect(ligne.message).toContain('resume_praticien:valeur_unite');
    expect(ligne.message).not.toContain('32');
  });

  it('lit `donneesEntree` pour le seul contrôle', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue(null);
    await lireSyntheseCitable('PAT_FICTIF');
    expect(prisma.syntheseIA.findFirst.mock.calls[0][0].select).toEqual({ idSynthese: true, statut: true, syntheseJson: true, donneesEntree: true });
  });
});
