---
id: "LOT-04"
titre: "Intégration WellNeuro aval bornée"
statut: "livré"
dépend_de: "LOT-03"
---

# LOT-04 - Intégration WellNeuro aval bornée

## Périmètre

- Brancher le socle de certification dans les mécanismes aval déjà cadrés :
  - Mon Équilibre et ses sources questionnaires ;
  - moteur d'orientation déterministe ;
  - synthèse IA si et seulement si les candidats sont déjà filtrés et traçables.
- Procéder du plus sûr au plus exposé : filtres et garde-fous d'abord, exposition UI ou prompt ensuite.

## Interdits

- Aucun usage IA ou suggestion clinique sans traçabilité claim par claim quand elle est requise par la doctrine existante.
- Aucun bump de version du score Équilibre sans décision explicite sur couverture et niveaux de preuve.
- Aucun auto-assign, aucune activation patient implicite.

## Tests et validations

- `cd web && npm run check`
- `cd web && npm run test:worktree -- --fast`
- Tests ciblés sur filtres orientation, couverture Mon Équilibre et champs déterministes fusionnés côté serveur.

## Réalisation

- Mon Équilibre passe en fail-closed sur les sources suspendues : une source
  suspendue n'alimente plus de couverture, même si une passation historique
  existe encore en base.
- La génération de synthèse IA filtre désormais les réponses sur le prédicat
  d'administrabilité runtime avant construction du prompt.
- En conséquence, un dossier sans aucune réponse administrable retourne `422`
  et n'appelle pas le modèle.

## Résultat

- Les mécanismes aval n'utilisent plus de questionnaire suspendu par erreur.
- L'intégration reste bornée au déterministe : aucun auto-assign et aucune
  activation patient implicite n'ont été introduits.

## Done

- Les mécanismes aval n'utilisent que des questionnaires explicitement autorisés.
- Le comportement reste fail-closed en cas de statut manquant, incertain ou bloqué.
- Les limites d'intégration restent documentées quand une activation est volontairement reportée.

## Points de vigilance

- Ce lot peut être scindé si Mon Équilibre, orientation et synthèse ne tiennent plus dans un seul objet de revue raisonnable.
