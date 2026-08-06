### Modifié — orientation : les six suggestions de pack deviennent des ensembles de questionnaires (⚠ logique clinique)

**Changement de logique clinique**, arbitré et approuvé en session le 2026-08-06
(LOT-02, campagne `2026-08-06-packs-personnalises`, décision D-030). Les six
suggestions de `ORIENTATION_RULES_V1` qui ciblaient un `packId` ciblent
désormais des questionnaires, deux à trois par règle, pris au cœur de la
composition réelle du pack qu'elles remplaçaient (compositions relues en base le
2026-08-06).

**Ce qui n'a PAS changé** : aucun déclencheur, aucun seuil, aucune zone, aucune
condition, aucun `justificationClaims`, aucun `niveau`. La table compte toujours
vingt règles.

**Ce qui a changé, règle par règle :**

| Règle | Cible retirée | Nouvelles cibles |
|---|---|---|
| `R2-SOM-05` | `pack_sommeil_chronobiologie` | `Q_SOM_01` (PSQI), `Q_SOM_05` (chronotype de Horne) |
| `R2-STR-02` | `pack_stress_chronique_burnout` | `Q_STR_02` (PSS-10), `Q_STR_04` (DASS-21), `Q_STR_03` (Cungi) |
| `R2-GAS-02` | `pack_digestif_intestin_cerveau` | `Q_GAS_01` (TFD SIIN), `Q_GAS_03` (Bristol), `Q_INF_01` (hyperexcitabilité SIIN) |
| `R2-ALI-01` | `pack_digestif_intestin_cerveau` | `Q_GAS_01`, `Q_GAS_03` |
| `R-STR-02` | `pack_stress_chronique_burnout` | `Q_STR_04`, `Q_STR_06` (Karasek), `Q_STR_08` (WART) |
| `R-GAS-01` | `pack_digestif_intestin_cerveau` | `Q_GAS_03`, `Q_INF_01` |

`R2-SOM-05` ne retient que les deux instruments que son claim
`WN-CL-0178-017` nomme et que cette table sait proposer. L'échelle d'Epworth et
le questionnaire de Berlin, un temps envisagés, ont été **retirés** à la revue
adversariale : aucun des deux n'est nommé par ce claim, et proposer Berlin ici
**contournait la porte de `R2-SOM-04`**, qui conditionne le dépistage d'apnées à
un antécédent respiratoire déclaré. Les deux restent portés par leurs règles
dédiées (`R2-SOM-06` pour Epworth, `R2-SOM-04` pour Berlin). La troisième pièce
nommée par le claim, l'agenda de sommeil (`Q_SOM_09`), est un recueil
longitudinal de vingt-et-une nuits avec son propre parcours : ce n'est pas une
passation qu'une ligne d'orientation puisse engager.

Les **objectifs** de ces six règles sont réécrits. Les anciens décrivaient
l'ensemble d'un pack (« exploration complète du sommeil », « prise en charge
globale du stress ») et seraient devenus faux appliqués à un instrument : chaque
objectif dit maintenant ce que SON instrument mesure, et aucun ne promet plus la
couverture d'un pack. `R-STR-02` et `R-GAS-01` ne reproposent pas l'instrument
que leur propre déclencheur vient de lire.

### Re-signature de la table (D-018)

La table est **re-signée au 2026-08-06** : `ORIENTATION_METADATA.dateValidation`
passe de `'2026-08-04'` à `'2026-08-06'`, `validationExterne` reste `true`,
`version` et les 23 claims de `claimsSource` sont inchangés.

**Relecture des claims en base, l'acte qui distingue re-signer de « mettre le sha
à jour en silence ».** Les 23 identifiants de `claimsSource` ont été relus en
production le **2026-08-06** via l'outil MCP Supabase `execute_sql` :

```sql
SELECT claim_id, version_claim, prescriptif, active, statut
FROM rag_corpus_claims
WHERE claim_id IN (…les 23 identifiants de claimsSource…);
```

Résultat : **23 lignes sur 23**, toutes en `statut = 'VALIDE'`,
`prescriptif = true`, `active = true`, `version_claim = 'v1.0'`. Aucun claim
ajouté ni retiré par ce lot — seules les cibles et les objectifs ont changé.

**Un claim a changé de règle, sans que le jeu des 23 bouge.**
`WN-CL-0243-005` nomme « le BMS (questionnaire de Maslach-Pine) en 10 items ou
le questionnaire de Karasek ». Il était cité par `R2-STR-02`, qui ne sert aucun
des deux instruments : il y était une justification a posteriori, héritée du
pack dont la composition les embarquait. Il est **déplacé sur `R-STR-02`**, qui
propose Karasek (`Q_STR_06`) pour de bon. L'union des claims de la table est
inchangée — `R2-STR-03` le citait déjà au titre du BMS-10 —, ce que vérifie le
banc d'égalité `claimsSource` ↔ union des `justificationClaims`.

**SHA-256 de la table** (calculé en dernier, par le `sha256` du dépôt sur
`JSON.stringify(ORIENTATION_RULES_V1)`) :

- ancien (2026-08-04) : `528004de579724f17da99d796025cdef430f4dcd498895315740ec93b750c603`
- nouveau (2026-08-06) : `547119c6868eb59ffbb153b395bf424804c81a91b9f8d970765e27474ce7397d`

### Modifié — le geste praticien devient « Ajouter à la file d'envoi »

`OrientationPanel` n'appelle plus `POST /api/praticien/packs/assign` mais
`POST /api/praticien/file-envoi`, un questionnaire par clic. Trois conséquences,
toutes voulues :

- **la confirmation en deux temps est retirée** — elle protégeait d'un e-mail
  sortant qui ne part plus d'ici ; ajouter à la file ne notifie personne, et la
  validation reste un geste séparé depuis la Bibliothèque ;
- **« déjà dans la file » vient d'un `GET`**, filtré sur le patient affiché : la
  réponse du `POST` ne peut pas le dire, la route déduplique en silence et son
  `count` est la taille totale du brouillon — jamais un nombre d'ajouts, et il
  n'est donc jamais affiché ;
- **« déjà assigné » nomme le geste possible** pour une cible questionnaire ; le
  message existait, mais n'était rendu que dans la branche pack.

### Modifié — synthèse IA

`packsTransmis` rend désormais `[]` sur une orientation active et non vide :
plus aucune cible n'est un pack. Le garde de restitution interdit en conséquence
**toute** mention de pack dans la synthèse — comportement recherché. Le prompt
système passe en `synthese-v18` : la phrase « Pour un pack, l'état ne se
déclenche que si l'INTÉGRALITÉ de sa composition est concernée » est retirée,
devenue sans objet. Le reste du prompt est inchangé, « l'absence de segment État
n'atteste rien » compris.

### Corrigé — le banc de résolubilité consultait le mauvais prédicat

Relevé en revue adversariale. Le banc « cible résoluble » utilisait
`estAdministrableParLaRoute` (définition présente et instrument non suspendu),
alors que le geste praticien passe par `POST /api/praticien/file-envoi`, qui
filtre sur `idsAssignablesPour()` — dont la part catalogue est
`IDS_ASSIGNABLES`, laquelle exige **en plus** `actif === true`. Un instrument
dépublié sans être suspendu passait donc le banc et échouait au clic. Les deux
prédicats coïncident sur les données d'aujourd'hui, ce qui rendait l'erreur
invisible : un banc de mutation dépublie désormais un instrument réellement
ciblé et vérifie les deux moitiés de l'énoncé — le prédicat de la route
l'écarte, l'ancien l'accepte encore.

### Corrigé — trois défauts du panneau d'orientation

- **Résolution hors ordre** : `chargerFile` n'annulait rien. La réponse lente du
  patient A pouvait s'appliquer à l'écran du patient B — le filtre était correct
  pour A, il arrivait sur B. Même patron d'annulation que l'effet voisin.
- **Une file illisible se lisait comme une file vide** : sur 401 ou 500 la route
  rend un JSON bien formé `{brouillons: [], unavailable: true}`, ce qui effaçait
  un « déjà dans la file » acquis et invitait à réajouter. L'état connu est
  désormais conservé.
- **Message d'échec agrammatical** : « Ajout impossible pour : Dossier clos. »
  collait une phrase serveur dans une place réservée à un titre. Deux formes
  distinctes — « Ajout impossible : <phrase de la route> » quand elle explique,
  « Ajout impossible pour « <titre> ». » sinon.

### Corrigé — deux objectifs nommaient mal leur instrument

Les objectifs de `Q_INF_01` sur `R2-GAS-02` et `R-GAS-01` annonçaient
d'« explorer le versant hyperexcitabilité de l'axe intestin-cerveau », alors que
`Q_INF_01` est le questionnaire d'hyperexcitabilité SIIN — un instrument
neuro-musculaire (crampes, spasmes, palpitations). Réécrits pour dire ce qu'il
recherche.

### Ajouté — deux bancs qui ferment le no-op silencieux

- **« aucune règle publiée sans cible résoluble »** : une règle dont aucune
  suggestion ne se résout ne recommande rien, en silence.
- **« aucune règle publiée redondante »** : pour chaque règle, un jeu d'entrées
  dérivé de ses propres déclencheurs, puis comparaison de la sortie du moteur
  avec et sans elle. C'est le seul banc qui attrape une règle parfaitement
  résoluble mais définitivement muette parce qu'une règle sœur au déclencheur
  plus large vise déjà toutes ses cibles — le risque exact que les candidats
  mono-questionnaire écartés au cadrage faisaient courir à trois des six règles.

Le garde creux « chaque pack cité par une règle existe réellement en base » est
retiré au profit de ces deux-là, et remplacé par un banc qui épingle
l'arbitrage : **aucune règle publiée ne cible un pack**. Les quatre bancs
d'absorption pack ⊃ membre sont réécrits sur des règles **synthétiques** — la
capacité reste dans le moteur et reste couverte, elle n'est simplement plus
exercée par la table. La fixture `COMPOSITION_PACKS` est complétée aux
compositions réelles (8 / 9 / 8 questionnaires) ; elle en portait une amputée
(`pack_digestif_intestin_cerveau: ['Q_GAS_01']` pour huit membres), ce qui
rendait les bancs d'absorption plus faciles à satisfaire qu'ils ne devaient
l'être.

### Ajouté — le garde de restitution exercé sous allowlist vide

`verifierRestitutionOrientation` tourne désormais **toujours** avec `packs: []`.
Quatre bancs l'exercent directement : deux positifs (un pack cité en clair, un
slug seul) et deux contrôles négatifs — une prose clinique contenant « stress
chronique et burnout » sans le mot « pack » adjacent ne doit produire **aucun**
écart, sans quoi le code d'événement serait noyé avant d'être observable ; et un
questionnaire non transmis reste, lui, un écart, ce qui interdit de « réparer »
le garde en le rendant muet.

### Limitation connue, hors périmètre

Le plafond de 60 questionnaires de la file d'envoi tronque en silence
(`api/praticien/file-envoi/route.ts`). C'est un comportement de la route,
inchangé par ce lot.
