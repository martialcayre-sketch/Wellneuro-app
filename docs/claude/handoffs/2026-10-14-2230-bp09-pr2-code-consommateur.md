# Handoff — 2026-10-14 — BP-09, PR 2 : le code consommateur de l'annulation (D-294)

## Branche et état Git

`feat/bp09-annulation-consommateur`, worktree `.claude/worktrees/bio-ingest-cloture`,
partie d'`origin/main` 44e2a60b (après trois avances rapides autorisées par le
responsable : #1452, #1451, #1454). Un commit de lot ; PR ouverte avec ce
handoff. Aucune migration : la table `annulations_resultats_biologiques` est en
production depuis la PR 1 (#1448) — `prisma migrate status` « up to date »,
107 migrations, constaté par conteneur `one-off-322` le 2026-10-14.

## Objectif

PR 2 de la fiche LOT-09 : un résultat annulé sort des lecteurs de calcul
(derniers résultats, portes biologiques, contrôles de doublon de la saisie
groupée et de l'import) et reste visible sur la fiche praticien, marqué
« annulé » avec motif, auteur et date ; le praticien annule et révoque depuis
la fiche.

## Décisions prises

- Aucune décision neuve : D-294 couvre le lot (§3 fil = racine, place libérée ;
  §6 qui voit l'annulation).
- Actes servis par une route à part, `resultats/annulations/route.ts` (la fiche
  nommait `resultats/route.ts` comme fichier probable).
- La route prend les verrous de la garde en base (`resultats_biologiques_verrouiller_cle`,
  clé relue en SQL) avant de relire le fil : ses refus sont ceux de la base,
  nommés. La correction s'écrit désormais sous les mêmes verrous.
- `derniersResultatsParAnalyte` exige les annulations actives (paramètre
  obligatoire) : un lecteur futur ne peut pas l'oublier.
- Arbitrages du responsable du 2026-10-14 après contre-revue (ne pas reposer) :
  la ligne d'import d'un résultat annulé devra redevenir décidable (lot
  ultérieur, décision propre) ; les gestes sur dossier clos seront masqués
  (lot ultérieur).

## Fichiers modifiés

- Pur : `biology-library/annulationMotifs.ts` (neuf), `filCorrection.ts`
  (`annulationParLigne`, commentaire « une racine par clé » corrigé),
  `derniersResultats.ts`, `saisieMessages.ts`.
- Serveur : `biology-library/annulations.ts` (neuf : annulations actives, clés
  occupées, verrou de clé), `import/decisions.ts`,
  `clinical/portesBiologiquesService.ts`, routes `resultats/route.ts`,
  `resultats/bilan/route.ts`, `resultats/annulations/route.ts` (neuve).
- Écran : `EstimeMesurePanel.tsx`, `ActeAnnulationResultat.tsx` (neuf),
  `ImportCompteRenduPanel.tsx` (« même jour » ignore l'annulé).
- Gardes de liste blanche (`importeursBiologyLibrary`,
  `lecteursResultatBiologique`) : nouveaux modules inscrits avec motif.
- Bancs : tests de chaque fichier ; `scripts/banc-unicite-mesure-prisma.test.ts`
  (cas 4 : verrou, actives, place libérée par le vrai client).
- Doc : fragment `changelog.d/2026-10-14-bp09-annulations-resultats-code.md`,
  statut de la fiche LOT-09.

## Validations exécutées

- T1 complet (`npm run check`) vert, avant et après les retouches de revue.
- T3 complet : 1re passe rouge sur un seul E2E WebKit sans rapport
  (`agenda-sommeil-praticien.spec.ts:168`, iPhone 13, vert sur Chromium) ;
  rejouée une fois : verte (271 passés, 3 ignorés), banc Prisma compris.
- T2 (`test:worktree --fast`) après les trois retouches de revue : vert (271 passés, 3 ignorés).
- Contre-revue `wn-reviewer` en affirmations à réfuter : GO, aucun P0/P1 ;
  trois P2 corrigés (plages hors mesures annulées, refus « annulé » prioritaire
  sur « déjà corrigée », révocation non offerte sur place reprise).

## Problèmes ouverts

- P2 reportés : trois 500 non nommés sur base abîmée ou course rare (cycle de
  chaîne, successeur hors clé, dossier réattribué en vol) — la base refuse,
  rien de faux n'est écrit ; l'écran d'import garde le badge « Validée » d'une
  ligne dont le résultat est annulé ; le commentaire de la migration (« ces
  fonctions ne servent qu'aux triggers ») est faux depuis l'appel par la route
  — à dire dans la doc, la migration appliquée ne se modifie pas.
- Lots à cadrer (arbitrages ci-dessus) : ligne d'import revalidable après
  annulation ; gestes masqués sur dossier clos (Corriger compris).
- Le constat d'usage (première annulation réelle) reste à faire après
  déploiement, par conteneur, par identifiant.

## Prochaine action exacte

Attendre le CI (`node scripts/wn-attendre-ci.mjs <N>`, code 0), lire la revue
CodeRabbit sur le sha de tête et ses commentaires en ligne, trancher chacun,
merger ; constater le déploiement Scalingo du sha mergé. Puis cadrer les deux
lots ultérieurs ; BP-03 et BP-04 (qui attendaient BP-09) deviennent prenables.

## Interdits encore actifs

- Aucune migration dans ce lot ; un nouveau motif d'annulation exige décision
  et migration.
- Lecteurs à naître (`serieParAnalyte`, jour n de BP-03, réveils de BP-04) :
  naissent en excluant l'annulation (D-294 §6).
- Jamais montrer une annulation, ni un résultat de mauvais dossier, côté
  patient (D-294 §5).
- Chaque fusion ou rebase de la branche se redemande ; pas d'auto-merge sur
  une PR de lot.
