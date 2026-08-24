### `DC-58` mesurée sans sujet, et le banc posé sur le versant décidable (2026-08-24)

Décision `D-105`, LOT-03 de « Doctrine exécutable ». La fiche exigeait **la
mesure avant le banc** ; c'est la mesure qui a retourné le lot.

- **Zéro valeur orpheline.** Descente sur 476 fichiers de test et 595 fichiers
  source : 25 candidats sans provenance, **tous légitimes** après qualification
  — 19 lignes de fixture d'une colonne Prisma (les vraies doses vivent en base,
  curées), 4 codes HTTP 400 attrapés dans des titres de test, 2 sorties
  calculées.
- **La méthode prescrite ne tient pas.** Contrôler qu'une valeur de test
  « existe ailleurs » est vacu : avec 633 valeurs distinctes au dénominateur,
  presque tout entier court trouve un répondant par hasard — `poids = 1` était
  « couvert » par le chiffre 1 d'`indicationsBiologieV1.ts`, et
  `doseCibleBasse = 4000` par une longueur de texte. Le banc aurait été vert en
  permanence **et vert pour la mauvaise raison**.
- **`DC-58` reste une proposition**, avec sa mesure inscrite : ni basculée par
  complaisance, ni laissée non instruite.
- **Le banc regarde des POSITIONS, plus des valeurs.** Un littéral à droite d'un
  opérateur de comparaison *est* un seuil, sans qu'on ait à deviner si le nombre
  est clinique. `seuilsLitterauxMotives.guard.test.ts` balaie tout `src/lib` en
  découverte automatique, neutralise chaînes, commentaires et expressions
  régulières, et exige que toute comparaison à littéral hors catalogue soit
  nommée dans une constante motivée ou inscrite avec son motif écrit. Une
  comparaison inconnue rougit plutôt que d'être devinée.
- **Il garde `DC-19`/`DC-20` plus que `DC-58`, et son en-tête le dit.** Le
  catalogue est exempté par forme — un cut-off y est chez lui. Les 33 seuils de
  `questions.ts` restent gardés par la certification de scoring et
  `DC-17`/`DC-18` : limite nommée, pas oubli.

**Deux littéraux nommés, aucune valeur changée.** Sur 61 comparaisons mesurées,
deux étaient fautives et de la même façon — un repère unique écrit plusieurs
fois, dont une seule écriture nommée.

- `discordanceRythme.ts` confrontait le déclaré à un `10` nu pendant que
  l'observé lisait `SEUIL_JEUNE_MIN`. C'est **un seul repère** (SIIN54 en
  heures, l'agenda en minutes) : porter l'un à 11 h laissait l'autre comparer à
  10, et la discordance confrontait deux repères différents en silence.
  `SEUIL_JEUNE_DECLARE_H = SEUIL_JEUNE_MIN / 60`, dérivé et non recopié.
- « Trois actions maximum » était écrite **six fois dans trois fichiers**, moteur
  et écran compris — une borne portée à quatre côté moteur laissait l'écran en
  bloquer trois. `MAX_ACTIONS_PROTOCOLE_21J`, posée dans
  `clinical-engine/types.ts`, seul foyer qu'un composant client puisse importer
  en valeur sans embarquer `node:crypto`.

Les deux valeurs sont identiques avant et après, et aucun test existant n'a été
modifié. **Banc vu rouge quatre fois** : fichier neuf portant un seuil orphelin,
exemption devenue morte, et chacune des deux corrections défaite.

**Dette nommée** : `source.axes_prioritaires.length > 3` dans
`synthese-praticien.ts` — troisième borne « au maximum 3 » du dépôt, provenance
non retracée, exemptée en étant inscrite comme dette.
