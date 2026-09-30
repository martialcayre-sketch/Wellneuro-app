---
id: "LOT-04"
titre: "Transmission depuis le portail patient"
statut: "à_faire"
dépend_de: "LOT-02, consentement RGPD à jour"
---

# LOT-04 — Transmission depuis le portail patient

## But

Le patient transmet son compte rendu depuis `/portail/[token]`. Un **document transmis** reste distinct d'un **résultat validé**.

## Résultat observable

Le patient voit le statut de son document (en attente, reçu, validé, refusé ou illisible) ; le praticien valide dans l'écran du LOT-02.

## Périmètre

Upload portail (session par lien magique), statut du document, notification praticien. **Migration probable — confirmation obligatoire, seule dans sa PR.**

## Hors périmètre

Toute écriture de résultat sans validation praticien ; messagerie de santé.

## Fichiers probables

- `web/src/app/portail/`
- `web/src/app/api/portail/`
- `docs/DOSSIER_RGPD.md`, consentement versionné

## Interdits

- Pas de secret, pas de donnée patient réelle (fixtures : Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune écriture dans `resultats_biologiques` sans validation humaine explicite.
- Aucune qualification clinique d'une valeur (basse, haute, pathologique), aucune recommandation.
- Aucune conversion d'unité (`D-157`), aucun choix final d'analyte par LLM.
- Pas de migration hors d'un lot marqué « confirmation obligatoire » (`D-087`).
- Pas de refactor hors lot.

## Dépendances

LOT-02, consentement RGPD à jour

## Étapes

- [ ] Mettre à jour le consentement et le registre **avant** l'ouverture.
- [ ] Mode Plan : droits, taille, types, rétention.
- [ ] Migration seule si nécessaire, puis code.

## Tests

Sécurité : jeton expiré ou réutilisé, dossier d'autrui, type de fichier ; E2E portail sur fixture ; accessibilité.

## Critères de done

Transmission ouverte après le consentement à jour ; aucun résultat écrit sans validation praticien.

## Résultats

À compléter à la clôture.
