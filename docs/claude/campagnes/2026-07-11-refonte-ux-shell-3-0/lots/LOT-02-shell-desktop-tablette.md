---
id: "LOT-02"
titre: "shell-desktop-tablette"
statut: "fait"
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

- [x] Vérifier les hypothèses du wireframe LOT-00 contre les routes réelles.
- [x] Implémenter le rail gauche + barre de commande (desktop).
- [x] Adapter le comportement tablette (rail compact paysage, rétractable portrait).
- [x] Vérifier le focus clavier et l'état actif de chaque entrée.
- [x] Capturer les 3 patients fictifs dans le thème praticien sombre.

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

Implémenté : `web/src/components/NavBar.tsx` reconstruit depuis le wireframe LOT-00 (barre de commande
simplifiée + rail persistant compact ⇄ étendu mémorisé en `localStorage`, panneau overlay dédié pour
tablette portrait/mobile), nouveau composant présentationnel `web/src/components/ui/SidebarRail.tsx`
partagé entre les deux rendus. Aucune entrée hors périmètre (Packs/Équilibre/Biologie réservées LOT-03,
non ajoutées). `signOut` et routes inchangés.

Incident de coordination pendant l'implémentation : une fusion concurrente (`e5259f1`, autre session) a
temporairement réintroduit une ébauche antérieure non conforme (cassait le type-check, réintroduisait le
contenu hors périmètre) ; réconcilié en réappliquant la version conforme au plan approuvé (`359524d`).

Un bug réel (préexistant, indépendant de ce lot) a été détecté et corrigé dans
`web/e2e/dashboard-praticien.spec.ts` : l'assertion `.first()` résolvait toujours le lien du rail masqué par
CSS sur mobile plutôt que celui du panneau overlay ouvert — corrigé par un filtre `:visible` (`60cd871`).

Vérification manuelle (captures + script Playwright ad hoc, `NEXTAUTH_SECRET` local temporaire) :
- Rail compact/étendu desktop, persistance `localStorage` confirmée après rechargement.
- Panneau overlay tablette portrait (834×1112) et mobile (390×844) fonctionnels.
- Parcours clavier complet (Tab) : recherche → Profil ▾ → 4 liens du rail (labels et `aria-current`
  corrects) → bascule compact/étendu → contenu principal ; icône 🔔 exclue de la tabulation (décorative).
- Bug détecté et corrigé pendant cette vérification : en rail compact, "Patients" et "Paramètres"
  affichaient tous deux "PA" (slice automatique des 2 premières lettres) — remplacé par des abréviations
  explicites (AC/PT/SY/PM) dans `SidebarRail.tsx` (`db0c670`).

CI GitHub Actions verte sur `db0c670` (type-check, lint, build, Vitest, Playwright Desktop Chromium +
iPhone 13).
