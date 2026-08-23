import { describe, expect, it } from 'vitest';

import { descriptionConflit, evaluerConflitsSources } from './conflitsSourcesEngine';
import { CONFLITS_SOURCES_V1, type ConflitSourcesDeclare } from './conflitsSourcesV1';
import { contradictionEstOuverte } from './contradictionFinding';
import { motifEscalade } from './politiqueResolutionConflit';

// Ce banc garde le producteur de `CONFLIT_SOURCES` sur ses trois refus et sur
// la forme de ce qu'il produit. Les refus sont éprouvés sur un registre PASSÉ
// EN ENTRÉE : le registre du dépôt ne portant qu'un conflit publié à deux
// claims distincts, aucun des trois ne serait atteignable autrement — ils
// seraient corrects par lecture et prouvés par rien.

const A = { claimId: 'WN-CL-1111-001', versionClaim: 'v1.0' };
const B = { claimId: 'WN-CL-2222-002', versionClaim: 'v1.0' };

const conflit = (surcharge: Partial<ConflitSourcesDeclare> = {}): ConflitSourcesDeclare => ({
  id: 'CS-TEST-01',
  statut: 'publiee',
  objet: 'La chose est-elle systématique ?',
  claims: [A, B],
  positions: ['la chose est systématique', "la chose n'est pas systématique"],
  importance: 'useful_not_urgent',
  hypotheses: ['Les deux sources viseraient des situations différentes.'],
  actionSuggeree: 'Trancher pour ce dossier.',
  limitations: ['Le conflit porte sur le caractère systématique, pas sur le fond.'],
  ...surcharge,
});

describe('producteur CONFLIT_SOURCES — le déclenchement', () => {
  it('un claim cité par le dossier suffit — le premier', () => {
    const constats = evaluerConflitsSources({ claimsCites: [A], conflits: [conflit()] });
    expect(constats).toHaveLength(1);
    expect(constats[0].forme).toBe('CONFLIT_SOURCES');
    expect(constats[0].id).toBe('CS-TEST-01');
  });

  // LE CAS QUI COMPTE, et celui qu'un « les deux claims » aurait tu : le
  // dossier ne s'appuie que sur la position adverse, et c'est précisément là
  // que le praticien a besoin de savoir qu'elle est contredite.
  it('un claim cité par le dossier suffit — le second, seul', () => {
    expect(evaluerConflitsSources({ claimsCites: [B], conflits: [conflit()] })).toHaveLength(1);
  });

  it('aucun claim cité — aucun constat', () => {
    expect(
      evaluerConflitsSources({
        claimsCites: [{ claimId: 'WN-CL-3333-003', versionClaim: 'v1.0' }],
        conflits: [conflit()],
      }),
    ).toEqual([]);
  });

  it('dossier sans claim cité — aucun constat', () => {
    expect(evaluerConflitsSources({ claimsCites: [], conflits: [conflit()] })).toEqual([]);
  });

  // LA CORRESPONDANCE PORTE SUR LA PAIRE. Sur `claimId` seul, ce cas
  // produirait un constat citant une version du claim que le dossier n'emploie
  // pas — le praticien vérifierait un texte qui n'a pas servi.
  it('une AUTRE version du même claim ne déclenche pas', () => {
    expect(
      evaluerConflitsSources({
        claimsCites: [{ claimId: A.claimId, versionClaim: 'v2.0' }],
        conflits: [conflit()],
      }),
    ).toEqual([]);
  });
});

describe('producteur CONFLIT_SOURCES — les refus', () => {
  it('un conflit non publié ne produit rien', () => {
    for (const statut of ['brouillon', 'suspendue'] as const) {
      expect(
        evaluerConflitsSources({ claimsCites: [A, B], conflits: [conflit({ statut })] }),
      ).toEqual([]);
    }
  });

  // Un claim ne se contredit pas lui-même : le type impose deux entrées, pas
  // deux entrées DISTINCTES. Sans ce refus, une erreur de curation produirait
  // un constat où le praticien lirait le même identifiant des deux côtés.
  it('deux fois le même claim ne produit rien', () => {
    expect(
      evaluerConflitsSources({ claimsCites: [A], conflits: [conflit({ claims: [A, A] })] }),
    ).toEqual([]);
  });

  // Même identifiant, versions différentes : ce sont bien deux claims, et le
  // conflit est légitime — deux versions d'un même claim peuvent diverger.
  it('le même identifiant en deux versions reste un conflit', () => {
    const autreVersion = { claimId: A.claimId, versionClaim: 'v2.0' };
    expect(
      evaluerConflitsSources({
        claimsCites: [A],
        conflits: [conflit({ claims: [A, autreVersion] })],
      }),
    ).toHaveLength(1);
  });
});

describe('producteur CONFLIT_SOURCES — la forme du constat', () => {
  const [constat] = evaluerConflitsSources({ claimsCites: [A], conflits: [conflit()] });

  it('escalade au praticien, avec le motif de la politique — DC-55', () => {
    expect(constat.resolution).toEqual({
      statut: 'escaladee_praticien',
      motif: motifEscalade(),
    });
  });

  // Un constat escaladé RESTE ouvert : l'escalade est une issue, pas une
  // résolution ([[D-055]], `DC-55`). Le prédicat unique le dit déjà ; ce banc
  // épingle que la forme neuve n'y échappe pas.
  it('reste OUVERT au sens du prédicat unique', () => {
    expect(contradictionEstOuverte(constat)).toBe(true);
  });

  it('porte ses DEUX claims en sources et en justification', () => {
    expect(constat.sources).toEqual([
      { type: 'claim', claim: A },
      { type: 'claim', claim: B },
    ]);
    expect(constat.justificationClaims).toEqual([A, B]);
  });

  // `null`, jamais `0` : « moins de deux passations, écart NON APPLICABLE »
  // (`DC-24`, [[D-048]]). Un `0` dirait « les deux passations sont du même
  // jour » là où il n'y a aucune passation.
  it('l’écart entre passations est NON APPLICABLE', () => {
    expect(constat.ecartJoursEntreSources).toBeNull();
  });

  it('est réservé au praticien', () => {
    expect(constat.audience).toBe('praticien_seul');
  });
});

describe('producteur CONFLIT_SOURCES — la description composée', () => {
  it('attribue chaque position à son claim', () => {
    const texte = descriptionConflit(conflit());
    expect(texte).toContain(`${A.claimId} soutient que la chose est systématique.`);
    expect(texte).toContain(`${B.claimId} soutient que la chose n'est pas systématique.`);
    expect(texte).toContain('La chose est-elle systématique ?');
  });

  // `DC-27`, `DC-54` : aucune causalité, et surtout aucun des deux présenté
  // comme ayant raison. C'est la phrase que le praticien lit, et une politique
  // qui s'abstient doit s'abstenir jusque dans sa formulation.
  it('ne tranche pas entre les deux positions', () => {
    const texte = descriptionConflit(conflit());
    expect(texte).toContain("Aucun des deux n'a été retenu contre l'autre.");
    expect(texte).not.toMatch(/plus fiable|à retenir|prévaut|l'emporte|le plus récent/i);
  });

  it('est déterministe', () => {
    expect(descriptionConflit(conflit())).toBe(descriptionConflit(conflit()));
  });

  it('la description du constat est celle-là, pas une autre', () => {
    const [constat] = evaluerConflitsSources({ claimsCites: [A], conflits: [conflit()] });
    expect(constat.description).toBe(descriptionConflit(conflit()));
  });
});

describe('producteur CONFLIT_SOURCES — le registre du dépôt', () => {
  // Anti-vacuité : sans ce cas, tous les bancs ci-dessus resteraient verts sur
  // un registre vide, et le lot livrerait un moteur qui ne produit jamais rien.
  it('le conflit publié du dépôt produit bien un constat', () => {
    const publies = CONFLITS_SOURCES_V1.filter(c => c.statut === 'publiee');
    expect(publies.length).toBeGreaterThan(0);
    for (const publie of publies) {
      const constats = evaluerConflitsSources({ claimsCites: [publie.claims[0]] });
      expect(constats.map(c => c.id)).toContain(publie.id);
    }
  });

  // Le registre du dépôt ne doit pas produire sur un dossier qui ne cite rien :
  // c'est la propriété qui empêche un avertissement de corpus hors sol.
  it('aucun constat sur un dossier qui ne cite aucun claim', () => {
    expect(evaluerConflitsSources({ claimsCites: [] })).toEqual([]);
  });
});
