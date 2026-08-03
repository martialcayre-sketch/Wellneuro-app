# Handoff — 2026-08-03 — Agenda alimentaire `Q_ALI_09` assignable (L1-bis)

## Git

- `main` à `df195963` — PR #554 mergée en squash, `verify` réellement passé
  (9 min 41 s), worktree et branche distante supprimés. Arbre propre.
- Hors campagne, sans entrée `.wn/state.json` : premier lot d'une série. Aucune
  migration, auth ni changement du score servi en production.

## Objectif de la série, et l'ordre choisi

Rendre l'agenda alimentaire **réellement collectable**. Le domaine pur existait
depuis le 2026-07-30 (`web/src/lib/agenda-alimentaire/`, 1 624 lignes, 72 tests)
et **n'avait aucun appelant hors de ses propres tests**. Un audit externe proposait
de commencer par le scorer, puis douze indices nutritionnels. Écarté sur deux
constats : **aucun barème n'est arbitrable** — les cinq axes, les poids 2/1 et la
borne des 18 h supposent une distribution réelle qui n'existe pas, et un barème
posé avant la première passation est une donnée clinique inventée ; et **le seuil
d'exploitabilité (14 jours, 4 week-ends, 7 paires) n'a jamais été confronté à
l'observance réelle** — si les patients abandonnent à 9 jours, le module ne rendra
jamais rien, et on ne l'apprendrait qu'après avoir tout livré. Une journée
alimentaire, c'est 4 à 6 saisies contre une ligne pour une nuit : l'analogie avec
l'agenda du sommeil est un faux ami sur ce point.

**Inversion décidée avec le praticien : persistance et collecte AVANT scorer.**

## Décisions actées (elles ferment des options)

| # | Décision | Conséquence |
| --- | --- | --- |
| D1 | Abstention « je ne sais pas » **par champ**, contrat **v1**, dès L3 | `boolean \| null` sur les quatre présences — la journée survit sans son contenu, donc ses horaires aussi |
| D2 | Drapeau `WN_AGENDA_ALI` pilotant `actif` | ferme route d'assignation **et** bibliothèque d'un geste |
| D3 | Pas de vue praticien en L4 | collecte seule ; la lecture se conçoit sur données réelles |
| D4 | La discordance déclaré/observé est un **objet clinique séparé** | l'agenda n'est PAS une 2ᵉ source du besoin 3 |
| D5 | Nom « Agenda alimentaire — 21 jours » | « boussole » désigne déjà C5, surface patient visible |

**D4 est la plus structurante.** Le besoin 3 est déjà sourcé par `RYTHME_CHRONO` de
`Q_ALI_01` ; y brancher l'agenda ferait deux mesures d'un même thème — le piège que
`lib/anthropic.ts:209` documente pour `RYTHME_ALIMENTAIRE` /10 contre
`RYTHME_CHRONO` /7, dont l'agenda serait le **troisième** porteur. La valeur est
dans l'**écart** : trois profils, dont « déclare bon / observe mauvais », où
l'action porte sur la perception. **Dépendance** : cet objet suppose la forme
SIIN 57 servie — sous la forme courte `MAX_RYTHME_CHRONO` vaut 0, aucun rythme n'est
déclaré, et l'écart devra rendre `null`, **jamais 0**.

## État réel de `Q_ALI_01` (l'audit externe se trompe)

Scoré (`maxTotal: 90`) **et actif en production** : `WN_ALI_01_SIIN57` est allumé
depuis le 2026-07-28 par variable d'environnement, même si le défaut du **code**
est éteint (`questionnaires/alimentaire.ts:405`) — son P0 « activation maîtrisée du
SIIN 57 » est sans objet. Trois autres erreurs du même audit : le Carnet
`food-observation` est déjà persisté serveur, le découpage est en 5 lots et non 7,
et l'orientation ne peut pas encore cibler `Q_ALI_09`.

## Livré en L1-bis (PR #554)

`Q_ALI_09` au catalogue, `sections: []`, scoring `journal` (`scored: false`),
derrière `WN_AGENDA_ALI` **éteint**. Douze fichiers, dont `featureFlag.ts`, un refus
409 dans `api/patient/submit`, un garde de drapeau neuf et trois gardes ajustés. Pas
de pseudo-items `AGD_*` : le scorer `journal` ne lit rien, et les déclarer figerait
les agrégats d'un scorer non écrit.
**La revue adversariale a rendu NO-GO**, et corrigé trois défauts :

- **Bloquant** — le registre portait `droits.statut: "libre"` avec « construction
  WellNeuro sans source tierce », quatre lignes au-dessus de « aucun rapprochement
  n'a été instruit ». Revendication retirée de `Q_SOM_09` le 2026-07-30, et pas
  inerte : `libre` ∈ `DROITS_DEGAGES` pré-autorisait une montée à `droits_verifies`
  sans pièce → `a_verifier`.
- **Majeur** — le garde de drapeau simulait la variable absente par une chaîne
  vide ; une implémentation « ouvert sauf mention contraire » serait restée
  **verte** en ouvrant l'instrument sur Vercel, où la variable n'existe pas.
- **Majeur** — textes patient promettant une frise et une transmission inexistantes.

## Validations exécutées

`npm run check` vert dans les **deux** positions de `WN_AGENDA_ALI` (3 459 tests),
`scoring-check` vert dans les deux positions du SIIN, anti-secrets vert sur le dépôt
entier, `verify` vert en CI. **Trois mutations vérifiées** — `actif: true`,
fail-open du drapeau, suppression du refus 409 : chacune rougit ; un garde vert qui
n'a pas mordu ne prouve rien. `npm run check` **inclut déjà** `test:siin57`, donc
`WN_AGENDA_ALI=true npm run check` couvre l'état de production.

## Problèmes ouverts

- **`normaliserQids`** (`api/praticien/packs/route.ts`) filtre sur le catalogue de
  scoring et non sur `IDS_SUSPENDUS` : un POST direct fait entrer un instrument
  suspendu dans un pack. Défaut **antérieur** (vaut pour `Q_GEO_04`, `Q_URO_02`…),
  aucune donnée patient exposée. Non corrigé : hors périmètre.
- Le cycle protocole→épisode reste à **zéro ligne en base**. Gate HDS
  `G-TRUST-04`, échéance 2026-10-21 : persister un carnet nominatif sous
  hébergement non-HDS est une décision de conformité, pas de technique (staging
  Scalingo validé de bout en bout depuis le 2026-07-24).
- **Reporté du handoff précédent** — campagne `2026-08-03-packs…` : LOT-07, et
  surtout la **signature clinique des six règles du LOT-05**, sans laquelle le
  LOT-06 livré n'affiche rien (`validationExterne: false` ⟹ production fermée).

## Prochaine action exacte

**L3** — `EnterWorktree`, puis : (1) l'abstention D1 dans le domaine pur
(`types.ts` ; `jour.ts` — variante `ensureBooleenOuNull`, `exigerObligatoires` exige
la **clé présente** ; `agregats.ts` où `contenuConnu` passe de `!== undefined` à
`typeof === 'boolean'` ; ~10 tests sur 72) ; (2) modèle `AgendaAlimentaireJour`
calqué sur `AgendaSommeilNuit` (`schema.prisma:958`) ; (3) migration
`agenda_alimentaire_v1` ; (4) `persistence.ts` ; (5) entrée IDP2. Lot à migration :
hook en « demande », **T3 obligatoire**, revue `wn-reviewer` avant PR, `execute_sql`
après merge. Plan : `~/.claude/plans/inversion-l3-l2-oui-distributed-candle.md`.

## Interdits encore actifs

- **Frontière JA** — aucune quantité, aucun gramme, aucune kcal, aucune projection
  vers `Q_ALI_01`/`Q_ALI_02`. Sur les aliments, la formule exacte du contrat fait
  foi : « aucun aliment identifié **au-delà des présences ci-dessus** ».
- **Ne pas toucher** `BESOIN_SOURCES` ni `VERSION_SCORE_EQUILIBRE` ; **aucun barème,
  aucun indice /100** avant d'avoir vu des données réelles. **Ne pas allumer
  `WN_AGENDA_ALI`** avant L3 et L4 : le patient verrait un écran sans question.
- **IDP2** — toute table fille de `patients` entre dans la transaction
  d'effacement ; le garde de `effacement.test.ts` l'attrape seul. Et **aucune
  contrainte unique** sur `(id_assignation, date_jour)` : c'est elle qui rend
  lisible le taux de correction sans nouvelle migration.
