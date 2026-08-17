# Handoff — 2026-08-17 — D-070 : le drapeau CB était déjà posé, et la table signée est dormante

- **État** : `fix/etat-reel-drapeau-cb`, depuis `main` à `4b588d1e` (tout le
  programme `D-060`→`D-069` mergé). Diff documentaire + deux commentaires ;
  T1 vert, 76 bancs biologie verts, banc `verrousSignatureDocumentes` vert.
- **Décision** : `D-070` — constat et correction d'état, aucun geste
  d'exploitation posé ni retiré.

## Le constat

Le praticien a tenté de créer `WN_CB_ENABLED` en Production ; Vercel a refusé
— *already exists for the target production* — et sa valeur est `true`. Elle
l'était donc **avant** le déploiement de `4b588d1e` (créé 09:16 UTC, succès
09:33), qui n'a pu que l'hériter. Or quatre sites du dépôt affirmaient « reste
éteint » : `D-069` §2, `FEATURE_FLAGS.md`, le fragment de changelog `D-069`,
l'en-tête de `indicationsBiologieV1.ts`. **L'affirmation était fausse au
moment où elle a été écrite** — déduite de la documentation, jamais lue dans
le panneau. Même classe que `D-064`.

## Ce que le drapeau ouvre réellement

La surface d'**arbitrage** biologique, et elle seule : `CbFeatureProvider` →
`ClinicalRuntimeSection`, `POST /api/praticien/biologie/arbitrage`, cartes
« biologie arbitrée sans révision » du fil (`api/praticien/fil/route.ts:127`).
Production : **zéro arbitrage** en base (lecture MCP du 2026-08-17) — rien n'y
a jamais transité.

## La découverte qui compte pour la suite

`deriverStatutsBiologie` **n'a aucun appelant** hors bancs. Les quinze règles
de `D-069` et le catalogue de `D-068` sont signés, en base, et n'atteignent
aucun écran : le programme a livré la matière, pas son branchement. Ce n'est
pas une régression, c'est l'état réel — et il était masqué par la phrase
« signer n'allume pas », qui laissait croire que seul le drapeau manquait.

**Prochain lot naturel** : brancher le premier appelant. Il devra honorer le
contrat M-B — table canonique passée VERBATIM, ni filtre ni tri ni
reconstruction (le hachage du verrou dérive des règles réellement évaluées).

## Vérifications de production faites ce jour

- Catalogue `D-068` après `release-db` : 47 analytes `saisie_praticien`, 15
  panels, 78 items, 0 orphelin, insulinémie seule sous validation médicale,
  intersection analytes∩ratios vide, 2 plages sourcées (ferritine 50-80 /
  `0044-003` ; vitamine D 45-`NULL` / `0154-054`). Trace : commentaire de #700.
- Les 29 claims du périmètre signé : **29/29** VALIDE, actifs, v1.0.

## Deux pièges de méthode confirmés

- `prisma migrate deploy` **n'imprime pas les `RAISE NOTICE`** : un garde-fou
  écrit en `NOTICE` ne prouve rien dans un log de release. Lire les lignes.
- Un `wn-attendre-ci` à `0` ne dispense pas de confirmer le run sur la tête
  réelle (`gh run list --branch`) : la branche peut avoir bougé sous soi — ici
  Copilot y avait poussé un commit pendant l'attente.
