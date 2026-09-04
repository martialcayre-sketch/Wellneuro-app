### Anamnèse : intolérances alimentaires et difficultés fonctionnelles en signaux déclarés structurés

Pré-condition du moteur de propositions de parcours (LOT-03) : les intolérances
et les troubles de la déglutition n'existaient que dans le **texte libre**
« Allergies et intolérances connues », qu'aucun moteur déterministe ne lit — et
qui ne doit pas être lu ainsi (un déclencheur sur du texte libre ferait taire
ou dériver la règle en silence).

Deux champs énumérés sont ajoutés à l'anamnèse :

- **« Intolérances alimentaires connues »** (Antécédents) — Gluten, Histamine,
  Lactose. Le champ libre existant est **conservé** pour tout le reste.
- **« Difficultés fonctionnelles actuelles »** (Histoire des troubles) —
  « Difficultés à avaler / troubles de la déglutition ».

`DrapeauxAnamnese` expose deux clés neuves (`intolerancesAlimentaires`,
`symptomesFonctionnels`), extraites avec le filtrage habituel : une valeur hors
énuméré est ignorée, jamais devinée. Les deux champs remontent aussi au
**contexte clinique praticien** — sans quoi une intolérance cochée sans texte
libre disparaîtrait de la synthèse. Le portail patient les rend sans changement
de code (rendu `checkbox-multi` générique).

**Aucune migration** (l'anamnèse est stockée en JSON), **aucune règle
d'orientation ou de parcours nouvelle** : ce lot ne fait que **capter** le
signal. Réserves portées à la décision clinique à venir : une dysphagie récente
et inexpliquée est aussi un **signal d'adressage** — elle n'est délibérément
PAS ajoutée à `extraireVigilanceDeterministe`, et une future règle
« alimentation mixée » ne devra jamais court-circuiter cette vigilance ; les
anamnèses déjà saisies restent sans ces champs (listes vides, donc règles
muettes sur l'historique — fail-closed assumé, sans rattrapage rétroactif).

T1 vert ; T2 vert (136 E2E Chromium + WebKit, Vitest SIIN57, contrats SQL).
