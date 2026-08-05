// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SaisieJourneeForm } from './SaisieJourneeForm';
import type { JourReponses } from '@/lib/agenda-alimentaire/types';

// Ce que ces tests protègent, dans l'ordre où le lot précédent a désigné les
// pièges :
//
//  1. le TRI-ÉTAT. « Je ne sais pas » doit produire `null` — une RÉPONSE —, et
//     une question non touchée doit produire l'ABSENCE de clé, jamais `false`.
//     `if (x)` confond les deux, et c'est ici que le raccourci s'écrirait ;
//  2. `soirPlusCopieux` n'admet PAS l'abstention : trois boutons y vaudraient un
//     400 systématique ;
//  3. rien n'est pré-coché à l'ouverture d'une journée vierge ;
//  4. `aucunePrise` neutralise la ligne de temps.

function rendre(props: Partial<Parameters<typeof SaisieJourneeForm>[0]> = {}) {
  const onSubmit = vi.fn();
  render(<SaisieJourneeForm initial={null} submitting={false} onSubmit={onSubmit} {...props} />);
  return { onSubmit };
}

const cta = () => screen.getByRole('button', { name: /c’est noté/i }) as HTMLButtonElement;
const bouton = (motif: RegExp) => screen.getByRole('button', { name: motif });

/** Une prise et les quatre présences répondues : le minimum que la route accepte. */
function completerLeMinimum() {
  fireEvent.click(screen.getByRole('button', { name: /ajouter une prise/i }));
  fireEvent.click(bouton(/protéines à votre première prise \?\s*oui/i));
  fireEvent.click(bouton(/légumes à au moins deux prises \?\s*non/i));
  fireEvent.click(bouton(/fruits ou des fruits à coque \?\s*je ne sais pas/i));
  fireEvent.click(bouton(/produits ultra-transformés \?\s*non/i));
}

function derniereReponse(onSubmit: ReturnType<typeof vi.fn>): JourReponses {
  return onSubmit.mock.calls[onSubmit.mock.calls.length - 1][0] as JourReponses;
}

afterEach(cleanup);

describe('rien n’est pré-coché', () => {
  it('le bouton d’envoi est inactif sur une journée vierge', () => {
    rendre();
    expect(cta().disabled).toBe(true);
  });

  it('aucun bouton de présence n’est enfoncé à l’ouverture', () => {
    rendre();
    const enfonces = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(enfonces).toHaveLength(0);
  });

  it('la ligne de temps s’ouvre vide, sans prise recopiée', () => {
    rendre();
    expect(screen.queryByTestId('prise-08:00')).toBeNull();
  });
});

describe('tri-état des quatre présences', () => {
  it('« je ne sais pas » envoie `null`, et non l’absence de clé', () => {
    const { onSubmit } = rendre();
    completerLeMinimum();
    fireEvent.click(cta());
    const reponses = derniereReponse(onSubmit);
    expect('fruitsOuOleagineux' in reponses).toBe(true);
    expect(reponses.fruitsOuOleagineux).toBeNull();
  });

  it('« non » envoie `false`, distinct de l’abstention', () => {
    const { onSubmit } = rendre();
    completerLeMinimum();
    fireEvent.click(cta());
    const reponses = derniereReponse(onSubmit);
    expect(reponses.legumesDeuxPrises).toBe(false);
    expect(reponses.ultraTransformes).toBe(false);
    expect(reponses.premierePriseProteines).toBe(true);
  });

  it('une présence NON TOUCHÉE bloque l’envoi — elle n’est jamais envoyée comme `false`', () => {
    const { onSubmit } = rendre();
    fireEvent.click(screen.getByRole('button', { name: /ajouter une prise/i }));
    fireEvent.click(bouton(/protéines à votre première prise \?\s*oui/i));
    fireEvent.click(bouton(/légumes à au moins deux prises \?\s*oui/i));
    fireEvent.click(bouton(/fruits ou des fruits à coque \?\s*oui/i));
    // `ultraTransformes` reste sans réponse.
    expect(cta().disabled).toBe(true);
    fireEvent.click(cta());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('le bouton « je ne sais pas » s’affiche enfoncé une fois choisi (`null`, pas `false`)', () => {
    rendre();
    const abstention = bouton(/fruits ou des fruits à coque \?\s*je ne sais pas/i);
    fireEvent.click(abstention);
    expect(abstention.getAttribute('aria-pressed')).toBe('true');
    expect(bouton(/fruits ou des fruits à coque \?\s*non/i).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });
});

describe('soirPlusCopieux n’admet pas l’abstention', () => {
  it('n’offre que deux boutons, sans « je ne sais pas »', () => {
    rendre();
    expect(screen.queryByRole('button', { name: /repas du soir.*je ne sais pas/i })).toBeNull();
    expect(bouton(/repas du soir.*oui/i)).toBeTruthy();
    expect(bouton(/repas du soir.*non/i)).toBeTruthy();
  });

  it('non touché, sa clé n’est pas envoyée — jamais `null`, jamais `false`', () => {
    const { onSubmit } = rendre();
    completerLeMinimum();
    fireEvent.click(cta());
    expect('soirPlusCopieux' in derniereReponse(onSubmit)).toBe(false);
  });

  it('touché, il part en booléen strict', () => {
    const { onSubmit } = rendre();
    completerLeMinimum();
    fireEvent.click(bouton(/repas du soir.*non/i));
    fireEvent.click(cta());
    expect(derniereReponse(onSubmit).soirPlusCopieux).toBe(false);
  });
});

describe('journée sans prise', () => {
  it('cocher « rien mangé » neutralise la ligne des prises', () => {
    rendre({ initial: { prises: [{ heure: '08:00', nature: 'repas' }] } });
    fireEvent.click(screen.getByLabelText(/rien mangé ni bu de sucré/i));
    expect((screen.getByTestId('prise-08:00') as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: /ajouter une prise/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('envoie `{ aucunePrise: true }` seul : aucune observation de contenu', () => {
    const { onSubmit } = rendre({ initial: { prises: [{ heure: '08:00', nature: 'repas' }] } });
    fireEvent.click(screen.getByLabelText(/rien mangé ni bu de sucré/i));
    expect(cta().disabled).toBe(false);
    fireEvent.click(cta());
    expect(onSubmit).toHaveBeenCalledWith({ aucunePrise: true });
  });
});

describe('aucune notion de quantité', () => {
  it('aucun libellé ne parle de gramme, de calorie, de portion ni de poids', () => {
    rendre();
    const texte = document.body.textContent ?? '';
    expect(texte).not.toMatch(/gramme|kcal|calorie|portion|peser|pesée|quantité/i);
  });
});
