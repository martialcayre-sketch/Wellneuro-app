# Brief — Échéance HDS : lever ou reconduire G-TRUST-04 avant le 2026-10-21

## Objectif

Au 2026-10-21, la dérogation G-TRUST-04 expire. Sans reconduction écrite, le
gate ET le dossier RGPD (tableau §14 de `docs/DOSSIER_RGPD.md`, qui fait foi)
reprennent la règle du dépôt le même jour. La campagne aboutit à UN des deux
états, tracé : hébergement HDS opérationnel (migration Scalingo exécutée), ou
dérogation reconduite par écrit avec un nouveau terme.

## État réel au cadrage (2026-08-18)

- Seul `blocking_issue` transverse de `.wn/state.json` (:51).
- HDS instruit négatif : Supabase/Vercel hors annuaire ANS.
- Migration Scalingo DÉCIDÉE (D-006, confirmée D-037), jamais exécutée.
- Runbook HDS versé dans `main` (reprise-chantiers LOT-03) ; staging revérifié
  le 2026-08-05 ; réponse au ticket Scalingo attendue.
- L'information des personnes (« au plus tôt ») est déjà échue.
- Questions humaines héritées de g-trust-04-durcissement : reconduction ou
  levée ; confirmation juridique D-TRUST-02.

## Lots pressentis (4)

1. **Décision documentée** : reconduction vs exécution — arbitrage du
   responsable de traitement, tracé au registre (décision D-xxx). Inclut la
   relance/lecture du ticket Scalingo.
2. **Exécution du runbook Scalingo** — CONFIRMATION OBLIGATOIRE (migration
   d'infrastructure et de base ; jamais dans la même PR qu'un code dépendant).
   Ne s'ouvre que si le lot 1 tranche « migrer ».
3. **Dossier RGPD et information des personnes** : mise à l'état réel du
   dossier, rattrapage de l'information échue.
4. **Levée ou reconduction tracée du gate** : G-TRUST-04 change d'état dans
   `state.json` et `REGISTRE_FRONTIERES.md`, avec sa preuve.

## Contraintes et interdits

- Aucun stockage de donnée de santé réelle tant que le gate tient (invariant
  roadmap §2) — la campagne ne débloque E8/D5, elle ne les commence pas.
- Production lue uniquement via MCP `execute_sql` ; migration par release-db.
- Les décisions des lots 1 et 4 appartiennent au responsable de traitement,
  pas à l'assistant.

## Dépendances

- Réponse du ticket Scalingo (externe).
- D-TRUST-02 (confirmation juridique) peut avancer en parallèle.

## Pourquoi campagne primaire

C'est la seule échéance du dépôt qui avance sans nous. Coût du report :
au 2026-10-21, perte du droit de faire tourner l'outil en phase de test
dérogatoire — tout le reste de la file devient secondaire ce jour-là.
