'use client';

import { useState } from 'react';
import {
  BLOCS_PATIENT,
  CHAMPS_PATIENT,
  DATE_INCONNUE_PATIENT,
  DOSE_MAX,
  LIBELLES_PRESCRIT_PATIENT,
  MOMENT_MAX,
  MOTIF_MAX,
  NOM_MAX,
  PRESCRIT_PAR_TIERS,
  type Nature,
  type PrescritParTiers,
} from '@/lib/physio-traitements/liste';
import { ChampDatePeriode } from './ChampDatePeriode';

// Une ligne de traitement à poser ([[D-335]] §3, §4) — partagée par le
// portail et le cockpit, sous les libellés validés le 2026-10-21. Le
// formulaire ne fait que composer le corps de la requête : la route juge.

export type ValeursTraitement = {
  nom: string;
  dose: string;
  moment: string;
  motif: string;
  /** Chaîne du fil (`AAAA`, `AAAA-MM`, `AAAA-MM-JJ`, `inconnu`) ou `''`. */
  debut: string;
  /** `null` : en cours ; sinon la chaîne du fil, `''` tant que rien n'est saisi. */
  fin: string | null;
  prescritParTiers: PrescritParTiers | '';
};

export const VALEURS_VIDES: ValeursTraitement = {
  nom: '', dose: '', moment: '', motif: '', debut: '', fin: null, prescritParTiers: '',
};

/** Le corps de la pose, à compléter de `objet`, `acte` et `remplace` par l'appelant. */
export function corpsTraitement(nature: Nature, v: ValeursTraitement) {
  return {
    nature,
    nom: v.nom,
    dose: v.dose.trim() ? v.dose : null,
    moment: v.moment.trim() ? v.moment : null,
    motif: v.motif.trim() ? v.motif : null,
    debut: v.debut,
    fin: v.fin,
    prescritParTiers: v.prescritParTiers,
  };
}

const classeChamp = 'mt-1 block w-full min-h-11 rounded-lg border border-border bg-background px-2 text-sm';

export function FormulaireTraitement({
  nature,
  initiales = VALEURS_VIDES,
  avecFin,
  libelleEnvoi,
  envoi,
  onEnvoyer,
  onAnnuler,
  idBase,
}: {
  nature: Nature;
  initiales?: ValeursTraitement;
  /** Le champ « depuis quand » de l'arrêt : un arrêt, ou la correction d'une ligne arrêtée. */
  avecFin: boolean;
  libelleEnvoi: string;
  envoi: boolean;
  onEnvoyer: (valeurs: ValeursTraitement) => void;
  onAnnuler: () => void;
  idBase: string;
}) {
  const [v, setV] = useState<ValeursTraitement>(() => ({ ...initiales, fin: avecFin ? initiales.fin ?? '' : null }));
  const bloc = BLOCS_PATIENT[nature];
  const champ = (cle: 'nom' | 'dose' | 'moment' | 'motif', libelle: string, max: number) => (
    <label className="block text-sm text-foreground" htmlFor={`${idBase}-${cle}`}>
      <span className="text-xs text-muted-foreground">{libelle}</span>
      <input
        id={`${idBase}-${cle}`}
        value={v[cle]}
        maxLength={max}
        disabled={envoi}
        onChange={e => setV({ ...v, [cle]: e.target.value })}
        className={classeChamp}
      />
    </label>
  );
  // Un groupe, pas un `<form>` : la fiche de renseignements du portail est
  // déjà un formulaire, et un formulaire ne s'imbrique pas.
  return (
    <div role="group" className="space-y-3 rounded-lg border border-border p-3">
      {champ('nom', CHAMPS_PATIENT.nom, NOM_MAX)}
      {champ('dose', CHAMPS_PATIENT.dose, DOSE_MAX)}
      {champ('moment', CHAMPS_PATIENT.moment, MOMENT_MAX)}
      {champ('motif', bloc.motif, MOTIF_MAX)}
      <ChampDatePeriode
        legende={CHAMPS_PATIENT.depuis}
        valeur={v.debut}
        onChange={debut => setV(prev => ({ ...prev, debut }))}
        libelleInconnue={DATE_INCONNUE_PATIENT}
        desactive={envoi}
        idBase={`${idBase}-debut`}
      />
      {v.fin !== null && (
        <ChampDatePeriode
          legende={CHAMPS_PATIENT.arretDepuis}
          valeur={v.fin}
          onChange={fin => setV(prev => ({ ...prev, fin }))}
          libelleInconnue={DATE_INCONNUE_PATIENT}
          desactive={envoi}
          idBase={`${idBase}-fin`}
        />
      )}
      <fieldset className="space-y-1 text-sm text-foreground" disabled={envoi}>
        <legend className="text-xs text-muted-foreground">{CHAMPS_PATIENT.prescrit}</legend>
        <div className="flex flex-wrap gap-3">
          {PRESCRIT_PAR_TIERS.map(p => (
            <label key={p} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name={`${idBase}-prescrit`}
                value={p}
                checked={v.prescritParTiers === p}
                onChange={() => setV({ ...v, prescritParTiers: p })}
              />
              {LIBELLES_PRESCRIT_PATIENT[p]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={envoi}
          onClick={() => onEnvoyer(v)}
          className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {libelleEnvoi}
        </button>
        <button
          type="button"
          disabled={envoi}
          onClick={onAnnuler}
          className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
