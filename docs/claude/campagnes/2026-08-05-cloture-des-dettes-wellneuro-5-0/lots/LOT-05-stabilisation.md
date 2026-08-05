---
id: "LOT-05"
titre: "Matrice de consommation du savoir"
statut: "livré"
dépend_de: "LOT-01"
---

# LOT-05 — Matrice de consommation du savoir

## But

L'ingestion est complète, la consommation ne l'est pas. Plusieurs corpus validés à
100 % sont mappés sans appelant, cachés derrière un flag, exposés dans une
bibliothèque sans être intégrés au raisonnement clinique, ou jamais transformés en
règle de conduite.

Deux doubles verrous connus laissent des surfaces livrées **et dormantes** :
`WN_ENABLE_ORIENTATION_NNPP2` + `tableSignee`, et `WN_ENABLE_CORPUS_CLINIQUE_V1` +
`validationExterne`. La table d'orientation elle-même est livrée depuis le
2026-07-25 (#361) et dort en fail-closed.

La prochaine étape n'est **pas** davantage d'ingestion. C'est de savoir ce qui est
consommé et par quoi.

## Résultat observable

Une matrice, **générée** et non rédigée à la main, à cinq colonnes :

| Source de savoir | Surface qui la consomme | Décision produite | Validation requise | Patient visible |
|---|---|---|---|---|

Chaque ligne est dérivée du code : une source sans appelant apparaît avec une
surface vide — c'est précisément l'information recherchée.

## Périmètre

- Écrire le générateur de la matrice (extension naturelle de `wn-etat-reel.mjs`,
  LOT-01, ou script frère).
- Recenser les sources de savoir, les flags qui les gardent, et leurs appelants.
- Pour chaque source sans appelant : trancher entre *à brancher*, *à laisser
  dormante avec sa raison*, ou *à retirer*.
- Décider explicitement du sort de #372 (rubriques de six questionnaires,
  ouverte depuis le 2026-07-25) : son périmètre a-t-il été absorbé par #566/#567 ?

## Hors périmètre

- **Toute nouvelle ingestion de savoir** — contrainte de campagne.
- Lever un flag ou activer une surface en production : c'est une décision
  praticien, hors de ce lot.
- Modifier une règle d'orientation.

## Fichiers probables

- `scripts/wn-matrice-consommation.mjs` (nouveau)
- `web/src/lib/clinical/orientationRulesV1.ts`, `orientationEngine.ts`
- `web/src/lib/supplement-library/featureFlag.ts`, `catalogue.ts`
- `web/src/lib/anthropic.ts`
- `docs/claude/PROJET_CONTEXTE.md`
- `changelog.d/2026-08-05-matrice-de-consommation.md`

## Interdits

- Aucune ingestion.
- Aucun changement de valeur de flag.
- Pas d'appel de modèle facturé sans validation explicite du coût.

## Étapes

- [x] Recenser sources, flags et appelants.
- [x] Écrire le générateur.
- [x] Lister les sources sans appelant, et trancher pour chacune.
- [x] Statuer sur #372.
- [x] T1 puis T2.

## Tests

- Test du générateur sur fixtures : une source sans appelant doit apparaître avec
  une surface vide, pas être silencieusement omise.

## Critères de done

- [x] La matrice est générée et non vide.
- [x] Chaque source sans appelant porte une décision datée.
- [x] Le sort de #372 est tranché.
- [x] La matrice est référencée depuis `docs/claude/PROJET_CONTEXTE.md`.

## Résultats

**Livré le 2026-08-05.** `scripts/wn-matrice-consommation.mjs` dérive du code la
matrice « source → surface → décision → drapeaux → verrou → patient » et l'écrit
dans `docs/claude/MATRICE_CONSOMMATION.md` (`--markdown`). Les arbitrages vivent
à part, dans `docs/claude/corpus/consommation_decisions.json` : ce qui se déduit
du code est généré, ce qui se décide est écrit à la main.

**19 sources, 6 dormantes.**

- **La bibliothèque de biologie fonctionnelle est la dette la plus coûteuse** :
  987 actes NABM V105 en base depuis le 2026-07-26, et **aucun fichier hors de
  `web/src/lib/biology-library/` ne les touche**. Ni route, ni écran. Le
  recensement d'entrée la donnait pour « consommée — routes biologie » ; il n'y
  a pas de route biologie. Verdict `a_brancher`.
- Cinq rayons de corpus sans appelant (biologie, nutrition, sommeil, stress,
  humeur), corpus prêts et allowlist volontairement étroite. Verdict `dormante`,
  raison et date de réexamen au 2026-09-01.
- La table d'orientation et le corpus clinique de synthèse ne sont **pas**
  dormants au sens de ce lot : ils ont des appelants. Ce qui les ferme est un
  double verrou (drapeau **et** condition de donnée), et la matrice le montre en
  colonne dédiée plutôt que de le confondre avec l'absence d'appelant.

**Sort de #372 : tranchée — absorbée, à fermer sans merger.** Son périmètre est
déjà sur `main` : `web/src/lib/scoring/rubriques.ts` lit bien les cinq clés
(`subScores`, `components`, `parts`, `categories`, `phases`) et
`miniSynthese.ts` en reprend le raisonnement. La PR est `CONFLICTING` et
inchangée depuis le 2026-07-25 ; la merger ré-appliquerait un correctif déjà en
production. Le geste de fermeture reste à poser (revue/merge = ressort Copilot).

**Trois pièges rencontrés en écrivant le générateur** — tous produisaient un
tableau faux mais vert :

1. `\b` ne s'ancre pas devant `@` : `\b@/lib/x\b` ne correspond **jamais**.
   Toutes les chaînes d'import remontaient vides et la table d'orientation
   passait pour dormante alors que sa route l'importe en toutes lettres.
2. Une mention en **commentaire** comptait comme un appel. Ce dépôt commente
   beaucoup, et nomme volontiers ce qu'un fichier *ne fait pas*.
3. Chercher le littéral d'un rayon dans tout `web/src` déclarait « sommeil »,
   « stress » et « humeur » consommés — l'agenda du sommeil contient le mot sans
   rien savoir du corpus. La détection est bornée aux appelants réels du service
   de rayons.

**Six de plus, trouvés par la revue adversariale (NO-GO, puis corrigés)** — tous
laissaient le banc vert :

4. **Deux passes de regex ne peuvent pas retirer des commentaires.** Blocs
   avant lignes : un `/*` écrit dans un `//` (« les six routes
   `api/patient/*` ont changé ») ouvre un bloc jusqu'au prochain `*/`. Lignes
   avant blocs : un `//` écrit dans un bloc emporte le `*/` qui le ferme, et le
   commentaire ressort comme du code. Ni l'une ni l'autre ne connaît les
   chaînes. Remplacé par un automate à quatre états.

   **Corollaire, trouvé au second tour** : la variante « lignes d'abord » était
   purement **inopérante sur les 72 fichiers CRLF** de `web/src` — `$` sans `m`
   n'accroche pas devant un `\r`. Les commentaires y survivaient tous, et la
   ligne « catalogue des questionnaires » de la matrice livrée comptait **17
   surfaces fantômes**, toutes descendant d'un seul commentaire de
   `lib/equilibre/types.ts`. Invisible parce que toutes les fixtures étaient en
   LF ; le banc porte désormais une fixture CRLF.
5. **La distinction surface/relais n'était épinglée par aucun test.** Deux
   mutations — `NATURES_SURFACE` élargi à `'librairie'`, `consommee` calculé sur
   le nombre d'appelants — passaient 17/17 vert **en faisant disparaître le
   constat-titre du lot** (la bibliothèque de biologie, dont l'unique référence
   est une librairie). Les fixtures ne testaient que « zéro appelant ».
6. **La colonne des drapeaux était fausse dans les deux sens.** Faux négatif :
   « — » sur des rayons pourtant fail-closed, la garde vivant deux sauts plus
   loin (`route → access → featureFlag`). Faux positif : quatre drapeaux sans
   rapport attribués au catalogue de questionnaires, ramassés dans la fermeture
   transitive. Un tiret dans cette colonne se lit « rien ne le garde ».

   **Deux corollaires du second tour.** `featureFlag.ts` porte plusieurs
   drapeaux : scanner le fichier entier donnait `WN_C4_ENABLED` aux rayons de
   recherche — dont le code dit qu'ils en sont « délibérément distincts » — et
   `WN_RECHERCHE_CORPUS_ENABLED` à micronutrition, que servir par cette porte
   **contournerait**. La lecture descend donc à la tranche d'export réellement
   importée. Et surtout : un drapeau **nommé dans un message d'interface**
   (« Son activation métier se fait via le flag … ») était compté comme une
   garde. Seul un `process.env.WN_*` en est une — une phrase qui nomme un
   drapeau ne garde rien.
7. **Le parseur de rayons perdait en silence** les clés citées, à tiret, ou dont
   la valeur passe à la ligne — la classe #546/#552 que ce lot prétend fermer.
   Il porte désormais un contrôle de complétude qui rend visible ce qu'il n'a
   pas su lire.
8. **La colonne « patient » ignorait le portail livré la veille** (#591,
   `app/portail/`), et une de ses clauses visait `components/portail/`, qui
   n'existe pas : un test écrit depuis l'implémentation, pas depuis le dépôt.
   Le correctif par préfixe a introduit l'erreur inverse — `components/patient`
   attrape `components/patient-cockpit/`, qui est l'écran **praticien** : la
   matrice déclarait la table d'orientation visible du patient, en
   contradiction avec sa propre colonne « décision produite ». La visibilité
   d'un composant se dérive maintenant de son **point de montage**.
9. **Le script ne s'exécutait pas du tout sous un chemin symbolique.** La garde
   CLI comparait `process.argv[1]` brut à `import.meta.url`, déjà résolu : sous
   `/var/…` (lien vers `/private/var/…` sur macOS), le bloc CLI ne tournait pas
   et le script **sortait en code 0 sans rien faire**. Un `--strict` muet vaut
   moins que pas de garde.

Un dixième constat, celui-là sur le périmètre : Compl'Alim et les compositions
étaient déclarés par leurs symboles d'**ingestion**. Leur unique appelant était
donc leur propre route d'écriture, la ligne ressortait « consommée », donc sans
dette — alors que ce sont les données dont le trou de dose plafonne le cumul. La
question du lot est « qui **lit** ce savoir pour décider ». Les deux lignes
pointent désormais `resolution.ts` et `compatibilite.ts`.

Gardes ajoutés en conséquence : intégrité des déclarations (chaque `module`,
chaque `symbole` et chaque accesseur de garde existe — `FICHE_COMPLEMENT`
n'existait pas), fraîcheur du Markdown livré (régénérer et comparer), code de
sortie de `--strict` (annoncé partout, exercé nulle part), fixture **CRLF**, et
séparation des drapeaux co-localisés dans un même `featureFlag.ts`.

**Validations** : `node --test scripts/wn-matrice-consommation.test.mjs` (33
tests), banc câblé dans `npm run check` (`bancs-outillage-check`) **et** dans le
job CI `verify` — la parité est elle-même gardée par
`scripts/parite-check-ci.test.mjs`. Deux passes de revue adversariale, deux
NO-GO, dix constats fondés : aucun n'avait de ligne fautive évidente, et le banc
restait vert sur chacun.
