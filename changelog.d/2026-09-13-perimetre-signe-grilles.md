### Verrous de signature — le périmètre couvre enfin ce qui décide, pas seulement ce qui porte son nom (2026-09-13)

**LE DÉFAUT A ÉTÉ CONSTATÉ, PAS SUPPOSÉ, ET IL EST ARRIVÉ LE JOUR MÊME.**
[[D-180]] a porté la borne du PSQI de 4/5 à 5/6 dans `questions.ts`, sur
arbitrage praticien relu. L'effet sur `R-SOM-01` était l'objet de l'arbitrage.
Ce qui ne l'était pas : `BIO-SOM-01` — règle `publiee` d'une table **elle aussi
signée**, qui prescrit `PANEL_SOMMEIL_1` — lit la même zone couleur sur le même
instrument. **Elle a cessé de prescrire à 5 sans avoir été éditée, sans
re-signature, et sans qu'un seul banc ne rougisse.** La signature du 2026-08-17
a continué d'attester un contenu dont le comportement avait changé.

La cause n'était pas un oubli, c'était une frontière mal placée :
`ORIENTATION_RULES_SHA256` et `INDICATIONS_BIOLOGIE_SHA256` ne hachaient que leur
tableau de règles. Or les zones citent des COULEURS (`{type: 'couleur'}`) et des
LIBELLÉS (`{type: 'interpretation'}`), jamais des nombres. **Le point où une
règle s'allume n'a jamais été écrit dans la règle** — il est écrit dans la grille
d'interprétation de l'instrument qu'elle cite. Une borne déplacée dans une grille
changeait le comportement des deux tables, et les deux `shaPerimetre`
continuaient de concorder.

**LA RÉPARATION REPREND UNE FORME QUI EXISTE.** Les deux empreintes deviennent
composites — `sha256(JSON.stringify({ regles, grilles }))` — exactement comme
`PRIORITY_RULES_SHA256` porte `{ regles, abstention }` depuis [[D-062]], et pour
le même motif : un périmètre signé doit couvrir tout ce qui détermine le
comportement signé.

Les grilles ne sont pas écrites à la main, elles sont **dérivées des zones
réellement citées** (`grillesCitees`). Une règle ajoutée demain fait donc entrer
SA grille dans le périmètre sans qu'on y pense — et referme le verrou jusqu'à
re-signature, ce qui est le comportement voulu. L'inventaire est épinglé par un
banc qui NOMME les instruments : la table d'orientation en lit **quatre**
(`Q_ALI_01`, `Q_GAS_01`, `Q_SOM_01`, `Q_STR_02`), celle des indications en lit
**seize**. Dix-sept distincts, dont `Q_SOM_01` que les deux partagent — le fait
qui a rendu le défaut coûteux.

**UNE GRILLE SUR TROIS FORMES ÉTAIT LUE, ET C'EST LE BANC DE GARDE QUI L'A DIT.**
Le premier jet ne consultait que `scoring.interpretation`. Il est passé au rouge
immédiatement sur `Q_GAS_01` (TFD SIIN), cité par une zone couleur dans les DEUX
tables, qui range ses bandes sous `globalInterpretation` et sous
`subScores[].ranges`. Le périmètre aurait eu l'air complet : le défaut qu'on
referme, reproduit dans sa réparation. Les trois formes entrent désormais, et
toutes les grilles d'un instrument cité y entrent — **sur-couvrir coûte une
re-signature de trop, sous-couvrir laisse une borne commander une table signée
sans être signée.**

**UNE ABSENCE SE HACHE, ELLE NE S'OMET PAS.** Rendre `undefined` pour une grille
introuvable la ferait disparaître de `JSON.stringify` : le périmètre se
refermerait en silence sur ce qui manque. `GRILLE_INTROUVABLE` entre dans
l'empreinte, et un banc refuse qu'un instrument cité n'ait de grille nulle part.

**`BANDES_PSQI` A CHANGÉ DE FICHIER, ET AUCUNE BORNE N'A BOUGÉ.** Elle vivait en
`const` local dans le corps de `computeScoreFromDefBrut` — hors d'atteinte de
tout périmètre. C'est **la seule grille du catalogue qui ne soit pas dans le
`scoring.interpretation` de son questionnaire** (`Q_SOM_01.scoring` vaut
`{type: 'psqi', …}` et rien d'autre), donc la seule qu'aucune dérivation
générique ne pouvait trouver. La grille qui a échappé au périmètre était
précisément celle qui n'était pas rangée avec ses semblables. Elle vit désormais
dans `clinical/bandesPsqi.ts`, module-feuille, avec sa provenance.

**CE QUE LE PÉRIMÈTRE COÛTE DÉSORMAIS, ET C'EST VOULU.** Renommer un libellé de
bande, déplacer une borne, changer une couleur : chacun de ces gestes referme les
DEUX verrous jusqu'à re-signature. C'est le prix d'un fail-closed qui porte sur
ce qui décide.

**LE CÔTÉ BIOLOGIE PASSE PAR L'APPELANT, ET C'EST DÉLIBÉRÉ.** `statuts.ts` hache
le périmètre qu'on lui REMET — c'est l'acquis du finding M4 de la revue du
2026-08-16, qui a rendu inconstructible le couple signature/sha étranger aux
règles évaluées. Les grilles voyagent donc avec les règles, dans
`EntreeStatutsBiologie`. Le champ est optionnel et **fail-closed quand il
manque** : `JSON.stringify` omet une clé `undefined`, si bien qu'un appelant qui
ne passe rien hache un périmètre différent du signé — le verrou se ferme, avec le
motif « périmètre modifié ». Oublier les grilles n'ouvre jamais. Les fixtures
calculent leur empreinte par `shaPerimetreBiologie`, la MÊME fonction que le
moteur, et non par recopie de sa formule : un élargissement futur rougit partout
d'un coup au lieu de laisser des fixtures cohérentes avec une formule périmée.

**LES 29 CLAIMS DE LA TABLE BIOLOGIE ONT ÉTÉ RELUS EN BASE DE PRODUCTION**
(one-off détaché `one-off-8740`, lecture seule) : **29 lignes sur 29**, toutes
`statut = 'VALIDE'`, `active = true`, `version_claim = 'v1.0'`, aucune
`superseded_at`. **Deux ne sont pas prescriptives** — `WN-CL-0106-027` et
`WN-CL-0107-012`, toutes deux sur `BIO-STR-01`. Ce n'est pas un défaut :
`0106-027` fournit la LECTURE du seuil (« moyenne ≥ 3,5, présence du burnout »),
pas la conduite, et la règle s'appuie sur cinq claims prescriptifs par ailleurs.
C'est écrit ici pour que la différence avec l'orientation — dont les 23 étaient
toutes prescriptives — ne se lise pas plus tard comme une anomalie.

**LES DEUX TABLES SONT DONC NON SIGNÉES, ET LES BANCS ROUGES SONT LE VERROU.**
Le périmètre ayant grandi, les deux empreintes ont changé sans qu'aucune règle ne
bouge :

| table | `shaPerimetre` porté | empreinte du périmètre élargi |
|---|---|---|
| `orientationRulesV1` | `e2f087d6…97e427e` (2026-09-13) | `77268825847105b2513c9a900a77d16f23914ad2d12961126f973b4003a1b7aa` |
| `indicationsBiologieV1` | `a2f28c0b…b38acb8f` (2026-08-17) | `e9b07544531e64fe4263383492a47d2df43b873bec0cf708cd0a8654b45aa631` |

**Rien ici ne pose ces deux sha.** Signer est un acte clinique, et cette
signature-ci porte sur un périmètre qui a grandi : elle demande la relecture des
GRILLES, pas seulement des règles. C'est le geste que la décision rend
nécessaire, et c'est aussi tout son intérêt — si les bornes ne valaient pas
d'être relues, elles ne valaient pas d'être signées.
