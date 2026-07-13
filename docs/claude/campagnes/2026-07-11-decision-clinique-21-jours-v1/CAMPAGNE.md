---
id: "2026-07-11-decision-clinique-21-jours-v1"
titre: "C1 — Décision clinique 21 jours V1"
statut: "à_faire"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-12"
lot_courant: "LOT-00"
---

# C1 — Décision clinique 21 jours V1

> Compilation réelle du 2026-07-12 (remplace le squelette auto-généré).
> Sources : `sources/sources/05_VERTICAL_SLICE_1…`, `06_SPEC_UX_COCKPIT…`
> (**amendée** : thème praticien clair, cf. registre A5), `07_SPEC_PROTOCOLE_21J…`,
> `10_SPEC_DONNEES_MANQUANTES…`, `12_GARDE_FOUS…`, plus les intrants transférés
> de HC : carte de décision, mode consultation, double lecture, comparateur
> (spec seulement), prévisualisation (`…hybrid-clinical…/sources/05_INNOVATIONS_UX_VAGUE_2.md`).

## Objectif

Le vertical slice produit central : une fiche patient cockpit qui transforme
les données en décision de 21 jours.

```text
PatientHeader → Signal clinique principal → Carte de décision explicable
→ Données manquantes et limites → 3 actions maximum
→ Plan idéal / minimal / secours → Prévisualisation patient
→ Validation praticien
```

Règle centrale : le praticien voit d'abord ce qu'il doit décider, puis les
détails (double niveau de lecture, mécanisme HC-F).

## Ce que C1 possède / consomme (registre A2)

**Possède** : cockpit fiche patient ; carte de décision ; protocole 21 jours
minimal ; file et flux de validation ; instanciations `ModeConsultation` et
`PrévisualisationPatient` ; instanciations des objets E2 (radar, détail 12
besoins, 5 objets cliniques, momentum affiché).

**Consomme** : `web/src/lib/equilibre/` (`score`, `evidence`,
`objetsCliniques`, `momentum` — API publiques uniquement, jamais
réimplémentées) ; primitives et mécanismes HC-F ; synthèse IA existante ;
statuts R8-lite (verrouillage, demandes de modification).

## Décisions actées

- **Provenance = niveaux de preuve A/B/C/D** (+ badge « non mesuré »). Aucun
  « niveau de confiance » continu — champ écarté le 2026-07-06, la carte de
  décision n'en réintroduit pas.
- **Trois actions maximum** par phase 1, chacune avec plan idéal / minimal /
  secours et budget de charge thérapeutique. Un protocole excessif ne part
  jamais sans justification.
- La classification domino (fondation/intermédiaire/périphérique) reste
  interne au moteur de priorisation ; elle ne s'affiche que via le bloc
  « priorités des 21 prochains jours », sourcé A/B/C/D.
- Arbitrage radar : **débloqué** (méthodologie des 5 objets codée dans
  `objetsCliniques.ts`). Position par défaut : option A — radar 3-strates en
  fiche patient (respect visuel du 60/20/20), 5 objets au dashboard. Tranché
  définitivement en LOT-00, écrans sous les yeux.
- La branche `feat/e2-praticien-neuroscore-view` est retirée ; son périmètre
  vit dans LOT-02/LOT-03.
- Pas de persistance longitudinale ici (C2) ; le comparateur avant/maintenant
  est spécifié (jalons de mesure uniquement, registre A1) mais son
  implémentation appartient à C2B.
- Aucune proposition IA, transmission ou action clinique sans validation
  humaine explicite. Mode brouillon explicite sur le protocole.

## Contraintes non négociables

Invariants du registre §1, plus : thème praticien **clair** (spec 06 amendée) ;
vocabulaire « recommandation » exclusivement ; toute nouvelle formule
(charge thérapeutique, priorité composite) documentée, versionnée
(`versionScore`) et tracée dans `CHANGELOG.md` ; les poids exacts du score de
priorité composite et le seuil de sobriété (nombre d'actions max par phase,
défaut 3) sont des décisions cliniques à valider explicitement en LOT-01.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Audit des données réelles disponibles (assignations, réponses, synthèses, statuts R8-lite) ; vérification du registre contre l'état du dépôt ; arbitrage radar (défaut : option A) ; cartographie de ce que la fiche patient actuelle affiche déjà | à_faire | HC-F LOT-02 |
| LOT-01 | Contrats : carte de décision (justification, provenance A/B/C/D, limites, données manquantes) ; protocole 21 jours (3 actions, plans, charge) ; signaux convergents/discordants ; validation des poids/seuils cliniques par le praticien | à_faire | LOT-00 |
| LOT-02 | Cockpit — lecture : PatientHeader, radar de synthèse, accès liste à plat des 12 besoins (score + badge preuve + tooltip questionnaires sources), 5 objets cliniques, momentum affiché (delta praticien chiffré) | à_faire | LOT-01 |
| LOT-03 | Cockpit — décision : carte de décision, données manquantes/limites en premier niveau, signaux discordants, historique technique repliable (niveau expert) | à_faire | LOT-02 |
| LOT-04 | Protocole 21 jours minimal : composition 3 actions max, plans idéal/minimal/secours, budget de charge, mode brouillon, file de validation | à_faire | LOT-03 |
| LOT-05 | Instanciations : `ModeConsultation` (contenu = résumé décisionnel + 3 actions, jamais l'historique technique) ; `PrévisualisationPatient` côte à côte (frontière de données : rien d'interne praticien) ; résumé de clôture de consultation | à_faire | LOT-04 |
| LOT-06 | Tests, documentation, go/no-go : parcours complet sur les 3 patients fictifs, critère « comprendre en 2 min / préparer en 10 min », `CHANGELOG.md`, handoff vers C3 (blocs documentaires) et C2 (protocole actif) | à_faire | LOT-05 |

## Hors périmètre

Routes globales et navigation générale (HC-F) ; persistance longitudinale,
check-ins, résumé J21 (C2) ; moteur documentaire (C3) ; catalogue de
compléments (C4) ; contenu alimentaire (C5) ; toute migration Prisma sans
confirmation distincte (si le protocole exige un modèle, lot dédié
`bloqué_confirmation`).

## Definition of Done

- [ ] Flux complet comprendre → décider → 3 actions → prévisualiser → valider
      démontré sur Sophie Nicola, Jennifer Martin et Michel Dogné.
- [ ] Chaque élément de décision porte sa provenance A/B/C/D ou « non mesuré ».
- [ ] Données manquantes et discordances visibles avant la décision, jamais
      après.
- [ ] Aucun envoi sans validation praticien ; brouillon explicite.
- [ ] Arbitrage radar documenté ; aucune occurrence de terme banni.
- [ ] Formules nouvelles versionnées et tracées dans `CHANGELOG.md`.
