# LOT-10 — deux instruments de mesure qui se trompaient, et ce qu'ils ont appris

Campagne « Doctrine exécutable », décision [[D-100]], branche
`worktree-doctrine+lot10-ancres-classificateur`.

## Ce que le lot a corrigé dans son propre cadrage

Ce lot avait été cadré par [[D-098]] sur une mesure. **Deux de ses constats
étaient faux**, et les deux pour la même raison de fond : l'instrument de
mesure était plus fragile que ce qu'il mesurait.

**Une citation morte, pas deux.** L'instrument de [[D-098]] attribuait chaque
verbatim à l'ancre la plus proche à sa gauche. Il a ainsi condamné
`drapeauxAnamnese.ts:28` en lui imputant le libellé « Difficultés à avaler ».
Cette ancre est **juste** : la ligne 28 porte `symptomesFonctionnels`, qui est
ce qu'elle ancre ; le libellé appartient à l'ancre voisine, où il figure
toujours. Seule `orientationEngine.ts:769-772` avait réellement dérivé.

C'est ce faux positif qui a dicté la forme de la convention : l'ancre et son
texte sont liés dans **un seul lien markdown**, jamais posés côte à côte.
L'attribution devient syntaxique — il n'y a plus rien à deviner.

**Le classificateur E2E se taisait pour deux raisons, pas une.** [[D-098]] n'a
vu que le prédicat `page.goto`. En jouant T2 et T3 sur le LOT-04, un second
mode est apparu : le prédicat « journal réseau vide » lâche dès qu'un test
monte son décor par `page.request.post(...)` — l'entrée s'écrit dans le même
journal, avant la navigation qui, elle, n'émettra rien. **2 723 octets pour une
seule ligne**, sur deux artefacts réels de deux sessions distinctes. Corriger
le mode cadré n'y aurait rien changé.

## Ce que le banc a trouvé avant la livraison

Deux fois, et les deux fois sur le contrôle lui-même :

1. **Une porte de service.** La reconnaissance de lien refusait les crochets
   internes, donc ne voyait pas `[« début […] fin »](…)` — donc ne le
   contrôlait pas. Il suffisait d'élider une citation fausse pour la dispenser
   du contrôle *censé refuser les élisions*.
2. **Un sur-appariement, en la corrigeant trop largement.** En admettant tout
   `]`, le texte franchissait les renvois `[[D-xxx]]` et avalait des
   paragraphes : une « ancre » de 51 000 caractères et un rapport de 400 Ko, sur
   le corpus réel.

La forme retenue n'ouvre que les deux jetons d'élision, et interdit le saut de
ligne.

## La clause qui manquait, et que le corpus a imposée

Une ancre **cite ce qui EST, jamais ce qui FUT**. Le registre raconte aussi des
états révolus — « `chaineC1.ts:315` **posait** `safetyFindings: 0` en dur »,
écrit la veille du jour où [[D-099]] a supprimé ce code. L'ancrer la
condamnerait à un rouge permanent, ou forcerait à réécrire l'histoire pour
faire taire un contrôle. Aucun code ne l'empêche : c'est l'auteur qui n'ancre
que le présent.

## Découverte hors périmètre, mais bloquante pour lui

**Une trace Playwright ne peut jamais être committée comme fixture.** Son
journal réseau transporte les en-têtes complets de chaque requête, **cookie
`next-auth.session-token` compris**. Les cas de non-régression reproduisent la
**forme** observée — le marqueur `_apiRequest` —, jamais l'artefact. À retenir
avant tout futur banc adossé à une trace.

## État livré

- **4 ancres** textuelles vérifiées, **258 citations** de l'ancienne forme
  comptées et non jugées. Une sentinelle exige un plancher d'ancres : un
  contrôle sans sujet est le plus rassurant des mensonges.
- Contrôle branché dans `npm run check` (`ancres-check`), banc dans
  `bancs-outillage-check`.
- T1 vert. **T2 entièrement vert** — 5633 tests, 156 E2E, aucun échec, pas de
  blocage WebKit sur cette passe.

## Ce qui reste ouvert

- **Deux citations hors bornes restent hors périmètre**, et c'est un choix :
  `seed.ts:270` vit dans `SESSION_LOG.md` (append-only) et dans la fiche d'un
  lot de campagne close. Réécrire une archive pour faire taire un contrôle est
  exactement ce que la convention interdit.
- **Le contrôle ne distingue pas seul le présent du passé.** La convention le
  dit ; rien ne l'empêche.
- **252 → 258 citations héritées** : le nombre monte à chaque décision écrite.
  La convention ne s'applique qu'au neuf et à ce qu'un lot touche, donc l'écart
  se creusera avant de se réduire. C'est assumé — une réécriture de masse
  noierait le contrôle sous du diff de documentation.

## Pour le lot suivant

- **LOT-05 est débloqué** (LOT-04 mergé) et hérite des réserves 5 et 6 de
  [[D-099]] : la divergence des deux requêtes de consultation, et le tour du
  vérificateur non éprouvé sur un dossier portant un signal.
- `npm run test:worktree` et `npm run check` se lancent **depuis `web/`** ;
  lancés depuis la racine du worktree, ils sortent en `ENOENT` sur
  `package.json`.
