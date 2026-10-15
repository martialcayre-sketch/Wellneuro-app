'use client';

import { useState } from 'react';
import type { ValidationEffetIndesirable as Validation } from '@/app/api/praticien/trust/route';
import type { VerdictResponse } from '@/app/api/praticien/trust/verdict/route';
import { Button } from '@/components/ui/Button';
import {
  AMENAGEMENTS,
  type Amenagement,
  LIBELLE_AMENAGEMENT,
  LIBELLE_VERDICT,
} from '@/lib/trust/verdictEffetIndesirable';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
const formatHorodatage = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const LIBELLE_RATTACHEMENT = {
  ne_sait_pas: 'Le patient ne sait pas à quel élément associer cet effet.',
  autre_produit: 'Le patient associe cet effet à un autre produit (traité comme « Je ne sais pas »).',
} as const;

/** Le formulaire d'avant : « oui » au programme, sans élément désigné (D-281 §5). */
const LIBELLE_FORMULAIRE_AVANT =
  'Le patient associe cet effet à son programme, sans désigner d’élément (formulaire d’avant).';

/**
 * L'avis du praticien sur un signalement rattaché, ou du formulaire d'avant
 * ([[D-281]] §5, étape 4) : l'élément désigné par le patient, la chaîne des
 * avis, et le formulaire qui rend ou corrige l'avis. Seul l'avis lève
 * l'attente — jamais le statut de traitement.
 */
export function ValidationEffetIndesirable({
  reportId,
  validation,
  debutPriseLe,
  debutSymptomesLe,
  pauseServie,
  onEnregistre,
}: {
  reportId: string;
  validation: Validation;
  debutPriseLe: string | null;
  debutSymptomesLe: string | null;
  pauseServie: boolean;
  onEnregistre: () => Promise<void>;
}) {
  const designeParPatient = validation.rattachement === 'element';
  const formulaireAvant = validation.rattachement === null;
  const titreDe = (actionId: string | null) =>
    (actionId && validation.elements?.find(e => e.actionId === actionId)?.title)
    ?? (actionId && validation.elementDesigne?.actionId === actionId ? validation.elementDesigne.title : null)
    ?? 'Élément sans intitulé lisible';
  const courant = validation.verdicts.find(v => v.id === validation.verdictCourantId) ?? null;
  const corriges = validation.verdicts.filter(v => v.id !== validation.verdictCourantId);

  const [verdict, setVerdict] = useState<'implique' | 'non_implique' | ''>('');
  const [elementActionId, setElementActionId] = useState('');
  const [amenagement, setAmenagement] = useState<Amenagement | ''>('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const elementsChoisissables = validation.elements ?? [];
  const impliqueImpossible = !designeParPatient && elementsChoisissables.length === 0;

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch('/api/praticien/trust/verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          verdict,
          ...(verdict === 'implique'
            ? { amenagement, ...(designeParPatient ? {} : { elementActionId }) }
            : {}),
          supersedesVerdictId: validation.verdictCourantId,
        }),
      });
      const corps = (await res.json()) as VerdictResponse;
      if (!corps.ok) {
        setErreur(corps.error);
        return;
      }
      setVerdict('');
      setElementActionId('');
      setAmenagement('');
      await onEnregistre();
    } catch {
      setErreur('Erreur réseau. Réessayez.');
    } finally {
      setEnvoi(false);
    }
  };

  const pret = verdict === 'non_implique'
    || (verdict === 'implique' && amenagement !== '' && (designeParPatient || elementActionId !== ''));

  return (
    <section className="mt-3 rounded-lg border border-border bg-muted/40 p-3" aria-label="Avis sur l’implication">
      <p className="text-sm text-foreground">
        {designeParPatient
          ? <>Élément désigné par le patient : <strong>{titreDe(validation.elementDesigne?.actionId ?? null)}</strong></>
          : formulaireAvant
            ? LIBELLE_FORMULAIRE_AVANT
            : LIBELLE_RATTACHEMENT[validation.rattachement as keyof typeof LIBELLE_RATTACHEMENT]}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Début de la prise : {debutPriseLe ? formatDate(debutPriseLe) : 'non renseigné'}
        {' · '}Début des symptômes : {debutSymptomesLe ? formatDate(debutSymptomesLe) : 'non renseigné'}
      </p>

      <p className="text-sm text-foreground mt-2">
        {courant
          ? <>
            Avis en vigueur : <strong>{LIBELLE_VERDICT[courant.verdict]}</strong>
            {courant.verdict === 'implique' && <>
              {' — '}{titreDe(courant.elementActionId)}, aménagement : {LIBELLE_AMENAGEMENT[courant.amenagement as Amenagement] ?? courant.amenagement}
            </>}
            <span className="text-xs text-muted-foreground"> (rendu le {formatHorodatage(courant.renduLe)} par {courant.renduPar})</span>
          </>
          : <strong>En attente de votre avis.</strong>}
      </p>
      {corriges.length > 0 && (
        <details className="mt-1">
          <summary className="text-xs text-muted-foreground cursor-pointer">Avis corrigés ({corriges.length})</summary>
          <ul className="mt-1 flex flex-col gap-1">
            {corriges.map(v => (
              <li key={v.id} className="text-xs text-muted-foreground">
                {LIBELLE_VERDICT[v.verdict]}
                {v.verdict === 'implique' && <> — {titreDe(v.elementActionId)}, {LIBELLE_AMENAGEMENT[v.amenagement as Amenagement] ?? v.amenagement}</>}
                {' '}(rendu le {formatHorodatage(v.renduLe)} par {v.renduPar})
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        {!pauseServie
          ? 'La règle amendée n’est pas encore signée : rien n’est mis en pause au portail pour l’instant. Votre avis est enregistré dès maintenant.'
          : formulaireAvant
            ? 'Aucun élément n’étant désigné, rien n’est mis en pause au portail. Seul votre avis met fin à l’attente : aucun programme ne se diffuse avant. Le statut de traitement ne lève rien.'
            : 'Seul votre avis met fin à l’attente : « non impliqué » lève la pause au portail, « impliqué » la maintient. Le statut de traitement ne lève rien.'}
      </p>

      <form onSubmit={e => void enregistrer(e)} className="mt-3 flex flex-col gap-2">
        <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
          <legend className="text-xs text-muted-foreground mb-1">{courant ? 'Corriger l’avis' : 'Votre avis'}</legend>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name={`verdict-${reportId}`}
              value="implique"
              checked={verdict === 'implique'}
              disabled={impliqueImpossible}
              onChange={() => setVerdict('implique')}
            />
            {designeParPatient ? 'Impliqué' : 'Un élément du programme est en cause'}
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name={`verdict-${reportId}`}
              value="non_implique"
              checked={verdict === 'non_implique'}
              onChange={() => setVerdict('non_implique')}
            />
            {designeParPatient ? 'Non impliqué' : 'Aucun élément du programme n’est en cause'}
          </label>
        </fieldset>
        {impliqueImpossible && (
          <p className="text-xs text-muted-foreground">
            {validation.elements === null
              ? 'Le programme visé ne se lit pas : aucun élément ne peut être désigné.'
              : 'Le programme visé ne contient aucun élément désignable.'}
          </p>
        )}

        {verdict === 'implique' && !designeParPatient && (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Élément en cause
            <select
              value={elementActionId}
              onChange={e => setElementActionId(e.target.value)}
              className="text-sm rounded-lg border border-border bg-surface px-2 py-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">Choisir…</option>
              {elementsChoisissables.map(e => (
                <option key={e.actionId} value={e.actionId}>{e.title}</option>
              ))}
            </select>
          </label>
        )}

        {verdict === 'implique' && (
          <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
            <legend className="text-xs text-muted-foreground mb-1">
              Aménagement — l’élément ne repart jamais à l’identique ni augmenté
            </legend>
            {AMENAGEMENTS.map(a => (
              <label key={a} className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name={`amenagement-${reportId}`}
                  value={a}
                  checked={amenagement === a}
                  onChange={() => setAmenagement(a)}
                />
                {LIBELLE_AMENAGEMENT[a]}
              </label>
            ))}
          </fieldset>
        )}

        {erreur && <p role="alert" className="text-xs text-status-danger">{erreur}</p>}
        <div>
          <Button type="submit" disabled={!pret || envoi}>
            {envoi ? 'Enregistrement…' : courant ? 'Enregistrer la correction' : 'Enregistrer l’avis'}
          </Button>
        </div>
      </form>
    </section>
  );
}
