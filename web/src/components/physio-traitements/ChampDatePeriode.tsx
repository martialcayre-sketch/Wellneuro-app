'use client';

import { useState } from 'react';

// Une date de traitement au jour, au mois ou à l'année, ou inconnue
// ([[D-335]] §4) — partagée par le portail et le cockpit. La précision ne se
// choisit pas : elle se lit de ce qui est rempli (l'année seule, l'année et
// le mois, ou la date entière), et la valeur produite est la chaîne du fil
// (`AAAA`, `AAAA-MM`, `AAAA-MM-JJ`, `inconnu`, ou `''` tant que rien n'est
// saisi). Aucune précision n'est inventée.

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

type Parties = { annee: string; mois: string; jour: string; inconnue: boolean };

function decomposer(valeur: string): Parties {
  if (valeur === 'inconnu') return { annee: '', mois: '', jour: '', inconnue: true };
  const [annee = '', mois = '', jour = ''] = valeur.split('-');
  return { annee, mois, jour, inconnue: false };
}

function composer(p: Parties): string {
  if (p.inconnue) return 'inconnu';
  if (!/^\d{4}$/.test(p.annee)) return '';
  if (!p.mois) return p.annee;
  if (!p.jour) return `${p.annee}-${p.mois}`;
  return `${p.annee}-${p.mois}-${p.jour.padStart(2, '0')}`;
}

export function ChampDatePeriode({
  legende,
  valeur,
  onChange,
  libelleInconnue,
  desactive = false,
  idBase,
}: {
  legende: string;
  valeur: string;
  onChange: (valeur: string) => void;
  libelleInconnue: string;
  desactive?: boolean;
  /** Préfixe unique des identifiants de champ. */
  idBase: string;
}) {
  // Les parties vivent ici : une année à moitié tapée ne fait pas encore une
  // valeur, et la perdre au rendu suivant effacerait la saisie.
  const [p, setP] = useState<Parties>(() => decomposer(valeur));
  const changer = (modif: Partial<Parties>) => {
    const suivant = { ...p, ...modif };
    setP(suivant);
    onChange(composer(suivant));
  };
  const classeChamp = 'min-h-11 rounded-lg border border-border bg-background px-2 text-sm';
  return (
    <fieldset className="space-y-1 text-sm text-foreground" disabled={desactive}>
      <legend className="text-xs text-muted-foreground">{legende}</legend>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-muted-foreground" htmlFor={`${idBase}-annee`}>
          Année
          <input
            id={`${idBase}-annee`}
            inputMode="numeric"
            maxLength={4}
            value={p.annee}
            disabled={p.inconnue}
            onChange={e => changer({ annee: e.target.value.replace(/\D/g, '') })}
            className={`${classeChamp} w-20`}
          />
        </label>
        <label className="flex flex-col text-xs text-muted-foreground" htmlFor={`${idBase}-mois`}>
          Mois (facultatif)
          <select
            id={`${idBase}-mois`}
            value={p.mois}
            disabled={p.inconnue || !p.annee}
            onChange={e => changer({ mois: e.target.value, jour: e.target.value ? p.jour : '' })}
            className={classeChamp}
          >
            <option value="">—</option>
            {MOIS.map((nom, i) => (
              <option key={nom} value={String(i + 1).padStart(2, '0')}>{nom}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-muted-foreground" htmlFor={`${idBase}-jour`}>
          Jour (facultatif)
          <input
            id={`${idBase}-jour`}
            inputMode="numeric"
            maxLength={2}
            value={p.jour}
            disabled={p.inconnue || !p.mois}
            onChange={e => changer({ jour: e.target.value.replace(/\D/g, '') })}
            className={`${classeChamp} w-16`}
          />
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          checked={p.inconnue}
          onChange={e => changer({ inconnue: e.target.checked })}
        />
        {libelleInconnue}
      </label>
    </fieldset>
  );
}
