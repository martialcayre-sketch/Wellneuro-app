'use client';

import { Plus, Save, Trash2, X } from 'lucide-react';
import type { SyntheseSchema } from '@/lib/anthropic';

type Props = {
  value: SyntheseSchema;
  onChange: (value: SyntheseSchema) => void;
  onSave: () => void;
  onCancel?: () => void;
  saving?: boolean;
  saveLabel?: string;
};

const champ =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground';

function lignes(value: string): string[] {
  // Conserve la ligne vide terminale pendant la frappe ; le serveur nettoie
  // les éléments vides à l'enregistrement.
  return value.split('\n');
}

export function SynthesePraticienEditor({
  value,
  onChange,
  onSave,
  onCancel,
  saving = false,
  saveLabel = 'Enregistrer le brouillon',
}: Props) {
  const modifier = <K extends keyof SyntheseSchema>(cle: K, valeur: SyntheseSchema[K]) => {
    onChange({ ...value, [cle]: valeur });
  };

  const modifierAxe = (index: number, patch: Partial<SyntheseSchema['axes_prioritaires'][number]>) => {
    const axes = value.axes_prioritaires.map((axe, i) => i === index ? { ...axe, ...patch } : axe);
    modifier('axes_prioritaires', axes);
  };

  const ajouterAxe = () => {
    if (value.axes_prioritaires.length >= 3) return;
    modifier('axes_prioritaires', [
      ...value.axes_prioritaires,
      { axe: '', niveau_priorite: 'modere', arguments: [], points_a_confirmer: [] },
    ]);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-2">
        <label htmlFor="synthese-resume" className="text-sm font-medium text-foreground">
          Résumé interne praticien
        </label>
        <textarea
          id="synthese-resume"
          value={value.resume_praticien}
          onChange={event => modifier('resume_praticien', event.target.value)}
          rows={5}
          maxLength={4000}
          required
          className={`${champ} resize-y`}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="synthese-patient" className="text-sm font-medium text-foreground">
          Texte destiné au patient
        </label>
        <textarea
          id="synthese-patient"
          value={value.narratif_patient}
          onChange={event => modifier('narratif_patient', event.target.value)}
          rows={8}
          maxLength={12000}
          required
          className={`${champ} resize-y`}
        />
      </div>

      <section className="border-y border-border py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-foreground">Axes prioritaires</h4>
          <button
            type="button"
            onClick={ajouterAxe}
            disabled={value.axes_prioritaires.length >= 3}
            title="Ajouter un axe prioritaire"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40"
          >
            <Plus size={17} aria-hidden="true" />
            <span className="sr-only">Ajouter un axe prioritaire</span>
          </button>
        </div>

        <div className="divide-y divide-border">
          {value.axes_prioritaires.map((axe, index) => (
            <div key={index} className="grid gap-3 py-4 first:pt-0 last:pb-0">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_40px]">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Libellé de l’axe
                  <input
                    value={axe.axe}
                    onChange={event => modifierAxe(index, { axe: event.target.value })}
                    maxLength={160}
                    className={champ}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Priorité
                  <select
                    value={axe.niveau_priorite}
                    onChange={event => modifierAxe(index, {
                      niveau_priorite: event.target.value as 'eleve' | 'modere' | 'faible',
                    })}
                    className={champ}
                  >
                    <option value="eleve">Élevée</option>
                    <option value="modere">Modérée</option>
                    <option value="faible">Faible</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => modifier('axes_prioritaires', value.axes_prioritaires.filter((_, i) => i !== index))}
                  title="Supprimer cet axe"
                  className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-lg text-status-danger hover:bg-status-danger/10"
                >
                  <Trash2 size={17} aria-hidden="true" />
                  <span className="sr-only">Supprimer cet axe</span>
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Arguments, un par ligne
                  <textarea
                    value={axe.arguments.join('\n')}
                    onChange={event => modifierAxe(index, { arguments: lignes(event.target.value) })}
                    rows={3}
                    className={`${champ} resize-y`}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Points à confirmer, un par ligne
                  <textarea
                    value={axe.points_a_confirmer.join('\n')}
                    onChange={event => modifierAxe(index, { points_a_confirmer: lignes(event.target.value) })}
                    rows={3}
                    className={`${champ} resize-y`}
                  />
                </label>
              </div>
            </div>
          ))}
          {value.axes_prioritaires.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">Aucun axe ajouté.</p>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Points de vigilance
          <textarea
            value={value.points_de_vigilance.join('\n')}
            onChange={event => modifier('points_de_vigilance', lignes(event.target.value))}
            rows={4}
            className={`${champ} resize-y`}
          />
          <span className="text-xs font-normal text-muted-foreground">Un point par ligne.</span>
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Questions pour la consultation
          <textarea
            value={value.questions_entretien.join('\n')}
            onChange={event => modifier('questions_entretien', lignes(event.target.value))}
            rows={4}
            className={`${champ} resize-y`}
          />
          <span className="text-xs font-normal text-muted-foreground">Une question par ligne.</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          <Save size={16} aria-hidden="true" />
          {saving ? 'Enregistrement...' : saveLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            <X size={16} aria-hidden="true" />
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}
