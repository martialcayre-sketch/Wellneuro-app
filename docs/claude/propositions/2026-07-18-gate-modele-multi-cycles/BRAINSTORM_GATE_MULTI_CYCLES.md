# Brainstorming — Gate « modèle multi-cycles » (report assumé de LOT-09)

> **Résolue par G2 le 2026-07-19** (SP-CONV LOT-00, constat du 2026-07-22) :
> la migration `20260719120000_c2b_cycle_identity_v1` a persisté `cycleId`
> et `versionScore` sur `AssessmentEpisode` (backfill en 3 règles), et
> `toEpisodeCreateInput` les pose à l'écriture — soit les options (a) + (d)
> de la note technique. Ce dossier est conservé comme trace du
> raisonnement ; ne plus le citer comme différé.

> Ouvre le cadrage du gate identifié en clôture de C2B (registre **A8-5-ii**,
> handoff **LOT-06**). **Périmètre : documentaire — aucun code, aucune migration,
> `schema.prisma` et `web/prisma/migrations/` intacts.** Ce document **pose** le
> problème et les pistes ; **il ne tranche rien** — les décisions sont renvoyées
> à une revue future, sur données réelles ≥ 2 cycles (voir
> `ARBITRAGES_GATE_MULTI_CYCLES.md`).

## Audit express : ce qui est livré vs ce qui reste théorique

- **Livré (LOT-09, migration-free, PR #114).** La Fiche-trajectoire *read-only* :
  un **index** de repères datés (la Spirale), le momentum T0→dernier jalon mesuré,
  « jalon non mesuré » (A8-2) et la garde `versionScore` (A8-3). La Spirale
  s'« allume » quand les données existent, empty-state sinon.
- **Théorique.** La **vraie comparaison côte à côte de ≥ 2 cycles** d'un même
  patient. Elle n'a jamais pu être exercée : le modèle actuel n'autorise pas deux
  cycles réels distincts et attribuables. LOT-09 a donc été borné à une réalisation
  honnête *read-only*, avec ce report explicitement assumé.

## Le vrai point dur : le modèle est mono-protocole, sans clé de cycle

Constats de lecture (code, pas d'interprétation) :

- **Aucune clé de regroupement de cycle** sur l'épisode.
  `AssessmentEpisode` (`web/prisma/schema.prisma:657-677`) porte : PK `id`,
  `idPatient`, `milestone` (String `T0|J21|J42|J90`), `targetAt`, `confirmedAt`,
  `payload`, `payloadHash`, `contractVersion`. Deux index seulement
  (`idPatient+milestone`, `idPatient+confirmedAt`). **Pas d'index cycle, pas de
  colonne cycle. `versionScore` n'est pas stocké sur l'épisode.**
- **Un « cycle » est déduit en mémoire, pas persisté.**
  `construireTrajectoire` définit un cycle comme un épisode dont
  `milestone === 'T0'` (`web/src/lib/protocol/trajectoire.ts:69-71`,
  `cycleId: t0.id` ligne 97). Le `cycleId` n'existe qu'à l'exécution.
- **Les jalons J21/J42/J90 ne sont reliés à aucun T0.** Ils sont **re-dérivés par
  décalage de jours** depuis les réponses questionnaires
  (`construireHistoriqueEquilibre`, `web/src/lib/equilibre/depuisPrisma.ts:88-107`,
  décalages `JOURS_JALON`). Aucune arête stockée n'attache une ligne J21 à son T0
  parent.
- **Nulle part ailleurs de clé de cycle.** Pas de `cycleId`, `protocolRunId`,
  `protocolActifId` dans le schéma ni dans `web/src/`.
  `ProtocolDraft.assessmentEpisodeId` (`schema.prisma:685`) regroupe des *drafts
  sous un épisode*, jamais des *épisodes en cycle*.

**Conséquence.** Tant qu'un seul T0 existe par patient, la re-dérivation par
décalage suffit. Dès un **2ᵉ T0 réel**, elle devient ambiguë : à quel cycle
appartient telle réponse J21 ? La comparaison côte à côte suppose une **clé de
cycle persistée** — donc une **migration Prisma**, donc un **gate à confirmation
explicite** (même régime que le gate C2A).

## Concepts à explorer

### 1. Qu'est-ce qu'un cycle, cliniquement ?

- **Objet** : un cycle = **un parcours de protocole 21 jours** ancré sur un T0,
  jalonné T0→J21→J42→J90. Deux cycles = deux protocoles successifs (ré-évaluation,
  nouveau départ), pas deux mesures du même parcours.
- L'unité clinique existe déjà **implicitement** (le praticien confirme un T0 pour
  ouvrir un parcours) ; ce qui manque, c'est de la **rendre explicite et stockée**.
- **Écarté** : traiter chaque jalon comme un cycle (faux — un jalon est une mesure
  *dans* un cycle) ; regrouper par simple fenêtre de dates (fragile, non déterministe).

### 2. Options de modèle (à comparer, non à choisir ici)

- **(a)** Colonne nullable `cycleId` (ou `protocolRunId`) sur `AssessmentEpisode` :
  chaque épisode pointe son cycle ; le T0 porte l'identité du cycle.
- **(b)** Nouvelle table `ProtocolCycle` (une ligne par parcours) ; les épisodes la
  référencent en FK.
- **(c)** Réutiliser la chaîne `ProtocolDraft.assessmentEpisodeId` /
  `supersedesDraftId` pour dériver un cycle (sans nouvelle table).
- **(d)** Stamper `versionScore` **par épisode** (aujourd'hui constante globale)
  pour fiabiliser la garde A8-3 inter-cycles.
- **Écarté (pour l'instant)** : tout modèle multi-**protocoles** parallèles (un
  patient suivant plusieurs protocoles simultanés) — surdimensionné tant que le
  besoin réel = **cycles successifs**.

### 3. Rétro-remplissage (backfill) des données existantes

- **Objet** : les épisodes déjà confirmés n'ont pas de cycle. Une migration
  additive doit prévoir comment (et si) on les rattache — probablement : chaque T0
  historique = un cycle, ses jalons re-dérivés par la logique actuelle deviennent
  ce cycle.
- **Écarté** : backfill destructif ou ré-écriture de `payload` ; toute inférence
  qui « inventerait » un rattachement non déterministe.

### 4. Frontières à ne pas franchir

- Ne **pas** absorber **SP-TT** (time-travel / snapshots historiques) ni **SP-CAB**
  (médiane cohorte, seuil `n ≥ 5`) : ce gate ne concerne que la comparaison
  intra-patient ≥ 2 cycles (A8-5-ii), distincte du seuil cohorte.
- **Écarté** : profiter de la migration pour introduire un score de risque, un
  pronostic, une dataviz continue (courbe interdite, A6).

## Questions ouvertes à arbitrer (→ `ARBITRAGES_GATE_MULTI_CYCLES.md`)

1. **Modèle** : colonne `cycleId` sur l'épisode (a) vs table `ProtocolCycle` (b)
   vs dérivation via `ProtocolDraft` (c) ?
2. **`versionScore` par épisode** (d) : le stocke-t-on à la migration, ou reste-t-il
   une constante globale ?
3. **Backfill** : comment rattacher les épisodes historiques à un cycle, de façon
   déterministe et non destructive ?
4. **Frontière** : quoi exactement hors de ce gate (SP-TT, SP-CAB) et pourquoi ?
5. **Activation** : à quelle condition de données réelles (≥ 2 T0 confirmés
   comparables) ouvre-t-on effectivement le gate migration ?

## Garde-fous — ce que ce gate refuse

- **Aucune migration sans confirmation humaine explicite et distincte** (ni la
  rédaction de ce cadrage, ni un « ok » général ne valent confirmation).
- Aucune dataviz continue / courbe (A6) ; la Spirale reste un index.
- Aucun score de risque, pronostic nominatif, ou % d'observance patient.
- Aucune réimplémentation du score ou des jalons (propriété `lib/equilibre`).

## Raccordement

- **Suite** : `NOTE_TECHNIQUE_MODELE.md` (mécanique code + migration) puis
  `ARBITRAGES_GATE_MULTI_CYCLES.md` (questions + checklist de gate).
- **Consomme** : arbitrage **A8** (C2B) — en particulier A8-1 (T0 par épisode),
  A8-3 (garde `versionScore`), A8-5-ii (activation ≥ 2 épisodes comparables).
- **Dette reprise ici** : le report assumé de **LOT-09** et la discordance
  « futur gate migration » consignée en **LOT-06**.
