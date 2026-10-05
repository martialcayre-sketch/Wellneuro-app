---
id: "LOT-05"
titre: "Adaptateur laboratoire (pilote Barbier Metz)"
statut: "à_faire"
dépend_de: "LOT-02, format réel reçu"
---

# LOT-05 — Adaptateur laboratoire (pilote Barbier Metz)

## But

Un adaptateur de laboratoire produit les mêmes lignes candidates que les autres voies, avec `source = import_labo`.

## Résultat observable

Un fichier réel du laboratoire pilote alimente le staging ; le laboratoire est identifié sur le lot d'import, pas sur le résultat.

## Périmètre

Aucun code avant la réception d'un format réel. Prendre alors la décision « rectificatif labo » (sœur de `D-124`).

Exigences reprises de l'entrée « Import laboratoire » de `FILE_ATTENTE.md`, close et absorbée ici le
2026-10-04 (`D-266` §15) : authentification de la source, doublons, **exactitude décimale de bout en
bout** (la valeur transitait en `number` JSON, dette nommée), volet RGPD (nouvelle provenance de
données de santé, sous-traitant éventuel).

## Hors périmètre

Présumer un format (CDA, HPRIM, HL7…) avant de l'avoir reçu.

## Fichiers probables

À déterminer selon le format reçu.

## Interdits

- Pas de secret, pas de donnée patient réelle (fixtures : Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune écriture dans `resultats_biologiques` sans validation humaine explicite.
- Aucune qualification clinique d'une valeur (basse, haute, pathologique), aucune recommandation.
- Aucune conversion d'unité (`D-157`), aucun choix final d'analyte par LLM.
- Pas de migration hors d'un lot marqué « confirmation obligatoire » (`D-087`).
- Pas de refactor hors lot.

## Dépendances

LOT-02, format réel reçu

## Étapes

- [ ] Obtenir un format réel et un échantillon anonymisé. Demande envoyée au laboratoire pilote le
  2026-10-05 (format, canal, contenu, rectificatifs, exemple fictif, conditions) ; réponse attendue.
- [ ] Décision rectificatif labo.
- [ ] Mode Plan, puis adaptateur.

## Tests

Rejeu d'échantillons anonymisés ; rectificatif ; doublons ; unités divergentes refusées.

## Critères de done

Adaptateur livré, ou lot transféré par arbitrage si aucun format n'est reçu.

## Résultats

À compléter à la clôture.
