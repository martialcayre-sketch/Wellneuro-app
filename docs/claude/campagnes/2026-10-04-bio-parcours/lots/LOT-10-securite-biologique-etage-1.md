---
id: "LOT-10"
titre: "BP-10 — Sécurité biologique, étage 1"
statut: "à_faire"
dépend_de: "LOT-02, BIO-INGEST LOT-07"
---

# LOT-10 (BP-10) — Sécurité biologique, étage 1

## But

Fermer la dette présente du résultat préoccupant. Le marquage d'anomalie
imprimé par le laboratoire est restitué tel quel, et un acte de lecture
clinique tracé est exigé. Wellneuro ne lit aucune valeur.

## Résultat observable

Un import validé sans acte de lecture est signalé par une carte « geste »
destinée au praticien du dossier. Cette carte n'est pas acquittable par
simple lecture. Ce lot est la précondition de BIO-INGEST LOT-04.

## Périmètre

- Le marquage transcrit par BIO-INGEST LOT-07 est restitué tel quel.
- L'acte de lecture clinique est distinct de la validation d'import.
- La carte « geste » est un objet nouveau, distinct de `FilCardLecture`.
- Lettre et `medical_referral` passent par la chaîne D-218, D-257 et D-262.
- Levée et révocation se font en ajout seul ; la notification n'échoue
  jamais en silence.
- La surface dit qu'elle n'est pas un filet de sécurité.

## Hors périmètre

La cotation sur valeur (étage 2, étage assistant), toute lecture de valeur.

## Fichiers probables

- `web/prisma/migrations/` (migration seule, première PR)
- `web/src/lib/` (code consommateur, seconde PR)

## Interdits

- **Migration : confirmation distincte**, `release-db` approuvée, constat par
  conteneur, puis le code dans une seconde PR (`D-266` §11).
- Passe Codex obligatoire sur la migration.
- Registre RGPD et note patient mis à jour avant la table.
- Aucune lecture de valeur ; pas de secret, pas de donnée patient réelle.

## Dépendances

LOT-02 (BP-02), BIO-INGEST LOT-07 ; `D-xxx` de sécurité biologique, qui
consigne aussi BP-10 → BIO-INGEST LOT-04.

## Étapes

- [ ] Rédiger la décision de sécurité biologique.
- [ ] Livrer la migration seule et la faire appliquer par `release-db`.
- [ ] Livrer le code consommateur derrière un drapeau né avec lui.

## Tests

T3 ; banc « import validé sans lecture → signalé » ; contrat SQL négatif.

## Critères de done

`release-db` constatée ; le banc mord ; la précondition de LOT-04 est
consignée.

## Résultats

À compléter à la clôture.
