# Handoff — 2026-10-23 — bd : encart « quand ralentir ou demander avis » (D-348)

## Branche et état Git

- Branche `lot/bd-encart-conduite`, partie d'`origin/main` (a7247fe4), puis
  `origin/main` fusionnée (99166e2d, #1659) sous la délégation du
  2026-10-16 ; worktree `act5-mineurs` (session concurrente, cycle en git/gh
  direct).
- Une PR, code et documents ; aucune migration.

## Objectif

Rendre l'encart bd (fiche H71) prêt au sens de D-288 §1 — texte accepté,
registre, drapeau — pour qu'il prenne la place suivante de la file C
(D-346 §2), puis l'activer sous la porte 18, constaté par identifiant.

## Décisions prises

- D-348 : texte du responsable du 2026-10-23, variante A d'un brouillon
  qu'il a fait rédiger par un assistant externe.
- Première question à options : la phrase « choisissez l’élément ou « Je ne
  sais pas » » rendue conditionnelle (« Si le formulaire vous le propose »),
  parce que l'ancien formulaire n'a pas de liste.
- Seconde question, sur le P1 de la revue adverse : phrase retirée. Sur
  l'ancien formulaire, « Je ne sais pas » répond à « ce produit fait-il
  partie du programme ? » et laisse le signalement hors du programme (ni
  attente de l'avis, ni blocage de la diffusion, D-281).
- Affichage : accueil du protocole, chaque fois qu'une vue est servie, hors
  du détail replié, fin de cycle comprise ; rien sans protocole ni sur un
  protocole indisponible.
- Drapeau `WN_PORTAIL_ENCART_CONDUITE`, chaîne exacte `'true'`, éteint ; la
  route du protocole annonce `encartConduite`.

## Fichiers modifiés

- `web/src/lib/portail/texteEncartConduite.ts` (neuf, module pur) et son
  banc ; `web/src/lib/portail/encartConduite.ts` (neuf, drapeau)
- `web/src/app/api/portail/protocole/route.ts` et son test
- `web/src/components/patient-companion/PatientCompanionHome.tsx` et son test
- `web/src/lib/gamification-patient.guard.test.ts` (surface ajoutée)
- `docs/DECISIONS.md` (D-348), `docs/FEATURE_FLAGS.md`,
  `docs/claude/PLAN_WELLNEURO.md` (H71, ligne de l'encart),
  `changelog.d/2026-10-23-d348-encart-bd.md`, `docs/claude/SESSION_LOG.md`

## Validations exécutées

- T1 vert (après `prisma generate` : client périmé par #1664, hors diff).
- T3 complet vert sur la première version du texte (séquence CI en
  6 min 51 s, E2E Chromium + WebKit).
- Revue `wn-reviewer` : GO pour merger drapeau éteint, NO-GO pour activer
  sur un P1 (phrase du formulaire) ; P1 tranché par le responsable (phrase
  retirée). P2 traités : banc strict (citation de D-348 §1 extraite ligne à
  ligne, égalité stricte ; rouge sous mutation d'un paragraphe retiré),
  surface ajoutée au garde de gamification, cas « indisponible » de la
  route. §5 de D-348 précisé (le formulaire est sur la page « Mes
  informations et mes droits »).
- Bancs touchés verts après correctifs (4 fichiers, 68 cas) ; T3 et T1
  complet rejoués sur l'état fusionné avant la PR.

## Problèmes ouverts

- « Signaler un problème » n'est pas un lien depuis l'encart (D-348 §5).
- Une gêne liée à un geste de vie passe par le libellé « Un produit me
  semble mal toléré ».
- L'aperçu du protocole au cockpit ne montre pas l'encart.

## Prochaine action exacte

Après merge et déploiement constaté : sur accord du responsable,
`WN_PORTAIL_ENCART_CONDUITE=true` (env-set, puis redémarrage : env-set ne
redémarre pas) ; constat D-348 §4 — l'encart lu en ligne par le responsable
sur un dossier de test dont un protocole est servi, la diffusion en vigueur
relue par identifiant en conteneur, consigné en agrégats ; page de suivi de
la file C (ouverture « encart » → fait).

## Interdits encore actifs

- Aucun texte patient de la main de l'assistant ; toute nouvelle version du
  texte passe par une décision.
- Une activation à la fois, la précédente constatée (porte 18).
- Prod lue par identifiant en conteneur, jamais d'identité au dépôt ; aucun
  lien d'artefact au dépôt (public).
- Un merge à la fois, déploiement constaté.
