---
id: "LOT-04"
titre: "UX praticien Observatoire"
statut: "terminé — UX praticien Observatoire"
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

- Route lecture seule GET
  `/api/praticien/boussole?idPatient&decisionCardId&foodRef`.
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

- [x] Définir les états chargement, vide, incomplet, caduc et erreur.
- [x] Implémenter la route avec authentification et ownership.
- [x] Ajouter la vue Observatoire sans nouvelle entrée principale.
- [x] Raccorder l'insertion manuelle au workflow existant.
- [x] Tester la structure accessible et les autorisations ; contrôle humain
  clavier, zoom 200 % et contraste réservé au go/no-go final LOT-07.

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

Terminé le 2026-07-18.

- Ajout de l'Observatoire dans le cockpit du fil de protocole courant, sans
  navigation principale : rail sombre local, espace clair, restitution
  textuelle et tableau sans dataviz.
- Profil praticien explicable : constituants, valeurs, alignements, directions,
  rôles, poids nominaux, PRAL, complétude, agrégat interne, provenance, limites,
  versions de calcul et manifeste des 12 vedettes versionné et hashé.
- Contexte C5B affiché avant insertion : priorité, identifiant et empreinte du
  protocole source, limites et absence de diffusion automatique. La route est
  bornée par `decisionCardId`, authentifiée et contrôlée par ownership patient.
- Insertion uniquement après deux actions explicites : préparation depuis
  l'Observatoire puis ajout au brouillon. Le POST reconstruit la référence
  depuis les 16 lignes Ciqual officielles et le protocole actif ; une référence
  forgée, caduque, incomplète ou issue d'une autre priorité est refusée.
- Le payload protocole V2 est revalidé après attachement. Les protocoles V1
  restent lisibles ; aucune insertion ne valide ni ne diffuse le protocole.
- Vérifications : 513 tests sur 89 fichiers, `type-check`, build production,
  scoring-check (63 questionnaires), audit anti-secrets et `git diff --check`.
  Lint vert hors deux avertissements React Hooks historiques dans
  `GenericQuestionnaire.tsx`. Revue indépendante : GO, aucun P0/P1.
- Aucun schéma, migration, import, activation ou donnée patient ajouté. C5
  reste inactive ; les contrôles humains multi-supports sont centralisés dans
  LOT-07 avant tout go/no-go produit.
