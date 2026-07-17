'use client';

// Validation « pour diffusion » d'une version relue (C2A LOT-03 Part B). La
// validation est persistée et ancrée sur la version : elle devient caduque dès
// qu'une nouvelle version est enregistrée. Elle ne déclenche AUCUN envoi patient
// (« Non transmis » reste affiché) — la transmission relève d'un lot ultérieur.

export type DiffusionState = 'idle' | 'saving' | 'error';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ProtocolDiffusionPanel({
  canApprove,
  approved,
  stale,
  approvedAt,
  state = 'idle',
  error = null,
  onApprove,
}: {
  // Une version relue existe et peut être validée pour diffusion.
  canApprove: boolean;
  // Une approbation active existe.
  approved: boolean;
  // L'approbation active n'ancre plus la version active (une nouvelle version a
  // été enregistrée depuis).
  stale: boolean;
  approvedAt: string | null;
  state?: DiffusionState;
  error?: string | null;
  onApprove?: () => void;
}) {
  return (
    <section aria-labelledby="protocol-diffusion-title" className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="protocol-diffusion-title" className="text-sm font-semibold text-foreground">
          Validation pour diffusion
        </h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
            {approved && !stale ? 'Validé pour diffusion' : 'Non validé pour diffusion'}
          </span>
          <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
            Non transmis
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm">
        {approved && stale ? (
          <span className="text-orange-800">
            Une nouvelle version a été enregistrée : la validation précédente est caduque. Re-validez la version active.
          </span>
        ) : approved && approvedAt ? (
          <span className="text-foreground">
            Version active validée pour diffusion le {formatDate(approvedAt)} — non transmise au patient.
          </span>
        ) : canApprove ? (
          <span className="text-muted-foreground">
            La version active est relue. Vous pouvez la valider pour diffusion (aucun envoi automatique).
          </span>
        ) : (
          <span className="text-muted-foreground">
            Aucune version relue à valider pour l’instant.
          </span>
        )}
      </p>

      {state === 'error' && (
        <p role="alert" className="mt-2 text-sm text-red-700">{error ?? 'Échec de la validation.'}</p>
      )}

      {onApprove && (canApprove || stale) && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onApprove}
            disabled={state === 'saving'}
            className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {approved && stale ? 'Re-valider pour diffusion' : 'Valider pour diffusion'}
          </button>
        </div>
      )}
    </section>
  );
}
