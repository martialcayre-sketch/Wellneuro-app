---
id: "2026-09-30-bio-ingest"
titre: "BIO-INGEST — acquisition des résultats biologiques"
statut: "en_cours (ouverte le 2026-09-30 — LOT-00 cadrage, D-256)"
créée_le: "2026-09-30"
mise_à_jour: "2026-09-30"
lot_courant: "LOT-00"
branche_campagne: "aucune"
branche_lot_courant: "wn-bio-ingest-lot00-2026-09-30"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# BIO-INGEST — acquisition des résultats biologiques

## Objectif

Réduire le coût de mise au dossier d'un bilan biologique. On commence par la
saisie groupée du praticien, puis viennent les comptes rendus PDF ou photo, la
transmission par le patient et l'import d'un laboratoire. **Toutes les voies
aboutissent à `resultats_biologiques`, toujours après une validation humaine
explicite.**

## Ce qui a causé cette campagne

La saisie biologique est ouverte en production depuis le 2026-09-09
(`WN_CB_RESULTS_ENABLED`) et compte 0 ligne sur 28 dossiers actifs au
2026-09-30. Le responsable explique ce zéro par deux causes : aucun bilan n'a
eu l'occasion d'être saisi, et la saisie unitaire (`EstimeMesurePanel`, un
geste par valeur) est déjà jugée trop coûteuse pour un bilan complet (A1).

## Résultat observable

- Un praticien saisit un bilan complet en une validation, et non plus en une
  validation par valeur (LOT-01).
- Un compte rendu PDF ou photo produit des lignes candidates. Le praticien les
  relit, les corrige ou les refuse, puis les valide. Aucune ne devient un
  résultat sans ce geste (LOT-02, LOT-03).
- Un patient peut transmettre son compte rendu depuis le portail et suivre son
  statut : en attente, reçu, validé ou refusé (LOT-04).

## Décisions

- **`D-256`** — le cadre et les cinq arbitrages A1 à A5 du 2026-09-30 :
  saisie groupée d'abord ; documents en base HDS ; saisie groupée enregistrée
  entière ou pas du tout ; IA vision seulement après amendement RGPD/TRUST ;
  provenance portée par le lot d'import, jamais par le résultat.
- Frontières confirmées : `D-122` (le moteur clinique ne lit pas les
  résultats), `D-124` (append-only), `D-157` (aucune conversion d'unité),
  `D-087` (une migration reste seule dans sa PR).
- Détail : [`CADRAGE_BIO_INGEST_2026-09-30.md`](../CADRAGE_BIO_INGEST_2026-09-30.md).

## Contraintes non négociables

- Aucune ligne extraite ou importée n'atteint `resultats_biologiques` sans
  validation humaine explicite dans l'écran.
- L'ingestion extrait, normalise et propose. Elle ne qualifie jamais une
  valeur (basse, haute, pathologique), ne recommande rien et ne déclenche
  aucune action clinique.
- Aucune migration sans lot séparé, **confirmation obligatoire** et release-db
  approuvée ; le code consommateur ne part qu'après le constat par conteneur.
- Aucun envoi de document à un sous-traitant IA avant l'amendement du registre
  RGPD et du document patient TRUST (`D-251`).
- Aucun secret en dur, aucun patient réel. Les exemples se limitent à Sophie
  Nicola, Jennifer Martin et Michel Dogné. Tous les textes UI sont en
  français.

## Lots

| Lot | Objet | Statut | Migration | Dépend de |
|---|---|---|---|---|
| LOT-00 | Cadrage, `D-256`, ouverture de la campagne | en_cours | non | — |
| LOT-01 | Saisie groupée praticien, route batch transactionnelle | à_faire | non | LOT-00 |
| LOT-02 | Staging d'import, extraction PDF par IA vision, écran de validation | à_faire | **oui, confirmation obligatoire** | LOT-01, amendement RGPD/TRUST |
| LOT-03 | Photo ou scan : même pipeline, seul l'extracteur change | à_faire | non | LOT-02 |
| LOT-04 | Transmission depuis le portail patient | à_faire | probable, confirmation obligatoire | LOT-02, consentement RGPD à jour |
| LOT-05 | Adaptateur laboratoire (pilote Barbier Metz) | à_faire | selon le format reçu | LOT-02, format réel reçu |

## Hors périmètre, nommé

- La saisie vocale : non planifiée, à réexaminer si le besoin est exprimé
  après usage du LOT-01.
- Un canal e-mail dédié (boîte de réception, transfert automatique) : un
  compte rendu reçu par e-mail est une source en amont, que le praticien
  dépose dans la voie PDF du LOT-02. Un canal dédié ouvrirait un nouveau flux
  de données de santé, à décider séparément.
- La lecture de `resultats_biologiques` par le moteur clinique (`D-122`).
- Les résultats qualitatifs (positif/négatif, génotype, commentaire) : refusés
  à l'import en V1.
- La conversion d'unité : une divergence se refuse, elle ne se convertit
  jamais.
- Le choix final d'un analyte par un LLM : le LLM propose tout au plus un
  candidat, marqué ambigu.

## Done de campagne

- [ ] LOT-01 à LOT-04 livrés. LOT-05 livré, ou transféré par arbitrage s'il
      n'y a toujours pas de format réel.
- [ ] Contre-revue adverse lancée AVANT le lot de clôture.
- [ ] Constat d'usage au conteneur, par identifiant (`D-125`) : nombre de
      lignes dans `resultats_biologiques` après le LOT-01.
- [ ] Documentation canonique et dossier RGPD à jour ; handoff final produit.
