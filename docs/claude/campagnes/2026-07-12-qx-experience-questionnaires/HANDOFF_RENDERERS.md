# Handoff — extension des renderers de questionnaires

## État livré

Les contrats `focus`, `micro_batch`, `guided_sections` et
`compact_repeated_scale` sont spécifiés. Seul `micro_batch` est activé, et
uniquement pour `Q_NEU_03`. Le renderer standard reste le fallback obligatoire.

| Profil | Candidat | État |
|---|---|---|
| `micro_batch` | `Q_NEU_03` | activé — certifié et couvert |
| `focus` | `Q_MOD_02` | bloqué — certification et fixture requises |
| `guided_sections` | `Q_ALI_01` | bloqué — certification et fixture requises |
| `compact_repeated_scale` | `Q_ALI_03` | candidat — revue clinique, certification documentaire et fixture requises |

## Gates obligatoires

Un renderer ne peut être activé pour un questionnaire que si toutes les
conditions suivantes sont satisfaites :

1. Instrument certifié et fidélité à la source vérifiée.
2. Fixture de scoring présente lorsque le questionnaire est coté.
3. Texte, temporalité, ordre des items, options, ancrages et valeurs inchangés.
4. Golden test prouvant l'identité du payload, des scores et des sous-scores.
5. Reprise, résumé, correction et erreur réseau couverts automatiquement.
6. Validation réelle à 375 px, zoom 200 %, au clavier et avec lecteur d'écran.
7. Activation explicite dans le registre UX, limitée à l'identifiant audité.
8. Retour immédiat possible au renderer standard sans migration ni perte de
   brouillon.

En cas d'incertitude, la politique `strict` et le renderer standard
s'appliquent. Une exception modifiant l'administration ou l'interprétation
requiert une validation clinique explicite et une entrée dans `CHANGELOG.md`.

## Procédure d'extension

- Mettre à jour l'inventaire généré et documenter la source de certification.
- Ajouter la configuration UX sans modifier le catalogue clinique.
- Ajouter les tests de structure, payload, scoring et fallback standard.
- Exécuter la matrice complète et une revue indépendante.
- Activer un seul questionnaire audité par changement afin de conserver un
  rollback simple et traçable.

## Hors périmètre transmis

Le mélange d'options, le CAT réel, les changements de contenu clinique et
l'authentification patient par mot de passe, passkey ou OTP relèvent de
campagnes distinctes.
