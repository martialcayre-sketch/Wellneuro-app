---
id: "LOT-02"
titre: "L'orientation propose des ensembles personnalisés (⚠ clinique)"
statut: "livré (2026-08-06) — re-signature D-018 (sha 547119c6…), revue wn-reviewer NO-GO corrigé puis GO en contre-revue"
dépend_de: "LOT-01"
---

# LOT-02 — L'orientation propose des ensembles personnalisés

## But

Faire de l'orientation un producteur d'**envois personnalisés** : les
suggestions ne ciblent plus de packs mais des questionnaires, et le geste
praticien depuis le panneau devient « Ajouter à la file d'envoi » (arbitrage du
2026-08-06). C'est le lot **clinique** de la campagne : il modifie la table de
règles signée.

## Résultat observable

- Plus aucune suggestion à `packId` dans `orientationRulesV1.ts` ; les 6
  suggestions concernées portent les compositions de questionnaires arrêtées au
  LOT-01.
- `ORIENTATION_RULES_SHA256` re-signée ; le banc de certification des règles
  vert.
- Dans le panneau d'orientation, chaque recommandation (ou la sélection)
  s'ajoute à la file d'envoi du patient ; plus de bouton « Assigner ce pack ».
- Le badge « déjà assigné » (LOT-B #589) et le segment « État » transmis au
  modèle IA restent exacts avec des cibles questionnaires.

## Périmètre

- `web/src/lib/clinical/orientationRulesV1.ts` — re-ciblage des 6 suggestions.
- `web/src/components/patient-cockpit/OrientationPanel.tsx` — geste « Ajouter à
  la file d'envoi » (`POST /api/praticien/file-envoi`, `qids` libres, plafond
  60, dédup existante) ; textes UI en français.
- `web/src/app/api/praticien/synthese/route.ts` — vérifier que le bloc
  d'orientation transmis au modèle reste cohérent sans cibles pack.
- CHANGELOG : fragment `changelog.d/` documentant le changement de logique
  clinique (exigence de `CLAUDE.md`).

## Hors périmètre

- Toute désactivation de pack en base (LOT-03) — les packs restent actifs
  pendant ce lot ; l'ordre garantit qu'aucune règle ne perd sa cible avant
  d'avoir sa composition de remplacement.
- `portail/valider` (pack de base) et `pack-reevaluation`.
- Toute migration.

## Fichiers probables

- `web/src/lib/clinical/orientationRulesV1.ts`
- `web/src/lib/clinical/orientationEngine.ts` (absorption pack→membres, si du
  code mort apparaît — retrait minimal seulement)
- `web/src/components/patient-cockpit/OrientationPanel.tsx`
- `web/src/app/api/praticien/synthese/route.ts`
- `changelog.d/2026-08-JJ-orientation-ensembles-personnalises.md`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase.
- Pas de refactor hors lot ; ne pas toucher aux seuils ni aux conditions de
  déclenchement des règles — seules les **cibles** changent.

## Étapes

- [x] Re-cibler les 6 suggestions selon les compositions du LOT-01.
- [x] Re-signer la table des règles et rejouer son banc.
- [x] Brancher « Ajouter à la file d'envoi » dans le panneau (états : ajouté,
      déjà dans la file, déjà assigné).
- [x] Vérifier le segment « État » côté synthèse IA.
- [x] **Revue adversariale `wn-reviewer` obligatoire**, puis relancer le
      reviewer sur ses propres correctifs.

## Tests

- T1 après chaque édition ; banc des règles d'orientation.
- T2 avant commit (UI touchée).
- Mutation ciblée : une suggestion re-ciblée dont on retire un questionnaire
  doit faire échouer le banc (pas de garde de forme faible).
- `orientationRulesV1.test.ts` gagne un cas « aucune règle publiée sans cible
  résoluble » — banc structurel qui balaie les 20 règles publiées et échoue si
  l'une porte un `packId` sans composition connue ou un tableau `suggestions`
  vide après re-ciblage (ajouté en revue adversariale du LOT-01).
- Mutation-test étendu à la fixture `COMPOSITION_PACKS` complétée (voir
  critère de done ci-dessous) : un qid retiré de la composition doit faire
  échouer un cas d'absorption existant, pas seulement le nouveau banc de
  re-ciblage (ajouté en revue adversariale du LOT-01).

## Critères de done

- Zéro `packId` en cible de suggestion ; banc et signature verts.
- Parcours praticien : recommandation → file d'envoi → envoi groupé fonctionne
  avec la dédup existante.
- CHANGELOG porté, revue adversariale passée (GO explicite).
- La fixture `COMPOSITION_PACKS` d'`orientationRulesV1.test.ts:391-395` est
  mise à jour avec la composition complète des 3 packs, pas seulement un
  sous-ensemble : constatée partielle par le LOT-01 (2026-08-06) —
  `pack_sommeil_chronobiologie` y porte ses 8 qids réels, mais
  `pack_stress_chronique_burnout` n'en porte que 2 sur 9
  (`['Q_STR_02','Q_STR_05']`) et `pack_digestif_intestin_cerveau` que 1 sur 8
  (`['Q_GAS_01']`) — vérifié par lecture SQL de production le 2026-08-06.

## Résultats

### Relecture des claims en base — 2026-08-06 (D-018)

Les 23 identifiants de `ORIENTATION_METADATA.claimsSource` ont été relus en
production le 2026-08-06, via l'outil MCP Supabase `execute_sql` :

```sql
SELECT claim_id, version_claim, prescriptif, active, statut
FROM rag_corpus_claims
WHERE claim_id IN (…les 23 identifiants de claimsSource…);
```

**23 lignes sur 23**, toutes en `statut = 'VALIDE'`, `prescriptif = true`,
`active = true`, `version_claim = 'v1.0'`. Aucun claim ajouté ni retiré par ce
lot : seules les cibles des suggestions et leurs objectifs ont changé,
`claimsSource` et les `justificationClaims` de chaque règle sont identiques à
ceux du 2026-08-04. C'est cette lecture, et non la mise à jour du sha, qui fait
de ce geste une re-signature.

### Re-signature — SHA-256 de la table

Calculé en dernier, après les six re-ciblages, les objectifs réécrits, les bancs
comportementaux et `dateValidation` — par le `sha256` du dépôt
(`corpusSyntheseV1`) appliqué à `JSON.stringify(ORIENTATION_RULES_V1)`, jamais
par un `shasum` de shell.

- **Ancien sha (signature du 2026-08-04)** :
  `528004de579724f17da99d796025cdef430f4dcd498895315740ec93b750c603`
- **Nouveau sha (signature du 2026-08-06)** :
  `547119c6868eb59ffbb153b395bf424804c81a91b9f8d970765e27474ce7397d`

La signature a été **reprise le même jour**, après une revue adversariale rendue
en NO-GO et trois arbitrages cliniques du praticien (A1, A2, A3 ci-dessous). La
table ayant changé, le sha se recalcule : on ne rattrape pas une signature. La
date ne bouge pas — même journée, même relecture de claims, et le jeu des 23
identifiants est resté identique (23 cités = 23 signés, vérifié par le banc
d'égalité `claimsSource` ↔ union des `justificationClaims`). Un sha intermédiaire
a existé en cours de lot (`86788998…`) ; il n'a jamais été signé ni publié.

`ORIENTATION_METADATA.dateValidation` : `'2026-08-04'` → `'2026-08-06'`.
`validationExterne` reste `true`, `version` reste `orientation-nnpp2-v1`, et la
table compte toujours **vingt** règles.

### Les six re-ciblages

| Règle | Cible retirée | Nouvelles cibles |
|---|---|---|
| `R2-SOM-05` | `pack_sommeil_chronobiologie` | `Q_SOM_01`, `Q_SOM_05` |
| `R2-STR-02` | `pack_stress_chronique_burnout` | `Q_STR_02`, `Q_STR_04`, `Q_STR_03` |
| `R2-GAS-02` | `pack_digestif_intestin_cerveau` | `Q_GAS_01`, `Q_GAS_03`, `Q_INF_01` |
| `R2-ALI-01` | `pack_digestif_intestin_cerveau` | `Q_GAS_01`, `Q_GAS_03` |
| `R-STR-02` | `pack_stress_chronique_burnout` | `Q_STR_04`, `Q_STR_06`, `Q_STR_08` |
| `R-GAS-01` | `pack_digestif_intestin_cerveau` | `Q_GAS_03`, `Q_INF_01` |

Déclencheurs, seuils, zones, conditions, `niveau` : **inchangés** — le retrait
de Berlin le renforce plutôt qu'il ne l'entame, aucune porte n'ayant été
déplacée. Les objectifs, eux, sont réécrits : les anciens décrivaient la
couverture d'un pack et seraient devenus faux appliqués à un instrument. Un
seul `justificationClaims` change, et sans toucher à l'union des 23 (A2).

### Les trois arbitrages cliniques du 2026-08-06 (après revue adversariale)

**A1 — `R2-SOM-05` : composition ramenée à `Q_SOM_01` + `Q_SOM_05`.** Epworth
(`Q_SOM_02`) et Berlin (`Q_SOM_03`) sont retirés. Motif : `WN-CL-0178-017`
nomme le PSQI, l'agenda de sommeil et le chronotype de Horne — ni Epworth ni
Berlin. Et surtout, proposer Berlin ici **contournait la porte de `R2-SOM-04`**,
qui conditionne le dépistage d'apnées à un antécédent respiratoire déclaré ; le
proposer sur la seule attente de sommeil l'aurait ouvert à tous, sans que rien
ne le signale. Les deux instruments restent portés par leurs règles dédiées
(`R2-SOM-06`, `R2-SOM-04`), et deux bancs gardent désormais ce retrait — dont un
qui vérifie que la porte de `R2-SOM-04` laisse toujours passer qui de droit.

*Note de rédaction sur l'agenda de sommeil.* `Q_SOM_09`, troisième pièce nommée
par le claim, **est bien au pack de base** (5 qids — `web/prisma/seed.ts:270`,
lecture SQL de production du 2026-08-06, et c'était l'objet même du LOT-00,
PR #596) ; une vérification intermédiaire l'avait contesté à tort en lisant une
autre source que la production. Il n'appartient en revanche pas à la composition
de `pack_sommeil_chronobiologie`. Le commentaire de la règle porte le motif
**structurel**, vrai indépendamment des packs : `Q_SOM_09` est un **recueil
longitudinal de 21 nuits**, avec son propre parcours et sa propre clôture
(`lib/agenda-sommeil/`) — l'engager depuis une ligne d'orientation traiterait un
suivi de trois semaines comme une passation de quinze minutes. La composition
arbitrée est appliquée telle quelle.

**A2 — `WN-CL-0243-005` suit Karasek.** Retiré des `justificationClaims` de
`R2-STR-02`, ajouté à ceux de `R-STR-02`. Le claim nomme « le BMS
(questionnaire de Maslach-Pine) en 10 items ou le questionnaire de Karasek » :
`R2-STR-02` ne sert aucun des deux depuis le re-ciblage, `R-STR-02` propose
Karasek (`Q_STR_06`). Un claim qui ne fonde aucune cible de sa règle est une
justification a posteriori. L'union des 23 est inchangée : `R2-STR-03` le cite
toujours au titre du BMS-10.

**A3 — `R-GAS-01` : comportement assumé tel quel.** Un patient déjà passé par
`R2-GAS-02` ne voit **rien de neuf** au retour d'un TFD élevé : les cibles
`Q_GAS_03` et `Q_INF_01` lui ont déjà été proposées, et le second tour n'ajoute
que des badges (« déjà assigné », « déjà renseigné ») et un motif qui remonte sur
la ligne existante. Un patient arrivé au TFD par une autre voie, lui, voit
Bristol et l'hyperexcitabilité **apparaître**. Les deux comportements sont
voulus — arbitrage du 2026-08-06.

### Correctifs techniques de la revue adversariale

- **Banc (a) « cible résoluble » : prédicat corrigé.** Il consultait
  `estAdministrableParLaRoute` là où la route d'écriture filtre sur
  `IDS_ASSIGNABLES` (qui exige `actif === true`). Un instrument dépublié sans
  être suspendu passait le banc et échouait au clic. Les deux prédicats
  coïncident sur les données d'aujourd'hui — d'où l'invisibilité : un banc de
  mutation dépublie un instrument réellement ciblé et vérifie que le prédicat de
  la route l'écarte **et** que l'ancien l'accepte encore.
- **Panneau : trois défauts.** Résolution hors ordre (`chargerFile` n'annulait
  rien — la réponse lente de A pouvait s'appliquer à l'écran de B) ; file
  illisible lue comme file vide (401/500 rendent `{brouillons: [], unavailable:
  true}`) ; message d'échec agrammatical. Trois tests ajoutés.
- **Deux objectifs de `Q_INF_01`** annonçaient l'« axe intestin-cerveau » pour un
  questionnaire d'hyperexcitabilité neuro-musculaire. Réécrits.
- **Garde de restitution sous allowlist vide** : quatre bancs directs sur
  `verifierRestitutionOrientation`, dont un contrôle négatif sur une prose
  contenant « stress chronique et burnout » sans « pack » adjacent.

### Ce que le lot n'a pas fait

- Le plafond de 60 de la file d'envoi tronque toujours en silence
  (`api/praticien/file-envoi/route.ts`) : comportement de la route, hors
  périmètre.
- L'absorption pack ⊃ membre reste dans le moteur, ainsi que les types
  `CibleExploration` / `idPackBase` : capacité conservée, plus exercée par la
  table. Ses quatre bancs sont réécrits sur des règles synthétiques pour rester
  couverts.
- Aucun pack désactivé (c'est le LOT-03) ; `portail/valider`,
  `pack-reevaluation`, `schema.prisma` et les migrations sont intouchés.

**Réserves de contre-revue (2026-08-06), consignées sans correction dans ce
lot.** (1) La doctrine « un claim qui ne fonde aucune cible de sa règle est une
justification a posteriori » n'est pas appliquée symétriquement : sur
`R-STR-02`, `WN-CL-0105-001` fonde « la prise en charge » et non une cible, et
`Q_STR_08` (WART) n'est nommé par aucun claim de la table — écart hérité,
à réexaminer si la règle est retouchée. (2) Le garde de restitution, qui tourne
désormais toujours avec une allowlist de packs vide, produit un faux positif
assumé quand le mot « pack » apparaît à moins de 40 caractères d'un titre de
pack — y compris pour dire qu'aucun pack n'est retenu. Épinglé tel quel par un
banc dédié (`verifierRestitutionOrientation.test.ts`) : journal seul, aucune
censure ; le bruit reste non mesuré, à observer via
`SYNTHESE_ORIENTATION_RESTITUTION_INFIDELE`.
