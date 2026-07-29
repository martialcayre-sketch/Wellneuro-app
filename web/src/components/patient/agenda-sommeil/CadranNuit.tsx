'use client';

import { useCallback, useRef, useState } from 'react';
import {
  LABEL_EXTINCTION,
  LABEL_MISE_AU_LIT,
  LABEL_REVEIL_FINAL,
  LABEL_SORTIE_DU_LIT,
} from '@/lib/agenda-sommeil/libelles';

// Cadran tactile de la nuit — SAISIE SANS CLAVIER NI CHIFFRE À TAPER.
//
// Deux poignées glissent sur un cadran de 24 h (minuit en haut, midi en bas) :
// l'extinction de la lumière et la sortie du lit. L'arc entre les deux est la
// nuit. C'est ce qui remplace les steppers « − 23:00 + » : le geste devient une
// estimation continue au lieu d'une suite de clics sur un nombre.
//
// L'heure reste affichée sous chaque poignée. Ce n'est pas contradictoire avec
// la doctrine anti-anxiogène : ce qu'elle interdit côté patient, ce sont les
// SCORES et les signaux d'alerte, pas le retour visuel du geste qu'il vient de
// faire. Sans ce retour, on ne peut pas régler une poignée. En revanche aucune
// durée n'est calculée à l'écran : « 5 h au lit » deviendrait un objet de
// surveillance, et c'est précisément le mécanisme de l'orthosomnie.
//
// SUGGESTION FANTÔME, JAMAIS VALEUR. À l'ouverture les poignées se posent sur
// les horaires habituels du patient, en trait pointillé, et la valeur reste
// `undefined` tant qu'il ne les a pas touchées. Un simple appui suffit à
// confirmer (« comme d'habitude »), mais il faut ce geste : c'est lui qui
// distingue une nuit observée d'une nuit recopiée.

const CX = 100;
const CY = 100;
const R = 70;
const PAS_MINUTES = 15;

// Rayon de prise, en unités du repère de dessin : un appui accroche la poignée
// la plus proche tant qu'il tombe dans le DISQUE de ce rayon autour d'elle.
// 26 unités valent ~34 px une fois le cadran rendu à 300 px, soit une cible de
// ~68 px — au-delà des 44 px recommandés, et pleine : la v1 n'offrait qu'un
// anneau de 6 px autour de chaque poignée, son centre étant couvert par le
// cercle visible (voir plus bas).
//
// La distance est EUCLIDIENNE, et non un écart d'angle. Un seuil purement
// angulaire n'aurait borné la prise que par le bas (la zone morte) : tout le
// secteur, jusqu'au coin du cadran, serait devenu saisissable. Le formulaire est
// long et le cadran le coiffe, avec `touch-action: none` sur toute sa boîte —
// un balayage de défilement posé dans le secteur aurait accroché la poignée et
// écrit une heure de coucher que le patient n'a jamais donnée.
const RAYON_PRISE = 26;

// Zone morte centrale, appliquée au MOUVEMENT (la prise, elle, est déjà bornée
// par le disque ci-dessus : au centre, on est à 70 unités de toute poignée).
// `atan2` devient arbitrairement sensible près du centre : à 5 unités, un
// tremblement de doigt balaie l'heure entière. En deçà de ce rayon on ignore le
// mouvement et on conserve la dernière valeur, plutôt que de laisser la poignée
// partir en vrille.
const RAYON_MORT = 25;

// Le repère de dessin reste 0–200 (centre 100,100), mais le viewBox déborde de
// 16 unités sur chaque bord : les étiquettes d'heure sont posées à 92 du centre
// et, avec leur demi-largeur, dépassaient 200 — une heure comme 03:00 ou 09:00
// se retrouvait rognée. Ces deux constantes servent au viewBox ET à la
// conversion écran → minutes : les désaccorder décalerait tout glissement.
const VB_ORIGINE = -16;
const VB_TAILLE = 232;

function minutesDepuisMinuit(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function versHHMM(minutes: number): string {
  const t = ((Math.round(minutes / PAS_MINUTES) * PAS_MINUTES) % 1440 + 1440) % 1440;
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(Math.floor(t / 60))}:${p(t % 60)}`;
}

// Écart signé entre deux positions du cadran, ramené dans [-720, 720) : sur un
// cercle, 23:50 et 00:10 sont distants de 20 minutes, pas de 1420. Sert deux
// fois — choisir la poignée la plus proche d'un appui, et conserver l'écart de
// prise pendant tout le glissement.
function ecartCirculaire(a: number, b: number): number {
  return (((a - b + 720) % 1440) + 1440) % 1440 - 720;
}

// Minuit en haut, sens horaire — la nuit s'inscrit donc autour du sommet.
function angleRad(minutes: number): number {
  return ((minutes / 1440) * 360 - 90) * (Math.PI / 180);
}

function point(minutes: number, rayon = R): { x: number; y: number } {
  const a = angleRad(minutes);
  return { x: CX + rayon * Math.cos(a), y: CY + rayon * Math.sin(a) };
}

// Arc horaire du début vers la fin, dans le sens des aiguilles.
function cheminArc(debut: number, fin: number): string {
  const balayage = ((fin - debut) + 1440) % 1440;
  const d = point(debut);
  const f = point(fin);
  const grandArc = balayage > 720 ? 1 : 0;
  return `M ${d.x} ${d.y} A ${R} ${R} 0 ${grandArc} 1 ${f.x} ${f.y}`;
}

// « 23 h 00 » — l'aria-valuetext, lu par les lecteurs d'écran.
function enToutesLettres(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return m === '00' ? `${Number(h)} heures` : `${Number(h)} heures ${m}`;
}

type Poignee = 'lit' | 'extinction' | 'reveil' | 'sortie';

// Déclarée AU NIVEAU DU MODULE, jamais dans `CadranNuit` : un composant défini
// dans le corps d'un autre est un type neuf à chaque rendu, donc React démonte
// et remonte son sous-arbre à chaque changement d'état. Pour une poignée pilotée
// aux flèches, cela signifie perdre le focus à CHAQUE pression — la saisie au
// clavier devient impraticable.
function PoigneeCadran({
  poignee,
  minutes,
  valeur,
  label,
  icone,
  refCercle,
  onClavier,
}: {
  poignee: Poignee;
  minutes: number;
  valeur: string | undefined;
  label: string;
  icone: string;
  refCercle: (poignee: Poignee, el: SVGCircleElement | null) => void;
  onClavier: (poignee: Poignee, e: React.KeyboardEvent) => void;
}) {
  const p = point(minutes);
  const etiquette = point(minutes, R + 22);
  const confirmee = valeur !== undefined;
  return (
    <g>
      {/* Aucun gestionnaire de pointeur ici : ils vivent sur la racine <svg>.
          La v1 posait un cercle de saisie transparent SOUS ce cercle visible,
          son frère — donc peint avant lui. Le hit-test SVG suit l'ordre de
          peinture : tout appui à moins de 13 unités du centre atterrissait sur
          le cercle visible, qui ne portait aucun gestionnaire, et l'événement
          ne pouvait pas remonter vers un FRÈRE. Seul l'anneau 13→18 déclenchait
          un glissement, soit 6 px à l'écran, autour d'un centre inerte de 34 px
          — précisément là où l'on appuie. Sur la racine, l'ordre de peinture ne
          décide plus de rien : quel que soit l'élément touché, l'événement
          remonte. */}
      <circle
        ref={(el) => refCercle(poignee, el)}
        cx={p.x}
        cy={p.y}
        r={13}
        className={`cursor-grab ${
          confirmee ? 'fill-primary stroke-primary-foreground' : 'fill-surface stroke-primary/50'
        }`}
        strokeWidth={2}
        strokeDasharray={confirmee ? undefined : '3 3'}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={1439}
        aria-valuenow={minutes}
        aria-valuetext={
          confirmee
            ? enToutesLettres(versHHMM(minutes))
            : `${enToutesLettres(versHHMM(minutes))} — proposition, à confirmer`
        }
        onKeyDown={(e) => onClavier(poignee, e)}
      />
      <text
        x={p.x}
        y={p.y + 4}
        textAnchor="middle"
        fontSize={12}
        aria-hidden="true"
        className="pointer-events-none select-none"
      >
        {icone}
      </text>
      <text
        x={etiquette.x}
        y={etiquette.y + 4}
        textAnchor="middle"
        fontSize={11}
        aria-hidden="true"
        className={`select-none tabular-nums ${confirmee ? 'fill-foreground font-semibold' : 'fill-muted-foreground'}`}
      >
        {versHHMM(minutes)}
      </text>
    </g>
  );
}

type Props = {
  extinction: string | undefined;
  sortieDuLit: string | undefined;
  // Poignées conditionnelles, affichées seulement quand la question
  // correspondante l'appelle : la mise au lit si le patient n'a pas éteint en se
  // couchant, le réveil final s'il est resté au lit éveillé le matin. Aucune des
  // deux n'est montrée par défaut — la plupart des nuits n'en ont pas besoin.
  miseAuLit?: string | undefined;
  afficherMiseAuLit?: boolean;
  reveilFinal?: string | undefined;
  afficherReveilFinal?: boolean;
  // Horaires habituels du patient : position d'ouverture des poignées.
  suggestionExtinction: string;
  suggestionSortie: string;
  onChange: (poignee: Poignee, valeur: string) => void;
};

export function CadranNuit({
  extinction,
  sortieDuLit,
  miseAuLit,
  afficherMiseAuLit = false,
  reveilFinal,
  afficherReveilFinal = false,
  suggestionExtinction,
  suggestionSortie,
  onChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<Poignee | null>(null);
  // Écart angulaire entre le doigt et la poignée au moment de la prise, conservé
  // pendant tout le glissement. Sans lui, la poignée SAUTE sous le doigt au
  // premier mouvement : personne n'appuie exactement au centre d'une cible, et
  // la pulpe d'un doigt couvre à elle seule une heure de cadran. C'est le second
  // motif du « laborieux », le premier étant la cible morte.
  const ecartPrise = useRef(0);
  // Le doigt qui tient la poignée. Une seconde touche pendant un glissement ne
  // doit pas voler la prise en cours.
  const pointeurActif = useRef<number | null>(null);
  const cercles = useRef<Partial<Record<Poignee, SVGCircleElement | null>>>({});
  const memoriserCercle = useCallback((poignee: Poignee, el: SVGCircleElement | null) => {
    cercles.current[poignee] = el;
  }, []);

  // Position affichée : la valeur si elle existe, la suggestion sinon.
  const posExtinction = extinction ?? suggestionExtinction;
  const posSortie = sortieDuLit ?? suggestionSortie;
  const minExtinction = minutesDepuisMinuit(posExtinction);
  const minSortie = minutesDepuisMinuit(posSortie);

  // La poignée de réveil s'ouvre à mi-chemin entre l'extinction et le lever :
  // une position neutre, qui n'insinue ni un réveil tardif ni un réveil précoce.
  const posReveil =
    reveilFinal ??
    versHHMM(minExtinction + (((minSortie - minExtinction + 1440) % 1440) / 2));
  const minReveil = minutesDepuisMinuit(posReveil);

  // La mise au lit s'ouvre 30 min avant l'extinction : assez pour être saisie
  // sans chevaucher la poignée voisine, assez peu pour ne rien suggérer.
  const posLit = miseAuLit ?? versHHMM(minExtinction - 30);
  const minLit = minutesDepuisMinuit(posLit);

  // Coordonnées écran → position sur le cadran. Le viewBox est carré et le
  // conteneur aussi : la projection est uniforme, un rapport de largeur suffit
  // — à condition de partir de l'ORIGINE du viewBox et non de zéro. On rend
  // AUSSI la distance au centre : c'est elle qui arme la zone morte.
  const positionPointeur = useCallback(
    (
      clientX: number,
      clientY: number,
    ): { minutes: number; distance: number; x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const x = VB_ORIGINE + ((clientX - rect.left) / rect.width) * VB_TAILLE - CX;
      const y = VB_ORIGINE + ((clientY - rect.top) / rect.height) * VB_TAILLE - CY;
      const deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
      return {
        minutes: (((deg + 360) % 360) / 360) * 1440,
        distance: Math.hypot(x, y),
        // Coordonnées centrées, gardées telles quelles : la prise mesure une
        // distance à une POIGNÉE, pas au centre.
        x,
        y,
      };
    },
    [],
  );

  const POSITIONS: Record<Poignee, string> = {
    lit: posLit,
    extinction: posExtinction,
    reveil: posReveil,
    sortie: posSortie,
  };
  const MINUTES: Record<Poignee, number> = {
    lit: minLit,
    extinction: minExtinction,
    reveil: minReveil,
    sortie: minSortie,
  };

  // Les poignées effectivement à l'écran. Les deux conditionnelles ne sont pas
  // candidates à la prise quand elles ne sont pas affichées, sans quoi un appui
  // accrocherait une poignée invisible.
  const visibles = (
    [
      afficherMiseAuLit ? 'lit' : null,
      'extinction',
      afficherReveilFinal ? 'reveil' : null,
      'sortie',
    ] as (Poignee | null)[]
  ).filter((p): p is Poignee => p !== null);

  // Prise par PROXIMITÉ et non par contact avec une cible : la poignée retenue
  // est la plus proche de l'appui, à condition qu'il tombe dans son disque de
  // `RAYON_PRISE`. Deux poignées voisines (mise au lit 30 min avant
  // l'extinction, soit 9 unités) sont donc toutes deux candidates — la plus
  // proche gagne, et l'écart de prise l'empêche ensuite de sauter sur sa
  // voisine. À égalité stricte de distance, la première des `visibles` répond.
  function saisir(e: React.PointerEvent) {
    if (pointeurActif.current !== null) return;
    const p = positionPointeur(e.clientX, e.clientY);
    if (!p) return;

    let choisie: Poignee | null = null;
    let meilleureDistance = Infinity;
    for (const poignee of visibles) {
      const centre = point(MINUTES[poignee]);
      const d = Math.hypot(p.x - (centre.x - CX), p.y - (centre.y - CY));
      if (d < meilleureDistance) {
        meilleureDistance = d;
        choisie = poignee;
      }
    }
    if (choisie === null || meilleureDistance > RAYON_PRISE) return;

    e.preventDefault();
    // Capture posée sur la RACINE, un nœud stable : la v1 la posait sur la cible
    // de la poignée, qui se déplace à chaque rendu. Le `?.` porte sur la méthode
    // elle-même — jsdom ne l'implémente pas, et le glissement doit rester
    // exécutable en test.
    svgRef.current?.setPointerCapture?.(e.pointerId);
    pointeurActif.current = e.pointerId;
    ecartPrise.current = ecartCirculaire(p.minutes, MINUTES[choisie]);
    setActive(choisie);
    // `preventDefault` supprime le focus implicite : on le pose donc à la main,
    // pour qu'un patient puisse affiner aux flèches la poignée qu'il vient de
    // toucher.
    cercles.current[choisie]?.focus?.();
    // L'appui vaut confirmation : la suggestion fantôme devient une valeur.
    onChange(choisie, POSITIONS[choisie]);
  }

  function deplacer(e: React.PointerEvent) {
    if (!active || pointeurActif.current !== e.pointerId) return;
    const p = positionPointeur(e.clientX, e.clientY);
    // Zone morte : on garde la dernière valeur plutôt que de suivre un angle qui
    // n'a plus de sens.
    if (!p || p.distance < RAYON_MORT) return;
    e.preventDefault();
    onChange(active, versHHMM(p.minutes - ecartPrise.current));
  }

  function relacher(e: React.PointerEvent) {
    if (pointeurActif.current !== e.pointerId) return;
    // `releasePointerCapture` lève si le pointeur n'est plus capturé — ce qui est
    // exactement le cas après un `pointercancel`, qui relâche déjà la capture.
    const svg = svgRef.current;
    if (svg?.hasPointerCapture?.(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    pointeurActif.current = null;
    ecartPrise.current = 0;
    setActive(null);
  }

  // Clavier et lecteur d'écran : flèches ±15 min, Page ±1 h (WCAG 2.1.1 — une
  // poignée qui ne répond qu'au doigt n'est pas utilisable au clavier).
  function auClavier(poignee: Poignee, e: React.KeyboardEvent) {
    const courant = MINUTES[poignee];
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? PAS_MINUTES
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? -PAS_MINUTES
          : e.key === 'PageUp'
            ? 60
            : e.key === 'PageDown'
              ? -60
              : e.key === 'Enter' || e.key === ' '
                ? 0
                : null;
    if (delta === null) return;
    e.preventDefault();
    onChange(poignee, versHHMM(courant + delta));
  }

  const toutConfirme =
    extinction !== undefined &&
    sortieDuLit !== undefined &&
    (!afficherMiseAuLit || miseAuLit !== undefined) &&
    (!afficherReveilFinal || reveilFinal !== undefined);

  return (
    <div>
      <div className="mx-auto w-full max-w-[300px]">
        <svg
          ref={svgRef}
          viewBox={`${VB_ORIGINE} ${VB_ORIGINE} ${VB_TAILLE} ${VB_TAILLE}`}
          className="w-full touch-none"
          onPointerDown={saisir}
          onPointerMove={deplacer}
          onPointerUp={relacher}
          onPointerCancel={relacher}
        >
          {/* Cadran : 24 h, minuit en haut. Quatre repères discrets, aucune
              graduation chiffrée — on estime, on ne lit pas une horloge. */}
          <circle cx={CX} cy={CY} r={R} className="fill-none stroke-border" strokeWidth={10} />
          {[0, 360, 720, 1080].map((m) => {
            const a = point(m, R + 12);
            return (
              <text
                key={m}
                x={a.x}
                y={a.y + 3}
                textAnchor="middle"
                fontSize={9}
                aria-hidden="true"
                className="fill-muted-foreground select-none"
              >
                {m === 0 ? '🌙' : m === 720 ? '☀️' : '·'}
              </text>
            );
          })}

          {/* Arc de nuit. Quand le patient déclare être resté au lit éveillé, il
              se scinde : plein jusqu'au réveil, PLUS CLAIR du réveil à la sortie
              du lit. Ce second segment est positionnellement vrai — contrairement
              à l'éveil nocturne, dont on ne recueille que la durée cumulée. */}
          {/* Temps passé au lit AVANT d'éteindre : même traitement clair que
              l'éveil du matin, et pour la même raison — le patient est au lit,
              mais il ne dort pas et ne cherche pas encore à dormir. */}
          {afficherMiseAuLit && (
            <path
              d={cheminArc(minLit, minExtinction)}
              className="stroke-primary/30"
              strokeWidth={10}
              strokeLinecap="round"
              fill="none"
            />
          )}
          <path
            d={cheminArc(minExtinction, afficherReveilFinal ? minReveil : minSortie)}
            className={toutConfirme ? 'stroke-primary' : 'stroke-primary/40'}
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={toutConfirme ? undefined : '4 6'}
          />
          {afficherReveilFinal && (
            <path
              d={cheminArc(minReveil, minSortie)}
              className="stroke-primary/30"
              strokeWidth={10}
              strokeLinecap="round"
              fill="none"
            />
          )}

          {afficherMiseAuLit && (
            <PoigneeCadran
              poignee="lit"
              minutes={minLit}
              valeur={miseAuLit}
              label={LABEL_MISE_AU_LIT}
              icone="🛏️"
              refCercle={memoriserCercle}
              onClavier={auClavier}
            />
          )}
          <PoigneeCadran
            poignee="extinction"
            minutes={minExtinction}
            valeur={extinction}
            label={LABEL_EXTINCTION}
            icone="🌑"
            refCercle={memoriserCercle}
            onClavier={auClavier}
          />
          {afficherReveilFinal && (
            <PoigneeCadran
              poignee="reveil"
              minutes={minReveil}
              valeur={reveilFinal}
              label={LABEL_REVEIL_FINAL}
              icone="👁️"
              refCercle={memoriserCercle}
              onClavier={auClavier}
            />
          )}
          <PoigneeCadran
            poignee="sortie"
            minutes={minSortie}
            valeur={sortieDuLit}
            label={LABEL_SORTIE_DU_LIT}
            icone="🌅"
            refCercle={memoriserCercle}
            onClavier={auClavier}
          />
        </svg>
      </div>

      <div className="mt-1 flex flex-wrap justify-between gap-x-2 gap-y-1 text-sm">
        {afficherMiseAuLit && (
          <p className={miseAuLit ? 'text-foreground' : 'text-muted-foreground'}>
            🛏️ {LABEL_MISE_AU_LIT}
          </p>
        )}
        <p className={extinction ? 'text-foreground' : 'text-muted-foreground'}>
          🌑 {LABEL_EXTINCTION}
        </p>
        {afficherReveilFinal && (
          <p className={reveilFinal ? 'text-foreground' : 'text-muted-foreground'}>
            👁️ {LABEL_REVEIL_FINAL}
          </p>
        )}
        <p className={sortieDuLit ? 'text-foreground' : 'text-muted-foreground'}>
          {LABEL_SORTIE_DU_LIT} 🌅
        </p>
      </div>
      {!toutConfirme && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Faites glisser les repères — une estimation suffit.
        </p>
      )}
    </div>
  );
}
