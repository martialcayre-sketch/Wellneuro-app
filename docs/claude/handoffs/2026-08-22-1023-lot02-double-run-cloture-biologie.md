# 2026-08-22 10:23 — LOT-02 prouvé, la campagne Biologie consolidée se clôt

## Ce qui a changé

- **Le critère manquant du LOT-02 est produit** : deux runs consécutifs verts
  du spec `biologie-proposition-courrier` (2 × 6 tests, WebKit iPhone
  compris), sur la même base persistante — le nettoyage est prouvé, pas
  supposé. Le CI avait déjà joué le spec en premier (verify vert sur la
  PR #726) : le « jamais joué » de son corps de PR était périmé par son propre
  CI.
- **Clôture complète sur la branche de #726** : lot terminé, campagne
  « terminée (2026-08-22 — les trois lots livrés) », `lot_courant: aucun`,
  ligne rang 0 de `FILE_ATTENTE.md`, `wn-campaign deactivate` + `sync`,
  `next_action` réécrit avec trace de l'ancienne tête.

## À savoir pour la suite — et c'est important

- **La « base partagée du Mac » est la base de PRODUCTION.** `.env.local`
  pointe le pooler du projet Supabase de prod (référence vérifiée sans exposer
  de secret). Le workflow historique l'assume (fixtures et dossiers de test
  réels y cohabitent, D-075), mais le double run ne s'y est PAS joué : un spec
  jamais exécuté localement ne s'essaie pas en premier contre la production —
  d'autant que la première version de son nettoyage aurait été destructrice
  (constat de la revue de #726). Preuve rendue sur PostgreSQL jetable local
  (initdb + migrate deploy + seed), valeur identique, production intouchée.
- **À décider (hors de ce lot)** : écrire noir sur blanc dans
  `docs/ROLES_MACHINES.md` que la base partagée est la production, et/ou doter
  le Mac d'une base E2E locale dédiée pour les prochains specs.
- Le blocage WebKit de `D-049` ne mord pas ce spec (projet iPhone 13 vert
  deux fois) — il reste propre au parcours portail.
- Défaut nommé, sans lot d'accueil : la double consignation biologie n'a pas
  de garde serveur (verrou côté écran seulement).

## Ouvert

- CI de la PR #726 (rafraîchie sur main post-#731) ; merge = Copilot ou go du
  responsable. Au merge : campagne close, **créneau primaire ouvert** —
  prochaine en file : Socle de restitution sûre (rang 1), ouverture = geste du
  responsable.
- Restes de la session HDS parallèle toujours en stash (voir handoff
  précédent) ; arbitrages pendants inchangés.
