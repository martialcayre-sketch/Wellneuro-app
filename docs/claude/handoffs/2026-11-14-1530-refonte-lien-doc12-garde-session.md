# Handoff — 2026-11-14 — Refonte Lien / Empreinte, DOC-12 : garde serveur du dossier de la page inscrite (D-481, D-488)

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc12-garde-session`, créée depuis `origin/main@5efcdb9a` et avancée par `--ff-only` à `af70261c`, dans le worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT).
- Documentation seule : aucun fichier sous `web/`. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

Inscrire, avant tout code, la forme de la garde qui conditionne Q2a et Q3a de PAT-6 et le texte de son refus.

## Décisions prises

- Q8 a (`20261114-1105-d`) : garde serveur sur les cinq routes d'écriture (`documents`, `comptes-rendus`, `physio-traitements`, `trust/choix`, `trust/signalement`). Un segment différent de l'`idPatient` de la session y est refusé en 409, sans écriture ni notification ; 401 et 403 passent avant.
- Q9 a (`-1501-d`) : segment canonique ; une page ouverte sous un autre segment renvoie à `/portail/<idPatient>` quand une session valide existe.
- Q10 a (`-1502-d`) : T-51, accepté mot pour mot, sous le geste refusé (placement Q5a sur U35, U07, U39).
- Q11 a (`-1520-d`) : sur U40, la mention de sécurité existante sous T-51, puisqu'un signalement refusé n'est ni orienté ni transmis.
- Numéro T-51 : premier libre après T-50 (patient) ; T-46/T-47 laissés libres.

## Fichiers modifiés

- `docs/decisions/D-481.md` (complément DOC-12), `docs/decisions/D-488.md` (titre, amendement DOC-12).
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/registre-textes.md` (numérotation, §2.10, récapitulatif), `plan-patient.md` (PAT-6, suite du 2026-11-14).
- `changelog.d/2026-11-14-refonte-lien-doc12-garde-session.md`, ce handoff.

## Validations exécutées

- Faits relus au code (`main@af70261c`) : atterrissage sur `/portail/<idPatient>` (lien magique, Google), aucun contrôle du segment, appelants des cinq routes, orientation de U40 rendue au seul succès.
- T1 rapide : 16 étapes vertes, 3 sautées ; T1 complet (`npm run check`) : 0 ; `check_no_secrets.sh` : 0.

## Problèmes ouverts

- Ancien favori à segment d'avant la purge du 2026-08-22 : nombre inconnu faute de preuve ; la garde les renvoie à l'entrée (Q9 a).
- Le lot `garde-portail-dossier-session` touche des routes d'API et un gabarit neuf `app/portail/[token]/layout.tsx` ; E2E à segment constant à reprendre.
- Hors lot : accusé explicite sur U35 et U39 (recommandation non décidée) ; séparateur des deux voix et ornements après COM-1.

## Prochaine action exacte

1. CI à 0 (`wn-attendre-ci.mjs` en tâche de fond), PR-Agent prouvé sur la tête, un verdict par remarque, « prête @<sha> » au registre.
2. Puis le lot `garde-portail-dossier-session`, sur une branche neuve depuis `origin/main` ; enfin Q2a et Q3a de PAT-6.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; aucun décor avant COM-1.
- Aucune question, option, cotation, condition d'apparition ni règle d'enregistrement modifiée hors arbitrage ; rien de clinique ; aucun texte de consentement, de droits ni de sécurité modifié.
- Aucune migration, aucun drapeau ; fichiers COM-0 gelés.
- Production en lecture seule ; constat à l'écran en local seulement.
- Jamais de merge par la session ; toute écriture ArtifactData épinglée par `if_version`.
