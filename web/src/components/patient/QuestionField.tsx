'use client';

import type { Question } from '@/lib/questionnaire-types';

// Champ de question (likert / select / number). Composant présentationnel pur.
export function QuestionField({ question, value, onChange, displaySelectAsRadioCards = false, optionLayout = 'cartes' }: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  displaySelectAsRadioCards?: boolean;
  /**
   * `cartes` — une option par ligne, pleine largeur (défaut historique).
   * `grille` — options en regard sur la même ligne, repliées si l'écran est
   * étroit. Sur un questionnaire de 57 items, l'empilement produirait deux
   * cents lignes à faire défiler : c'est ce que la grille évite.
   *
   * Dans les deux cas, les options restent de VRAIS `input[type=radio]`
   * étiquetés. Ce n'est pas un détail de style : les parcours E2E remplissent
   * le questionnaire en cochant `form input[type="radio"]`, et des `<button>`
   * stylés casseraient tout le parcours patient — en plus de perdre la
   * navigation clavier et l'annonce par lecteur d'écran, gratuites ici.
   */
  optionLayout?: 'cartes' | 'grille';
}) {
  const enGrille = optionLayout === 'grille';
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium text-foreground">{question.texte}</legend>
      {(question.type === 'likert' || (question.type === 'select' && displaySelectAsRadioCards)) && question.options && (
        <div className={enGrille ? 'flex flex-wrap gap-2' : 'grid gap-2'}>
          {question.options.map(opt => (
            <label
              key={opt.v}
              className={`flex items-center gap-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                enGrille ? 'min-h-11 px-3 py-2' : 'gap-3 px-4 py-3'
              } ${
                value === String(opt.v)
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border hover:border-primary/40 text-foreground'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={String(opt.v)}
                checked={value === String(opt.v)}
                onChange={() => onChange(String(opt.v))}
                className="accent-primary"
              />
              <span className="min-w-0 break-words">{opt.l}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === 'select' && !displaySelectAsRadioCards && question.options && (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">— Choisissez —</option>
          {question.options.map(opt => (
            <option key={opt.v} value={String(opt.v)}>{opt.l}</option>
          ))}
        </select>
      )}
      {question.type === 'number' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={question.min}
            max={question.max}
            step={question.step ?? 1}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-32 px-3 py-2 border border-border rounded-lg text-sm bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {question.unit && <span className="text-sm text-muted-foreground">{question.unit}</span>}
          {question.min !== undefined && question.max !== undefined && (
            <span className="text-xs text-muted-foreground/70">({question.min}–{question.max})</span>
          )}
        </div>
      )}
    </fieldset>
  );
}
