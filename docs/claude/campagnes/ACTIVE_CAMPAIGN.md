# Campagnes actives

**IDP2 — Compte patient et cycle de vie du dossier**
(`2026-07-21-idp2-auth-patient-et-cycle-de-vie`) — lot courant **LOT-02**,
**terminé**. LOT-01 livré en
deux PR : 01a (#189, migration `suiviClotureLe` + `dossiers_effaces`), 01b
(#194, menu regroupé et confirmations). **LOT-02 livré en trois PR** : 02a
documentaire (#200), 02b découplage de la session patient et migration
`sessionsInvalidesAvant` **déployée et vérifiée en production** (#202), 02c
fermeture des liens en vol et confirmation de révocation.

**Statut global** : en_cours
**Mise à jour** : 2026-07-21

> La source de vérité machine est `.wn/state.json`.
>
> **Prochain lot d'IDP2 : LOT-03** (Google comme premier chemin, séparation
> stricte des rôles). Il reste **à spécifier** — aucun `lots/LOT-03-*.md`
> n'existe, et l'audit refuse un `lot_courant` sans fichier. LOT-04 porte une
> migration **destructive** sur `patients.access_token` : à ne pas enchaîner.
>
> Prochain lot `à_faire` et non bloqué en dehors d'IDP2 : la suite de
> **SP-SPI / LOT-01** — son volet 01a (accueil séquentiel « Mon parcours »,
> écart E11) est livré le 2026-07-21 (#198).
