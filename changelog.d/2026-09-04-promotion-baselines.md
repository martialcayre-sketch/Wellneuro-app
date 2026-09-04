### Les six baselines visuelles deviennent opposables (2026-09-04)

Trois écrans, deux moteurs de rendu chacun, produits sous Ubuntu par le workflow
`visual-baselines` (run 33917811431, base `24f0953d`, Node 22 — celui de
`verify`). Chaque image a été regardée à pleine résolution avant promotion, la
doctrine du workflow l'exigeant.

**`fiche-cockpit`** (1440×1700) et **`portail-connexion`** (420×900) sont
nouvelles. **`fiche-tiroir-besoins`** (1440×900) remplace une référence
**fausse** : celle qui vivait sur `main` photographiait le cockpit avant
résolution du runtime — puces pleines au lieu des icônes de statut, libellés
génériques, « indéterminée » en phase 7 — et passait pourtant au vert, l'écart
restant sous le seuil de 2 %. C'est `--update-snapshots=all` (#872) qui a rendu
son remplacement possible.

**Ce qui fonde la promotion.** Deux runs CI indépendants, à trente minutes et
deux commits de base d'écart, produisent des images **identiques au bit près** —
0 pixel de différence, pas « sous le seuil ». Les dates affichées par le cockpit
(12/06/2026, 10 juin 2026) viennent du seed et sont absolues : elles ne dérivent
pas avec le calendrier, contrairement aux « T0 + X j » qui ont valu leur
`pixel: false` à d'autres écrans.

**Ce que cette PR met à l'épreuve pour la première fois.** Ces six comparaisons
n'ont jamais tourné dans `verify`. Le workflow ne joue que `visual.spec.ts` ;
`verify` joue toute la suite E2E, qui écrit en base. Un écran dont le contenu
dépend de cet état partagé peut donc différer entre les deux contextes — c'est
exactement ce qui avait fait échouer `dashboard-patients` (2386 contre 2546 px).
Le seul élément identifié ici est le badge de compteur sur « Le Fil du jour »,
présent sur un projet et absent sur l'autre. Le CI de cette PR est le juge.
