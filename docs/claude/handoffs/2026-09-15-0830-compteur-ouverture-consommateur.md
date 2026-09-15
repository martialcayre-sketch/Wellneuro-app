# Compteur d'ouverture — le lot consommateur

**Migration appliquée et CONSTATÉE avant ce lot** (régime `D-087` : le code
consommateur ne part qu'après application constatée par conteneur). #1113 a été
mergée le 2026-09-15 (`9bbcd13a`, `D-194`), puis la migration a été écrite en
base HDS par le workflow `release-db`, approuvé par le responsable — **le merge
seul n'écrit rien** : l'app porte `WN_MIGRATIONS_PAR_RELEASE_DB=1`, le postdeploy
ne migre plus, et l'approbation de ce workflow est l'unique porte d'écriture du
schéma. **Constat du 2026-09-15 20:42 UTC**, one-off lecture seule sur la base HDS :

```
MIGRATION=2026-09-15 20:42:40.84557+00
COLS=compte:integer,espece:text,jour:date
RLS=true POLICIES=0
CONTRAINTES=compte_positif, espece_check, pkey
LIGNES=0
```

Les types autant que les noms — `jour:date`, pas `timestamp` : c'est exactement
ce que la contre-expertise Codex avait montré défaillant dans la liste blanche du
contrat, et c'est vérifié ici sur la base réelle.

**La première tentative de release a ÉCHOUÉ, et la garde avait raison.** Le run
approuvé portait sur `9bbcd13a` ; entre l'approbation et l'exécution, `067ac22a`
a pris la place de l'image, et la garde a refusé de migrer sous un code que
personne n'avait approuvé. Aucune écriture n'a eu lieu. Relancé en
`workflow_dispatch` sur la tête de `main`, une fois tête et déploiement alignés.

## Ce qu'il porte

- `web/src/lib/mesure/ouvertureSources.ts` — module-feuille (n'importe rien) :
  `ESPECES_MESUREES`, `estEspeceMesuree`, `tauxOuverture`, `jourDeMesure`.
- `web/src/lib/mesure/envoyerMesure.ts` — l'envoi client, fail-open sans exception.
- `web/src/app/api/praticien/mesure/ouverture-sources/route.ts` — `POST`,
  `ON CONFLICT DO UPDATE`.
- `DecisionSummaryCard` — prop `mesurable`, **fermée par défaut**.
- `TwoLevelReading` — `onOuverture`, au dépliement seulement.
- `ClinicalRuntimeSection` — un seul montage déclaré `mesurable={!fixture}`.

26 cas verts en local (8 module, 8 route, 10 composant).

## Ce qui a déjà été payé — à ne pas rejouer

1. **`vi.fn` répare ce qu'il mesure.** Retirer le `.catch()` d'`envoyerMesure`
   laissait les bancs verts : `vi.fn` attache ses propres `then`/`catch` au
   promise rendu pour alimenter `mock.results`, si bien que le rejet devenait
   traité par le mock. Le cas stubbe `fetch` par une **fonction nue**.
2. **L'effet ne doit pas vivre dans l'updater de `setState`.** React
   double-invoque les updaters en mode strict : un `onOuverture` appelé dedans
   compterait deux fois chaque ouverture.
3. **Deux bancs existants ont attrapé la première rédaction, et avaient raison** :
   le harnais ergonomique ne contacte aucun réseau, et un rejeu ne poste aucun
   état clinique. Le second est **resserré, pas relâché** — il listait « aucun
   POST », il liste désormais les destinations, si bien qu'un POST clinique neuf
   le fait rougir même si personne ne l'a nommé.
4. **La mesure est fermée par défaut.** La carte se monte deux fois sur une même
   page ; ouverte par défaut, chaque site gonflerait le dénominateur en silence.

## Reste à décider quand le lot partira

Aucune surface ne LIT le compteur. `tauxOuverture` existe et est gardé, mais rien
ne l'appelle : la lecture se fera par requête, comme la preuve de la piste
d'audit du 2026-08-22. Un écran de restitution serait une décision propre.
