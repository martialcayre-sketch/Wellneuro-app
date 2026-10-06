# Handoff — 2026-10-06 — BIO-PARCOURS BP-10 : état des lieux, avant la décision

## Branche et état Git

`docs/bio-parcours-bp10-etat-des-lieux`, depuis `main`. Doc seule.

## Objectif

Préparer la décision de sécurité biologique (étage 1), première étape de BP-10,
désormais débloqué (BP-02 et BIO-INGEST LOT-07 terminés).

## Décisions prises

- Pas de projet de `D-xxx` rédigé : les questions changent la forme même de
  l'objet (déclencheur, acte de lecture, table). On les pose d'abord.
- État des lieux versé dans la fiche LOT-10 : l'existant (Fil, chaîne de la
  lettre, notification, marquage), la contradiction sur le déclencheur, neuf
  questions, les préalables RGPD et TRUST.

## Fichiers modifiés

Fiche `LOT-10-securite-biologique-etage-1.md`, SESSION_LOG, ce handoff.

## Validations exécutées

T1 complet. Cartographie (agent Explore), recoupée en principal sur les types
acquittables, la couverture `safety:anamnese:` et les lignes du cadrage.

## Problèmes ouverts

- Le déclencheur : tout import validé (fiche) ou le marquage non nul
  (cadrage) ? Les angles morts du marquage : v1, non transcrit, absence.
- Les huit autres questions de la fiche.

## Prochaine action exacte

1. Le responsable tranche les neuf questions.
2. Rédiger la décision de sécurité biologique, puis le registre RGPD, puis la
   migration seule (confirmation distincte, passe Codex).

## Interdits encore actifs

- Aucune lecture de valeur ; aucun seuil ; `D-234` et `D-257` A7 intactes.
- Migration : confirmation distincte, `release-db` approuvée.
