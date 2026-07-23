'use client';

import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type { DomaineModeVie, ModeVieDate } from '@/lib/equilibre/modeVie';

// « Mode de vie — 7 domaines » (SP-TRAJ LOT-02, maquette 5.0 écran
// Fiche-trajectoire) : une ligne par domaine Q_MOD_01 — piste aux zones du
// référentiel en fond, point plein = état à la date lue, point fantôme = T0 du
// cycle, valeur mono `total/max` + badge d'interprétation du moteur. Jamais la
// couleur seule : la zone est toujours écrite (badge texte). Un état sans
// réponse exploitable est « non mesuré », jamais un 0 (A8-2).

const COULEUR_ZONE: Record<string, string> = {
  danger: 'rgb(var(--color-status-danger-rgb) / 0.18)',
  warning: 'rgb(var(--color-status-warning-rgb) / 0.18)',
  success: 'rgb(var(--color-status-success-rgb) / 0.18)',
};

function variantBadge(color: string | undefined): BadgeVariant {
  if (color === 'success' || color === 'warning' || color === 'danger') return color;
  return 'neutral';
}

// Fond de piste : un segment par zone du référentiel, borné au `min` de la
// zone suivante (les grilles SIIN ont des trous — le segment couvre jusqu'à la
// zone d'après, le badge textuel du moteur reste la lecture qui fait foi).
function fondZones(domaine: DomaineModeVie): string {
  if (domaine.zones.length === 0 || domaine.max <= 0) return 'rgb(var(--muted-rgb) / 0.4)';
  const zonesTriees = [...domaine.zones].sort((a, b) => a.min - b.min);
  const segments = zonesTriees.map((zone, i) => {
    const debut = Math.max(0, Math.min(100, (zone.min / domaine.max) * 100));
    const fin =
      i === zonesTriees.length - 1
        ? 100
        : Math.max(0, Math.min(100, (zonesTriees[i + 1].min / domaine.max) * 100));
    const couleur = COULEUR_ZONE[zone.color] ?? COULEUR_ZONE.warning;
    return `${couleur} ${debut}% ${fin}%`;
  });
  return `linear-gradient(90deg, ${segments.join(', ')})`;
}

function positionPourcent(valeur: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (valeur / max) * 100));
}

export function ModeDeViePanel({
  modeVie,
  modeVieT0,
  legendeDate,
  legendeT0,
}: {
  /** État à la date lue — null : non mesuré à cette date. */
  modeVie: ModeVieDate | null;
  /** État au T0 du cycle (point fantôme) — null/absent : pas de fantôme. */
  modeVieT0?: ModeVieDate | null;
  /** Ex. « aujourd'hui » ou « au 12/06/2026 ». */
  legendeDate: string;
  /** Ex. « T0 (12 juin) ». */
  legendeT0?: string;
}) {
  return (
    <section aria-label="Mode de vie — 7 domaines" className="rounded-lg border border-border/60 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">Mode de vie — 7 domaines</h4>
        <span className="text-xs text-muted-foreground">Zones du référentiel Q_MOD_01 · {legendeDate}</span>
      </div>

      {!modeVie ? (
        <p className="mt-2 text-base text-muted-foreground">
          Mode de vie non mesuré à cette date — aucune réponse exploitable au questionnaire de mode de vie.
        </p>
      ) : (
        <>
          <p className="mt-1 text-2xs text-muted-foreground">
            ● {legendeDate}
            {modeVieT0 && legendeT0 ? ` · ○ ${legendeT0}` : ''} · fond : zones du référentiel — la lecture qui fait
            foi est le libellé de zone.
          </p>
          <ul className="mt-2 space-y-2">
            {modeVie.domaines.map((domaine) => {
              const fantome = modeVieT0?.domaines.find((d) => d.id === domaine.id) ?? null;
              return (
                <li key={domaine.id} className="grid grid-cols-[8.5rem,1fr,3.5rem,auto] items-center gap-2">
                  <span className="truncate text-sm text-foreground">{domaine.label}</span>
                  <span
                    aria-hidden="true"
                    className="relative block h-2.5 rounded-full"
                    style={{ background: fondZones(domaine) }}
                  >
                    {fantome && (
                      <span
                        className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/60 bg-surface"
                        style={{ left: `${positionPourcent(fantome.total, fantome.max)}%` }}
                      />
                    )}
                    <span
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
                      style={{ left: `${positionPourcent(domaine.total, domaine.max)}%` }}
                    />
                  </span>
                  <span className="text-right font-mono text-sm text-foreground">
                    {domaine.total}/{domaine.max}
                  </span>
                  {domaine.interpretation ? (
                    <Badge variant={variantBadge(domaine.interpretation.color)}>{domaine.interpretation.label}</Badge>
                  ) : (
                    <Badge variant="neutral">Sans zone</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
