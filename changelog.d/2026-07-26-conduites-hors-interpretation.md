### Modifié

- **Les conduites cliniques sortent des bandes d'interprétation du scoring, et
  ne partent plus au modèle de synthèse** (arbitrage du 2026-07-26). Une bande
  dit *ce que vaut la mesure* ; une conduite dit *ce qu'il faut faire*. Les deux
  cohabitaient dans le même objet, si bien que la conduite voyageait partout où
  voyageait l'interprétation — jusque dans le prompt envoyé au modèle, qui
  recevait « Consultation pneumologue — polysomnographie recommandée » au même
  rang qu'un résultat de mesure. Elle sort désormais sous une clé `conduite`,
  distincte de `interpretation`, **et le bloc de scores brut est filtré avant
  d'être sérialisé dans le prompt** (`scoresPourPrompt`) : séparer les deux clés
  ne suffisait pas, la conduite avait seulement remonté d'un niveau dans le même
  objet sérialisé.
  Ce filtre ne retire aucune information au modèle, il retire un **doublon non
  étiqueté** : les 25 conduites servies (13 instruments × 2 bornes de réponses)
  lui parviennent déjà par la mini-synthèse déterministe, sous la forme
  explicite « … — Orientation : … », et aucune bande du catalogue ne cumule un
  `detail` qui masquerait cette orientation.
  Le texte n'a pas changé, les seuils non plus, et **la fiche praticien affiche
  exactement la même phrase** : `buildMiniSynthese` lit la nouvelle clé, et
  garde le repli sur l'ancienne forme pour les réponses déjà enregistrées —
  **11 passations sur deux instruments** portent `interpretation.protocol` en
  base et ne sont pas réécrites : 8 sur `Q_ALI_01` (2026-07-10 → 07-24) et
  3 sur `Q_SOM_03` (2026-07-25 → 07-26).
  La séparation se fait en **un seul endroit**, l'entonnoir par lequel passent
  les 17 moteurs de scoring : aucune des **44 bandes** du catalogue qui déclarent
  une conduite n'est éditée (dont une vide, l'IRLS `Q_SOM_04`, dont la clé part
  quand même — sans quoi la garde serait plus stricte que le code).
  Trois gardes CI verrouillent le résultat, toutes vérifiées en échec par
  mutation : aucune interprétation servie ne porte de conduite **sous la clé
  `protocol`** (balayage des 64 instruments aux deux bornes), la liste des 13
  instruments qui en servent une est figée — un ajout comme une perte se voit en
  revue —, et aucune conduite ne survit à la sérialisation du prompt, sous l'une
  ou l'autre forme.
  **13, et non les 12 que déclare le catalogue** : le questionnaire de Berlin
  (`Q_SOM_03`) construit son interprétation dans le moteur, en dur, et aucune
  inspection des définitions ne pouvait le montrer. Seule l'exécution le révèle.
  Restent hors de ce lot les sept instruments qui logent une conduite dans
  `interpretation.label` lui-même (`Q_STR_01`, `Q_INF_02`, `Q_NEU_04`,
  `Q_GEO_06`, `Q_FIB_01`, `Q_ALI_01`, `Q_NEU_06`) : les démêler du libellé est un
  arbitrage clinique, pas un déplacement de clé.
