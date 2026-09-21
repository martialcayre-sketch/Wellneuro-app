### Le compteur de la panne WebKit porte sur la PAGE, pas sur le contexte — corrigé partout, avec la raison de l'erreur (2026-09-20)

`D-233`, qui a clos `D-049` la veille, consignait « blocage au rang 64 de
**création de contexte** ». C'est faux. Le **bras C** de la PR #1184 tient un
contexte **unique** avec une page **neuve** à chaque tour et bloque **au même
rang 64** : le contexte est donc exclu comme compteur. Le compteur porte sur la
**création de page** — un test = une page, d'où la signature « un seul test par
run, jamais le même ».

**La clôture n'est pas rouverte.** La condition de sortie reste remplie, le
correctif amont fonctionne, les trois séquences T3 sont vertes. Ce qui change est
le **mécanisme consigné** — et il change parce qu'une décision close se lit
longtemps : laissée ainsi, elle enseignerait le mauvais compteur à qui la
rouvrirait.

**La cause de l'erreur, et elle n'est pas flatteuse.** L'amendement du 2026-09-17
à `D-049` écrit **déjà** « LE COMPTEUR PORTE SUR LA CRÉATION DE PAGE », et le
fragment `2026-09-17-cause-racine-d049.md` porte la table à trois bras qui le
démontre. Mais **le titre de ce fragment** disait « au 64ᵉ contexte » — rédaction
antérieure au bras C, restée en place quand le corps a été corrigé sur constat de
revue. C'est ce titre qui a été repris, sans ouvrir la table deux lignes plus bas.
**Un en-tête n'est pas une source ; la mesure l'est.**

**Corrigé partout où l'énoncé est vivant**, et le balayage a compté : le titre du
fragment du 2026-09-17, `D-233` §2 et §3, le chapeau de clôture de `D-049`, la
règle `tests-validation.md`, le fragment de clôture du 2026-09-19, et le message
du classificateur `wn-diagnostic-e2e.mjs` — celui-là est le plus coûteux à
laisser faux, puisqu'il s'adresse à quelqu'un en train d'instruire un rouge.
L'unité du décompte des séquences T3 est corrigée avec : « 101 **pages** iPhone
13 », le chiffre était bon, l'étiquette fausse.

**Non touché** : la description du **bras B** dans l'amendement du 2026-09-17
(« un contexte iPhone 13 neuf à chaque tour ») — elle est **exacte**, c'est bien
ce que ce bras faisait. Ce qui était faux était la conclusion qu'on en tirait, et
le bras C existe précisément parce qu'une revue a refusé cette conclusion. Le
`SESSION_LOG` n'est pas rétro-écrit non plus : il est append-only, la correction
s'écrit dans l'entrée du jour.

Constat de `developer-03`, vérifié sur le corps de #1184 avant d'être retenu.
