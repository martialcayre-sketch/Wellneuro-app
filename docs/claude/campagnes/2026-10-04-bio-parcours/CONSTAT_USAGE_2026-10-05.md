# BP-02 — Constat d'usage et ligne de base (2026-10-05)

Lecture de production du 2026-10-05 vers 18 h (heure de Paris), depuis un
conteneur `scalingo run -d`. La transaction était en lecture seule, close par
`ROLLBACK`. Le script ne contient que des `COUNT` et des `GROUP BY` : aucun
identifiant, aucun nom, aucun e-mail n'en sort. Cette note est la ligne de
base du verrou d'ouverture (`D-266` §12). Elle ne conclut rien sur un
parcours de patient (`D-125`).

## Biologie

| Mesure | Valeur |
|---|---|
| `resultats_biologiques` | 39, tous `source = saisie_praticien`, aucune correction (`supersedes_resultat_id` nul) |
| Dossiers avec au moins un résultat | 1 |
| Comptes rendus déposés | 1 (PDF). 0 purgé, contenu présent : purge attendue à la décision de toutes ses lignes, ou à 30 jours (`D-258`) |
| Imports | 1, statut `extrait` ; 0 en échec |
| Lignes candidates | 58 : 39 `validee`, 19 `proposee`, 0 `ecartee` |
| Statut de mapping | validées : 39 `resolu` ; proposées : 16 `resolu`, 3 `inconnu` |
| Procédé | toutes `claude-sonnet-5-5` / `bio-extraction-v1` |
| Imports non décidés | 1 (19 lignes proposées, import vieux d'un jour au plus) |
| Refus d'unité persistés (`motif_ecart = 'unite_divergente'`) | 0 |
| Lignes dont l'unité lue diffère textuellement de l'unité du catalogue | 14 validées, 12 proposées |

**Lecture.** Le seul import réel est à moitié décidé. Aucune ligne n'a été
écartée. Pour la dernière mesure, la comparaison est **textuelle** : `µmol/L`
et `umol/l` y diffèrent. Elle ne dit donc pas qu'une valeur a été validée
dans une unité incompatible. Elle signale un écart de graphie, ou un vrai
écart d'unité, qu'une lecture ligne par ligne départagerait. Cette lecture
n'a pas été faite : elle sortirait des agrégats.

Le refus d'unité de la validation (`unite_divergente`, `decisions.ts`) n'est
pas persisté s'il ne finit pas en écart. Un refus suivi d'une correction ne
laisse aucune trace : il ne se compte pas en base.

## Attentes `conditionnelle_biologie`

| Véhicule | Valeur |
|---|---|
| Actions `interventionStatus = conditionnelle_biologie` dans `protocol_drafts.payload` (toutes versions) | 0 |
| Même mesure sur la version active de chaque dossier | 0 |
| `arbitrages_biologiques` | 0 |
| `clinical_rules` portant une `condition_biologie` | 0 (la table est vide) |

Les deux véhicules retenus sont le payload des versions de protocole et
`clinical_rules.condition_biologie`. Aucun texte du dépôt ne nomme les « deux
véhicules » : c'est la lecture de cette note, et la fiche ne la contredit pas.
Le statut calculé par `decisionAvantBiologie.ts` n'est pas stocké, il ne se
compte donc pas.

## Protocole 21 jours, diffusions, comptes

| Mesure | Valeur |
|---|---|
| `protocol_drafts` | 3 : 2 `c1-protocol-draft-v4` en `practitioner_reviewed`, 1 `ja-food-observation-v1` en `draft` |
| Statut d'intervention des actions | 2 `active` |
| Diffusions (`protocol_diffusion_approvals`) | 2, sur 2 dossiers distincts, toutes deux en V4 |
| Check-ins (`protocol_checkins`) | 0 |
| Dossiers patients | 31, dont 28 actifs |
| Praticiens distincts | 1 |
| Dossiers actifs avec résultat / compte rendu / protocole | 1 / 1 / 3 |

**Le constat du 2026-09-26 est périmé.** « Aucun protocole 21 jours servi
en production » ne tient plus : deux protocoles V4 ont été diffusés, chacun
dans un dossier différent. Aucun check-in n'a encore été reçu.

## Référentiels

| Table | Lignes |
|---|---|
| `clinical_rules` | 0 |
| `biology_analyte_links` | 0 |

## Sécurité : SAF-EI-01

| Mesure | Valeur |
|---|---|
| `trust_adverse_effect_reports` | 0 |
| `WN_EI_INTERRUPTION` | `1` : actif |
| `WN_C4_ENABLED` | `true` : actif |
| Signature `SAFETY_EI_METADATA` (code) | non posée (`validationExterne: false`), inchangé |

## Ce que cette ligne de base permet

C'est la mesure « avant surface » de BIO-PARCOURS : un praticien, un dossier
avec biologie, un import réel, aucun arbitrage biologique, aucune attente
conditionnelle, deux protocoles diffusés sans retour. Elle se rejoue avec le
même script, `CONSTAT_USAGE_BP02.sql` (lecture seule, `ROLLBACK` final),
encodé en base64 dans la commande du conteneur puis passé à `psql -f`.
