# Handoff — file D, d37 : note au conseil (art. 17 §3) et « Vos droits et vos choix » v2

## Branche et état Git

- Branche `feat/file-d-d37-droits-patient-v2`, worktree `file-d1-suite`,
  partie de `origin/main` @028039a2 (2026-11-05), remise à niveau sur
  @f3e1bc99 (D-444) : registre en conflit de tête, D-445 réinsérée au-dessus.
- #1868 (d33) reste ouverte, déclarée « prête @43a02129 » ; l'intégrateur
  merge, pas cette file.
- D-445 réservée (`refs/tags/reserve/D-445`).

## Objectif

Préparer d37 : la question au conseil sur une conservation opposable à un
effacement (art. 17 §3). Corriger ensuite la promesse fausse relevée en
chemin, sur arbitrage du responsable.

## Décisions prises

Arbitrages du responsable du 2026-11-05 :

- la note part chez l'avocat consulté le 2026-10-22, **en complément** du
  dossier des mineurs ; elle y joint le point de départ des 10 ans (D-283
  §10 b) ;
- aucune facture n'est émise à ce jour, ni dans l'application ni en dehors ;
- la phrase « votre historique […] n'est jamais effacé » se corrige **sans
  attendre** l'avis : formulation « tant que votre dossier existe », **sans
  accusé**, résumé court (D-445) ;
- envoi en PDF, depuis une copie sans les encadrés internes.

Pièces hors dépôt (Claude Docs) : la note de travail `APpaNb8QaHGc7YvTcrMwqU`
et sa version d'envoi `VzgzEdMSZZmYtKNPBnPn23`, à exporter en PDF par le
responsable. Contre-lecture Codex sur main @88bbfa9c : ENVOYABLE APRÈS
CORRECTIONS. Chaque remarque a été vérifiée dans le code, puis corrigée
(résidu, courriels gardés 5 ans, copies sorties, purges, bases légales,
questions 2, 4, 5 et 6 reformulées, deux questions ajoutées) ou écartée avec
motif (table des tentatives sans lien au dossier, journaux non affirmés par la
note, réserve de clôture et version v22 sans effet sur le texte).

## Fichiers modifiés

- `web/src/lib/trust/contenus/registre.ts` : `DROITS_PATIENT_V2`, une phrase
  remplacée, sans accusé.
- `web/src/lib/trust/contenus/registre.test.ts` : liste figée, et un banc qui
  relit D-445 §1 et vérifie que rien d'autre ne change.
- `docs/DECISIONS.md` : D-445.
- `docs/DOSSIER_RGPD.md` : rubrique 8, une précision sur l'ajout seul.
- `changelog.d/2026-11-05-d445-droits-patient-v2.md`, ce handoff.

## Validations exécutées

- Vitest `src/lib/trust`, `src/app/api/portail/trust`,
  `src/components/patient/trust`, `src/app/portail` : 524 verts.
- T1 rapide : code 0. T1 complet : code 0.
- T2 (`test:worktree -- --fast`) : voir la PR.

## Problèmes ouverts

- La note est à envoyer par le responsable ; l'avis se verse au registre
  (porte 28) et ses conséquences partent en D-xxx. La question 4 peut appeler
  une v3 de `droits_patient`.
- Copies sorties de l'application (export, envois à Anthropic, e-mails,
  documents remis) : aucune règle d'effacement, question 6 de la note.
- d25 et d31 restent ouvertes ; d58, d56, d59, d53, d22 en attente.

## Prochaine action exacte

1. PR, `wn-attendre-ci` en fond, revue (CodeRabbit ou PR-Agent), un verdict
   par remarque, puis « prête @<sha> ».
2. Le responsable exporte la version d'envoi en PDF et l'envoie.
3. Ligne suivante de la file D au choix du responsable : d25 ou d31.

## Interdits encore actifs

- Rien sous `web/src/lib/clinical/` ni dans `indicationsBiologieV1.ts` ;
  ni migration ni `schema.prisma` ; aucune écriture en production.
- Aucune valeur, aucun seuil ni aucune source clinique proposés par la
  session (DC-20). Aucune D-xxx sans arbitrage du responsable.
- Un assistant externe n'est jamais la source d'une valeur, ni d'une réponse
  juridique : la question 17 §3 est pour l'avocat. Aucun identifiant Drive
  dans le dépôt. Jamais de jeton dans le dépôt ni la conversation.
- Aucun UPDATE du contenu d'une passation (LOT-00).
- Essai de D-373 : déclarer « prête », ne pas merger.
