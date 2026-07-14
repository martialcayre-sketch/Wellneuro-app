'use client';

import { useState } from 'react';
import type { DecisionCard, ProtocolAction, ProtocolActionType, TherapeuticLoad } from '@/lib/clinical-engine/types';

const ACTION_LABELS: Record<ProtocolActionType, string> = {
  food: 'Alimentation',
  chronobiology: 'Rythme / chronobiologie',
  calming_routine: 'Routine d’apaisement',
  gentle_activity: 'Activité douce',
  hydration: 'Hydratation',
  advice_sheet: 'Fiche conseil',
  biological_exploration: 'Exploration biologique à discuter',
  supplement_exploration: 'Complément à explorer',
};

const LOAD_LABELS: Record<TherapeuticLoad['level'], string> = {
  light: 'Léger', moderate: 'Modéré', loaded: 'Chargé', excessive: 'Excessif',
};

function emptyAction(actionId: string): ProtocolAction {
  return {
    actionId, type: 'food', title: '', idealPlan: '', minimalPlan: '', rescuePlan: '', limitations: [],
  };
}

export function ProtocolMiniBuilder({ decisionCard }: { decisionCard: DecisionCard | null }) {
  const [purpose, setPurpose] = useState('');
  const [followUpCriterion, setFollowUpCriterion] = useState('');
  const [actions, setActions] = useState<ProtocolAction[]>([]);
  const [loadLevel, setLoadLevel] = useState<TherapeuticLoad['level']>('light');
  const [loadJustification, setLoadJustification] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nextActionId, setNextActionId] = useState(1);

  const decisionBlocked = decisionCard !== null && (
    decisionCard.abstention.status !== 'not_required' || decisionCard.safetyFindingIds.length > 0
  );
  if (!decisionCard?.selectedMainPriority || decisionBlocked) {
    return (
      <section aria-labelledby="protocol-builder-title">
        <h3 id="protocol-builder-title" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Protocole 21 jours
        </h3>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-foreground">
            {decisionBlocked
              ? 'Protocole indisponible — bloqueurs décisionnels à revoir'
              : 'Protocole indisponible — priorité praticien non sélectionnée'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Le protocole restera local et inactif jusqu’à cette sélection.</p>
        </div>
      </section>
    );
  }

  const markDirty = () => {
    if (reviewed) setReviewed(false);
    setMessage(null);
  };

  const addAction = () => {
    if (actions.length >= 3) return;
    markDirty();
    setActions(previous => [...previous, emptyAction(`action-${nextActionId}`)]);
    setNextActionId(value => value + 1);
  };

  const updateAction = (actionId: string, patch: Partial<ProtocolAction>) => {
    markDirty();
    setActions(previous => previous.map(action => action.actionId === actionId ? { ...action, ...patch } : action));
  };

  const removeAction = (actionId: string) => {
    markDirty();
    setActions(previous => previous.filter(action => action.actionId !== actionId));
  };

  const reset = () => {
    const hasContent = purpose || followUpCriterion || actions.length > 0 || loadJustification;
    if (hasContent && !window.confirm('Effacer ce brouillon local non enregistré ?')) return;
    setPurpose(''); setFollowUpCriterion(''); setActions([]); setLoadLevel('light'); setLoadJustification('');
    setReviewed(false); setMessage(null); setNextActionId(1);
  };

  const review = () => {
    const missingActionField = actions.some(action => (
      !action.title.trim() || !action.idealPlan.trim() || !action.minimalPlan.trim() || !action.rescuePlan.trim()
    ));
    if (!purpose.trim() || !followUpCriterion.trim() || actions.length === 0 || missingActionField) {
      setReviewed(false);
      setMessage('Brouillon incomplet : renseignez la raison d’être, le critère J21 et tous les plans d’au moins une action.');
      return;
    }
    if (loadLevel === 'excessive' && !loadJustification.trim()) {
      setReviewed(false);
      setMessage('Une charge excessive exige une justification du praticien.');
      return;
    }
    setReviewed(true);
    setMessage('Brouillon relu par le praticien — non activé et non transmis.');
  };

  return (
    <section aria-labelledby="protocol-builder-title" className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="protocol-builder-title" className="text-sm font-semibold text-foreground">Protocole 21 jours</h3>
          <p className="mt-1 text-xs text-muted-foreground">Brouillon local non enregistré</p>
        </div>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
          {reviewed ? 'Relu par le praticien' : 'Brouillon'}
        </span>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="text-sm font-medium text-foreground">
          Raison d’être
          <textarea aria-label="Raison d’être" value={purpose} onChange={event => { markDirty(); setPurpose(event.target.value); }} className="mt-1 w-full rounded-lg border border-border bg-background p-2 font-normal" />
        </label>
        <label className="text-sm font-medium text-foreground">
          Critère observable à J21
          <input aria-label="Critère observable à J21" value={followUpCriterion} onChange={event => { markDirty(); setFollowUpCriterion(event.target.value); }} className="mt-1 w-full rounded-lg border border-border bg-background p-2 font-normal" />
        </label>

        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">Actions ({actions.length}/3)</span>
            <button type="button" onClick={addAction} disabled={actions.length >= 3} className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50">Ajouter une action</button>
          </div>
          <div className="mt-3 grid gap-3">
            {actions.map((action, index) => (
              <fieldset key={action.actionId} className="rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-medium">Action {index + 1}</legend>
                <div className="grid gap-2">
                  <label className="text-xs">Type
                    <select aria-label={`Type de l’action ${index + 1}`} value={action.type} onChange={event => updateAction(action.actionId, { type: event.target.value as ProtocolActionType })} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm">
                      {Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  {action.type === 'supplement_exploration' && (
                    <p className="text-xs text-muted-foreground">
                      Intention d’exploration uniquement : aucun produit, forme, marque ou dose.
                    </p>
                  )}
                  {(['title', 'idealPlan', 'minimalPlan', 'rescuePlan'] as const).map(field => {
                    const labels = { title: 'Intitulé', idealPlan: 'Plan idéal', minimalPlan: 'Plan minimal', rescuePlan: 'Plan de secours' };
                    return <label key={field} className="text-xs">{labels[field]}<input aria-label={`${labels[field]} de l’action ${index + 1}`} value={action[field]} onChange={event => updateAction(action.actionId, { [field]: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" /></label>;
                  })}
                  <button type="button" onClick={() => removeAction(action.actionId)} className="justify-self-start text-xs text-muted-foreground underline">Supprimer l’action</button>
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        <label className="text-sm font-medium">Charge déclarée par le praticien
          <select aria-label="Charge déclarée par le praticien" value={loadLevel} onChange={event => { markDirty(); setLoadLevel(event.target.value as TherapeuticLoad['level']); }} className="mt-1 w-full rounded-lg border border-border bg-background p-2 font-normal">
            {Object.entries(LOAD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {loadLevel === 'excessive' && <label className="text-sm font-medium">Justification de la charge excessive<input aria-label="Justification de la charge excessive" value={loadJustification} onChange={event => { markDirty(); setLoadJustification(event.target.value); }} className="mt-1 w-full rounded-lg border border-border bg-background p-2 font-normal" /></label>}
        <p className="text-xs text-muted-foreground">Charge : {LOAD_LABELS[loadLevel]} — saisie manuelle, aucun calcul automatique.</p>
      </div>

      {message && <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={review} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Marquer comme relu</button>
        <button type="button" onClick={reset} className="rounded-lg border border-border px-3 py-2 text-sm">Réinitialiser</button>
      </div>
    </section>
  );
}
