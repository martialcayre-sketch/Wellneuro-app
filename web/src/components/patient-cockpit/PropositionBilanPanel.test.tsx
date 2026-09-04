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
    ratios: [],
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
  // Le TRI appartient au moteur depuis D-072 : l'écran n'infère plus rien, il
  // rend le motif que le moteur a posé sur la ligne concernée.
  it('rend le motif d’écartement posé par le moteur', () => {
    rendre({
      lignes: [
        ligne({
          statut: 'recommande',
          motifs: [
            'Une déclaration « déjà exploré » a été écartée : sa date est postérieure à '
            + 'la date de référence, ou illisible. Le panel est traité comme non exploré.',
          ],
        }),
      ],
    });
    expect(screen.getByText(/a été écartée/i)).toBeTruthy();
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

describe('composition affichée', () => {
  it('les rapports calculés du panel sont montrés, plus tus', () => {
    rendre({
      lignes: [ligne({ ratios: [{ code: 'RATIO_HOMA', libelle: 'Indice HOMA' }] })],
    });
    expect(screen.getByText(/Rapports calculés/i).textContent).toContain('Indice HOMA');
  });
});

describe('retour de geste', () => {
  it('une consignation réussie le dit — un geste muet ne prouve rien', () => {
    rendre({ state: 'saved' });
    expect(screen.getByRole('status').textContent).toMatch(/consignée/i);
  });
});

describe('courrier médecin', () => {
  it('n’est proposé que si des lignes existent', () => {
    rendre({ lignes: [], onEtablirCourrier: vi.fn() });
    expect(screen.queryByRole('button', { name: /Établir et consigner/i })).toBeNull();
  });

  it('ne s’offre PAS quand rien n’est proposable — même prédicat que le générateur', () => {
    // Tous les panels déjà documentés : le serveur rendrait 409 après avoir
    // journalisé un accès. Le geste ne doit pas exister (revue M5).
    rendre({
      lignes: [ligne({ statut: 'deja_documente' }), ligne({ panelCode: 'PANEL_B', statut: 'non_indique_actuellement' })],
      onEtablirCourrier: vi.fn(),
    });
    expect(screen.queryByRole('button', { name: /Établir et consigner/i })).toBeNull();
  });

  it('expose le refus de partage du patient — exposé, jamais opposé', () => {
    const onEtablirCourrier = vi.fn();
    rendre({ onEtablirCourrier, partageMedecinTraitant: 'refuse' });
    expect(screen.getByText(/a refusé le partage/i)).toBeTruthy();
    expect(screen.getByText(/jamais opposée/i)).toBeTruthy();
    // Jamais opposé : le geste reste possible.
    fireEvent.change(screen.getByLabelText(/Nom du médecin destinataire/i), {
      target: { value: 'Dr Nicola' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Établir et consigner/i }));
    expect(onEtablirCourrier).toHaveBeenCalled();
  });

  it('patient jamais exprimé : l’écran le dit aussi', () => {
    rendre({ onEtablirCourrier: vi.fn() });
    expect(screen.getByText(/ne s’est pas exprimé sur le partage/i)).toBeTruthy();
  });

  it('un courrier consigné ne se re-consigne pas sans changer de destinataire', () => {
    const onEtablirCourrier = vi.fn();
    const { rerender } = render(
      <PropositionBilanPanel
        lignes={[ligne()]}
        limites={[]}
        documentes={[]}
        onDeclarer={vi.fn()}
        onEtablirCourrier={onEtablirCourrier}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Nom du médecin destinataire/i), {
      target: { value: 'Dr Nicola' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Établir et consigner/i }));
    expect(onEtablirCourrier).toHaveBeenCalledTimes(1);
    // Le résultat revient : le même clic ne doit plus rien écrire (revue M4).
    rerender(
      <PropositionBilanPanel
        lignes={[ligne()]}
        limites={[]}
        documentes={[]}
        onDeclarer={vi.fn()}
        onEtablirCourrier={onEtablirCourrier}
        courrier={{ texte: 'Docteur, …', ancrageSha256: 'a'.repeat(64), ancrageVersion: 'indications-biologie-v1' }}
      />,
    );
    const bouton = screen.getByRole('button', { name: /Établir et consigner/i }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    // Corriger le destinataire rouvre le geste.
    fireEvent.change(screen.getByLabelText(/Nom du médecin destinataire/i), {
      target: { value: 'Dr Martin' },
    });
    expect((screen.getByRole('button', { name: /Établir et consigner/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('demande un destinataire, et ne le part pas sans lui', () => {
    const onEtablirCourrier = vi.fn();
    rendre({ onEtablirCourrier });
    const bouton = screen.getByRole('button', { name: /Établir et consigner/i }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Nom du médecin destinataire/i), {
      target: { value: 'Dr Nicola' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Établir et consigner/i }));
    expect(onEtablirCourrier).toHaveBeenCalledWith('Dr Nicola');
  });

  it('dit qu’aucun envoi n’est automatique — la remise est manuelle', () => {
    rendre({ onEtablirCourrier: vi.fn() });
    expect(screen.getByText(/Aucun envoi automatique/i)).toBeTruthy();
  });

  it('affiche le texte à transcrire ET l’ancre qui l’explique', () => {
    rendre({
      onEtablirCourrier: vi.fn(),
      courrier: {
        texte: 'Docteur, …',
        ancrageSha256: 'a'.repeat(64),
        ancrageVersion: 'indications-biologie-v1',
      },
    });
    const statut = screen.getByRole('status').textContent ?? '';
    expect(statut).toMatch(/consigné/i);
    expect(statut).toContain('indications-biologie-v1');
    expect((screen.getByLabelText(/Texte du courrier/i) as HTMLTextAreaElement).value)
      .toBe('Docteur, …');
  });

  it('un refus serveur est affiché tel quel, jamais reformulé', () => {
    rendre({
      onEtablirCourrier: vi.fn(),
      courrierErreur: 'Le courrier dépasse la longueur consignable (8 000 caractères).',
    });
    expect(screen.getByRole('alert').textContent).toMatch(/8 000 caractères/);
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

// Lot Densité. Le cas ci-dessus reste vert que la justification soit repliée ou
// non — `getByText` lit le DOM, pas l'écran. Ce qui doit être gardé n'est donc
// pas la présence des claims, déjà couverte, mais LA FRONTIÈRE : ce qui tombe
// dans le repli et ce qui n'y tombe jamais.
describe('repli de la justification — la frontière', () => {
  const avecTout = () =>
    ligne({
      motifs: ['Ferritine attendue basse chez ce profil.'],
      justificationClaims: [{ claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' }],
      condition: 'Fatigue rapportée depuis plus de trois mois',
      declencheurRempli: false,
      analytes: [
        {
          code: 'BIO_INSULINE',
          libelle: 'Insulinémie',
          validationMedicaleRequise: true,
          remboursement: { statut: 'non_evalue', conditions: [], codesActesRetenus: [] },
        },
      ],
      ratios: [{ code: 'HOMA', libelle: 'Indice HOMA' }],
    });

  /** Le `<details>` de justification, atteint par son libellé de repli. */
  const repli = (): HTMLDetailsElement => {
    const details = screen.getByText('Ce qui justifie cette ligne').closest('details');
    expect(details).not.toBeNull();
    return details as HTMLDetailsElement;
  };

  it('motifs et claims sont repliés, et restent dans le DOM (DC-34, DC-35)', () => {
    rendre({ lignes: [avecTout()] });
    expect(repli().open).toBe(false);
    // « Chaque ligne cite les claims qui la fondent », dit le chapô du panneau :
    // repliés, ils sont toujours cités — retirés, la phrase deviendrait fausse.
    expect(repli().textContent).toContain('WN-CL-0312-018');
    expect(repli().textContent).toContain('Ferritine attendue basse');
  });

  it('l’avertissement de validation médicale n’est JAMAIS dans le repli', () => {
    rendre({ lignes: [avecTout()] });
    // Un avertissement au deuxième clic n'en est plus un.
    expect(repli().textContent).not.toContain('validation médicale');
    expect(screen.getByText(/Interprétation sous validation médicale/)).toBeTruthy();
  });

  it('libellé, statut, composition et geste de déclaration restent hors du repli', () => {
    rendre({ lignes: [avecTout()] });
    const cache = repli().textContent ?? '';
    // Le geste et le libellé sont lus par l'E2E biologie avec `toBeVisible()` et
    // `innerText()` — deux lectures qu'un repli rendrait muettes.
    for (const dehors of [
      'Bilan martial',
      'Recommandé',
      'Insulinémie',
      'Indice HOMA',
      'Déjà exploré hors outil',
      'Fatigue rapportée depuis plus de trois mois',
    ]) {
      expect(screen.getByText(new RegExp(dehors))).toBeTruthy();
      expect(cache).not.toContain(dehors);
    }
  });

  it('aucune ligne sans motif ni claim ne porte de repli vide', () => {
    rendre({ lignes: [ligne()] });
    expect(screen.queryByText('Ce qui justifie cette ligne')).toBeNull();
  });
});

// LOT-01 de « Biologie exploitée » : ce qui a été remis se relit. Avant ce
// lot, la pièce n'existait qu'en base et l'écran repartait vierge.
describe('documents déjà remis — la relecture, et ce qu’elle n’affirme pas', () => {
  const consigne = {
    id: 'doc1',
    texte: 'Texte tel qu’il est parti au patient.',
    ancrageSha256: 'a'.repeat(64),
    ancrageVersion: 'indications-biologie-v1',
    genereLe: '2026-09-03T08:30:00.000Z',
  };

  it('une pièce consignée s’affiche, et son texte se relit au geste', () => {
    rendre({
      onEtablirDocumentPatient: vi.fn(),
      documentsPatientConsignes: [consigne],
      lectureDocumentsPatient: 'ok',
    });
    // Le texte n'est pas déversé d'office : relire est un geste.
    expect(screen.queryByDisplayValue(consigne.texte)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /relire le texte/i }));
    expect(screen.getByDisplayValue(consigne.texte)).toBeTruthy();
  });

  it('lecture en échec : l’écran REFUSE d’affirmer qu’aucun document n’a été remis (DC-24)', () => {
    const relire = vi.fn();
    rendre({
      onEtablirDocumentPatient: vi.fn(),
      lectureDocumentsPatient: 'erreur',
      onRelireDocumentsPatient: relire,
    });
    expect(screen.queryByText(/Aucun document n’a encore été remis/i)).toBeNull();
    expect(screen.getByRole('alert').textContent).toMatch(/impossible d’affirmer/i);
    fireEvent.click(screen.getByRole('button', { name: /relire la liste/i }));
    expect(relire).toHaveBeenCalledTimes(1);
  });

  it('lecture en cours : aucun état vide affirmé non plus', () => {
    rendre({ onEtablirDocumentPatient: vi.fn(), lectureDocumentsPatient: 'chargement' });
    expect(screen.queryByText(/Aucun document n’a encore été remis/i)).toBeNull();
  });

  it('lecture aboutie et dossier vierge : là, et là seulement, l’écran l’affirme', () => {
    rendre({
      onEtablirDocumentPatient: vi.fn(),
      documentsPatientConsignes: [],
      lectureDocumentsPatient: 'ok',
    });
    expect(screen.getByText(/Aucun document n’a encore été remis/i)).toBeTruthy();
  });

  it('doublon signalé : le second temps est offert, et il confirme', () => {
    const etablir = vi.fn();
    rendre({
      onEtablirDocumentPatient: etablir,
      documentPatientDoublonATrancher: true,
      lectureDocumentsPatient: 'ok',
    });
    fireEvent.click(screen.getByRole('button', { name: /consigner une seconde copie/i }));
    expect(etablir).toHaveBeenCalledWith(true);
  });

  it('sans doublon signalé, le second temps n’existe pas', () => {
    rendre({ onEtablirDocumentPatient: vi.fn(), lectureDocumentsPatient: 'ok' });
    expect(screen.queryByRole('button', { name: /consigner une seconde copie/i })).toBeNull();
  });

  it('la relecture SURVIT quand plus aucun geste n’est offert', () => {
    // Tous les panels déclarés explorés : le geste d'établir disparaît — et
    // c'est précisément l'état où « qu'ai-je remis à ce patient ? » se pose.
    // Loger la relecture dans le formulaire la faisait disparaître avec lui
    // (contre-revue du 2026-09-04, M1).
    rendre({
      lignes: [ligne({ statut: 'deja_documente' })],
      onEtablirDocumentPatient: vi.fn(),
      documentsPatientConsignes: [consigne],
      lectureDocumentsPatient: 'ok',
    });
    expect(
      screen.queryByRole('button', { name: /établir et consigner le document patient/i }),
    ).toBeNull();
    expect(screen.getByText(/Documents déjà remis/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /relire le texte/i })).toBeTruthy();
  });

  it('liste au plafond : l’écran DIT qu’elle est tronquée', () => {
    const vingt = Array.from({ length: 20 }, (_, i) => ({ ...consigne, id: `doc${i}` }));
    rendre({
      onEtablirDocumentPatient: vi.fn(),
      documentsPatientConsignes: vingt,
      lectureDocumentsPatient: 'ok',
    });
    // Une liste coupée en silence se lit comme une liste complète.
    expect(screen.getByText(/Seules les 20 remises les plus récentes/i)).toBeTruthy();
  });

  it('liste courte : aucune mention de troncature', () => {
    rendre({
      onEtablirDocumentPatient: vi.fn(),
      documentsPatientConsignes: [consigne],
      lectureDocumentsPatient: 'ok',
    });
    expect(screen.queryByText(/les plus récentes sont affichées/i)).toBeNull();
  });
});
