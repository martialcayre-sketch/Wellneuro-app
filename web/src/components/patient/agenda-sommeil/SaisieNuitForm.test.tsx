// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SaisieNuitForm } from './SaisieNuitForm';

// Ce que ces tests protègent : la saisie d'une nuit ne doit ni exiger un clavier
// (objectif « sans saisie textuelle »), ni pouvoir être validée sans geste
// (défaut de validité de la v1), ni laisser un champ obligatoire prendre une
// valeur par défaut.
//
// jsdom ne calcule aucune géométrie : le glissement au doigt n'est pas testable
// ici (getBoundingClientRect rend des zéros). C'est justement pourquoi le cadran
// répond AUSSI aux flèches — chemin clavier, obligatoire pour l'accessibilité,
// et seul chemin observable en test.

const HABITUELS = { extinction: '23:00', sortie: '07:00' };

function rendre(props: Partial<Parameters<typeof SaisieNuitForm>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <SaisieNuitForm
      initial={null}
      horairesHabituels={HABITUELS}
      submitting={false}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit };
}

const cta = () => screen.getByRole('button', { name: /c’est noté/i }) as HTMLButtonElement;
const poignees = () => screen.getAllByRole('slider');

// Le bouton reste ACTIF : c'est l'envoi qui doit être refusé tant qu'une
// réponse obligatoire manque, avec la liste de ce qui manque sous le bouton.
// `envoiRefuse` touche le bouton et dit si rien n'est parti.
function envoiRefuse(onSubmit: ReturnType<typeof vi.fn>): boolean {
  const appelsAvant = onSubmit.mock.calls.length;
  fireEvent.click(cta());
  return onSubmit.mock.calls.length === appelsAvant;
}

// Parcours minimal complet du contrat v2 : les deux poignées, l'endormissement,
// la nuit, l'aide au sommeil, le mode de lever et la qualité — sept gestes.
function completerLeMinimum() {
  poignees().forEach((p) => fireEvent.keyDown(p, { key: 'Enter' }));
  fireEvent.click(screen.getByRole('button', { name: 'En moins de 15 min' }));
  fireEvent.click(screen.getByRole('button', { name: /nuit continue/i }));
  fireEvent.click(screen.getByRole('button', { name: /aucune aide/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Au même moment que mon coucher' }));
  fireEvent.click(screen.getByRole('button', { name: 'Au même moment que mon réveil' }));
  fireEvent.click(screen.getByRole('button', { name: 'Très bonne' }));
}

afterEach(cleanup);

describe('saisie sans clavier', () => {
  it('n’expose aucun champ de texte', () => {
    rendre();
    fireEvent.click(screen.getByRole('button', { name: /ajouter des détails/i }));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('les deux ancres horaires sont des sliders accessibles', () => {
    rendre();
    const [extinction, sortie] = poignees();
    expect(extinction.getAttribute('aria-label')).toMatch(/éteint la lumière/i);
    expect(sortie.getAttribute('aria-label')).toMatch(/levé/i);
    expect(extinction.getAttribute('aria-valuetext')).toMatch(/23 heures/);
  });
});

describe('rien n’est pré-rempli', () => {
  it('à l’ouverture, rien ne part (défaut v1 corrigé) et ce qui manque est nommé', () => {
    const { onSubmit } = rendre();
    expect(cta().disabled).toBe(false);
    expect(envoiRefuse(onSubmit)).toBe(true);
    expect(screen.getByRole('alert').textContent).toMatch(
      /^Il reste à renseigner : les repères 🌑 et 🌅 du cadran, le coucher, .* et la qualité de la nuit\.$/,
    );
  });

  it('la liste raccourcit à chaque geste et disparaît une fois tout renseigné', () => {
    const { onSubmit } = rendre();
    envoiRefuse(onSubmit);
    fireEvent.click(screen.getByRole('button', { name: 'Très bonne' }));
    expect(screen.getByRole('alert').textContent).not.toMatch(/qualité/);
    completerLeMinimum();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('un envoi incomplet ramène le focus sur la première question sans réponse', () => {
    const { onSubmit } = rendre();
    poignees().forEach((p) => fireEvent.keyDown(p, { key: 'Enter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Au même moment que mon coucher' }));
    envoiRefuse(onSubmit);
    // Le coucher est renseigné : la première question vide est l'endormissement.
    expect(document.activeElement?.textContent).toMatch(/une fois la lumière éteinte/i);
  });

  it('les horaires proposés sont annoncés comme une proposition, pas une valeur', () => {
    rendre();
    expect(poignees()[0].getAttribute('aria-valuetext')).toMatch(/à confirmer/i);
  });

  it('toucher une poignée la confirme sans plus l’annoncer comme proposition', () => {
    rendre();
    fireEvent.keyDown(poignees()[0], { key: 'Enter' });
    expect(poignees()[0].getAttribute('aria-valuetext')).not.toMatch(/à confirmer/i);
    // La seconde poignée reste, elle, une proposition : chaque ancre demande
    // son propre geste.
    expect(poignees()[1].getAttribute('aria-valuetext')).toMatch(/à confirmer/i);
  });

  it('même en correction, seule la nuit visée est reprise', () => {
    rendre({
      initial: {
        heureCoucher: '00:15',
        heureLever: '08:00',
        latence: 'e15_30',
        qualite: 3,
        reveils: { dureeTotale: 'lt15' },
        aideSommeil: 'aucune',
        extinctionImmediate: true,
        leverImmediat: true,
      },
    });
    expect(poignees()[0].getAttribute('aria-valuetext')).toMatch(/0 heures 15/);
  });

  it('une classe d’éveil héritée n’est pas pré-sélectionnée : la question est reposée', () => {
    // La nuit v1 porte « 15 à 45 min », qui n'a plus de tuile. Pré-cocher une
    // tuile voisine trancherait à la place du patient ; on repose la question.
    const { onSubmit } = rendre({
      initial: {
        heureCoucher: '23:00',
        heureLever: '07:00',
        latence: 'lt15',
        qualite: 4,
        reveils: { dureeTotale: 'e15_45' },
      },
    });
    expect(envoiRefuse(onSubmit)).toBe(true);
    screen
      .getAllByRole('button', { pressed: true })
      .forEach((b) => expect(b.textContent).not.toMatch(/éveillé/i));
  });
});

describe('le cadran au clavier', () => {
  it('la flèche droite avance de 15 minutes', () => {
    rendre();
    const extinction = poignees()[0];
    fireEvent.keyDown(extinction, { key: 'ArrowRight' });
    expect(poignees()[0].getAttribute('aria-valuetext')).toMatch(/23 heures 15/);
  });

  it('passe minuit sans repartir à l’envers', () => {
    rendre();
    const extinction = poignees()[0];
    // 23:00 + 4×15 min = 00:00 le lendemain.
    for (let i = 0; i < 4; i += 1) fireEvent.keyDown(extinction, { key: 'ArrowRight' });
    expect(poignees()[0].getAttribute('aria-valuetext')).toMatch(/^0 heures$/);
  });

  it('Page monte d’une heure', () => {
    rendre();
    fireEvent.keyDown(poignees()[1], { key: 'PageUp' });
    expect(poignees()[1].getAttribute('aria-valuetext')).toMatch(/8 heures/);
  });
});

describe('géométrie du cadran', () => {
  // jsdom ne dessine rien, mais les coordonnées calculées sont vérifiables : un
  // arc tracé à l'envers, ou des poignées placées en miroir, ne se verrait dans
  // aucun autre test.
  it('minuit en haut, midi en bas, sens horaire', () => {
    const { container } = render(
      <SaisieNuitForm
        initial={null}
        horairesHabituels={HABITUELS}
        submitting={false}
        onSubmit={vi.fn()}
      />,
    );
    const [extinction, sortie] = Array.from(container.querySelectorAll('[role="slider"]'));
    // 23:00 = juste avant minuit → au-dessus du centre (cy = 100), à gauche.
    expect(Number(extinction.getAttribute('cy'))).toBeLessThan(100);
    expect(Number(extinction.getAttribute('cx'))).toBeLessThan(100);
    // 07:00 = après 06:00 (à droite) → à droite du centre, un peu plus bas.
    expect(Number(sortie.getAttribute('cx'))).toBeGreaterThan(100);
    expect(Number(sortie.getAttribute('cy'))).toBeGreaterThan(100);
  });

  it('l’arc de nuit va bien de l’extinction au lever, dans le sens horaire', () => {
    const { container } = render(
      <SaisieNuitForm
        initial={null}
        horairesHabituels={HABITUELS}
        submitting={false}
        onSubmit={vi.fn()}
      />,
    );
    const arc = container.querySelector('path')!.getAttribute('d')!;
    // 23:00 → 07:00 = 8 h = 120° : petit arc (0), sens horaire (1).
    expect(arc).toMatch(/A 70 70 0 0 1 /);
  });
});

describe('l’éveil nocturne est obligatoire', () => {
  it('sans lui, l’envoi reste impossible — jamais un zéro inféré', () => {
    const { onSubmit } = rendre();
    poignees().forEach((p) => fireEvent.keyDown(p, { key: 'Enter' }));
    fireEvent.click(screen.getByRole('button', { name: 'En moins de 15 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'Très bonne' }));
    expect(envoiRefuse(onSubmit)).toBe(true);
    expect(screen.getByRole('alert').textContent).toMatch(/la nuit/);
  });

  it('« nuit continue » est une réponse : elle débloque l’envoi', () => {
    const { onSubmit } = rendre();
    completerLeMinimum();
    fireEvent.click(cta());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        heureCoucher: '23:00',
        heureLever: '07:00',
        latence: 'lt15',
        qualite: 5,
        reveils: { dureeTotale: 'aucun', nombre: 0 },
        aideSommeil: 'aucune',
        extinctionImmediate: true,
        leverImmediat: true,
      }),
    );
  });
});

describe('aide au sommeil et mode de lever', () => {
  it('sans l’aide au sommeil, l’envoi reste impossible', () => {
    const { onSubmit } = rendre();
    poignees().forEach((p) => fireEvent.keyDown(p, { key: 'Enter' }));
    fireEvent.click(screen.getByRole('button', { name: 'En moins de 15 min' }));
    fireEvent.click(screen.getByRole('button', { name: /nuit continue/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Au même moment que mon réveil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Très bonne' }));
    expect(envoiRefuse(onSubmit)).toBe(true);
    expect(screen.getByRole('alert').textContent).toMatch(/l’aide pour dormir/);
  });

  it('la 3ᵉ poignée n’existe que si le patient est resté au lit', () => {
    rendre();
    expect(poignees()).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard que mon réveil' }));
    expect(poignees()).toHaveLength(3);
    expect(poignees()[1].getAttribute('aria-label')).toMatch(/réveillé/i);
  });

  it('rester au lit sans placer le repère bloque l’envoi', () => {
    const { onSubmit } = rendre();
    fireEvent.click(screen.getByRole('button', { name: 'En moins de 15 min' }));
    fireEvent.click(screen.getByRole('button', { name: /nuit continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /aucune aide/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Au même moment que mon coucher' }));
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard que mon réveil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Très bonne' }));
    // Ordre des poignées : extinction, réveil, sortie du lit. Les deux ancres
    // permanentes sont confirmées, la conditionnelle non.
    const [extinction, , sortie] = poignees();
    fireEvent.keyDown(extinction, { key: 'Enter' });
    fireEvent.keyDown(sortie, { key: 'Enter' });
    expect(envoiRefuse(onSubmit)).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe(
      'Il reste à renseigner : le repère 👁️ du cadran.',
    );
    fireEvent.keyDown(poignees()[1], { key: 'Enter' });
    expect(envoiRefuse(onSubmit)).toBe(false);
  });

  it('revenir à « dès mon réveil » efface l’heure de réveil', () => {
    // La garder enverrait une nuit contradictoire, que la validation refuse.
    const { onSubmit } = rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard que mon réveil' }));
    fireEvent.keyDown(poignees()[1], { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Au même moment que mon réveil' }));
    completerLeMinimum();
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].heureReveilFinal).toBeUndefined();
    expect(onSubmit.mock.calls[0][0].leverImmediat).toBe(true);
  });
});

describe('mise au lit', () => {
  it('la poignée de mise au lit n’apparaît qu’après « après un moment au lit »', () => {
    rendre();
    expect(poignees()).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard que mon coucher' }));
    expect(poignees()).toHaveLength(3);
    // Elle précède l'extinction dans l'ordre du DOM comme dans la nuit.
    expect(poignees()[0].getAttribute('aria-label')).toMatch(/mis·e au lit/i);
    expect(poignees()[1].getAttribute('aria-label')).toMatch(/éteint la lumière/i);
  });

  it('sans le mode de coucher, l’envoi reste impossible', () => {
    const { onSubmit } = rendre();
    poignees().forEach((p) => fireEvent.keyDown(p, { key: 'Enter' }));
    fireEvent.click(screen.getByRole('button', { name: 'En moins de 15 min' }));
    fireEvent.click(screen.getByRole('button', { name: /nuit continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /aucune aide/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Au même moment que mon réveil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Très bonne' }));
    expect(envoiRefuse(onSubmit)).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe('Il reste à renseigner : le coucher.');
  });

  it('revenir à « en me couchant » efface l’heure de mise au lit', () => {
    const { onSubmit } = rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard que mon coucher' }));
    fireEvent.keyDown(poignees()[0], { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Au même moment que mon coucher' }));
    completerLeMinimum();
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].heureMiseAuLit).toBeUndefined();
    expect(onSubmit.mock.calls[0][0].extinctionImmediate).toBe(true);
  });

  it('transmet l’heure quand le patient est resté au lit avant d’éteindre', () => {
    const { onSubmit } = rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard que mon coucher' }));
    // La poignée s'ouvre 30 min avant l'extinction proposée (23:00) → 22:30.
    fireEvent.keyDown(poignees()[0], { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'En moins de 15 min' }));
    fireEvent.click(screen.getByRole('button', { name: /nuit continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /aucune aide/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Au même moment que mon réveil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Très bonne' }));
    poignees().forEach((p) => fireEvent.keyDown(p, { key: 'Enter' }));
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].heureMiseAuLit).toBe('22:30');
    expect(onSubmit.mock.calls[0][0].extinctionImmediate).toBe(false);
  });

  it('la question de latence porte explicitement sur l’après-extinction', () => {
    // Les deux grandeurs se ressemblent et se confondaient : le libellé doit
    // dire laquelle on demande.
    rendre();
    expect(screen.getByText(/une fois la lumière éteinte/i)).toBeTruthy();
  });
});

describe('compte de réveils — exact, au compteur, sans clavier (v3)', () => {
  // Parcours d'une nuit coupée, prêt pour l'envoi, détails ouverts.
  function nuitCoupee() {
    const rendu = rendre();
    poignees().forEach((p) => fireEvent.keyDown(p, { key: 'Enter' }));
    fireEvent.click(screen.getByRole('button', { name: 'En moins de 15 min' }));
    fireEvent.click(screen.getByRole('button', { name: /éveillé·e longtemps/i }));
    fireEvent.click(screen.getByRole('button', { name: /aucune aide/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Au même moment que mon coucher' }));
    fireEvent.click(screen.getByRole('button', { name: 'Au même moment que mon réveil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Très bonne' }));
    fireEvent.click(screen.getByRole('button', { name: /ajouter des détails/i }));
    return rendu;
  }
  const plus = () => screen.getByRole('button', { name: 'Un réveil de plus' });
  const moins = () => screen.getByRole('button', { name: 'Un réveil de moins' });

  it('transmet un compte exact au-delà de trois — « 3 ou plus » n’existe plus', () => {
    const { onSubmit } = nuitCoupee();
    for (let i = 0; i < 5; i += 1) fireEvent.click(plus());
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].reveils).toEqual({ dureeTotale: 'e30_60', nombre: 5 });
  });

  it('reste facultatif : sans geste sur le compteur, le compte est absent', () => {
    const { onSubmit } = nuitCoupee();
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].reveils).toEqual({ dureeTotale: 'e30_60' });
  });

  it('décrémenter depuis 1 revient à « pas de réponse », jamais à un zéro', () => {
    // Un zéro contredirait la nuit coupée déclarée — le serveur le refuse.
    const { onSubmit } = nuitCoupee();
    fireEvent.click(plus());
    fireEvent.click(moins());
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].reveils).toEqual({ dureeTotale: 'e30_60' });
  });

  it('le compteur n’apparaît pas sur une nuit continue', () => {
    rendre();
    completerLeMinimum();
    fireEvent.click(screen.getByRole('button', { name: /ajouter des détails/i }));
    expect(screen.queryByRole('button', { name: 'Un réveil de plus' })).toBeNull();
  });
});

describe('facteurs — « rien de particulier » est exclusif', () => {
  it('cocher un facteur décoche « rien de particulier », et réciproquement', () => {
    const { onSubmit } = rendre();
    completerLeMinimum();
    fireEvent.click(screen.getByRole('button', { name: /ajouter des détails/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Rien de particulier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stress' }));
    fireEvent.click(cta());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ facteurs: { stress: true } }),
    );
  });

  it('aucun facteur coché : la clé est absente, pas un objet vide', () => {
    const { onSubmit } = rendre();
    completerLeMinimum();
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].facteurs).toBeUndefined();
  });
});

describe('confirmer ces horaires — un geste pour les deux ancres suggérées', () => {
  const bouton = () => screen.queryByRole('button', { name: /confirmer ces horaires/i });

  it('absent quand les horaires ne sont pas ceux du patient (défauts)', () => {
    rendre();
    expect(bouton()).toBeNull();
  });

  it('confirme l’extinction et le lever, et rien d’autre', () => {
    const { onSubmit } = rendre({ suggestionsPersonnelles: true });
    expect(bouton()?.textContent).toMatch(/23:00 → .*07:00/);
    fireEvent.click(bouton()!);
    poignees().forEach((p) => expect(p.getAttribute('aria-valuetext')).not.toMatch(/à confirmer/i));
    // Aucune autre réponse n'est reprise : l'envoi reste refusé.
    expect(envoiRefuse(onSubmit)).toBe(true);
    expect(screen.getByRole('alert').textContent).not.toMatch(/cadran/);
    expect(bouton()).toBeNull();
  });
});

describe('ordre des repères — refusé ici, sous le bouton, avant tout envoi', () => {
  it('un réveil placé après la sortie du lit est refusé avec le message du serveur', () => {
    const { onSubmit } = rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard que mon réveil' }));
    completerLeMinimum();
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard que mon réveil' }));
    // Ordre des poignées : extinction, réveil, sortie. Le réveil s'ouvre à
    // mi-nuit (03:00) ; cinq heures plus tard, il tombe à 08:00, après la
    // sortie du lit (07:00).
    fireEvent.keyDown(poignees()[1], { key: 'Enter' });
    for (let i = 0; i < 5; i += 1) fireEvent.keyDown(poignees()[1], { key: 'PageUp' });
    expect(envoiRefuse(onSubmit)).toBe(true);
    expect(screen.getByRole('alert').textContent).toMatch(
      /Le réveil doit se situer avant la sortie du lit\. Ajustez les repères du cadran\./,
    );
  });
});

describe('refus du serveur', () => {
  it('rendu sous le bouton d’envoi', () => {
    rendre({ refus: 'Cette nuit ne peut plus être notée.' });
    expect(screen.getByRole('alert').textContent).toBe('Cette nuit ne peut plus être notée.');
  });
});

describe('libellés visibles', () => {
  it('les ancres de l’échelle de qualité sont écrites, pas seulement lues', () => {
    rendre();
    expect(screen.getAllByText('Très difficile').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Très bonne').length).toBeGreaterThan(0);
  });

  it('la portée de l’aide pour dormir est affichée', () => {
    rendre();
    expect(screen.getByText('Médicament, mélatonine ou plante')).toBeTruthy();
  });
});
