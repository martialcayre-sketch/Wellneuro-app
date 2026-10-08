'use client';

// Sélecteur d'heure au QUART D'HEURE — remplace le cadran circulaire.
//
// Le cadran demandait d'apprendre un geste (glisser des poignées sur un anneau
// de 24 h, minuit en haut, jusqu'à quatre sur le même cercle) pour donner une
// heure que tout le monde sait lire. Une liste native fait la même chose sans
// rien apprendre : au doigt, le téléphone ouvre sa propre roue ou sa liste ; au
// clavier, les flèches suffisent ; aucun glissement n'est requis (WCAG 2.5.7).
// Ce n'est pas un champ de texte : la saisie reste SANS CLAVIER à taper.
//
// AUCUNE VALEUR PAR DÉFAUT. La liste s'ouvre sur « Choisir », jamais sur une
// heure : une heure affichée d'office se lit comme une heure donnée, et c'était
// exactement le piège des poignées en pointillé du cadran. Les horaires
// habituels du patient se confirment par un geste explicite, ailleurs
// (« Confirmer ces horaires »).
//
// Les 96 quarts d'heure partent d'une heure de début propre à la question
// (18 h le soir, 3 h le matin) : la nuit se lit d'un seul tenant, sans que
// minuit coupe la liste en deux. Le pas de 15 min est celui du contrat
// (`RE_HEURE`, lib/agenda-sommeil/nuit.ts) : aucune valeur hors grille ne peut
// être produite, donc aucune n'a à être arrondie en silence.

const PAS_MINUTES = 15;

function quartsDHeure(heureDebut: number): string[] {
  const p = (x: number) => String(x).padStart(2, '0');
  return Array.from({ length: (24 * 60) / PAS_MINUTES }, (_, i) => {
    const m = (heureDebut * 60 + i * PAS_MINUTES) % 1440;
    return `${p(Math.floor(m / 60))}:${p(m % 60)}`;
  });
}

const CACHE = new Map<number, string[]>();
function options(heureDebut: number): string[] {
  let liste = CACHE.get(heureDebut);
  if (!liste) {
    liste = quartsDHeure(heureDebut);
    CACHE.set(heureDebut, liste);
  }
  return liste;
}

export function SelecteurHeure({
  id,
  label,
  valeur,
  heureDebut,
  onChange,
}: {
  id: string;
  label: string;
  valeur: string | undefined;
  heureDebut: number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>
      <select
        id={id}
        value={valeur ?? ''}
        onChange={(e) => {
          if (e.target.value !== '') onChange(e.target.value);
        }}
        className={`min-h-12 w-40 rounded-xl border bg-surface px-3 text-base tabular-nums ${
          valeur === undefined ? 'border-border text-muted-foreground' : 'border-primary text-foreground'
        }`}
      >
        {/* SÉLECTIONNABLE, et non `disabled` : sur iPhone, une roue ouverte sur
            une option désactivée se cale sur la première heure disponible, et
            « OK » sans tourner la roue poserait 18:00 ou 03:00 — une heure
            jamais choisie. Choisir « Choisir » ne fait rien : `onChange` ignore
            la valeur vide, et la liste, contrôlée, garde l'heure en place. */}
        <option value="">Choisir</option>
        {options(heureDebut).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );
}
