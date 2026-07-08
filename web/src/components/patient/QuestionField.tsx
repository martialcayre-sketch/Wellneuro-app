'use client';

import type { Question } from '@/lib/questionnaire-types';

// Champ de question (likert / select / number). Composant présentationnel pur.
export function QuestionField({ question, value, onChange }: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800">{question.texte}</p>
      {question.type === 'likert' && question.options && (
        <div className="grid gap-2">
          {question.options.map(opt => (
            <label
              key={opt.v}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                value === String(opt.v)
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={String(opt.v)}
                checked={value === String(opt.v)}
                onChange={() => onChange(String(opt.v))}
                className="accent-blue-600"
              />
              <span>{opt.l}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === 'select' && question.options && (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {question.unit && <span className="text-sm text-gray-500">{question.unit}</span>}
          {question.min !== undefined && question.max !== undefined && (
            <span className="text-xs text-gray-400">({question.min}–{question.max})</span>
          )}
        </div>
      )}
    </div>
  );
}
