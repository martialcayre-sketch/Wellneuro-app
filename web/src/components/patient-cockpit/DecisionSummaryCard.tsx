'use client';

import { useEffect, useId, useRef } from 'react';
import type { DecisionCard } from '@/lib/clinical-engine/types';
import { TwoLevelReading } from '@/components/ui/TwoLevelReading';
import { dateDePassation, passationsDuCandidat } from './passationsDuCandidat';
import { ATTESTATION_CLASSEMENT, PORTEE_ATTESTATION, attestationValide } from '@/lib/clinical/perimetreClassementV1';
import { envoyerMesure } from '@/lib/mesure/envoyerMesure';

export const TITRE_PAR_DEFAUT = 'Priorité et limites';

// « PRIORITÉ ET LIMITES » ET NON « DÉCISION CLINIQUE » : la carte vit DANS la
// phase « Décision 21 j » — le titre y répétait celui de la phase sans rien
// ajouter, entre deux voisins qui, eux, nomment leur contenu (« Plainte et
// objectif du patient », « Contradictions touchant cette décision »). Le titre
// retenu tient AUSSI quand la carte s'abstient : il annonce une rubrique, pas
// un résultat, là où « ce qui est retenu » aurait promis un choix au-dessus
// d'une suspension. « Limites » reprend le mot du dépliant de la carte
// (« Voir les sources et limites »), et jamais « synthèse », qui désigne un
// document du dossier.
export function DecisionSummaryCard({
  decisionCard,
  sourceRefs = [],
  titre = TITRE_PAR_DEFAUT,
  mesurable = false,
}: {
  decisionCard: DecisionCard | null;
  /**
   * Le relevé des passations de l'épisode, qui traduit un `responseId` en
   * instrument et en date. Facultatif et vide par défaut : la carte se rend
   * seule depuis toujours, et une provenance qu'on ne sait pas traduire ne doit
   * pas empêcher de lire la priorité.
   */
  sourceRefs?: readonly { responseId: string; questionnaireId: string; observedAt: string }[];
  /**
   * Titre de la rubrique. La carte se monte désormais DEUX fois — dans la phase
   * « Décision 21 j », où elle est la rubrique elle-même, et à côté du
   * constructeur de protocole, où elle RAPPELLE ce qui vient d'être décidé. Deux
   * nœuds portant le même nom accessible casseraient le mode strict des E2E ;
   * le dépôt a déjà tranché ce cas deux fois en faisant varier le libellé plutôt
   * qu'en dédoublonnant les sélecteurs (`FichePatientPanel.tsx`, bandeaux de
   * fiche). L'`id` du titre, lui, est rendu unique par `useId()`.
   */
  titre?: string;
  /**
   * Ce montage-ci entre-t-il dans le compteur de « Voir les sources et
   * limites » ?
   *
   * FERMÉ PAR DÉFAUT, ET C'EST L'INVARIANT. La carte se monte DEUX fois sur une
   * même page — la rubrique de la phase « Décision 21 j », et le rappel posé à
   * côté du constructeur de protocole — et un troisième site d'affichage
   * viendra. Ouvert par défaut, chaque nouveau montage gonflerait le
   * DÉNOMINATEUR en silence et ferait baisser un taux déjà publié, sans que
   * personne ait décidé quoi que ce soit. Compter est donc un geste explicite.
   *
   * IL EST FAUX EN MODE FIXTURE, et pas seulement pour satisfaire un banc : le
   * harnais de validation ergonomique sert un contenu 100 % fictif « sans portée
   * clinique ». Ses affichages dans le dénominateur mesureraient l'usage d'une
   * page de démonstration.
   */
  mesurable?: boolean;
}) {
  const idTitre = useId();

  // LA MESURE DE LA SURFACE D'EXPLICABILITÉ — et son dénominateur.
  //
  // L'AFFICHAGE PART AU MONTAGE, PAS À CHAQUE RENDU. Sans le garde de `ref`, un
  // re-rendu — un parent qui se met à jour, une sélection praticien qui change —
  // gonflerait le DÉNOMINATEUR et écraserait le taux vers zéro. Le mode strict
  // de React monte deux fois en développement, ce que ce même garde absorbe.
  //
  // IL NE PART PAS QUAND LA CARTE S'ABSTIENT, et la condition est DANS l'effet,
  // pas au-dessus. Le `return` anticipé sur `decisionCard === null` se trouve
  // plus bas — les règles des hooks interdisent de placer un `useEffect` après
  // lui —, si bien qu'un effet non gardé compterait un affichage sur une carte
  // qui ne porte AUCUN panneau à déplier. Le dénominateur inclurait alors des
  // rendus dont le numérateur est structurellement impossible, et le taux
  // baisserait à mesure que des dossiers non préparés s'ouvrent.
  const affichageCompte = useRef(false);
  useEffect(() => {
    if (!mesurable) return;
    if (!decisionCard) return;
    if (affichageCompte.current) return;
    affichageCompte.current = true;
    envoyerMesure('affichage');
  }, [mesurable, decisionCard]);

  if (!decisionCard) {
    return (
      <section aria-labelledby={idTitre}>
        <h3 id={idTitre} className="text-xs font-semibold text-solar-ink uppercase tracking-[.06em] mb-3">
          {titre}
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
  const passations = current
    ? passationsDuCandidat({ responseIds: current.provenance.responseIds, sourceRefs })
    : [];
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
  const duMoteur = toutes.filter((texte) => !signees.has(texte));

  // CE QUE L'ATTESTATION A CHANGÉ À L'ÉCRAN, et par quel chemin.
  //
  // Les textes du périmètre sont RELUS ; les afficher sous « hors périmètre
  // signé » ferait SOUS-promettre sur du relu. Mais `duMoteur` est un MÉLANGE —
  // il porte aussi le motif de la gate de population, que personne n'a relu —
  // et une seule étiquette sur les deux mentirait dans un sens ou dans l'autre.
  //
  // LE GROUPEMENT SE FAIT SUR LA PROVENANCE DÉCLARÉE PAR LE PRODUCTEUR, JAMAIS
  // SUR LE LIBELLÉ. Une première rédaction comparait les chaînes à
  // `LIMITATIONS_CANDIDAT` : un motif de gate portant le même libellé qu'un
  // texte attesté s'affichait alors « relu » — un comportement que personne n'a
  // relu héritant de la provenance attestée, sans qu'aucun sha ne bouge.
  // Relevé en contre-expertise, et le contrat de `limitationsRegleSignee`
  // l'interdisait DÉJÀ : « la deviner par comparaison de chaînes ferait dépendre
  // une garde de provenance d'une égalité de ponctuation ».
  //
  // L'ÉCRAN LIT L'ATTESTATION, il ne recopie pas son résultat : retirée, ces
  // textes retombent d'eux-mêmes dans le groupe non relu.
  //
  // LA VALIDITÉ SE DEMANDE AU PÉRIMÈTRE, ELLE NE SE DEVINE PAS SUR `relu`.
  // Cet écran lisait le seul booléen : un `shaRelu` PÉRIMÉ — celui d'un
  // périmètre antérieur — ou une date nulle présentaient les limitations comme
  // relues. Relevé en contre-expertise, et le banc de cet écran en donnait
  // lui-même la preuve : il injectait `shaRelu: 'simulé'` et attendait
  // « relus ». `attestationValide` pose les trois questions ensemble, au même
  // endroit que le banc de garde — deux rédactions de la même règle divergent
  // toujours ([[DC-26]]).
  const duPerimetre = new Set(
    attestationValide(ATTESTATION_CLASSEMENT) ? (current?.limitationsPerimetreClassement ?? []) : [],
  );
  const limitationsRelues = duMoteur.filter((texte) => duPerimetre.has(texte));
  const limitationsMoteur = duMoteur.filter((texte) => !duPerimetre.has(texte));

  return (
    <section aria-labelledby={idTitre}>
      <h3 id={idTitre} className="text-xs font-semibold text-solar-ink uppercase tracking-[.06em] mb-3">
        {titre}
      </h3>
      <TwoLevelReading
        label="Voir les sources et limites"
        onOuverture={mesurable ? () => envoyerMesure('ouverture') : undefined}
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
            {/* LES PASSATIONS QUI FONDENT LE CANDIDAT — `DC-34` (« quelles
                données patient ») et `DC-01` (la chaîne observation →
                instrument fait partie de ce qui valide la sortie).
                `provenance.responseIds` était calculée, validée contre le
                snapshot, hachée et servie au navigateur sur chaque candidat, et
                rendue par aucun composant.

                LE TITRE DIT « CE CANDIDAT », PAS « CET ARGUMENT ». Le candidat
                porte un `rationale` monolithique et un jeu de `responseIds`
                dédupliqué : il n'existe pas de provenance par argument côté
                déterministe, et en suggérer une serait un maillon faux. */}
            {current && passations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[.06em]">
                  Passations qui fondent ce candidat
                </p>
                <ul className="mt-1 space-y-0.5 font-mono text-xs text-muted-foreground">
                  {passations.map((passation) => (
                    <li key={passation.responseId}>
                      {passation.idQuestionnaire && passation.observeLe
                        ? `${passation.idQuestionnaire} · ${dateDePassation(passation.observeLe)}`
                        : 'Source non retrouvée au relevé de l’épisode'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
            {limitationsRelues.length > 0 && (
              <>
                {/* RELU, ET DATÉ. La date n'est pas décorative : elle dit de
                    QUAND date la relecture, donc ce qu'elle a pu couvrir. Un
                    « relu » sans date laisserait croire à une garantie
                    permanente. */}
                <p className="mt-2 text-xs font-medium text-foreground">
                  {PORTEE_ATTESTATION.intituleEcran} <span className="font-normal text-muted-foreground">(relu le {ATTESTATION_CLASSEMENT.dateRelecture})</span>
                </p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {limitationsRelues.map(limitation => <li key={limitation}>{limitation}</li>)}
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
