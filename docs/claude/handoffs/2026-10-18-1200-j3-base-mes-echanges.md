# Handoff — 2026-10-18 — J3-base : « Mes échanges », prêt et fermé (D-293) ; ACT-2 posé

## Branche et état Git

- Branche `feat/j3-base-mes-echanges`, partie de `origin/main` 49a2bb19 (#1530
  mergée et déployée), dans le worktree `cc8-migration` (session concurrente,
  cycle en git/gh direct).
- Aucune migration ; `schema.prisma` inchangé.

## Objectif

Livrer « Mes échanges » (lettre u, D-293), préalable d'ACT-3 (H76), prêt et
fermé. Conduire la file C en autonomie, sur délégation du responsable du
2026-10-18 : pose du drapeau d'ACT-2.

## Décisions prises

- Arbitrages du responsable (2026-10-18) : une seule liste, le plus récent en
  haut, groupée par jour. Chaque ligne dit « Remis » ou « Transmis », puis
  l'objet. Le lien « Ouvrir mes échanges » va dans « Autres espaces ».
- Drapeau neuf `WN_PORTAIL_MES_ECHANGES`, éteint. Il ne se pose pas avant ai
  (D-293 §4).
- Seuls les dossiers majeurs y ont accès : une surface neuve ne s'ouvre pas à
  un mineur (D-283 §5, revue P1-1). Sinon, 409 et pas de lien.
- Sources : la règle de visibilité de chaque page est empruntée. La synthèse de
  compréhension n'est pas listée, parce que D-293 §1 ne la nomme pas.
- Clé constante pour le protocole : l'identifiant d'approbation ne part pas au
  navigateur.
- BioFlow est lu par son entrée publiée (D-306 §2). `publie.ts` ré-exporte
  désormais `isBioPortailEnabled` et `listerTransmissions` : c'est le deuxième
  lecteur hors biologie, inscrit dans les deux listes fermées par un diff relu.
- Le chemin `/portail/:idPatient/echanges` est ajouté à la liste de masquage
  de l'observabilité.
- ACT-2 : `WN_ANNONCE_PROTOCOLE=true` posé en production à 09 h 44 UTC, sur
  ordre du responsable, conteneurs web recréés à 09 h 45 UTC (49a2bb19).

## Fichiers modifiés

- Neufs : `web/src/lib/portail/mesEchanges.ts`, `mesEchangesServeur.ts`,
  `mesEchangesDrapeau.ts` ; `web/src/app/api/portail/echanges/route.ts` ;
  `web/src/app/portail/[token]/echanges/page.tsx` ;
  `web/src/components/patient/mes-echanges/` ;
  `web/src/components/patient-companion/LienMesEchanges.tsx`. Chacun a son banc.
- Modifiés : `lib/securite/urgenceSuicide.ts` et `EncartUrgenceSuicide.tsx`
  (variante de la phrase finale) ; `informations/page.tsx` (libellés partagés) ;
  `questionnaires/page.tsx` (lien) ; `docs/FEATURE_FLAGS.md` ;
  `docs/claude/PLAN_WELLNEURO.md` (H61, H75) ; changelog.

## Validations exécutées

- Bancs du lot : 40 verts ; T1 rapide vert après chaque édition.
- Revue `wn-reviewer` : GO drapeau éteint, aucun P0. P1-1 corrigé : garde
  d'âge, avec banc. P2 corrigés : clé du protocole, avec banc, et banc 403.
  Écarté : traces de sécurité sur 401/403, parce que
  `authentifierPatientPortail` est partagé avec les routes TRUST, qui n'en
  posent pas.
- Voir la PR pour T1 complet, T3 (périmètre portail) et le CI.

## Problèmes ouverts

- À relire avec le responsable avant ACT-3 :
  - « Chargement de vos échanges… » et « Aucun élément pour le moment. » ;
  - la limite « protocole indisponible » : le journal ne rejoue pas la règle
    « servi » de l'accueil.
- Écart antérieur (handoff de PA-1) : le POST check-in et le compagnon ne
  gardent pas l'âge.
- ai (H51) : migration autorisée par le responsable le 2026-10-18 ; lot à
  ouvrir.

## Prochaine action exacte

Merger la PR, puis constater le déploiement. Ensuite, le lot ai : migration
(colonne date sur `portail_lectures_patient`), release-db, constat par
conteneur, puis le code consommateur et le bloc « lecture datée » de
« Mes échanges ».

## Interdits encore actifs

- Pas d'ouverture de `WN_PORTAIL_MES_ECHANGES` avant ai et ACT-2 constaté.
- Aucune diffusion provoquée pour le constat d'ACT-2.
- Une release-db à la fois ; une autre session a une migration F80 (#1540).
- Fixtures neutres seulement ; un merge à la fois, déploiement constaté.
