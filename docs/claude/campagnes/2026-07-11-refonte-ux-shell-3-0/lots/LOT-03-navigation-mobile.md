---
id: "LOT-03"
titre: "navigation-mobile"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Navigation mobile (bottom nav + bottom sheet)

## But

Ajouter la navigation basse mobile (Accueil / Patients / Synthèses / Plus, ou l'ensemble tranché en LOT-00)
et la bottom sheet du menu « Plus », sans dépendance au survol et avec des zones tactiles conformes.

## Résultat observable

Sur une largeur mobile (< 768 px), le rail gauche est remplacé par une navigation basse ; le menu « Plus »
ouvre une bottom sheet listant les entrées secondaires tranchées en LOT-00.

## Périmètre

- Composant de navigation basse (nouveau, ex. `web/src/components/ui/MobileBottomNav.tsx`).
- Composant bottom sheet minimal (nouveau ou réutilisation d'un pattern existant si disponible).
- Intégration dans `web/src/app/dashboard/layout.tsx` via media query / breakpoint.

## Hors périmètre

- Portail patient (thème clair, hors périmètre de cette campagne).
- Contenu des pages elles-mêmes (dashboard, patients, etc.).

## Fichiers probables à lire

- `web/src/app/dashboard/layout.tsx` (après LOT-02)
- `sources/UX_WELLNEURO_3_0.md` §4.3, §8.4, §9.3 (zones tactiles)

## Fichiers modifiables pressentis

- `web/src/app/dashboard/layout.tsx`
- Nouveau(x) composant(s) sous `web/src/components/ui/`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase.
- Aucune action critique dépendant uniquement du survol ; zones tactiles ≥ 44×44 px.

## Étapes

- [ ] Implémenter la navigation basse (breakpoint mobile).
- [ ] Implémenter la bottom sheet du menu « Plus ».
- [ ] Vérifier les zones tactiles (taille, espacement) sur un viewport mobile réel ou émulé.
- [ ] Capturer les 3 patients fictifs sur viewport mobile, thème praticien sombre.

## Tests

```bash
cd web && npm run type-check
bash scripts/check_no_secrets.sh
```

Vérification manuelle : navigation tactile sur émulateur mobile (largeur < 768 px), zones tactiles
mesurées ≥ 44×44 px, aucune action essentielle cachée derrière un survol.

## Critères de done

- Navigation basse fonctionnelle sur mobile, sans régression desktop/tablette (LOT-02 intact).
- Bottom sheet accessible au clavier et au toucher.
- Zones tactiles conformes.

## Résultats

À compléter à la clôture.
