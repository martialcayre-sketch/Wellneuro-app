# Handoff — accueil praticien : moins de défilement (2026-09-13 12:26)

## Branche et état Git

- **Mergé sur `main`** : `506e1da2` (PR #1074) puis `cad2d617` (PR #1077).
- Branches supprimées (`accueil-moins-de-defilement`,
  `accueil-rail-suivi-sous-correspondance`). Rien ne reste en vol.
- **Clôture écrite depuis `main`** en PR de doc séparée : les deux PR du lot ont
  été mergées en squash avant que la clôture soit écrite (fenêtre ratée).

## Objectif

Demande propriétaire du 2026-09-13, formulée sur capture de l'accueil praticien :
« transférer l'inbox questionnaires dans le Fil du jour […] la position actuelle
demande trop de défilement […] limiter au maximum les scrollings ».

## Décisions prises

1. **L'inbox questionnaires passe en tête de la colonne principale**, au-dessus
   de la timeline. Elle garde sa forme — une ligne par patient, tiroir de
   lecture, confirmation de lecture : la décision du 2026-07-23 (inbox groupée
   plutôt que cartes « Reçu » fondues dans le Fil) **n'est pas rouverte**, seule
   sa PLACE change. *Écarté* : fondre les réponses en cartes de la timeline.
2. **Un panneau vide ne coûte plus qu'une ligne** — `PanneauRail`, coque commune
   des six panneaux. Replié, il garde titre + état visibles ; le texte complet
   est à un clic dans un `<details>`. *Écarté* : un rail à onglets — il tient
   sur un écran mais rend invisibles quatre panneaux sur cinq.
3. **Le rail se dédouble au-delà de 1536 px** (deux colonnes de 300 px). Sous
   `2xl`, les deux groupes se réempilent.
4. **Ordre du rail, arbitré sur capture** : Nouveaux patients seul en tête, puis
   File d'envoi · Correspondance récente · Météo d'adhésion · Agendas du
   sommeil.

## Les deux gardes qui portent le sens

- **Une lecture en échec ne se replie JAMAIS.** « Momentanément indisponible »
  n'est pas « il n'y a rien » : replier le premier ferait conclure le second.
  Chaque appelant calcule `vide = chargé ET disponible ET sans ligne`.
- **L'inbox ne se replie pas tant que l'ancre a écarté des réponses.** Replier
  sur le seul `lignes.length === 0` aurait caché le dépliant « N réponses reçues
  avant la dernière consultation du dossier » — le cas le plus fréquent en
  production, et le seul endroit de l'accueil qui nomme ce que l'ancre tait.

## Fichiers modifiés

- `web/src/components/fil/PanneauRail.tsx` **(nouveau)** + son banc.
- `web/src/app/dashboard/page.tsx` — disposition, ordre, commentaires.
- Les six panneaux passés à la coque : `InboxQuestionnaires`,
  `NouveauxPatientsAside`, `MeteoAdhesionAside`, `FileEnvoiAside`,
  `CorrespondanceRecente`, `agenda-sommeil/AgendasEnCoursAside`.
- `changelog.d/2026-09-13-accueil-moins-de-defilement.md`.

## Validations exécutées

- **T2 verte deux fois** (`npm run test:worktree -- --fast`) : 9016 unitaires
  (1 skipped) + 196 e2e, ~3 min 25 s puis 4 min 18 s.
- CI `verify` réellement joué et vert sur #1074 et #1077 (`wn-attendre-ci` = 0).
- Revue à l'écran sur **build de production**, 1440 px et 2560 px.
- Aucune baseline visuelle ne photographie l'accueil : les six existantes
  (fiche, portail) sont intactes.

## Problèmes rencontrés — et ce qu'ils apprennent

- **Un run CI peut rester `queued` sans créer un seul job.** Sur #1074, 45 min à
  zéro job pendant qu'un run plus récent d'une autre branche terminait : ce
  n'est pas un backlog de runners. Remède appliqué : fermer puis rouvrir la PR
  (`pull_request: reopened` re-déclenche). Ne pas chercher la cause dans le diff.
- **Une PR peut être mergée pendant qu'on travaille encore dessus.** #1074 a été
  mergée à 09:51 alors que l'arbitrage du rail était en cours ; le second commit
  est resté orphelin sur la branche squashée. Remède : brancher depuis
  `origin/main` et `cherry-pick` — jamais rebrancher sur la branche squashée.
- `gh pr merge` a rendu « `main` is already used by worktree » **alors que la PR
  était mergée**. Vérifier l'état, jamais relancer.

## Problèmes ouverts

- **Mise en ligne non vérifiée** : Scalingo déploie la tête de `main`, pas chaque
  SHA — `cad2d617` n'a pas été constaté sur `app.wellneuro.fr`.
- La branche par défaut LOCALE diverge d'`origin` (ahead 0 / behind 39) : ne pas
  s'en servir comme base, la réconciliation est un arbitrage humain.
- Hors lot, inchangés : clôture de l'agenda alimentaire (`a_transmettre` sans
  CTA), second `T0`, lettre DPA, trois trous du § 7 RGPD.

## Prochaine action exacte

Constater la mise en ligne de `cad2d617` par contenance
(`git merge-base --is-ancestor`), jamais par égalité de SHA — puis regarder
l'accueil en production sur un écran large.

## Interdits encore actifs

- Aucune identité patient réelle dans le dépôt ; aucun seed ni E2E sur un
  dossier réel.
- Production : lecture par `scalingo run -d` uniquement ; écriture par migration
  relue puis `release-db` approuvée.
- Pas de `schema.prisma`, pas de clinique/scoring sans demande explicite —
  ce lot n'a touché ni l'un ni l'autre.
