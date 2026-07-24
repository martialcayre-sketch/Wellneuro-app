### Couverture « gestion du stress » : PSS-10 borné sur /50 (2026-07-24)

Correction du plafond de la source Q_STR_02 (PSS-10) dans le calcul de la
couverture du besoin 9 (« Mon équilibre » patient / « Cartographie
neuro-fonctionnelle » praticien). La couverture d'une source vaut
`clamp01(1 − brut / max)` ; or le PSS-10 servi est coté 1–5, total brut
∈ [10, 50], alors que `max` valait 40 — vestige de l'ancienne cotation 0-4
purgée le 2026-07-23. Conséquence : tout patient au score brut ≥ 40 voyait sa
couverture stress écrasée à 0, sans distinction dans toute la moitié haute de
l'échelle. `max` passe à 50 (borne réelle de l'instrument), ce qui restaure la
discrimination sur les scores élevés et relève légèrement la couverture pour un
même score brut. Le stress étant une fondation critique, cette valeur influe sur
le déclenchement du plafond de score global : moins de faux effondrements sur
l'axe stress. Aucune donnée patient n'est migrée ; les scores, recalculés à la
volée, reflètent immédiatement la nouvelle borne. `VERSION_SCORE_EQUILIBRE` passe
de `v1` à `v2` (les scores calculés avant/après ne sont pas comparables).

Refactor associé, sans effet clinique : la définition de Q_STR_02 est déplacée de
l'inline `questions.ts` vers le module `questionnaires/stress.ts` (motif
raccourci, comme les autres instruments du module), les jeux d'options PSS étant
extraits dans `questionnaires/shared.ts`. La définition servie est préservée au
caractère près (garde-fou `questions.pss10.test.ts`).
