---
id: "LOT-00"
titre: "La garde, les quatre textes, et la trace de formulation"
statut: "terminé (2026-09-17, PR #1181 — sept constats de revue, sept réels)"
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

## L'arbitrage du découpage, et pourquoi il est écrit ici

**`DEPLOIEMENT_RELEASE_DB.md` prescrit de garder la PR de migration SÉPARÉE de la
PR fonctionnelle.** Ce lot y déroge, et la dérogation est un arbitrage du
responsable rendu en session le 2026-09-17. La question lui a été posée en ces
termes — « la garde change un comportement en production, les textes non » — avec
trois variantes soumises :

1. **Deux lots, textes d'abord** — les cinq textes partent seuls, la garde suit.
2. **Deux lots, garde d'abord** — on ne publie une promesse qu'une fois tenue.
3. **Un seul lot** — la promesse et sa garde arrivent ensemble, rien ne peut
   diverger entre les deux.

**Réponse retenue : un seul lot.**

**CE QUE LA DÉROGATION EXIGE EN RETOUR**, et qui est livré : la même page pose que
« un ADD se protège par drapeau éteint ». Le drapeau seul ne suffisait pas — il
garde ce qui entre dans `data`, pas ce que Prisma rend —, d'où les deux `select`
et le banc d'invariant qui les tient.

**POURQUOI CE PARAGRAPHE EXISTE.** Une relecture future ouvrant
`DEPLOIEMENT_RELEASE_DB.md` verrait une pratique non conforme sans en voir la
raison. Un arbitrage relayé de session en session s'érode ; écrit, il tient.
Constat d'une session pair, retenu.

## Ce qui a été trouvé sans le chercher

- **La table des libellés de partage portait la clé `accepte`** quand le statut
  servi est `accorde`. Un patient consentant n'affichait donc **rien** : ni ce
  libellé, ni la ligne du silence, qui ne se déclenche que sur `null`. L'écran se
  taisait exactement sur le cas favorable.
- **L'écran d'accusé portait la phrase fausse en dur**, et son bouton la faisait
  reconnaître. Aucun banc ne la tenait — la mutation a été éprouvée.

## Done

- [x] T1 vert (404 bancs).
- [x] T2 vert — 580 fichiers de banc, 205 E2E.
- [x] Bancs de la garde : cinq cas de consignation, deux de biologie, deux
      d'exception d'adressage, quatre de verdict, quatre d'écran praticien.
- [x] Mutation éprouvée sur le banc de l'écran d'accusé.
- [x] Revue Copilot lue AVANT le merge — y compris son bloc « Suppressed comments », qui portait un constat réel absent de `pulls/<N>/comments`.
- [x] `release-db` approuvée (run 35258773789, 19:09:03Z), migration **constatée** par conteneur (`one-off-8295`).
- [x] `WN_TRACE_FORMULATION_CHOIX` posé à 19:24 UTC, APRÈS le constat ; conteneurs recréés à 19:25:44.
