---
id: "LOT-02"
titre: "Persistance et abstention au contrat"
statut: "livré"
dépend_de: "LOT-01"
---

# LOT-02 — Persistance et abstention au contrat

Anciennement « L3 » dans la série agenda alimentaire (PR #557).

Statut : livré. Ajoute la table, la couche de persistance et l'effacement
RGPD correspondant. Ni saisie (LOT-04) ni barème : l'ordre reste collecte
d'abord, calibrage ensuite.

## Livré

- Table `agenda_alimentaire_jours` (modèle `AgendaAlimentaireJour`, calqué sur
  `AgendaSommeilNuit`), migration `20260804120000_agenda_alimentaire_v1`
  **écrite à la main**. Append-only chaîné, deux FK en `RESTRICT`, RLS
  deny-all.
- **Aucune contrainte unique** sur `(id_assignation, date_jour)`,
  délibérément : les lignes supplantées restent, et
  `count(lignes) − count(distinct date_jour)` est le taux de correction.
- Le contrat gagne un troisième état : les quatre présences obligatoires
  acceptent désormais `null` (« je ne sais pas »), distinct de la clé absente
  — sans quoi un patient ignorant le contenu d'une journée devait répondre au
  hasard ou sauter la journée entière, perdant aussi les horaires.
  `soirPlusCopieux` n'accepte pas l'abstention (arbitrage praticien) :
  facultatif, il n'alimente qu'un drapeau.
- `listJours` rend `{ jours, illisibles }` : une ligne illisible est mise en
  quarantaine plutôt que de faire disparaître tout l'agenda.

## Constats majeurs

- `null !== undefined` en JavaScript : cinq prédicats de couverture (le plan
  initial en nommait un seul) passés à `typeof … === 'boolean'` pour ne pas
  compter une abstention comme une réponse « non ».
- Revue adversariale : condition de merge trouvée — la position de la ligne
  d'effacement RGPD n'était gardée par rien (le garde structurel est un
  `String.includes`, aveugle au déplacement) ; un futur lot réordonnant le
  bloc aurait rendu l'effacement impossible pour tout dossier portant une
  journée d'agenda (FK RESTRICT). Test d'ordre ajouté. Contradiction interne
  trouvée et corrigée : `listJours` faisait `rows.map(toJourRow)`, une seule
  ligne illisible faisait disparaître les vingt et une autres.
- Réserve déclarée : `persistence.test.ts` mocke Prisma intégralement, aucune
  route n'existe encore — aucun aller-retour contre une vraie base à ce
  stade. Contrat SQL correspondant posé au lot suivant (LOT-03).

## Tests et validations

- `npm run check` vert dans les deux positions de `WN_AGENDA_ALI` (3 485
  tests, +26).
- T3 complet vert en 2 min 6 s : PostgreSQL éphémère, `prisma migrate deploy`,
  drift check `migrate diff --exit-code`, contrats SQL, seed, 108 E2E.
- Cinq mutations vérifiées, chacune tue un test : prédicat remis en
  `!== undefined` (2), ligne d'effacement retirée (1), entrée de la liste de
  mocks retirée (8), ligne d'effacement déplacée (1), drapeau en fail-open au
  lot précédent.
