// Repère de parcours global du portail patient (HC-F LOT-04, Étape 3 —
// amendé par SP-CONV LOT-04 le 2026-07-23) : consentement → informations →
// situation/anamnèse → questionnaires → analyse du praticien → restitution.
// Purement présentationnel — l'état de chaque étape est dérivé par l'écran
// appelant. Les étapes 5/6 vivent désormais : le hub les pilote via
// `deriverEtatParcoursPatient` (lib/trajectoire-partagee), à partir des seuls
// signaux que le portail sert déjà (statut de consultation, protocole
// diffusé, booklet envoyé — D11). Leur libellé ne promet toujours aucun
// délai, et une étape terminée est annoncée telle quelle aux lecteurs
// d'écran, pas seulement l'étape courante.
export type JourneyStepState = 'done' | 'current' | 'upcoming';

export type JourneyStep = {
  id: 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  state: JourneyStepState;
};

export const JOURNEY_LABELS: Record<JourneyStep['id'], string> = {
  1: 'Consentement',
  2: 'Informations',
  3: 'Situation',
  4: 'Questionnaires',
  5: 'Analyse du praticien',
  6: 'Restitution',
};

// Construit les 6 étapes à partir de l'étape courante uniquement : tout ce qui
// précède est "done", l'étape courante est "current", le reste "upcoming".
// Les étapes 5/6 (côté praticien) ne sont donc jamais marquées autrement
// qu'"upcoming" tant que l'écran appelant ne passe pas currentId >= 5 — ce qui
// n'arrive jamais aujourd'hui, faute de signal serveur fiable pour ces
// étapes (cf. Étape 3 du brief LOT-04 : pas de délai promis).
export function buildJourneySteps(currentId: JourneyStep['id']): JourneyStep[] {
  return ([1, 2, 3, 4, 5, 6] as const).map(id => ({
    id,
    label: JOURNEY_LABELS[id],
    state: id < currentId ? 'done' : id === currentId ? 'current' : 'upcoming',
  }));
}

// Anatomie journey de la maquette cible : puce 14 px au-dessus du libellé,
// étape courante en accent avec halo cuivré, barres de liaison 2 px. Le halo
// n'est jamais seul porteur : le libellé passe en semibold + sr-only.
const STATE_CLASSES: Record<JourneyStepState, { dot: string; label: string }> = {
  done: { dot: 'bg-primary', label: 'text-foreground' },
  current: {
    dot: 'bg-accent shadow-[0_0_0_4px_rgba(178,94,56,.18)]',
    label: 'text-foreground font-semibold',
  },
  upcoming: { dot: 'border border-border bg-muted', label: 'text-muted-foreground/70' },
};

export function PatientJourneyProgress({ steps }: { steps: JourneyStep[] }) {
  return (
    <ol className="flex items-start overflow-x-auto pb-1 -mx-1 px-1" aria-label="Étapes de votre parcours">
      {steps.map((step, index) => {
        const classes = STATE_CLASSES[step.state];
        return (
          <li key={step.id} className="flex shrink-0 items-start">
            <span className="flex min-w-0 flex-col items-center gap-1.5">
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full ${classes.dot}`}
                aria-hidden="true"
              />
              <span className={`whitespace-nowrap px-1 text-2xs ${classes.label}`}>
                {step.label}
                {step.state === 'current' && <span className="sr-only"> (étape actuelle)</span>}
                {step.state === 'done' && <span className="sr-only"> (terminée)</span>}
              </span>
            </span>
            {index < steps.length - 1 && (
              <span className="mt-[6px] h-0.5 w-4 shrink-0 bg-border sm:w-6" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
