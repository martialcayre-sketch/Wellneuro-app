# Handoff — 2026-10-18 — J3-base, première tranche : PA-1 et la carte du Fil (D-317 §6, §7)

## Branche et état Git

- Branche `feat/j3-base-pa1-fil`, partie de `origin/main` 7b7705f3, dans le
  worktree `cc8-migration` (session concurrente, cycle en git/gh direct).
- Commit du code 259dd950, puis `origin/main` 03dd8c00 (#1527, #1528) fusionné
  sur arbitrage du responsable (commit puis merge), sans conflit.
- Aucune migration ; `schema.prisma` inchangé.

## Objectif

D-317 §6 : une ligne « rendez-vous de suivi » au fil du jour du portail pendant
la fenêtre de chaque point d'étape (J7, J14, J21). D-317 §7 : badge et titre
« Point d'étape » de la carte J21 du Fil praticien.

## Décisions prises

- Libellé patient validé mot pour mot par le responsable (2026-10-17) : bouton
  « Répondre à mon rendez-vous de suivi », appui « Quelques questions rapides
  pour ajuster votre accompagnement. ».
- Résumé du Fil : « point d’étape / points d’étape » au lieu de
  « jalon / jalons » (arbitrage du responsable, hors §7 littéral).
- La fenêtre n'est pas recalculée côté client. Le fil lit le GET de la route
  du check-in (point ouvert, point renseigné, calendrier courant D-255), et
  rien ne paraît dans le doute.
- Ordre : après les agendas prioritaires, devant tout ce qui ne périme pas.
- Aucune ligne pour un dossier mineur ou clos (recueils en pause).
- Base visuelle : rien à régénérer. `dashboard-fil` est une capture de revue
  (`pixel: false`), et le seed ne produit aucune carte J21.

## Fichiers modifiés

- `web/src/lib/portail/filDuJour.ts` (+ test) : espèce `rendez_vous_suivi`,
  `rendezVousSuiviAFaire`
- `web/src/app/portail/[token]/questionnaires/page.tsx` : sonde du check-in
- `web/src/lib/fil/cartes.ts` (+ test), `web/src/components/fil/FilDuJour.tsx`
  (+ test), `web/src/app/api/praticien/fil/route.test.ts`
- `docs/claude/PLAN_WELLNEURO.md` (H61),
  `changelog.d/2026-10-18-j3-base-pa1-fil-point-etape.md`

## Validations exécutées

- T1 rapide après chaque édition ; T1 complet vert avant le commit du code.
- Revue `wn-reviewer` : GO, ni P0 ni P1. Trois P2 corrigés : résumé arbitré,
  `cache: 'no-store'` sur la sonde, banc d'une entrée `null`. Un P2 routé
  (ci-dessous).
- T2 (`--fast`) sur l'état fusionné : vert en 6 min. Vitest : 13 440 verts,
  4 sautés. E2E : 274 verts, 6 sautés (build de production).
- CI de #1530 vert (sha e770d354). Revue CodeRabbit sur ce sha : un
  commentaire, corrigé. Au retour depuis le bfcache (`pageshow` persisté), la
  page relit la route du check-in. `origin/main` b357fa9e (#1529 à #1536)
  fusionné une seconde fois, sans conflit. T1 complet puis T2 (`--fast`)
  rejoués : verts. Vitest : 13 456 verts, 4 sautés. E2E : 276 verts, 6 sautés.

## Problèmes ouverts

- **Antérieur au lot, routé au responsable** : le POST check-in et le
  compagnon (`PatientCompanionHome`) acceptent et mettent en avant le
  rendez-vous de suivi pour un dossier mineur, d'âge inconnu ou clos. Aucune
  garde `statutAge` ni `dossierOuvert`. Le fil se tait, mais `/suivi` permet
  toujours d'écrire une donnée de santé (esprit de D-284 §3-4). À trancher :
  lot de garde, ou maintien.
- Entre deux fenêtres (jours 10 à 11, 17 à 18), aucun point n'est ouvert, et la
  ligne disparaît environ 24 h. C'est la lettre de §6 et le comportement de
  `pointEtapeCourant`, inchangé.
- Aucun banc au niveau de la page (mineur, dossier clos, sonde en échec), ni
  aucun E2E d'apparition et de disparition de la ligne. La fixture
  `provisionAncreJalon` le permettrait.

## Prochaine action exacte

Faire passer le CI de la PR et obtenir la revue CodeRabbit sur le sha de tête.
Merger, un merge à la fois, puis constater le déploiement. Restent ensuite dans
J3-base : « Mes échanges » (u), EF-0 (ab), la frise et les repères (porte 16,
N-8).

## Interdits encore actifs

- Aucune migration ni `schema.prisma` sans accord explicite.
- Aucune fenêtre, aucun seuil, aucune règle clinique changés (J7/J14/J21 à ±3).
- Aucun rappel ni relance des points d'étape (D-317 §8).
- Fixtures neutres seulement ; jamais de dossier réel en E2E.
- Un merge à la fois ; déploiement constaté avant le suivant.
