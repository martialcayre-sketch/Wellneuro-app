'use client';

import type { Question } from '@/lib/questionnaire-types';

// Champ de question (likert / select / number). Composant présentationnel pur.
export function QuestionField({ question, value, onChange, displaySelectAsRadioCards = false }: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  displaySelectAsRadioCards?: boolean;
}) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium text-foreground">{question.texte}</legend>
      {(question.type === 'likert' || (question.type === 'select' && displaySelectAsRadioCards)) && question.options && (
        <div className="grid gap-2">
          {question.options.map(opt => (
            <label
              key={opt.v}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors text-sm ${
                value === String(opt.v)
                  ? 'border-primary bg-primary/10 text-primary'
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
