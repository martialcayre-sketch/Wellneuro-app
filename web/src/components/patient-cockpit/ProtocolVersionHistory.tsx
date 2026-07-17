'use client';

// Historique des versions persistées d'un protocole (C2A LOT-03). Lecture seule :
// affiche le fil append-only et signale sans ambiguïté la version active. Aucune
// donnée de contenu n'est exposée ici (seulement statut et horodatages).

export type ProtocolVersionItem = {
  versionId: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  inputHash: string;
  isActive: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  practitioner_reviewed: 'Relu par le praticien',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ProtocolVersionHistory({ versions }: { versions: ProtocolVersionItem[] }) {
  if (versions.length === 0) return null;

  return (
    <section aria-labelledby="protocol-history-title" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="protocol-history-title" className="text-sm font-semibold text-foreground">
        Historique des versions ({versions.length})
      </h3>
      <ul className="mt-3 grid gap-2">
        {versions.map((version) => (
          <li
            key={version.versionId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {STATUS_LABELS[version.status] ?? version.status}
              </span>
              {version.isActive && (
                <span className="rounded-full border border-primary px-2 py-0.5 text-xs text-primary">
                  Version active
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {version.reviewedAt
                ? `Relu le ${formatDate(version.reviewedAt)}`
                : `Créé le ${formatDate(version.createdAt)}`}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Chaque enregistrement crée une version ; les anciennes sont conservées. Non transmis au patient.
      </p>
    </section>
  );
}
