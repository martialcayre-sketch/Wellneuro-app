# Handoff — 2026-11-12 — PAT-4 : préalables, DOC-7 et lot Q5b séparé

## Branche et état Git

Branche docs/pat4-prealables, worktree .claude/worktrees/codex-pat4-prealables,
base main@50b0e4cf. Documentation seule. Copie principale non modifiée.
Avant le premier commit, la branche a été recréée sur origin/main avancé,
en conservant deux fichiers neufs non suivis ; aucun merge ni rebase.
PR non encore ouverte à cette rédaction ; ne pas merger dans cette session.

## Objectif

Préparer et faire trancher les quatre préalables au code de PAT-4 :
visibilité de l'alerte, brouillon alimentaire sur l'appareil, textes exacts
et emplacement de reconnexion. Aucun code applicatif.

## Décisions prises

- [[D-506]], numéro réservé : Q1b amende D-277 §1, entrée et questionnaires ;
  revient sur PAT-2 Q7a. Q11b impose les mesures produit, Chromium/WebKit puis
  téléphone réel, et retour au responsable en cas de dépassement.
  Après revue, précision acceptée : une fois à chaque apparition,
  récapitulatif compris ; aucune poursuite du patient qui s'éloigne.
- [[D-507]], numéro réservé : Q5b ; 30 jours depuis la dernière écriture,
  seules notes confirmées effacées après transmission, purge avertie à la
  déconnexion selon D-244, rappel appareil partagé et information RGPD.
  Fiche de réalisation distincte de PAT-4.
- DOC-7, prochain libre vérifié sur main et PR ouvertes : [[D-488]] et
  [[D-481]] ; T-40 à T-44 et T-48 tous acceptés individuellement.
  T-41a initialement refusé, puis correction directe « t41a retirer l'émoji » :
  verdict final accepté sans tasse.
- T-49 et T-50 acceptés mot pour mot, non publiés, réservés au lot Q5b.
  T-45 sans objet ; T-46/T-47 restent libres.
- Q6a : deux agendas capables de servir des 401. Connexion vers l'entrée,
  puis Mon parcours et réouverture, aucun retour direct à l'assignation.

## Fichiers modifiés

D-506/D-507 créés ; D-277, D-481, D-488 ; registre des textes et plan patient ;
pat4-prealables.md ; lot-q5b-brouillon-appareil.md ; deux fragments
changelog.d/2026-11-12-pat4-* ; ce handoff.

## Validations exécutées

- Sources des textes relues sur main@470700859, inchangées à main@50b0e4cf.
- Prototype, Questions.md, Registre-textes.md et onze réponses de la liste
  commune lus dans Chrome ; boîte D sans message non traité au relevé.
- T1 initialement en échec : client généré absent, puis client partagé périmé.
  Génération locale Prisma seule, configuration temporaire sans dotenv,
  aucune connexion base ni migration. T1 corrigé : 16 étapes vertes.
- Compléments du contrôle complet : hooks 417/417 ; outillage 845 passés,
  un ignoré, zéro échec. Anti-secrets sur les lignes indexées et diff-check
  verts. Scan global non joué : il lirait .env.example, interdit par AGENTS.md.
- wn-reviewer : GO documentaire ; P1 du déclenchement soumis au responsable,
  réponse inscrite ; P2 unités du prototype qualifiées et surface praticien
  de T-48h signalée. Contre-vérification ciblée : GO, tous les constats
  corrigés ; deux précisions de renvoi/réception ajoutées ensuite sans
  changement de règle. Aucune question clinique ne reste ouverte.
- Aucun scénario applicatif, mesure de hauteur réelle ou accès production.

## Problèmes ouverts

- Aucun outil ArtifactData avec if_version : nouveaux arbitrages, textes,
  décisions et suivi PAT-4 non reportés hors dépôt. Les trois pages sont
  lisibles par Chrome ; aucun contournement d'écriture tenté.
- La page patient affichait « Aucun lot enregistré » et aucun journal
  malgré le récapitulatif. Relire les collections avant toute écriture ;
  ne pas inventer la fiche ni l'id de journal.
- PR-Agent et CI de tête encore dus à cette rédaction.
  Aucune déclaration « prête » tant que ces obligations restent ouvertes.

## Prochaine action exacte

Ouvrir une unique PR documentaire en brouillon et suivre CI/PR-Agent.
Reporter les nouvelles lignes et le suivi
avec if_version dès que l'outil est accessible ; relire la boîte D.
CI et revue de tête concluants requis pour « prête @<sha> ». Aucun merge ici.

## Interdits encore actifs

Aucun code applicatif, migration, schéma, drapeau, règle de recueil ou seuil ;
aucune donnée réelle ni fichier d'environnement. Aucune écriture production.
Aucun texte publié avant son comportement effectif. Aucun merge par cette
session ; ne pas fermer les questions de la liste commune avant le merge.
