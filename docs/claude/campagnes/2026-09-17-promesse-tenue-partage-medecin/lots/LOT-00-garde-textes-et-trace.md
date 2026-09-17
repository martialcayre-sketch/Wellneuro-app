---
id: "LOT-00"
titre: "La garde, les quatre textes, et la trace de formulation"
statut: "en cours (2026-09-17)"
dépend_de: "—"
---

# LOT-00 — La garde, les quatre textes, et la trace de formulation

## But

Faire tenir la promesse publiée, et le dire au patient sans la sur-promettre.

## Périmètre

**La garde** — `lib/trust/consentementPartage.ts` (l'en-tête qui portait la
doctrine inverse est réécrit, pas contourné), et deux routes d'écriture :
le courrier de biologie et la consignation à la main. La route d'adressage porte
en commentaire **pourquoi elle n'est pas gardée** — une exception muette se
referme au premier relecteur qui croit corriger un oubli.

**Les quatre textes** — `donnees_confidentialite@v9` (accusé exigé),
`consentement_suivi@v3`, l'écran 3 de `AvantDeCommencer.tsx`, et l'effet du refus
de « Mes choix ».

**La trace** — `lib/trust/finalitesChoix.ts` (la formulation quitte l'écran,
versionnée et verrouillée par empreinte), la colonne
`trust_choice_events.formulation_version`, sa migration, et son drapeau éteint.

**Le registre** — amendements en place de `D-222` et de `D-219`.

## Ce qui a été trouvé sans le chercher

- **La table des libellés de partage portait la clé `accepte`** quand le statut
  servi est `accorde`. Un patient consentant n'affichait donc **rien** : ni ce
  libellé, ni la ligne du silence, qui ne se déclenche que sur `null`. L'écran se
  taisait exactement sur le cas favorable.
- **L'écran d'accusé portait la phrase fausse en dur**, et son bouton la faisait
  reconnaître. Aucun banc ne la tenait — la mutation a été éprouvée.

## Done

- [x] T1 vert (404 bancs).
- [ ] T2 vert.
- [x] Bancs de la garde : cinq cas de consignation, deux de biologie, deux
      d'exception d'adressage, quatre de verdict, quatre d'écran praticien.
- [x] Mutation éprouvée sur le banc de l'écran d'accusé.
- [ ] Revue Copilot lue AVANT le merge, trois verdicts.
- [ ] `release-db` approuvée, migration **constatée** par conteneur.
- [ ] `WN_TRACE_FORMULATION_CHOIX` posé APRÈS le constat.
