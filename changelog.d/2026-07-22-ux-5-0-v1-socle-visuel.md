### Refonte visuelle 5.0 — lot V1, socle (2026-07-22)

Premier lot du chantier « retrouver la maquette cible 5.0 à l'écran ». La
Vague 1 du 2026-07-19 avait posé les canvas ardoise & sable sans porter
l'anatomie de la maquette (`docs/claude/propositions/2026-07-18-refonte-ux-5-0/
maquette-cible-ux-5-0.html`) ; ce lot pose le socle manquant, sans toucher un
seul écran dans sa structure :

- **Typo remontée au niveau des tokens** : `text-sm` 14 → 15 px, `text-xs`
  12 → 12,5 px, corps `text-base` en interligne 1,55 ; nouveaux paliers
  `text-2xs` (11,5), `text-13`, `text-14` (remplacent les valeurs arbitraires
  `text-[13px]`) et `text-metric` (32 px, valeurs de métriques).
- **Ombres de la maquette** : `shadow-card` (repos) et `shadow-pop`
  (tiroirs/survol) en tokens ; les 24 cartes en `shadow-sm` migrées.
- **Rayons** 10/14/18 px (valeurs exactes de la maquette).
- **Focus clavier** global : anneau 3 px, décalage 2 px, couleur du thème
  (le solaire est exclu — 2,03:1, insuffisant pour un indicateur).
- Deux `bg-white` en dur remplacés par `bg-surface` ; vitrine interne
  `/dev/vitrine` (hors production) pour comparer les deux thèmes à la
  maquette ; `design-system-d1.md` réconcilié (§10, Inter/Lora et radius
  D1 marqués caducs).

Écarté : le renommage des centaines de `text-sm` en classes explicites — la
remontée par tokens fait le même travail sans churn. Les lots V2+ portent
l'anatomie écran par écran (cockpit, rail, Fil, portail).
