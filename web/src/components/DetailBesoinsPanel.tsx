'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { BesoinDetail, BesoinsApiResponse } from '@/app/api/praticien/besoins/route';
import { ScoreRadar } from '@/components/ui/ScoreRadar';
import { EvidenceBadge } from '@/components/ui/EvidenceBadge';

function LegendeNiveauxPreuve() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span><span className="font-medium text-foreground">A</span> — questionnaire clinique validé</span>
      <span><span className="font-medium text-foreground">B</span> — référentiel neuronutrition</span>
      <span><span className="font-medium text-foreground">C</span> — biologie fonctionnelle interprétative</span>
      <span><span className="font-medium text-foreground">D</span> — hypothèse WellNeuro</span>
    </div>
  );
}

// `enteteMasquee` : le panneau est monté dans un onglet in-fiche du poste de
// pilotage, qui porte déjà l'identité du patient et le retour — l'en-tête
// dupliqué est alors masqué. Route pleine page inchangée par défaut.
export function DetailBesoinsPanel({
  idPatient,
  enteteMasquee = false,
}: {
  idPatient: string;
  enteteMasquee?: boolean;
}) {
  const [data, setData] = useState<BesoinsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/praticien/besoins?idPatient=${encodeURIComponent(idPatient)}`)
      .then(r => r.json())
      .then((d: BesoinsApiResponse) => setData(d))
      .catch(() => setData({ unavailable: true, reason: 'exception' }))
      .finally(() => setLoading(false));
  }, [idPatient]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement du détail des besoins...</div>;
  }

  if (!data || 'unavailable' in data) {
    const reason = data && 'unavailable' in data ? data.reason : 'exception';
    const message =
      reason === 'patient_not_found'
        ? 'Patient introuvable.'
        : reason === 'unauthenticated'
          ? 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.'
          : 'Erreur technique. Vérifiez le terminal Next.js.';
    return <div className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground">{message}</div>;
  }

  const { patient, besoins } = data;
  const radarData = besoins.map(b => ({ axe: `B${b.id}`, value: b.couverture ?? 0 }));

  return (
    <div className="flex flex-col gap-6">
      {!enteteMasquee && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">{`${patient.prenom} ${patient.nom}`.trim()}</h2>
            <p className="text-sm text-muted-foreground mt-1">Détail des 12 besoins</p>
          </div>
          <Link
            href={`/dashboard/patients/${encodeURIComponent(idPatient)}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            ← Retour à la fiche patient
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScoreRadar data={radarData} />

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Besoin</th>
                <th className="px-4 py-2 text-left">Couverture</th>
                <th className="px-4 py-2 text-left">Preuve</th>
              </tr>
            </thead>
            <tbody>
              {besoins.map((b: BesoinDetail) => (
                <tr key={b.id} className="border-t border-border" title={b.sources.map(s => s.titre).join(', ') || 'Aucun questionnaire source'}>
                  <td className="px-4 py-2">{b.libellePraticien}</td>
                  <td className="px-4 py-2 text-muted-foreground">{b.couverture !== null ? `${b.couverture}%` : '—'}</td>
                  <td className="px-4 py-2"><EvidenceBadge niveau={b.niveauPreuve} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border">
            <LegendeNiveauxPreuve />
          </div>
        </div>
      </div>
    </div>
  );
}
