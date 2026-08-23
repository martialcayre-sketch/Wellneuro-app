---
id: "LOT-05"
statut: "à_faire"
dépend_de: "LOT-02 (releasée ET constatée par conteneur), LOT-04"
---

# LOT-05 — V3b : les gates de population et l'effet indésirable

## But

À la fin de ce lot, **un candidat écarté par une gate de population n'a jamais
été classé** (`DC-43`), et un effet indésirable déclaré **interrompt la
logique automatique** au lieu d'être un signalement de plus (`DC-42`).

C'est le lot dont l'audit disait que le report coûtait « le plus cher de tout
l'audit ». Le report a eu lieu : filtrer après classement est observable et
rattrapable, mais un classement calibré sur une population non filtrée est
faux dans ses poids.

## État de départ, mesuré au 2026-08-23

- `grossesse` / `allaitement` n'apparaissent que dans
  `trust/contenus/registre.ts` — des **contenus d'information**, jamais un
  filtre d'intervention.
- `anamnese.ts:101` porte « Grossesse / post-partum » comme **facteur
  déclenchant** — un antécédent remonté dans
  `DrapeauxAnamnese.facteursDeclenchants`, pas un état courant qualifiant une
  population.
- `priorityRulesV1` est **signée** ([[D-061]]) et [[D-093]] du 2026-08-23 a
  ouvert les recommandations élargies sur trois dossiers en notant que **le
  classement des candidats n'est couvert par aucune ligne signée, alors que
  l'ordre EST la recommandation**. Ce lot couvre précisément ce point ; il ne
  referme ni n'élargit le périmètre de `D-093`.
- Le portail capture un **effet indésirable déclaré**
  (`api/portail/trust/signalement`) : produit, dose, début de prise,
  symptômes, début des symptômes, produits concomitants, action prise,
  sévérité déclarée — orienté par `orienterEffetIndesirable`, règle
  déterministe versionnée (`REGLE_ORIENTATION_EI`, propriétaire : praticien).
  L'audit écrivait « aucune capture d'effet indésirable » : c'est faux depuis.

## Périmètre

1. **L'état de population du patient** — distinct du facteur déclenchant :
   grossesse, allaitement, âge, pathologie rénale ou hépatique,
   polymédication, chirurgie digestive, allergie ou intolérance, végétalisme.
   D'où il se lit, et **ce qui se passe quand il est inconnu** : inconnu ⇒
   restriction, jamais généralité (`DC-14`, `DC-24`).
2. **La gate elle-même**, placée **avant** le classement : un candidat écarté
   n'entre pas dans l'ordre, il ne s'en retire pas.
3. **Le motif de non-proposition** (`DC-35`) : « population non couverte » est
   une explication rendue au praticien, pas un silence. Le silence est le mode
   de défaillance le plus coûteux d'un moteur de sécurité — la règle le dit.
4. **`DC-42`** : un effet indésirable déclaré, temporellement associé à une
   intervention, interdit d'augmenter ou de poursuivre automatiquement. Il
   entre par l'objet de sécurité du LOT-04 comme **second producteur** —
   requalification, puis validation praticien.
5. Gardes structurelles, chacune vue rouge : un candidat gaté n'apparaît dans
   aucun ordre ; une population inconnue restreint ; un signalement d'effet
   indésirable bloque la poursuite automatique.

## Interdits

- **Aucun seuil, aucune borne, aucun âge pivot inventé** : chaque critère de
  population a sa provenance ou n'existe pas (`DC-19`).
- **Ne pas déduire une grossesse, un traitement ou une pathologie** d'un score
  ou d'un texte libre : la population se **déclare**, elle ne s'infère pas.
- Aucun repli fail-open : population illisible ⇒ restriction.
- Ne pas transformer le facteur déclenchant existant en état courant par
  simple réétiquetage — ce sont deux choses, et l'audit le dit nommément.
- Ne pas toucher au périmètre de `D-093` : ni élargir les trois dossiers, ni
  lever la relecture praticien.
- Aucune écriture patient nouvelle depuis un chemin praticien.

## Dépendances

En amont : **LOT-02 releasée et constatée par conteneur** (la gate compare la
population du patient à la population du claim) ; **LOT-04** (l'objet de
sécurité et son pouvoir d'inhibition).
En aval : aucun.

## Étapes

1. Établir d'où se lit l'état de population, et ce qui manque — mesure avant
   code.
2. Proposer les critères et leur provenance — **s'arrêter et faire trancher**
   (décision `D-xxx`).
3. Poser la gate **avant** le classement ; rendre le motif de non-proposition.
4. Brancher le signalement d'effet indésirable sur l'objet de sécurité.
5. Gardes vues rouges par mutation, témoin vert.
6. T3, revue `wn-reviewer`, passe Codex (P0).
7. Décision `D-xxx` + fragment `changelog.d/` ; bascule de `DC-42`, `DC-43`,
   et réexamen de `DC-35` et `DC-55`.

## Tests

- T3 avant la PR.
- Un candidat gaté n'apparaît **dans aucun ordre** — assertion sur l'ordre,
  pas seulement sur la présence.
- Population inconnue : le candidat est écarté, et le motif est rendu.
- Un effet indésirable déclaré bloque la poursuite automatique ; le blocage
  est visible, pas silencieux.

## Critères de done

- [ ] L'état de population est un objet lu, distinct du facteur déclenchant.
- [ ] La gate s'applique **avant** le classement — prouvé sur l'ordre.
- [ ] Population inconnue ⇒ restriction ; aucun repli fail-open.
- [ ] Motif de non-proposition rendu au praticien (`DC-35`).
- [ ] L'effet indésirable déclaré interrompt la logique automatique.
- [ ] Aucun critère inventé ; chaque seuil a sa provenance.
- [ ] T3 vert, revue `wn-reviewer`, passe Codex ; `D-xxx` + `changelog.d/`.
- [ ] `DC-42` et `DC-43` basculés ; `DC-35` et `DC-55` réexaminés.
