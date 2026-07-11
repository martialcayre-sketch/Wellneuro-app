---
id: "LOT-02"
titre: "shell-desktop-tablette"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-02 — Shell desktop/tablette (rail gauche + barre de commande)

## But

Remplacer la navigation horizontale actuelle (`web/src/components/NavBar.tsx`) par le shell validé en
LOT-00 : rail de navigation gauche (desktop, tablette paysage) et barre de commande supérieure, sans changer
les routes ni la logique de déconnexion.

## Résultat observable

Le rail gauche et la barre de commande sont visibles sur `web/src/app/dashboard/**` en desktop et tablette,
dans le thème praticien sombre, avec les libellés/icônes tranchés en LOT-00. Les liens existants
(Dashboard, Patients, Synthèse IA, Paramètres) restent fonctionnels, `signOut` inchangé.

## Périmètre

- `web/src/components/NavBar.tsx` (ou nouveau composant de rail, en conservant `NavBar` comme point
  d'intégration si plus simple).
- `web/src/app/dashboard/layout.tsx` (conteneur du shell).
- Tokens ajoutés en LOT-01 uniquement (pas de nouvelle palette).

## Hors périmètre

- Navigation mobile (LOT-03).
- Contenu du dashboard, de l'annuaire ou de la fiche patient.
- Toute route API, `signOut`, ou logique d'authentification.

## Fichiers probables à lire

- `web/src/components/NavBar.tsx`
- `web/src/app/dashboard/layout.tsx`
- `docs/design-system-d1.md`

## Fichiers modifiables pressentis

- `web/src/components/NavBar.tsx`
- `web/src/app/dashboard/layout.tsx`
- Éventuellement un nouveau composant `web/src/components/ui/SidebarRail.tsx` si la séparation est plus
  claire qu'une modification en place.

## Interdits

- Pas de secret.
- Pas de donnée patient réelle (seuls Sophie Nicola, Jennifer Martin, Michel Dogne en démonstration).
- Pas de migration ou écriture Supabase.
- Pas de changement de route, de `signOut`, ou de logique métier.
- Aucun état ou action critique dépendant uniquement du survol.

## Étapes

- [ ] Vérifier les hypothèses du wireframe LOT-00 contre les routes réelles.
- [ ] Implémenter le rail gauche + barre de commande (desktop).
- [ ] Adapter le comportement tablette (rail compact paysage, rétractable portrait).
- [ ] Vérifier le focus clavier et l'état actif de chaque entrée.
- [ ] Capturer les 3 patients fictifs dans le thème praticien sombre.

## Tests

```bash
cd web && npm run type-check
bash scripts/check_no_secrets.sh
```

Vérification manuelle : navigation clavier complète (Tab/Entrée), aucune régression sur les liens existants,
`signOut` fonctionnel.

## Critères de done

- Rail gauche et barre de commande visibles et fonctionnels sur desktop/tablette.
- Aucune route modifiée, `signOut` inchangé.
- Focus clavier et état actif visibles sans survol.

## Résultats

À compléter à la clôture.
