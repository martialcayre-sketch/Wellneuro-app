---
id: "LOT-07"
titre: "Bilan — ce qui a été livré, et ce qui a été mesuré"
statut: "à faire"
dépend_de: "tous"
---

# LOT-07 — Bilan

## But

Clore la campagne en distinguant ce qui est **livré** de ce qui est **utilisé** — la
confusion des deux est exactement ce que le bilan `D-112` a reproché aux campagnes
6.0-A et 6.0-B.

## Résultat observable

Un `BILAN.md` au dossier de campagne qui dit, lot par lot : ce qui est livré, ce qui
a été laissé, et **ce qui a été mesuré**.

## Périmètre

- **La mesure**, au conteneur `scalingo run -d`, sur dossiers réels lus **par
  identifiant** — jamais sur fixture (`D-125`) : y a-t-il une version de protocole C1
  en base ? combien de dossiers ont franchi la sélection de priorité ? une intention
  `conditionnelle_biologie` a-t-elle été posée ?
- **`FILE_ATTENTE.md`** : l'entrée « Producteur d'intentions `conditionnelle_biologie`
  (+ contrat V4 CB-07 transféré) » est soldée ou requalifiée avec son motif.
- Les coupures restantes de `D-179`, nommées avec un porteur ou reconduites :
  hydratation du constructeur, caducité silencieuse de la diffusion, `versionsLues`
  non remonté au rail, `adviceSheetRef` mort.
- Handoff + `SESSION_LOG.md`.

## Hors périmètre

Rouvrir un arbitrage tranché au cadrage. Conclure sur l'usage à partir d'une fixture.

## Interdits

- Aucun dossier réel désigné par son nom ou son e-mail, au dépôt comme au commit.
- Aucune donnée patient dérivée ou « complétée ».

## Étapes

- [ ] Lire la production au conteneur, dé-identifier.
- [ ] Écrire le `BILAN.md`.
- [ ] Mettre `FILE_ATTENTE.md` et `CAMPAGNE.md` à jour.
- [ ] Handoff + `SESSION_LOG`, **avant** la PR.

## Tests

Aucun code.

## Critères de done

Le bilan distingue livré et utilisé ; la file ne porte plus d'entrée soldée ; la
clôture est écrite avant le merge, pas après.
