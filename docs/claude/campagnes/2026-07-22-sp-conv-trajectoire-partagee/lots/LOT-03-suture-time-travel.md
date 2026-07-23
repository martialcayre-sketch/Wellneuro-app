---
id: "LOT-03"
titre: "Suture time-travel — la Spirale de la fiche devient l'index temporel"
statut: "livré — 2026-07-23, PR de lot : index Spirale → asOf via LectureEtatPassePanel piloté, Retour au présent ; T1/T2 verts"
dépend_de: "LOT-00"
---

# LOT-03 — Suture time-travel — la Spirale de la fiche devient l'index temporel

## But

Unifier les deux navigations temporelles qui coexistent sans se voir : le
time-travel SP-TT (paramètre `asOf`, panneau du copilote) et l'index de
repères de l'onglet Trajectoire qui « ne filtre rien »
(`TrajectoirePanel.tsx:30-31`). Tenir enfin la promesse fondatrice :
« cliquer un tour recharge la fiche telle qu'elle était à cette date »
(BRAINSTORM_SPIRALE.md, l.13). **Rien à construire, tout à raccorder.**

## Résultat observable

- Cliquer un repère (tour/jalon) de l'onglet Trajectoire recharge les
  lectures de la fiche avec `asOf` à la date du repère — lecture seule
  stricte, mêmes instruments, mêmes versions.
- Bannière permanente en vue datée : « Vous consultez la fiche au [date] —
  lecture seule », avec « Retour au présent » toujours visible (patron de
  l'artifact de référence).
- La note de relecture (SP-TT, `relecture_notes`) reste accessible depuis
  la vue datée — horodatée au présent, jamais une modification du passé.
- `SpiraleTrajectoire` (`web/src/components/ui/SpiraleTrajectoire.tsx`)
  perd son `aria-hidden` là où elle devient interactive : arcs focusables,
  `aria-pressed`, équivalent clavier — ou reste décorative dans le bandeau
  et l'interaction porte sur l'index listé, au choix de la maquette LOT-00.
- Toute tentative d'écriture en vue datée est refusée (garde SP-TT
  existante, testée depuis ce nouveau chemin).

## Périmètre

`web/src/components/patient-cockpit/TrajectoirePanel.tsx` ; propagation
d'`asOf` dans les lectures de `FichePatientPanel` (réutiliser
`web/src/lib/praticien/lectureAsOf.ts` et les patterns de
`web/src/components/copilote/LectureEtatPassePanel.tsx`) ; la Spirale du
bandeau peut refléter la position datée. E2E dans le même commit.

## Hors périmètre

Snapshots persistés (SP-TT a tranché : recalcul par troncature, pas de
snapshot) ; toute écriture ; le panneau du copilote (reste tel quel,
même mécanique dessous) ; le contenu des instruments.

## Fichiers probables

- `web/src/components/patient-cockpit/TrajectoirePanel.tsx`
- `web/src/components/FichePatientPanel.tsx` (propagation `asOf`)
- `web/src/components/ui/SpiraleTrajectoire.tsx`
- `web/src/lib/praticien/lectureAsOf.ts` (import, non modifié)
- `web/e2e/` (spec trajectoire)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.
- Jamais d'écriture en lecture datée.

## Étapes

- [ ] Vérifier les hypothèses (`asOf` couvre-t-il toutes les lectures que
      la fiche affiche ? lister les routes).
- [ ] Câbler la sélection de repère → `asOf`, bannière, retour au présent.
- [ ] Accessibilité de l'index (clavier, annonce de la date sélectionnée).
- [ ] T1, T2, E2E ; relire le diff.

## Tests

E2E : sélection d'un repère passé chez Sophie Nicola → bannière datée,
contenu daté, retour au présent ; Vitest : garde lecture seule depuis ce
chemin ; a11y : navigation clavier de l'index.

## Critères de done

La promesse « cliquer un tour recharge la fiche datée » est constatable en
E2E ; une seule mécanique temporelle dans le code (celle de SP-TT) ;
`verify` vert.

## Résultats

À compléter à la clôture.
