---
id: "LOT-05"
statut: "à_faire"
dépend_de: "LOT-04 (l'objet de sécurité) — PLUS le LOT-02 depuis l'arbitrage du 2026-08-23"
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
- **Le champ d'exclusion existe déjà, et il est vide.**
  `docs/claude/corpus/nnpp2_interventions_registry.json` porte `neCouvrePas`
  sur ses **95 interventions** — valeur `null` sur les 95. Le modèle « ouvert
  sauf restriction déclarée » est donc structurellement en place et
  intégralement non curé : appliqué tel quel, il autorise tout pour tout le
  monde. C'est la cible de curation de ce lot.
- Le portail capture un **effet indésirable déclaré**
  (`api/portail/trust/signalement`) : produit, dose, début de prise,
  symptômes, début des symptômes, produits concomitants, action prise,
  sévérité déclarée — orienté par `orienterEffetIndesirable`, règle
  déterministe versionnée (`REGLE_ORIENTATION_EI`, propriétaire : praticien).
  L'audit écrivait « aucune capture d'effet indésirable » : c'est faux depuis.

## Le modèle retenu — arbitrage du 2026-08-23

**Général déclaré, exclusions déclarées** — et non « silence restrictif ». La
gate ne lit **pas** une population sur le claim (elle n'existe pas, voir
LOT-02) : elle croise **les exclusions de l'intervention** avec l'état du
patient. Le précédent est signé et en production —
`BiologyFunctionalRange.population NOT NULL DEFAULT 'adulte_tout_venant'` avec
`CHECK` fermé (`D-068`/`D-069`). Un `'adulte_tout_venant'` **écrit** n'est pas
un silence : `DC-14` interdit de lire une absence comme une généralité, pas de
déclarer qu'un contenu vise la population générale.

Ce modèle n'est tenable qu'à une condition, et elle est le cœur du lot : **le
moteur doit dire ce qu'il ignore**. Une intervention dont les exclusions ne
sont pas curées se propose *en signalant qu'elle n'est pas curée* — jamais en
silence. C'est `DC-35`, et c'est ce qui empêche « ouvert par défaut » de
devenir « aveugle par défaut ».

## Périmètre

1. **L'état de population du patient** — distinct du facteur déclenchant :
   grossesse, allaitement, âge, pathologie rénale ou hépatique,
   polymédication, chirurgie digestive, allergie ou intolérance, végétalisme,
   maladie cœliaque. D'où il se lit, et ce qui se passe quand il est
   **inconnu** — un état patient inconnu n'est pas un état absent (`DC-24`).
2. **Les exclusions de l'intervention** : peupler `neCouvrePas` (95 entrées,
   `null` partout) avec sa provenance, claim par claim, et le défaut
   `adulte_tout_venant` **déclaré** là où il est vrai. Curation signée, jamais
   dérivée ni devinée.
3. **La gate elle-même**, placée **avant** le classement : un candidat écarté
   n'entre pas dans l'ordre, il ne s'en retire pas.
4. **Le motif rendu, dans les deux sens** (`DC-35`) : « écarté — exclusion
   déclarée » quand la gate mord, et « proposé — exclusions non curées » quand
   elle ne sait pas. Le silence est le mode de défaillance le plus coûteux
   d'un moteur de sécurité ; le second message est ce qui l'évite.
5. **`DC-42`** : un effet indésirable déclaré, temporellement associé à une
   intervention, interdit d'augmenter ou de poursuivre automatiquement. Il
   entre par l'objet de sécurité du LOT-04 comme **second producteur** —
   requalification, puis validation praticien.
6. Gardes structurelles, chacune vue rouge : un candidat gaté n'apparaît dans
   aucun ordre ; une exclusion non curée est **dite**, jamais tue ; un
   signalement d'effet indésirable bloque la poursuite automatique.

## Interdits

- **Aucun seuil, aucune borne, aucun âge pivot inventé** : chaque critère de
  population a sa provenance ou n'existe pas (`DC-19`).
- **Ne pas déduire une grossesse, un traitement ou une pathologie** d'un score
  ou d'un texte libre : l'état patient se **déclare**, il ne s'infère pas.
- **Ne pas curer `neCouvrePas` par déduction** : une exclusion s'écrit avec sa
  provenance ou reste vide — et une exclusion vide se **dit** au praticien
  (`DC-35`), elle ne se lit jamais comme « aucune exclusion ».
- Ne pas transformer le facteur déclenchant existant en état courant par
  simple réétiquetage — ce sont deux choses, et l'audit le dit nommément.
- Ne pas toucher au périmètre de `D-093` : ni élargir les trois dossiers, ni
  lever la relecture praticien.
- Aucune écriture patient nouvelle depuis un chemin praticien.

## Dépendances

En amont : **LOT-04** (l'objet de sécurité et son pouvoir d'inhibition).
**Le LOT-02 n'est plus une dépendance** depuis l'arbitrage du 2026-08-23 : la
gate lit les exclusions de l'intervention, pas une population du claim.
En aval : aucun.

## Étapes

1. Établir d'où se lit l'état de population du patient, et ce qui manque —
   mesure avant code.
2. Proposer les critères d'exclusion et leur provenance, intervention par
   intervention — **s'arrêter et faire trancher** (décision `D-xxx`).
3. Poser la gate **avant** le classement ; rendre le motif dans les deux sens.
4. Brancher le signalement d'effet indésirable sur l'objet de sécurité.
5. Gardes vues rouges par mutation, témoin vert.
6. T3, revue `wn-reviewer`, passe Codex (P0).
7. Décision `D-xxx` + fragment `changelog.d/` ; bascule de `DC-42`, `DC-43`,
   et réexamen de `DC-35` et `DC-55`.

## Tests

- T3 avant la PR.
- Un candidat gaté n'apparaît **dans aucun ordre** — assertion sur l'ordre,
  pas seulement sur la présence.
- **Exclusions non curées** : le candidat est proposé **et** le praticien lit
  que ses exclusions ne sont pas curées — la garde vérifie la présence du
  message, pas seulement celle du candidat. C'est le banc qui empêche
  « ouvert par défaut » de devenir « aveugle par défaut ».
- Un effet indésirable déclaré bloque la poursuite automatique ; le blocage
  est visible, pas silencieux.

## Critères de done

- [ ] L'état de population du patient est un objet lu, distinct du facteur
      déclenchant.
- [ ] `neCouvrePas` curé avec provenance sur les interventions traitées ; les
      autres déclarent leur non-curation.
- [ ] La gate s'applique **avant** le classement — prouvé sur l'ordre.
- [ ] Motif rendu **dans les deux sens** : exclusion déclarée, et exclusions
      non curées (`DC-35`).
- [ ] L'effet indésirable déclaré interrompt la logique automatique.
- [ ] Aucun critère inventé ; chaque seuil a sa provenance.
- [ ] T3 vert, revue `wn-reviewer`, passe Codex ; `D-xxx` + `changelog.d/`.
- [ ] `DC-42` et `DC-43` basculés ; `DC-35` et `DC-55` réexaminés.
