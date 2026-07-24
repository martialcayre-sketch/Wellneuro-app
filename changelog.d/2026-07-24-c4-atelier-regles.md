### C4 LOT-03b — atelier de règles cliniques : gouvernance versionnée (2026-07-24)

L'UI praticien de gouvernance des `ClinicalRule` (outil n°11 de la proposition
rayon compléments), pendant de l'Atelier corpus — page
`dashboard/regles` + `AtelierReglesPanel`, routes `api/praticien/regles/*`,
le tout derrière `WN_C4_ENABLED` (fail-closed : bannière d'indisponibilité côté
page, 404 côté routes, motif `WN_C5_ENABLED`).

- **Machine à états append-only** (décision actée n°5) : une règle NAÎT
  brouillon (création = lignée neuve `versionRegle 1` ; révision = ligne
  `versionRegle + 1` de la même lignée — le contenu d'une ligne existante ne
  s'édite JAMAIS en place, aucune route d'update). La lignée est le triplet
  (intention, ingrédient, type de règle), même clé que la résolution C4B.
- **Validation = signature** : `validePar` (e-mail praticien de session,
  normalisé) + `valideLe`, posés par écriture conditionnelle ; dans la MÊME
  transaction, les versions validées antérieures de la lignée passent
  `actif = false`, signature intacte (audit). Gardes : `statutAttendu`
  obligatoire (409 `etat_divergent`, motif corpus), 409 `version_depassee` si
  une version validée au moins aussi récente est active.
- **Désactivation tracée** : raison obligatoire (422 sans elle), écriture
  conditionnelle limitée à `actif = false`. Le schéma V1 n'ayant aucun champ
  pour la raison, elle est journalisée côté serveur et sa trace durable vit
  dans la justification de la version qui remplace la règle (documenté).
- **Vocabulaire gouverné = donnée** (décisions n°4 et n°7) : GET + POST
  praticien sur `ClinicalIntentTag` et `ClinicalCriterion` ; une condition de
  règle ne peut citer qu'un `critereId` de ce vocabulaire, jamais une chaîne
  libre. L'échelle GRADE est étiquetée « preuve scientifique » dans l'UI et
  refuse A/B/C/D (décision n°1).
- **Prévisualisation d'atelier** : encart « tester une intention » appelant
  `resoudreIntentions` avec `inclureNonValidees: true` — seule surface
  autorisée à le faire, brouillons marqués « non servie », jamais un chemin
  protocole/patient.
- UI française non culpabilisante sur le patron `AtelierCorpusPanel` :
  confirmations en deux temps (valider, désactiver + raison), justifications
  verbatim, lignée dépliable, onglets Brouillons/Validées/Désactivées,
  pagination, verrou d'action unique et générations de chargement.
- 52 tests Vitest (routes + composant) : création brouillon sans signature,
  révision qui n'édite jamais en place, validation signant et désactivant
  l'ancienne version en transaction, 409 de concurrence, raison de
  désactivation exigée, auth requise partout, fail-closed du drapeau.
