---
id: "LOT-00"
titre: "cadrage-arbitrage-questions-ouvertes"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-00 — Cadrage et arbitrage des questions ouvertes

## But

Produire une maquette texte/wireframe validée du shell praticien (rail gauche desktop/tablette, barre de
commande, navigation basse mobile) et trancher les questions ouvertes du document source, avant tout code.

## Résultat observable

Un document d'arbitrage (dans ce dossier ou en annexe de `CAMPAGNE.md`) répondant explicitement à chaque
question listée ci-dessous, plus un wireframe texte des trois largeurs (desktop, tablette, mobile) dans les
deux thèmes.

## Périmètre

- Reprendre §4 et §10 (templates A/C) de `sources/UX_WELLNEURO_3_0.md`.
- Trancher :
  - Rail gauche toujours compact ou état mémorisé ?
  - Recherche globale : patients seulement, ou aussi questionnaires/packs/documents ?
  - Dashboard personnalisable par le praticien (V1) ou figé ?
  - Les 4 entrées de la navigation mobile praticien (proposition de départ : Accueil, Patients, Synthèses,
    Plus — à confirmer ou ajuster).
  - Liste des icônes/libellés du rail gauche (proposition de départ en §4.1 du document source) — vérifier
    qu'elle correspond aux routes réellement existantes sous `web/src/app/dashboard/`.

## Hors périmètre

- Toute implémentation de composant React.
- Toute décision concernant le dashboard léger, l'annuaire, la fiche patient ou le portail patient (hors
  périmètre de cette campagne).

## Fichiers probables

- Lecture : `web/src/app/dashboard/` (routes existantes réelles), `sources/UX_WELLNEURO_3_0.md`.
- Écriture : document d'arbitrage dans ce dossier de campagne uniquement.

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase.
- Pas de code applicatif dans ce lot.

## Étapes

- [ ] Lister les routes réelles sous `web/src/app/dashboard/` pour vérifier la correspondance avec le rail
      proposé.
- [ ] Trancher chaque question ouverte listée ci-dessus.
- [ ] Rédiger le wireframe texte des 3 largeurs × 2 thèmes.
- [ ] Faire valider le wireframe avant de passer à LOT-01.

## Tests

Aucun (lot sans code).

## Critères de done

- Chaque question ouverte a une réponse explicite et justifiée.
- Le wireframe couvre desktop, tablette et mobile, dans les deux thèmes.
- Aucune route existante n'est oubliée ou mal mappée dans le rail proposé.

## Résultats

À compléter à la clôture.
