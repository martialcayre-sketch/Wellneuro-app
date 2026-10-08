// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SaisieNuitForm } from './SaisieNuitForm';

// Ce que ces tests protègent : la saisie d'une nuit ne doit ni exiger un clavier
// à taper (objectif « sans saisie textuelle »), ni pouvoir être validée sans
// geste (défaut de validité de la v1), ni laisser un champ obligatoire prendre
// une valeur par défaut — et elle doit toujours dire ce qui manque (défaut du
// bouton grisé muet, corrigé au LOT-01). Depuis le LOT-03, les heures se
// choisissent dans des listes au quart d'heure et la saisie tient en trois
// écrans : le soir, la nuit, le matin.

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
const continuer = () => fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
const retour = () => fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
const titre = () => screen.getByRole('heading', { level: 3 }).textContent;
const clic = (nom: string | RegExp) => fireEvent.click(screen.getByRole('button', { name: nom }));
// La liste de ce qui manque, sous le bouton (annonce polie, pas une alerte).
const reste = () => screen.queryByText(/^Il reste à renseigner/);
const liste = (label: RegExp) => screen.getByLabelText(label) as HTMLSelectElement;
const choisir = (label: RegExp, heure: string) =>
  fireEvent.change(liste(label), { target: { value: heure } });

// Le bouton d'envoi est toujours ACTIF : c'est l'envoi qui doit être refusé
// tant qu'une réponse obligatoire manque. `envoiRefuse` le touche et dit si
// rien n'est parti.
function envoiRefuse(onSubmit: ReturnType<typeof vi.fn>): boolean {
  const appelsAvant = onSubmit.mock.calls.length;
  fireEvent.click(cta());
  return onSubmit.mock.calls.length === appelsAvant;
}

function soirMinimum() {
  choisir(/éteint la lumière à/, '23:00');
  clic('Au même moment que mon coucher');
  clic('En moins de 15 min');
}
function nuitMinimum() {
  clic('Nuit continue, aucun réveil');
  clic('Aucune aide pour dormir cette nuit');
}
function matinMinimum() {
  choisir(/levé·e à/, '07:00');
  clic('Au même moment que mon réveil');
  clic('Très bonne');
}
// Parcours minimal complet du contrat v3 : huit réponses, trois écrans.
function completerLeMinimum() {
  soirMinimum();
  continuer();
  nuitMinimum();
  continuer();
  matinMinimum();
}

afterEach(cleanup);

describe('saisie sans clavier à taper', () => {
  it('aucun écran n’expose de champ de texte', () => {
    rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard que mon coucher' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    soirMinimum();
    continuer();
    expect(screen.queryByRole('textbox')).toBeNull();
    nuitMinimum();
    continuer();
    clic('Plus tard que mon réveil');
    clic(/ajouter des détails/i);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('revenir sur « Choisir » ne vide pas une heure déjà donnée', () => {
    rendre();
    choisir(/éteint la lumière à/, '23:00');
    choisir(/éteint la lumière à/, '');
    expect(liste(/éteint la lumière à/).value).toBe('23:00');
  });

  it('les heures sont des listes au quart d’heure, ouvertes sur « Choisir »', () => {
    rendre();
    const extinction = liste(/éteint la lumière à/);
    expect(extinction.value).toBe('');
    const valeurs = Array.from(extinction.options)
      .map((o) => o.value)
      .filter(Boolean);
    expect(valeurs).toHaveLength(96);
    expect(valeurs.every((v) => /^([01]\d|2[0-3]):(00|15|30|45)$/.test(v))).toBe(true);
    // Le soir, la liste part de 18 h : la nuit se lit d'un seul tenant.
    expect(valeurs[0]).toBe('18:00');
    expect(valeurs).toContain('00:30');
  });

  it('le matin, la liste part de 3 h', () => {
    rendre();
    soirMinimum();
    continuer();
    nuitMinimum();
    continuer();
    const valeurs = Array.from(liste(/levé·e à/).options)
      .map((o) => o.value)
      .filter(Boolean);
    expect(valeurs[0]).toBe('03:00');
  });
});

describe('trois écrans — rien ne passe sans geste, et ce qui manque est nommé', () => {
  it('à l’ouverture, « Continuer » ne passe pas et nomme les trois réponses du soir', () => {
    rendre();
    expect(titre()).toBe('Le soir');
    continuer();
    expect(titre()).toBe('Le soir');
    expect(reste()!.textContent).toBe(
      'Il reste à renseigner : l’heure où vous avez éteint 🌑, le coucher et l’endormissement.',
    );
  });

  it('la liste raccourcit à chaque geste et disparaît une fois l’écran complet', () => {
    rendre();
    continuer();
    clic('En moins de 15 min');
    expect(reste()!.textContent).not.toMatch(/endormissement/);
    soirMinimum();
    expect(reste()).toBeNull();
  });

  it('« Continuer » incomplet ramène le focus sur le premier contrôle sans réponse', () => {
    rendre();
    choisir(/éteint la lumière à/, '23:00');
    clic('Au même moment que mon coucher');
    continuer();
    expect(document.activeElement?.textContent).toBe('En moins de 15 min');
  });

  it('un écran complet passe au suivant ; « Retour » garde les réponses', () => {
    rendre();
    soirMinimum();
    continuer();
    expect(titre()).toBe('Pendant la nuit');
    retour();
    expect(titre()).toBe('Le soir');
    expect(liste(/éteint la lumière à/).value).toBe('23:00');
    expect(
      screen.getByRole('button', { name: 'En moins de 15 min' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('le bouton d’envoi est actif et ne part pas sans la qualité', () => {
    const { onSubmit } = rendre();
    soirMinimum();
    continuer();
    nuitMinimum();
    continuer();
    choisir(/levé·e à/, '07:00');
    clic('Au même moment que mon réveil');
    expect(cta().disabled).toBe(false);
    expect(envoiRefuse(onSubmit)).toBe(true);
    expect(reste()!.textContent).toBe('Il reste à renseigner : la qualité de la nuit.');
  });

  it('une correction complète part sans geste supplémentaire', () => {
    const { onSubmit } = rendre({
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
    expect(liste(/éteint la lumière à/).value).toBe('00:15');
    continuer();
    continuer();
    expect(envoiRefuse(onSubmit)).toBe(false);
  });

  it('une classe d’éveil héritée n’est pas pré-sélectionnée : la question est reposée', () => {
    // La nuit v1 porte « 15 à 45 min », qui n'a plus de tuile. Pré-cocher une
    // tuile voisine trancherait à la place du patient ; on repose la question.
    rendre({
      initial: {
        heureCoucher: '23:00',
        heureLever: '07:00',
        latence: 'lt15',
        qualite: 4,
        reveils: { dureeTotale: 'e15_45' },
        aideSommeil: 'aucune',
        extinctionImmediate: true,
        leverImmediat: true,
      },
    });
    continuer();
    screen
      .getAllByRole('button', { pressed: true })
      .forEach((b) => expect(b.textContent).not.toMatch(/éveillé/i));
    continuer();
    expect(titre()).toBe('Pendant la nuit');
    expect(reste()!.textContent).toBe('Il reste à renseigner : la nuit.');
  });
});

describe('l’éveil nocturne est obligatoire', () => {
  it('sans lui, l’écran de la nuit ne passe pas — jamais un zéro inféré', () => {
    rendre();
    soirMinimum();
    continuer();
    clic('Aucune aide pour dormir cette nuit');
    continuer();
    expect(titre()).toBe('Pendant la nuit');
    expect(reste()!.textContent).toBe('Il reste à renseigner : la nuit.');
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

  it('l’ordre de grandeur de chaque classe est écrit sous sa tuile', () => {
    rendre();
    soirMinimum();
    continuer();
    expect(screen.getByText('moins de 15 min au total')).toBeTruthy();
    expect(screen.getByText('30 à 60 min au total')).toBeTruthy();
    // Le nom accessible commence par le texte visible (WCAG 2.5.3).
    expect(screen.getByRole('button', { name: /^Un bref réveil, moins de 15 min au total$/ })).toBeTruthy();
  });
});

describe('aide au sommeil', () => {
  it('sans elle, l’écran de la nuit ne passe pas', () => {
    rendre();
    soirMinimum();
    continuer();
    clic('Nuit continue, aucun réveil');
    continuer();
    expect(reste()!.textContent).toBe('Il reste à renseigner : l’aide pour dormir.');
  });

  it('sa portée est affichée', () => {
    rendre();
    soirMinimum();
    continuer();
    expect(screen.getByText('Médicament, mélatonine ou plante')).toBeTruthy();
  });
});

describe('réveil final', () => {
  function jusquAuMatin() {
    soirMinimum();
    continuer();
    nuitMinimum();
    continuer();
  }

  it('la liste du réveil n’existe que si le patient s’est levé plus tard', () => {
    rendre();
    jusquAuMatin();
    expect(screen.queryByLabelText(/réveillé·e à/)).toBeNull();
    clic('Plus tard que mon réveil');
    expect(screen.getByLabelText(/réveillé·e à/)).toBeTruthy();
  });

  it('se lever plus tard sans donner l’heure du réveil bloque l’envoi', () => {
    const { onSubmit } = rendre();
    jusquAuMatin();
    choisir(/levé·e à/, '07:00');
    clic('Plus tard que mon réveil');
    clic('Très bonne');
    expect(envoiRefuse(onSubmit)).toBe(true);
    expect(reste()!.textContent).toBe('Il reste à renseigner : l’heure du réveil 👁️.');
    choisir(/réveillé·e à/, '06:30');
    expect(envoiRefuse(onSubmit)).toBe(false);
    expect(onSubmit.mock.calls[0][0].heureReveilFinal).toBe('06:30');
    expect(onSubmit.mock.calls[0][0].leverImmediat).toBe(false);
  });

  it('revenir à « au même moment » efface l’heure du réveil', () => {
    // La garder enverrait une nuit contradictoire, que la validation refuse.
    const { onSubmit } = rendre();
    jusquAuMatin();
    clic('Plus tard que mon réveil');
    choisir(/réveillé·e à/, '06:30');
    matinMinimum();
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].heureReveilFinal).toBeUndefined();
    expect(onSubmit.mock.calls[0][0].leverImmediat).toBe(true);
  });
});

describe('mise au lit', () => {
  it('la liste du coucher n’apparaît qu’après « plus tard »', () => {
    rendre();
    expect(screen.queryByLabelText(/mis·e au lit à/)).toBeNull();
    clic('Plus tard que mon coucher');
    expect(screen.getByLabelText(/mis·e au lit à/)).toBeTruthy();
  });

  it('transmet l’heure quand le patient est resté au lit avant d’éteindre', () => {
    const { onSubmit } = rendre();
    choisir(/éteint la lumière à/, '23:00');
    clic('Plus tard que mon coucher');
    choisir(/mis·e au lit à/, '22:30');
    clic('En moins de 15 min');
    continuer();
    nuitMinimum();
    continuer();
    matinMinimum();
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].heureMiseAuLit).toBe('22:30');
    expect(onSubmit.mock.calls[0][0].extinctionImmediate).toBe(false);
  });

  it('revenir à « au même moment » efface l’heure du coucher', () => {
    const { onSubmit } = rendre();
    clic('Plus tard que mon coucher');
    choisir(/mis·e au lit à/, '22:30');
    completerLeMinimum();
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].heureMiseAuLit).toBeUndefined();
    expect(onSubmit.mock.calls[0][0].extinctionImmediate).toBe(true);
  });

  it('la question de latence porte explicitement sur l’après-extinction', () => {
    rendre();
    expect(screen.getByText(/une fois la lumière éteinte/i)).toBeTruthy();
  });
});

describe('compte de réveils — exact, au compteur, sans clavier (v3)', () => {
  // Parcours d'une nuit coupée, prêt pour l'envoi.
  function nuitCoupee() {
    const rendu = rendre();
    soirMinimum();
    continuer();
    clic(/éveillé·e longtemps/i);
    clic('Aucune aide pour dormir cette nuit');
    return rendu;
  }
  function finir() {
    continuer();
    matinMinimum();
    fireEvent.click(cta());
  }
  const plus = () => screen.getByRole('button', { name: 'Un réveil de plus' });
  const moins = () => screen.getByRole('button', { name: 'Un réveil de moins' });

  it('transmet un compte exact au-delà de trois', () => {
    const { onSubmit } = nuitCoupee();
    for (let i = 0; i < 5; i += 1) fireEvent.click(plus());
    finir();
    expect(onSubmit.mock.calls[0][0].reveils).toEqual({ dureeTotale: 'e30_60', nombre: 5 });
  });

  it('reste facultatif : sans geste sur le compteur, le compte est absent', () => {
    const { onSubmit } = nuitCoupee();
    finir();
    expect(onSubmit.mock.calls[0][0].reveils).toEqual({ dureeTotale: 'e30_60' });
  });

  it('décrémenter depuis 1 revient à « pas de réponse », jamais à un zéro', () => {
    const { onSubmit } = nuitCoupee();
    fireEvent.click(plus());
    fireEvent.click(moins());
    finir();
    expect(onSubmit.mock.calls[0][0].reveils).toEqual({ dureeTotale: 'e30_60' });
  });

  it('le compteur n’apparaît pas sur une nuit continue', () => {
    rendre();
    soirMinimum();
    continuer();
    nuitMinimum();
    expect(screen.queryByRole('button', { name: 'Un réveil de plus' })).toBeNull();
  });
});

describe('facteurs — « rien de particulier » est exclusif', () => {
  it('cocher un facteur décoche « rien de particulier », et réciproquement', () => {
    const { onSubmit } = rendre();
    completerLeMinimum();
    clic(/ajouter des détails/i);
    clic('Rien de particulier');
    clic('Stress');
    fireEvent.click(cta());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ facteurs: { stress: true } }));
  });

  it('aucun facteur coché : la clé est absente, pas un objet vide', () => {
    const { onSubmit } = rendre();
    completerLeMinimum();
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].facteurs).toBeUndefined();
  });
});

describe('confirmer ces horaires — un geste pour les deux heures suggérées', () => {
  const bouton = () => screen.queryByRole('button', { name: /confirmer ces horaires/i });

  it('absent quand les horaires ne sont pas ceux du patient (défauts)', () => {
    rendre();
    expect(bouton()).toBeNull();
  });

  it('masqué dès qu’une des deux heures est choisie à la main', () => {
    rendre({ suggestionsPersonnelles: true });
    choisir(/éteint la lumière à/, '22:45');
    expect(bouton()).toBeNull();
  });

  it('confirme l’extinction et le lever, et rien d’autre', () => {
    rendre({ suggestionsPersonnelles: true });
    expect(bouton()?.textContent).toMatch(/23:00 → .*07:00/);
    fireEvent.click(bouton()!);
    expect(liste(/éteint la lumière à/).value).toBe('23:00');
    expect(bouton()).toBeNull();
    // Aucune autre réponse n'est reprise : l'écran du soir reste incomplet.
    continuer();
    expect(reste()!.textContent).toBe('Il reste à renseigner : le coucher et l’endormissement.');
    clic('Au même moment que mon coucher');
    clic('En moins de 15 min');
    continuer();
    nuitMinimum();
    continuer();
    expect(liste(/levé·e à/).value).toBe('07:00');
  });
});

describe('ordre des heures — refusé avant tout envoi, sur l’écran à corriger', () => {
  function reveilApresLeLever() {
    const rendu = rendre();
    soirMinimum();
    continuer();
    nuitMinimum();
    continuer();
    choisir(/levé·e à/, '07:00');
    clic('Plus tard que mon réveil');
    choisir(/réveillé·e à/, '08:00');
    clic('Très bonne');
    return rendu;
  }

  it('un réveil après la sortie du lit est refusé avec le message du serveur', () => {
    const { onSubmit } = reveilApresLeLever();
    expect(envoiRefuse(onSubmit)).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe(
      'Le réveil doit se situer avant la sortie du lit. Ajustez les heures.',
    );
    expect(titre()).toBe('Le matin');
    expect(document.activeElement?.id).toBe('agenda-heure-reveil');
  });

  it('le refus disparaît quand l’heure fautive disparaît', () => {
    const { onSubmit } = reveilApresLeLever();
    envoiRefuse(onSubmit);
    clic('Au même moment que mon réveil');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('le refus disparaît dès qu’une heure bouge', () => {
    const { onSubmit } = reveilApresLeLever();
    envoiRefuse(onSubmit);
    choisir(/réveillé·e à/, '06:30');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(envoiRefuse(onSubmit)).toBe(false);
  });

  it('une extinction avant le coucher ramène à l’écran du soir', async () => {
    const { onSubmit } = rendre();
    choisir(/éteint la lumière à/, '23:00');
    clic('Plus tard que mon coucher');
    choisir(/mis·e au lit à/, '23:30');
    clic('En moins de 15 min');
    continuer();
    nuitMinimum();
    continuer();
    matinMinimum();
    await act(async () => {
      fireEvent.click(cta());
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(titre()).toBe('Le soir');
    expect(screen.getByRole('alert').textContent).toBe(
      'L’extinction doit suivre la mise au lit. Ajustez les heures.',
    );
  });
});

describe('refus du serveur', () => {
  it('rendu sur l’écran du matin seulement, sous le bouton d’envoi', () => {
    rendre({ refus: 'Cette nuit ne peut plus être notée.' });
    expect(screen.queryByRole('alert')).toBeNull();
    soirMinimum();
    continuer();
    expect(screen.queryByRole('alert')).toBeNull();
    nuitMinimum();
    continuer();
    expect(screen.getByRole('alert').textContent).toBe('Cette nuit ne peut plus être notée.');
  });
});

describe('changement d’écran', () => {
  it('le titre du nouvel écran reçoit le focus — pas à l’ouverture', () => {
    rendre();
    expect(document.activeElement?.tagName).not.toBe('H3');
    soirMinimum();
    continuer();
    expect(document.activeElement?.textContent).toBe('Pendant la nuit');
  });

  it('un double appui sur « Continuer » de l’écran de la nuit n’envoie rien', () => {
    const { onSubmit } = rendre({
      initial: {
        heureCoucher: '23:00',
        heureLever: '07:00',
        latence: 'lt15',
        qualite: 4,
        reveils: { dureeTotale: 'aucun', nombre: 0 },
        aideSommeil: 'aucune',
        extinctionImmediate: true,
        leverImmediat: true,
      },
    });
    continuer();
    const bouton = screen.getByRole('button', { name: 'Continuer' });
    fireEvent.click(bouton);
    // Le second appui tombe sur l'ANCIEN nœud : détaché, il ne fait rien.
    fireEvent.click(bouton);
    expect(titre()).toBe('Le matin');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(reste()).toBeNull();
  });
});

describe('libellés visibles', () => {
  it('les ancres de l’échelle de qualité sont écrites, pas seulement lues', () => {
    rendre();
    soirMinimum();
    continuer();
    nuitMinimum();
    continuer();
    expect(screen.getAllByText('Très difficile').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Très bonne').length).toBeGreaterThan(0);
  });
});
