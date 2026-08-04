---
id: "LOT-01"
titre: "« Mon bilan » — reprendre ou clore"
statut: "à_faire"
dépend_de: "aucun"
palier: "T3"
classe: "migration + clinique"
branche: "feat/portail-bilan"
campagne: "2026-08-04-reprise-chantiers-en-suspens"
---

# LOT-01 — « Mon bilan » : reprendre ou clore

## But

Trancher le sort du chantier « Mon bilan » : le patient lit dans son espace le bilan que
le praticien lui a transmis. Le rendre livrable, ou l'abandonner par écrit.

## Ce qui existe déjà, et où

Branche **`feat/portail-bilan`**, deux commits :

- `73a7b6f7` — la fonctionnalité (route portail, composant, e2e) ;
- `9a4603c3` — commit de sauvegarde du 2026-08-04 : 334 lignes, 11 fichiers, **et la
  migration `20260731120000_booklet_note_transmise` qui n'était suivie par git d'aucune
  manière**.

## Le défaut clinique que ce chantier ferme

`syntheses_ia.notes_praticien` **reste modifiable après un envoi réussi** : l'action
`annoter` n'a aucune garde de cycle de vie, contrairement à `effacer` qui est refusé dès
qu'un envoi existe.

Tant que la note ne servait qu'à composer l'e-mail, cela n'avait pas de conséquence : le
message était parti, l'annoter ensuite ne changeait rien pour le patient. **Une page qui
la lit en direct change cela** — elle publierait au patient un texte qui ne lui a jamais
été transmis, y compris après `suivi_cloture_le`, où tout nouvel envoi est pourtant
refusé par `accepteNouvelEnvoi`.

La réponse retenue est une colonne `booklet_envois.note_transmise` qui **fige
l'instantané de ce qui est réellement parti**, nulle sur les lignes d'échec. C'est elle
que sert la route portail, jamais le champ vivant.

**Ce défaut est inerte aujourd'hui** — aucune page ne lit `notes_praticien` en direct. Il
cesse de l'être au premier écran qui le ferait. C'est ce qui rend ce lot prioritaire sans
le rendre urgent.

## Périmètre

`web/prisma/schema.prisma` (colonne `noteTransmise`), la migration additive,
`api/portail/bilan/`, `api/praticien/booklet/`, `components/patient/MonBilan.tsx`,
`portail/layout.tsx`, `e2e/portail-bilan.spec.ts`, `e2e/helpers/db.ts`.

## Fichiers probables

Voir `git diff main...feat/portail-bilan` — **à relire, pas à croire** : la branche date
de fin juillet et `main` a beaucoup bougé.

## Travaux

1. **Rebaser sur `main` et mesurer l'écart.** C'est le geste qui décide de tout le reste ;
   la validation d'origine est trop ancienne pour valoir quoi que ce soit.
2. Vérifier que la migration s'applique toujours et que le **drift check** passe
   (`migrate diff --exit-code`) — `schema.prisma` a reçu au moins une table depuis
   (`agenda_alimentaire_jours`, 2026-08-04).
3. Vérifier l'entrée **IDP2** : `booklet_envois` est déjà dans la transaction
   d'effacement, la colonne n'y change rien — le confirmer plutôt que le supposer.
4. Reprendre ou écrire les tests de la route portail.
5. Décider : livrer, ou clore par écrit.

## Interdits

- Ne pas lire `notes_praticien` en direct depuis une surface patient — c'est le défaut
  même que ce lot ferme.
- Pas de `prisma migrate dev` : la migration existe, elle s'applique par `migrate deploy`.
- Ne pas merger sans **T3** ni revue adversariale : classe migration.

## Tests

**T3 obligatoire** (`npm run test:worktree`) : migration + parcours patient. Les E2E sont
l'exclusivité du Mac.

## Critères de fin

- Soit la page est en production, migration appliquée et **vérifiée en base**
  (`execute_sql`, `_prisma_migrations` agrégé par nom) ;
- soit une note écrite dit pourquoi le chantier est clos, et la branche est supprimée.
- Dans les deux cas, le défaut « note modifiable après envoi » est tranché : fermé par la
  colonne, ou nommé comme réserve ouverte ailleurs qu'ici.
