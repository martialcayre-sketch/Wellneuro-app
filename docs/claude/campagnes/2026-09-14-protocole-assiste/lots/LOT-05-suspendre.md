---
id: "LOT-05"
titre: "Suspendre — le praticien met une action en attente d'un bilan"
statut: "à faire"
dépend_de: "LOT-02"
---

# LOT-05 — Suspendre (étage 2)

## But

La boucle **arbitrage biologique → révision de protocole** est livrée, testée à trois
étages, et **indéclenchable** : `ArbitrageBiologiquePanel` n'apparaît que si une
version active porte une action `interventionStatus === 'conditionnelle_biologie'`, et
**aucune surface n'en pose**. Le contrat V4, le moteur de validation, la route, la
table `arbitrages_biologiques`, la garde `refusResolutionSansArbitrage` : tout existe.

**Ce qui manque tient dans un écran.**

## La décision à rendre, et pourquoi elle est nécessaire

Le dépôt se contredit. `ProtocolMiniBuilder.tsx:255-260` rend le statut en lecture
seule avec ce commentaire : « il est posé par la règle de décision, jamais saisi à la
main (`D-056`) […] sans quoi une intention pourrait naître “active” sans règle
derrière. » L'en-tête de `biologie-arbitrage-revision.spec.ts:17-24` dit l'inverse :
« c'est le praticien qui la pose en relisant son protocole ». `D-130` dit « le geste
d'écran reste dû » ; `FILE_ATTENTE.md` pose **deux chemins à arbitrer** — brancher
`D-056`, ou offrir le geste au praticien — et ne les départage pas.

**Vérifié au cadrage : aucun arbitrage consigné ne tranche.** Il se rend ici.

**Ce qui est tranché (2026-09-14)** : le praticien pose `conditionnelle_biologie` avec
sa cible d'attente, et **rien d'autre**. Les autres actions restent `active`. La
crainte de `D-056` était qu'une intention naisse *active* sans règle derrière ; ce
geste ne fait que **retenir**, jamais libérer — et l'arbitrage 5 de `D-056` dit déjà
que `conditionnelle_biologie` n'est pas une recommandation. La décision **amende
`D-056`** et réécrit le commentaire du constructeur.

Le chemin « brancher `D-056` » est écarté avec son motif : `deciderIntentionAvantBiologie`
est écrit et testé, mais **refuse tout aujourd'hui** — `clinical_rules` à 0 ligne,
catalogue d'alertes non publié, lien règle↔claim manquant (`D-133`). Il attendra une
curation qui n'a pas commencé.

## Résultat observable

Le praticien marque une action « en attente du bilan biologique », choisit sa cible,
enregistre — et le panneau d'arbitrage apparaît. Au retour du bilan, il confirme ou
infirme, et la révision s'applique.

## Périmètre

- **`ProtocolMiniBuilder.tsx`** — un geste « en attente du bilan » par action + un
  champ de cible. `INTERVENTION_STATUS_LABELS` existe déjà (« En attente du bilan
  biologique »).
- **`RelectureProtocoleSoumission`** gagne `version` et le statut/attente portés par
  l'action ; `saveVersion` poste `version: 'c1-protocol-draft-v4'`.
- **Borner le geste** aux lignes de proposition `recommandé` / `à répéter` /
  `conditionnel` **à déclencheur rempli** — jamais un conditionnel non rempli, jamais
  un optionnel. La condition se porte dans l'intitulé, seul champ lu des deux côtés.
- **Rendre `limitations` visible.** `appliquerArbitrages` y dépose le motif d'un
  arbitrage infirmé (« Non indiquée après bilan biologique (arbitrage praticien du …) »),
  qui entre dans l'empreinte et **n'est lu par aucune surface**, ni praticien ni
  patient. Le rendre avant d'y loger quoi que ce soit de plus.

## Défaut à corriger dans le même lot

`reviserApresArbitrages` appelle `saveVersion` **sans `version`**. Sur une version
active V4, la route répond **409 `version_contrat_incompatible`**. Le geste de sortie
de la boucle est donc aujourd'hui incompatible avec le contrat qu'il révise : la
boucle n'est pas seulement sans amorce, elle est sans issue.

## `BiologyCatalogRef`

Non livré (LOT-04 de la campagne CB), transféré en file d'attente **avec** cette
entrée, à réexaminer « ICI, pas isolément ». Le patron à suivre est celui de
**`assertFoodCompassActionRef`** — re-dérivation intégrale au serveur depuis le
référentiel en base, comparaison d'empreintes, persistance de **l'objet du serveur** —
et non celui de `SupplementCatalogRef`, qui n'est que structurel.

## Hors périmètre

- Brancher `D-056` (écarté ci-dessus, avec son motif).
- Tout statut autre que `conditionnelle_biologie` posé à la main.
- La valeur d'une analyse : la table d'arbitrage **n'a aucune colonne de valeur**, et
  un contrat SQL négatif le garde en CI.

## Interdits

- Pas de secret, pas de donnée patient réelle, **pas de migration** — le contrat V4
  vit dans le `payload` JSON versionné (`D-056` arbitrage 6).
- Aucun seuil inventé.

## Étapes

- [ ] Rendre la décision (amendement `D-056`) + fragment.
- [ ] Geste d'écran + champ de cible, bornés aux lignes admissibles.
- [ ] `version` dans la soumission et dans `saveVersion`.
- [ ] Corriger `reviserApresArbitrages`.
- [ ] Rendre `limitations` lisible.
- [ ] Bancs.

## Tests

T1, T2, T3. **`ArbitrageBiologiquePanel` n'a aucun test de composant** — seul de son
répertoire, qui en compte vingt autres : en écrire un. Le domaine, la route et l'E2E
sont déjà couverts ; l'E2E pose l'intention par l'API et peut le rester.

## Critères de done

Une intention posée à l'écran fait apparaître le panneau d'arbitrage ; la révision
s'enregistre sans 409 ; le commentaire du constructeur dit ce que la décision a tranché.
