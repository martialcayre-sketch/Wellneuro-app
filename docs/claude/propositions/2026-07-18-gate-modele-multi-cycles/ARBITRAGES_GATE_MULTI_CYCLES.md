# Arbitrages — Gate « modèle multi-cycles » (questions ouvertes, non tranchées)

> **Résolue par G2 le 2026-07-19** (SP-CONV LOT-00, constat du 2026-07-22) :
> Q1 tranchée en (a) colonne `cycleId`, Q2 en (d) `versionScore` par
> épisode, Q3 par le backfill en 3 règles de `c2b_cycle_identity_v1` —
> confirmation explicite au dossier `GATE_G2_IDENTITE_CYCLE.md`. La
> checklist ci-dessous est donc historique ; ne plus la citer comme
> bloquante.

> **Ouvre** les questions de `BRAINSTORM_GATE_MULTI_CYCLES.md` (Q1–Q5), à la lumière
> de `NOTE_TECHNIQUE_MODELE.md`. **Ce document ne tranche rien** : les décisions sont
> renvoyées à une **revue future**, sur données réelles ≥ 2 cycles. Aucune n'est
> promue au registre pour l'instant. **Périmètre : documentaire — aucun code, aucune
> migration ; `schema.prisma` et `web/prisma/migrations/` intacts.**

## Statut

Cadrage **ouvert**, décisions **différées**. Prérequis d'arbitrage : disposer (ou
anticiper précisément) de **≥ 2 cycles réels** comparables pour un même patient
(A8-5-ii), condition distincte du seuil cohorte `n ≥ 5` (SP-CAB, hors périmètre).

## Questions à trancher

### Q1 (modèle) — colonne `cycleId` vs table `ProtocolCycle` vs dérivation — **à trancher**
- Options : (a) colonne nullable `cycleId` sur `AssessmentEpisode` ; (b) table
  `ProtocolCycle` + FK ; (c) dérivation via `ProtocolDraft`.
- Éléments : (c) écarté techniquement (détournement, cf. note §3) ; (a) = plus petit
  incrément ; (b) = entité la plus propre. **Aucun verdict.**

### Q2 (`versionScore` par épisode) — **à trancher**
- Option (d) : stocker `versionScore` sur l'épisode (aujourd'hui constante globale
  `'v1'`) pour fiabiliser la garde A8-3 entre cycles.
- Décision **séparable** de Q1. **Aucun verdict.**

### Q3 (backfill) — **à trancher**
- Comment rattacher les épisodes historiques à un cycle : règle déterministe
  (chaque T0 historique = un cycle, jalons rattachés par la logique de décalage
  actuelle) et **non destructive** (pas de ré-écriture de `payload`). **Aucun verdict.**

### Q4 (frontière) — **à trancher**
- Confirmer que ce gate **n'absorbe pas** SP-TT (snapshots) ni SP-CAB (cohorte
  `n ≥ 5`), ni SP-MET, ni SP-SPI. **À acter au moment de l'arbitrage.**

### Q5 (condition d'activation) — **à trancher**
- À quelle condition de données réelles ouvre-t-on effectivement le gate migration
  (≥ 2 T0 confirmés comparables : même instrument, même `versionScore`). **Aucun verdict.**

## Checklist de confirmation du gate (avant toute migration)

> Miroir du régime C2A (`campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/
> SPEC_LOT-01_MODELE_PERSISTANCE.md` §6/§8.11). Le gate n'est levé que si
> **l'utilisateur** coche explicitement ces points **par un message distinct** :
> ni la rédaction de ce cadrage, ni un futur arbitrage documentaire, ni l'activation
> d'une campagne, ni un « ok » général ne valent confirmation.

- [ ] Q1–Q5 ci-dessus sont tranchées et le modèle retenu est figé (spec compilée).
- [ ] La migration est confirmée : **additive-only, une seule migration**, nommée
      (ex. `c2b_multi_cycles_v1`) ; colonnes/tables ajoutées **nullable** pour que les
      lignes existantes restent valides.
- [ ] La stratégie de **backfill** (Q3) est déterministe, non destructive, documentée.
- [ ] L'environnement est confirmé : base éphémère d'abord, **production uniquement
      via le pipeline Vercel `migrate deploy` au merge** — jamais à la main.
- [ ] Le **rollback** (`DROP` des seuls nouveaux objets) est lu et accepté.

> Tant que cette checklist n'est pas cochée : le lot migration reste
> `bloqué_confirmation` ; `schema.prisma` et `web/prisma/migrations/` restent
> intouchés ; aucun `prisma migrate`/`db push`.

## Frontières réaffirmées

- **Ne possède pas** : le score et les jalons (`lib/equilibre`), jamais réimplémentés.
- **N'absorbe pas** : SP-TT (time-travel/snapshots), SP-CAB (cohorte `n ≥ 5`),
  SP-MET (agrégat 3 états), SP-SPI (accueil patient).
- **Refuse** : dataviz continue/courbe (A6), score de risque, pronostic nominatif,
  % d'observance patient, migration sans confirmation distincte.

## Raccordement

- **Source normative** : arbitrage **A8** (C2B). Ce cadrage prolonge **A8-5-ii** et la
  discordance « futur gate migration » consignée en **LOT-06**.
- **Promotion registre différée** : une entrée **A8-6** (« gate modèle multi-cycles »)
  ne sera créée dans `REGISTRE_FRONTIERES.md` **qu'après** l'arbitrage effectif de
  Q1–Q5 — conformément à la règle « le registre acte une décision, il n'ouvre pas une
  question ». Ce dossier reste, d'ici là, la source du cadrage.
