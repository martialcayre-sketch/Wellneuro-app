### Atelier corpus v1 — le poste de revue des claims ouvre `dashboard/corpus` (2026-07-22)

La couche claims était ingérable mais aveugle : un claim entrait
`EN_ATTENTE_VALIDATION` et rien ne permettait au praticien de le lire, encore
moins de le signer. L'Atelier corpus v1 ouvre ce poste de revue — c'est la
surface qui matérialise le gate D-003 côté praticien (D-004).

- **Machine à états fermée** (`lib/rag/claims/revue.ts`) : trois gestes et
  rien d'autre — valider (signature : `validateur` + `valide_at` posés,
  contrainte `valide_signe` à l'appui), rejeter (décision attribuée, sans date
  de validation), remettre en attente (annulation, signature effacée).
  `VALIDE ↔ REJETE` sans repasser par la file est refusé.
- **Gardes d'intégrité à la signature** : valider un claim sans verbatim cité
  (`sources_absentes`) ou dont un verbatim a été modifié sous le lien
  (`source_derivee`) est refusé côté serveur — la supersession normale d'une
  version, elle, ne bloque pas (AC-2, le claim reste adossé à la version
  qu'il cite).
- **Concurrence sans écrasement** : la décision est prise *sur* un état vu à
  l'écran (`statutAttendu`) ; s'il a bougé entre-temps, `409 etat_divergent`
  et rien n'est écrit — l'écran recharge au lieu de mentir. Côté écran : une
  seule décision en vol à la fois, et les réponses de chargement périmées
  (changement d'onglet ou de page pendant le vol) sont jetées.
- **Routes praticien** `GET /api/praticien/corpus/claims` (file de revue,
  compteurs au même périmètre que la liste, filtres statut/source, pagination)
  et `POST …/claims/decision` — session NextAuth exigée, e-mail compris : pas
  de signature anonyme. Les deux voies restent disjointes par construction :
  l'ingestion ne peut pas poser `VALIDE`, la décision ne peut rien créer.
- **Revue verbatim sous les yeux** : chaque claim s'affiche avec ses chunks
  cités (extrait, section) et les drapeaux de dérive de la couche source ; les
  deux natures de dérive ne sont jamais additionnées (« verbatims modifiés » =
  anomalie d'intégrité, « versions supersédées » = évolution normale).
- **Les deux gestes qui touchent une signature sont en deux temps** : le
  bouton arme, la confirmation agit — poser une validation comme l'effacer
  (« Remettre en attente ») ne part jamais d'un clic isolé.
- **Pagination réelle** : pages de 50 avec Précédent/Suivant, compte affiché
  exact (« 50 affichés sur 136 »), recul automatique quand une page se vide à
  mesure des décisions.
- Entrée « Atelier corpus » dans le rail praticien (groupe Instruments) ;
  onglets accessibles (tablist + tabindex roving, motif FichePatientPanel) ;
  ~35 tests Vitest (machine à états, SQL de signature inspecté, routes,
  panneau avec URLs assertées) + 1 E2E (rendu, état vide).

Dettes v1 assumées : pas de motif de rejet consigné, pas de journal
d'historique des décisions (l'annulation efface la signature — la
confirmation en deux temps réduit le risque, ne le supprime pas), revue non
proposée dans la navigation basse mobile, tri des versions lexicographique.
