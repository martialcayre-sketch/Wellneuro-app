# Handoff — Les trois frises du portail défilent au clavier (WCAG 2.1.1)

## Branche et état Git

`claude/nostalgic-dhawan-9fe5e8`, worktree `.claude/worktrees/nostalgic-dhawan-9fe5e8`,
avancée en `--ff-only` sur `origin/main` a22d5440 (qui contient #1892, d'où vient
le spec axe). Aucune migration, aucune route, pas de release-db.

## Objectif

Corriger le défaut `scrollable-region-focusable` relevé par axe sur
`PatientJourneyProgress`, traiter `FriseJournees` et `FriseNuits` de façon
cohérente, retirer l'écart de `ECARTS_CONNUS`.

## Décisions prises

- `tabIndex={0}` sur la région qui défile, pour les trois.
- **Pas de classe d'anneau locale** : le `:focus-visible` global de `globals.css`
  (3 px, décalage 2 px, jeton `--color-focus-ring`) couvre déjà ces régions. Un
  `ring-primary` l'aurait remplacé par une teinte hors jeton.
- Nom : `aria-label` existant sur l'`ol`. Sur les deux `div`, `role="group"` et un
  nom propre (« Défilement de la frise de vos journées », « … de vos nuits »),
  distinct de celui du SVG pour ne pas l'annoncer deux fois. `group` plutôt que
  `region`, pour ne pas ajouter de repère de page.
- Écarté : la focalisation conditionnelle au débordement (observateur et état
  client sur un composant présentationnel). Contrepartie assumée : un arrêt de
  tabulation de plus sur grand écran, où la frise des étapes ne déborde pas.
- Écarté : un gestionnaire de touches. Rien ne montre que le défilement natif
  manque ; voir les problèmes ouverts.
- `FriseEtapesNavigable` n'est pas touchée : sa liste contient toujours un lien
  (l'étape 4 l'est dès qu'elle n'est plus à venir), et axe la laisse passer.

## Fichiers modifiés

`web/src/components/patient/PatientJourneyProgress.tsx` et son test neuf ;
`web/src/components/patient/agenda-alimentaire/FriseJournees.tsx` et son test ;
`web/src/components/patient/agenda-sommeil/FriseNuits.tsx` et son test neuf ;
`web/e2e/portail-accessibilite-saisie.spec.ts` (écart retiré) ;
`changelog.d/2026-11-06-a11y-frises-defilement-clavier.md` ; ce handoff.

## Validations exécutées

- T1 complet (`npm run check`) : vert, sur la tête finale de `main`.
- T2 (`npm run test:worktree -- --fast`) : vert. 355 E2E passés, 0 échec, 21
  ignorés ; Vitest 960 fichiers, 16 339 tests.
- Spec axe sans l'écart : vert sur Desktop Chromium et iPhone 13, fiche de
  renseignements et `PlaintesForm`.
- Sonde jetable sur la fiche de renseignements (jamais versée), Desktop Chromium
  et iPhone 13 : Tab atteint la frise, `:focus-visible` vrai, contour
  `3px solid`, anneau entier sur capture. La frise ne déborde que sur iPhone 13.
- Banc moteurs jetable, sur une page minimale : les flèches font défiler une
  liste `overflow-x` focalisée sous Chromium (bureau 390 px et Pixel 5).

## Problèmes ouverts

- **Inconnu faute de preuve : le défilement aux flèches sous Safari réel.** Sous
  le WebKit de Playwright, les flèches ne font rien défiler : ni la frise, ni un
  scroller dont un lien a le focus, ni la page entière (`PageDown` ou `Espace` la
  déplacent ; le témoin Chromium défile aux flèches aussi). C'est une limite du
  banc, démontrée par ce témoin : elle ne dit rien pour ni contre Safari. D'où
  l'absence d'assertion de défilement dans le spec. Geste manuel restant : Safari
  fenêtre étroite, Tab jusqu'à la frise, flèche droite.
- `FriseJournees` et `FriseNuits` n'ont pas de preuve navigateur : aucun spec axe
  ne passe par les agendas, et elles ne débordent que sous 320 px de conteneur
  (`min-w-[320px]`). Leur preuve est le test unitaire et le mécanisme partagé.
- Firefox n'a pas été essayé : non installé sur ce Mac.

## Prochaine action exacte

CI de la PR puis tri de la revue, déclarer « prête @<sha> » en commentaire de PR.
L'intégrateur merge (`D-373`).

## Interdits encore actifs

Pas de merge par cette file pendant l'essai `D-373`. Pas d'assertion de défilement
clavier sous WebKit dans un spec tant que le banc ne le produit pas : elle
rougirait sans rien instruire.
