'use client';

import type { ContenuPatientProtocole } from '@/lib/clinical-engine/contenuPatientProtocole';

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

export function ApercuPatientProtocole({ contenu }: { contenu: ContenuPatientProtocole }) {
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
        {contenu.actions.map(action => (
          <div key={action.actionId} className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium">{action.title}</p>
            <p className="mt-1">{action.minimalPlan}</p>
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
