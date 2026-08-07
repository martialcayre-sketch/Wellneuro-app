---
id: "LOT-03"
titre: "Retrait effectif des packs non-base"
statut: "livré (2026-08-07) — code #604, geste production fait le 2026-08-07 05:59, un seul pack actif vérifié en base ; revue wn-reviewer NO-GO sur deux défauts, corrigés"
dépend_de: "LOT-02"
---

# LOT-03 — Retrait effectif des packs non-base

## But

Désactiver tous les packs sauf « Base de consultation », maintenant que plus
aucune règle d'orientation ne les cible (LOT-02). Le retrait est un
**soft-delete de données par l'UI** (route DELETE existante,
`actif: false`) — pas une migration, pas une suppression physique :
l'historique des assignations continue de pointer sur eux.

## Résultat observable

- Lecture SQL : exactement un pack `actif: true` (« Base de consultation »).
- ~~La perte de cible d'une règle d'orientation est **journalisée**~~ —
  **amendé le 2026-08-07, au cadrage** : ce code serait mort-né. Depuis le
  LOT-02 (#599), aucune règle ne porte de `packId` hors de l'union de type
  (`orientationRulesV1.ts:120`, et le fichier l'écrit en `:295-315`) : le log
  serait vert en test et muet à vie en production. Remplacé par un **banc
  d'invariant** — aucune règle ne cible un pack, publiée ou non —, qui *empêche*
  la réintroduction au lieu de la constater. Le banc du LOT-02 (`:437`) ne
  couvrait que les règles publiées ; le delta est prouvé par mutation.
- `pack-reevaluation` : comportement vérifié pour les patients dont le pack de
  la dernière consultation validée est désactivé (repli `parDefaut`), conforme
  à la qualification du LOT-01.
- `portail/valider` (assignation du pack de base à l'onboarding) intact,
  prouvé par E2E.

## Périmètre

- Geste praticien en production : désactivation du **second** pack créé par
  le praticien (« Florence 1 », `PACK_b8sda7asd-h_B8x8061uORhc`) et des 5
  packs de doctrine actifs, via « Questionnaires & packs »
  (`DELETE /api/praticien/packs?idPack=…`) — **« Base de consultation » n'est
  JAMAIS désactivée** (arbitrage du 2026-08-06, [[D-030]]) ; `PACK_HUMEUR_NEURO`
  est déjà inactif. Total : 6 packs désactivés.
- Code : journalisation de la perte de cible d'orientation ; ajustements
  minimaux de `PacksPanel` si l'état « un seul pack actif » dégrade la lisibilité
  (badge inactif existant).
- Garde `IDS_SUSPENDUS` sur `POST`/`PATCH /api/praticien/packs`
  (`packs/route.ts:52-60,86,102,182,191-193`) : ni la création ni l'édition
  d'un pack ne filtrent aujourd'hui les qids suspendus, et `PATCH` accepte
  `parDefaut` sur n'importe quel pack sans garde ([[D-030]] point 4, réserve
  du LOT-01).
- Repli par nom de `resoudrePackBase` (`valider/route.ts:24,28-31`) : mort en
  l'état — `NOM_PACK_BASE` (majuscules) ne correspond jamais au nom réel
  « Base de consultation », l'égalité Prisma/PostgreSQL étant sensible à la
  casse. Recherche insensible à la casse, ou garde interdisant de
  désactiver/démarquer le pack `parDefaut` ([[D-030]], réserve du LOT-01).
- Porte oubliée du bloc « Packs suggérés » (`PatientsPanel.tsx:750,900-928`,
  alimenté par `packsRecommandes` de `questionnaires-functional.ts:78,209-268`
  via `api/praticien/questionnaires/registry/route.ts:8,25`) : sans geste, ses
  boutons continueront de citer des packs désactivés après le retrait
  (LOT-01, matrice section Praticien).
- Vérification production par lecture seule.

## Hors périmètre

- Réactivation de packs depuis l'UI (dette latente notée, hors campagne).
- `questionnaire_packs.actif` jamais relu par `resolvePackQuestionnaireIds`
  (dette latente notée au cadrage, hors campagne tant que la lecture ne bascule
  pas sur le registre).
- Toute migration ; toute suppression physique.

## Fichiers probables

- `web/src/lib/clinical/orientationService.ts` (journalisation)
- `web/src/lib/consultation/packRegistry.ts` ou module d'event codes voisin
- `web/src/components/PacksPanel.tsx` (ajustement minimal éventuel)
- `web/src/app/api/praticien/packs/route.ts` (garde `IDS_SUSPENDUS` sur
  POST/PATCH, garde anti-démarquage `parDefaut`)
- `web/src/app/api/portail/valider/route.ts` (repli par nom insensible à la
  casse, ou remplacement par une garde amont)
- `web/src/components/PatientsPanel.tsx` et
  `web/src/lib/questionnaires-functional.ts` (bloc « Packs suggérés »,
  porte oubliée — ajoutés en revue adversariale du LOT-01)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase — la désactivation passe par l'UI
  praticien, jamais par du SQL.
- Pas de refactor hors lot.

## Étapes

- [ ] Poser la journalisation de perte de cible (avec test).
- [ ] Geste praticien : désactiver les packs non-base dans l'UI.
- [ ] Lecture SQL : un seul pack actif ; état avant/après consigné.
- [ ] Vérifier `pack-reevaluation` sur un patient concerné (fixture fictive en
      local ; lecture seule en production).
- [ ] Documenter les résultats.

## Tests

- T1 après chaque édition ; T2 avant commit (UI/API touchées).
- E2E onboarding : le pack de base s'assigne toujours (`portail/valider`).
- Invariant « exactement un pack actif » ET « `resoudrePackBase` rend
  toujours un pack », y compris par le repli par nom une fois réparé (ajouté
  en revue adversariale du LOT-01).
- `POST`/`PATCH /api/praticien/packs` refuse un qid `IDS_SUSPENDUS` (ajouté
  en revue adversariale du LOT-01).

## Critères de done

- Un seul pack actif, prouvé par lecture.
- Journalisation en place et testée.
- Aucun parcours patient cassé (onboarding, réévaluation).

## Résultats

**Code livré le 2026-08-07** (le geste production reste dû, voir plus bas).

### Ce que le cadrage a changé au lot

La porte classée quatrième était la première. **`DELETE` ne lisait jamais
`existant.parDefaut`** : le geste demandé au praticien — six clics « Désactiver »
dans une liste où le bouton s'affiche à l'identique sur « Base de consultation » —
pouvait casser l'onboarding de **tous** les patients, sans réparation par l'UI.

Cinq chemins menaient à « zéro pack `parDefaut` actif », dont deux qu'aucun
contrôle champ par champ ne voit : `PATCH { parDefaut: true, actif: false }` en un
appel, et `PATCH { parDefaut: true }` sur un pack déjà inactif — qui ne mentionne
même pas `actif`. Le prédicat se lit donc sur l'**état résultant**. Refus 409, avant
le `$transaction` : l'assertion qui le prouve est que `updateMany` n'a pas été
appelé.

### Lectures production du 2026-08-07

| Lecture | Résultat | Effet |
|---|---|---|
| `packs` | 7 actifs ; « Base de consultation » (`PACK_-bG21yeIvVYRhrdlYuWIMnFz`) seul `par_defaut` | 6 cibles confirmées |
| `consultations.id_pack_assigne` | 15 sur le pack de base, 10 à `null` | risque clinique `pack-reevaluation` **nul** |
| `pack_propositions` | 0 ligne | aucune question déclinée rouverte |
| qids du pack de base | contient **`Q_ALI_09`**, qui est dans `IDS_SUSPENDUS` | a révélé un défaut réel, voir ci-dessous |

### Le défaut que la revue a trouvé, et qui mordait aujourd'hui

La première rédaction du garde `IDS_SUSPENDUS` refusait sur **l'ensemble des qids
fournis**. Or l'écran d'édition renvoie toujours l'état stocké : `PacksPanel` charge
`pack.qids` en entier et ne rend de case à cocher que pour les instruments actifs —
un qid suspendu ne peut donc pas être décoché. Le pack de base portant `Q_ALI_09`,
tout renommage aurait rendu 409 en demandant de retirer un questionnaire
qu'aucun geste ne permet d'enlever. **Classe « un geste proposé doit être
possible ».** Corrigé : le refus ne porte que sur les qids **ajoutés**. Le test qui
l'épingle envoie le payload réel de l'écran — sa version initiale, sans `qids`,
passait au vert sur le code fautif.

Second défaut du même ordre : le message R2 conseillait « réactivez ce pack » à qui
désactive un pack **actif** — contresens —, et aucun écran n'offre de réactivation.
Message scindé sur `existant.actif`, avec assertion sur le **texte**, sans laquelle
le défaut restait invisible.

### Gestes livrés

1. Garde du pack de base sur `PATCH` et `DELETE` (409, état résultant) + retrait du
   bouton « Retirer par défaut » et `disabled` sur « Désactiver » pour le porteur.
2. Garde `IDS_SUSPENDUS` sur `POST` et `PATCH` (409, qids ajoutés seuls) — 409 et
   non 400, alignement sur les deux refus voisins du dépôt.
3. Repli par nom de `resoudrePackBase` réparé (insensible à la casse, `orderBy`
   déterministe). Il était **mort** : le pack `parDefaut` actif était en pratique
   l'unique chemin de résolution.
4. Bloc « Packs suggérés » retiré de `PatientsPanel` ; le test qui affirmait sa
   présence est **inversé**, pas supprimé.
5. Banc d'invariant « aucune règle ne cible un pack », publiée ou non.

### Vérifications

T1 et T3 verts (T3 : séquence CI complète, 120 E2E Playwright Chromium + WebKit).
Revue adversariale `wn-reviewer` : NO-GO sur les deux défauts ci-dessus, corrigés.
**Onze mutations exécutées** — repli de casse, `orderBy`, filtre `actif` de
`pack-reevaluation`, `packId` sur règle non publiée, les deux termes du prédicat,
position du garde avant transaction, et le filtre des qids ajoutés. Chacune rougit
le banc attendu ; les fichiers ont été restaurés après chacune.

### Geste production — fait le 2026-08-07, après déploiement du garde

Six désactivations par l'UI praticien, horodatées entre **05:59:10 et 05:59:32** :
`PACK_b8sda7asd-h_B8x8061uORhc` (« Florence 1 »), `PACK_CARDIO_METABO`,
`PACK_DIGESTIF_INTESTIN`, `PACK_SOMMEIL_CHRONO`, `PACK_STRESS_BURNOUT`,
`PACK_SOCLE_INIT`. Aucun SQL, conformément à l'interdit du lot.

**Trois lectures de contrôle après le geste** :

| Vérification | Résultat |
|---|---|
| « exactement un pack actif » | **1 actif** sur 8 — « Base de consultation », `par_defaut`, 6 qids, `updated_at` inchangé au 2026-08-06 18:02 (le pack de base n'a pas été touché) |
| `pack-reevaluation` | **aucun patient concerné** : 15 consultations sur le pack de base (toujours actif), 10 sans pack, **zéro** sur un pack désactivé — le repli `parDefaut` n'a jamais à jouer, et la comparaison inter-passages n'est perdue pour personne |
| registre relationnel | `questionnaire_packs` porte les mêmes 7 lignes à `actif: false`, aux mêmes horodatages : `syncPackToRegistry` a propagé dans la transaction |

Le risque clinique que [[D-030]] laissait ouvert sur `pack-reevaluation` est donc
**nul**, mesuré après le geste et non avant.

### Dettes datées, hors périmètre

- `questionnaire_packs.actif` n'est relu par personne : après le retrait, 7 lignes
  sur 8 porteront `actif: false` sur un champ mort. Le retrait ne crée pas le
  défaut, il **peuple sa condition de déclenchement**.
- Aucune réactivation depuis l'UI : après le geste, une désactivation par erreur
  n'a pas de retour.
- `prisma/seed.ts` ne répare pas un pack de base cassé (`upsert` avec `update: {}`,
  no-op silencieux qui affiche pourtant « Pack par défaut créé »).
- Le commentaire de `schema.prisma:155-156` cite encore le pack en capitales — la
  casse même qui a tué le repli. Non corrigé ici : `schema.prisma` ne se touche pas
  sans demande explicite.
- Suture `suggestedPackSelection` laissée inerte en place.
