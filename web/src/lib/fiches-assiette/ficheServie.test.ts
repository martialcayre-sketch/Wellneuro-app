import { describe, expect, it } from 'vitest';

// La partie pure du service patient ([[D-251]] §7-§8, lot 9). Données
// synthétiques seulement.

import {
  assiettesConseillees,
  contenuPourLePatient,
  etatAvantControle,
  placeDansLeProtocole,
  remisesEnCours,
} from './ficheServie';
import type { EtatVersion } from './etat';
import type { ContenuFicheAssiette } from './types';

const H = (c: string) => c.repeat(64);

function remise(id: string, sourceId: string, ordre: number) {
  return { id, sourceId, ordre: BigInt(ordre) };
}

const VALIDEE: EtatVersion = { etat: 'validee', ordre: '3', le: '2026-09-28T00:00:00.000Z', validateur: 'praticien@wellneuro.fr' };
const RETIREE: EtatVersion = {
  etat: 'retiree', ordre: '4', le: '2026-09-28T00:00:00.000Z', validateur: 'praticien@wellneuro.fr', motif: 'Motif synthétique.',
};

describe('remisesEnCours — la dernière remise de chaque fiche (amendement du 2026-09-28)', () => {
  it('ne garde, par fiche, que la remise d’ordre le plus grand, quel que soit l’ordre d’arrivée', () => {
    const lues = [remise('r1', 'WN-SRC-9990', 1), remise('r3', 'WN-SRC-9990', 3), remise('r2', 'WN-SRC-9990', 2)];
    expect(remisesEnCours(lues).map(r => r.id)).toEqual(['r3']);
  });

  it('v1, puis v2, puis v1 remise à nouveau : c’est la troisième remise qui est en cours', () => {
    const lues = [remise('v1-bis', 'WN-SRC-9990', 7), remise('v2', 'WN-SRC-9990', 5), remise('v1', 'WN-SRC-9990', 2)];
    expect(remisesEnCours(lues).map(r => r.id)).toEqual(['v1-bis']);
  });

  it('une remise par fiche, de la plus récente à la plus ancienne', () => {
    // L'ordre d'arrivée (c, a, b) n'est PAS l'ordre attendu : le tri se prouve.
    const lues = [
      remise('c1', 'WN-SRC-9992', 2),
      remise('a1', 'WN-SRC-9990', 1),
      remise('b1', 'WN-SRC-9991', 4),
      remise('a2', 'WN-SRC-9990', 6),
    ];
    expect(remisesEnCours(lues).map(r => r.id)).toEqual(['a2', 'b1', 'c1']);
  });

  it('aucune remise : aucune fiche', () => {
    expect(remisesEnCours([])).toEqual([]);
  });
});

describe('etatAvantControle — ce que l’état de la version remise permet', () => {
  const V = { contenuSha256: H('a') };

  it('une version validée passe au rejeu des contrôles', () => {
    expect(etatAvantControle({ contenuSha256: H('a') }, V, VALIDEE)).toBe('a_controler');
  });

  it('une version retirée reste, sans son texte', () => {
    expect(etatAvantControle({ contenuSha256: H('a') }, V, RETIREE)).toBe('retiree');
  });

  it('une remise dont l’empreinte n’est pas celle de sa version ne se sert pas, même validée', () => {
    expect(etatAvantControle({ contenuSha256: H('b') }, V, VALIDEE)).toBe('indisponible');
    expect(etatAvantControle({ contenuSha256: H('b') }, V, RETIREE)).toBe('indisponible');
  });

  it('un état qu’on ne sait pas lire, ou une version jamais validée, ne se sert pas (`DC-24`)', () => {
    expect(etatAvantControle({ contenuSha256: H('a') }, V, { etat: 'a_valider' })).toBe('indisponible');
    expect(etatAvantControle({ contenuSha256: H('a') }, V, { etat: 'illisible', raison: 'acte_inconnu' })).toBe('indisponible');
  });
});

describe('placeDansLeProtocole — la mention « ne fait plus partie de votre protocole actuel »', () => {
  it('le protocole servi porte l’assiette : actuel', () => {
    expect(placeDansLeProtocole('ASSIETTE_TEST', new Set(['ASSIETTE_TEST']))).toBe('actuel');
  });

  it('le protocole servi ne la porte plus : plus_actuel', () => {
    expect(placeDansLeProtocole('ASSIETTE_TEST', new Set(['ASSIETTE_AUTRE']))).toBe('plus_actuel');
    expect(placeDansLeProtocole('ASSIETTE_TEST', new Set())).toBe('plus_actuel');
  });

  it('aucun protocole servi établi : inconnu, jamais « plus actuel »', () => {
    expect(placeDansLeProtocole('ASSIETTE_TEST', null)).toBe('inconnu');
  });
});

describe('assiettesConseillees — ce que le protocole servi conseille encore (revue du lot 9, P1)', () => {
  const alimentation = (interventionStatus?: string, plateCode = 'ASSIETTE_TEST') => ({
    type: 'food', recommendedPlateRef: { plateCode }, ...(interventionStatus === undefined ? {} : { interventionStatus }),
  });

  it.each([undefined, 'active', 'conditionnelle_biologie', 'differee'])('statut %s : l’assiette reste au protocole', statut => {
    expect(assiettesConseillees([alimentation(statut)])).toEqual(new Set(['ASSIETTE_TEST']));
  });

  it.each(['contre_indiquee', 'non_indiquee_actuellement'])('statut %s : l’assiette en sort', statut => {
    expect(assiettesConseillees([alimentation(statut)])).toEqual(new Set());
  });

  it('une assiette contre-indiquée sur une action et ferme sur une autre reste conseillée', () => {
    expect(assiettesConseillees([alimentation('contre_indiquee'), alimentation('active')])).toEqual(new Set(['ASSIETTE_TEST']));
  });

  it('une action non alimentaire, ou sans assiette, ne compte pas', () => {
    expect(assiettesConseillees([
      { type: 'hydration', recommendedPlateRef: { plateCode: 'ASSIETTE_TEST' } },
      { type: 'food' },
    ])).toEqual(new Set());
  });
});

describe('contenuPourLePatient — le texte, sans les notes de relecture', () => {
  const CONTENU: ContenuFicheAssiette = {
    titre: 'Titre synthétique',
    precautions: [{ texte: 'Précaution synthétique.', claims: ['CLE-SENTINELLE-1'] }],
    sections: [
      {
        titre: 'Section synthétique',
        blocs: [
          { texte: 'Paragraphe un.', provenance: { type: 'verbatim' } },
          { texte: 'Paragraphe deux.', provenance: { type: 'claims', claims: ['CLE-SENTINELLE-2'] } },
        ],
      },
    ],
  };

  it('garde le titre, les précautions et les paragraphes, dans l’ordre', () => {
    expect(contenuPourLePatient(CONTENU)).toEqual({
      titre: 'Titre synthétique',
      precautions: ['Précaution synthétique.'],
      sections: [{ titre: 'Section synthétique', paragraphes: ['Paragraphe un.', 'Paragraphe deux.'] }],
    });
  });

  it('ne porte ni provenance ni clé de claim', () => {
    const serialise = JSON.stringify(contenuPourLePatient(CONTENU));
    expect(serialise).not.toContain('CLE-SENTINELLE');
    expect(serialise).not.toContain('provenance');
    expect(serialise).not.toContain('claims');
  });
});
