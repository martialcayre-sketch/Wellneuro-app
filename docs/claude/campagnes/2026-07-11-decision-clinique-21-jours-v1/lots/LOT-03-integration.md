---
id: "LOT-03"
titre: "Cockpit — décision"
statut: "terminé"
dépend_de: "LOT-02"
---

# LOT-03 — Cockpit — décision

## But

Présenter la carte de décision explicable après qualification déterministe
des signaux, manques, discordances et bloqueurs.

## Résultat observable

Le praticien voit ce qui manque et ce qui limite l'interprétation avant la
priorité proposée, avec historique technique repliable.

## Périmètre

- DecisionCard ;
- signaux convergents et discordants ;
- données manquantes, bloqueurs et contre-factuels ;
- abstention possible.

## Hors périmètre

- protocole 21 jours ;
- rédaction patient finale ;
- priorité choisie ou diffusée automatiquement par l'IA.

## Fichiers probables

- contrats produits en LOT-01
- cockpit de lecture LOT-02
- mécanisme `TwoLevelReading`

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

Tests unitaires des règles validées, replay des fixtures fictives et E2E du
flux de décision sans diffusion.

## Critères de done

- manques et discordances précèdent la décision ;
- abstention et bloqueurs testés ;
- provenance accessible ;
- aucune diffusion automatique.

## Résultats

Le lot livre un contrat pur `DecisionCard` versionné et son builder
déterministe. La carte reste toujours au statut `draft` : les candidats sont
d'origine moteur, chaque règle doit être cliniquement validée et la sélection
appartient exclusivement au praticien. Une abstention non évaluée, une
abstention requise ou un constat de sécurité retire toute proposition et
interdit la sélection. Provenance, contre-factuels, limites, références de
manques, discordances et sécurité sont normalisés et couverts par un hash
canonique.

La fiche praticien affiche désormais les données manquantes avant la décision,
distingue explicitement « non évalué » de « aucun manque qualifié », présente
les discordances dans un détail repliable praticien-only et conserve un état
« Décision clinique non préparée » tant qu'aucun flux runtime confirmé
n'alimente la carte. L'ancien intitulé de priorité a été remplacé par
« Couverture des 12 besoins » afin de ne pas transformer le tri descriptif
existant en recommandation clinique. Aucun contenu interne supplémentaire
n'est transmis à la prévisualisation patient.

Validations : 10 tests Vitest ciblés, 128 tests Vitest globaux, `type-check`,
lint, certification des 63 questionnaires, contrôle anti-secrets et
`git diff --check` réussis. Le scénario Playwright bureau/tablette/mobile a
été ajouté mais son exécution locale est bloquée avant démarrage par l'absence
de `NEXTAUTH_SECRET` ; il reste exécutable dans l'environnement CI configuré.

Aucune route API, persistance, migration Prisma/SQL, écriture Supabase, règle,
formule ou seuil clinique, appel IA, protocole 21 jours ou diffusion patient
n'a été ajouté. L'alimentation live attend un flux dédié de confirmation
d'épisode puis de construction `ClinicalSnapshot` / `ClinicalReview`.
