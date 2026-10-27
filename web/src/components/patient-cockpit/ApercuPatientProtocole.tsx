'use client';

import type { ContenuPatientProtocole } from '@/lib/clinical-engine/contenuPatientProtocole';
import {
  TEXTE_PAUSE_AVIS_RENDU,
  TEXTE_PAUSE_COMPLEMENTS,
  TEXTE_PAUSE_ELEMENT,
  type ElementEnPause,
} from '@/lib/trust/pauseEffetIndesirable';
import type { TroisPlansAction } from '@/lib/portail/troisPlans';
import { CHAPEAU_TROIS_PLANS, INTITULES_TROIS_PLANS } from '@/lib/portail/texteTroisPlans';

// CE QUE LE PATIENT LIRA, MONTRÉ AU PRATICIEN AVANT QU'IL NE DIFFUSE.
//
// LE CONTENU N'EST PAS RECOMPOSÉ ICI. Il arrive déjà projeté par le contrat
// (`contenuPatientProtocole.ts`) : ce composant ne choisit ni les champs, ni
// leur filtrage, ni la phrase d'attente d'une intervention non ferme. C'est le
// défaut que [[D-200]] a nommé — un aperçu construit à la main depuis
// `ProtocolDraft` ignorait `interventionStatus`, et une intervention suspendue
// s'y lisait comme un conseil ferme.
//
// LES INTITULÉS SONT CEUX DE L'ÉCRAN PATIENT (`PatientCompanionHome`), à la
// lettre : un aperçu dont les titres diffèrent n'est plus un aperçu. Le rendu,
// lui, est celui du cockpit — c'est une relecture praticien, pas une
// simulation du portail.
//
// `limitations` N'EST PAS RENDU, et c'est volontaire : aucun écran patient ne
// le rend aujourd'hui (dette 4 de [[D-200]], toujours ouverte). L'afficher ici
// montrerait au praticien un texte que son patient ne verra pas — l'inverse du
// service rendu.
//
// LES PAUSES SUR EFFET INDÉSIRABLE ([[D-281]] §2-4) se marquent comme sur
// l'écran patient : « En pause » et le texte SIGNÉ de l'élément, celui des
// compléments une fois au-dessus des actions. Vides avant la signature.
//
// LES TROIS PLANS ([[D-384]] §2, [[D-386]]) : ceux que la route sert, par la
// règle du portail — drapeau, version créée sous la garde étendue, action
// ferme hors pause. Une action absente de la liste garde son plan minimal seul.

export function ApercuPatientProtocole({
  contenu,
  pauses = [],
  troisPlans = [],
}: {
  contenu: ContenuPatientProtocole;
  pauses?: readonly ElementEnPause[];
  troisPlans?: readonly TroisPlansAction[];
}) {
  const pauseDe = new Map(pauses.map(pause => [pause.actionId, pause.texte]));
  const plansDe = new Map(troisPlans.map(plans => [plans.actionId, plans]));
  const complementsEnPause = [...pauseDe.values()].includes('complements');
  return (
    <div className="grid gap-3 rounded-lg bg-muted p-4 text-base">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Vu par votre patient
      </p>
      <p>
        <span className="font-medium">Ce qu’on travaille :</span> {contenu.priorityLabel}
      </p>
      <p>{contenu.purpose}</p>
      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {contenu.actions.length > 1 ? 'Ses actions' : 'Son action'}
        </p>
        {complementsEnPause && (
          <p className="rounded-lg border border-border bg-surface p-3">{TEXTE_PAUSE_COMPLEMENTS}</p>
        )}
        {contenu.actions.map(action => (
          <div key={action.actionId} className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium">{action.title}</p>
            {pauseDe.has(action.actionId) && (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide">En pause</p>
            )}
            {/* Défense en profondeur, comme au portail : une action en attente
                ou en pause garde son plan minimal seul ([[D-384]] §3). */}
            <PlansDeLAction
              plans={action.interventionStatus || pauseDe.has(action.actionId) ? undefined : plansDe.get(action.actionId)}
              minimalPlan={action.minimalPlan}
            />
            {pauseDe.get(action.actionId) === 'element' && (
              <p className="mt-2 border-t border-border pt-2">{TEXTE_PAUSE_ELEMENT}</p>
            )}
            {pauseDe.get(action.actionId) === 'avis_rendu' && (
              <p className="mt-2 border-t border-border pt-2">{TEXTE_PAUSE_AVIS_RENDU}</p>
            )}
            {/* UNE INTERVENTION NON FERME NE SE LIT JAMAIS COMME UN CONSEIL.
                La phrase vient du contrat, jamais de la cible d'attente du
                praticien (`D-056`, arbitrage 5). */}
            {action.attente && (
              <p className="mt-2 border-t border-border pt-2 text-foreground/80">{action.attente}</p>
            )}
          </div>
        ))}
      </div>
      <p>
        <span className="font-medium">Ce qu’on regardera ensemble à trois semaines :</span>{' '}
        {contenu.followUpCriterion}
      </p>
      {contenu.adviceSheetRef && (
        <p>
          <span className="font-medium">Fiche conseil :</span> {contenu.adviceSheetRef}
        </p>
      )}
    </div>
  );
}

/**
 * Le plan minimal seul, ou « Selon votre journée : » puis les trois plans sous
 * les intitulés du portail, dans l'ordre de [[D-384]] §2.
 */
function PlansDeLAction({ plans, minimalPlan }: { plans: TroisPlansAction | undefined; minimalPlan: string }) {
  if (!plans) return <p className="mt-1">{minimalPlan}</p>;
  const lignes = [
    ['idealPlan', plans.idealPlan],
    ['minimalPlan', minimalPlan],
    ['rescuePlan', plans.rescuePlan],
  ] as const;
  return (
    <div className="mt-1 grid gap-1">
      <p>{CHAPEAU_TROIS_PLANS}</p>
      <dl className="grid gap-1">
        {lignes.map(([cle, texte]) => (
          <div key={cle}>
            <dt className="font-medium">{INTITULES_TROIS_PLANS[cle]}</dt>
            <dd>{texte}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
