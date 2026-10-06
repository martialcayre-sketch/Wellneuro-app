# Handoff — 2026-10-06 — BP-10, décision de sécurité biologique (D-268)

## Branche et état Git

`docs/bio-parcours-bp10-decision-securite`, depuis `main` 83cd2308 (#1342,
BP-23 mergée). Doc seule, sans code ni migration.

## Objectif

Graver les arbitrages BP-10 du 2026-10-06 dans une décision, avant le
registre RGPD puis la migration.

## Décisions prises

`D-268` rassemble les arbitrages du responsable :

- déclencheur = tout import validé ;
- acte par import, révocable avec motif ;
- l'acte signale, il ne bloque rien ;
- table dédiée ;
- carte Fil neuve, non acquittable par lecture ;
- Fil seul, échec visible ;
- lettre = geste du praticien ;
- tout praticien du domaine ;
- imports antérieurs inclus.

§4, §10 et §11 reprennent les interdits déjà écrits de la fiche et de `D-266`.

## Fichiers modifiés

- `docs/DECISIONS.md` (`D-268`)
- fiche `LOT-10`
- `.wn/state.json`
- fragment `changelog.d/2026-10-06-bio-parcours-bp10-decision-securite.md`
- SESSION_LOG
- ce handoff

## Validations exécutées

T1 complet.

## Problèmes ouverts

- Les noms de la table, de ses colonnes et du type de carte ne sont pas
  fixés. Ils se fixent au lot de migration, sous revue.
- Le registre RGPD n'est pas encore mis à jour. Il porte la table des
  données de santé, l'effacement IDP2 et la RLS.

## Prochaine action exacte

1. Merge.
2. Lot RGPD : registre, puis note patient si elle change.
3. Migration seule, sur confirmation distincte de l'utilisateur.

## Interdits encore actifs

- Pas de migration sans confirmation distincte.
- Passe Codex sur la migration.
- Aucune lecture de valeur.
- Pas de donnée patient réelle.
