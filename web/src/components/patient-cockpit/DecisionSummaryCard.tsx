'use client';

import type { DecisionCard } from '@/lib/clinical-engine/types';
import { TwoLevelReading } from '@/components/ui/TwoLevelReading';

// « PRIORITÉ ET LIMITES » ET NON « DÉCISION CLINIQUE » : la carte vit DANS la
// phase « Décision 21 j » — le titre y répétait celui de la phase sans rien
// ajouter, entre deux voisins qui, eux, nomment leur contenu (« Plainte et
// objectif du patient », « Contradictions touchant cette décision »). Le titre
// retenu tient AUSSI quand la carte s'abstient : il annonce une rubrique, pas
// un résultat, là où « ce qui est retenu » aurait promis un choix au-dessus
// d'une suspension. « Limites » reprend le mot du dépliant de la carte
// (« Voir les sources et limites »), et jamais « synthèse », qui désigne un
// document du dossier.
export function DecisionSummaryCard({ decisionCard }: { decisionCard: DecisionCard | null }) {
  if (!decisionCard) {
    return (
      <section aria-labelledby="decision-summary-title">
        <h3 id="decision-summary-title" className="text-xs font-semibold text-solar-ink uppercase tracking-[.06em] mb-3">
          Priorité et limites
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
  // DEUX GROUPES, PAR PROVENANCE — arbitrage du responsable, 2026-09-10, sur le
  // bilan descriptif du classement (2026-09-09).
  //
  // Une seule liste dédoublonnée mêlait ce que la RÈGLE RELUE dit et ce que le
  // MOTEUR ajoute, sans que rien ne les distingue. Or `PRIORITY_RULES_SHA256`
  // porte sur `PRIORITY_RULES_V1` et `ABSTENTION_PROCEDURE_V1` — pas sur
  // `lib/clinical-engine`, où vivent le producteur de candidats, les quatre
  // textes `LIMITATION_*` et le motif de la gate de population. Le praticien
  // lisait donc du relu et du non relu dans la même liste.
  //
  // AUCUN BADGE, AUCUN TAMPON : deux intitulés qui disent l'ORIGINE, rien de
  // plus. Marquer le premier groupe comme « certifié » sur-promettrait une
  // couverture que le SHA n'accorde pas au reste de la chaîne.
  //
  // FAIL-SAFE : le groupe signé est une liste EXPLICITE — les limitations de la
  // règle déclenchée, et le cadre d'abstention, tous deux dans le périmètre
  // haché. Tout texte qu'on ne sait pas rattacher tombe dans l'autre groupe,
  // c'est-à-dire qu'on SOUS-promet plutôt que l'inverse.
  const signees = new Set([
    ...decisionCard.abstention.limitations,
    ...(current?.limitationsRegleSignee ?? []),
  ]);
  const toutes = [...new Set([
    ...decisionCard.abstention.limitations,
    ...decisionCard.limitations,
    ...(current?.limitations ?? []),
  ])];
  const limitationsRegle = toutes.filter((texte) => signees.has(texte));
  const limitationsMoteur = toutes.filter((texte) => !signees.has(texte));

  return (
    <section aria-labelledby="decision-summary-title">
      <h3 id="decision-summary-title" className="text-xs font-semibold text-solar-ink uppercase tracking-[.06em] mb-3">
        Priorité et limites
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
            {/* LES LIMITATIONS DU CANDIDAT AFFICHÉ ENTRENT DANS LA MÊME LISTE
                ([[D-101]], LOT-05). Elles étaient dans le même cas que celles
                de l'abstention avant le LOT-04 : calculées, hachées dans la
                carte, envoyées au navigateur, rendues par personne —
                `buildDecisionCard` n'agrège PAS les limitations des candidats
                dans `decisionCard.limitations`, il les laisse sur chaque
                candidat. C'est par là que passe le motif de la gate de
                population, et notamment « exclusions non curées » : sans cette
                ligne, un axe dont personne n'a jamais vérifié la population
                s'afficherait exactement comme un axe vérifié (`DC-35`). */}
            {limitationsRegle.length > 0 && (
              <>
                <p className="mt-2 text-xs font-medium text-foreground">Limitations de la règle</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {limitationsRegle.map(limitation => <li key={limitation}>{limitation}</li>)}
                </ul>
              </>
            )}
            {limitationsMoteur.length > 0 && (
              <>
                {/* L'INTITULÉ DIT L'ESSENTIEL, et il est factuel : ces textes
                    ne sont couverts par aucune ligne signée. Le bilan
                    descriptif du 2026-09-09 en dresse la liste — producteur de
                    candidats, classement à trois termes, quatre textes
                    `LIMITATION_*`, motifs de la gate. Les taire ferait passer
                    l'ensemble pour relu. */}
                <p className="mt-2 text-xs font-medium text-foreground">
                  Ajoutées par le moteur <span className="font-normal text-muted-foreground">(hors périmètre signé)</span>
                </p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {limitationsMoteur.map(limitation => <li key={limitation}>{limitation}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
      />
    </section>
  );
}
