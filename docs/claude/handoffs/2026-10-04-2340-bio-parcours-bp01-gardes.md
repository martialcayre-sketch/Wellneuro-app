# Handoff — BIO-PARCOURS BP-01 (LOT-01) : gardes avant surface

## Branche et état Git

`feat/bio-parcours-bp01-gardes`, créée depuis `main` (858248b8). Diff indexé,
non commité au moment de l'écriture, et pas encore de PR.

## Objectif

Poser, avant toute surface neuve, les bancs qui empêchent un résultat
biologique de modifier en silence le chemin documentaire, un prompt ou une
structure signée ([[D-266]]).

## Décisions prises

- Liste blanche de `biology-library` figée sur ses 26 importeurs réels
  (arbitrage du 2026-10-04). La liste prévue au lot, d'un seul fichier, était
  fausse au dépôt.
- Hook DC-17 : il demande désormais confirmation pour tout fichier qui porte le
  marqueur `validationExterne: true` hors commentaire.
  - Il lit le fichier sur disque et le contenu entrant.
  - Il couvre `.ts`, `.mts`, `.cts`, `.jsx` et `.json`, et la clé entre
    guillemets.
  - L'ancienne liste littérale est conservée.
- `verifierDc03` est pur et non branché. `extraction.ts` (BIO-INGEST) en est
  exempté ; l'exemption est liée à son schéma fermé, dont les champs sont
  épinglés.
- Sentinelle E2E : seuls les mots de verdict sur une valeur sont refusés. Les
  mots de population (« déficit martial », libellé signé) restent admis.
- Le banc « aucune phrase » juge les structures signables (verrou posé ou
  éteint). 17 structures historiques en sont exemptées nommément.
- Reporté :
  - les entrées décisionnelles du nouveau module → BP-12a ;
  - les faits du laboratoire champ par champ → BIO-INGEST LOT-07 ;
  - la sentinelle sur une région du portail → BP-16.

## Fichiers modifiés

- `web/src/lib/bio-parcours/` : 7 bancs, `balayageSources.ts`,
  `verifierDc03.ts` et son test.
- 6 routes biologie et `clinical/portesBiologiquesService.ts` : lignes de
  journal seulement.
- `.claude/hooks/protect-wellneuro-files.{mjs,test.mjs}`,
  `.claude/rules/hooks-garde-fous.md`.
- `web/e2e/helpers/sentinelle.ts`, `web/e2e/biologie-document-patient.spec.ts`.
- La fiche du lot et `CAMPAGNE.md` (statut terminé),
  `changelog.d/2026-10-04-bio-parcours-bp01-gardes.md`, `SESSION_LOG`.

## Validations exécutées

- Les 9 mutations ont été appliquées une à une : rouge constaté à chaque fois,
  puis l'arbre a été restauré à l'identique.
- T2 `--fast` vert : 11 674 tests Vitest et 225 E2E. Le premier passage était
  rouge sur la sentinelle (« deficit »), corrigé.
- `npm run check` vert ; hooks : 262 tests verts.
- Revue `wn-reviewer` : 2 P1 et 5 P2, tous traités.

## Problèmes ouverts

- Les bancs d'import ne jugent que l'import direct ; un passage par un
  importeur listé relève de la revue (limite écrite dans chaque banc).
- `active_lot` de la campagne vaut toujours LOT-01 dans `.wn/state.json` : le
  lot suivant est à désigner par le responsable.

## Prochaine action exacte

Commit, PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond,
lecture des commentaires en ligne, merge.

## Interdits encore actifs

- Aucune logique clinique, aucun drapeau, aucune migration.
- Une liste blanche ne s'élargit que par un diff relu.
- Aucune identité réelle dans le dépôt.
