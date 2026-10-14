---
id: "LOT-03"
titre: "BP-03 — Série par analyte, jour n, trois dates"
statut: "en_cours (2026-10-14) — fiche validée ; 14 écarts d'unité lus, toutes des graphies ; code à écrire"
dépend_de: "LOT-01, LOT-09"
---

# LOT-03 (BP-03) — Série par analyte, jour n, trois dates

## But

Donner au praticien, pour chaque analyte d'un dossier, la suite datée de ses
mesures qui font foi, sans rien en conclure. Aujourd'hui le seul lecteur de
calcul, `derniersResultatsParAnalyte`, ne garde que la dernière mesure ;
l'écran liste les lignes saisies, corrections et annulations comprises, sans
dire laquelle fait foi ni où elle tombe dans le suivi. BP-16 (boucle
d'exploration), BP-05, BF-5 (F56) et BP-27 attendent cette série.

## Résultat observable

Sur la fiche du praticien, par analyte : les mesures qui font foi, dans
l'ordre du prélèvement. Chacune porte sa valeur telle qu'en base (texte, sans
arrondi ni conversion), son unité, l'intervalle du laboratoire tel que
transcrit s'il existe, et trois dates distinctes : prélevé le, entré au
dossier le, corrigé le (s'il y a lieu). Elle porte aussi sa position dans le
suivi, « jour n depuis la diffusion du [date] » ou « antérieur à la
diffusion ». Puis le nombre de points et, s'il y en a, les motifs de non-
comparabilité. Jamais d'écart, de flèche, de couleur, de tendance ni de
verdict.

## Socle établi (ne se rediscute pas)

- **Fonction pure `serieParAnalyte`** dans `biology-library/`, voisine de
  `derniersResultats.ts` (cadrage v1 §4 ; v3, ligne BP-03). Elle ne rend
  jamais « comparable », seulement l'absence de motif connu. Aucun delta.
- **Les fils annulés n'y entrent pas** (`D-294` §6). Le paramètre
  `annulations` est obligatoire, comme pour `derniersResultatsParAnalyte` :
  un lecteur qui l'oublierait ferait foi d'une saisie reconnue fausse. Une
  révocation fait revenir le fil. Une clé qui porte un fil annulé et un fil
  vivant ne rend que le vivant : on groupe par racine, jamais par clé
  (`D-294` §3).
- **Une tête par fil**, élue par `correctionsParLigne` (fourche comprise),
  puis triée par prélèvement, départagée par saisie puis par identifiant
  (même règle que `plusRecente`).
- **Trois dates, jamais confondues** (cadrage v1 §4). Le prélèvement :
  `preleve_le`. L'entrée au dossier : `saisi_le` de la racine du fil. La
  correction : `saisi_le` de la tête quand elle remplace une ligne. Libellé
  « entré au dossier », et non « reçu » : pour un import, `saisi_le` est la
  date de validation, pas celle du dépôt du compte rendu.
- **Jour n = fait arithmétique**, en jours calendaires (Europe/Paris) depuis
  le jour 0 de `D-255`, calculé par `calendrierSuivi.ts` seul. Aucune
  étiquette J21/J42 et aucune fenêtre réemployée : `TOLERANCE_JOURS_JALON`
  n'a aucune source biologique (`DC-19`). Sans diffusion, aucun jour n :
  « aucune diffusion ».
- **Intervalle du laboratoire verbatim**, sans conversion ni comparaison à la
  valeur (`D-157`, `D-267` §7 ; critère F15). Il est lu par la relation
  `ligneCandidate`, comme le fait déjà la route.
- **Aucun nouveau drapeau** (v3 : « né avec le code »). Le garde est
  `isCbResultsEnabled`, comme pour tout l'affichage des résultats. Rien côté
  patient (`D-294` §5).
- **Aucune migration**, aucune décision `D-xxx` propre : la décision
  préalable est BP-00 (`D-266`).

## Arbitrages du responsable (2026-10-14, sur cette fiche)

1. **Les 14 écarts d'unité textuels se lisent avant le code** (plan F60,
   geste h2). L'assistant dresse la liste par conteneur, en lecture seule,
   par analyte et paire d'unités, sans aucun dossier nommé ; le responsable
   tranche chacun : graphie ou vraie divergence. Quel qu'en soit le verdict,
   la série compare les unités à l'identique : une table d'équivalence de
   graphies serait une décision à part (F60, deux unités, rang 5).
   **Lecture faite le 2026-10-14** (`one-off-5504`, lecture seule, agrégats
   sans dossier) : 14 paires (analyte, unité imprimée, unité enregistrée),
   22 lignes d'import validées. L'unité enregistrée est celle du catalogue
   dans tous les cas : U/L ↔ UI/L (ALAT, ASAT, GGT), G/L ↔ 10^9/L (leucocytes,
   cinq sous-populations et plaquettes), T/L ↔ 10^12/L (hématies), µg/L ↔ ng/mL
   (ferritine), fl ↔ fL (VPM), écriture du DFG CKD-EPI. Aucun analyte ne
   porte deux unités en base (60 résultats, 2 dossiers). **Verdict du
   responsable : toutes des graphies**, aucune valeur enregistrée dans une
   unité fausse. Le code peut partir.
2. **Jour n depuis la diffusion en vigueur à la date du prélèvement**, avec
   sa date affichée : un prélèvement antérieur à un pivot se date par la
   diffusion qui ouvrait alors le calendrier. `calendrierDuCycle` ne garde
   que le dernier jour 0 ; une fonction pure neuve de `calendrierSuivi.ts`
   rend les jours 0 successifs (même tri, même règle de pivot), sans changer
   la fonction existante, ce qu'un banc vérifie.
3. **Surface : l'encart biologie de la fiche** (`EstimeMesurePanel`),
   au-dessus de la liste des saisies qui reste telle quelle, lignes annulées
   marquées comprises. L'onglet Biologie (F57) la déplacera.
4. **Les commentaires du laboratoire entrent dans ce lot**, sous la valeur
   qu'ils concernent : recopiés tels qu'imprimés, sans les compléter, les
   reformuler ni en rien conclure (`D-278` §3) ; un commentaire non transcrit
   est dit « non transcrit », jamais tronqué. Seuls ceux qui portent sur le
   résultat (`commentaire_lu` de la ligne lue) ; ceux du compte rendu entier
   restent à l'import. La forme pourra être reprise par la lettre s (F57).

## Points tranchés par la fiche

- **Motifs de non-comparabilité, comparés à l'identique, sans normalisation.**
  - « point unique ».
  - « unités différentes », graphies différentes comprises.
  - « laboratoire non identifié » : saisie manuelle, ou import sans
    `laboratoire_lu`.
  - « laboratoires différents » : textes lus différents.
  - « contexte de prélèvement non renseigné » : toujours présent jusqu'à
    BP-05, qui crée ce contexte. C'est la vérité, et c'est elle qui le
    justifie.
- **Valeur en texte** (`Decimal.toString()`), comme la base la porte.

## Périmètre

- `serieParAnalyte` (pure), ses motifs et son type de sortie. Aucun champ
  numérique n'y est dérivé des valeurs.
- La fonction des jours 0 successifs dans `calendrierSuivi.ts` (arbitrage 2).
- La route `GET /api/praticien/biologie/resultats` ajoute `series` à sa
  réponse : mêmes lignes, mêmes annulations actives déjà lues, les
  calendriers du dossier, et le commentaire de la ligne lue à côté de
  l'intervalle et du marquage qu'elle sert déjà.
- Le rendu dans l'encart biologie, commentaires compris (arbitrages 3 et 4).

## Hors périmètre

- Courbe (BF-5, F56).
- Commentaires du compte rendu entier (ils restent à l'import).
- Contexte DC-46 (BP-05).
- Attente typée et réveils (BP-04).
- Panneau des interventions actives sur la période (BP-08).
- Encart T0 et « attentes ouvertes » à la diffusion : ils dépendent de BP-04.
- Toute équivalence d'unités et toute qualification de valeur.
- Le portail.

## Fichiers probables (une PR, sans migration)

- `web/src/lib/biology-library/serieParAnalyte.ts` et son test (neufs)
- `web/src/lib/protocol/calendrierSuivi.ts` et son test (arbitrage 2)
- `web/src/app/api/praticien/biologie/resultats/route.ts` et son test
- `web/src/components/patient-cockpit/EstimeMesurePanel.tsx` et son test
- Gardes de liste blanche : `importeursBiologyLibrary.guard.test.ts` (tout
  importeur neuf de `biology-library`) ; `FAITS_ADMIS` de
  `lecteursResultatBiologique.guard.test.ts` si le module pur reçoit les faits
  du laboratoire ; `COMMENTAIRES_ADMIS` du même banc pour la route, le module
  et l'écran qui lisent le commentaire (`D-278` §3)
- `changelog.d/` (fragment) ; statut de cette fiche et de `CAMPAGNE.md`

## Interdits

- Aucun delta, aucune flèche, aucune couleur, aucune position par rapport à
  l'intervalle, aucun mot qui juge. Sentinelle en `innerText` sur le rendu :
  « amélioré », « aggravé », « effet », « hausse », « baisse »,
  « évolution », « tendance », « normal », « anormal ».
- Aucune conversion ni normalisation d'unité.
- Aucun lecteur ne contourne l'exclusion des annulations.
- Aucune donnée patient réelle dans le dépôt. Les fixtures prouvent le
  mécanisme, pas un parcours (`D-125`).

## Tests

- **Pur.** Plusieurs cas : tête de fil seule, avec la date de correction ; fil
  annulé exclu, puis révoqué et revenu ; clé portant un fil annulé et un fil
  vivant ; ordre prélèvement, puis saisie, puis identifiant ; fourche. Pour le
  jour n : jour 0, antérieur, aucune diffusion, pivot (arbitrage 2), même jour
  calendaire en fin de journée à Paris. Chaque motif, seul et combiné. Une
  valeur qui ne sort pas arrondie. Commentaire recopié à l'identique ;
  « non transcrit » sans texte. Jours 0 successifs : la fonction existante
  rend le même calendrier qu'avant.
- **Route.** `series` cohérent avec les lignes servies ; un annulé absent de
  `series` mais présent dans les lignes, marqué ; 503 sous drapeau éteint.
- **Écran.** Les trois dates sont libellées distinctement ; le commentaire
  sous sa valeur ; aucun mot interdit en `innerText`.
- **Paliers.** T1 à chaque édition, T2 avant le commit. `/code-review medium`.

## Critères de done

Les 14 écarts d'unité sont lus et tranchés par le responsable avant le code
(fait le 2026-10-14 : toutes des graphies).
La série tourne sur les trois fixtures en banc, sans aucun delta. L'intervalle
de chaque laboratoire apparaît verbatim, sans conversion (F15). Un fil annulé
est absent de la série. T2 est vert. Après le déploiement, la série est
constatée sur un dossier réel lu par identifiant, par conteneur.

## Dépendances

LOT-01 (terminé) ; LOT-09 (terminé : #1448, release-db constatée, #1455).
Rang 4 du plan (F15).
