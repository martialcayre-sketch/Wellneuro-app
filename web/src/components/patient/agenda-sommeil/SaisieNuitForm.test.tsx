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

const HABITUELS = { coucher: '23:00', sortie: '07:00' };

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
  choisir(/couché·e à/, '23:00');
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
// Parcours minimal complet : huit réponses, trois écrans. Le formulaire s'ouvre
// par défaut sous le contrat v4 (repère « essayé de dormir »).
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
    choisir(/couché·e à/, '23:00');
    choisir(/couché·e à/, '');
    expect(liste(/couché·e à/).value).toBe('23:00');
  });

  it('les heures sont des listes au quart d’heure, ouvertes sur « Choisir »', () => {
    rendre();
    const coucher = liste(/couché·e à/);
    expect(coucher.value).toBe('');
    const valeurs = Array.from(coucher.options)
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
      'Il reste à renseigner : l’heure du coucher 🛏️, le moment où vous avez essayé de dormir et l’endormissement.',
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
    choisir(/couché·e à/, '23:00');
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
    expect(liste(/couché·e à/).value).toBe('23:00');
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
    expect(liste(/couché·e à/).value).toBe('00:15');
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

// LOT-09 : le soir se remonte dans l'ordre vécu — le coucher, puis le repère
// par rapport à lui, puis son heure s'il est venu plus tard. Les champs envoyés
// ne changent pas : c'est le formulaire qui range les heures.
describe('le soir dans l’ordre vécu — coucher, puis repère', () => {
  const avant = (a: Element, b: Element) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('l’heure du coucher vient d’abord, la question du repère ensuite, son heure en dernier', () => {
    rendre();
    clic('Plus tard que mon coucher');
    const coucher = liste(/couché·e à/);
    const question = screen.getByText('Une fois couché·e, vous avez essayé de dormir…');
    const repere = liste(/essayé de dormir à/);
    expect(avant(coucher, question)).toBe(true);
    expect(avant(question, repere)).toBe(true);
  });

  it('la liste du repère n’apparaît qu’après « plus tard »', () => {
    rendre();
    expect(screen.queryByLabelText(/essayé de dormir à/)).toBeNull();
    clic('Plus tard que mon coucher');
    expect(screen.getByLabelText(/essayé de dormir à/)).toBeTruthy();
  });

  it('« au même moment » : l’heure du coucher est le repère, rien d’autre ne part', () => {
    const { onSubmit } = rendre();
    completerLeMinimum();
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].heureCoucher).toBe('23:00');
    expect(onSubmit.mock.calls[0][0].extinctionImmediate).toBe(true);
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('heureMiseAuLit');
  });

  it('« plus tard » : l’heure du coucher part en mise au lit, le repère en repère', () => {
    const { onSubmit } = rendre();
    choisir(/couché·e à/, '22:30');
    clic('Plus tard que mon coucher');
    choisir(/essayé de dormir à/, '23:00');
    clic('En moins de 15 min');
    continuer();
    nuitMinimum();
    continuer();
    matinMinimum();
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].heureMiseAuLit).toBe('22:30');
    expect(onSubmit.mock.calls[0][0].heureCoucher).toBe('23:00');
    expect(onSubmit.mock.calls[0][0].extinctionImmediate).toBe(false);
  });

  it('« plus tard » sans l’heure du repère : elle est nommée dans ce qui manque', () => {
    rendre();
    choisir(/couché·e à/, '22:30');
    clic('Plus tard que mon coucher');
    clic('En moins de 15 min');
    continuer();
    expect(titre()).toBe('Le soir');
    expect(reste()!.textContent).toBe('Il reste à renseigner : l’heure où vous avez essayé de dormir 🌑.');
  });

  it('revenir à « au même moment » efface l’heure du repère, et le coucher redevient le repère', () => {
    const { onSubmit } = rendre();
    clic('Plus tard que mon coucher');
    choisir(/essayé de dormir à/, '23:45');
    completerLeMinimum();
    fireEvent.click(cta());
    expect(onSubmit.mock.calls[0][0].heureCoucher).toBe('23:00');
    expect(onSubmit.mock.calls[0][0].heureMiseAuLit).toBeUndefined();
    expect(onSubmit.mock.calls[0][0].extinctionImmediate).toBe(true);
  });

  it('une nuit « plus tard » corrigée se relit dans l’ordre vécu et repart à l’identique', () => {
    const nuit = {
      heureCoucher: '23:15',
      heureMiseAuLit: '22:30',
      heureLever: '07:00',
      latence: 'lt15' as const,
      qualite: 4,
      reveils: { dureeTotale: 'aucun' as const, nombre: 0 },
      aideSommeil: 'aucune' as const,
      extinctionImmediate: false,
      leverImmediat: true,
    };
    const { onSubmit } = rendre({ initial: nuit });
    expect(liste(/couché·e à/).value).toBe('22:30');
    expect(liste(/essayé de dormir à/).value).toBe('23:15');
    continuer();
    continuer();
    fireEvent.click(cta());
    expect(onSubmit).toHaveBeenCalledWith(nuit);
  });

  it('la question de latence porte explicitement sur l’après-essai de dormir (v4)', () => {
    rendre();
    expect(screen.getByText(/une fois que vous avez essayé de dormir/i)).toBeTruthy();
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

describe('« comme d’habitude » — un bouton par écran, pour l’heure qu’on y voit', () => {
  const bouton = () => screen.queryByRole('button', { name: /comme d’habitude/i });

  it('absent quand les horaires ne sont pas ceux du patient (défauts)', () => {
    rendre();
    expect(bouton()).toBeNull();
  });

  it('le soir, ne confirme que l’heure du coucher, et rien d’autre', () => {
    rendre({ suggestionsPersonnelles: true });
    expect(bouton()?.textContent).toBe('Comme d’habitude : 23:00');
    fireEvent.click(bouton()!);
    expect(liste(/couché·e à/).value).toBe('23:00');
    expect(bouton()).toBeNull();
    // Aucune autre réponse n'est reprise : l'écran du soir reste incomplet.
    continuer();
    expect(reste()!.textContent).toBe(
      'Il reste à renseigner : le moment où vous avez essayé de dormir et l’endormissement.',
    );
    clic('Au même moment que mon coucher');
    clic('En moins de 15 min');
    continuer();
    nuitMinimum();
    continuer();
    // Le lever n'a PAS été rempli au soir : il se confirme ici, où on le voit.
    expect(liste(/levé·e à/).value).toBe('');
    expect(bouton()?.textContent).toBe('Comme d’habitude : 07:00');
    fireEvent.click(bouton()!);
    expect(liste(/levé·e à/).value).toBe('07:00');
  });

  it('masqué dès que l’heure de l’écran est choisie à la main', () => {
    rendre({ suggestionsPersonnelles: true });
    choisir(/couché·e à/, '22:45');
    expect(bouton()).toBeNull();
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

  it('un essai de dormir avant le coucher ramène à l’écran du soir', async () => {
    const { onSubmit } = rendre();
    choisir(/couché·e à/, '23:30');
    clic('Plus tard que mon coucher');
    choisir(/essayé de dormir à/, '23:00');
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
      'L’heure où vous avez essayé de dormir doit suivre l’heure du coucher. Ajustez les heures.',
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

// Contrat v4 ([[D-271]], [[D-272]]) : le repère du soir est l'heure où le
// patient a essayé de dormir, et « je ne sais pas » est une réponse pour
// l'endormissement et la nuit — pour eux seuls. Un agenda ouvert en v3 garde
// ses mots et ne le propose pas.
describe('contrat v4 — « je ne sais pas » et repère « essayé de dormir »', () => {
  it('« je ne sais pas » est proposé pour l’endormissement et pour la nuit, et part tel quel', () => {
    const { onSubmit } = rendre();
    choisir(/couché·e à/, '23:00');
    clic('Au même moment que mon coucher');
    clic('Je ne sais pas');
    continuer();
    expect(titre()).toBe('Pendant la nuit');
    clic('Je ne sais pas');
    clic('Aucune aide pour dormir cette nuit');
    continuer();
    matinMinimum();
    fireEvent.click(cta());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const nuit = onSubmit.mock.calls[0][0];
    expect(nuit.latence).toBe('inconnu');
    expect(nuit.reveils).toEqual({ dureeTotale: 'inconnu' });
  });

  it('ni l’aide au sommeil, ni le lever, ni la qualité ne le proposent', () => {
    rendre();
    soirMinimum();
    continuer();
    // Une seule tuile « Je ne sais pas » à l'écran de la nuit : celle des réveils.
    expect(screen.getAllByRole('button', { name: 'Je ne sais pas' })).toHaveLength(1);
    nuitMinimum();
    continuer();
    expect(screen.queryByRole('button', { name: 'Je ne sais pas' })).toBeNull();
  });

  it('« je ne sais pas » ne porte pas d’ordre de grandeur sous sa tuile', () => {
    rendre();
    soirMinimum();
    continuer();
    expect(screen.getByRole('button', { name: 'Je ne sais pas' }).textContent).toBe('Je ne sais pas');
  });
});

describe('contrat v3 — un agenda ouvert avant la v4 s’y termine', () => {
  it('garde l’extinction de la lumière et ne propose pas « je ne sais pas »', () => {
    rendre({ contrat: 'agenda-sommeil-v3' });
    expect(screen.getByText('Une fois couché·e, vous avez éteint la lumière…')).toBeTruthy();
    expect(screen.getByText(/une fois la lumière éteinte/i)).toBeTruthy();
    expect(screen.queryByText(/essayé de dormir/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Je ne sais pas' })).toBeNull();
    clic('Plus tard que mon coucher');
    expect(liste(/éteint la lumière à/).value).toBe('');
    choisir(/couché·e à/, '23:00');
    clic('Au même moment que mon coucher');
    clic('En moins de 15 min');
    continuer();
    expect(screen.queryByRole('button', { name: 'Je ne sais pas' })).toBeNull();
  });

  it('nomme l’extinction dans ce qui manque', () => {
    rendre({ contrat: 'agenda-sommeil-v3' });
    continuer();
    expect(reste()?.textContent).toBe(
      'Il reste à renseigner : l’heure du coucher 🛏️, l’extinction de la lumière et l’endormissement.',
    );
    clic('Plus tard que mon coucher');
    expect(reste()?.textContent).toBe(
      'Il reste à renseigner : l’heure du coucher 🛏️, l’heure où vous avez éteint 🌑 et l’endormissement.',
    );
  });
});
