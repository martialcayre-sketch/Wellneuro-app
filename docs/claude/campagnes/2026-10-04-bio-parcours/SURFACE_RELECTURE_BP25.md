# BP-25 — Surface de relecture ([[D-195]] §2)

Produite AVANT la demande de déclaration de conformité. Arbitrages du
responsable du 2026-10-08 (échelle B du barème, table du repli à deux lignes,
correctif du comptage pendant la composition), puis table du repli en
proportion (révision du même jour, § 2). Plafond : `MAX_ACTIONS_PROTOCOLE_21J`
porté de 3 à 7.

**Méthode.** Chaque ligne servie ci-dessous a été CALCULÉE, pas recopiée : le
script `surface.mjs` charge les fonctions pures réelles du dépôt
(`mesurerProtocole`, `suggererDepuisLignes`, `lireRepliDepuisLignes`,
`chevauchementsBareme`, via jiti, sans modification) et les applique aux tables
proposées ; le § 2 révisé est calculé de même par `surface-c.ts` (tsx). `chevauchementsBareme` rend `[]` sur les deux tables proposées.
Phrase affichée par l'écran : `Le barème suggère <Niveau> — <motif>`
(`ProtocolMiniBuilder.tsx:809`, libellés `LOAD_LABELS` : Léger, Modéré, Chargé).

Aucune de ces bornes n'a de source clinique : ce sont des conventions
d'organisation, et la ratification du responsable est leur seule provenance
([[D-198]], [[D-223]] §2).

---

## 1. Barème de charge — `nombreActionsFermes` de 0 à 7

`nombreActionsFermes` = actions non suspendues (`interventionStatus` absent ou
`'active'`). L'orientation vers le médecin n'est pas dans le brouillon
éditable : elle n'est jamais comptée à l'écran.

| Engagées | Ligne | Niveau affiché | Motif affiché | Vrai ? |
|---|---|---|---|---|
| 0 | `CHARGE-01` | Léger | Au plus une action engagée : la charge reste minimale. | Oui — « au plus une » couvre zéro (correction de la relecture du 2026-09-15, inchangée). |
| 1 | `CHARGE-01` | Léger | Au plus une action engagée : la charge reste minimale. | Oui. |
| 2 | `CHARGE-02` | Modéré | Deux ou trois actions engagées en parallèle. | Oui. |
| 3 | `CHARGE-02` | Modéré | Deux ou trois actions engagées en parallèle. | Oui. |
| 4 | `CHARGE-03` | Chargé | Au moins quatre actions engagées en parallèle. | Oui. |
| 5 | `CHARGE-03` | Chargé | Au moins quatre actions engagées en parallèle. | Oui. |
| 6 | `CHARGE-03` | Chargé | Au moins quatre actions engagées en parallèle. | Oui. |
| 7 | `CHARGE-03` | Chargé | Au moins quatre actions engagées en parallèle. | Oui — et ne prétend pas que 7 soit un maximum. |

- **8 et au-delà : inatteignable à l'écran** (le constructeur bloque l'ajout à
  `MAX_ACTIONS_PROTOCOLE_21J`). Si une mesure y arrivait, aucune ligne ne
  s'applique et l'écran se tait (fail-closed, vérifié : « (rien) » à 8).
- **`excessive` reste inatteignable** par toute ligne ([[D-198]] §2 maintenu).
- Contiguë de 0 à 7, sans trou ni recouvrement.

### Ancien affichage, mis en regard (0 à 3)

| Engagées | Avant (signé le 2026-09-15) | Après (proposé) | Ce qui change |
|---|---|---|---|
| 0 | Léger — Au plus une action engagée : la charge reste minimale. | identique | rien |
| 1 | Léger — Au plus une action engagée : la charge reste minimale. | identique | rien |
| 2 | Modéré — Deux actions engagées en parallèle. | Modéré — Deux ou trois actions engagées en parallèle. | le motif seul |
| 3 | **Chargé** — Trois actions engagées, le maximum que le protocole permet. | **Modéré** — Deux ou trois actions engagées en parallèle. | **le niveau passe de « Chargé » à « Modéré »**, et le motif change |
| 4–7 | (inatteignable : plafond 3) | Chargé — Au moins quatre actions engagées en parallèle. | nouveau |

**Pourquoi l'ancien `CHARGE-03` ne pouvait pas rester, même à texte constant :**
avec un plafond à 7, « le maximum que le protocole permet » deviendrait FAUX à
3 actions engagées. Le plafond et la table doivent donc partir ensemble.

---

## 2. Table du repli — la part des actions sans repli (`etendueSansRepli`)

**Révisée le 2026-10-08, après une première déclaration.** La version à deux
lignes sur `actionsSansRepli` (`REPLI-01` à 0, `REPLI-02` de 1 à 7) a été
déclarée conforme en séance, puis le responsable, reprenant les questions à
tête reposée, a choisi de **mesurer en proportion** : la table doit pouvoir
dire « chaque action », ce qu'un compte ne dit plus à plafond sept. La version
à deux lignes n'a jamais été mergée ; son périmètre est rangé au § 5.

**Ce qu'on mesure.** `actionsSansRepli` = actions engagées (non suspendues)
dont le plan idéal est NON VIDE et identique, après `trim()`, au plan minimal.
La table lit un terme dérivé de celui-là, `etendueSansRepli` :

- `0` — aucune action engagée ne répète son plan (y compris : aucune action) ;
- `2` — `actionsSansRepli` égale le nombre d'actions engagées, et n'est pas nul ;
- `1` — tous les autres cas.

Constat d'absence d'écart TEXTUEL, jamais d'absence d'allègement réel. Une
action dont le plan idéal est encore vide ne « répète » pas : elle ne peut
donc jamais faire afficher « chaque action ».

**Aucun écran ne lit cette table** ([[D-223]] §5, revérifié : `lignesRepliServables`
n'a aucun appelant hors de son banc). La surface ci-dessous est ce que
`lireRepliDepuisLignes` rendrait ; aucun affichage ne change avec ce lot.

### Les trois lignes

| Part | Ligne | Constat |
|---|---|---|
| 0 | `REPLI-01` | Aucune action engagée ne répète son plan idéal en plan minimal. |
| 1 | `REPLI-04` | Une partie seulement des actions engagées répète son plan idéal en plan minimal. |
| 2 | `REPLI-05` | Chaque action engagée répète son plan idéal en plan minimal. |

Contiguë de 0 à 2, sans trou ni recouvrement (`chevauchementsBareme` rend
`[]`) ; une valeur hors de 0..2 est inatteignable par le type, et à 3 la
lecture se tait (`aucune_ligne_applicable`, vérifié).

### Par situation — calculé par les fonctions réelles

Script `surface-c.ts` : `mesurerProtocole` et `lireRepliDepuisLignes` du dépôt,
appliqués à la table écrite dans `tableRepliV1.ts`. « Répétée » = deux plans au
texte identique ; « distincte » = deux textes différents.

| Situation | Engagées | Sans repli | Part | Constat rendu |
|---|---|---|---|---|
| aucune action | 0 | 0 | 0 | `REPLI-01` — Aucune action engagée ne répète son plan idéal en plan minimal. |
| 1 action, plan idéal encore vide | 1 | 0 | 0 | `REPLI-01` — idem |
| 3 actions distinctes + 1 plan idéal vide | 4 | 0 | 0 | `REPLI-01` — idem |
| 1 action distincte | 1 | 0 | 0 | `REPLI-01` — idem |
| 7 actions distinctes | 7 | 0 | 0 | `REPLI-01` — idem |
| 1 répétée + 2 distinctes | 3 | 1 | 1 | `REPLI-04` — Une partie seulement des actions engagées répète son plan idéal en plan minimal. |
| 6 répétées + 1 distincte | 7 | 6 | 1 | `REPLI-04` — idem |
| 2 répétées + 1 plan idéal vide | 3 | 2 | 1 | `REPLI-04` — idem (l'action vide ne répète rien : « une partie » reste vrai) |
| 1 action répétée, seule | 1 | 1 | 2 | `REPLI-05` — Chaque action engagée répète son plan idéal en plan minimal. |
| 3 répétées (toutes) | 3 | 3 | 2 | `REPLI-05` — idem |
| 7 répétées (toutes) | 7 | 7 | 2 | `REPLI-05` — idem |
| 1 répétée + 1 distincte suspendue | 1 | 1 | 2 | `REPLI-05` — idem (la suspendue n'est pas engagée) |
| 1 répétée suspendue, seule | 0 | 0 | 0 | `REPLI-01` — Aucune action engagée… (aucune n'est engagée) |
| 1 répétée aux espaces près (« ␣␣X » / « X␣␣ ») | 1 | 1 | 2 | `REPLI-05` — idem (`trim()`) |

### Ancien affichage, mis en regard

| Situation | Attesté le 2026-09-17 (plafond 3) | Après |
|---|---|---|
| aucune action ne répète | REPLI-01 — Aucune action engagée ne répète son plan idéal en plan minimal. | identique |
| une partie répète | REPLI-02 — Au moins une action engagée répète le même plan en idéal et en minimal : rien n’y est écrit comme allègement. | REPLI-04 — Une partie seulement des actions engagées répète son plan idéal en plan minimal. |
| toutes répètent | REPLI-02 (1 ou 2 actions) ou REPLI-03 (3 actions) — Aucune des actions engagées ne distingue ses deux plans : le protocole ne propose aucun repli écrit. | REPLI-05 — Chaque action engagée répète son plan idéal en plan minimal. |

Ce que la proportion répare : l'ancienne table disait « toutes » seulement à
trois actions sur trois — à une ou deux actions toutes répétées, elle disait
« au moins une ». La nouvelle le dit à tout effectif. `REPLI-02` et `REPLI-03`
sont retirées ; leurs identifiants ne sont pas réutilisés.

---

## 3. Pendant la composition — APRÈS le correctif

Nouvelle règle du constructeur : la mesure porte sur **toutes les actions du
brouillon** (les suspendues sont exclues par `mesurerProtocole`, comme avant) ;
**l'écran se tait si aucune action n'est typée**. Calculé avec la logique
proposée dans `correctif.md`, sur le barème proposé ; la colonne « avant »
rejoue le code actuel sur le barème signé actuel.

| Brouillon | Avant (code et barème actuels) | Après (correctif, barème proposé) | Engagées comptées | Vrai ? |
|---|---|---|---|---|
| aucune action | (rien) | (rien) | 0 | — |
| 1 action vierge, non typée | (rien) | (rien) — aucune typée | 1 | silence voulu |
| 3 actions vierges, non typées | (rien) | (rien) — aucune typée | 3 | silence voulu |
| 1 typée | Léger — Au plus une… | Léger — Au plus une action engagée : la charge reste minimale. | 1 | oui |
| 1 typée + 1 vierge | Léger — Au plus une… | **Modéré — Deux ou trois actions engagées en parallèle.** | 2 | oui, voir point d'attention |
| 2 typées + 1 vierge | Modéré — Deux actions… (faux : 3 actions au brouillon) | Modéré — Deux ou trois actions engagées en parallèle. | 3 | oui |
| 3 typées + 1 vierge | Chargé — Trois actions… | Chargé — Au moins quatre actions engagées en parallèle. | 4 | oui |
| 1 typée + 6 vierges | Léger — Au plus une… (faux : 7 actions au brouillon) | Chargé — Au moins quatre actions engagées en parallèle. | 7 | oui, voir point d'attention |
| 3 typées dont 1 suspendue | Modéré — Deux actions… | Modéré — Deux ou trois actions engagées en parallèle. | 2 | oui |
| 3 typées, toutes suspendues | Léger — Au plus une… | Léger — Au plus une action engagée : la charge reste minimale. | 0 | oui (cas zéro) |
| 1 vierge suspendue + 1 typée suspendue | Léger — Au plus une… | Léger — Au plus une action engagée : la charge reste minimale. | 0 | oui |
| 1 vierge suspendue, seule | (rien) | (rien) — aucune typée | 0 | silence voulu |
| 2 typées + 2 vierges dont 1 suspendue | Modéré — Deux actions… (faux : 3 non suspendues) | Modéré — Deux ou trois actions engagées en parallèle. | 3 | oui |
| 7 typées | (inatteignable) | Chargé — Au moins quatre actions engagées en parallèle. | 7 | oui |
| 4 typées + 3 suspendues | (inatteignable) | Chargé — Au moins quatre actions engagées en parallèle. | 4 | oui |

**Point d'attention pour la déclaration.** Après le correctif, une action
**vierge** (aucun type, aucun champ saisi) mais non suspendue compte parmi les
« actions engagées ». Le texte est vrai au sens de la mesure — une action non
suspendue du brouillon — et c'est le choix arbitré : compter ce qui partira,
plutôt que sous-compter. `collectSubmission` refuse d'enregistrer une action
non typée, donc la version enregistrée la portera typée ou ne la portera pas ;
dans ce second cas la suggestion redescend dès la suppression. Le défaut
corrigé était l'inverse et plus trompeur : à 3 actions dont une non typée,
l'écran affirmait « Deux actions engagées », et à 7 actions dont une seule
typée il aurait affirmé « Au plus une action engagée ».

**Ce qui ne change pas pendant la composition :** une action suspendue ne
compte jamais ; le barème non servi (`baremeCharge` vide) ne suggère rien ; le
bouton « Reprendre cette charge » recopie, n'enregistre rien ;
`TherapeuticLoad.source` reste `'practitioner'`.

---

## 4. Texte intégral des deux tables, tel qu'il sera écrit en TypeScript

`web/src/lib/clinical/baremeChargeV1.ts` — même forme d'objet, même ordre de
clés (`id, terme, min, max, niveau, motif, statut`) :

```ts
export const BAREME_CHARGE_V1: LigneBaremeCharge[] = [
  {
    id: 'CHARGE-01',
    terme: 'nombreActionsFermes',
    min: null,
    max: 1,
    niveau: 'light',
    motif: 'Au plus une action engagée : la charge reste minimale.',
    statut: 'publiee',
  },
  {
    id: 'CHARGE-02',
    terme: 'nombreActionsFermes',
    min: 2,
    max: 3,
    niveau: 'moderate',
    motif: 'Deux ou trois actions engagées en parallèle.',
    statut: 'publiee',
  },
  {
    id: 'CHARGE-03',
    terme: 'nombreActionsFermes',
    min: 4,
    max: 7,
    niveau: 'loaded',
    motif: 'Au moins quatre actions engagées en parallèle.',
    statut: 'publiee',
  },
];
```

`web/src/lib/clinical/tableRepliV1.ts` — même forme (`id, terme, min, max,
constat, statut`) ; `REPLI-02` et `REPLI-03` retirées :

```ts
export const TABLE_REPLI_V1: LigneRepli[] = [
  {
    id: 'REPLI-01',
    terme: 'etendueSansRepli',
    min: null,
    max: 0,
    constat: 'Aucune action engagée ne répète son plan idéal en plan minimal.',
    statut: 'publiee',
  },
  {
    id: 'REPLI-04',
    terme: 'etendueSansRepli',
    min: 1,
    max: 1,
    constat: 'Une partie seulement des actions engagées répète son plan idéal en plan minimal.',
    statut: 'publiee',
  },
  {
    id: 'REPLI-05',
    terme: 'etendueSansRepli',
    min: 2,
    max: 2,
    constat: 'Chaque action engagée répète son plan idéal en plan minimal.',
    statut: 'publiee',
  },
];
```

Caractères : espaces ASCII avant « : », lettres accentuées précomposées (NFC,
contrôlé par le script). Les nouveaux textes ne portent **aucune apostrophe** ;
l'ancien `REPLI-02` portait une apostrophe typographique U+2019 (« n’y »), qui
part avec lui. Couper une chaîne en `'…' + '…'` dans le
source ne change pas le SHA (c'est la valeur qui est hachée).

## 5. Périmètres

| Table | SHA signé actuel (retrouvé par le script) | SHA du périmètre proposé |
|---|---|---|
| `BAREME_CHARGE_V1` | `40f5057e6f3c17c5c67a6a65025a579790b3e39574a033eac5cd74873dd4757d` | `7848189d86ff32f80ad181026d3fbd955f9625ac106a87716c5dffcdcb83c6a7` |
| `TABLE_REPLI_V1` | `a42fed33d68a9475d72daa5928a1afc0416e11b4413e2d8179cbc25d5b566c3b` | `3d2e5f0d5e5f88734ca43e2d729b419d6312b062770093cbbb063d6989167f20` |

Le périmètre de la version à deux lignes, déclarée conforme puis remplacée le
même jour, est rangé ([[D-195]] §4) :
`f6593020069643cecb86e5147524c4d8ac6a833683efce76b5462b39291c5ece`. Le SHA
proposé du repli est calculé deux fois : par le module, et par un script qui
recopie la table à la main sans l'importer — identiques.

Calcul : `sha256(JSON.stringify(TABLE))`, UTF-8, hex — `corpusSyntheseV1.sha256`.
Les SHA proposés ne se recopient dans `shaPerimetre` qu'APRÈS la déclaration
de conformité du responsable sur cette surface ([[D-195]] §1 et §3).
