# Synthèse — Reprise du développement WellNeuro

Date : 2026-07-09
Dépôt analysé : `martialcayre-sketch/Wellneuro-app`
Objectif : revenir au développement sans ouvrir de nouveau chantier évolutif prématuré.

---

## 1. Conclusion générale

Le dépôt WellNeuro est dans un état plus avancé que la documentation principale ne le laisse penser.

Le code montre une application déjà structurée autour de :

- Next.js 14 App Router ;
- NextAuth Google côté praticien ;
- Prisma 7 + PostgreSQL Supabase ;
- portail praticien ;
- portail patient permanent ;
- packs de questionnaires ;
- moteur « Mon équilibre » ;
- synthèse IA enrichie par l'anamnèse ;
- registre relationnel questionnaires / packs ;
- amorce du moteur d'intention clinique.

Le point critique n'est donc pas d'ajouter immédiatement une nouvelle brique métier, mais de stabiliser le flux central et de réaligner la documentation avec l'état réel du code.

---

## 2. État réel du projet

### 2.1 Socle applicatif

Le socle technique est mature :

- application dans `web/` ;
- production sur `app.wellneuro.fr` ;
- Prisma comme accès principal aux données ;
- NextAuth limité au domaine `@wellneuro.fr` ;
- portail patient sans NextAuth, avec token et session signée ;
- scripts de contrôle existants :
  - `scripts/check_no_secrets.sh` ;
  - `npm run type-check` ;
  - `npm run scoring-check` ;
  - `scripts/release_go_no_go.sh`.

### 2.2 Décommission Google Sheets

Le code récent montre que la dépendance Google Sheets a été très largement retirée :

- le scope OAuth `spreadsheets` n'est plus demandé dans `auth.ts` ;
- la route `migrate-historique` n'existe plus ;
- les routes praticien principales s'appuient sur Prisma ;
- le journal de session indique un lot de décommission Sheets/OAuth finalisé.

Cependant, plusieurs fichiers de documentation restent obsolètes et affirment encore que Sheets est actif côté runtime.

Fichiers à réaligner :

- `README.md` ;
- `AGENTS.md` ;
- `docs/roadmap.md` ;
- `docs/claude/PROJET_CONTEXTE.md`.

### 2.3 Portail patient

Le chantier patient a fortement avancé.

État actuel :

- portail permanent `/portail/[token]` ;
- vérification email ;
- cookie signé `wn_portail` ;
- hub `/portail/[token]/questionnaires` ;
- pages autonomes par questionnaire ;
- brouillon local ;
- reset de brouillon ;
- transmission au praticien ;
- consultation des réponses verrouillées ;
- demande de correction enrichie ;
- consentement groupé mieux tracé.

Le patient ne devrait plus percevoir l'application comme une succession de liens isolés, mais comme un espace patient unifié.

### 2.4 Packs et questionnaires

Le projet dispose maintenant de deux couches :

1. modèle historique simple `Pack.qids` ;
2. registre relationnel normalisé :
   - `questionnaire_categories` ;
   - `questionnaires` ;
   - `questionnaire_secondary_categories` ;
   - `questionnaire_packs` ;
   - `pack_questionnaires` ;
   - `pack_triggers`.

La synchronisation legacy → registre existe déjà dans la route `packs`.

Le chantier restant consiste à faire lire progressivement l'application depuis le registre relationnel, tout en conservant `packs.qids` en fallback temporaire.

### 2.5 Synthèse IA

La synthèse IA a été enrichie :

- exploitation des scores de questionnaires ;
- mini-synthèse déterministe par questionnaire ;
- récupération de la fiche signalétique ;
- récupération de l'anamnèse ;
- extraction déterministe des vigilances :
  - signaux d'alerte ;
  - traitements ;
  - automédication ;
  - compléments ;
- fusion des vigilances déterministes en tête de la synthèse IA.

Cette brique doit maintenant être testée en conditions réelles sur patients fictifs avant extension.

---

## 3. Risques actuels

### 3.1 Risque principal : documentation fausse

Le code et les docs ne disent plus la même chose.

Conséquence : un agent IA ou un développeur humain peut repartir sur une mauvaise hypothèse, par exemple croire que Sheets est encore une dépendance active.

### 3.2 Risque produit : empilement trop rapide

Plusieurs chantiers avancés sont déjà amorcés :

- Mon équilibre ;
- boussole alimentaire ;
- moteur d'intention clinique ;
- compléments clean label ;
- protocoles 21 jours ;
- synthèse IA enrichie.

Il faut éviter d'ajouter une couche avant validation du flux central.

### 3.3 Risque UX patient

Le portail patient est fonctionnellement avancé, mais il reste à vérifier :

- fluidité mobile ;
- non-ressaisie réelle de l'email ;
- clarté du hub questionnaires ;
- bon comportement des brouillons ;
- retour hub après transmission ;
- lisibilité des statuts.

### 3.4 Risque clinique

La synthèse IA est mieux alimentée, mais doit rester dans le cadre prévu :

- elle ne doit pas décider seule ;
- les vigilances déterministes doivent rester garanties ;
- aucune prescription automatique ne doit être produite avant validation du noyau sécurité / priorisation.

---

## 4. Position stratégique recommandée

La bonne posture actuelle est :

> Stabiliser l'existant avant d'évoluer.

Cela signifie :

1. ne pas lancer immédiatement le module compléments ;
2. ne pas ouvrir encore le RAG SIIN complet ;
3. ne pas automatiser les protocoles 21 jours ;
4. ne pas enrichir la synthèse IA avant test E2E ;
5. finaliser le parcours patient + praticien existant ;
6. réaligner la documentation ;
7. valider les packs de base.

---

## 5. Prochaine action prioritaire

Le prochain lot recommandé est :

> R0 — Réalignement documentaire et reprise de pilotage.

Objectif :

- mettre la documentation au niveau du code ;
- figer la roadmap de reprise ;
- éviter les mauvaises hypothèses ;
- préparer une validation E2E propre.

Ensuite seulement :

> R1 — Validation E2E du parcours patient unifié sur patient fictif.

---

## 6. Décision de reprise

Décision proposée :

> Reprendre le développement non pas par une nouvelle fonctionnalité, mais par une séquence courte de consolidation : documentation, E2E, corrections UX, finalisation pack de base, puis transition progressive vers le registre relationnel.

Cette stratégie réduit le risque, améliore la confiance dans la production et prépare le terrain pour les modules avancés.
