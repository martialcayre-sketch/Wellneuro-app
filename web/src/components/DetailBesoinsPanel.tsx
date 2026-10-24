'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { BesoinDetail, BesoinsApiResponse } from '@/app/api/praticien/besoins/route';
import { ScoreRadar } from '@/components/ui/ScoreRadar';
import { donneesRadarBesoins } from '@/components/ui/scoreRadarPoints';
import { DetailMotifNonMesure } from '@/components/patient-cockpit/DetailMotifNonMesure';
import { mentionBesoinsMesures } from '@/lib/equilibre/natureIndiceGlobal';

// `enteteMasquee` : le panneau est monté dans un onglet in-fiche du poste de
// pilotage, qui porte déjà l'identité du patient et le retour — l'en-tête
// dupliqué est alors masqué. Route pleine page inchangée par défaut.
// `emailPatient` : celui du patient affiché, passé par la fiche — il ouvre
// « Compléter la mesure » dans le motif ([[D-352]] §2) ; absent, le motif seul.
export function DetailBesoinsPanel({
  idPatient,
  enteteMasquee = false,
  emailPatient,
}: {
  idPatient: string;
  enteteMasquee?: boolean;
  emailPatient?: string;
}) {
  const [data, setData] = useState<BesoinsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(() => {
    setLoading(true);
    fetch(`/api/praticien/besoins?idPatient=${encodeURIComponent(idPatient)}`)
      .then(r => r.json())
      .then((d: BesoinsApiResponse) => setData(d))
      .catch(() => setData({ unavailable: true, reason: 'exception' }))
      .finally(() => setLoading(false));
  }, [idPatient]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (loading) {
    return <div className="text-base text-muted-foreground">Chargement du détail des besoins...</div>;
  }

  if (!data || 'unavailable' in data) {
    const reason = data && 'unavailable' in data ? data.reason : 'exception';
    const message =
      reason === 'patient_not_found'
        ? 'Patient introuvable.'
        : reason === 'unauthenticated'
          ? 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.'
          : null;
    if (message) {
      return <div className="bg-muted border border-border rounded-xl p-4 text-base text-muted-foreground">{message}</div>;
    }
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 bg-muted border border-border rounded-xl p-4 text-base text-muted-foreground">
        <span className="min-w-0">Le détail des besoins n’a pas pu être lu.</span>
        <button
          type="button"
          onClick={charger}
          className="ml-auto min-h-9 shrink-0 rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const { patient, besoins, besoinsMesures, besoinsTotal } = data;
  // Un besoin non mesuré n'est pas tracé à zéro : son axe reste, nommé « non
  // mesuré » ([[D-301]]).
  const radarData = donneesRadarBesoins(besoins);

  return (
    <div className="flex flex-col gap-6">
      {!enteteMasquee && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">{`${patient.prenom} ${patient.nom}`.trim()}</h2>
            <p className="text-base text-muted-foreground mt-1">Détail des 12 besoins</p>
          </div>
          <Link
            href={`/dashboard/patients/${encodeURIComponent(idPatient)}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            ← Retour à la fiche patient
          </Link>
        </div>
      )}

      {/* En tête de l'onglet, le compte tel que la route l'a établi ([[D-352]]
          §1). Un ancien conteneur, pendant un déploiement, ne le sert pas :
          rien plutôt qu'un compte deviné. */}
      {typeof besoinsMesures === 'number' && typeof besoinsTotal === 'number' && (
        <p className="text-sm text-muted-foreground">{mentionBesoinsMesures(besoinsMesures, besoinsTotal)}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScoreRadar data={radarData} />

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Besoin</th>
                <th className="px-4 py-2 text-left">Couverture</th>
              </tr>
            </thead>
            <tbody>
              {besoins.map((b: BesoinDetail) => (
                // Le pourquoi d'un non mesuré n'est plus une infobulle : il se
                // déplie sous le tiret, d'un geste (r3_08). L'infobulle ne garde
                // que les titres des sources lues.
                <tr key={b.id} className="border-t border-border" title={b.sources.map(s => s.titre).join(', ') || undefined}>
                  <td className="px-4 py-2">{b.libellePraticien}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {b.couverture !== null ? (
                      `${b.couverture}%`
                    ) : (
                      <>
                        —
                        {b.motifNonMesure && b.motifNonMesure.length > 0 && (
                          <DetailMotifNonMesure
                            besoin={b.libellePraticien}
                            motifs={b.motifNonMesure}
                            emailPatient={emailPatient}
                          />
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
