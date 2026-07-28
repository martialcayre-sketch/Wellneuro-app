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
  onSaisir,
  onDeplacer,
  onRelacher,
  onClavier,
}: {
  poignee: Poignee;
  minutes: number;
  valeur: string | undefined;
  label: string;
  icone: string;
  onSaisir: (poignee: Poignee, e: React.PointerEvent) => void;
  onDeplacer: (e: React.PointerEvent) => void;
  onRelacher: (e: React.PointerEvent) => void;
  onClavier: (poignee: Poignee, e: React.KeyboardEvent) => void;
}) {
  const p = point(minutes);
  const etiquette = point(minutes, R + 22);
  const confirmee = valeur !== undefined;
  return (
    <g>
      {/* Cible tactile élargie : ≥ 44 px une fois le cadran rendu à 300 px. */}
      <circle
        cx={p.x}
        cy={p.y}
        r={18}
        fill="transparent"
        className="cursor-grab touch-none"
        onPointerDown={(e) => onSaisir(poignee, e)}
        onPointerMove={onDeplacer}
        onPointerUp={onRelacher}
        onPointerCancel={onRelacher}
      />
      <circle
        cx={p.x}
        cy={p.y}
        r={13}
        className={
          confirmee ? 'fill-primary stroke-primary-foreground' : 'fill-surface stroke-primary/50'
        }
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

  // Coordonnées écran → minutes. Le viewBox est carré et le conteneur aussi :
  // la projection est uniforme, un rapport de largeur suffit — à condition de
  // partir de l'ORIGINE du viewBox et non de zéro.
  const minutesDepuisEvenement = useCallback((clientX: number, clientY: number): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const x = VB_ORIGINE + ((clientX - rect.left) / rect.width) * VB_TAILLE - CX;
    const y = VB_ORIGINE + ((clientY - rect.top) / rect.height) * VB_TAILLE - CY;
    const deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    return (((deg + 360) % 360) / 360) * 1440;
  }, []);

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

  function saisir(poignee: Poignee, e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setActive(poignee);
    // L'appui vaut confirmation : la suggestion fantôme devient une valeur.
    onChange(poignee, POSITIONS[poignee]);
  }

  function deplacer(e: React.PointerEvent) {
    if (!active) return;
    e.preventDefault();
    onChange(active, versHHMM(minutesDepuisEvenement(e.clientX, e.clientY)));
  }

  function relacher(e: React.PointerEvent) {
    if (!active) return;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
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
              onSaisir={saisir}
              onDeplacer={deplacer}
              onRelacher={relacher}
              onClavier={auClavier}
            />
          )}
          <PoigneeCadran
            poignee="extinction"
            minutes={minExtinction}
            valeur={extinction}
            label={LABEL_EXTINCTION}
            icone="🌑"
            onSaisir={saisir}
            onDeplacer={deplacer}
            onRelacher={relacher}
            onClavier={auClavier}
          />
          {afficherReveilFinal && (
            <PoigneeCadran
              poignee="reveil"
              minutes={minReveil}
              valeur={reveilFinal}
              label={LABEL_REVEIL_FINAL}
              icone="👁️"
              onSaisir={saisir}
              onDeplacer={deplacer}
              onRelacher={relacher}
              onClavier={auClavier}
            />
          )}
          <PoigneeCadran
            poignee="sortie"
            minutes={minSortie}
            valeur={sortieDuLit}
            label={LABEL_SORTIE_DU_LIT}
            icone="🌅"
            onSaisir={saisir}
            onDeplacer={deplacer}
            onRelacher={relacher}
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
