# 2026-08-22 11:55 — Socle LOT-01 : la couverture des chemins sortants est prouvée

## Ce qui a changé

- **Carte des chemins sortants** en tête de `documents/vocabulaire.ts` —
  quatre chemins, garde, régime, banc de câblage ; consigne pour tout chemin
  neuf (garde + banc dans la même PR). C'est le contrat que les campagnes 6.0
  devront honorer.
- **Re-vérification au service du bilan portail** (journalisante,
  `PORTAIL_BILAN_REGISTRE_ANXIOGENE`) — le narratif servi vient du champ
  vivant `syntheseJson`, seul un texte réécrit après envoi pouvait sortir sans
  garde. Le log porte le champ, jamais le terme.
- **Quatre preuves de mutation** : bilan (3 rouges), rendu médecin (1 rouge —
  banc de câblage neuf, le banc unitaire ne prouvait que la fonction),
  booklet (3 rouges), synthèse (4 rouges) — tout rebranché vert.

## L'arbitrage instruit pour le responsable — non tranché

Faut-il durcir des régimes ? Trois options, coûts nommés :

- **A (statu quo, défaut si rien n'est décidé)** : synthèse journalisante,
  booklet confirmable, bilan-service journalisant, rendu médecin refus dur.
  Coût : un narratif réécrit après envoi part au patient avec son terme —
  tracé, mais servi.
- **B (retenir au service du bilan)** : impossible proprement aujourd'hui —
  la garde d'envoi est confirmable et le modèle de données ne porte pas
  « quel terme a été confirmé » : on retiendrait ce que le praticien a validé.
  La vraie fermeture est un **instantané de `syntheseJson` figé à l'envoi**
  (migration, décision séparée).
- **C (synthèse bloquante)** : la génération rejouerait au lieu de
  journaliser — change le geste praticien, à ne décider qu'en connaissance.

Toute option ≠ A exige une décision `D-xxx`.

## À savoir pour la suite

- `booklet/route.ts` est en **CRLF** : une réécriture en mode texte Python le
  normalise en LF et produit un diff intégral fantôme — restaurer depuis HEAD,
  ne jamais committer une normalisation involontaire.
- Prochain lot : LOT-02 (hook « demande » sur huit fichiers cliniques +
  en-tête d'`orientationRulesV1` sous `D-xxx`) — indépendant, la relecture
  adversariale du diff de hook est obligatoire avant merge.

## Ouvert

- T2 en cours au moment de ce handoff ; la PR du lot suit son verdict.
- Arbitrages responsables pendants : régimes de garde (ci-dessus),
  `stopRulesLibelles` (LOT-02), base E2E dédiée du Mac, commentaire du verrou
  `isCbResultsEnabled` (CB-09).
