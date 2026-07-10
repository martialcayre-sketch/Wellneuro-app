'use client';

import { useEffect, useState } from 'react';
import type { PatientEquilibreResponse } from '@/app/api/patient/equilibre/route';
import { ScoreGauge } from '@/components/ui/ScoreGauge';

const TENDANCE_LABEL: Record<string, string> = {
  hausse: 'En hausse depuis votre dernier bilan',
  stable: 'Stable depuis votre dernier bilan',
  baisse: 'En baisse depuis votre dernier bilan',
};

function Frise({ trajectoire }: { trajectoire: { date: string; valeur: number }[] }) {
  if (trajectoire.length < 2) return null;
  const max = Math.max(...trajectoire.map(t => t.valeur), 1);
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Votre trajectoire</p>
      <div className="flex items-end gap-2 h-16 px-1">
        {trajectoire.map((t, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full max-w-[10px] rounded-full bg-accent"
              style={{ height: `${Math.max(8, (t.valeur / max) * 48)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
        <span>Début</span>
        <span>Aujourd&apos;hui</span>
      </div>
    </div>
  );
}

export function MonEquilibreAccueil({
  idAssignation,
  email,
  onVoirDetail,
  onRetour,
}: {
  idAssignation: string;
  email?: string;
  onVoirDetail: () => void;
  onRetour: () => void;
}) {
  const [data, setData] = useState<PatientEquilibreResponse | null>(null);
  const [loading, setLoading] = useState(true);

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
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center text-sm text-gray-500">
          Chargement de Mon équilibre…
        </div>
      </div>
    );
  }

  if (!data || 'ok' in data) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center">
          <p className="text-sm text-gray-600">
            {data && 'error' in data ? data.error : 'Impossible de charger Mon équilibre pour le moment.'}
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

  const { indiceGlobal, momentum, besoins } = data;
  const priorites = besoins
    .filter(b => b.couverture !== null)
    .sort((a, b) => (a.couverture ?? 0) - (b.couverture ?? 0))
    .slice(0, 3);

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">Mon équilibre</h1>

        <div className="flex justify-center mb-4">
          {indiceGlobal !== null ? (
            <ScoreGauge value={indiceGlobal} label="Mon équilibre" />
          ) : (
            <p className="text-sm text-gray-500 text-center py-6">
              Pas encore assez de réponses pour calculer votre indice.
            </p>
          )}
        </div>

        {momentum && (
          <p className="text-sm text-primary bg-primary/10 rounded-lg px-4 py-2 text-center mb-4">
            {TENDANCE_LABEL[momentum.tendance]}
          </p>
        )}

        <Frise trajectoire={data.trajectoire} />

        {priorites.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vos priorités</p>
            <ul className="space-y-1.5">
              {priorites.map(p => (
                <li key={p.id} className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                  {p.libellePatient}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onVoirDetail}
          className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity mb-3"
        >
          Voir le détail de mes 12 besoins
        </button>
        <button
          type="button"
          onClick={onRetour}
          className="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          ← Retour
        </button>
      </div>
    </div>
  );
}
