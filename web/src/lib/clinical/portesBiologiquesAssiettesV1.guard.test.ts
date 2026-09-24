import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { cleClaim } from './catalogueConduitesV1';
import {
  PORTES_BIOLOGIQUES_ASSIETTES_METADATA,
  PORTES_BIOLOGIQUES_ASSIETTES_V1,
  anomaliesPortesBiologiques,
  lignesPortesBiologiquesServables,
  portesBiologiquesSignees,
  shaPerimetrePortesBiologiques,
  type LignePorteBiologique,
  type PortesBiologiquesMetadata,
} from './portesBiologiquesAssiettesV1';

// [[D-245]] — le premier étage de la porte biologique. Ce banc tient trois
// choses : la table est CELLE que le responsable a sélectionnée (cadrage §6),
// chaque marqueur existe au catalogue, et le verrou ferme sur chacun de ses
// termes — éprouvé sur une signature SIMULÉE, jamais sur la vraie, qui reste
// un acte praticien.

const MIGRATIONS = join(__dirname, '../../../prisma/migrations');

/** Les codes que les migrations insèrent dans `biology_analytes`. */
function codesAnalytesInseres(): Set<string> {
  const codes = new Set<string>();
  for (const dossier of readdirSync(MIGRATIONS, { withFileTypes: true })) {
    if (!dossier.isDirectory()) continue;
    const sql = readFileSync(join(MIGRATIONS, dossier.name, 'migration.sql'), 'utf8');
    for (const bloc of sql.matchAll(/INSERT INTO "biology_analytes"[\s\S]*?;/g)) {
      for (const m of bloc[0].matchAll(/'(BIO_[A-Z0-9_]+)'/g)) codes.add(m[1]);
    }
  }
  return codes;
}

/** Une signature posée PAR LE BANC sur un périmètre donné — jamais exportée. */
function signatureSimulee(lignes: readonly LignePorteBiologique[]): PortesBiologiquesMetadata {
  const claimsSource = [...new Map(lignes.flatMap(l => l.claims).map(c => [cleClaim(c), c])).values()].sort(
    (a, b) => cleClaim(a).localeCompare(cleClaim(b)),
  );
  return {
    validationExterne: true,
    dateValidation: '2026-09-24T09:00:00.000Z',
    claimsSource,
    shaPerimetre: shaPerimetrePortesBiologiques(lignes, claimsSource),
  };
}

function tousValides(lignes: readonly LignePorteBiologique[]): Set<string> {
  return new Set(lignes.flatMap(l => l.claims.map(cleClaim)));
}

describe('portes biologiques — la table est la sélection du responsable', () => {
  it('CINQ lignes, une par assiette, avec leurs claims exacts', () => {
    expect(
      PORTES_BIOLOGIQUES_ASSIETTES_V1.map(l => [l.plateCode, l.claims.map(c => c.claimId)]),
    ).toEqual([
      ['ASSIETTE_SEROTONINERGIQUE', ['WN-CL-0290-007']],
      ['ASSIETTE_ANTI_INFLAMMATOIRE', ['WN-CL-0293-013']],
      ['ASSIETTE_OMEGA_3', ['WN-CL-0294-004', 'WN-CL-0294-005']],
      ['ASSIETTE_DOPAMINERGIQUE', ['WN-CL-0289-005']],
      ['ASSIETTE_METHYLATION', ['WN-CL-0043-013', 'WN-CL-0043-014', 'WN-CL-0043-015']],
    ]);
    expect(PORTES_BIOLOGIQUES_ASSIETTES_V1.every(l => l.statut === 'publiee')).toBe(true);
  });

  it('la dopaminergique porte le HVA urinaire AJOUTÉ à la re-signature, en tête', () => {
    const dopa = PORTES_BIOLOGIQUES_ASSIETTES_V1.find(l => l.id === 'PB-DOPAMINERGIQUE');
    expect(dopa?.analyteCodes).toEqual(['BIO_HVA_URINAIRE', 'BIO_RATIO_HOMA', 'BIO_CRP_US']);
  });

  it('l’assiette oméga 3 porte le statut érythrocytaire AJOUTÉ à la signature, en tête', () => {
    const omega = PORTES_BIOLOGIQUES_ASSIETTES_V1.find(l => l.id === 'PB-OMEGA-3');
    expect(omega?.analyteCodes).toEqual(['BIO_AG_ERYTHROCYTAIRES', 'BIO_INDEX_OMEGA3', 'BIO_RATIO_AA_EPA', 'BIO_CRP_US']);
  });

  it('LES DEUX CLAIMS ÉCARTÉS ne sont cités nulle part — on ne les rajoute pas par oubli', () => {
    const cites = PORTES_BIOLOGIQUES_ASSIETTES_V1.flatMap(l => l.claims.map(c => c.claimId));
    expect(cites).not.toContain('WN-CL-0340-007');
    expect(cites).not.toContain('WN-CL-0292-005');
    // Et donc : pas de ligne pour l'antioxydante.
    expect(PORTES_BIOLOGIQUES_ASSIETTES_V1.map(l => l.plateCode)).not.toContain('ASSIETTE_ANTIOXYDANTE');
  });

  it('chaque marqueur est un analyte que les migrations insèrent au catalogue', () => {
    const catalogue = codesAnalytesInseres();
    // Anti-vacuité : un balayage cassé rendrait l'appartenance toujours fausse
    // — ou, pire, un ensemble vide qu'aucune assertion ne regarderait.
    expect(catalogue.size).toBeGreaterThanOrEqual(49);
    for (const ligne of PORTES_BIOLOGIQUES_ASSIETTES_V1) {
      for (const code of ligne.analyteCodes) expect(catalogue, `${ligne.id} → ${code}`).toContain(code);
    }
  });

  it('la table réelle ne porte aucune anomalie', () => {
    expect(anomaliesPortesBiologiques()).toEqual([]);
  });

  it('claimsSource déclare exactement les claims cités, triés, sans doublon', () => {
    const declares = PORTES_BIOLOGIQUES_ASSIETTES_METADATA.claimsSource.map(cleClaim);
    expect(declares).toEqual([...new Set(declares)].sort());
    expect(declares).toEqual([...tousValides(PORTES_BIOLOGIQUES_ASSIETTES_V1)].sort());
  });

  // AUCUN NOMBRE, et c'est la doctrine du premier étage (D-245 §1) : si un champ
  // numérique entrait un jour dans une ligne, ce serait une borne extraite d'un
  // claim — une interprétation. Le type l'empêche aujourd'hui ; ce cas empêche
  // qu'on élargisse le type sans le voir.
  // RÉCURSIF, et c'est un constat de revue (PR #1217) : la première version ne
  // regardait que le premier niveau, si bien qu'une borne glissée dans un objet
  // imbriqué — `{ claimId, versionClaim, seuil: 2 }` — passait.
  it('aucune ligne ne porte de valeur numérique, à aucune profondeur', () => {
    const nombres = (valeur: unknown, chemin: string): string[] => {
      if (typeof valeur === 'number') return [chemin];
      if (valeur === null || typeof valeur !== 'object') return [];
      return Object.entries(valeur).flatMap(([cle, v]) => nombres(v, `${chemin}.${cle}`));
    };
    const trouves = PORTES_BIOLOGIQUES_ASSIETTES_V1.flatMap(l => nombres(l, l.id));
    expect(trouves).toEqual([]);
    // Le garde mord : une borne imbriquée est trouvée.
    expect(nombres({ claims: [{ claimId: 'x', seuil: 2 }] }, 'PB-TEST')).toEqual(['PB-TEST.claims.0.seuil']);
  });
});

describe('portes biologiques — le verrou', () => {
  const lignes = PORTES_BIOLOGIQUES_ASSIETTES_V1;

  // LA VRAIE SIGNATURE ([[D-246]]) : le verrou s'ouvre sur la métadonnée du
  // module, sans rien simuler. Si ce cas rougit, le périmètre a bougé depuis
  // l'attestation — la réponse est une nouvelle signature, jamais un sha recopié.
  it('SIGNÉE par le responsable : le verrou s’ouvre et les cinq lignes sortent', () => {
    expect(portesBiologiquesSignees()).toBe(true);
    expect(lignesPortesBiologiquesServables(tousValides(lignes))).toHaveLength(5);
  });

  it('la même table, signature retirée, ne sort plus rien', () => {
    const retiree = { ...PORTES_BIOLOGIQUES_ASSIETTES_METADATA, validationExterne: false };
    expect(portesBiologiquesSignees(retiree, lignes)).toBe(false);
    expect(lignesPortesBiologiquesServables(tousValides(lignes), retiree, lignes)).toEqual([]);
  });

  it('OUVERT sur une signature simulée conforme : les cinq lignes sortent', () => {
    const signature = signatureSimulee(lignes);
    expect(portesBiologiquesSignees(signature, lignes)).toBe(true);
    expect(lignesPortesBiologiquesServables(tousValides(lignes), signature, lignes)).toHaveLength(5);
  });

  it('une ligne retouchée après signature referme le verrou (empreinte)', () => {
    const signature = signatureSimulee(lignes);
    const retouchees = lignes.map(l =>
      l.id === 'PB-METHYLATION' ? { ...l, analyteCodes: [...l.analyteCodes, 'BIO_FOLATES_ERYTHROCYTAIRES'] } : l,
    );
    expect(portesBiologiquesSignees(signature, retouchees)).toBe(false);
  });

  it('une date non canonique referme le verrou', () => {
    const signature = { ...signatureSimulee(lignes), dateValidation: '2026-09-24' };
    expect(portesBiologiquesSignees(signature, lignes)).toBe(false);
  });

  it('claims déclarés ≠ claims cités referme le verrou, même avec la bonne empreinte', () => {
    const base = signatureSimulee(lignes);
    const amputee = base.claimsSource.slice(1);
    const signature = { ...base, claimsSource: amputee, shaPerimetre: shaPerimetrePortesBiologiques(lignes, amputee) };
    expect(portesBiologiquesSignees(signature, lignes)).toBe(false);
  });

  it('une assiette d’OBSERVATION referme le verrou, même signée', () => {
    const fautives = lignes.map(l => (l.id === 'PB-DOPAMINERGIQUE' ? { ...l, plateCode: 'ASSIETTE_SOIR_LEGER' } : l));
    expect(anomaliesPortesBiologiques(fautives)).toContain(
      "PB-DOPAMINERGIQUE : ASSIETTE_SOIR_LEGER n'est pas une assiette d'indication du catalogue",
    );
    expect(portesBiologiquesSignees(signatureSimulee(fautives), fautives)).toBe(false);
  });

  it('une table vide ne se signe pas', () => {
    expect(portesBiologiquesSignees(signatureSimulee([]), [])).toBe(false);
  });
});

describe('portes biologiques — ce qui sort', () => {
  const lignes = PORTES_BIOLOGIQUES_ASSIETTES_V1;
  const signature = signatureSimulee(lignes);

  it('corpus illisible (`null`) : rien ne sort, sans se confondre avec « aucun claim valide »', () => {
    expect(lignesPortesBiologiquesServables(null, signature, lignes)).toEqual([]);
    expect(lignesPortesBiologiquesServables(new Set(), signature, lignes)).toEqual([]);
  });

  it('UN claim retiré du corpus retire SA ligne entière — jamais une citation à moitié', () => {
    const valides = tousValides(lignes);
    valides.delete(cleClaim({ claimId: 'WN-CL-0294-005', versionClaim: 'v1.0' }));
    const sortantes = lignesPortesBiologiquesServables(valides, signature, lignes).map(l => l.id);
    expect(sortantes).not.toContain('PB-OMEGA-3');
    expect(sortantes).toHaveLength(4);
  });

  it('un brouillon reste dans le périmètre signé et hors de l’écran', () => {
    const avecBrouillon = lignes.map(l => (l.id === 'PB-METHYLATION' ? { ...l, statut: 'brouillon' as const } : l));
    const sig = signatureSimulee(avecBrouillon);
    const sortantes = lignesPortesBiologiquesServables(tousValides(avecBrouillon), sig, avecBrouillon).map(l => l.id);
    expect(sortantes).not.toContain('PB-METHYLATION');
    expect(sortantes).toHaveLength(4);
  });
});
