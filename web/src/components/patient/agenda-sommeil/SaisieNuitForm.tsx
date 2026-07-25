'use client';

import { useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import {
  ARIA_QUALITE,
  ARIA_FORME,
  EMOJI_FORME,
  EMOJI_QUALITE,
  LABEL_DUREE_REVEILS,
  LABEL_FACTEURS,
  LABEL_LATENCE,
  LABEL_SIESTE,
} from '@/lib/agenda-sommeil/libelles';
import {
  CLASSES_DUREE_REVEILS,
  CLASSES_LATENCE,
  CLASSES_SIESTE,
  type ClasseDureeReveils,
  type ClasseLatence,
  type ClasseSieste,
  type FacteursNuit,
  type NuitReponses,
} from '@/lib/agenda-sommeil/types';

// Saisie d'une nuit — 30 à 60 s le matin. Quatre gestes obligatoires (heures en
// steppers ±15 min, endormissement en puces, qualité en emoji) puis un accordéon
// facultatif. Aucun clavier requis pour l'essentiel ; cibles tactiles ≥ 44 px.

function ajouterMinutes(hhmm: string, delta: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (((h * 60 + m + delta) % 1440) + 1440) % 1440;
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(Math.floor(total / 60))}:${p(total % 60)}`;
}

function Stepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Reculer de 15 minutes"
          onClick={() => onChange(ajouterMinutes(value, -15))}
          className="h-12 w-12 rounded-full border border-border text-2xl text-primary hover:bg-primary/10 transition-colors"
        >
          −
        </button>
        <span className="font-display text-3xl font-bold tabular-nums text-foreground w-24 text-center" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label="Avancer de 15 minutes"
          onClick={() => onChange(ajouterMinutes(value, 15))}
          className="h-12 w-12 rounded-full border border-border text-2xl text-primary hover:bg-primary/10 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ChoixEmoji({
  label,
  emojis,
  aria,
  value,
  onChange,
}: {
  label: string;
  emojis: readonly string[];
  aria: readonly string[];
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="flex justify-between gap-1">
        {emojis.map((emoji, i) => {
          const note = i + 1;
          const actif = value === note;
          return (
            <button
              key={note}
              type="button"
              aria-label={aria[i]}
              aria-pressed={actif}
              onClick={() => onChange(note)}
              className={`h-12 w-12 rounded-full text-2xl transition-transform ${
                actif ? 'bg-primary/15 scale-110 ring-2 ring-primary/40' : 'hover:bg-muted'
              }`}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Puces<T extends string>({
  label,
  options,
  libelle,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  libelle: (v: T) => string;
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const actif = value === opt;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={actif}
              onClick={() => onChange(opt)}
              className={`min-h-11 rounded-xl px-4 py-2 text-sm border transition-colors ${
                actif
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border hover:bg-muted'
              }`}
            >
              {libelle(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  initial: NuitReponses | null;
  submitting: boolean;
  ctaLabel?: string;
  onSubmit: (reponses: NuitReponses) => void;
};

export function SaisieNuitForm({ initial, submitting, ctaLabel = 'C’est noté ✓', onSubmit }: Props) {
  const [heureCoucher, setHeureCoucher] = useState(initial?.heureCoucher ?? '23:00');
  const [heureLever, setHeureLever] = useState(initial?.heureLever ?? '07:00');
  const [latence, setLatence] = useState<ClasseLatence | undefined>(initial?.latence);
  const [qualite, setQualite] = useState<number | undefined>(initial?.qualite);

  const [detailsOuverts, setDetailsOuverts] = useState(false);
  const [nbReveils, setNbReveils] = useState<number | undefined>(initial?.reveils?.nombre);
  const [dureeReveils, setDureeReveils] = useState<ClasseDureeReveils | undefined>(initial?.reveils?.dureeTotale);
  const [forme, setForme] = useState<number | undefined>(initial?.forme);
  const [sieste, setSieste] = useState<ClasseSieste | undefined>(initial?.siesteVeille);
  const [facteurs, setFacteurs] = useState<FacteursNuit>(initial?.facteurs ?? {});
  const [commentaire, setCommentaire] = useState(initial?.commentaire ?? '');

  const [erreur, setErreur] = useState('');

  const complet = latence !== undefined && qualite !== undefined;

  function soumettre() {
    if (!complet) {
      setErreur('Indiquez au moins l’endormissement et la qualité de la nuit.');
      return;
    }
    setErreur('');
    const reponses: NuitReponses = {
      heureCoucher,
      heureLever,
      latence: latence!,
      qualite: qualite!,
    };
    if (nbReveils !== undefined) {
      reponses.reveils = { nombre: nbReveils, dureeTotale: dureeReveils ?? 'lt15' };
    }
    if (forme !== undefined) reponses.forme = forme;
    if (sieste !== undefined) reponses.siesteVeille = sieste;
    if (Object.keys(facteurs).length > 0) reponses.facteurs = facteurs;
    const commentaireNet = commentaire.trim();
    if (commentaireNet) reponses.commentaire = commentaireNet.slice(0, 200);
    onSubmit(reponses);
  }

  return (
    <div className="space-y-6">
      <Stepper label="Vous vous êtes couché·e vers…" value={heureCoucher} onChange={setHeureCoucher} />
      <Stepper label="Vous vous êtes levé·e vers…" value={heureLever} onChange={setHeureLever} />
      <Puces<ClasseLatence>
        label="Vous vous êtes endormi·e…"
        options={CLASSES_LATENCE}
        libelle={(v) => LABEL_LATENCE[v]}
        value={latence}
        onChange={setLatence}
      />
      <ChoixEmoji
        label="Cette nuit était…"
        emojis={EMOJI_QUALITE}
        aria={ARIA_QUALITE}
        value={qualite}
        onChange={setQualite}
      />

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setDetailsOuverts((v) => !v)}
          className="text-sm text-primary hover:underline"
          aria-expanded={detailsOuverts}
        >
          {detailsOuverts ? '− Masquer les détails' : '+ Ajouter des détails (facultatif)'}
        </button>
      </div>

      {detailsOuverts && (
        <div className="space-y-6">
          <Puces<string>
            label="Réveils dans la nuit"
            options={['0', '1', '2', '3']}
            libelle={(v) => (v === '3' ? '3 ou plus' : v)}
            value={nbReveils !== undefined ? String(nbReveils) : undefined}
            onChange={(v) => setNbReveils(Number(v))}
          />
          {nbReveils !== undefined && nbReveils > 0 && (
            <Puces<ClasseDureeReveils>
              label="Réveillé·e au total…"
              options={CLASSES_DUREE_REVEILS}
              libelle={(v) => LABEL_DUREE_REVEILS[v]}
              value={dureeReveils}
              onChange={setDureeReveils}
            />
          )}
          <ChoixEmoji
            label="Votre forme au réveil"
            emojis={EMOJI_FORME}
            aria={ARIA_FORME}
            value={forme}
            onChange={setForme}
          />
          <Puces<ClasseSieste>
            label="Sieste la veille"
            options={CLASSES_SIESTE}
            libelle={(v) => LABEL_SIESTE[v]}
            value={sieste}
            onChange={setSieste}
          />
          <div>
            <p className="text-sm font-medium text-foreground mb-2">La veille au soir</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LABEL_FACTEURS) as (keyof FacteursNuit)[]).map((cle) => {
                const actif = facteurs[cle] === true;
                return (
                  <button
                    key={cle}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setFacteurs((f) => ({ ...f, [cle]: !actif }))}
                    className={`min-h-11 rounded-xl px-4 py-2 text-sm border transition-colors ${
                      actif
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {LABEL_FACTEURS[cle]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="agd-commentaire" className="text-sm font-medium text-foreground mb-2 block">
              Un mot sur cette nuit ? (facultatif)
            </label>
            <textarea
              id="agd-commentaire"
              value={commentaire}
              maxLength={200}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>
      )}

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <PatientButton
        variant="primary"
        className="w-full"
        loading={submitting}
        loadingLabel="Enregistrement…"
        disabled={!complet}
        onClick={soumettre}
      >
        {ctaLabel}
      </PatientButton>
    </div>
  );
}
