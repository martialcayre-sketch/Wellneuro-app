---
id: "2026-08-02-certification-questionnaires-consolidation"
titre: "Certification questionnaires — consolidation 62/64"
statut: "en_cours"
créée_le: "2026-08-02"
mise_à_jour: "2026-08-02"
lot_courant: "LOT-01"
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
- Le dossier de montée en certification documente un `verdictScoring` renseigné
  sur 62 entrées sur 64.
- `Q_PED_02` et `Q_PED_03` sont les deux exceptions nommées dans
  `docs/claude/propositions/2026-07-29-certification-montee/scoring-et-contenu.md`.
- `Q_PED_02` est débaptisé : la source Conners enseignant reste soumise à
  licence et ne doit pas donner son identité au questionnaire servi.
- `Q_PED_03` a ensuite été rejoué au banc, puis suspendu par l'arbitrage du
  2026-08-01 consigné dans
  `changelog.d/2026-08-01-certification-ped03-garde-troncature.md` : aucune
  réactivation sans quatre dimensions, deux échelles de validité et des seuils
  sourcés ; la somme brute seule est exclue.
- Les deux définitions sont déjà présentes dans
  `web/src/lib/questionnaires/pediatrie.ts`.

La notation 62/64 décrit la couverture du dossier de certification. Elle ne
signifie ni que 62 questionnaires sont assignables au patient, ni que tous ont
le même niveau de certification de scoring.

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

## Questions ouvertes

- Les 21 branches à revoir contiennent-elles encore un apport absent de
  `main` ?
- Quels outils de banc historiques ont une valeur générique justifiant leur
  conservation ?
- Le registre, qui marque encore `Q_PED_03` certifié sur plusieurs axes, doit-il
  expliciter séparément sa suspension clinique ?

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Inventaire et classification des 36 branches | terminé | — |
| LOT-01 | Revue des 21 apports résiduels possibles | à_faire | LOT-00 |
| LOT-02 | Consolidation de l'état canonique 62/64 | à_faire | LOT-01 |
| LOT-03 | Validation, matrice finale et handoff | à_faire | LOT-02 |

## Done de campagne

- [ ] Les 21 branches incertaines ont un verdict documenté.
- [ ] L'état 62/64 est cohérent dans les sources canoniques.
- [ ] Les validations réellement exécutées sont consignées.
- [ ] Le nettoyage éventuel des branches est proposé séparément.
