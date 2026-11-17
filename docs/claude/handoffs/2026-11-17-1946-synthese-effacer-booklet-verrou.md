# Handoff — file D, lot `synthese-effacer-booklet-verrou` : « vider » et l'envoi du booklet sous le même verrou du dossier (2026-11-17)

## 1. Branche et état Git

- Branche `fix/synthese-effacer-booklet-verrou`, tirée d'`origin/main` b8f0af61 (#2227), puis avancée par `--ff-only` sur 36f688ec (#2229, mineurs, sans fichier commun). Worktree `.claude/worktrees/orch-ci`.
- Carnet : lot `synthese-effacer-booklet-verrou` (file D, ordre 91), pris le 2026-11-17 à 18:41Z.
- Code touché :
  - `web/src/app/api/praticien/synthese/route.ts` (PATCH, `effacer`) ;
  - `web/src/app/api/praticien/booklet/route.ts` (POST) ;
  - leurs bancs, et le banc sur base réelle `web/src/lib/correspondance/reservation.pg.test.ts` ;
  - une note d'amendement datée au bas de `docs/decisions/D-399.md`.
- Rien d'autre n'est touché : aucune migration, aucun écran, rien de `web/src/lib/clinical/`.

## 2. Objectif

Fermer le P3-3 que `wn-reviewer` a relevé sur #2226. « Effacer » contrôlait hors verrou l'envoi du booklet, et l'envoi ne prenait pas le verrou du dossier. Un booklet pouvait donc partir d'une synthèse vidée entre-temps. Démontré dans le code, sans occurrence observée.

## 3. Décisions prises

- **« Effacer » contrôle le booklet dans la transaction**, après `SELECT … FROM patients … FOR UPDATE`. Il lit d'abord le journal (`correspondancePatient`, type `booklet`, `FILTRE_ENVOIS_PARTIS` : parti ou réservé en partance), puis l'audit `bookletEnvoi` `Envoye`, qui couvre les envois d'avant le journal. Le message 409 est inchangé.
- **L'envoi prend le verrou consultatif du bilan, puis le verrou du dossier.** La clé `envoi_patient:booklet:*` n'est prise que par cette route, et « effacer » ne prend que le verrou du dossier : aucun interblocage n'est possible.
  - Le premier jet prenait le verrou du dossier d'abord. Le P1 de `wn-reviewer` a montré que le banc sur base réelle (croisement de deux envois sur le verrou du bilan) rougissait alors ; c'est reproduit en local.
  - L'ordre retenu est aussi celui des autres e-mails réservés : verrou d'envoi, puis ligne du dossier.
- **L'envoi relit `updatedAt` sous le verrou.** Si la synthèse a changé depuis la lecture qui a servi au rendu, il répond 409 « La synthèse a été modifiée entre-temps. Rechargez-la avant de recommencer. ». Ce refus n'est pas tracé au journal, comme le refus d'un dossier clos : rien n'est parti, et le praticien a la réponse à l'écran.
- **Le renvoi confirmé réserve aussi sa ligne**, sans lire le registre : il part toujours, même si un autre vient de partir.
  - Sans cette marque, un renvoi en vol sur une synthèse jamais envoyée avec succès échappait au vidage.
  - D-399 (en-tête et §5) disait l'inverse. C'était un choix de mise en œuvre, pas un choix du responsable : il est amendé par une note datée (P2 de `wn-reviewer`), et son témoin est remplacé.
  - La ligne réservée d'un renvoi naît « Renvoi du bilan » (P3-1). Restée marquée, elle dit donc juste.
- **Revue `wn-reviewer`** : NO-GO sur le premier jet, à cause du seul P1 ; GO sur le second, sous condition des fins de ligne, rétablies depuis.
  - P1 (ordre des verrous et banc pg) : corrigé.
  - P2 (D-399 contredit sans note) : corrigé par l'amendement.
  - P3-1 (objet d'un renvoi en vol) : corrigé.
  - P3-2 (le 409 « modifiée entre-temps » n'écrit pas d'audit) : écarté. Rien n'est parti ni réservé, et le refus d'un dossier clos ne trace pas davantage. Le praticien a la réponse à l'écran.
  - Note sur une collision de `hashtext` : l'ordre retenu supprime l'inversion de verrous.
  - Questions de la revue : l'amendement est retenu plutôt qu'une nouvelle D-xxx. Une sortie praticien pour une ligne restée marquée est hors périmètre ; aucun lot n'est ouvert, faute d'occurrence.

## 4. Fichiers modifiés

- `web/src/app/api/praticien/synthese/route.ts`, `route.manual.test.ts`
- `web/src/app/api/praticien/booklet/route.ts`, `route.test.ts`
- `changelog.d/2026-11-17-synthese-effacer-booklet-verrou.md`
- ce handoff

## 5. Validations exécutées

- Vitest `synthese/` et `booklet/` : 392 tests sur 392.
- Six contre-épreuves, dont chacune rougit ses témoins, et tout redevient vert une fois la correction rétablie (86 sur 86) :
  1. route synthèse remise à `origin/main` : 3 rouges ;
  2. route booklet remise à `origin/main` : 5 rouges ;
  3. « effacer » sans lecture du journal : 1 rouge ;
  4. envoi sans verrou du dossier : 2 rouges ;
  5. envoi sans relecture : 2 rouges ;
  6. renvoi sans réservation : 2 rouges.
- Banc sur base réelle (`reservation.pg.test.ts`, base locale du worktree) : 12 sur 12, dont deux croisements neufs. Le premier vérifie qu'un envoi en vol empêche le vidage, le second qu'un vidage glissé avant la réservation fait refuser l'envoi. Les cinq contre-épreuves rougissent :
  1. route synthèse remise à `origin/main` ;
  2. « effacer » sans lecture du journal ;
  3. envoi sans relecture ;
  4. ancien ordre des verrous : le croisement du bilan échoue sur l'attente de 10 s ;
  5. route booklet remise à `origin/main`.
- T1 rapide et T1 complet : code 0.
- Premier T2 : code 1. Un seul rouge, `bilans-confirmation-non-envoye.migration.test.ts` : cette garde fige dans `logBookletEnvoi` les littéraux « Renvoi / Envoi du bilan », qu'une migration de données reprend. Je les avais remplacés par des constantes. Ils sont rétablis tels quels, et les constantes ne servent plus qu'à la réservation. Ensuite, 396 tests sur 396 (garde et routes). T2 rejoué : voir la PR.
- Fins de ligne : la route booklet est en CRLF sur `origin/main`, et un premier jet l'avait convertie en LF (constat de `wn-reviewer`, deuxième passe). Les CRLF sont rétablis, et le diff de la route revient à 82 lignes.

## 6. Problèmes ouverts

- Une ligne réservée restée marquée (processus arrêté entre la réservation et le solde) empêche de vider la synthèse. C'est le « sens prudent » de `reservation.ts`, qui vaut déjà pour le premier envoi.
- Lot `synthese-version-optimiste` (ordre 92) : `pret`, il suit ce lot.
- Suite de la partie 5 d'`autonomie-pieges-restes`.

## 7. Prochaine action exacte

1. T1 complet, commit tardif, push, PR (`--body-file`), `wn-attendre-ci` en fond, preuve PR-Agent, verdict de `wn-reviewer` déposé sur la PR.
2. Un verdict pour chaque commentaire, puis « prête @<sha> » sur la PR et au registre.

## 8. Interdits encore actifs

- Aucune donnée patient dans les tests ; fixtures neutres seulement.
- Aucune migration, pas de `prisma format`. Aucune écriture en production.
- Rien de `web/src/lib/clinical/` ; ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`.
- Horodater en lisant l'heure système, jamais à l'estime. Porte 24 non levée.
