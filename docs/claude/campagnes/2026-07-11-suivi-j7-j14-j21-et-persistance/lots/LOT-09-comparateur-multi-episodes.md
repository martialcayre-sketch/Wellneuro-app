---
id: "LOT-09"
titre: "Comparateur multi-épisodes (Spirale-index praticien)"
statut: "livré (réalisation read-only)"
dépend_de: "LOT-08"
volet: "C2B"
---

# LOT-09 — Comparateur multi-épisodes

> Compilé le 2026-07-18 depuis l'arbitrage C2B (registre **A8-2**, **A8-3**,
> **A8-5-ii**). **Migration-free.** Activation quand **≥ 2 épisodes comparables**.

## But

Présenter côte à côte les épisodes d'un patient partageant **même instrument** et
**même `versionScore`**, ancrés chacun sur leur T0 (LOT-08). La **Spirale** est
l'**index** de navigation vers ces lectures — **jamais un graphe, jamais une courbe**
(registre A6).

## Résultat observable

Pour un patient à ≥ 2 épisodes comparables, le praticien voit une lecture côte à côte
(T0 → jalon) par épisode. Deux lectures de `versionScore` différents affichent un
bloc **« non comparable (score recalibré le …) »** au lieu d'un delta. Un jalon sans
couverture affiche **« jalon non mesuré »**.

## Périmètre

- Lister les `assessment_episodes` d'un patient ; par épisode, calculer
  `{ lectureT0, lectureJalon }` via l'ancrage T0 d'épisode (LOT-08).
- Présenter côte à côte **uniquement** les épisodes de même instrument + même
  `versionScore` ; réutiliser le composant *compare* existant (HC-F / 4.0).
- **Garde `versionScore` (A8-3)** : jamais de soustraction inter-version ; bloc
  « non comparable (score recalibré le …) ».
- **Couverture (A8-2)** : jalon sans réponse exploitable → « jalon non mesuré ».
- La Spirale = liste/index de repères datés cliquables ouvrant la lecture d'un
  épisode ; pas de dataviz continue.

## Hors périmètre

- **SP-MET** (météo d'adhésion 3 états), **SP-CAB** (médiane cohorte, `n ≥ 5`),
  **SP-TT** (time-travel / snapshots), **SP-SPI** (accueil patient trajectoire) —
  hors C2B (registre A8).
- Comparer des points d'étape entre eux ou des instruments différents.
- Score de risque, pronostic, projection, courbe continue.
- Migration Prisma / écriture Supabase.

## Interdits

- Interface 100 % en français ; aucun secret en dur ; données patient fictives
  seulement (Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune migration Prisma/SQL ni écriture Supabase.
- Aucune réimplémentation du score ou des jalons (propriété `lib/equilibre`).
- `versionScore` intact ; aucune comparaison hors `versionScore` identique.

## Étapes

- [ ] Agréger les épisodes par (instrument, `versionScore`).
- [ ] Calculer les lectures par épisode (ancrage T0 d'épisode, LOT-08).
- [ ] Brancher le composant *compare* pour les épisodes comparables.
- [ ] Implémenter le bloc « non comparable » et l'état « jalon non mesuré ».
- [ ] Spirale-index de navigation (repères datés cliquables).

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check`
- Vitest : ≥ 2 épisodes même version → côte à côte ; versions différentes → bloc
  « non comparable » (jamais de delta) ; jalon sans couverture → « non mesuré ».
- Smoke praticien + vérification mobile/tablette (touche une interface).

## Critères de done

- [ ] Deux `versionScore` différents ne produisent jamais de delta.
- [ ] Un jalon non mesuré est affiché explicitement (jamais un 0).
- [ ] La Spirale reste un index navigable, aucune courbe.
- [ ] Aucune migration ; `versionScore` inchangé.

## Risques / points de vigilance

- Tentation d'une dataviz continue → refus explicite (A6).
- Ne pas déborder sur SP-MET/SP-CAB/SP-TT/SP-SPI (frontière A8).
- Prérequis données : activer seulement dès que ≥ 2 épisodes comparables existent
  (A8-5-ii), distinct du seuil cohorte `n ≥ 5` (SP-CAB).

## Résultats

**Livré le 2026-07-18** (branche `feat/c2b-lot-09-trajectoire`, **sans migration**) —
**réalisation read-only** décidée en revue utilisateur.

Constats de cadrage (revue) qui ont borné la réalisation : la spec supposait un
composant *compare* réutilisable (**inexistant** — panneau créé de zéro) et des
données multi-cycles (le modèle `assessment_episodes` stocke des **lignes par
jalon**, sans clé de cycle ; modèle **mono-protocole**, dette connue). D'où une
réalisation **read-only honnête** : la Spirale s'« allume » quand les données
existent, avec empty-state explicite sinon.

Réalisé :
- `lib/protocol/trajectoire.ts` (domaine pur) : `construireTrajectoire({ episodes,
  reponses, versionScore })` → **index** de repères datés + **cycles** (un par
  épisode T0, ancrés au T0 d'épisode via LOT-08) avec jalons T0/J21/J42/J90
  (« non mesuré » A8-2, jamais un 0), momentum T0→dernier jalon mesuré, et garde de
  comparabilité `resoudreComparaison` (aucun_cycle / un_seul_cycle /
  versions_differentes **A8-3** / comparable **A8-5-ii**).
- `api/praticien/trajectoire/route.ts` : GET lecture seule (session, patient,
  épisodes, réponses) → `Trajectoire`.
- `components/patient-cockpit/TrajectoirePanel.tsx` : panneau **read-only** (index
  daté, « jalon non mesuré », momentum, bloc comparaison avec empty-state /
  « non comparable »). **Jamais une courbe** (A6). Monté dans
  `ClinicalRuntimeSection` sous le panneau J21 (runtime réel, hors fixture).

**Frontière tenue** : n'absorbe pas SP-MET/SP-CAB/SP-TT/SP-SPI ; aucune écriture ;
`versionScore` et moteur intacts.

**Validations** : type-check ✅, Vitest (domaine : cycles/non-mesuré/garde A8-3 ;
route : 401/400/404/200 ; panneau : empty-state, non-mesuré, non comparable),
scoring-check ✅, lint ✅, anti-secrets ✅, aucune migration.

**Report assumé** (hors périmètre read-only) : la vraie comparaison **côte à côte**
multi-cycles reste théorique tant que le modèle mono-protocole n'autorise pas ≥ 2
cycles réels — futur gate (modèle multi-cycles / migration), à ouvrir quand des
données réelles ≥ 2 cycles existeront (A8-5-ii).

**Dette de modèle levée le 2026-07-20 — gate G2** (`GATE_G2_IDENTITE_CYCLE.md`,
migration `20260719120000_c2b_cycle_identity_v1`). `assessment_episodes` porte
désormais `cycle_id` et `version_score` (nullables). Deux conséquences sur ce
lot : `construireTrajectoire` ne reçoit plus de `versionScore` uniforme — chaque
cycle porte la version **figée à la confirmation**, ce qui rend la garde A8-3
réellement déclenchable au lieu d'être structurellement morte ; et l'index porte
le `cycleId` stocké, le rattachement par date livré en Vague 2 n'étant plus que
le repli des lignes qui n'en ont pas. Une version nulle donne la raison
`version_inconnue` : elle n'est jamais assimilée à la version courante.
