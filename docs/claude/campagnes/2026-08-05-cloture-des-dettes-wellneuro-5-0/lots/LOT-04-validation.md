---
id: "LOT-04"
titre: "Un seul parcours patient"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-04 — Un seul parcours patient

## But

Deux parcours coexistent : le portail permanent (`web/src/app/portail/[token]/`,
la cible) et le flux historique par assignation
(`web/src/app/patient/[idAssignation]/page.tsx`). Tant que les deux vivent, deux
URL doivent être testées, deux parcours peuvent diverger, chaque correction se
reporte deux fois, les analytics deviennent illisibles et le support patient reste
ambigu.

On ne supprime pas une URL sans preuve qu'elle n'est plus empruntée. Ce lot
**date** le retrait et le prépare ; il l'exécute seulement si la preuve est là.

## Résultat observable

- On sait, chiffres à l'appui, combien de patients ont emprunté le parcours
  legacy sur les 30 derniers jours.
- Le parcours legacy porte, dans le code et dans la doc, une **date de retrait**.
- S'il n'est plus emprunté : il est retiré, et une redirection vers le portail
  remplace la route.
- S'il l'est encore : les patients concernés ont un chemin de bascule identifié,
  et le retrait est planifié dans un lot ultérieur nommé.

## Périmètre

- Mesurer l'usage réel du parcours legacy (`execute_sql`, lecture seule).
- Comparer les deux parcours : quelle divergence fonctionnelle existe aujourd'hui ?
- Marquer la route legacy comme sortante (commentaire daté, doc, analytics).
- Retrait ou redirection **si et seulement si** l'usage est nul.

## Hors périmètre

- Refonte du portail permanent.
- Migration de données patient.
- Suppression de la notion d'assignation côté praticien — seule la **surface
  patient** est concernée. Les routes `api/praticien/*` qui manipulent
  `idAssignation` restent inchangées.

## Fichiers probables

- `web/src/app/patient/[idAssignation]/page.tsx`, `web/src/app/patient/layout.tsx`
- `web/src/app/portail/[token]/`
- `web/e2e/` (parcours à dédupliquer si retrait)
- `docs/claude/PROJET_CONTEXTE.md`
- `changelog.d/2026-08-05-parcours-patient-unique.md`

## Interdits

- Pas de donnée patient réelle — mesure agrégée seule, exemples limités à Sophie
  Nicola, Jennifer Martin, Michel Dogné.
- Pas de suppression d'URL sans mesure préalable.
- Pas de migration.
- **E2E sur le Mac uniquement** (`npm run test:e2e` réinitialise `PAT_SEED_03`).

## Étapes

- [ ] Mesurer l'usage du parcours legacy sur 30 jours.
- [ ] Documenter les divergences fonctionnelles entre les deux parcours.
- [ ] Marquer la route sortante avec sa date de retrait.
- [ ] Retirer ou rediriger si usage nul.
- [ ] T3 `npm run test:worktree` (changement de parcours patient).

## Tests

- E2E : le portail couvre tout ce que couvrait le parcours legacy.
- Si redirection : test qu'une ancienne URL mène au portail sans perte de contexte.
- Baselines visuelles à rafraîchir si l'UI bouge.

## Critères de done

- [ ] L'usage réel du legacy est chiffré et écrit.
- [ ] Une date de retrait existe, dans le code et dans la doc.
- [ ] Les E2E ne testent plus deux fois le même parcours pour rien.
- [ ] Aucune régression sur le parcours patient (T3 vert).

## Résultats

À compléter à la clôture.
