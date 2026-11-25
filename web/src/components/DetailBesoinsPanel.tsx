'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { BesoinDetail, BesoinsApiResponse } from '@/app/api/praticien/besoins/route';
import { ScoreRadar } from '@/components/ui/ScoreRadar';
import { donneesRadarBesoins, estMesure, LIBELLE_NON_MESURE } from '@/components/ui/scoreRadarPoints';
import { DetailEcartDecision, DetailMotifNonMesure } from '@/components/patient-cockpit/DetailMotifNonMesure';
import { DetailProvenance } from '@/components/patient-cockpit/DetailProvenance';
import { VignetteConstatBesoin } from '@/components/besoins/VignetteConstatBesoin';
import { useVignettesConstats } from '@/components/besoins/useVignettesConstats';
import { MENTION_RADAR_NON_INDICE, mentionBesoinsMesures } from '@/lib/equilibre/natureIndiceGlobal';
import { cleBesoin, grouperBesoinsParStrate } from '@/lib/praticien/ordreBesoins';
import {
  fusionnerProvenances,
  lignesProvenance,
  MENTION_SOURCE_NON_ENREGISTREE,
  provenanceEtablie,
} from '@/lib/praticien/provenanceChiffre';
import { useChiffresMasques, ValeurMasquee } from '@/components/patient-cockpit/ChiffresMasques';
import { useFocusApresRelecture } from '@/components/ui/useFocusApresRelecture';

// `enteteMasquee` : le panneau est monté dans un onglet in-fiche du poste de
// pilotage, qui porte déjà l'identité du patient et le retour — l'en-tête
// dupliqué est alors masqué. Route pleine page inchangée par défaut.
// `emailPatient` : celui du patient affiché, passé par la fiche — il ouvre
// « Compléter la mesure » dans le motif ([[D-352]] §2) ; absent, le motif seul.
// `vignettesActives` : le drapeau `WN_CONSTAT_BESOIN`, lu au serveur par la page
// et passé par la fiche ([[D-551]] §2) ; éteint ou absent, aucune vignette et
// aucune requête.
export function DetailBesoinsPanel({
  idPatient,
  enteteMasquee = false,
  emailPatient,
  vignettesActives = false,
  relectureVignettes = 0,
}: {
  idPatient: string;
  enteteMasquee?: boolean;
  emailPatient?: string;
  vignettesActives?: boolean;
  /** Compteur de la fiche, incrémenté après un geste sur un constat. */
  relectureVignettes?: number;
}) {
  const [data, setData] = useState<BesoinsApiResponse | null>(null);
  // Mode consultation de la fiche ([[D-354]] §2-3) : ni pourcentage, ni contour
  // du radar — le polygone dit les valeurs par sa forme ; ses axes restent.
  // Hors fiche : toujours `false`.
  const chiffresMasques = useChiffresMasques();
  // Le constat du praticien sur un besoin sans score, en vignette ([[D-551]]) :
  // hors du total et du compte, derrière `WN_CONSTAT_BESOIN`.
  const vignettes = useVignettesConstats(idPatient, vignettesActives, relectureVignettes);
  const [loading, setLoading] = useState(true);
  const { titreRef, boutonRef, relire } = useFocusApresRelecture();

  const charger = useCallback(() => {
    setLoading(true);
    return fetch(`/api/praticien/besoins?idPatient=${encodeURIComponent(idPatient)}`)
      .then(async r => {
        const d = (await r.json()) as BesoinsApiResponse;
        // Une réponse au contrat (`unavailable`) garde son motif ; une réponse
        // hors contrat (500 `{error}` d'un autre émetteur) tombe dans l'état
        // d'échec du panneau au lieu de faire tomber la page (PRA-6h2).
        if (d && typeof d === 'object' && 'unavailable' in d) return d;
        if (!r.ok || !d || typeof d !== 'object' || !d.patient || !Array.isArray(d.besoins)) {
          throw new Error('Réponse hors contrat');
        }
        return d;
      })
      .then((d: BesoinsApiResponse) => setData(d))
      .catch(() => setData({ unavailable: true, reason: 'exception' }))
      .finally(() => setLoading(false));
  }, [idPatient]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (loading) {
    return <div role="status" className="text-base text-muted-foreground">Chargement du détail des besoins...</div>;
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
          ref={boutonRef}
          onClick={() => void relire(charger)}
          className="ml-auto min-h-9 shrink-0 rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const { patient, besoinsMesures, besoinsTotal } = data;
  // Ordre fixe, B1 à B12 groupé par strate (Q1, r3_09) — jamais l'ordre reçu,
  // jamais un tri sur la valeur ([[D-333]] §2 règle 4). Le radar suit le même.
  const groupes = grouperBesoinsParStrate(data.besoins, b => b.id);
  const besoins = groupes.flatMap(g => g.besoins);
  // Un besoin non mesuré n'est pas tracé à zéro : son axe reste, nommé « non
  // mesuré » ([[D-301]]). Une valeur sans provenance n'est pas tracée non plus
  // ([[D-333]] §2 règle 1) ; le radar ouvre la provenance des valeurs tracées.
  // Le radar est décoratif (H64, F9a) : le tableau dit tout ce que disent ses
  // axes, et le geste « Source » se nomme sans lui.
  const radarData = donneesRadarBesoins(besoins);
  const provenanceRadar = fusionnerProvenances(besoins.map(b => b.provenance));

  return (
    <div className="flex flex-col gap-6">
      {!enteteMasquee && (
        <div className="flex items-center justify-between">
          <div>
            <h2 ref={titreRef} tabIndex={-1} className="font-display text-3xl font-bold text-foreground">{`${patient.prenom} ${patient.nom}`.trim()}</h2>
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
        <div className="flex flex-col gap-1">
          <ScoreRadar data={radarData} valeursMasquees={chiffresMasques} />
          {chiffresMasques && <ValeurMasquee className="text-center text-sm" />}
          {/* Le radar décrit, besoin par besoin : sa surface n'est pas l'indice
              global ([[D-550]] §2.4). Dite là où une surface est tracée — en
              mode consultation le contour est masqué ([[D-354]] §2). */}
          {!chiffresMasques && radarData.some(d => estMesure(d.value)) && (
            <p className="text-center text-xs text-muted-foreground">{MENTION_RADAR_NON_INDICE}</p>
          )}
          {!chiffresMasques && provenanceRadar && (
            <DetailProvenance objet="ensemble des valeurs du tableau" lignes={lignesProvenance(provenanceRadar)} />
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <caption className="sr-only">Couverture des 12 besoins, de B1 à B12, par strate</caption>
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Besoin</th>
                <th className="px-4 py-2 text-left">Couverture</th>
              </tr>
            </thead>
            {groupes.map(groupe => (
              <tbody key={groupe.code}>
                <tr className="border-t border-border bg-muted/40">
                  <th scope="rowgroup" colSpan={2} className="px-4 py-1.5 text-left text-xs font-semibold text-muted-foreground">
                    {groupe.nom}
                  </th>
                </tr>
                {groupe.besoins.map((b: BesoinDetail) => {
                  const cle = cleBesoin(b.id, b.libellePraticien);
                  return (
                    // Le pourquoi d'un non mesuré n'est plus une infobulle : il se
                    // déplie sous le tiret, d'un geste (r3_08). L'infobulle ne garde
                    // que les titres des sources lues.
                    <tr key={b.id} className="border-t border-border" title={b.sources.map(s => s.titre).join(', ') || undefined}>
                      <td className="px-4 py-2">{cle}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {b.couverture === null ? (
                          <>
                            {/* Le tiret reste à l'écran ([[D-301]] §1) ; le
                                lecteur d'écran lit ce que disait l'axe du radar. */}
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">{LIBELLE_NON_MESURE}</span>
                            {b.motifNonMesure && b.motifNonMesure.length > 0 && (
                              <DetailMotifNonMesure besoin={cle} motifs={b.motifNonMesure} emailPatient={emailPatient} />
                            )}
                            {/* Le constat du praticien, en mots, hors total et hors
                                compte ([[D-551]] §1). */}
                            {vignettes?.[b.id] && <VignetteConstatBesoin besoin={b.id} vignette={vignettes[b.id]} />}
                          </>
                        ) : !provenanceEtablie(b.provenance) ? (
                          /* Sans provenance, pas de chiffre ([[D-333]] §2 règle 1,
                             r3_09) — comme au tiroir. Un ancien conteneur sans le
                             champ : la même mention. */
                          <>
                            {MENTION_SOURCE_NON_ENREGISTREE}
                            <DetailEcartDecision besoin={cle} ecarts={b.ecartDecision} />
                          </>
                        ) : chiffresMasques ? (
                          <>
                            <ValeurMasquee />
                            <DetailEcartDecision besoin={cle} ecarts={b.ecartDecision} />
                          </>
                        ) : (
                          <>
                            {`${b.couverture}%`}
                            <DetailProvenance objet={cle} lignes={lignesProvenance(b.provenance)} aGauche />
                            {/* L'écart avec la décision (r3_10) : un ancien
                                conteneur sans le champ n'affiche rien. */}
                            <DetailEcartDecision besoin={cle} ecarts={b.ecartDecision} />
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </div>
  );
}
