---
id: "2026-07-11-decision-clinique-21-jours-v1"
titre: "C1 — Décision clinique 21 jours V1"
statut: "en_cours"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-14"
lot_courant: "LOT-01"
branche_campagne: "campaign/decision-clinique-21-jours-v1/integration"
branche_lot_courant: "campaign/decision-clinique-21-jours-v1/lot-01"
cible_pr_lot: "campaign/decision-clinique-21-jours-v1/integration"
cible_pr_campagne: "main"
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
Réponses → épisode proposé/confirmé → ClinicalSnapshot
→ priorité proposée puis sélectionnée → Carte de décision explicable
→ Données manquantes et limites → protocole brouillon, 3 actions maximum
→ Plan idéal / minimal / secours → Prévisualisation patient
→ Validation praticien
```

Règle centrale : le praticien voit d'abord ce qu'il doit décider, puis les
détails (double niveau de lecture, mécanisme HC-F).

## Ce que C1 possède / consomme (registre A2)

**Possède** : contrats TypeScript purs `AssessmentEpisode`,
`ClinicalSnapshot`, `DecisionCard` et `ProtocolDraft` ; cockpit fiche patient ;
carte de décision ; protocole 21 jours brouillon ; file et flux de validation ; instanciations `ModeConsultation` et
`PrévisualisationPatient` ; instanciations des objets E2 (radar, détail 12
besoins, 5 objets cliniques, momentum affiché).

**Consomme** : `web/src/lib/equilibre/` (`score`, `evidence`,
`objetsCliniques`, `momentum` — API publiques uniquement, jamais
réimplémentées) ; primitives et mécanismes HC-F ; synthèse IA existante ;
statuts R8-lite (verrouillage, demandes de modification).

## Décisions actées

- **Provenance de mesure = niveaux de preuve A/B/C/D** (+ badge « non
  mesuré »). L'autorité scientifique/documentaire des claims est un axe
  distinct. Aucun
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
- Le moteur peut remplir `proposedMainPriority` et classer des candidats ;
  seul `selectedMainPriority`, renseigné ou confirmé par le praticien, porte
  la décision. Origine, cycle de vie, révisions et validation sont séparés.
- Un `AssessmentEpisode` est proposé autour de T0/J21/J42/J90 avec la
  tolérance existante de ±8 jours. Dispersion et réponses hors fenêtre sont
  visibles ; la clôture exige confirmation/correction praticien.
- C1 ne persiste ni épisode ni protocole actif. Cette responsabilité appartient
  à C2 après gate migration.
- Pour les compléments, C1 exprime uniquement une intention d'exploration :
  aucun produit, forme ou dose avant les contrats validés de C4.

## Contraintes non négociables

Invariants du registre §1, plus : thème praticien **clair** (spec 06 amendée) ;
vocabulaire « recommandation » exclusivement ; toute nouvelle formule
(charge thérapeutique, priorité composite) documentée, versionnée
(`versionScore`) et tracée dans `CHANGELOG.md` ; les poids exacts du score de
priorité composite et le seuil de sobriété (nombre d'actions max par phase,
défaut candidat 3) sont des décisions cliniques à valider explicitement avant
la sortie de LOT-02.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Audit des données réelles disponibles (assignations, réponses, synthèses, statuts R8-lite) ; vérification du registre contre l'état du dépôt ; arbitrage radar (défaut : option A) ; cartographie de ce que la fiche patient actuelle affiche déjà | terminé | HC-F LOT-02 |
| LOT-01 | Contrats purs : AssessmentEpisode proposé/confirmé, adaptateurs Mon équilibre/questionnaires, ClinicalSnapshot minimal typé, versions, unités et hash canonique ; aucune persistance | à_faire | LOT-00 |
| LOT-02 | Signaux, données manquantes, discordances, sécurité et abstention ; validation praticien obligatoire des règles/seuils avant activation | à_faire | LOT-01 |
| LOT-03 | DecisionCard : priorité proposée, candidats classés, priorité sélectionnée, provenance, contre-factuels et cockpit de décision | à_faire | LOT-02 |
| LOT-04 | ProtocolDraft : 3 actions max après validation du barème, plans idéal/minimal/secours, charge, intention d'exploration complément, jamais de statut actif | à_faire | LOT-03 |
| LOT-05 | Instanciations `ModeConsultation` et `PrévisualisationPatient`, validation praticien et synthèse ; rien d'interne dans le rendu patient | à_faire | LOT-04 |
| LOT-06 | Tests, documentation et go/no-go sur les 3 patients fictifs ; handoff C3/C2 | à_faire | LOT-05 |

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
