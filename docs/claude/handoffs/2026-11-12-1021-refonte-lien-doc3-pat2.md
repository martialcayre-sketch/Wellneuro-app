# Handoff — 2026-11-12 — DOC-3 : arbitrages PAT-2, sans code

## Branche et état du dépôt

- Branche `codex/refonte-lien-doc3-pat2`, depuis `origin/main@5bd76ae4`.
- DOC-2 (#2009) a été fusionné pendant la préparation ; le contrôle avant
  écriture l'a détecté. Aucun changement n'a été poussé sur son ancienne branche.
- Aucun DOC-n concurrent à l'ouverture de DOC-3 ; aucun nouveau numéro D-xxx.
- Édition via GitHub, snapshot documentaire local partiel ; pas de worktree
  applicatif complet ni de code modifié.

## Objectif

Inscrire les arbitrages écrits du responsable du 2026-11-12 sur le
prototype PAT-2, itération 2 : « Q1a — Q2a — Q3b — Q4a », puis reporter
l'inscription au suivi patient, en gardant Q5 à Q7 ouvertes.

## Décisions prises

- D-333 §1 : précision de la famille 1 pour les seuls repères d'entrée.
- D-481 : maintien du lien U02 ; date en lettres dans PAT-6 ; fond léger
  périphérique sur les neuf écrans, par LienDecor, sans anneaux.
- T-35 « Revenir à la connexion » proposé, **non accepté** ; aucun ajout
  aux textes acceptés de D-488. Q5, Q6 et Q7 restent ouvertes.
- Suivi privé non modifié : consultation soumise à connexion. Report exact
  à appliquer conservé dans `pat2-arbitrages.md`, sans identifiant inventé.

## Fichiers modifiés

- `docs/decisions/D-333.md` et `D-481.md`.
- Étape 2 : `README.md`, `plan-patient.md`, `registre-textes.md`,
  nouveau `pat2-arbitrages.md`.
- `changelog.d/2026-11-12-refonte-lien-pat2-arbitrages.md`, ce handoff.
- Les fichiers et le handoff de DOC-2 fusionné sont préservés.

## Validations exécutées

- Sources relues : D-481, D-333, D-488, plans, registre, lien U02 et
  DocumentTrust. T-35 absent du registre et de D-488 avant ajout.
- Sept tests unitaires du CLI `wn-decisions` réussis, sélectionnés par
  `--test-name-pattern='^(numero|lireDecision|lireDecisions|arguments|sorties)'`.
- L'essai initial incluant le test d'intégration « le dépôt » a échoué :
  le snapshot partiel ne contient pas D-418 ni le registre complet.
  Ce test n'est pas annoncé vert ; le rejouer dans le dépôt complet.
- Tables Markdown, unicité et statut de T-35, renvois aux décisions
  contrôlés ; diff limité aux huit fichiers Markdown ; fins de ligne vérifiées.
- T1 complet, T2 et script anti-secrets du dépôt non exécutés dans ce
  snapshot ; aucune PR déclarée prête. CI et revue de la tête restent à suivre.
- Aucun constat visuel nouveau du prototype ni test applicatif.

## Problèmes ouverts

- Q5 : action de reconnexion et libellé à inscrire.
- Q6 : brouillon dans l'onglet (sessionStorage), formulation « sur cet appareil ».
- Q7 : emplacement de l'alerte suicide sous la case, plutôt qu'après la liste.
- T-35 attend son acceptation mot pour mot et son inscription DOC-n.
- Page de suivi patient : accès authentifié requis ; report non effectué.
- COM-1 reste le préalable de réalisation du décor ; DOC-2 est mergé.

## Prochaine action exacte

Rejouer les contrôles du dépôt complet et relire la tête de la PR DOC-3
avant toute déclaration prête. La session autorisée met à jour la note
PAT-2 et ajoute le journal décrit dans `pat2-arbitrages.md`, avec sa version
courante et un identifiant libre ; aucun changement de statut du lot
n'est déduit de cette inscription. Soumettre Q5–Q7 séparément ; réaliser
la date en lettres dans PAT-6 seulement.

## Interdits encore actifs

- Aucun code, route, garde, questionnaire, stockage, schéma ou drapeau modifié.
- Aucun compteur de menu ni score patient nouvellement autorisé.
- Aucune acceptation de T-35 ou de Q5–Q7 déduite des quatre choix.
- Aucun merge ni déploiement annoncé ; aucun dossier réel ni secret au dépôt.
