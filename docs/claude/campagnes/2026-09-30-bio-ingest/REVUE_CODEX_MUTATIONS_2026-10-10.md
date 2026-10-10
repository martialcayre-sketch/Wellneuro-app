# Contre-revue adverse — BIO-INGEST, passe des mutations (2026-10-10)

Date : 2026-10-10. Cible : `cc3f2f30` (après #1385), copie jetable et propre.
Énoncé : `PROMPT_CONTRE_REVUE_CODEX_MUTATIONS_2026-10-10.md`, dans ce dossier.
Jouée par Codex, lancée par le responsable. Ce fichier reproduit son verdict.
Il donne ensuite les mutations que l'auteur du code a jouées pour fermer ce
que la passe laissait ouvert, et les bancs ajoutés.

## 1. Verdict du contre-relecteur

**Aucune faiblesse de banc confirmée sur M12, M13 ou M17. M14 non
vérifiable.** Le contre-relecteur a joué des mutations **différentes** de
celles que l'auteur avait jouées en écrivant #1385.

| # | Mutation (contre-relecteur) | Résultat | Verdict |
|---|---|---|---|
| M12 | liste des transmissions sans le filtre `origine: 'patient'` (`transmission.ts`) | 2 tests rouges | `MORD` |
| M13 | capacité du portail tenue par `WN_BIO_PORTAIL_ENABLED` seul, sans les drapeaux de l'import (`featureFlag.ts`) | 3 tests rouges | `MORD` |
| M14 | clé du verrou du dépôt suffixée par `Math.random()` (`transmission.ts`) | unitaire vert ; banc PostgreSQL interrompu après deux minutes sans sortie | `NON VÉRIFIABLE` |
| M17 | suppression des lectures d'import remplacée par un compteur nul (`effacement.ts`) | 2 tests rouges | `MORD` |

Contrôles du contre-relecteur sans mutation : 7 fichiers, 75 tests verts ;
`npm run check` vert.

**Non jouées dans cette passe** : M1 à M11, M15, M16, M18. Aucun autre
résultat de mutation n'a été versé.

**Révision de la passe sur lecture.** Rejouée sur `cc3f2f30`, elle retire la
réfutation de C2 : le `FOR SHARE` du dépôt et le `FOR UPDATE` de l'effacement
ferment la course. Elle maintient B2 et C3 `RÉFUTÉE` sans argument neuf. Leur
traitement (`REVUE_CODEX_ADVERSE_2026-10-10.md` §2) reste inchangé : B2
affaiblie, trouvaille écartée ; C3 résiste, réfutée par l'expérience.

## 2. Ce que l'auteur a joué ensuite

Même cible, copie jetable, base PostgreSQL locale (`scripts/wn-dev-db.sh
--migrate`). Bancs désignés avant chaque mutation ; mutation restaurée après
chacune.

| # | Mutation | Bancs | Résultat | Verdict |
|---|---|---|---|---|
| M14 | celle du contre-relecteur (clé aléatoire) | `scripts/banc-plafond-transmission-deux-depots.test.ts`, lancé seul | témoin vert ; muté : « 2 dépôts devaient attendre le verrou du dossier : la course n'a pas eu lieu », en quelques secondes | `MORD` |
| M16 | `...classeEtCode(err)` / `signature(err)` remplacés par le message de l'erreur, dans `api/portail/comptes-rendus/route.ts`, `api/praticien/biologie/resultats/bilan/route.ts`, `scripts/purgeComptesRendusEcheance.ts` (un à la fois) | `journaux.guard.test.ts`, bancs des deux routes | tout vert, sur les trois fichiers | **`SURVIT`** |
| M18 | garde retirée de `api/praticien/biologie/import/decisions/route.ts` (drapeaux, session, appartenance) | tous les tests qui citent la garde ou les routes d'import (12 fichiers, 180 tests), lint, `tsc` | tout vert | **`SURVIT`** |

M14 : le banc ne bloque pas. Lancé par `test:worktree -- --fast`, il tourne
APRÈS les suites et sa sortie va à `/dev/null`. Deux minutes sans sortie, c'est
la suite qui tourne, pas le banc qui attend.

M16 : un premier essai sur `bilan` a rougi pour une autre raison. `.message`
lu sur `throw null` lève dans le gestionnaire, et le test le voit. Rejouée sous
une forme qui ne lève pas, la mutation survit.

## 3. Trouvailles et correctifs

### M16 — le garde des journaux ne couvrait que `import/` — `CONFIRMÉE`, corrigée

D1 tient sur le code : chaque journal de ces fichiers écrit classe et code.
Mais rien ne le gardait. `journaux.guard.test.ts` ne lisait que les dossiers
`import/` ; le portail, la saisie du praticien et le cron de purge en étaient
hors. Correctif : le périmètre s'étend à `api/portail/comptes-rendus`,
`api/praticien/biologie/resultats` (unitaire et groupée) et au script de
purge, hors de `src/`. `signature()` (`saisieMessages.ts`, nom et code Prisma)
rejoint `classeEtCode` comme neutraliseur. Rejouées après : les trois
mutations, et l'erreur nue dans `bilan`, rougissent.

Le script de purge prend son erreur dans `.catch(err => …)`, pas dans un
`catch`. La première version du garde n'y voyait que `.message` et `.stack`
(revue Copilot de la PR). Le paramètre du rappel d'un `.catch` compte
désormais comme l'erreur d'un `catch` : `err`, `String(err)` et
`JSON.stringify(err)` y rougissent aussi.

### M18 — la route des décisions n'avait aucun banc — `CONFIRMÉE`, corrigée

C'est la seule route d'un import vers `resultats_biologiques`. Le code est
juste : la garde précède tout. Mais sa suppression ne rougissait rien.
Correctif : `import/decisions/route.test.ts`, 11 cas. L'e-mail vient de la
session, jamais du corps. Chaque drapeau éteint rend 503, sans session 401,
autre praticien 403, introuvable 404, dossier clos ou désactivé 409, corps ou
extraction mal formés 400 : à chaque fois, aucune décision. Un refus métier
rend son statut et ses lignes ; une exception, un 500 dont la réponse est
comparée en entier (revue Copilot de la PR). Rejouées après : la garde
retirée fait rougir 7 cas sur 11, et le détail de l'erreur versé dans la
réponse les fait rougir aussi.

## 4. Ce qui reste

- **M1 à M11 et M15** : aucun résultat de mutation versé. Les bancs
  correspondants n'ont pas été éprouvés par le contre-relecteur.
- **Lot de clôture** : forme exacte de B2, D4 et dossier RGPD, écarts entre
  fiche et code, constat d'usage (pris le 2026-10-10, en agrégats), suivi
  BioFlow.
