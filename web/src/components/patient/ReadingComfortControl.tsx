'use client';

import { useEffect, useState } from 'react';

// Confort de lecture (HC-F LOT-04, Étape 7) : 3 réglages discrets, locaux et
// non cliniques (localStorage uniquement, jamais envoyés au serveur). Le
// portail reste pleinement utilisable si ce composant échoue à charger ou si
// localStorage est indisponible (mode privé) — les valeurs par défaut
// reproduisent exactement le rendu actuel, sans régression.
export type ComfortPrefs = {
  texteAgrandi: boolean;
  espacementRenforce: boolean;
  animationsReduites: boolean;
};

const DEFAULT_PREFS: ComfortPrefs = {
  texteAgrandi: false,
  espacementRenforce: false,
  animationsReduites: false,
};

const STORAGE_KEY = 'wellneuro:portail:confort';

function readPrefs(): ComfortPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ComfortPrefs> | null;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PREFS;
    return {
      texteAgrandi: Boolean(parsed.texteAgrandi),
      espacementRenforce: Boolean(parsed.espacementRenforce),
      animationsReduites: Boolean(parsed.animationsReduites),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: ComfortPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* mode privé / quota : préférence non persistée, sans impact fonctionnel */
  }
}

// Posé sur <html> (et non <body>) car les unités `rem` de Tailwind sont
// relatives à la taille de police de l'élément racine.
function appliquer(prefs: ComfortPrefs): void {
  const root = document.documentElement;
  if (prefs.texteAgrandi) root.dataset.readingComfort = 'large';
  else delete root.dataset.readingComfort;
  if (prefs.espacementRenforce) root.dataset.readingSpacing = 'relaxed';
  else delete root.dataset.readingSpacing;
  if (prefs.animationsReduites) root.dataset.readingMotion = 'reduced';
  else delete root.dataset.readingMotion;
}

function nettoyer(): void {
  const root = document.documentElement;
  delete root.dataset.readingComfort;
  delete root.dataset.readingSpacing;
  delete root.dataset.readingMotion;
}

export function ReadingComfortControl() {
  const [prefs, setPrefs] = useState<ComfortPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  // Lu après montage (pas de localStorage côté serveur) ; nettoyé au
  // démontage pour ne jamais laisser une préférence patient fuiter vers
  // d'autres routes (ex. dashboard praticien) si l'utilisateur navigue dans
  // le même onglet sans rechargement complet.
  useEffect(() => {
    setPrefs(readPrefs());
    setHydrated(true);
    return nettoyer;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    appliquer(prefs);
    writePrefs(prefs);
  }, [prefs, hydrated]);

  const toggle = (key: keyof ComfortPrefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  return (
    <details className="relative">
      <summary className="min-h-11 inline-flex items-center list-none cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground rounded-lg border border-border px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
        Confort de lecture
      </summary>
      <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-surface shadow-lg p-4 space-y-3 z-40">
        <label className="flex items-center justify-between gap-3 text-sm text-foreground cursor-pointer">
          Texte agrandi
          <input type="checkbox" checked={prefs.texteAgrandi} onChange={() => toggle('texteAgrandi')} className="accent-primary" />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-foreground cursor-pointer">
          Espacement renforcé
          <input type="checkbox" checked={prefs.espacementRenforce} onChange={() => toggle('espacementRenforce')} className="accent-primary" />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-foreground cursor-pointer">
          Réduire les animations
          <input type="checkbox" checked={prefs.animationsReduites} onChange={() => toggle('animationsReduites')} className="accent-primary" />
        </label>
      </div>
    </details>
  );
}
