### Portail patient : les trois frises défilent au clavier (2026-11-06)

Défaut WCAG 2.1.1 antérieur, relevé par axe sur iPhone 13 (règle
`scrollable-region-focusable`) sur `PatientJourneyProgress` : la frise défile
sous 390 px sans aucun élément focalisable. `FriseJournees` et `FriseNuits`, de
la même famille, reçoivent le même traitement : `tabIndex={0}` sur la région qui
défile, un nom (`aria-label` déjà présent sur la frise des étapes,
`role="group"` et un nom propre sur les deux autres), et l'anneau du
`:focus-visible` global de `globals.css`, sans classe locale. Apparence au repos
inchangée. Aucune logique clinique, aucun seuil, aucune donnée ne change.

L'écart `scrollable-region-focusable` sort de `ECARTS_CONNUS` : le spec axe de
saisie échoue de nouveau si ce défaut revient sur la frise des étapes, Desktop et
iPhone 13.

Écarté : ne rendre la région focalisable que si elle déborde. Il faudrait un
observateur et un état client sur un composant purement présentationnel ; la
contrepartie assumée est un arrêt de tabulation de plus sur grand écran, où la
frise des étapes ne déborde pas.
