---
id: "LOT-02"
titre: "Rail de navigation regroupé"
statut: "à faire"
dépend_de: "LOT-01"
---

# LOT-02 — Rail de navigation regroupé

## But

Structurer le rail praticien en groupes (disposition 5.0) : « Le Fil » en
tête, puis « Suivi » (Patients), « Instruments » (Synthèse IA), « Cabinet »
(Paramètres) — les groupes accueilleront les surfaces à venir
(correspondance, bibliothèques) sans nouveau remaniement.

## Résultat observable

Rail desktop et tiroir tablette groupés avec étiquettes ; navigation basse
mobile renommée (« Le Fil ») ; aucune route changée.

## Périmètre

- `web/src/components/ui/SidebarRail.tsx` : groupes + étiquettes (masquées
  en mode replié, séparateurs conservés) ;
- `web/src/components/ui/MobileBottomNav.tsx` : libellé « Le Fil » ;
- adaptation des tests e2e de navigation si les libellés changent.

## Hors périmètre

Nouvelles routes, nouveaux écrans, logique métier.
