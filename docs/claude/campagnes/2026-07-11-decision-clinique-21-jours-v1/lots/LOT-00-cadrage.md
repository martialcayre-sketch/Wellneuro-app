---
id: "LOT-00"
titre: "Audit des données et arbitrages"
statut: "terminé"
dépend_de: "HC-F LOT-02"
---

# LOT-00 — Audit des données et arbitrages

## But

Vérifier les données réellement disponibles, l'état de la fiche patient et
les frontières du registre avant toute construction du cockpit C1.

## Résultat observable

Une cartographie factuelle des entrées C1 et un arbitrage documenté du radar,
sans modification de logique clinique.

## Périmètre

- assignations, réponses, synthèses et statuts R8-lite en lecture seule ;
- API publiques de `web/src/lib/equilibre/` ;
- écrans actuels de fiche patient ;
- choix radar 3 strates / cinq objets cliniques.

## Hors périmètre

- implémentation du cockpit ;
- changement de formule, seuil ou scoring ;
- persistance longitudinale.

## Fichiers probables

- `web/src/lib/equilibre/`
- fiche patient praticien et APIs consommées
- `docs/claude/REGISTRE_FRONTIERES.md`
- `CAMPAGNE.md` de C1

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.

## Étapes

- [x] Vérifier les hypothèses.
- [x] Implémenter le changement minimal.
- [x] Exécuter les validations.
- [x] Relire le diff.
- [x] Documenter les résultats.

## Tests

Tests non applicables à ce lot d'audit. Vérifier les références par recherche
ciblée et consigner les preuves.

## Critères de done

- sources et limites recensées ;
- arbitrage radar explicite ;
- aucune donnée patient réelle ;
- go/no-go pour LOT-01.

## Résultats

### Cartographie factuelle des entrées C1

| Entrée | Source actuelle | Accès constaté | Limites pour C1 |
|---|---|---|---|
| Patient | modèle Prisma `Patient` | `idPatient` dans `api/praticien/equilibre` | l'API équilibre n'expose que l'identité nécessaire à la fiche |
| Fiche signalétique et anamnèse | modèle Prisma `Consultation` | relation métier par `idPatient` | champs facultatifs disponibles dans le schéma, mais leur présence en base n'a pas été vérifiée et ils ne sont pas chargés par la fiche actuelle |
| Assignations | modèle Prisma `Assignation` | `api/praticien/patients` | la fiche filtre par email une liste globale plafonnée, et non une route dédiée au patient |
| Réponses et scores | modèle Prisma `QuestionnaireReponse` | `api/praticien/reponses` par email ; `api/praticien/equilibre` par `idPatient` | deux clés de lecture coexistent ; les réponses historiques sans `scoresJson.rawAnswers` ne sont pas recalculables par le moteur d'équilibre |
| Synthèses IA | modèle Prisma `SyntheseIA` | `api/praticien/synthese` par `idPatient` | route de lecture disponible, mais non consommée par la fiche actuelle |
| Statuts R8-lite | champs `statutReponses`, `correctionCommentaire` et `correctionDemandeeDate` de `Assignation` | lecture via `api/praticien/patients`, déverrouillage via `api/praticien/assignations` | statuts portés par des chaînes sans type fermé partagé |
| Mon équilibre | `web/src/lib/equilibre/score.ts` | `calculerEquilibre` et fonctions publiques de couverture/agrégation | aucune formule ne doit être dupliquée dans C1 |
| Provenance de mesure | `web/src/lib/equilibre/evidence.ts` | niveaux A/B/C/D ou `NON_MESURE` | `NIVEAU_PREUVE_PAR_SOURCE` reste signalé dans le code comme proposition à valider cliniquement avant affichage en production |
| Cinq objets cliniques | `web/src/lib/equilibre/objetsCliniques.ts` | indice global, stabilité métabolique, réserve d'adaptation et clarté ; momentum assemblé par la route | le calcul est livré et testé ; C1 le consomme sans le modifier |
| Momentum | `web/src/lib/equilibre/momentum.ts` et `depuisPrisma.ts` | jalons T0/J21/J42/J90, tolérance existante, historique reconstruit | T0 est inféré de la première réponse et aucun épisode n'est persisté ; `versionScore` est calculée par le moteur mais absente du DTO praticien |

### État réel de la fiche patient

`web/src/components/FichePatientPanel.tsx` consomme déjà les routes praticien
`equilibre`, `reponses`, `patients` et `assignations`. Elle affiche :

- l'identité du patient, le mode consultation et la prévisualisation patient ;
- les cinq objets cliniques, avec un état « Non mesuré » et un état
  d'historique insuffisant pour le momentum ;
- les trois strates et les douze besoins via `CerclesConcentriques` ;
- les priorités triées par couverture, leurs preuves A/B/C/D ou non mesurées,
  et un second écran de détail des douze besoins ;
- les demandes de modification R8-lite et l'action de déverrouillage ;
- le détail des réponses, scores, interprétations, données manquantes et
  métadonnées de certification.

Les synthèses IA, la fiche signalétique et l'anamnèse existent dans les
sources serveur, mais ne sont pas encore intégrées à cette fiche. Aucun objet
persisté `AssessmentEpisode`, `ClinicalSnapshot`, `DecisionCard` ou
`ProtocolDraft` n'existe dans le schéma actuel, conformément aux frontières de
C1 avant LOT-01.

### Arbitrage radar

**Option A confirmée.** La fiche patient conserve la visualisation des trois
strates Corps / Ancrage / Esprit et des douze besoins. C'est la représentation
qui rend visible la structure pondérée 60/20/20. Les cinq objets cliniques
restent une lecture synthétique praticien séparée : ils ne remplacent pas les
strates et ne constituent pas cinq axes équivalents du score.

Cet arbitrage correspond au registre, à la campagne et à l'implémentation
actuelle. Il n'entraîne aucune modification de formule, seuil, scoring, API ou
composant.

### Contraintes transmises à LOT-01

- définir des contrats TypeScript purs centrés sur `idPatient`, sans nouvelle
  persistance ;
- distinguer explicitement donnée absente, non mesurée et donnée historique
  inexploitable faute de réponses brutes ;
- transporter la version du score dans le snapshot C1 au lieu de la perdre
  dans l'adaptation API ;
- modéliser l'épisode proposé puis confirmé sans confondre son T0 avec une
  persistance longitudinale ;
- consommer les API publiques de `equilibre/` sans réimplémenter les calculs ;
- ne pas activer de règle dépendant des preuves A/B/C/D avant la validation
  clinique déjà signalée dans le moteur.

### Verdict

**GO pour LOT-01 avec les contraintes ci-dessus.** Les sources nécessaires au
socle contractuel sont présentes et aucune migration n'est requise. Les
limites recensées relèvent de la conception des contrats du lot suivant, pas
d'une correction dans LOT-00.

Audit réalisé uniquement par lecture statique du dépôt. Aucune donnée patient,
connexion Supabase, migration ou modification clinique n'a été utilisée.
