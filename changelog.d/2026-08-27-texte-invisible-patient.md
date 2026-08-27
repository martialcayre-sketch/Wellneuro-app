### Un texte sans rien de visible n'est plus un texte (contre-revue adverse, `N1.7`)

La contre-revue Codex du 2026-08-27 a **réfuté** l'affirmation `N1.7` — « aucune
ligne au texte vide n'atteint la table » — sur un contre-exemple exécuté.

**Le défaut.** Les gardes de texte s'écrivaient `texte.trim().length === 0`.
`String.trim()` ne retire que les blancs de la grammaire JavaScript : **six
caractères invisibles lui survivent** — `U+200B` espace sans chasse, `U+200C` et
`U+200D` antiliant et liant sans chasse, `U+2060` gluon, `U+00AD` trait d'union
conditionnel, `U+180E` séparateur de voyelle mongol. Une saisie composée d'un
seul d'entre eux passait pour un texte non vide : réponse `ok`, ligne persistée,
et **rien à voir** pour qui la relit ensuite.

**La base ne rattrapait pas.** Les CHECK de texte s'écrivent
`btrim("texte", E' \t\r\n') <> ''` : ils ne retirent que ces quatre caractères
et laissent passer les six autres — ainsi que `U+00A0`, `U+3000`, `U+2028` et
`U+FEFF`, que `trim()` retirait pourtant. Le bord applicatif était donc la seule
garde effective, et il était **moins strict que ce qu'il annonçait**.

**Conséquence sur la surface patient** : une réponse d'étape pouvait être
enregistrée sans aucun contenu lisible, et l'EVA devenait alors,
fonctionnellement, **le seul contenu de la réponse** — exactement ce que le
lot interdit, puisque l'échelle ne peut pas remplacer les mots (`DC-19`,
`DC-20`).

**Plus large que le constat rapporté.** La revue nommait la réponse d'étape ;
le même défaut portait sur **trois** gardes du même module : l'**énoncé du
patient** (ses propres mots, recopiés à chaque révision), l'**amendement**, et
la réponse d'étape. Un quatrième site, `texteFacultatif`, rendait une chaîne
invisible là où il promettait `null`.

**Le correctif.** Un prédicat unique, `sansContenuVisible`, refuse un texte dont
**rien n'est visible** — blancs, séparateurs et caractères de format Unicode
confondus. Il est exporté et **partagé avec la surface patient** : le bouton
d'envoi ne s'active plus sur une saisie invisible, au lieu de laisser le
serveur refuser une saisie qui paraît vide à l'écran. Une seule définition,
deux bords.

**Refus, jamais nettoyage.** Un texte qui porte au moins un caractère visible
est accepté **tel quel**, invisibles compris : retirer des caractères de la
saisie d'un patient, c'est réécrire ses mots.

**Dette reconduite, pas corrigée** : les CHECK SQL gardent leur `btrim/1`, en
production comme dans les migrations. Les resserrer est **une migration à part**,
avec son arbitrage propre — dette déjà nommée par le `migration.sql` du LOT-05,
et par les CHECK de texte de 6.0-A qui portent le même trou.

**Aucune modification clinique** au sens de `DC-17`/`DC-18` : aucun seuil, dose
ni borne n'est touché. Ce qui change est la définition de « vide ».
