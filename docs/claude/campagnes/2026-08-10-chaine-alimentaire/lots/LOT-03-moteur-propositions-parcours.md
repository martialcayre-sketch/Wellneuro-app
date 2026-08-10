---
id: "LOT-03"
statut: "à faire"
---

# LOT-03 — Moteur de propositions de parcours alimentaire

## Objet

Le cœur de la vision : questionnaires du tour 1 (`PACK_BASE`) + assignations
post-synthèse (Q_ALI_02/03, agenda clôturé) → **proposition de parcours
alimentaire** → synthèse IA de la proposition → protocole praticien
(`clinical-engine/protocolDraft.ts`, existant) → adhésion au carnet
(`food-observation`, existant). Le précédent architectural est le moteur
d'orientation (`orientationEngine.ts:610-804`) : règles publiées seulement,
claims tracés, filtre d'administrabilité fail-closed, recalcul depuis
`rawAnswers`.

## Découpage interne prévisible (chaque pièce = sa PR)

1. Règles de parcours dans une table versionnée (chaque règle : claim sourcé
   + décision clinique D-xxx — `R2-ALI-01` est le seul précédent publié).
2. Objet « proposition de parcours » persisté — **migration en PR séparée du
   code** (règle du dépôt), code derrière drapeau éteint.
3. Bloc de synthèse dédié (bump `VERSION_PROMPT_SYNTHESE` v19 → v20, garde de
   prompt comme `promptAlimentaire.guard.test.ts`).
4. Surface praticien : la proposition se lit, se valide ou s'amende — jamais
   d'auto-assignation (doctrine du panneau Orientation).

## Questions à trancher à l'ouverture

- Liste des règles candidates et leurs claims (arbitrage praticien).
- Dégel de JA5-05 pour l'aval adhésion (arbitrage utilisateur, hors lot).
