# Brief — BIO-INGEST

> Source : proposition de chantier BIO-INGEST soumise par le responsable le
> 2026-09-30, auditée le même jour de façon adverse (agent `wn-fable`, lecture
> seule, aucun code touché), puis cinq arbitrages rendus en séance.

## La demande, telle qu'elle a été formulée

Améliorer l'acquisition et la saisie des résultats biologiques dans les
dossiers patients. Toutes les voies d'entrée doivent aboutir au même résultat
validé : saisie praticien unitaire et groupée, PDF, photo ou scan, dictée,
transmission par le patient depuis son portail, e-mail, import direct d'un
laboratoire (pilote envisagé : Laboratoire Barbier Metz), plus tard des formats
structurés (CDA, HPRIM, HL7).

## Ce que l'audit en a retenu

- Le principe tient : `resultats_biologiques` reste le modèle canonique.
- La « couche Biology Ingestion » générique est prématurée : le dépôt porte
  déjà les patrons qui la remplacent.
- Le moteur clinique ne lit pas `resultats_biologiques` (frontière `D-122`),
  contrairement à ce que supposait la proposition.
- L'application n'a aucune infrastructure de fichiers (aucun upload, aucun
  stockage).
- Envoyer un compte rendu à une IA est une nouvelle transmission de données de
  santé, à déclarer avant toute activation.
- La saisie vocale n'est pas planifiée.

Le détail, les arbitrages A1 à A5 et les lots se trouvent dans
[`CADRAGE_BIO_INGEST_2026-09-30.md`](../CADRAGE_BIO_INGEST_2026-09-30.md) et
dans `D-256`.
