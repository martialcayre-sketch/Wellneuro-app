---
id: "LOT-04"
titre: "UX praticien Observatoire"
statut: "à_faire"
dépend_de: "LOT-03"
---

# LOT-04 — UX praticien « Observatoire »

## But

Donner au praticien une lecture précise et traçable de C5 dans le cockpit et le
protocol builder, sans nouvelle navigation principale.

## Résultat observable

Un praticien autorisé consulte un profil intrinsèque chiffré, sa provenance, ses
versions, limites et alternatives, puis choisit manuellement de l'insérer dans
un protocole.

## Périmètre

- Route lecture seule GET /api/praticien/boussole?idPatient&foodRef.
- NextAuth et contrôle du praticien propriétaire du patient.
- Profil intrinsèque chiffré, contexte, sources, versions et limites.
- Restitution textuelle et tabulaire étiquetée, sans dataviz V1.
- Intégration au cockpit/protocol builder et workflow Relu → Validé → Envoyé.
- Espace praticien clair avec rail sombre de signature Nuit spectrale.

## Hors périmètre

Nouvelle navigation principale, édition du mapping, automatisation de décision,
diffusion directe, patient et graphiques décoratifs.

## Fichiers probables

Cockpit praticien, protocol builder, route API, contrôles d'autorisation,
composants accessibles et tests associés.

## Interdits

- Ne jamais accepter idPatient comme preuve d'autorisation.
- Ne jamais insérer ni envoyer automatiquement une recommandation.
- Ne pas masquer source, version ou état insufficient_data.
- Ne pas transformer tout l'espace praticien en thème sombre.

## Étapes

- [ ] Définir les états chargement, vide, incomplet, caduc et erreur.
- [ ] Implémenter la route avec authentification et ownership.
- [ ] Ajouter la vue Observatoire sans nouvelle entrée principale.
- [ ] Raccorder l'insertion manuelle au workflow existant.
- [ ] Tester accessibilité et autorisations.

## Tests

API 401/403/404, patient non possédé, aliment absent, import incomplet, version
caduque, insertion manuelle, absence de diffusion automatique, clavier, zoom
200 %, contraste et libellés français.

## Critères de done

- Seul le propriétaire authentifié accède aux données du patient.
- Le chiffre n'est jamais séparé de sa source et de sa version.
- Une action ne devient visible au patient qu'après le workflow complet.
- Aucun nouvel item de navigation principale n'est créé.

## Risques / points de vigilance

Le profil intrinsèque est universel mais la requête patient reste sensible car
elle révèle le contexte du protocole ; le contrôle d'ownership est obligatoire.

## Résultats

À renseigner lors de la clôture du lot.
