### Synthèse IA, biologie : `synthese-v42` évaluée non conforme ; D-571 acceptée, l'appel principal ne reçoit plus le libellé qui nomme l'état d'un nutriment ou d'un messager, `synthese-v43` (H95 part B, 2026-11-25)

- **Constat** : l'évaluation de l'appel principal seul sous `synthese-v42` (75 sorties, D-563 §5) laisse 17 générations en violation, dont 11 tiennent au libellé d'interprétation du DNST. `synthese-v42` n'est pas servie ; `synthese-v39` reste en service. Le constat est au journal H95, fragment `2026-11-25-05`. Quatre lectures de la grille (`1640` A, `1641` C, `1642` A, `1643` A).
- **D-571** :
  - pour `Q_INF_02` et `Q_INF_03` (liste fermée), l'appel principal ne reçoit plus le libellé d'interprétation, ni les bandes de sous-score, ni la mini-synthèse ; il reçoit les scores, les domaines comportementaux du DNST et un champ qui explique le trou. Le praticien voit toujours le libellé ;
  - quatre textes de la consigne principale, validés mot pour mot : l'entrée retirée et le niveau dit du sous-score ; des symptômes alimentaires non renommés d'un mot de la glycémie ; un examen non déclaré qui ne se croise ni ne se connaît ; un examen déclaré qui n'argumente plus un axe, et qui reste rappelable hors des axes ;
  - acceptée le 2026-11-26 avec un amendement : le test déterministe vaut pour l'entrée seulement, et le respect des textes est relevé à part, sans cotation ;
  - constat versé : les libellés recopiés viennent des fixtures, et le moteur en production envoie des bandes par sous-score ; un test déterministe de l'entrée couvre les deux formes ;
  - version `synthese-v43`, servie seulement après un rejeu conforme (75 sorties).
- **Documentation seule** : aucun code ni aucune migration ; le drapeau `WN_SYNTHESE_BIOLOGIE_ENABLED` reste éteint.
