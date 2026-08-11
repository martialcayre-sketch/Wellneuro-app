# Brief compilé — Chaîne T0 opérationnelle : de la donnée valide à la révision par biologie

_Compilé le 2026-08-10 à partir des deux sources du dossier `sources/`
(rédaction manuelle : les extraits automatiques contenaient des références au
dossier clinique réel, retirés — aucune donnée patient réelle dans le dépôt)._

## Sources compilées

- `sources/01-conclusions-audit.md` — conclusions d'architecture de l'audit
  golden case de référence (2026-08-10) : constats majeurs ancrés dans le code,
  acquis à préserver, décisions de cadrage, priorisation P0→P3.
- `sources/02-spec-lots-parcours-t0.md` — spécification détaillée des chantiers
  A→J (périmètres, hors-périmètres, critères d'acceptation testables).

## Intention métier

Rendre opérationnelle la chaîne complète issue de T0 : données validées →
T0 conditionné → candidats d'intervention déterministes → protocole structuré
(compléments proposables **sur claims valides avant la biologie**) → arbitrage
biologique au retour du bilan (sans stocker de valeurs) → **révision de
protocole** re-validée → jalons J21/J42/J90 et momentum par domaine. Le système
doit savoir réviser, éteindre et différer — pas seulement recommander.

## Décisions structurantes reprises dans CAMPAGNE.md

1. T0 = point de décision : conditions dures (premier rideau valide + anamnèse +
   synthèse validée), conditions souples contournables avec justification
   tracée ; biologie/agendas/journal non requis (phase 1 post-T0).
2. Le déterministe décide (candidats, interdits, statuts, contradictions,
   stop rules) ; le LLM formule ; le praticien valide — portes existantes
   intouchées.
3. Compléments avant biologie : quatre conditions cumulatives (règle C4 validée
   + sécurité catalogue + déclencheur clinique jamais DNST seul + validation
   praticien) ; statut `conditionnelle_biologie` avec `waitFor`.
4. Arbitrage biologique sans valeurs (verdict + note) — verrou HDS maintenu ;
   la révision résout les intentions et repasse par revue + approbation.
5. T1/T2 = T0 de cycles suivants — hors campagne (backlog nommé) ; J21/J42/J90
   restent les jalons intra-cycle.
6. Patron unique répliqué : table versionnée + claims + signature + SHA
   (orientation) pour contradictions, stop rules, priorités et biologie.

## Correspondance spec → lots

| Spec (source 02) | Lot de campagne |
|---|---|
| A — validité des données | LOT-00 |
| B — garde-fous synthèse + contradictions | LOT-01 |
| C — préconditions T0 | LOT-02 |
| J — stop rules / extinction | LOT-03 |
| D — candidats déterministes | LOT-04 |
| E — protocole structuré + compléments sur claims | LOT-05 |
| F + G — biologie + révision | LOT-06 |
| H — jalons + momentum (périmètre réduit) | LOT-07 |
| I — multi-cycle | backlog ultérieur |

## Risques identifiés

- Deux migrations (LOT-00, LOT-06) : discipline PR séparée / release-db /
  drapeaux — incident du 2026-08-05 (PR #574) à ne pas répéter.
- Contenu clinique (catalogue biologie, claims SCOFF, règles C4) : dépend de
  l'atelier corpus/règles et d'une validation praticien — les lots branchent,
  ils ne créent pas de savoir clinique.
- LOT-04 touche la chaîne C1 (snapshot/review/decisionCard) : revue
  `wn-reviewer` requise (risque clinique).
- Fixture golden case : anonymisation stricte (patients fictifs autorisés
  uniquement), aucune identité ni donnée clinique réelle.
