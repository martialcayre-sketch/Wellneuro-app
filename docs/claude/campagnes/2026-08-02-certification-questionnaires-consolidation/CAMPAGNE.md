---
id: "2026-08-02-certification-questionnaires-consolidation"
titre: "Certification questionnaires — consolidation 62/64"
statut: "en_cours"
créée_le: "2026-08-02"
mise_à_jour: "2026-08-02"
lot_courant: "LOT-03"
branche_campagne: "campagne/certification-questionnaires-consolidation"
cible_pr_campagne: "main"
---

# Certification questionnaires — consolidation 62/64

## Objectif

Regrouper sur une branche unique l'état réel du développement et de la
certification des questionnaires, puis fermer proprement les branches
historiques sans dupliquer les changements déjà intégrés à `main`.

## État constaté

- Le registre `docs/questionnaires-drive-mapping.md` contient 64 entrées.
- Le dossier de montée en certification
  `docs/claude/propositions/2026-07-29-certification-montee/scoring-et-contenu.md`
  documente un état daté du 2026-07-29 : `verdictScoring` renseigné sur 62
  entrées sur 64.
- `Q_PED_02` et `Q_PED_03` sont les deux exceptions nommées dans
  `docs/claude/propositions/2026-07-29-certification-montee/scoring-et-contenu.md`.
- Le registre canonique actuel
  `docs/claude/corpus/instrument_registry.json` porte désormais un
  `verdictScoring` renseigné sur 64/64, avec `Q_PED_02` et `Q_PED_03` rejoués
  au banc le 2026-08-01.
- `Q_PED_02` est débaptisé : la source Conners enseignant reste soumise à
  licence et ne doit pas donner son identité au questionnaire servi.
- `Q_PED_03` a ensuite été rejoué au banc, puis suspendu par l'arbitrage du
  2026-08-01 consigné dans
  `changelog.d/2026-08-01-certification-ped03-garde-troncature.md` : aucune
  réactivation sans quatre dimensions, deux échelles de validité et des seuils
  sourcés ; la somme brute seule est exclue.
- Les deux définitions sont déjà présentes dans
  `web/src/lib/questionnaires/pediatrie.ts`.

La notation 62/64 décrit la couverture du dossier de certification au
2026-07-29. Elle ne signifie ni que 62 questionnaires sont assignables au
patient, ni que tous ont le même niveau de certification de scoring.

## Branches regroupées

### Contenu déjà intégré ou rendu obsolète par `main`

- `campagne/ali01-source`
- `campagne/conners`
- `campagne/garde-reserve`
- `campagne/lot-ped03-banc`
- `campagne/mfi20-reconstruit`
- `campagne/passation-consultation`
- `campagne/lot0-droits-declares`
- `chore/certification-instruments-montee`
- `chore/campagne-scoring-lot1`
- `docs/session-log-2026-07-29-certification`
- `fix/dossier-certification-plafond-ali01`
- `chore/scoring-lot4-montee`
- `docs/divergences-28-arbitrage`
- `docs/fiches-licence-tierce`
- `fix/banc-golden-scoring`

### Apport résiduel à vérifier avant classement

- `campagne/conners-enseignant-debaptise`
- `campagne/eortc-manuel`
- `campagne/psqi-24-items`
- `campagne/reactivations`
- `corpus/lot4-corrections-scoring`
- `feat/scoring-lot2-seuils`
- `corpus/lot4-conduites-hors-interpretation`
- `corpus/lot4-comparateur-et-arbitrages`
- `worktree-certification-corpus-lots-0-1-7`
- `feat/mini-synthese-par-rubrique`
- `feat/bibliotheque-consolidation`
- `feat/had-entree-de-rayon`
- `fix/moteur-repli-bande-et-zero`
- `fix/ordre-porteurs-extraire-valeur-brute`
- `chore/droits-42-arbitrage`
- `chore/licences-tierces-arbitrage`
- `docs/droits-42-instruments`
- `agent/arbitrages-2026-07-27`
- `corpus/banc-certification-bilan`
- `corpus/droits-instruments-tiers`
- `corpus/instruments-cabinet-notices-droits`

La présence dans cette liste ne vaut ni décision de fusion ni autorisation de
suppression.

`docs/session-log-2026-07-29-certification` est retenue par thème : son seul
diff est le journal de session, volontairement exclu du filtre de contenu pour
éviter de sélectionner presque toutes les branches.

### Verdict LOT-01 (appliqué)

- 20 branches sur 21 sont classées `deja-integre` ou
  `obsolescent-main-en-avance`, avec preuves PR/Git (effet squash-merge
  inclus).
- 1 branche garde un apport non intégré et reste en arbitrage praticien :
  `feat/mini-synthese-par-rubrique` (PR #372 ouverte).
- Conséquence : LOT-02 ne traite plus que cette branche et la consolidation
  canonique 62/64, sans réouverture du reste.

## Résultat observable

- une matrice unique des 36 branches et de leur disposition ;
- aucun cherry-pick de contenu déjà présent sur `main` ;
- une description canonique et non ambiguë de l'état 62/64 ;
- un handoff indiquant les éventuels apports résiduels et les branches pouvant
  être supprimées après confirmation.

## Contraintes non négociables

- Aucun secret ni donnée patient réelle.
- Aucune migration ou écriture Supabase.
- Aucune modification clinique, de scoring ou de seuil sans demande explicite.
- Aucune suppression de branche sans confirmation distincte.
- Changements minimaux et source de vérité limitée à `origin/main`.

## Décisions prises

- La campagne questionnaires reste distincte de la campagne rayon compléments.
- Une seule branche porte les quatre lots :
  `campagne/certification-questionnaires-consolidation`.
- Les branches historiques sont des sources d'audit, pas des bases à fusionner.
- Aucun changement applicatif n'est présumé nécessaire à l'issue de l'audit.
- La matrice `docs/questionnaires-drive-mapping.md` et le registre
  `docs/claude/corpus/instrument_registry.json` couvrent deux axes distincts :
  conformité au dossier Drive d'un côté, statut clinique/certification de
  l'autre.

## Questions ouvertes

- L'apport de `feat/mini-synthese-par-rubrique` doit-il être intégré tel quel,
  amendé, ou clôturé sans merge ?
- Le traitement de la branche `feat/mini-synthese-par-rubrique` doit-il rester
  dans CERT-Q ou être isolé dans un lot dédié de scoring ?

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Inventaire et classification des 36 branches | terminé | — |
| LOT-01 | Revue des 21 apports résiduels possibles | terminé | LOT-00 |
| LOT-02 | Consolidation de l'état canonique 62/64 | terminé | LOT-01 |
| LOT-03 | Validation, matrice finale et handoff | terminé | LOT-02 |

## Done de campagne

- [ ] Le verdict des 21 branches est consolidé et la branche restante est tranchée.
- [x] L'état 62/64 est cohérent dans les sources canoniques.
- [x] Les validations réellement exécutées sont consignées.
- [x] Le nettoyage éventuel des branches est proposé séparément.

## Handoff LOT-03

- Branche en arbitrage : `feat/mini-synthese-par-rubrique` (PR #372 ouverte).
- Nettoyage proposé (confirmation distincte requise) :
  - `campagne/conners-enseignant-debaptise`
  - `campagne/eortc-manuel`
  - `campagne/psqi-24-items`
  - `campagne/reactivations`
  - `corpus/lot4-corrections-scoring`
  - `feat/scoring-lot2-seuils`
  - `corpus/lot4-conduites-hors-interpretation`
  - `corpus/lot4-comparateur-et-arbitrages`
  - `worktree-certification-corpus-lots-0-1-7`
  - `feat/bibliotheque-consolidation`
  - `feat/had-entree-de-rayon`
  - `fix/moteur-repli-bande-et-zero`
  - `fix/ordre-porteurs-extraire-valeur-brute`
  - `chore/droits-42-arbitrage`
  - `chore/licences-tierces-arbitrage`
  - `docs/droits-42-instruments`
  - `agent/arbitrages-2026-07-27`
  - `corpus/banc-certification-bilan`
  - `corpus/droits-instruments-tiers`
  - `corpus/instruments-cabinet-notices-droits`
- Les 15 branches de la section « Contenu déjà intégré ou rendu obsolète par
  `main` » restent hors de cette proposition de nettoyage LOT-03 ; leur sort
  sera tranché dans l'étape post-arbitrage.
- Verdict campagne actuel : consolidation documentaire **GO** ; clôture complète
  **en attente** de la décision sur la branche restante.
