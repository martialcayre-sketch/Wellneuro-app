'use client';

import { useEffect, useRef, useState } from 'react';
import type { PractitionerFoodCompassResponse } from '@/app/api/praticien/boussole/route';
import { C5_PRACTITIONER_FOODS } from '@/lib/food-compass/manifest';
import type { FoodCompassActionRef } from '@/lib/food-compass/types';

const STATUS_LABELS = {
  complete: 'complet', partial_data: 'données partielles', insufficient_data: 'données insuffisantes',
} as const;
const ROLE_LABELS = { required: 'obligatoire', optional: 'facultatif', descriptive: 'descriptif' } as const;
const DIRECTION_LABELS = { favorable: 'favorable', limiting: 'limitant', descriptive: 'descriptif' } as const;

export function PractitionerFoodCompassObservatory({
  idPatient,
  decisionCardId,
  onInsert,
}: {
  idPatient: string;
  decisionCardId: string;
  onInsert: (selection: { foodLabel: string; actionRef: FoodCompassActionRef }) => void;
}) {
  const [foodRef, setFoodRef] = useState<string>(C5_PRACTITIONER_FOODS[0].foodRef);
  const [payload, setPayload] = useState<PractitionerFoodCompassResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestToken = useRef(0);

  useEffect(() => {
    requestToken.current += 1;
    setPayload(null);
    setError(null);
    setLoading(false);
  }, [decisionCardId, idPatient]);

  const changeFood = (nextFoodRef: string) => {
    requestToken.current += 1;
    setFoodRef(nextFoodRef);
    setPayload(null);
    setError(null);
    setLoading(false);
  };

  const inspect = async () => {
    const token = requestToken.current + 1;
    requestToken.current = token;
    setLoading(true); setError(null); setPayload(null);
    try {
      const response = await fetch(
        `/api/praticien/boussole?idPatient=${encodeURIComponent(idPatient)}&decisionCardId=${encodeURIComponent(decisionCardId)}&foodRef=${foodRef}`,
      );
      const data = await response.json() as PractitionerFoodCompassResponse;
      if (requestToken.current !== token) return;
      if (!response.ok || !data.ok) {
        setError(data.ok ? 'Erreur technique.' : data.error);
        return;
      }
      setPayload(data);
    } catch {
      if (requestToken.current === token) {
        setError('Erreur technique lors de la lecture de la Boussole.');
      }
    } finally {
      if (requestToken.current === token) setLoading(false);
    }
  };

  const profile = payload?.ok ? payload.profile : null;
  return (
    <section aria-labelledby="c5-observatory-title" className="rounded-xl border border-slate-800 bg-surface overflow-hidden">
      <div className="border-l-8 border-slate-900 p-4">
        <h3 id="c5-observatory-title" className="font-display text-lg font-semibold text-foreground">Boussole alimentaire — Observatoire</h3>
        <p className="mt-1 text-sm text-muted-foreground">Lecture praticien chiffrée, sourcée et non diffusée automatiquement.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">Aliment vedette
            <select value={foodRef} disabled={loading} onChange={event => changeFood(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-border bg-background px-3 disabled:opacity-50">
              {C5_PRACTITIONER_FOODS.map(food => <option key={food.foodRef} value={food.foodRef}>{food.label}</option>)}
            </select>
          </label>
          <button type="button" onClick={inspect} disabled={loading} className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {loading ? 'Lecture en cours…' : 'Consulter le profil'}
          </button>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        {profile && payload?.ok && (
          <div className="mt-5 grid gap-4">
            <h4 className="font-medium text-foreground">Profil de {profile.foodLabel}</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border px-2 py-1">État : {STATUS_LABELS[profile.status]}</span>
              <span className="rounded-full border border-border px-2 py-1">Complétude : {profile.completenessPct} %</span>
              <span className="rounded-full border border-border px-2 py-1">Agrégat interne : {profile.aggregateScore ?? 'non calculable'} / 100</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <caption className="sr-only">Constituants du profil intrinsèque</caption>
                <thead><tr className="border-b border-border"><th className="p-2 text-left">Constituant</th><th className="p-2 text-left">Valeur</th><th className="p-2 text-left">Alignement</th><th className="p-2 text-left">Direction</th><th className="p-2 text-left">Rôle</th><th className="p-2 text-left">Poids nominal</th></tr></thead>
                <tbody>{profile.components.map(component => (
                  <tr key={component.nutrientCode} className="border-b border-border/60">
                    <td className="p-2">{component.label} <span className="text-muted-foreground">({component.nutrientCode})</span></td>
                    <td className="p-2">{component.value === null ? 'Indisponible' : `${component.value} ${component.unit}`}</td>
                    <td className="p-2">{component.alignment === null ? '—' : component.alignment.toFixed(3)}</td>
                    <td className="p-2">{DIRECTION_LABELS[component.direction]}</td>
                    <td className="p-2">{ROLE_LABELS[component.role]}</td>
                    <td className="p-2">{component.effectiveWeightPct === null
                      ? 'hors agrégat'
                      : component.alignment === null
                        ? `${component.effectiveWeightPct} % — non appliqué`
                        : `${component.effectiveWeightPct} %`}</td>
                  </tr>
                ))}
                  <tr className="border-b border-border/60">
                    <td className="p-2">PRAL <span className="text-muted-foreground">(Remer–Manz)</span></td>
                    <td className="p-2">{profile.pral.valueMeqPer100g === null ? 'Indisponible' : `${profile.pral.valueMeqPer100g} mEq/100 g`}</td>
                    <td className="p-2">{profile.pral.alignment === null ? '—' : profile.pral.alignment.toFixed(3)}</td>
                    <td className="p-2">limitant, inversé</td>
                    <td className="p-2">facultatif</td>
                    <td className="p-2">{profile.pral.alignment === null
                      ? `${profile.pral.effectiveWeightPct} % — non appliqué`
                      : `${profile.pral.effectiveWeightPct} %`}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <dl className="grid gap-1 text-xs text-muted-foreground">
              <div><dt className="inline font-medium text-foreground">Source : </dt><dd className="inline">{profile.sourceRef} — {profile.sourceHash}</dd></div>
              <div><dt className="inline font-medium text-foreground">Versions : </dt><dd className="inline">{profile.contractVersion} · {profile.datasetVersion} · {profile.mappingVersion} · {profile.scoreVersion} · {profile.pralVersion} · {profile.percentileVersion}</dd></div>
              <div><dt className="inline font-medium text-foreground">Manifeste praticien : </dt><dd className="inline">{payload.manifest.version} — {payload.manifest.hash}</dd></div>
              <div><dt className="inline font-medium text-foreground">Catalogue d’assiettes C5B : </dt><dd className="inline">{payload.plateCatalog.version} — {payload.plateCatalog.hash}</dd></div>
            </dl>
            {profile.limitations.length > 0 && <ul className="list-disc pl-5 text-sm text-muted-foreground">{profile.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>}
            {payload.reading && (
              <div className="rounded-lg border border-border bg-background p-3 text-sm">
                <h4 className="font-medium text-foreground">Contexte du protocole ciblé</h4>
                <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <div><dt className="inline font-medium text-foreground">Priorité : </dt><dd className="inline">{payload.reading.selectedPriority.label} ({payload.reading.selectedPriority.priorityId})</dd></div>
                  <div><dt className="inline font-medium text-foreground">Protocole : </dt><dd className="inline">{payload.reading.activeProtocol.protocolDraftId}</dd></div>
                  <div><dt className="inline font-medium text-foreground">Version source : </dt><dd className="inline">{payload.reading.activeProtocol.inputHash}</dd></div>
                </dl>
                {payload.reading.limitations.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                    {payload.reading.limitations.map(limit => <li key={limit}>{limit}</li>)}
                  </ul>
                )}
              </div>
            )}
            {payload.jaFeasibility && (
              <div className="rounded-lg border border-border bg-background p-3 text-sm" data-testid="c5-ja-feasibility">
                <h4 className="font-medium text-foreground">Faisabilité publiée par le Journal alimentaire</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Épisode {payload.jaFeasibility.episodeId}, relu par le praticien le{' '}
                  {new Date(payload.jaFeasibility.validatedAt).toLocaleDateString('fr-FR')}.
                </p>
                <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <div><dt className="inline font-medium text-foreground">Traces déclarées : </dt><dd className="inline">{payload.jaFeasibility.facts.tracesRecorded}</dd></div>
                  <div><dt className="inline font-medium text-foreground">Occasions observées : </dt><dd className="inline">{payload.jaFeasibility.facts.opportunitiesObserved}</dd></div>
                  <div><dt className="inline font-medium text-foreground">Déclarées faisables : </dt><dd className="inline">{payload.jaFeasibility.facts.feasibleDeclarations}</dd></div>
                  <div><dt className="inline font-medium text-foreground">Déclarées adaptées : </dt><dd className="inline">{payload.jaFeasibility.facts.adaptedDeclarations}</dd></div>
                  <div><dt className="inline font-medium text-foreground">Déclarées empêchées : </dt><dd className="inline">{payload.jaFeasibility.facts.blockedDeclarations}</dd></div>
                </dl>
                <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                  {payload.jaFeasibility.limitations.map(limit => <li key={limit}>{limit}</li>)}
                </ul>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Substitutions : aucune famille clinique validée dans {payload.plateCatalog.version} ;
              aucune proposition automatique.
            </p>
            <button
              type="button"
              disabled={!payload.insertionAllowed || !payload.actionRef}
              onClick={() => payload.actionRef && onInsert({ foodLabel: profile.foodLabel, actionRef: payload.actionRef })}
              className="min-h-11 justify-self-start rounded-lg border border-slate-900 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Préparer l’insertion manuelle dans le protocole
            </button>
            {!payload.insertionAllowed && payload.insertionReason && <p className="text-sm text-muted-foreground">{payload.insertionReason}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
