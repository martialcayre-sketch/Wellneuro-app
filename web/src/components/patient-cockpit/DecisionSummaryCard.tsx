'use client';

import type { DecisionCard } from '@/lib/clinical-engine/types';
import { TwoLevelReading } from '@/components/ui/TwoLevelReading';

export function DecisionSummaryCard({ decisionCard }: { decisionCard: DecisionCard | null }) {
  if (!decisionCard) {
    return (
      <section aria-labelledby="decision-summary-title">
        <h3 id="decision-summary-title" className="text-xs font-semibold text-solar-ink uppercase tracking-[.06em] mb-3">
          Décision clinique
        </h3>
        {/* Carte de décision 5.0 : liseré primaire (maquette cible). */}
        <div className="rounded-xl border border-border border-l-4 border-l-primary bg-surface p-4 shadow-card">
          <p className="text-base font-semibold text-foreground">Décision clinique non préparée</p>
          <p className="mt-1 text-base text-muted-foreground">
            Les données doivent être qualifiées et la décision validée par le praticien avant toute recommandation.
          </p>
        </div>
      </section>
    );
  }

  const proposed = decisionCard.priorityCandidates.find(
    candidate => candidate.candidateId === decisionCard.proposedMainPriorityId
  );
  const selected = decisionCard.priorityCandidates.find(
    candidate => candidate.candidateId === decisionCard.selectedMainPriority?.candidateId
  );
  const current = selected ?? proposed ?? null;
  // LE MOTIF DU BLOCAGE EST NOMMÉ, PAS SEULEMENT LE BLOCAGE ([[D-099]], C1 de
  // la revue). Deux motifs d'abstention existent et ils appellent des gestes
  // opposés : un signal d'alerte déclaré appelle un adressage médical, un canal
  // de plainte non mesurable appelle une passation. Les afficher tous deux comme
  // « revue praticien requise » laissait le praticien sans le fait décisif —
  // c'est `DC-34`/`DC-35` (une abstention doit être explicable) qui l'exige.
  //
  // DÉRIVÉ D'UN FAIT DÉJÀ PORTÉ PAR LA CARTE (`safetyFindingIds`), jamais
  // recalculé : ce composant ne rejuge rien, il lit.
  const bloqueParSecurite = decisionCard.safetyFindingIds.length > 0;
  const status = decisionCard.abstention.status === 'required'
    ? bloqueParSecurite
      ? 'Décision suspendue — signal d’alerte déclaré, avis médical à évaluer en priorité'
      : 'Décision suspendue — revue praticien requise'
    : current ? current.label : 'Aucune priorité proposée';

  return (
    <section aria-labelledby="decision-summary-title">
      <h3 id="decision-summary-title" className="text-xs font-semibold text-solar-ink uppercase tracking-[.06em] mb-3">
        Décision clinique
      </h3>
      <TwoLevelReading
        label="Voir les sources et limites"
        className="border-l-4 border-l-primary shadow-card"
        summary={(
          <div>
            <p className="text-base font-semibold">{status}</p>
            {current && <p className="mt-1 font-mono text-xs text-muted-foreground">Statut : {current.confidence}</p>}
          </div>
        )}
        detail={(
          <div className="space-y-3">
            {current && <p>{current.rationale}</p>}
            <p className="text-muted-foreground">
              {decisionCard.priorityCandidates.length} candidat(s), {decisionCard.counterfactuals.length} contre-factuel(s).
            </p>
            {/* LES LIMITATIONS D'ABSTENTION SONT SERVIES ICI AUSSI ([[D-099]]).
                Elles étaient calculées, entraient dans l'empreinte de la carte
                et arrivaient au navigateur — sans qu'aucun composant les rende.
                Or ce sont elles, et elles seules, qui portent le motif signé du
                blocage (`ABST-SEC-01` : « Au moins un constat de sécurité est
                présent… » ; `ABST-CAN-01` : le canal de plainte). Les textes
                affichés sont des DONNÉES SIGNÉES, couvertes par
                `PRIORITY_RULES_SHA256` — patron [[D-062]] —, jamais des
                littéraux de composant. Dédupliqué : `decisionCard.limitations`
                reprend déjà celles de la revue. */}
            {[...new Set([...decisionCard.abstention.limitations, ...decisionCard.limitations])].length > 0 && (
              <ul className="list-disc pl-5 text-muted-foreground">
                {[...new Set([...decisionCard.abstention.limitations, ...decisionCard.limitations])]
                  .map(limitation => <li key={limitation}>{limitation}</li>)}
              </ul>
            )}
          </div>
        )}
      />
    </section>
  );
}
