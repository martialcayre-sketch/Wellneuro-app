# Handoff — 2026-10-05 soir — BioFlow : état de la nuit et blocages

## Branche et état Git

`docs/bio-parcours-bp26-trame` (cette PR), depuis `main` 99b07dda. Deux
autres PR sont ouvertes et vertes : #1330 (BP-02). #1328 (`usage_ia` v5) est
mergée.

## Objectif

Consigne du responsable pour la nuit : enchaîner les lots qui ne demandent
pas son arbitrage, et tenir le suivi BioFlow à jour (page hors dépôt).

## Ce qui est fait

- #1328 mergée : `usage_ia` v5 et registre RGPD (LOT-07, `D-267` §8).
- #1330 (BP-02) verte, **non mergée**. Constat d'usage en agrégats : 2
  protocoles V4 diffusés, 0 check-in, 1 import réel à moitié décidé,
  `clinical_rules` vide.
- Cette PR (BP-26) : trame de qualification de 11 fonctions servies et 7
  nouvelles. La contre-revue `wn-reviewer` est faite et corrigée.

## Blocages (gestes du responsable)

1. **Déploiement de #1328 non parti.** Le job `deploiement` du run 37351702470
   est resté en attente sans runner depuis 17:52 UTC. La production est encore
   sur 57dfcdae ; #1327 et #1329 (doc) n'y sont pas non plus. La relance
   (`Déploiement production`, action `deployer`) a été **refusée à
   l'assistant** par le classifieur, ainsi que les merges qui la
   déclencheraient. À faire : relancer le déploiement, constater
   99b07dda (ou plus récent) en service, puis constater la v5 servie.
2. **Merges de #1330 et de cette PR**, à faire après le déploiement, un à la
   fois.
3. **LOT-07, code `bio-extraction-v2`** : la fiche interdit toute ligne avant
   la v5 constatée. La carte du code est faite (extraction, parseur à clés
   exactes, `createMany` de `lancerExtraction.ts`, `select` de `lecture.ts`,
   `CHAMPS_LUS` de `resultats/route.ts`, sentinelle à exemption bornée). Passe
   Codex obligatoire.
4. **BP-26** : le responsable statue ligne par ligne, après relecture du
   texte officiel de MDCG 2019-11 Rev.1.

## Non entrepris, et pourquoi

- **BP-23** (relecture réelle) : `review: null` se propage jusqu'au contenu
  patient (`contenuPatientProtocole.ts:101` exige `practitioner_reviewed` et
  une revue). L'effet sur le statut et la diffusion est à cadrer en mode Plan.
  La lecture du code a aussi été interrompue par le classifieur.
- **BP-25** : il faut une décision qui amende `D-105` et une re-signature de
  tables cliniques (responsable).
- **Panels, PR 1** : c'est une décision de rationalisation (responsable).

## Validations exécutées

`npm run check` vert sur chaque branche ; T2 `--fast` vert sur #1328 ; CI vert
sur #1328 et #1330.

## Interdits encore actifs

- Aucun code LOT-07 avant la v5 constatée ; aucune conclusion BP-26 de session.
- Un merge à la fois, déploiement constaté entre deux.
