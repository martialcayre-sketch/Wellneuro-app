### Le workflow des baselines visuelles réécrit tout, au lieu de conserver le périmé (2026-09-04)

`visual-baselines.yml` lançait `npx playwright test --update-snapshots`, drapeau
nu. Sans valeur, Playwright prend le préréglage **`changed`** : il ne réécrit que
les baselines qu'il juge différentes — jugement rendu avec les options du
matcher, ici `maxDiffPixelRatio: 0.02`. Une baseline périmée dont l'écart passe
sous ce seuil survit donc au workflow, et repart telle quelle dans l'artefact,
où rien ne la distingue d'une image fraîche.

Constaté sur le run 33915188718, lancé juste après le merge de #871 pour vérifier
son effet. Les deux images `fiche-tiroir-besoins` de l'artefact étaient **octet
pour octet** celles déjà commises (sha256 identiques) — donc antérieures au
correctif. La capture de revue du même run, elle, est écrite inconditionnellement
par `page.screenshot()` : elle montrait le rail posé que #871 venait d'obtenir,
numéros de phase et « à ouvrir » en phase 7, là où la baseline conservée montrait
encore l'état non résolu, sans numéros et « indéterminée ».

Le correctif était en place, le run vert, et la référence restait celle d'avant.

La mécanique est lisible dans le source livré (`playwright/lib/matchers/expect.js`) :
quand la comparaison **passe**, seul `all` réécrit ; `changed` conserve. Quand
elle échoue, les deux réécrivent. La baseline périmée avait donc bel et bien
passé la comparaison — c'est ce que l'absence de réécriture démontre, et le
seuil de 2 % explique comment.

Le workflow passe désormais `--update-snapshots=all`. Sous `all`, la réécriture
est conditionnée à `compareBuffersOrStrings` : une image réellement identique
n'est pas réécrite, donc pas de diff de bruit sur les écrans inchangés. C'est la
seule valeur cohérente avec un workflow dont le métier est de **produire** la
référence, pas de la conserver.

Un quatrième invariant dans `scripts/ci-invariants.test.mjs` l'exige, et porte
sur la **valeur** du drapeau, pas sur sa présence : le drapeau nu est accepté par
Playwright et vaut `changed`, `missing` serait pire encore. Prouvé rouge sur les
trois formes — nu, `=changed`, `=missing`.

**Ce que cela laisse ouvert.** Le seuil de 2 % joue aussi à la comparaison, dans
`verify` : la baseline `fiche-tiroir-besoins` actuellement commise passe au vert
contre un rendu qu'elle ne représente plus. Une tolérance dimensionnée pour
absorber le bruit absorbe aussi les changements réels de la taille du bruit.
