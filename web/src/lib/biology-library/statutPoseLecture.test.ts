import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { regrouperActesStatut, type ActeStatutLu } from './statutPoseLecture';

// La règle « dernier acte » ([[D-322]] §2), sur des actes de plusieurs lignes
// ENTRELACÉS dans l'ordre de la base : chaque ligne garde son propre fil.

const acte = (
  id: string,
  idResultat: string,
  a: ActeStatutLu['acte'],
  statut: ActeStatutLu['statut'],
): ActeStatutLu & { idResultat: string } => ({
  id,
  idResultat,
  acte: a,
  statut,
  praticienEmail: 'praticien@wellneuro.fr',
  acteLe: `2026-09-03T10:00:0${id.slice(-1)}.000Z`,
});

describe('regrouperActesStatut — le dernier acte de CHAQUE ligne fait foi', () => {
  it('des actes entrelacés de trois lignes : un actif par ligne, un historique par ligne, dans l’ordre', () => {
    const lignes = regrouperActesStatut([
      acte('s1', 'r1', 'pose', 'a_suivre'),
      acte('s2', 'r2', 'pose', 'donnee_a_verifier'),
      acte('s3', 'r1', 'retrait', null),
      acte('s4', 'r3', 'pose', 'relie_au_protocole'),
      acte('s5', 'r2', 'pose', 'contexte_a_preciser'),
      acte('s6', 'r3', 'retrait', null),
      acte('s7', 'r3', 'pose', 'aucune_action_retenue'),
    ]);
    expect(lignes.get('r1')?.actif).toBeNull();
    expect(lignes.get('r1')?.historique.map(a => a.id)).toEqual(['s1', 's3']);
    expect(lignes.get('r2')?.actif?.statut).toBe('contexte_a_preciser');
    expect(lignes.get('r2')?.historique.map(a => a.id)).toEqual(['s2', 's5']);
    expect(lignes.get('r3')?.actif).toMatchObject({ id: 's7', acte: 'pose', statut: 'aucune_action_retenue' });
    expect(lignes.get('r3')?.historique.map(a => a.id)).toEqual(['s4', 's6', 's7']);
  });

  it('aucun acte : aucune entrée — « sans statut posé », jamais un statut par défaut', () => {
    expect(regrouperActesStatut([]).size).toBe(0);
  });

  it('l’historique ne porte pas l’identifiant de ligne : il ne sort que par la ligne', () => {
    const [premier] = regrouperActesStatut([acte('s1', 'r1', 'pose', 'a_suivre')]).get('r1')!.historique;
    expect(premier).not.toHaveProperty('idResultat');
  });
});
