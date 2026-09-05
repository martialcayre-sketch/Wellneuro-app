### Les deux réserves du seuil visuel sont levées, l'une en me contredisant (2026-09-05)

**Réserve 1 — la borne du seuil était un chiffre inventé.** `seuil-visuel.test.mjs`
bornait le seuil à 196 px, présentés comme « l'aire d'une icône de statut de
14 px ». C'était l'aire de sa **boîte** ; ses traits en occupent bien moins.
Relevé sur la baseline `fiche-cockpit` (colonne des icônes du rail, x 316–344) :

| | encre |
|---|---|
| ✓ (fait) | 33 px |
| ○ (à ouvrir) | 74 px |
| horloge (en attente) | 97 px |

| substitution | coût |
|---|---|
| ✓ ↔ horloge | 96 px |
| ✓ ↔ ○ | 89 px |
| **horloge ↔ ○** | **23 px** |

**Le résultat contredit la réserve au lieu de la confirmer.** L'horloge et le
cercle sont deux disques de 14 px que seules les aiguilles séparent : leur écart
(23 px) est **plus petit que le bruit** entre contexte de génération et contexte
de comparaison (31–33 px). Aucun seuil ne tolère l'un et voit l'autre — prise
isolément, une icône n'est pas gardable.

Ce qui sauve la garde n'est pas un réglage mais un fait de code :
`IconeStatut statut={statut}` et `libelleStatut(phase.id, statut)` dérivent du
**même** `statut`. L'icône ne change jamais seule, et son libellé pèse bien
davantage — « renseignée » ↔ « à ouvrir » vaut **219 px**. La borne devient
donc 219, mesurée, et le seuil de 100 reste largement dessous : il voit bien un
changement d'état.

**Réserve 2 — le projet « iPhone 13 » photographiait la mise en page bureau.**
Le `beforeEach` praticien posait 1440×900 pour les deux projets : les baselines
mobiles ne prouvaient rien sur le point de rupture, seulement sur le moteur
WebKit, alors que leur nom disait le contraire — et le cockpit mobile n'était
couvert nulle part.

Le cadrage suit désormais le projet au lieu de l'écraser, discriminé par
`isMobile` (et non par le nom du projet, qui est gravé dans le nom des fichiers
de baseline et qu'on ne peut donc pas renommer sans les invalider). Au bureau :
fenêtre haute, pas de `fullPage`. En mobile : largeur native de l'appareil, et
fenêtre haute là aussi — les colonnes ne sont bornées à `100dvh` que sous le
préfixe `lg:`, donc le cockpit y redevient une colonne unique et c'est la page
qui défile, ce qui appelait d'abord `fullPage` ; la génération a montré pourquoi
ce n'était pas jouable (voir plus bas).

Le contrôle du moteur WebKit n'est pas perdu : les captures du portail
l'exercent toujours, à 420 px sur les deux projets.

**La première génération mobile a montré un défaut imprévu.** `MobileBottomNav`
est en `position: fixed` : une capture `fullPage` la fige à la hauteur du
viewport, donc au milieu d'une image de 2539 px — par-dessus « PHASE DUE /
Décision 21 j » sur le cockpit, et par-dessus « Aucun dépôt à ce jour » sur
l'onglet Trajectoire. Deux baselines qui auraient enterré sous un artefact de
capture le contenu même qu'elles surveillent.

Le remède est celui du cockpit bureau — fenêtre haute plutôt que `fullPage` —
pour une cause différente : là-bas des colonnes bornées à `100dvh`, ici un
élément fixe. 2800 px pour un contenu mesuré à 2539, 1900 px pour 1669. Le vide
en bas ne coûte plus rien depuis que le seuil est absolu (#879) : tant qu'il
s'agissait d'un ratio, sur-dimensionner la fenêtre achetait de la tolérance
ailleurs.

`dashboard-trajectoires` et `dashboard-patients` gardent l'artefact en mobile,
volontairement : ce sont des captures de revue (`pixel: false`), aucune baseline
n'en dépend.

**Validation.** T1 : exit 0. T2 : exit 1 — sur `portail-lien-magique.spec.ts`
(iPhone 13), `page.goto` expiré à 120 s, signature de `D-049` (blocage WebKit
sur Mac que le CI Linux ne reproduit pas), dans un spec que ce lot ne touche
pas. **Les 18 tests de `visual.spec.ts` passent**, dont les captures praticien
au viewport mobile.
