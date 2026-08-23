'use client';

import type { DiscordanceFinding, MissingDataFinding } from '@/lib/clinical-engine/types';
import type { ContradictionAffichee } from '@/lib/clinical/contradictionsService';
import { TwoLevelReading } from '@/components/ui/TwoLevelReading';

const PRIORITY_LABELS = {
  critical_for_decision: 'Critique pour décider',
  useful_not_urgent: 'Utile mais non urgente',
  optional: 'Optionnelle',
} as const;

/**
 * L'intitulé suit la FORME du constat — [[D-103]].
 *
 * « Contradiction entre instruments » était appliqué aux trois formes. Sur un
 * `CONFLIT_SOURCES`, qui oppose deux claims du corpus et ne cite AUCUNE
 * passation, l'étiquette envoyait le praticien chercher deux questionnaires
 * qui n'existent pas. Ce sont des libellés d'écran, pas du contenu clinique :
 * la phrase du déterministe suit, intacte.
 */
const INTITULE_PAR_FORME = {
  DISCORDANCE: 'Contradiction entre instruments',
  CONFLIT_SOURCES: 'Conflit entre sources du corpus',
  CONVERGENCE: 'Convergence entre sources',
} as const;

/**
 * L'état de résolution, en toutes lettres.
 *
 * `escaladee_praticien` ne pouvait PAS s'afficher avant [[D-103]] : le panneau
 * ne disait quelque chose que sur `ouverte`. Un conflit escaladé serait donc
 * apparu sans son état — et l'escalade est précisément ce que `DC-55` demande
 * de rendre visible, puisqu'elle est une issue de la politique et non un échec.
 */
const ETAT_PAR_STATUT = {
  ouverte: 'non résolue',
  escaladee_praticien: 'escaladée — arbitrage praticien attendu',
  resolue: 'résolue',
} as const;

export function MissingDataPanel({
  missingData,
  discordances,
  contradictions = [],
}: {
  missingData: MissingDataFinding[] | null;
  discordances: DiscordanceFinding[] | null;
  /**
   * Constats du moteur DÉTERMINISTE ([[D-048]]), distincts des `discordances`
   * ci-dessus, qui viennent de la revue clinique LLM. Liste vide tant que la
   * table n'est pas signée — le verrou est appliqué en amont, par
   * `contradictionsPourAffichage`, jamais ici.
   */
  contradictions?: ContradictionAffichee[];
}) {
  return (
    <section aria-labelledby="missing-data-title">
      <h3 id="missing-data-title" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Données manquantes
      </h3>
      <div className="flex flex-col gap-3">
        {missingData === null ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
            Données manquantes non évaluées. Une revue clinique doit être préparée par le praticien.
          </div>
        ) : missingData.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
            Aucune donnée manquante qualifiée à ce stade.
          </div>
        ) : missingData.map(finding => (
          <article key={finding.findingId} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">Ce que nous ne savons pas encore</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {finding.priority ? PRIORITY_LABELS[finding.priority] : 'À documenter'}
              </span>
            </div>
            <p className="mt-2 text-base text-foreground">{finding.uncertaintyExplanation}</p>
            <p className="mt-1 text-base text-muted-foreground">{finding.potentialDecisionImpact}</p>
          </article>
        ))}

        {(discordances ?? []).map(finding => (
          <TwoLevelReading
            key={finding.findingId}
            label="Voir le détail"
            summary={<span><span className="font-medium">Signal à explorer :</span> {finding.signal}</span>}
            detail={(
              <div className="space-y-2">
                <p><span className="font-medium">Question à poser :</span> {finding.questionToExplore}</p>
                <p><span className="font-medium">Impact possible :</span> {finding.possibleProtocolImpact}</p>
                <p className="text-muted-foreground">Visible uniquement par le praticien.</p>
              </div>
            )}
          />
        ))}

        {contradictions.map(constat => (
          <TwoLevelReading
            key={constat.id}
            label="Voir le détail"
            summary={<span><span className="font-medium">{INTITULE_PAR_FORME[constat.forme]} :</span> {constat.description}</span>}
            detail={(
              <div className="space-y-2">
                {/* `DC-30`, ACTÉE : l'objet minimal d'une discordance porte son
                    importance et son état de résolution. Le vocabulaire est
                    celui que ce panneau affiche déjà pour les données
                    manquantes — un seul langage de priorité par écran. */}
                <p>
                  <span className="font-medium">Priorité :</span> {PRIORITY_LABELS[constat.importance]}
                  {' — '}{ETAT_PAR_STATUT[constat.resolution.statut]}
                </p>
                {/* LE MOTIF DE L'ESCALADE, quand il y en a un — [[D-103]].
                    C'est là que la politique de résolution rend des comptes :
                    elle nomme les quatre axes qu'elle NE compare pas et
                    pourquoi. Sans lui, le praticien lirait « escaladée » sans
                    savoir ce que la machine a renoncé à faire, et pourrait
                    croire qu'elle a essayé de trancher (`DC-34`, `DC-35`). */}
                {constat.resolution.statut !== 'ouverte' && (
                  <p>
                    <span className="font-medium">Pourquoi la machine ne tranche pas :</span>
                    {' '}{constat.resolution.motif}
                  </p>
                )}
                <p><span className="font-medium">Ce qui est proposé :</span> {constat.actionSuggeree}</p>
                {/* LES PASSATIONS, DATÉES — corrigé après revue. Un delta nu
                    sous un intitulé d'« ancienneté » n'ancre rien : deux
                    passations à 151 jours d'écart peuvent dater toutes deux de
                    l'an dernier, et l'intitulé invitait à décoter le constat
                    par sa vétusté. Nommer les passations rend le constat
                    ouvrable (`DC-34`, `DC-35`) et laisse le praticien juger de
                    l'écart lui-même. */}
                {constat.passations.length > 0 && (
                  <div>
                    <p className="font-medium">
                      Passations confrontées
                      {constat.ecartJours !== null && ` — ${constat.ecartJours} jour${constat.ecartJours > 1 ? 's' : ''} d'écart`}
                    </p>
                    <ul className="list-disc pl-5">
                      {constat.passations.map(p => (
                        <li key={`${p.idQuestionnaire}-${p.dateLisible}-${p.date}`}>
                          {p.idQuestionnaire} — {p.dateLisible}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {constat.hypotheses.length > 0 && (
                  <div>
                    <p className="font-medium">Ce que cela pourrait signifier</p>
                    <ul className="list-disc pl-5">
                      {constat.hypotheses.map(hypothese => <li key={hypothese}>{hypothese}</li>)}
                    </ul>
                  </div>
                )}
                {/* Ce que le constat NE dit pas, jamais replié : `DC-14`,
                    `DC-25`, `DC-28`. */}
                {constat.limitations.length > 0 && (
                  <div>
                    <p className="font-medium">Limites</p>
                    <ul className="list-disc pl-5">
                      {constat.limitations.map(limite => <li key={limite}>{limite}</li>)}
                    </ul>
                  </div>
                )}
                {/* Pourquoi ce constat coexiste avec une suggestion
                    d'instrument portant sur le même axe ([[D-048]], `DC-37`).
                    Sans cette phrase, le praticien voit deux entrées voisines
                    sans savoir qu'elles ne disent pas la même chose. */}
                {constat.recoupementJustifie && (
                  <p className="text-muted-foreground">{constat.recoupementJustifie}</p>
                )}
                {/* Les claims à l'appui : une contradiction sans source n'est
                    pas remontable (`DC-01`, `DC-26`). */}
                {constat.claims.length > 0 && (
                  <p className="text-muted-foreground">
                    Règle {constat.regleId} · sources : {constat.claims.map(c => `${c.claimId} ${c.versionClaim}`).join(', ')}
                  </p>
                )}
                <p className="text-muted-foreground">Visible uniquement par le praticien.</p>
              </div>
            )}
          />
        ))}
      </div>
    </section>
  );
}
