'use client';

import { useEffect, useState } from 'react';
import type { PatientEquilibreResponse } from '@/app/api/patient/equilibre/route';
import { CerclesConcentriques } from '@/components/ui/CerclesConcentriques';

/* Couleurs d'entité fixes du trio (tokens --viz-*, révision A5-R1) —
 * l'identité est toujours doublée par le libellé texte à côté du point. */
const LEGENDE_STRATE: { strate: string; label: string; couleur: string }[] = [
  { strate: 'CORPS', label: 'Corps', couleur: 'var(--viz-corps)' },
  { strate: 'ANCRAGE', label: 'Ancrage', couleur: 'var(--viz-ancrage)' },
  { strate: 'ESPRIT', label: 'Esprit', couleur: 'var(--viz-esprit)' },
];

// Équivalent texte de la couverture : le cercle ne la porte que par l'opacité
// de sa couleur, qui n'est ni lisible au clavier ni par un lecteur d'écran.
function libelleCouverture(couverture: number | null): string {
  if (couverture === null) return 'Pas encore de données';
  if (couverture >= 70) return 'Bien couvert';
  if (couverture >= 40) return 'Couverture partielle';
  return 'Peu couvert';
}

export function MonEquilibreDetail({
  idAssignation,
  email,
  onRetour,
}: {
  idAssignation: string;
  email?: string;
  onRetour: () => void;
}) {
  const [data, setData] = useState<PatientEquilibreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    const emailQuery = email ? `&email=${encodeURIComponent(email)}` : '';
    fetch(`/api/patient/equilibre?id=${encodeURIComponent(idAssignation)}${emailQuery}`)
      .then(r => r.json())
      .then((d: PatientEquilibreResponse) => setData(d))
      .catch(() => setData({ ok: false, reason: 'exception', error: 'Erreur réseau.' }))
      .finally(() => setLoading(false));
  }, [idAssignation, email]);

  if (loading) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-8 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      </div>
    );
  }

  if (!data || 'ok' in data) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {data && 'error' in data ? data.error : 'Impossible de charger le détail pour le moment.'}
          </p>
          <button
            type="button"
            onClick={onRetour}
            className="w-full mt-6 py-2.5 px-4 border border-primary text-primary rounded-lg font-medium text-sm hover:bg-primary/10 transition-colors"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  const besoinSurvole = data.besoins.find(b => b.id === hoveredId);

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-surface rounded-2xl shadow-sm border border-border p-8">
        <h1 className="font-display text-xl font-bold text-foreground mb-1 text-center">Mes 12 besoins</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Sélectionnez ou survolez un besoin pour le mettre en évidence.
        </p>

        <CerclesConcentriques
          besoins={data.besoins.map(b => ({ id: b.id, libelle: b.libellePatient, strate: b.strate, couverture: b.couverture }))}
          hoveredId={hoveredId}
          onHoverBesoin={setHoveredId}
        />

        <div className="flex justify-center gap-4 mt-3 mb-6">
          {LEGENDE_STRATE.map(s => (
            <span key={s.strate} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.couleur }} />
              {s.label}
            </span>
          ))}
        </div>

        <ul className="space-y-1.5 mb-6">
          {data.besoins.map(b => (
            <li key={b.id}>
              <button
                type="button"
                onMouseEnter={() => setHoveredId(b.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(b.id)}
                onBlur={() => setHoveredId(null)}
                className={`w-full min-h-11 flex items-center justify-between gap-3 text-left text-sm rounded-lg px-3 py-2 transition-colors ${
                  hoveredId === b.id ? 'bg-primary/10 text-primary font-medium' : 'bg-muted text-foreground'
                }`}
              >
                <span>{b.libellePatient}</span>
                <span className="text-xs text-muted-foreground">{libelleCouverture(b.couverture)}</span>
              </button>
            </li>
          ))}
        </ul>

        {besoinSurvole && (
          <p className="text-sm text-primary bg-primary/10 rounded-lg px-4 py-2 text-center mb-4">
            {besoinSurvole.libellePatient}
          </p>
        )}

        <button
          type="button"
          onClick={onRetour}
          className="w-full py-2.5 px-4 border border-border text-foreground rounded-lg font-medium text-sm hover:bg-muted transition-colors"
        >
          ← Retour à Mon équilibre
        </button>
      </div>
    </div>
  );
}
