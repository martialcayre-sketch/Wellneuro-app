'use client';

import { useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { FoodObservationJourney } from './FoodObservationJourney';
import {
  JA5_VALIDATION_DAILY_QUESTION,
  JA5_VALIDATION_EPISODE,
  JA5_VALIDATION_PATIENT,
  JA5_VALIDATION_SILENCE_EPISODE,
} from './ja5ValidationFixture';

type Mode = 'patient' | 'papier';
type Scenario = 'essai' | 'silence';

export function ValidationJaHarness() {
  const [mode, setMode] = useState<Mode>('patient');
  const [scenario, setScenario] = useState<Scenario>('essai');
  const episode = scenario === 'essai' ? JA5_VALIDATION_EPISODE : JA5_VALIDATION_SILENCE_EPISODE;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <header className="w-full rounded-2xl border border-primary/20 bg-primary/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Harnais local JA5-02</p>
          <h1 className="mt-1 text-2xl font-semibold">Ma spirale alimentaire</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Fixture fictive : {JA5_VALIDATION_PATIENT.displayName}. Les saisies restent en mémoire et
            disparaissent au rechargement. Aucun envoi ni enregistrement n’est effectué.
          </p>
        </header>

        <nav className="flex w-full flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Scénarios du harnais">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Mode de saisie">
            <PatientButton variant={mode === 'patient' ? 'primary' : 'ghost'} onClick={() => setMode('patient')}>
              Parcours patient
            </PatientButton>
            <PatientButton variant={mode === 'papier' ? 'primary' : 'ghost'} onClick={() => setMode('papier')}>
              Saisie carte papier
            </PatientButton>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Régime de l'épisode">
            <PatientButton variant={scenario === 'essai' ? 'neutral' : 'ghost'} onClick={() => setScenario('essai')}>
              Régime essai
            </PatientButton>
            <PatientButton variant={scenario === 'silence' ? 'neutral' : 'ghost'} onClick={() => setScenario('silence')}>
              Régime silence
            </PatientButton>
          </div>
        </nav>

        <FoodObservationJourney
          key={`${mode}-${scenario}`}
          episode={episode}
          question={JA5_VALIDATION_DAILY_QUESTION}
          mode={mode}
        />
      </div>
    </main>
  );
}
