// @vitest-environment jsdom
import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocumentComposer } from './DocumentComposer';
import { construireBloc, type Bloc } from '@/lib/documents';
import { MODELE_SUIVI_21J } from '@/lib/documents';

function blocs(): Bloc[] {
  return [
    construireBloc({
      id: 'narratif',
      type: 'narratif',
      regime: 'statique_valide',
      provenance: { source: 'c1_decision', ancrageHash: 'h_dec', version: 'c1-decision-v1' },
      contenu: {
        praticien: 'Résumé praticien interne',
        patient: 'Ce que vos réponses suggèrent',
        medecin: 'Explorations à discuter',
      },
    }),
    construireBloc({
      id: 'note',
      type: 'note_praticien',
      regime: 'statique_valide',
      provenance: { source: 'synthese_ia', ancrageHash: 'h_note', version: 'synthese-v3' },
      contenu: { praticien: 'Note strictement interne' }, // ni patient ni médecin
    }),
  ];
}

describe('DocumentComposer', () => {
  it('affiche les deux colonnes avec la provenance par bloc', () => {
    const { container } = render(<DocumentComposer modele={MODELE_SUIVI_21J} blocs={blocs()} />);
    const ui = within(container);
    expect(ui.getByLabelText('Sources praticien')).not.toBeNull();
    expect(ui.getByLabelText('Aperçu destinataire')).not.toBeNull();
    // Provenance visible côté sources.
    expect(container.textContent).toContain('Décision (C1) · c1-decision-v1');
  });

  it('n’expose aucune donnée interne praticien dans l’aperçu patient', () => {
    const { container } = render(<DocumentComposer modele={MODELE_SUIVI_21J} blocs={blocs()} />);
    const apercu = within(container).getByLabelText('Aperçu destinataire');
    expect(apercu.textContent).toContain('Ce que vos réponses suggèrent');
    expect(apercu.textContent).not.toContain('Résumé praticien interne');
    expect(apercu.textContent).not.toContain('Note strictement interne');
  });

  it('adapte l’aperçu au destinataire sélectionné', () => {
    const { container } = render(<DocumentComposer modele={MODELE_SUIVI_21J} blocs={blocs()} />);
    const ui = within(container);
    fireEvent.click(ui.getByRole('button', { name: 'Médecin traitant' }));
    const apercu = ui.getByLabelText('Aperçu destinataire');
    expect(apercu.textContent).toContain('Explorations à discuter');
    expect(apercu.textContent).not.toContain('Ce que vos réponses suggèrent');
  });

  it('progresse par la machine d’états et exige une action pour valider', () => {
    const { container } = render(<DocumentComposer modele={MODELE_SUIVI_21J} blocs={blocs()} />);
    const ui = within(container);
    expect(ui.getByLabelText('État : Brouillon')).not.toBeNull();
    fireEvent.click(ui.getByRole('button', { name: 'Marquer comme relu' }));
    expect(ui.getByLabelText('État : Relu')).not.toBeNull();
    // Le bouton « Valider le document » est l'action explicite qui franchit « validé ».
    fireEvent.click(ui.getByRole('button', { name: 'Valider le document' }));
    expect(ui.getByLabelText('État : Validé')).not.toBeNull();
    fireEvent.click(ui.getByRole('button', { name: 'Marquer comme envoyé' }));
    expect(ui.getByLabelText('État : Envoyé')).not.toBeNull();
    expect(container.textContent).toContain('parcours terminé');
  });
});
