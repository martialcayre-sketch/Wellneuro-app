// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CadranNuit } from './CadranNuit';

// Ce que ces tests protègent : le GESTE de glissement, resté sans couverture au
// merge de #427 — « jsdom ne calcule aucune géométrie », disait le banc de
// SaisieNuitForm, et seul le chemin clavier y était vérifié. Le cadran est parti
// en production avec un centre de poignée inerte.
//
// Ce qui rend la couverture possible ici est exactement ce qui corrige le
// défaut : les gestionnaires de pointeur vivent désormais sur la RACINE <svg>.
// Tant qu'ils vivaient sur une cible frère du cercle visible, savoir si un appui
// démarrait un glissement demandait un hit-test — que jsdom ne fait pas. Sur la
// racine, l'événement remonte quel que soit l'élément touché : le comportement
// ne dépend plus de l'ordre de peinture, donc il devient testable sans
// navigateur.
//
// La seule chose que jsdom ne fournit pas est la géométrie du SVG : on la pose
// à la main (300 × 300 px, l'ancrage réel du composant), puis on convertit des
// heures en coordonnées écran avec la même projection que le composant.

const VB_ORIGINE = -16;
const VB_TAILLE = 232;
const CX = 100;
const CY = 100;
const R = 70;
const TAILLE_PX = 300;

const EXTINCTION = '23:00'; // 1380 min
const SORTIE = '07:00'; //  420 min

/** Heure du cadran → coordonnées client, projection inverse de celle du composant. */
function clientDepuisMinutes(minutes: number, rayon = R): { clientX: number; clientY: number } {
  const a = ((minutes / 1440) * 360 - 90) * (Math.PI / 180);
  const x = CX + rayon * Math.cos(a);
  const y = CY + rayon * Math.sin(a);
  return {
    clientX: ((x - VB_ORIGINE) / VB_TAILLE) * TAILLE_PX,
    clientY: ((y - VB_ORIGINE) / VB_TAILLE) * TAILLE_PX,
  };
}

/** Le centre géométrique du cadran, où l'angle n'a plus de sens. */
const CENTRE = { clientX: TAILLE_PX / 2, clientY: TAILLE_PX / 2 };

// Le composant est piloté : sans état parent, une poignée relâchée reviendrait à
// sa position d'ouverture et aucun glissement ne serait observable.
function Harnais({
  onChange,
  afficherMiseAuLit = false,
  afficherReveilFinal = false,
}: {
  onChange: (poignee: string, valeur: string) => void;
  afficherMiseAuLit?: boolean;
  afficherReveilFinal?: boolean;
}) {
  const [extinction, setExtinction] = useState<string | undefined>(undefined);
  const [sortie, setSortie] = useState<string | undefined>(undefined);
  const [lit, setLit] = useState<string | undefined>(undefined);
  const [reveil, setReveil] = useState<string | undefined>(undefined);
  return (
    <CadranNuit
      extinction={extinction}
      sortieDuLit={sortie}
      miseAuLit={lit}
      afficherMiseAuLit={afficherMiseAuLit}
      reveilFinal={reveil}
      afficherReveilFinal={afficherReveilFinal}
      suggestionExtinction={EXTINCTION}
      suggestionSortie={SORTIE}
      onChange={(poignee, valeur) => {
        onChange(poignee, valeur);
        if (poignee === 'extinction') setExtinction(valeur);
        if (poignee === 'sortie') setSortie(valeur);
        if (poignee === 'lit') setLit(valeur);
        if (poignee === 'reveil') setReveil(valeur);
      }}
    />
  );
}

function rendre(afficherMiseAuLit = false, afficherReveilFinal = false) {
  const onChange = vi.fn();
  const { container } = render(
    <Harnais
      onChange={onChange}
      afficherMiseAuLit={afficherMiseAuLit}
      afficherReveilFinal={afficherReveilFinal}
    />,
  );
  const svg = container.querySelector('svg') as SVGSVGElement;
  // jsdom rend des zéros : sans cette géométrie, toute conversion écran → heure
  // dégénère. Le composant s'en protège (il ignore un rect nul) — d'où ce stub.
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: TAILLE_PX,
    height: TAILLE_PX,
    right: TAILLE_PX,
    bottom: TAILLE_PX,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  return { onChange, svg };
}

/** Les cercles `role="slider"`, dans l'ordre de rendu du composant. */
const poignees = () => screen.getAllByRole('slider');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('prise de la poignée', () => {
  it('un appui au CENTRE de la poignée démarre le glissement', () => {
    // Régression directe du défaut de production : le cercle visible couvrait la
    // cible de saisie, et un appui en son centre — le geste de tout le monde —
    // n'atteignait aucun gestionnaire. On appuie donc sur le cercle VISIBLE,
    // celui que le navigateur désigne réellement, et non sur une cible cachée.
    const { onChange, svg } = rendre();
    const extinction = poignees()[0];

    fireEvent.pointerDown(extinction, { pointerId: 1, ...clientDepuisMinutes(1380) });
    expect(onChange).toHaveBeenCalledWith('extinction', EXTINCTION);

    fireEvent.pointerMove(svg, { pointerId: 1, ...clientDepuisMinutes(1440) });
    expect(onChange).toHaveBeenLastCalledWith('extinction', '00:00');
  });

  it('l’appui accroche la poignée même à distance, sans la faire sauter', () => {
    // Personne n'appuie au centre exact d'une cible, et la pulpe d'un doigt
    // couvre à elle seule une heure de cadran. On appuie 60 min après
    // l'extinction : la poignée doit être PRISE (donc confirmée à sa valeur
    // courante) et surtout ne pas se téléporter sous le doigt.
    const { onChange, svg } = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(1440) });
    expect(onChange).toHaveBeenCalledWith('extinction', EXTINCTION);

    // Le doigt avance de 2 h depuis son point d'appui : la poignée avance
    // d'autant, pas jusqu'à la position du doigt.
    fireEvent.pointerMove(svg, { pointerId: 1, ...clientDepuisMinutes(120) });
    expect(onChange).toHaveBeenLastCalledWith('extinction', '01:00');
  });

  it('la poignée la plus proche gagne quand deux se touchent', () => {
    // Mise au lit ouverte 30 min avant l'extinction : 9 unités d'arc, très en
    // deçà de la tolérance de prise. Les deux sont candidates ; seule la plus
    // proche doit répondre.
    const { onChange } = rendre(true);
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(1350) });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('lit', '22:30');
  });

  it('la quatrième poignée répond quand les quatre sont à l’écran', () => {
    // Mise au lit 22:30, extinction 23:00, réveil final 03:00 (mi-chemin),
    // sortie 07:00. Configuration la plus chargée que le cadran produise.
    const { onChange } = rendre(true, true);
    expect(poignees()).toHaveLength(4);
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(180) });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('reveil', '03:00');
  });

  it('un appui loin de toute poignée n’accroche rien', () => {
    // 02:00 : 3 h après l'extinction, 5 h avant le lever. Sur l'anneau, mais
    // hors tolérance — sinon un simple contact confirmerait une valeur que le
    // patient n'a pas donnée.
    const { onChange } = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(120) });
    expect(onChange).not.toHaveBeenCalled();
  });
});

// Sans ces bornes, `RAYON_PRISE` accepte n'importe quelle valeur entre 19 et 50
// et `RAYON_MORT` entre 6 et 60 sans qu'un seul test rougisse : la couverture
// serait de façade sur les deux décisions que porte ce correctif.
describe('frontières de la prise', () => {
  it('à 25 unités de la poignée on accroche, à 27 on n’accroche plus', () => {
    const { onChange } = rendre();
    // Sur le rayon de la poignée : la distance à celle-ci est exactement l'écart
    // de rayon, sans composante angulaire.
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(1380, R - 25) });
    expect(onChange).toHaveBeenCalledTimes(1);

    cleanup();
    const second = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(1380, R - 27) });
    expect(second.onChange).not.toHaveBeenCalled();
  });

  it('un appui dans l’axe de la poignée mais loin du cadran n’accroche rien', () => {
    // LE défaut que ferme ce garde : borner la prise au seul écart d'ANGLE
    // laissait tout le secteur saisissable jusqu'au coin du cadran. Le
    // formulaire est long, le cadran le coiffe avec `touch-action: none` — un
    // balayage de défilement posé là accrochait la poignée et écrivait une heure
    // de coucher jamais donnée.
    const { onChange } = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(1380, 115) });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('un balayage vertical posé hors des poignées ne déplace rien', () => {
    // Le geste de défilement du patient : pouce posé en haut du widget, balayage
    // vers le bas. Doit rester sans effet de bout en bout.
    const { onChange, svg } = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(0, 92) });
    fireEvent.pointerMove(svg, { pointerId: 1, ...clientDepuisMinutes(660, 92) });
    fireEvent.pointerUp(svg, { pointerId: 1, ...clientDepuisMinutes(660, 92) });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('zone morte centrale', () => {
  it('un appui au centre du cadran n’accroche rien', () => {
    const { onChange } = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...CENTRE });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('un doigt qui dérive vers le centre fige la valeur au lieu de la disperser', () => {
    // `atan2` près du centre balaie l'heure entière au moindre tremblement :
    // suivre cet angle ferait partir la poignée en vrille.
    const { onChange, svg } = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(1380) });
    fireEvent.pointerMove(svg, { pointerId: 1, ...clientDepuisMinutes(1440) });
    expect(onChange).toHaveBeenLastCalledWith('extinction', '00:00');

    const appels = onChange.mock.calls.length;
    fireEvent.pointerMove(svg, { pointerId: 1, ...CENTRE });
    expect(onChange.mock.calls.length).toBe(appels);
  });

  it('à 26 unités du centre le mouvement passe, à 24 il est ignoré', () => {
    const { onChange, svg } = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(1380) });

    fireEvent.pointerMove(svg, { pointerId: 1, ...clientDepuisMinutes(0, 26) });
    expect(onChange).toHaveBeenLastCalledWith('extinction', '00:00');

    // Même geste, un peu plus près du centre : la valeur doit rester figée.
    fireEvent.pointerMove(svg, { pointerId: 1, ...clientDepuisMinutes(300, 24) });
    expect(onChange).toHaveBeenLastCalledWith('extinction', '00:00');
  });
});

describe('robustesse du glissement', () => {
  it('un second doigt ne vole pas la prise en cours', () => {
    const { onChange, svg } = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(1380) });
    // Le second doigt se pose sur la poignée de sortie : sans garde, il
    // deviendrait la prise active et le premier glissement serait perdu.
    fireEvent.pointerDown(poignees()[1], { pointerId: 2, ...clientDepuisMinutes(420) });
    expect(onChange).toHaveBeenCalledTimes(1);

    fireEvent.pointerMove(svg, { pointerId: 1, ...clientDepuisMinutes(1440) });
    expect(onChange).toHaveBeenLastCalledWith('extinction', '00:00');
  });

  it('après relâchement, un mouvement ne déplace plus rien', () => {
    const { onChange, svg } = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(1380) });
    fireEvent.pointerUp(svg, { pointerId: 1, ...clientDepuisMinutes(1380) });

    const appels = onChange.mock.calls.length;
    fireEvent.pointerMove(svg, { pointerId: 1, ...clientDepuisMinutes(300) });
    expect(onChange.mock.calls.length).toBe(appels);
  });

  it('un pointercancel relâche la prise aussi sûrement qu’un pointerup', () => {
    const { onChange, svg } = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(1380) });
    fireEvent.pointerCancel(svg, { pointerId: 1, ...clientDepuisMinutes(1380) });

    const appels = onChange.mock.calls.length;
    fireEvent.pointerMove(svg, { pointerId: 1, ...clientDepuisMinutes(300) });
    expect(onChange.mock.calls.length).toBe(appels);
  });

  it('la prise pose le focus sur la poignée, pour la suite au clavier', () => {
    // `preventDefault` supprime le focus implicite : sans ce geste, un patient
    // qui touche une poignée puis veut l'affiner aux flèches n'a rien de ciblé.
    const { onChange } = rendre();
    fireEvent.pointerDown(poignees()[0], { pointerId: 1, ...clientDepuisMinutes(1380) });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(poignees()[0]);
  });

  it('le chemin clavier survit au déplacement des gestionnaires', () => {
    // Les poignées ont perdu leurs gestionnaires de pointeur ; elles gardent
    // `role="slider"`, le focus et les flèches (WCAG 2.1.1).
    const { onChange } = rendre();
    fireEvent.keyDown(poignees()[0], { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('extinction', '23:15');
  });
});
