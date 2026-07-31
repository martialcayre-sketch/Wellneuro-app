'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
// long et le cadran le coiffe — un balayage de défilement posé dans le secteur
// aurait accroché la poignée et écrit une heure de coucher que le patient n'a
// jamais donnée.
//
// Cette borne porte DEUX décisions, et non plus une seule : elle dit si le geste
// saisit une poignée, et — depuis le correctif de défilement (voir l'effet
// `bloquerDefilement` plus bas) — si la page a le droit de défiler sous le
// doigt. L'élargir ouvrirait la prise ET figerait d'autant le défilement.
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
  // La dernière poignée prise, seul arbitre restant quand deux superposées ont le
  // même statut de confirmation : sans elle, la première monopoliserait le point.
  const dernierePrise = useRef<Poignee | null>(null);
  const cercles = useRef<Partial<Record<Poignee, SVGCircleElement | null>>>({});
  const memoriserCercle = useCallback((poignee: Poignee, el: SVGCircleElement | null) => {
    cercles.current[poignee] = el;
  }, []);

  // DÉFILEMENT DE LA PAGE. Le formulaire de saisie est long et le cadran le
  // coiffe : un balayage posé sur le cadran doit faire défiler la page, SAUF
  // s'il tient une poignée. Trois voies ont été écartées avant celle-ci.
  //
  //  — `touch-action: none` sur la racine (l'état antérieur) : le navigateur lit
  //    cette valeur AU TOUCHER, sur l'élément touché et ses ancêtres, une fois
  //    pour toute la séquence. Il ne connaît que des boîtes CSS, et la boîte du
  //    cadran fait ~300 x 300 px là où les disques de prise n'en couvrent que 8
  //    à 15 % selon le nombre de poignées visibles. Le pouce posé partout
  //    ailleurs bloquait le défilement pour rien.
  //  — La basculer en JS au `pointerdown` : sans effet sur le geste en cours. La
  //    valeur est déjà lue quand notre gestionnaire s'exécute, et le rendu React
  //    vient encore après.
  //  — `touch-action: pan-y` sur la racine : rendrait au navigateur tout geste à
  //    dominante verticale. Or aux flancs du cadran (06:00 à droite, 18:00 à
  //    gauche) la poignée se déplace précisément vers le haut ou le bas ; le
  //    navigateur s'emparerait du geste et émettrait `pointercancel` en plein
  //    glissement — la prise sauterait sous le doigt.
  //
  // Reste l'échappatoire des Touch Events, antérieure à `touch-action` et jamais
  // retirée : `preventDefault()` sur un `touchmove` NON PASSIF supprime le
  // défilement, et se décide ÉVÉNEMENT PAR ÉVÉNEMENT — ce que `touch-action`, qui
  // fige tout au premier contact, ne sait pas faire. La prise est déjà tranchée
  // au `pointerdown` (`saisir` sort sans rien armer au-delà de `RAYON_PRISE`),
  // donc le tout premier `touchmove` sait déjà si le geste sert à quelque chose.
  //
  // L'écouteur est posé à la main : react-dom enregistre `touchmove` en PASSIF
  // sur la racine de l'application, où un `preventDefault()` est ignoré. Le garde
  // `e.cancelable` couvre le cas où le navigateur a déjà engagé le défilement —
  // on ne peut alors plus rien annuler, et insister lèverait un avertissement.
  //
  // La cible d'une séquence tactile reste l'élément du `touchstart` pour toute sa
  // durée : le blocage tient donc encore quand le doigt sort de la boîte en
  // glissant — cas très réel, une poignée étant à 70 unités du centre et son
  // disque de prise portant jusqu'à 96, pour un demi-viewBox de 116.
  //
  // Pendant une prise, TOUS les `touchmove` du cadran sont annulés, y compris
  // ceux d'un second doigt. C'est délibéré : laisser passer le multi-touch
  // ferait défiler la page sous le premier doigt, donc bouger la boîte qui sert
  // à convertir écran → minutes, et la poignée sauterait. Un geste indivisible
  // vaut mieux qu'un repère mobile.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const bloquerDefilement = (e: TouchEvent) => {
      if (pointeurActif.current === null) return;
      if (e.cancelable) e.preventDefault();
    };
    svg.addEventListener('touchmove', bloquerDefilement, { passive: false });
    return () => svg.removeEventListener('touchmove', bloquerDefilement);
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

  // Coordonnées écran → position sur le cadran, en reproduisant la projection
  // que le navigateur applique VRAIMENT : `preserveAspectRatio` valant par
  // défaut `xMidYMid meet`, le viewBox est mis à l'échelle UNIFORMÉMENT (le plus
  // petit des deux rapports) puis centré dans la boîte, avec des bandes vides sur
  // les deux côtés les plus longs.
  //
  // Une version antérieure divisait `x` par la largeur et `y` par la hauteur,
  // indépendamment : c'est la projection d'un `preserveAspectRatio="none"`. Tant
  // que la boîte reste carrée les deux formules coïncident — et elle l'est
  // aujourd'hui (`w-full` sur un viewBox carré). Mais la prémisse n'était nulle
  // part vérifiée, alors qu'elle décide désormais AUSSI de la zone morte et de la
  // distance aux poignées. Un jour où une feuille de style borne la hauteur, tout
  // le cadran se décale sans qu'une seule ligne d'ici ne bouge.
  //
  // On rend aussi la distance au centre : c'est elle qui arme la zone morte.
  const positionPointeur = useCallback(
    (
      clientX: number,
      clientY: number,
    ): { minutes: number; distance: number; x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const echelle = Math.min(rect.width, rect.height) / VB_TAILLE;
      const margeX = (rect.width - VB_TAILLE * echelle) / 2;
      const margeY = (rect.height - VB_TAILLE * echelle) / 2;
      const x = VB_ORIGINE + (clientX - rect.left - margeX) / echelle - CX;
      const y = VB_ORIGINE + (clientY - rect.top - margeY) / echelle - CY;
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
  // proche gagne, et l'écart de prise l'empêche ensuite de sauter sur sa voisine.
  //
  // ÉGALITÉ STRICTE : deux poignées superposées (tout se cale sur la grille de
  // 15 min, il n'y a qu'un cran à franchir) sont à la même distance de tout
  // appui. Un simple `<` rendait alors la seconde définitivement inatteignable au
  // doigt — le patient voyait « la mauvaise poignée bouge » sans explication. Deux
  // règles la rendent joignable, dans cet ordre :
  //
  //  1. un FILTRE : s'il existe des poignées non confirmées parmi les ex-aequo, la
  //     réponse se cherche parmi elles seules. Une poignée déjà répondue a sa
  //     valeur ; celle qui n'a pas encore été touchée attend le geste qui la fera
  //     exister, et c'est ce geste que la doctrine du composant réclame ;
  //  2. une ROTATION dans le groupe retenu : on prend celle qui SUIT la dernière
  //     prise. Des appuis successifs au même endroit parcourent donc tout le
  //     groupe — sans quoi la première monopoliserait le point à jamais.
  //
  // La rotation porte sur le groupe et non sur un duo : une préférence deux-à-deux
  // ne sait permuter qu'entre deux éléments, et laissait la TROISIÈME d'un groupe
  // de trois définitivement injoignable. La configuration est cliniquement absurde
  // (trois repères de la nuit à la même minute), mais une règle qui ne tient que
  // pour deux ne se décrit pas comme close.
  function saisir(e: React.PointerEvent) {
    if (pointeurActif.current !== null) return;
    const p = positionPointeur(e.clientX, e.clientY);
    if (!p) return;

    const confirmee: Record<Poignee, boolean> = {
      lit: miseAuLit !== undefined,
      extinction: extinction !== undefined,
      reveil: reveilFinal !== undefined,
      sortie: sortieDuLit !== undefined,
    };
    const distances = visibles.map((poignee) => {
      const centre = point(MINUTES[poignee]);
      return { poignee, d: Math.hypot(p.x - (centre.x - CX), p.y - (centre.y - CY)) };
    });
    const plusCourte = Math.min(...distances.map((c) => c.d));
    if (!Number.isFinite(plusCourte) || plusCourte > RAYON_PRISE) return;

    // La comparaison est à l'ULP près, et c'est voulu : deux poignées de MÊME
    // valeur produisent exactement le même flottant, tandis que deux valeurs
    // différentes équidistantes d'un appui diffèrent toujours de quelques 1e-14.
    // Seule la superposition réelle forme donc un groupe.
    const exAequo = distances.filter((c) => c.d === plusCourte).map((c) => c.poignee);
    const nonConfirmees = exAequo.filter((poignee) => !confirmee[poignee]);
    const groupe = nonConfirmees.length > 0 ? nonConfirmees : exAequo;
    const rang = dernierePrise.current ? groupe.indexOf(dernierePrise.current) : -1;
    const choisie = groupe[(rang + 1) % groupe.length];

    e.preventDefault();
    // Capture posée sur la RACINE, un nœud stable : la v1 la posait sur la cible
    // de la poignée, qui se déplace à chaque rendu. Le `?.` porte sur la méthode
    // elle-même — jsdom ne l'implémente pas, et le glissement doit rester
    // exécutable en test.
    svgRef.current?.setPointerCapture?.(e.pointerId);
    pointeurActif.current = e.pointerId;
    dernierePrise.current = choisie;
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
    // Le pas est de 15 min, soit ~9 unités d'arc : la grande majorité des
    // mouvements retombe sur la valeur déjà affichée. Ne remonter que les
    // CHANGEMENTS évite de faire porter au parent — qui écrit dans son état à
    // chaque appel — le rythme du doigt plutôt que celui de la saisie.
    const valeur = versHHMM(p.minutes - ecartPrise.current);
    if (valeur === POSITIONS[active]) return;
    onChange(active, valeur);
  }

  // `lostpointercapture` sert de FILET (un `pointerup` peut ne jamais arriver),
  // mais il ne doit pas tuer un glissement en cours. Sur tactile, la capture
  // IMPLICITE appartient d'abord au cercle touché ; poser la capture sur la
  // racine fait émettre `lostpointercapture` sur l'ANCIENNE cible — l'enfant —
  // d'où l'événement REMONTE jusqu'ici avec le pointeur en cours. Relâcher là
  // couperait le geste avant le premier mouvement : le tap confirmerait l'heure
  // suggérée et le glissement ne ferait plus rien — sur le doigt, sur le geste le
  // plus courant. Chromium ne produit pas cette séquence (mesuré) ; WebKit, le
  // moteur de l'iPhone, n'est pas mesuré.
  //
  // On ne relâche donc que si la capture n'est PLUS à nous. `hasPointerCapture`
  // rend vrai aussi pour une capture EN ATTENTE, ce qui couvre exactement
  // l'instant du basculement. Absente (jsdom), elle rend `undefined` et le filet
  // se comporte comme avant.
  function capturePerdue(e: React.PointerEvent) {
    if (svgRef.current?.hasPointerCapture?.(e.pointerId)) return;
    relacher(e);
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
          // `touch-manipulation` et non un retrait sec : laisse passer le
          // défilement ET le pincement pour zoomer TANT QU'AUCUNE POIGNÉE N'EST
          // TENUE (WCAG 1.4.10 — des patients à basse vision ; pendant une prise
          // `bloquerDefilement` annule tout, pinch compris, voir son commentaire).
          // Il supprime en revanche le zoom au double-tapotement, qu'un patient
          // confirmant deux poignées voisines coup sur coup déclencherait sans le
          // vouloir. Le blocage pendant un glissement réel est pris en charge par
          // l'écouteur, pas par le CSS.
          className="w-full touch-manipulation"
          onPointerDown={saisir}
          onPointerMove={deplacer}
          onPointerUp={relacher}
          onPointerCancel={relacher}
          // Filet de sécurité : si un `pointerup` se perd — onglet masqué, geste
          // interrompu par le système —, `pointeurActif` resterait armé et
          // refuserait TOUTE prise ultérieure pour la durée du montage, sans
          // aucun chemin de réinitialisation. Le navigateur, lui, émet
          // `lostpointercapture` dans tous les cas. Après un relâchement normal
          // l'événement arrive aussi, mais `relacher` a déjà remis le compteur à
          // zéro et n'y reconnaît plus son pointeur : l'appel est inerte. Le
          // filtre `capturePerdue` distingue une perte réelle d'un simple
          // basculement de capture (voir son commentaire).
          onLostPointerCapture={capturePerdue}
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
