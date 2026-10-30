# Handoff — H27 : première lecture de la re-mesure du sommeil (LOT-02)

## Branche et état Git

- Worktree `act5-mineurs`, branche `docs/h27-premiere-lecture`, PR #1781.
  Session concurrente, cycle en `git`/`gh` direct ; l'intégrateur merge
  ([[D-373]]).
- `origin/main` fusionné le 2026-10-30, sans conflit.
- PR renvoyée par l'intégrateur le 2026-10-29 : il manquait un handoff créé
  par la PR. C'est ce fichier.

## Objectif

Jouer à sa date (2026-10-29) la première lecture de `REMESURE_ADHESION.sql`,
puis la verser dans la fiche LOT-02 de la campagne et dans le journal de H27.

## Décisions prises

- La requête a tourné aux bornes par défaut (`av` 2026-10-07, `ap` 2026-10-09)
  dans un conteneur `scalingo run -d`, en agrégats. La sortie brute n'est pas
  versée.
- Agendas de recette sur appareil dans la cohorte `c_apres` : aucun, d'après
  le relevé du responsable. Il n'y a rien à retirer du compte.
- Versement immédiat par PR de doc, sur arbitrage du responsable.
- La comparaison sur fenêtres échues est reportée à la seconde lecture, le
  2026-11-12. Aucune fenêtre `c_apres` n'est encore échue.
- Pour l'écart de la référence `a_avant` depuis le 2026-10-09, on consigne
  deux lectures possibles sans retenir de cause ([[D-125]]).

## Fichiers modifiés

- `docs/claude/campagnes/2026-10-07-agenda-sommeil-adhesion/lots/LOT-02-remesure.md`
  (statut, section « Première lecture ») ;
- `docs/claude/plan-journal/H27/2026-10-29-01-premiere-lecture.md`.

## Validations exécutées

- Contrôle des bornes (R07) conforme : `a_avant` en v2 et v3, `b_transition`
  en v3, `c_apres` en v4 seulement.
- Les comptes se réconcilient entre lignes et nuits (correction demandée
  par la revue PR-Agent, appliquée).
- T1 rejoué après la fusion de main. CI et revue de bot sont attendus sur
  la nouvelle tête.

## Problèmes ouverts

- La référence a bougé alors que ses fenêtres étaient closes : 87 nuits au
  lieu de 85. La cause n'est pas établie.
- La porte 16 n'est pas levée.

## Prochaine action exacte

1. CI et revue de bot sur la nouvelle tête, puis « prête @<sha> ».
2. Le 2026-11-12 : seconde lecture.
   - Relire d'abord la référence.
   - Reprendre pour chaque mesure le même dénominateur, ligne ou nuit, que
     dans la mesure comparée.
   - Comparer sur fenêtres échues : part des agendas à une seule nuit, nuits
     médianes, agendas d'au moins 14 nuits, R08.
3. Puis clôture du LOT-02, qui lève la porte 16.

## Interdits encore actifs

- Aucune fenêtre ni aucun seuil inventés.
- Des comptes, pas des tests statistiques.
- Jamais de taux par patient.
- Production en lecture seule par conteneur, en agrégats.
- Dans le dépôt, « un dossier de test », jamais un identifiant avec des
  mesures.
- Aucun lien d'artefact dans le dépôt.
- La file C ne merge aucune PR ordinaire ([[D-373]]).
