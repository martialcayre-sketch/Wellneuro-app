// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LignePanelProposition } from '@/lib/biology-library/statuts';
import { PropositionBilanPanel } from './PropositionBilanPanel';

afterEach(cleanup);

// Les affirmations de doctrine revendiquées par ce lot ne vivaient dans aucun
// banc : elles étaient dans le changelog, pas dans le code. Ce fichier les
// garde — une reformulation qui les perdrait fait rougir le CI.

function ligne(partiel: Partial<LignePanelProposition> = {}): LignePanelProposition {
  return {
    panelCode: 'PANEL_A',
    libelle: 'Bilan martial',
    niveau: 'socle',
    objectif: null,
    statut: 'recommande',
    declencheurRempli: null,
    condition: null,
    motifs: [],
    justificationClaims: [],
    analytes: [],
    ...partiel,
  };
}

function rendre(props: Partial<Parameters<typeof PropositionBilanPanel>[0]> = {}) {
  return render(
    <PropositionBilanPanel
      lignes={[ligne()]}
      limites={[]}
      documentes={[]}
      onDeclarer={vi.fn()}
      {...props}
    />,
  );
}

describe('ce que l’écran doit dire à voix haute', () => {
  it('une proposition n’est pas une ordonnance (DC-31, DC-32)', () => {
    rendre();
    expect(screen.getByText(/pas une/i).textContent).toMatch(/ordonnance/i);
  });

  it('« non évalué » n’est jamais présenté comme « non remboursé »', () => {
    rendre({ limites: [{ type: 'remboursement_non_evalue' }] });
    const texte = screen.getByText(/personne n’a tranché/i).textContent ?? '';
    expect(texte).toMatch(/non évalué/i);
    expect(texte).toMatch(/ne veut pas dire « non remboursé »/i);
  });

  it('dit qu’un bilan non déclaré lui est inconnu', () => {
    rendre();
    expect(screen.getByText(/n’est connu que s’il a été déclaré/i)).toBeTruthy();
  });

  it('aucune valeur d’analyse n’est demandée ni conservée', () => {
    rendre();
    expect(screen.getByText(/Aucune valeur d’analyse conservée/i)).toBeTruthy();
  });
});

describe('déclarations écartées — dites, jamais tues (DC-30)', () => {
  it('nomme les panels écartés en clair, pas en code technique', () => {
    rendre({
      limites: [{ type: 'declaration_ecartee', panels: ['PANEL_A'] }],
    });
    const texte = screen.getByText(/Déclaration écartée/i).textContent ?? '';
    expect(texte).toContain('Bilan martial');
    expect(texte).not.toContain('PANEL_A');
  });

  it('signale sur la ligne qu’une déclaration existante n’est pas prise en compte', () => {
    rendre({
      lignes: [ligne({ statut: 'recommande' })],
      documentes: [
        {
          panelCode: 'PANEL_A',
          documenteLe: '2027-01-01T00:00:00.000Z',
          declarePar: 'praticien@wellneuro.fr',
          declareLe: '2026-08-17T00:00:00.000Z',
        },
      ],
    });
    // Sans cela, le badge « Recommandé » et la mention « Déclaré exploré le
    // 01/01/2027 » se contrediraient en silence sur la même ligne.
    expect(screen.getByText(/n’est pas prise en compte/i)).toBeTruthy();
  });
});

describe('corriger une déclaration', () => {
  it('le geste reste offert une fois le panel déclaré', () => {
    const onDeclarer = vi.fn();
    rendre({
      lignes: [ligne({ statut: 'deja_documente' })],
      documentes: [
        {
          panelCode: 'PANEL_A',
          documenteLe: '2016-08-01T00:00:00.000Z',
          declarePar: 'praticien@wellneuro.fr',
          declareLe: '2026-08-17T00:00:00.000Z',
        },
      ],
      onDeclarer,
    });
    // Une année saisie de travers retirerait sinon le panel de la proposition
    // sans issue : plus de formulaire, aucune route de suppression.
    const bouton = screen.getByRole('button', { name: /Corriger la date du bilan/i });
    fireEvent.click(bouton);
    fireEvent.change(screen.getByLabelText(/Date du bilan/i), {
      target: { value: '2026-08-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Consigner la déclaration/i }));
    expect(onDeclarer).toHaveBeenCalledWith('PANEL_A', '2026-08-01');
  });

  it('le formulaire ne demande aucun résultat, seulement une date', () => {
    rendre();
    fireEvent.click(screen.getByRole('button', { name: /Déjà exploré hors outil/i }));
    const champ = screen.getByLabelText(/Date du bilan/i) as HTMLInputElement;
    expect(champ.type).toBe('date');
    // Le verrou HDS n'est pas une validation manquante : c'est une surface
    // absente.
    expect(document.querySelectorAll('input[type="number"], textarea')).toHaveLength(0);
  });
});

describe('abstentions', () => {
  it('le motif du moteur est affiché tel quel, jamais reformulé (DC-34)', () => {
    rendre({ motifIndisponible: 'La table des indications n’est pas signée.' });
    expect(screen.getByText('La table des indications n’est pas signée.')).toBeTruthy();
  });

  it('une proposition vide dit sa cause plutôt que de rester muette', () => {
    rendre({ lignes: [] });
    expect(screen.getByText(/Aucun panel du catalogue n’est couvert/i)).toBeTruthy();
  });
});

describe('traçabilité de chaque ligne', () => {
  it('cite les claims et la validation médicale requise', () => {
    rendre({
      lignes: [
        ligne({
          justificationClaims: [{ claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' }],
          analytes: [
            {
              code: 'BIO_INSULINE',
              libelle: 'Insulinémie',
              validationMedicaleRequise: true,
              remboursement: { statut: 'non_evalue', conditions: [], codesActesRetenus: [] },
            },
          ],
        }),
      ],
    });
    expect(screen.getByText(/WN-CL-0312-018/)).toBeTruthy();
    expect(screen.getByText(/validation médicale/i)).toBeTruthy();
  });
});
