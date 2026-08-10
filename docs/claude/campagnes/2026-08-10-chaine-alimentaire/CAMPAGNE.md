---
id: "2026-08-10-chaine-alimentaire"
titre: "La chaîne alimentaire reliée — de l'agenda au protocole suivi"
statut: "en cours (2026-08-10)"
créée_le: "2026-08-10"
mise_à_jour: "2026-08-10"
lot_courant: "LOT-00"
branche_campagne: "aucune"
branche_lot_courant: "claude/post-pr-631-5rmwr7"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# La chaîne alimentaire reliée — de l'agenda au protocole suivi

## Objectif

Chaque maillon de la chaîne alimentaire existe ; **aucun n'est soudé au
suivant**. Cette campagne relie : le patient déclare (questionnaires Q_ALI) →
observe (agenda 21 jours) → le moteur propose (parcours alimentaire) → le
praticien décide (protocole) → le patient essaie et adhère (carnet/spirale) →
la trajectoire mesure (jalons Mon Équilibre). L'état des lieux complet, ancré
`chemin:ligne`, est dans `NOTE_CADRAGE.md` (2026-08-10) — la campagne ne le
recopie pas, elle l'exécute.

## Résultat observable

1. Une clôture de recueil d'agenda produit une `QuestionnaireReponse`
   standard (`scored:false`) : l'agenda devient visible de la fiche, de la
   synthèse IA et de tout lecteur du dossier — sans aucun barème.
2. La discordance rythme déclaré (`Q_ALI_01`/`RYTHME_CHRONO`) vs observé
   (agenda) existe comme objet restitué, `null` (jamais 0) sous la forme
   courte.
3. Un barème d'indice agenda existe — **seulement après** la porte des
   21 jours et sur distribution réelle.
4. Un moteur de propositions de parcours alimentaire propose, claims tracés,
   et la proposition peut nourrir une synthèse IA puis un protocole praticien
   dont l'adhésion se suit au carnet.
5. Le rayon des fiches conseils est cadré (pas nécessairement livré).

## Contraintes non négociables

- Aucun secret en dur ; textes UI en français ; patients fictifs seulement
  (Sophie Nicola, Jennifer Martin, Michel Dogné).
- **Porte des 21 jours** : aucun barème agenda avant un recueil suffisant —
  posée par `2026-08-04-agenda-alimentaire/CAMPAGNE.md:123,151`. Le recueil
  est à l'arrêt (2 journées, 1 assignation) : la relance est **humaine**,
  aucun lot ne peut la faire.
- **D-034** : aucune revendication psychométrique ; l'agenda reste niveau de
  preuve D, longitudinal, jamais diagnostique.
- **D-033** : tout raisonnement sur `Q_ALI_09` doit être vrai dans les deux
  positions de `WN_AGENDA_ALI` (et de `WN_ALI_01_SIIN57` pour la discordance).
- **Une migration et le code qui en dépend ne voyagent pas dans la même PR**
  — concerne le LOT-03 (objet parcours persisté).
- Toute modification clinique = décision D-xxx préalable + fragment
  `changelog.d/`. Chaque lot passe par le mode Plan avant édition.

## Décisions prises

- **D-039 (2026-08-10, décision utilisateur)** : la clôture de l'agenda
  transmet **tous les agrégats calculés** du domaine (`AgregatsAgendaAli`),
  avec leurs dénominateurs de couverture — sans poids ni seuil. Aucune
  sélection : le tri clinique appartient au barème (LOT-02), sur données
  réelles. Écartés : le sous-ensemble resserré (la curation est déjà un
  jugement clinique) ; différer (l'agenda resterait invisible du dossier).
- Hypothèses tranchées au cadrage (2026-08-10) : le rayon fiches conseils est
  un **nouveau** rayon, distinct de `supplement-library/rayonCorpus.ts` et de
  C3 ; le moteur de scoring agenda reste **déterministe, non IA** ; la
  synthèse IA de parcours **réutilise le pipeline existant** (bump de
  `VERSION_PROMPT_SYNTHESE`).

## Questions ouvertes

- **Dégel de JA5-05** (campagne `2026-07-13-journal-alimentaire-21j-v1`,
  figé depuis le 2026-07-17) : l'aval du LOT-03 — l'activation complète du
  carnet — en dépend. Arbitrage utilisateur, hors périmètre des lots.
- **Relance du recueil agenda** : action humaine (pilote PAT006 ou patients
  réels) ; sans elle le LOT-02 reste une interface.
- Chaque règle du LOT-03 exigera un claim sourcé et sa décision clinique —
  la liste des règles candidates n'est pas encore arbitrée.

## Dépendances

- `2026-08-04-agenda-alimentaire` (parallèle) : porte le recueil et le
  RUNBOOK d'allumage ; cette campagne n'y touche pas — elle consomme.
- `2026-07-13-journal-alimentaire-21j-v1` : JA5-05 figé, en attente
  d'arbitrage — l'aval adhésion du LOT-03.
- `2026-07-11-boussole-alimentaire-slice-v1` (terminée) : C5 fournit les
  assiettes recommandées consommées par la revue praticien du carnet.
- Précédent architectural : `agenda-sommeil/cloture.ts` (LOT-00) et
  `clinical/orientationEngine.ts` + `orientationRulesV1.ts` (LOT-03).

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Clôture technique de l'agenda alimentaire (D-039) — agrégats → `rawAnswers` → `QuestionnaireReponse` `scored:false`, calquée sur le jumeau sommeil | à faire | — |
| LOT-01 | Discordance rythme déclaré vs observé — objet restitué, `null` sous forme courte | à faire (décision clinique préalable) | LOT-00 |
| LOT-02 | Barème et indice agenda (gabarit scorer `agenda_sommeil`) | gaté — porte des 21 jours + recueil réel | LOT-00 |
| LOT-03 | Moteur de propositions de parcours alimentaire — règles claims-tracées, objet parcours (migration séparée), bloc de synthèse dédié | à faire (décisions cliniques par règle) | enrichi par LOT-00/01/02 |
| LOT-04 | Rayon fiches conseils — cadrage (nouveau rayon, distinct de C3 et du rayon compléments) | à cadrer | LOT-03 pour la diffusion |

## Done de campagne

À cocher sur preuve relue, jamais sur la prose d'un lot.

- [ ] Une clôture d'agenda produit une `QuestionnaireReponse` lisible en
      fiche et en synthèse, idempotente, prouvée par banc + mutation.
- [ ] La liste des pseudo-items transmis est celle du domaine, vérifiée par
      un garde (aucune curation silencieuse possible).
- [ ] La discordance déclaré/observé rend `null` sous la forme courte,
      prouvé dans les deux positions du drapeau.
- [ ] Aucun barème n'est entré au dépôt avant la porte des 21 jours — le
      LOT-02 ne s'ouvre que sur relecture datée du recueil réel.
- [ ] Chaque règle de proposition livrée porte son claim et sa décision ;
      l'objet parcours a voyagé en PR séparée de sa migration.
- [ ] T2 avant chaque commit UI/API ; anti-secrets ; changelog par fragments.
