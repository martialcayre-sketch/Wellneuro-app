---
id: "LOT-01"
titre: "Le rayon Patients dans le rail"
statut: "terminé (2026-09-16, PR #1152)"
dépend_de: "—"
---

# LOT-01 — Le rayon Patients dans le rail

## But

Sortir la gestion des dossiers de l'héritage 4.0. `/dashboard/patients` devient
le rayon **Patients** ; assignations et packs rejoignent la Bibliothèque ;
l'entrée « Questionnaires & packs » disparaît du rail et de son jumeau mobile.

**Aucune migration, aucune route touchée** — la route des patients sert déjà les
deux formes dont la scission a besoin.

## Résultat observable

1. « Patients » figure dans « La Spirale », en 2ᵉ position, sous « Le Fil du
   jour ». La fiche `/dashboard/patients/PAT007` retrouve une liste cohérente
   au-dessus d'elle.
2. « Questionnaires & packs » n'est plus dans le rail, ni dans la feuille
   « Plus » de la nav basse.
3. La Bibliothèque porte un rayon « Assignations et packs » de plus, au gabarit
   de ses trois rayons existants.
4. Aucun écran ne renvoie vers une page disparue.

## Périmètre

- `components/ui/SidebarRail.tsx` — ajouter l'item, retirer celui d'héritage,
  **corriger les commentaires l. 39 et 54** qui deviennent faux (ils expliquent
  une désambiguïsation avec un item qui n'existe plus).
- `components/ui/MobileBottomNav.tsx:12,29` — même geste.
- Scinder `components/PatientsPanel.tsx` (1271 l.) **sans changer un
  comportement** :
  - `components/patient/RayonPatientsPanel.tsx` — tableau paginé, recherche,
    tri, `PatientRow`, `DossierConfirmDialog`, tiroirs « Nouveau patient » et
    « Nouvelle consultation », actions d'accès portail.
  - `components/bibliotheque/AssignationsPacksPanel.tsx` — tiroir « Nouvelle
    assignation », `PacksPanel`, « Assignations récentes »,
    `AnnulationAssignationDialog`, filtre de statut.
- `app/dashboard/patients/page.tsx` — titre « Patients », chapô réécrit.
- `app/dashboard/bibliotheque/page.tsx` — une `<section>` de plus.
- `components/trajectoires/TrajectoiresPanel.tsx:91` — l'état vide renvoie vers
  « Patients ».

## Ce qui rougit, et qui doit être traité dans le lot

- `e2e/trajectoires.spec.ts:38-55` — assère nommément l'item de rail retiré.
- `e2e/dashboard-praticien.spec.ts:40` — `a[href*="patients"]:visible` depuis
  `/dashboard` : le motif attrape aussi les liens de fiche des cartes du Fil, et
  devient fragile dès le retrait de l'entrée de rail.
- `e2e/visual.spec.ts:352` — le test « patients & assignations » porte sur deux
  pages désormais. À scinder.
- `app/dashboard/bibliotheque/page.test.tsx:8-20` — quatre `vi.mock` de panneaux
  servent de témoins « monté / non monté » ; il en faut un de plus, sans quoi
  les `fetch` au montage cassent les onze cas.
- `scripts/wn-matrice-consommation.test.mjs:638` — garde de fraîcheur, la
  colonne « surface qui la consomme » est **dérivée du graphe d'imports** :
  rejouer `node scripts/wn-matrice-consommation.mjs --markdown`.
- Les trois baselines `*-Desktop-Chromium-linux.png`.

## Done

- `PatientsPanel.test.tsx` (1284 l.) scindé, aucun cas perdu.
- **Un banc neuf pour `SidebarRail`** — le trou de couverture se comble ici :
  « Patients » présent, « Questionnaires & packs » absent, un seul item actif
  sur `/dashboard/patients`.
- T2 vert ; baselines régénérées par workflow, relues image par image.
