# Handoff — 2026-08-18 — D-074 : le drapeau d'orientation était posé depuis au moins le 5 août

- **État** : `fix/etat-reel-drapeau-orientation`, depuis `main` à `166d2c87`.
  Diff documentaire + un commentaire. Aucun contenu clinique touché.
- **Décision** : `D-074` — constat et correction d'état ; aucun drapeau posé
  ni retiré.

## Comment le fait a été établi

Vercel a refusé la création de `WN_ENABLE_ORIENTATION_NNPP2` (déjà présente),
et la variable est marquée **sensitive** : sa valeur ne se relit pas. La
conclusion vient du **comportement** — le panneau « Orientation · explorations
proposées » du bas de la fiche patient sert des recommandations en production,
et la route ne calcule qu'après `orientationActive()` (`= '1'` ET
`tableSignee()`).

## Le piège méthodologique du lot

Le journal d'accès semblait décisif — 37 accès à `/api/praticien/orientation`
depuis le 2026-08-05 — **et il ne l'était pas**. La base de production est
aussi celle du dev et des E2E, et `playwright.config.ts` arme délibérément
`WN_ENABLE_ORIENTATION_NNPP2=1` dans `webServer.env`. Les 37 accès portent tous
sur des dossiers fictifs : compatibles avec un drapeau éteint chez Vercel.
**Une trace n'est une preuve que si l'on sait qui a pu l'écrire.**

## Dettes nommées, non traitées

- **`MESSAGE_ORIENTATION_INACTIVE`** (`orientationService.ts:36`) annonce « les
  règles NNPP2 ne sont pas encore validées » — faux depuis le 2026-08-04. Ne
  s'affiche plus en production (verrou ouvert), mais reste un texte praticien
  mensonger. Sa correction touche aussi `orientation.restitution.test.ts:128`
  et `FEATURE_FLAGS.md` (qui cite le message). Finalité distincte.
- **Scopes Preview et Development** : jamais vérifiés, pour aucun drapeau. La
  documentation le demande depuis le 2026-08-04 (`FEATURE_FLAGS.md`, §C) ; rien
  côté CI ne le couvre.

## Règle à retenir

Troisième cas de la classe après `D-064` et `D-070` : **un état de production
ne se déduit pas de la documentation**. Nouveauté ici — le mécanisme qui a rendu
la dérive durable : un drapeau marqué *sensitive* n'est plus relisible, donc
plus démentable. Réserver *sensitive* aux secrets.
