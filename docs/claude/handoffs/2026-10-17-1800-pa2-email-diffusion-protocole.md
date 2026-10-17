# Handoff — 2026-10-17 — PA-2 : l'e-mail de diffusion du protocole (D-317)

## Branche et état Git

- Branche `feat/pa-2-email-diffusion`, partie de `origin/main` b57f67c2, dans
  le worktree `cc8-migration` (session concurrente, cycle en git/gh direct).
  `origin/main` a été fusionné deux fois dans la branche sur arbitrage du
  responsable (commit puis merge) : 8dd1ff2e (#1518) sans conflit, puis
  73f898a3 (#1519) avec un conflit d'imports résolu.
- Aucune migration ; `schema.prisma` inchangé.

## Objectif

Lot PA-2 de D-317 (§2 à §4) : l'e-mail neutre « Votre protocole vous attend »
au clic « Valider pour diffusion » d'une nouvelle version, sous un drapeau
neuf éteint, et le plafond serveur de 24 h, posé aussi sur `document_remis`.

## Décisions prises

- Texte du gabarit `protocole_diffuse` relu mot pour mot et validé par le
  responsable en session (`valideLe` = 2026-10-17). Le chemin nommé est celui
  du portail : « Accéder à mon parcours », puis « Mon accompagnement ».
- « Nouvelle version » = un `protocolDraftInputHash` jamais approuvé sur la
  chaîne de la décision. Une version A rediffusée après B n'envoie rien
  (lecture littérale du §2 ; à rouvrir seulement sur demande).
- L'e-mail du protocole exige que l'aperçu du clic soit sans blocage (dossier
  suivi, contrat patient accepté), pour ne pas annoncer une porte close.
- Le drapeau n'est effectif que si le gabarit est validé et que
  `WN_FICHES_ASSIETTE` est ouvert : l'annonce vit dans la transaction des fiches.
- Plafond : verrou consultatif par dossier, pris en dernier ; il compte toute
  tentative des deux types sur 24 h glissantes. Un refus du plafond est tracé
  `Non_envoye` avec son motif, et ce refus-là n'est pas compté. Le plafond est
  actif sans drapeau (§4).
- Réponse de l'e-mail du protocole adressée au praticien (`Reply-To`).

## Fichiers modifiés

- `web/src/lib/fiches-assiette/annonce.ts` (+ test) : plafond, deux gabarits
- `web/src/lib/protocol/annonceDiffusion.ts` (+ test, neufs) : le drapeau
- `web/src/lib/correspondance/registreGabarits.ts` (+ test), `patient.ts`
- `web/src/lib/consultation/email.ts` : `sendProtocoleDiffuseEmail`
- `web/src/lib/fiches-assiette/apercuRemise.ts` : sort `plafond`, textes
- `web/src/app/api/praticien/protocoles/diffusion/route.ts` (+ deux tests)
- `web/src/components/patient-cockpit/ProtocolDiffusionPanel.tsx` (+ test),
  `ClinicalRuntimeSection.tsx`
- `docs/DOSSIER_RGPD.md`, `docs/FEATURE_FLAGS.md`, `docs/claude/PLAN_WELLNEURO.md` (H75)
- `changelog.d/2026-10-17-pa2-email-diffusion-protocole.md`

## Validations exécutées

- Vitest ciblé (registre, fiches-assiette, route de diffusion, cockpit,
  consultation) : 1223 verts avant le merge ; panneau : 34 verts.
- T1 rapide vert ; T1 complet vert avant le commit.
- Revue `wn-reviewer` : GO, ni P0 ni P1. Verrous sans cycle, READ COMMITTED
  correct, filtre `OR` sur la colonne nullable correct. P2-2 corrigé : les
  textes d'avant le clic (fiches, courrier) mentionnent le plafond.
- T2 (`--fast`) après le merge de #1518 : vert — Vitest 13 320 verts,
  4 sautés ; E2E 274 verts, 6 sautés (build de production, Chromium + WebKit).
- `main` fusionné une seconde fois (#1519, D-281 t20 reste 2), sur arbitrage :
  un conflit d'imports dans `route.test.ts`, les deux côtés gardés
  (`annoncerDiffusion`, `pausesServies`). Bancs des fichiers fusionnés :
  1173 verts ; T1 rapide puis T2 (`--fast`) rejoués après cette fusion :
  verts — Vitest 13 346 verts, 4 sautés ; E2E 274 verts, 6 sautés.
- CI de #1520 vert (sha 44e108ad). Revue CodeRabbit sur ce sha : un
  commentaire, corrigé — le GET lisait les approbations sur la chaîne de
  `versions[0]` (ordre non garanti) au lieu de la version active, celle que
  lit le POST (même constat que le P2-1 de `wn-reviewer`, antérieur au lot).
  Banc ajouté ; T1 complet et T2 rejoués avant le commit du correctif.

## Problèmes ouverts

- Le plafond n'est éprouvé que sur mocks : aucun banc contre un vrai Postgres,
  ni sur deux transactions concurrentes.
- Une tentative `portail_ferme` ou `non_configure` occupe la fenêtre de 24 h
  (conforme au §1, « toute tentative »).

## Prochaine action exacte

Après le merge et le déploiement constaté : la porte 18 d'ACT-2 (H75), puis,
sur ordre du responsable, la pose de `WN_ANNONCE_PROTOCOLE` en production.
Le constat se fait à la première vraie diffusion qui suit, par identifiant en
conteneur, sans en provoquer.

## Interdits encore actifs

- Aucune migration ni `schema.prisma` sans accord explicite.
- Pas de pose du drapeau sans ordre du responsable ; aucune diffusion
  provoquée pour le constat.
- Fixtures neutres seulement ; jamais de dossier réel en E2E.
- Un merge à la fois ; déploiement constaté avant le suivant.
