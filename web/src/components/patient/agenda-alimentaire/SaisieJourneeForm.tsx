'use client';

import { useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import type { JourReponses, PriseJour } from '@/lib/agenda-alimentaire/types';
import { LigneDePrises } from './LigneDePrises';
import {
  AIDE_AUCUNE_PRISE,
  AIDE_PRESENCES,
  AIDE_SOIR_PLUS_COPIEUX,
  CLES_PRESENCES,
  LABEL_AUCUNE_PRISE,
  LABEL_JE_NE_SAIS_PAS,
  LABEL_NON,
  LABEL_OUI,
  LABEL_PRESENCES,
  LABEL_SOIR_PLUS_COPIEUX,
  MESSAGE_MANQUE_PRESENCES,
  MESSAGE_MANQUE_PRISES,
  type ClePresence,
} from './libelles';

// Saisie d'UNE journée alimentaire. Une journée par écran, cible sous 30 s.
//
// RIEN N'EST PRÉ-COCHÉ, ET LA VEILLE N'EST JAMAIS RECOPIÉE. C'est la doctrine
// explicite du formulaire de nuit (`SaisieNuitForm.tsx`, l. 52-56) : sa v1
// s'ouvrait pré-remplie avec la nuit précédente, le bouton d'envoi était actif
// sans un seul geste, et vingt copies conformes de la première nuit passaient
// pour un recueil. `initial` ne vaut donc QUE la journée qu'on rouvre.
//
// ── LE TRI-ÉTAT NE SE TESTE JAMAIS PAR VÉRACITÉ ────────────────────────────
// Les quatre présences valent `true`, `false` ou `null` — et `null` est une
// RÉPONSE (« je ne sais pas »), pas une absence. `undefined` seul est l'absence.
// `if (x)`, `!x` et `Boolean(x)` confondent `false` et `null` : partout dans ce
// fichier la comparaison est EXPLICITE (`=== true`, `=== false`, `=== null`,
// `!== undefined`). Le handoff du lot précédent désignait nommément cet écran
// comme le lieu où le raccourci s'écrirait.
//
// ── `soirPlusCopieux` N'ADMET PAS L'ABSTENTION ─────────────────────────────
// Deux boutons, jamais trois. Un `null` sur ce champ est refusé par la route en
// 400 avec un message dédié — offrir « je ne sais pas » ici produirait un refus
// systématique. Le champ reste FACULTATIF : non touché, sa clé n'est pas
// envoyée, ce que le contrat autorise explicitement.

type TriEtat = boolean | null;

function ChoixTriEtat({
  id,
  label,
  aide,
  value,
  onChange,
}: {
  id: string;
  label: string;
  aide?: string;
  value: TriEtat | undefined;
  onChange: (v: TriEtat) => void;
}) {
  const options: { cle: string; libelle: string; valeur: TriEtat }[] = [
    { cle: 'oui', libelle: LABEL_OUI, valeur: true },
    { cle: 'non', libelle: LABEL_NON, valeur: false },
    { cle: 'inconnu', libelle: LABEL_JE_NE_SAIS_PAS, valeur: null },
  ];
  return (
    <div>
      <p id={id} className="text-sm font-medium text-foreground">
        {label}
      </p>
      {aide !== undefined && <p className="text-xs text-muted-foreground mt-1">{aide}</p>}
      <div role="group" aria-labelledby={id} className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => {
          // Comparaison EXPLICITE, et surtout PAS `value === opt.valeur` seule :
          // `undefined === null` est faux en JavaScript, mais le raccourci
          // inverse (`!value`) ferait de `false` et de `null` le même bouton.
          const actif = value !== undefined && value === opt.valeur;
          return (
            <button
              key={opt.cle}
              type="button"
              aria-pressed={actif}
              aria-label={`${label} ${opt.libelle}`}
              onClick={() => onChange(opt.valeur)}
              className={`min-h-11 rounded-xl border px-4 py-2 text-sm transition-colors ${
                actif
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-transparent text-foreground hover:bg-muted'
              }`}
            >
              {opt.libelle}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChoixOuiNon({
  id,
  label,
  aide,
  value,
  onChange,
}: {
  id: string;
  label: string;
  aide?: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <p id={id} className="text-sm font-medium text-foreground">
        {label}
      </p>
      {aide !== undefined && <p className="text-xs text-muted-foreground mt-1">{aide}</p>}
      <div role="group" aria-labelledby={id} className="mt-2 flex flex-wrap gap-2">
        {[
          { cle: 'oui', libelle: LABEL_OUI, valeur: true },
          { cle: 'non', libelle: LABEL_NON, valeur: false },
        ].map((opt) => {
          const actif = value === opt.valeur;
          return (
            <button
              key={opt.cle}
              type="button"
              aria-pressed={actif}
              aria-label={`${label} ${opt.libelle}`}
              onClick={() => onChange(opt.valeur)}
              className={`min-h-11 rounded-xl border px-4 py-2 text-sm transition-colors ${
                actif
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-transparent text-foreground hover:bg-muted'
              }`}
            >
              {opt.libelle}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  /** Renseigné UNIQUEMENT quand on rouvre cette journée-là. Jamais la veille. */
  initial: JourReponses | null;
  submitting: boolean;
  ctaLabel?: string;
  onSubmit: (reponses: JourReponses) => void;
};

export function SaisieJourneeForm({
  initial,
  submitting,
  ctaLabel = 'C’est noté ✓',
  onSubmit,
}: Props) {
  const [prises, setPrises] = useState<PriseJour[]>(initial?.prises ?? []);
  const [aucunePrise, setAucunePrise] = useState<boolean>(initial?.aucunePrise === true);
  // `initial?.champ` rend `undefined` si la clé est absente et `null` si elle
  // porte l'abstention : les deux états survivent au passage, tels quels.
  const [presences, setPresences] = useState<Record<ClePresence, TriEtat | undefined>>({
    premierePriseProteines: initial?.premierePriseProteines,
    legumesDeuxPrises: initial?.legumesDeuxPrises,
    fruitsOuOleagineux: initial?.fruitsOuOleagineux,
    ultraTransformes: initial?.ultraTransformes,
  });
  const [soirPlusCopieux, setSoirPlusCopieux] = useState<boolean | undefined>(
    initial?.soirPlusCopieux,
  );
  const [erreur, setErreur] = useState('');

  // Une journée SANS PRISE est une réponse ENTIÈRE : le contrat de domaine y
  // interdit toute observation de contenu (`jour.ts`, branche `aucunePrise`).
  // Les présences sont donc neutralisées avec la ligne, et non seulement elle.
  const presencesCompletes = CLES_PRESENCES.every((cle) => presences[cle] !== undefined);
  const complet = aucunePrise ? true : prises.length > 0 && presencesCompletes;

  function majPresence(cle: ClePresence, valeur: TriEtat) {
    setErreur('');
    setPresences((p) => ({ ...p, [cle]: valeur }));
  }

  function soumettre() {
    if (aucunePrise) {
      setErreur('');
      onSubmit({ aucunePrise: true });
      return;
    }
    if (prises.length === 0) {
      setErreur(MESSAGE_MANQUE_PRISES);
      return;
    }
    if (!presencesCompletes) {
      setErreur(MESSAGE_MANQUE_PRESENCES);
      return;
    }
    setErreur('');
    // Les quatre CLÉS sont toujours écrites — la route exige la clé, jamais une
    // valeur non nulle. Le `as TriEtat` est sûr : `presencesCompletes` vient
    // d'être vérifié, aucune des quatre n'est `undefined`.
    const reponses: JourReponses = {
      prises,
      premierePriseProteines: presences.premierePriseProteines as TriEtat,
      legumesDeuxPrises: presences.legumesDeuxPrises as TriEtat,
      fruitsOuOleagineux: presences.fruitsOuOleagineux as TriEtat,
      ultraTransformes: presences.ultraTransformes as TriEtat,
    };
    // FACULTATIF, et jamais `null` : non touché, la clé reste absente. Envoyer
    // `null` ici serait refusé en 400 ; envoyer `false` inventerait une réponse.
    if (soirPlusCopieux !== undefined) reponses.soirPlusCopieux = soirPlusCopieux;
    onSubmit(reponses);
  }

  return (
    <div className="space-y-6">
      <LigneDePrises prises={prises} onChange={setPrises} desactive={aucunePrise} />

      <div className="rounded-xl border border-border p-3">
        <label className="flex min-h-11 items-center gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={aucunePrise}
            onChange={(e) => {
              setErreur('');
              setAucunePrise(e.target.checked);
            }}
            className="h-5 w-5 rounded border-border"
          />
          <span>{LABEL_AUCUNE_PRISE}</span>
        </label>
        <p className="mt-1 pl-8 text-xs text-muted-foreground">{AIDE_AUCUNE_PRISE}</p>
      </div>

      {aucunePrise ? (
        <p className="text-xs text-muted-foreground">
          Journée sans prise : les questions de contenu ne s’appliquent pas.
        </p>
      ) : (
        <div className="space-y-5">
          {CLES_PRESENCES.map((cle) => (
            <ChoixTriEtat
              key={cle}
              id={`presence-${cle}`}
              label={LABEL_PRESENCES[cle]}
              aide={AIDE_PRESENCES[cle]}
              value={presences[cle]}
              onChange={(v) => majPresence(cle, v)}
            />
          ))}
          <ChoixOuiNon
            id="presence-soirPlusCopieux"
            label={LABEL_SOIR_PLUS_COPIEUX}
            aide={AIDE_SOIR_PLUS_COPIEUX}
            value={soirPlusCopieux}
            onChange={(v) => {
              setErreur('');
              setSoirPlusCopieux(v);
            }}
          />
        </div>
      )}

      {erreur !== '' && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}

      <PatientButton
        variant="primary"
        className="w-full"
        disabled={!complet}
        loading={submitting}
        loadingLabel="Enregistrement…"
        onClick={soumettre}
      >
        {ctaLabel}
      </PatientButton>
    </div>
  );
}
