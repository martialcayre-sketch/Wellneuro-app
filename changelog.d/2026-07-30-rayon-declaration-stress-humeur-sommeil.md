### Corpus — trois rayons déclarés (Stress, Humeur, Sommeil), inertes tant qu'aucun écran ne les appelle

`RAYON_VERS_NOTEBOOK` mappe désormais `stress → 03 — Stress et burnout`,
`humeur → 04 — Humeur` et `sommeil → 02 — Sommeil et chronobiologie`, à côté de
micronutrition / biologie / nutrition. Les trois notebooks sont ingérés et
100 % validés en production (486 + 621 + 671 claims VALIDE), donc éligibles à la
barrière D-003 (`match_wellneuro_rag_claims`, statut VALIDE seul).

**Ce que ce changement fait, et ne fait pas.** Il DÉCLARE les rayons : l'API
`GET /api/praticien/complements/corpus?rayon=stress` peut désormais servir leurs
claims au lieu de répondre « rayon inconnu ». Il ne les SERT à personne : aucun
écran ne demande ces rayons — le seul consommateur, `FicheComplementPanel`, code
en dur `micronutrition`. Ils restent donc **inertes**, exactement comme biologie
et nutrition, déclarés de longue date sans consommateur. « Validé » n'est pas
« servi » : brancher un écran consommateur est une décision produit distincte,
hors de ce changement.

Le garde anti-typo existant (`rayonCorpus.test.ts` : « chaque rayon déclaré mappe
un notebook du registre POURVU de sources ») couvre automatiquement les trois
nouvelles paires — un libellé de notebook erroné rendrait l'étagère
silencieusement vide et ferait échouer le test.
