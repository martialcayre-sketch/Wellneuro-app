# Handoff — 2026-10-31 — Audit 3, lot Q1 : les cinq faux « Échec d'envoi » de bilan (D-398)

## Branche et état du dépôt

- Branche `lot/audit3-q1-bilans-erreur`, partie de `origin/main` ae7d82d3
  (contient #1791) ; worktree `j3-12e-ingestion`, session concurrente, cycle
  en `git`/`gh` direct.
- **Migration de données** : la session suit la PR jusqu'au constat par
  conteneur (exception migration de D-373) ; l'intégrateur ne la merge pas.
  Aucun changement de `schema.prisma`. Aucun fichier sous
  `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`.

## Objectif

Premier lot de l'audit 3 (e-mails patient contre traces), écart E1 : le
journal `correspondances_patient` garde des lignes de bilan « Erreur » pour
des confirmations requises ; le panneau Correspondance les affiche « Échec
d'envoi ». Les reprendre en « Non envoyé » par une migration ciblée par clé,
et verser la décision de l'audit.

## Décisions prises

**D-398** (réservée par `wn-reserver-decision.mjs`), arbitrages du
responsable du 2026-10-31 sur la page v3 de l'audit :
- option A aux quatre questions ; lots dans l'ordre Q1, Q4, Q3 ; Q2 sans
  lot, revient avec l'audit 2 ;
- garde d'une heure (lot Q3) sur les e-mails d'accès et d'objectif : refus
  écrit « Non envoyé » avec motif, jamais rejoué, comme D-317 ;
- lot Q1 (§2) : UPDATE des lignes `type='booklet'`, `statut='Erreur'`, clé
  `booklet_envoi` → ligne de `booklet_envois` du même dossier en
  `Confirmation_Requise` ; statut `Non_envoye`, objet du code actuel.
  `erreur_courte` et `booklet_envois` non touchés. La condition « même
  dossier » s'ajoute aux conditions de la demande : elle resserre la cible
  et ne change rien en production (les 5 la remplissent).

Constat avant, en production le 2026-10-31 12:06:59 UTC (conteneur
`one-off-513`, REPEATABLE READ READ ONLY, agrégats seuls) :
- journal : 574 lignes, 564 `Envoye`, 5 `Erreur`, 5 `Non_envoye` ;
- les 5 `Erreur` sont toutes des bilans, avec clé, sur 2 dossiers ; aucune
  autre ligne `Erreur` ;
- les 5 : opération `Registre`, même dossier et même synthèse que leur
  ligne de registre, hors reprise `legacy_booklet_`, objet « Envoi du bilan
  neuronutritionnel », `erreur_courte` égale à celle du registre ;
- les 3 bilans `Non_envoye` récents (2026-09-08 ×2, 2026-10-28) : objet
  « … — en attente de votre confirmation », `erreur_courte` égale à celle
  du registre — d'où l'alignement de l'objet seul ;
- registre : `Confirmation_Requise` 6 `Registre` + 2 `Renvoi`, `Envoye`
  51 `Envoi` + 1 `Renvoi` ;
- aucun trigger sur `correspondances_patient` ni `booklet_envois`.

## Fichiers modifiés

- Nouveaux :
  - `web/prisma/migrations/20261031130000_correspondance_bilans_confirmation_non_envoye/migration.sql` ;
  - `web/src/lib/correspondance/bilans-confirmation-non-envoye.migration.test.ts`
    (3 cas : instruction unique et non destructive, conditions de ciblage
    en conjonction, objets identiques à ceux de la route du bilan).
- Clôture : `docs/DECISIONS.md` (D-398), `changelog.d/2026-10-31-audit3-q1-bilans-confirmation-non-envoye.md`,
  ce handoff.

## Validations exécutées

- Banc neuf vert (3/3).
- Preuve locale sur base jetable (tables réduites, identités de fixture,
  base supprimée après) : 2 lignes visées modifiées (`Registre` et
  `Renvoi`), 6 épargnées (échec réel, autre dossier, autre type, sans clé,
  déjà `Non_envoye`, `Envoye`), `erreur_courte` et date inchangées,
  registre inchangé ; rejeu : `UPDATE 0`.
- T1 complet (`npm run check`) vert, avant et après les retouches de revue.
- T3 (`npm run test:worktree`, sortie redirigée) vert en 7 min 54 s :
  Vitest 15 438 passés ; « Dérive schéma ↔ migrations » : *No difference
  detected* ; contrats SQL verts ; E2E 303 passés. Joué avant les retouches
  de revue, qui ne touchent que le banc et des textes ; le banc a été rejoué
  après elles (4/4).
- Mutation : `erreur_courte = NULL` ajouté au SET fait rougir le banc ;
  migration restaurée, identique à l'index.
- Revue `wn-reviewer` (diff indexé, sans checkout) : **GO**, aucun constat
  bloquant.
  - Corrigés : banc plus strict (colonnes du SET limitées à `statut` et
    `objet`, refus de `NOT` et des commentaires en bloc, sens
    `Renvoi` → « Renvoi… » vérifié côté route) ; D-398 : « six conditions »,
    statut « s'applique après approbation », constat après par clé et
    comptes relevés juste avant l'approbation, renvoi à D-148.
  - Questions répondues par le constat avant : aucun statut hors des trois
    valeurs dans le journal ; l'objet d'origine des 5 lignes est « Envoi du
    bilan neuronutritionnel » (consigné ci-dessus).

## Problèmes ouverts

- Release-db à approuver par le responsable après le merge, puis constat
  après par conteneur (sentinelle liée au run).

## Prochaine action exacte

PR → CI (`wn-attendre-ci.mjs`) → revue CodeRabbit (ou PR-Agent, D-393) →
`wn-sonde-release-db.mjs <N>` = 0 → merge → relever les comptes par type et
statut juste avant l'approbation → demander l'approbation de la release-db
→ constat après par clé (D-398 §4) et `migrate status` à jour → page v3
(E1 : corrigé, date du constat) et mémoire.

## Interdits encore actifs

- Aucune écriture en production hors de cette migration relue et de la
  release-db approuvée par le responsable.
- Aucun identifiant de dossier, nom ou e-mail dans le dépôt, sur la page ou
  dans les commandes.
- Ne pas toucher aux lots Q4 et Q3 ; ne pas refaire l'audit.
- Constat D-353 §5 réservé au 1er au 7 novembre.
