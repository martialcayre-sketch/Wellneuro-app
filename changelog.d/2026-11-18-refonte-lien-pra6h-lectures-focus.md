### Refonte Lien, PRA-6h : une réponse hors contrat reste dans son panneau, le focus suit un « Réessayer », l'aperçu d'un questionnaire sort du clavier (2026-11-18)

Lot du constat à l'écran de PRA-6 (`pra6-constat.md`, §3.2). Aucun texte
neuf, aucun décor, ni route, ni garde, ni drapeau, ni schéma.

- **Réponse hors contrat** (règle `error-recovery`). Sous un 500 JSON
  `{error}` d'un autre émetteur que nos routes, le Fil du jour (P01) et la
  Correspondance (P53) basculaient sur l'erreur globale : chaque panneau
  lisait sa liste sans tester `r.ok` ni la forme de la réponse. Le Fil, l'inbox
  des questionnaires, les nouveaux patients, la Météo d'adhésion, le suivi des
  agendas et la correspondance récente tombent désormais dans leur état
  d'échec existant, avec leur texte actuel. Les nouveaux patients ne se
  disent plus « aucun » sous une telle réponse.
- **Focus après un « Réessayer »** (arbitrage du responsable du 2026-11-18,
  question `20261118-2228-d`). Le bouton se démonte pendant la relecture et le
  focus tombait sur `body`. Il revient au bouton si la lecture échoue encore,
  et va au titre du panneau rechargé si elle réussit, titre rendu focusable
  par `tabIndex={-1}` (`ui/useFocusApresRelecture`). Appliqué aux synthèses
  (P51), aux documents (P52), au pré-vol et à la minute d'après du copilote,
  et aux « Réessayer » praticien qui n'avaient pas de gestion du focus :
  besoins, recherche et atelier corpus, correspondance du dossier, rayons des
  compléments, des fiches d'usage et des fiches conseils, relectures de
  fiches, « Ce qui compte », documents déposés et remis, objectif négocié,
  orientation, données physiologiques, atelier des règles. Un panneau sans
  titre visible garde le focus au bouton en cas d'échec ; aucun titre n'est
  créé.
- **Aperçu d'un questionnaire (P37)** : la zone d'aperçu, `aria-hidden`,
  reçoit `inert` ; ses champs sortent de l'ordre de tabulation, sans
  changement d'apparence (axe `aria-hidden-focus`).
- **Atelier corpus (P47)** : la ligne des versions supersédées de la tuile
  « Verbatims modifiés » passe de `<p>` à `<dd>` ; la `<dl>` des compteurs ne
  porte plus que des `<dt>` et des `<dd>` (axe `definition-list`).
