---
id: "LOT-02"
statut: "squelette livré (2026-08-10) — calibration gatée (porte des 21 jours)"
---

# LOT-02 — Barème et indice agenda (gaté)

## Objet

Le scorer `agenda_alimentaire` sur le gabarit exact du jumeau sommeil
(`questions.ts:3783-3910`) : refus sous couverture minimale avec motif,
plancher **par axe**, axe non couvert = `null` renormalisé (jamais 0),
drapeaux cliniques jamais des points. `Q_ALI_09` passe de `type:'journal'` à
ce type **à la clôture seulement**.

## Relecture de production datée (2026-08-10, via `execute_sql`, lecture seule)

Porte des 21 jours **non franchie**, plus fermée que jamais : `agenda_alimentaire_jours`
ne porte qu'**une** assignation, **2 lignes**, **toutes deux datées du
2026-08-05**, dernière saisie le 2026-08-05 — le recueil est arrêté au premier
jour, identique à la lecture du 2026-08-07. Aucune distribution réelle à
observer : la calibration du barème (axes, poids, bornes) reste **impossible**
sans inventer, donc **différée**. La relance du recueil est une action humaine,
hors lot.

## Ce qui est livré : le SQUELETTE (sans barème)

Sur décision utilisateur (2026-08-10), la **structure** du scorer est posée,
**sans aucun seuil chiffré** :

- Branche `agenda_alimentaire` dans `computeScoreFromDef` (`questions.ts`),
  calquée sur `agenda_sommeil`. Les axes, bornes, poids, planchers et drapeaux
  viennent de la **config de scoring** (`sc.axes`, `sc.drapeaux`,
  `sc.minJours`, `sc.minJoursAxe`, `sc.minAxesCouverts`), **vide** au ship :
  sans axe déclaré, le scorer **refuse de coter** (« barème non calibré »). Rien
  d'inventé — ni borne, ni axe, ni poids.
- Invariants tenus et éprouvés sur définitions **forgées**
  (`agendaAlimentaireBareme.test.ts`, 13/13) : refus sous couverture (motif),
  refus barème non calibré, plancher par axe (null renormalisé, **jamais 0**),
  renormalisation sur les seuls axes couverts (total 50 sur un axe, pas 25
  dilué), moyenne pondérée, `sens:'inverse'`, `minAxesCouverts`, drapeaux qui
  alertent sans coter (total identique avec/sans drapeau).
- **`Q_ALI_09` reste `type:'journal'`** — non basculé. Aucun instrument de
  production n'utilise le nouveau type : **zéro changement de comportement en
  production**. La bascule à la clôture est l'affaire du lot de calibration.
- T1 vert ; matrice de consommation sans dérive (aucun nouveau consommateur) ;
  Vitest complet vert.

## Reste devant (le lot de calibration, gaté)

Quand un recueil réel suffisant existera : **décision clinique D-xxx** (axes,
poids, bornes, planchers, drapeaux — après observation de la distribution),
remplissage de la config de scoring, bascule de `Q_ALI_09` sur
`agenda_alimentaire` à la clôture, et migration éventuelle **séparée** du code
qui en dépend. `FENETRE_ALI_MAX_PLAUSIBLE` (`types.ts:87`) est une borne de
plausibilité de recueil, **pas** un seuil clinique : ne pas la promouvoir.

**Réserve nommée (revue scoring, 2026-08-10)** : au moment de câbler les
`poids`, poser une garde `sommePoids > 0` — sinon des poids tous nuls sur les
axes couverts produiraient `total = NaN`. Impossible au ship (config vide),
mais à fermer dans le lot de calibration.

## Dépend de

LOT-00, et d'une action humaine hors lot : la relance du recueil.
