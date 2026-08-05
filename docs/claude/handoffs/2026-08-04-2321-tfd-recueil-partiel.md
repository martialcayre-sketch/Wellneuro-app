# Handoff — 2026-08-04 — TFD : fermer le recueil partiel du dernier moteur réglé

## Branche et état Git

- Branche : `worktree-worktree-tfd-recueil-partiel`, worktree
  `.claude/worktrees/worktree-tfd-recueil-partiel`, partie de `main` à `8fb3cebc` (#566).
- Aucune migration, aucun changement de schéma, aucune écriture en base.

## Objectif

Fermer le recueil partiel sur `tfd` (`Q_GAS_01`, TFD SIIN), **dernier moteur de la
classe atteignable par une règle d'orientation publiée**. Le lot précédent l'avait
nommé trois fois comme réserve connue.

Le défaut : `totalGlobalDepuisSousScores` ne rendait `null` que si un axe **entier**
était vide. Un item répondu par axe suffisait donc à produire un total — **cinq
réponses sur trente-et-une, toutes au maximum de leur échelle, donnaient 15 sur 93 et
décrochaient « A — Absence de troubles fonctionnels »** (bande 0-23). Biais à sens
unique : un item non répondu est ignoré, jamais compté 0, et sur cette grille le bas
est le rassurant.

## Décisions prises

- **D-020** (fille de D-014) : la bande d'un **axe** se lit sur l'axe complet. L'axe
  partiel garde son total, perd son étiquette. Écart délibéré au moteur `subscore`,
  dont le motif est une propriété de la **grille du TFD** (`C1` lit « Absence » de 0 à
  7 sur ses huit items), pas une différence d'affichage entre moteurs.
- `VERSION_SCORE_EQUILIBRE` : v10/v11 → **v12/v13**.

## Fichiers modifiés

| Fichier | Objet |
|---|---|
| `web/src/lib/questions.ts` | branche `tfd` : comptes publiés, bandes retirées sur partiel, note composée |
| `web/src/lib/equilibre/constants.ts` | bump de version + les deux directions de l'effet |
| `web/src/lib/scoring/miniSynthese.ts` | `some` → `every` (défaut voisin, trouvé en revue) |
| `web/src/lib/clinical/orientationRulesV1.ts` | le coût de la garde, écrit près de `R-GAS-01` |
| `web/src/lib/clinical/orientationEngine.ts` | deux commentaires devenus faux |
| `web/src/lib/tfdRecueilPartiel.guard.test.ts` | banc neuf, 11 tests |
| `web/src/lib/clinical/orientationService.test.ts` | preuve bout en bout (score gelé) |
| `docs/DECISIONS.md`, `changelog.d/…` | D-020 et fragment |

## Validations exécutées

- T1 : vert (3621 + 1218 tests).
- T3 : vert aux deux positions du drapeau `WN_ALI_01_SIIN57` (3621 × 2, 108 E2E).
- **Passe de mutation** : les trois gardes retirées → **6 tests rougissent**, dont la
  preuve bout en bout. Le banc n'est pas tautologique, c'est vérifié et non supposé.
- **Lecture production** (`execute_sql`, 2026-08-04) : **2 passations `Q_GAS_01`,
  toutes deux complètes (31/31)**, `total` max 39. Aucun dossier vivant concerné.
- Deux passes de revue adversariale (`wn-reviewer`) : **NO-GO** puis **GO**.

## Ce que la revue a trouvé, et qui est le fond du lot

1. **La direction de l'effet sur « Mon équilibre » n'a pas un seul sens.** J'avais
   écrit « la couverture peut donc BAISSER — c'est la correction ». Vrai d'une branche
   seulement : au-delà de `total ≥ 62` la couverture passait sous le seuil
   d'effondrement, faisait du besoin 4 une **fondation critique** et plafonnait le
   score global à 50 — le rendre non mesuré **lève ce plafond**, et le score REMONTE.
   Le commentaire de #566, deux blocs plus haut dans le même fichier, décrivait
   pourtant correctement cette mécanique.
2. **`R-GAS-01` s'éteint sur un partiel déjà sévère.** Huit réponses cotées 3
   atteignent la bande B. Les items étant cotés 0 à 3, un item manquant ne peut
   qu'ajouter : la sévérité est **acquise, pas probable**. Coût assumé de D-014,
   désormais écrit près de la règle et épinglé par un banc.
3. **La mini-synthèse re-fabriquait la conclusion un étage plus haut** :
   `rubriques.some(r => r.interpretation)` faisait écrire « Tous les axes explorés sont
   peu perturbés » alors que le commentaire deux lignes au-dessus décrivait `every`.
4. **Un fait faux introduit par ma propre correction** : « `subscore` sert 14
   instruments dont aucun ne publie de bande d'axe ». Mesuré sur le catalogue résolu :
   **8 instruments, dont 4 avec bandes d'axe**. Le 14 venait d'un autre banc, qui
   compte les instruments à plusieurs axes tous moteurs confondus.

## Problèmes ouverts

- **La classe n'est pas close.** `sum_decimal` (`Q_GEO_05`, QDRS — gradation de
  démence), `count_threshold` (`Q_INF_05`) et `ecab` (`Q_NEU_08`) la portent encore.
  Ce qui les distingue n'est pas d'être protégés : aucune règle publiée ne les vise.
- **Le plancher garanti est le lot qui manque.** Une bande retirée éteint aussi les
  vrais positifs démontrables par monotonie. Le dépôt sait écrire cette asymétrie
  (`seuilMonotone`, `questions.ts`) ; l'appliquer aux bandes demande de servir un
  **plancher garanti** à côté de la bande, sur **tous** les moteurs à recueil partiel.
  C'est le candidat le plus net pour le lot suivant de cette veine.
- **La synthèse IA reste sur l'instantané gelé** (D-019, réserve déjà enregistrée).
  Sans effet aujourd'hui : les deux passations de production sont complètes.

## Prochaine action exacte

Ouvrir la PR depuis cette branche (`--body-file`), attendre le CI avec
`node scripts/wn-attendre-ci.mjs <N>`, **lire** son code de sortie — `0` seul autorise
à annoncer la PR prête —, puis merger en squash.

## Interdits encore actifs

- Pas de migration Prisma, pas d'écriture Supabase : ce lot n'en a aucun besoin.
- Ne pas aligner le moteur `subscore` par réflexe — autre lot, autre arbitrage (D-020).
- Ne pas rebrancher un lot suivant sur cette branche après le squash : repartir de `main`.
