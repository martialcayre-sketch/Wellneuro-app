# Handoff — 2026-09-26 — Décision D-251 : la fiche d'assiette

## 1. Branche et état Git

`wn-fiche-assiette-decision`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `d1eda359` (#1230, D-250).

## 2. Objectif

Consigner les décisions du responsable sur la fiche d'assiette et ouvrir le
chantier en lots bornés : lot 1 sur 11, documentation seule.

## 3. Décisions prises

- `D-251` : Fiches MY adaptées par IA hors ligne, puis validées par version par
  le responsable. Remise à « Valider pour diffusion ». Espace de lecture au
  portail et e-mail neutre. Précautions dans la fiche, en renvoi vers le
  praticien. V1 la fiche seule, V2 les recettes. Deux migrations autorisées.
- Texte hors dépôt, parce que le dépôt est public : en base HDS.
- Hors campagne, en lots bornés (risque `D-112` nommé).
- Écarté : rouvrir `adviceSheetRef` (champ unique par protocole, `D-200` §2) ;
  servir le PDF (aucun stockage de fichiers) ; basculer `rightsStatus` des douze
  fiches en masse (le registre l'interdit).

## 4. Fichiers modifiés

`docs/DECISIONS.md` (`D-251`) · `docs/claude/campagnes/FILE_ATTENTE.md` (entrée
« hors file ») · `docs/claude/campagnes/CADRAGE_BOUSSOLE_ASSIETTE_2026-09-16.md`
(LOT-04 réorienté) · `web/src/lib/clinical-engine/assietteSurAction.test.ts`
(commentaire seul) · `changelog.d/2026-09-26-fiche-assiette-decision.md` ·
`docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

- Production, lecture agrégée par conteneur : 12 fiches en base, notebook 09,
  un fragment chacune avec preuve de validation (12/12), fragment amendé par
  LLM (12/12), 81 claims VALIDE.
- Cadrage à 6 agents en lecture seule, contre-vérifié. Ses corrections sont
  intégrées : pas de bascule de droits en masse, « pourquoi » tiré des seuls
  claims de la fiche, précautions tranchées par le responsable, rattrapage par
  nouveau clic, drapeau qui garde l'émission et pas la lecture.
- T1 : voir la PR.

## 6. Problèmes ouverts

- Défaut routé : en caducité, le miroir praticien affirme `servieAuPatient=true`
  (`diffusion/route.ts`) alors que le portail ne sert rien. Il appelle sa propre
  correction.
- Le POST de diffusion n'est dans aucune transaction et ne rejoue pas le contrat
  patient : c'est le lot 8 qui le reprend.

## 7. Prochaine action exacte

Lot 2 : `web/src/lib/fiches-assiette/` (appariement assiette → fiche par
`sourceProtocole + 12`, invariants purs, bancs sur texte synthétique).

## 8. Interdits encore actifs

- Aucun texte de Fiche MY, ni aucun brouillon, au dépôt, dans une PR ou un log.
- « Un merge à la fois » (D-248) jusqu'au lot 4 du déploiement.
- Aucune identité patient dans le dépôt.
