---
id: "LOT-03"
titre: "navigation-mobile"
statut: "fait"
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

- [x] Implémenter la navigation basse (breakpoint mobile).
- [x] Implémenter la bottom sheet du menu « Plus ».
- [x] Vérifier les zones tactiles (taille, espacement) sur un viewport mobile réel ou émulé.
- [x] Capturer les 3 patients fictifs sur viewport mobile, thème praticien sombre.

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

Navigation basse mobile implémentée dans `web/src/components/ui/MobileBottomNav.tsx` (nouveau,
sans props, auto-suffisant) et câblée dans `NavBar.tsx`. Constat de départ : le code n'avait
qu'une coupure à deux niveaux sur `lg` (1024px) ; introduction d'une coupure à trois niveaux —
rail persistant `≥1024px` (inchangé), panneau ☰ tablette existant borné à `768–1024px` (classes
`hidden md:flex lg:hidden` sur le bouton ☰ et le panneau, contre `lg:hidden` non borné
auparavant), navigation basse `<768px` (nouvelle).

4 entrées conformes à l'arbitrage LOT-00 §2.5 : Accueil / Patients / Synthèses / Plus, « Plus »
ouvrant une bottom sheet contenant uniquement Paramètres. Sheet accessible : `role="dialog"`,
`aria-modal`, fermeture par Escape/clic fond/✕/navigation, focus déplacé sur le lien Paramètres à
l'ouverture et restauré sur le bouton « Plus » à la fermeture — comportement clavier volontairement
ajouté au nouveau composant seulement, sans rétrofit sur le panneau ☰ existant (hors périmètre,
risque de régression LOT-02). Tokens réutilisés uniquement (`bg-surface-elevated`,
`bg-primary`/`text-primary-foreground`, `text-muted-foreground`, `focus-ring`), documenté dans
`docs/design-system-d1.md` (nouvelle sous-section « Navigation mobile C0-UX / LOT-03 »).

**Validations exécutées** : `npm run type-check` OK, `check_no_secrets.sh` OK. Vérification
manuelle (capture Playwright ponctuelle, non committée) aux trois paliers 375/900/1100px : mobile
affiche uniquement la nav basse (rail et ☰ absents), tablette conserve le panneau ☰ intact,
desktop conserve le rail persistant intact — aucune régression LOT-02. Cible tactile mesurée
≥44px sur les liens de la barre basse. Les 3 patients fictifs (Sophie Nicola, Jennifer Martin,
Michel Dogne) confirmés visibles sur `/dashboard/patients` en viewport mobile, thème praticien
sombre. Nouveau test Playwright dans `dashboard-praticien.spec.ts` (`mobile bottom navigation`) :
4 passed sur le projet `Desktop Chromium` (viewport mobile forcé via `test.use`). Projet `iPhone
13` (WebKit) non exécutable dans cet environnement local (bibliothèques système WebKit absentes,
limitation préexistante déjà notée lors de R8/R8.2 — WebKit fonctionne en CI, qui a les
dépendances installées depuis R8.2).

**Fichiers modifiés** : `web/src/components/ui/MobileBottomNav.tsx` (nouveau),
`web/src/components/NavBar.tsx`, `web/e2e/dashboard-praticien.spec.ts`,
`docs/design-system-d1.md`.

**Dette non bloquante** : le panneau ☰ tablette (LOT-02) n'a pas de gestion Escape/focus au
clavier, contrairement à la nouvelle bottom sheet — incohérence mineure documentée, pas corrigée
dans ce lot (hors périmètre).
