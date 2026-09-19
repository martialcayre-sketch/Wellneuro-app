# Handoff — 2026-09-19 — Le lot d'exposition des indications d'assiette (D-237)

## 1. Branche et état Git

- Branche : `wn-post-attestation-2026-09-19`, partie d'`origin/main` à
  `ad7d6355` ([[D-236]]).
- Registre : **237 décisions, D-001 à D-237**, sans doublon ni trou.
- Le lot ne touche **aucune ligne, aucun claim, aucun `shaPerimetre`** : le
  périmètre signé du 2026-09-19 est intact.

## 2. Objectif de la session

Le lot d'exposition, demandé en une phrase — « go lot d'exposition ». La table
`INDICATIONS_ASSIETTES_V1` était signée depuis [[D-236]] et **n'atteignait
personne**. Deux fonctions portaient par écrit leur propre condamnation :
`lignesIndicationAssietteServables` et `assiettesParIndication`, toutes deux
sous la réserve « si le lot d'exposition ne vient pas, elle se supprime ».

## 3. Ce que le lot livre

- **`indicationsAssiettesService.ts`** — lecture seule. Verrou, corpus, dossier,
  dans cet ordre de coût croissant de l'erreur. Premier appelant de production
  du point de sortie de la table.
- **`GET /api/praticien/assiettes-indiquees`** — session, entrée, appartenance,
  traduction. **Aucun POST.**
- **`AssiettesIndiqueesPanel`** — carte de lecture montée dans
  `ClinicalRuntimeSection`, sous-vue Protocole de la phase Actions, à côté de
  l'observatoire Boussole. **Aucun bouton, aucun formulaire, aucun champ.**
- **`WN_ASSIETTES_INDIQUEES`** — neuf et **éteint**.

## 4. LE FAIT QUI COMMANDE LE LOT

**`evaluerDeclencheur` rendait `null` pour deux raisons que rien ne
distinguait** : la donnée a été lue et n'atteint pas la porte, ou **la donnée
n'existe pas**. Sur l'orientation, la confusion ne coûtait rien — une cible non
proposée se repropose au prochain questionnaire. Sur une **indication servie au
praticien**, elle coûte : une carte vide se lit *« aucune assiette n'est
indiquée pour ce patient »*, qui est un **constat clinique**, là où la vérité
est le plus souvent qu'un instrument n'a pas été passé. C'est `DC-24`, et c'est
l'arbitrage du responsable — **nommer ce qui manque**.

D'où `lacunesDuDeclencheur`, **dans le moteur partagé et non dans le service** :
la doctrine de complétude y vit déjà, et le chapeau d'`orientationService` dit
pourquoi — *un fail-closed dupliqué est un fail-closed qu'on oublie de corriger
dans l'une des deux copies*. **Huit** formes, toutes des faits sur le **dossier** :
instrument non passé, passé mais non coté, recueil incomplet, **complétude
illisible**, mesure indisponible, anamnèse absente, âge inconnu, régime non
déclaré — la huitième entrée **sur constat de revue** (§ 8 ter).

**Une asymétrie du moteur est respectée plutôt que lissée** : la garde de
complétude ne vaut que pour les branches d'un `ou` — une feuille seule peut
s'allumer sur un plancher garanti, qui n'est servi que sur recueil incomplet.
`lacuneDeFeuille` prend donc un paramètre pour le dire.

**Le coût est assumé et écrit** : une seule branche lacunaire rend toute la
disjonction « non évaluée ». Une ligne à trois portes paraîtra donc souvent non
évaluée tant que le recueil est partiel.

## 5. Décisions prises

- **Périmètre** : service + route + carte — le seul périmètre où quelque chose
  atteint réellement l'écran.
- **Drapeau neuf et éteint** — et il est **la seule chose entre la table et
  l'écran**. D'ordinaire un drapeau neuf double un verrou clinique encore fermé ;
  ici la signature est ouverte, donc sans drapeau les sept lignes arrivaient **au
  prochain déploiement**. *(Aucun rang n'est revendiqué dans la série des
  drapeaux « neufs et éteints » : le document en numérote neuf et en porte au
  moins deux de plus sans numéro — un compte écrit ici serait faux. Écrit d'abord
  « les neuf précédents », vérifié, corrigé.)*
- **Emplacement** : `ClinicalRuntimeSection`, là où le praticien décide —
  cohérent avec le cadrage du 2026-09-16 (l'assiette est l'unité de
  prescription, l'aliment son contenu). **Pas de `c5Enabled`** : une seconde
  condition invisible se lirait comme une panne de la première.
- **Silence** : nommer ce qui manque (§4).

## 6. Fichiers

**VINGT EN TOUT — HUIT NEUFS, DOUZE MODIFIÉS**, énumérés depuis
`git diff --name-status origin/main...HEAD`, jamais de mémoire.

**ET CE COMPTE A ÉTÉ FAUX DEUX FOIS DE SUITE, ce qui dit quelque chose du
procédé.** Première rédaction : « sept neufs, huit modifiés » — le même écart
qu'au lot précédent. Deuxième : « huit neufs, onze modifiés », corrigée depuis
`git status`… qui ne montrait que les fichiers encore non committés. Le douzième
modifié — `orientationEngine.test.ts` — était déjà au commit, donc invisible à
cette lecture-là. Relevé par Copilot. **La bonne source est le diff CONTRE LA
BASE, jamais l'état de l'arbre de travail.**

**HUIT NEUFS** — `indicationsAssiettesService.ts` + son banc (**26 cas**) ·
`api/praticien/assiettes-indiquees/route.ts` + son banc (**12 cas**) ·
`AssiettesIndiqueesPanel.tsx` + son banc (**19 cas**) — **57 au total** après les
correctifs de revue · `changelog.d/…-exposition-indications-assiettes.md` ·
ce handoff.

**DOUZE MODIFIÉS** — `orientationEngine.ts` (le vocabulaire de lacune,
**aucun chemin existant touché**) **et son banc** (les cas directs de
`lacunesDuDeclencheur`) · `indicationsAssiettesV1.ts` (prose périmée, §8) ·
`plates.ts` (la réserve d'`assiettesParIndication` est levée) ·
`ClinicalRuntimeSection.tsx` (montage) **et son banc** (routage du `fetch`) ·
`scripts/wn-matrice-consommation.mjs` **et** `MATRICE_CONSOMMATION.md` ·
`docs/FEATURE_FLAGS.md` · `docs/DECISIONS.md` · la surface de relecture ·
`FILE_ATTENTE.md`.

## 7. Validations exécutées

- **T1 vert** — `T1-EXIT=0` **lu dans le fichier redirigé**, jamais dans une
  notification. 70 fichiers / 1549 tests, plus 24 / 1623.
- **T1 a mordu DEUX fois, et les deux étaient justes** :
  1. `const module = await import(...)` — `no-assign-module-variable` de Next.
  2. **VINGT-SEPT cas de `ClinicalRuntimeSection` tombés d'un coup.** Le banc de
     la section route `fetch` par URL ; une route **non déclarée** consomme une
     réponse de la file générique du cockpit. Mon panneau volait donc la réponse
     du cockpit, et la section entière rendait « Erreur technique ». **Le banc
     portait déjà le récit du même défaut**, survenu avec la route d'adressage.
     Corrigé en déclarant la route et son défaut (verrou fermé ⇒ carte absente),
     et un compte d'appels est passé de 4 à 5 — **avec son énumération mise à
     jour**, pas seulement le nombre.
- **Un document généré avait dérivé** : `MATRICE_CONSOMMATION.md`, et la dérive
  disait ce que le lot fait (orientation 8 → 9 surfaces indirectes). Régénéré.
  **La table d'indications d'assiette y est entrée** — elle n'y figurait pas, et
  sa place est le jour où elle atteint un écran, pas le jour de sa signature.
- **DOUZE MUTATIONS, DOUZE ROUGES CIBLÉS** — sauvegarde par `cp`, jamais la
  restauration par l'index, et application vérifiée avant de conclure. Ce total
  a été écrit faux une fois (« dix ») et relevé par Copilot : un compte qui
  vient d'un résumé, pas de la liste, dérive dès que la liste s'allonge.
  Les voici, et le total est celui de cette liste :
  1. faire diverger l'un des deux `cleClaim` ⇒ **8 cas rouges**, dont celui qui
     existe pour ça ;
  2. une anamnèse absente cessant d'être une lacune ⇒ **1 cas**, le bon ;
  3. retirer le verrou précoce de la route ⇒ **1 cas**, celui du journal d'accès ;
  4. remettre le `hidden` au montage de la carte ⇒ **1 cas** (Copilot) ;
  5. restaurer `manquants ?? 0` sur complétude illisible ⇒ **1 cas** (Copilot) ;
  6. rendre `scoresJson` au lieu de le recalculer ⇒ **2 cas**, les deux neufs,
     et **zéro avant ce lot de revue** ;
  7. figer `retireesFauteDeClaim` à zéro ⇒ **3 cas**, dont celui de la route ;
  8. retirer le `new Set` du dédoublonnage ⇒ **1 cas** ;
  9. resservir `raccourciAssume` ⇒ **1 cas** ;
  10. taire la phrase du retrait à la carte ⇒ **1 cas** ;
  11. restaurer l'ancienne condition de lacune de zone ⇒ **2 cas**, les deux
      neufs (second tour Copilot) ;
  12. retirer le jeton de course du panneau ⇒ **1 cas**, et il a fallu
      l'ÉCRIRE : l'état daté du dossier rend le jeton inutile partout sauf au
      retour sur le MÊME dossier. La première mutation ne rougissait rien, ce
      qui disait non pas que le jeton est mort, mais que le banc ne couvrait
      pas le seul cas où il décide (troisième tour Copilot).

## 8. Ce que le lot a trouvé au passage

- **UNE JOINTURE TENUE POUR LA PREMIÈRE FOIS.** `cleClaim` existe **deux fois**
  au dépôt — `catalogueConduitesV1` pour les tables signées,
  `rag/claims/validite` pour le corpus. Les deux rendent `id::version`, **par
  coïncidence** : aucun banc ne les confrontait. Si l'un dérivait, le filtre ne
  reconnaîtrait aucune clé et le service rendrait **zéro ligne en silence** —
  fail-closed, pour une raison introuvable.
- **PROSE PÉRIMÉE, SEPTIÈME OCCURRENCE SUR CE FICHIER.** Le chapeau
  d'`indicationsAssiettesV1.ts` disait encore « Verrou ÉTEINT »,
  « `validationExterne` vaut `false` » et « Trois des dix lignes ». [[D-236]]
  avait corrigé **six** blocs sur constat de revue ; celui-ci a survécu **parce
  qu'il est en commentaire de ligne et non en bloc JSDoc** — un balayage par
  forme de commentaire ne voit pas l'autre forme.
- **Le service passe par `assiettesParIndication()`**, pas par
  `getRecommendedPlate` : la recherche brute trouve aussi les trois repères
  d'**observation**, et la partition se refait au point de service.
- **`node:crypto` a failli entrer au paquet client — attrapé À LA RELECTURE,
  pas par un banc.** Pour rendre le champ d'anamnèse en français, le panneau
  importait `CHAMP_ANAMNESE` : `declencheursAnamnese` → `orientationRulesV1` →
  `corpusSyntheseV1` → `createHash` de `crypto`. **Aucun banc unitaire ne le
  voit ; ça casse au BUILD.** Import retiré, le champ n'est plus nommé, et le
  motif est écrit dans le composant plutôt que laissé à redécouvrir. C'est la
  seconde fois que ce chemin est emprunté au dépôt.

## 8 bis. Trois correctifs venus de ma propre relecture, pas d'un banc

1. **La carte clignotait.** Le drapeau étant éteint, TOUS les dossiers tombent
   dans la branche « verrou fermé » : un « Lecture en cours… » rendu pendant
   l'attente faisait apparaître puis disparaître un titre clinique sur chaque
   dossier du cabinet. Rien ne paraît désormais avant la réponse.
2. **`MESSAGE_CORPUS_ILLISIBLE` était exporté et appelé par personne** — le
   panneau ne peut pas importer ce module (il tire Prisma) et écrivait son
   propre texte. Deux orthographes du même message, dont une morte. Retiré.
3. **L'import qui tirait `crypto`** (ci-dessus).

## 8 ter. La revue Copilot — DEUX constats, TOUS DEUX RÉELS et corrigés

Lue aux **trois** emplacements : `pulls/1204/comments` (2), `.reviews[].body`
(l'aperçu, « Findings: 2 »), et **aucun** bloc « Suppressed comments ».

1. **`hidden` NE DÉMONTE PAS — et le journal d'accès l'aurait payé.** Le panneau
   était monté sous un `hidden`, comme son voisin l'observatoire. Pour
   l'observatoire c'est VOULU (le démonter perdrait l'aliment sélectionné) ;
   ici c'était une faute. Le `useEffect` partait dès le montage de la
   **section** — donc en phase Décision et dans les sous-vues Historique,
   Diffusion, Biologie. Drapeau ouvert, la route vérifie l'appartenance et
   **journalise une lecture de dossier clinique** que le praticien n'a jamais
   demandée. C'est l'inverse exact de ce que le verrou précoce de la route
   garantit, et ma propre prose le promettait. **Montage conditionnel**, et un
   cas neuf l'exige — vérifié par mutation : remettre le `hidden` le fait rougir.
2. **`manquants: comptes?.manquants ?? 0` FABRIQUAIT UN FAIT.**
   `comptesDuPorteurVise` rend `null` quand la complétude est **illisible** ;
   le repli annonçait « recueil incomplet : 0 item(s) manquant(s) ». Un nombre
   inventé, dans la carte dont tout le propos est de ne jamais présenter une
   absence comme un fait. **Huitième forme de lacune**,
   `completude_illisible` — vérifié par mutation.

**ET LA FONCTION N'AVAIT AUCUN BANC DIRECT.** `lacunesDuDeclencheur` n'était
exercée qu'à travers le service, qui recalcule les scores et ne peut donc pas
fabriquer librement un porteur sans comptes — c'est précisément pourquoi ce cas
limite est passé. Six cas directs sont entrés dans
`orientationEngine.test.ts`, où la fonction vit.

## 8 quater. La revue adversariale — SEPT constats retenus, six corrigés, un rapporté

Trente-six agents, six dimensions, quinze constats éprouvés : **sept survivent
à la réfutation**, huit tombent. Six sont corrigés ici ; le septième est
**préexistant à ce lot** et reste ouvert, nommé au dossier de campagne.

1. **UNE LIGNE PUBLIÉE QUE LE CORPUS RETIRE DISPARAISSAIT SANS AUCUN COMPTE.**
   `lignesIndicationAssietteServables` écarte une ligne dès qu'UN de ses claims
   cesse d'être valide — cinq prédicats, tous mutables par la curation, et la
   route `POST /api/praticien/corpus/claims/decision` suffit. Les trois sorts ne
   comptaient que les lignes SERVABLES et `corpusLu` valait `true` : la carte
   disait « les 4 indications en service ont été évaluées ; aucune n'est
   retenue » sous le sha du périmètre **entier**, quand trois des sept lignes
   publiées n'avaient pas été regardées. C'est `DC-24`, et c'est exactement la
   faute que ce lot existe pour empêcher. Un quatrième compte entre
   (`retireesFauteDeClaim`), la carte le nomme, et l'invariant du banc passe des
   lignes **servables** aux lignes **publiées**.
2. **`raccourciAssume` SORTAIT TEL QUEL À L'ÉCRAN.** Prose écrite pour la
   relecture de signature, avec ses mots à elle — `claimsSecurite`,
   `insomnie_depression`, `Q_INF_03`, `D-224`. Elle paraissait sur la ligne **la
   plus atteignable de la table** (la protéinée, qu'une borne d'âge ouvre
   seule), donc dès le premier dossier de plus de 60 ans, sur la carte même dont
   le chapeau explique qu'elle renonce à nommer un champ d'anamnèse pour ne pas
   afficher un identifiant interne. **Aucun banc ne le voyait** : la fixture du
   panneau posait `raccourciAssume: null`. Le champ ne traverse plus. **Il ne se
   reformule pas** : il est DANS le périmètre haché, le réécrire périmerait
   l'attestation — un libellé d'écran est un champ neuf, donc une re-signature.
3. **LE BANC DU SERVICE ANNONÇAIT DES PASSATIONS, ET N'EN FOURNISSAIT AUCUNE.**
   `dossierVide()` rendait `[]` au `beforeEach` et rien ne le redéfinissait :
   tout le chemin `scoresRecalculesPourRaisonnement` → porte d'instrument
   n'était jamais joué avec de la donnée, alors que cinq des sept lignes en
   dépendent. Le recalcul — invariant que le § 4 présente comme le cœur du lot —
   n'était éprouvé par rien. Deux cas entrent, avec un score stocké
   volontairement faux : la mutation qui rend `scoresJson` tel quel les fait
   rougir tous les deux, et eux seuls.
4. **LE DÉDOUBLONNAGE DES CLAIMS N'ÉTAIT GARDÉ PAR RIEN** — et la mutation
   dormait dans l'arbre de travail. `WN-CL-0288-013` est le seul claim cité
   deux fois (indication ET sécurité, sur la protéinée) ; les deux seules
   assertions qui touchaient `.claims` portaient sur l'épargne digestive, dont
   les six claims sont distincts. **Un agent de revue avait appliqué la mutation
   pour la démontrer et ne l'avait pas défaite** : elle a été trouvée en
   comparant l'arbre au commit poussé, pas par un banc. Restaurée, puis gardée
   par un cas dont la mutation a été vue rougir.
5. **UN COMMENTAIRE FAUX SUR SA PROPRE BARRIÈRE.** Le pavé qui justifie de ne
   pas nommer le champ d'anamnèse à l'écran annonçait que l'import ferait entrer
   `node:crypto` et **casserait au BUILD**, qu'aucun banc unitaire ne le verrait.
   Les trois affirmations sont fausses : le spécifieur est `'crypto'` nu, que
   Next résout vers son polyfill sans broncher ; le chapeau de
   `bundleClient.guard.test.ts` écrit lui-même que « ni tsc, ni le lint, ni les
   bancs, ni le build » ne voient la chose ; et c'est précisément ce banc — donc
   **T1** — qui aurait rougi, `declencheursAnamnese` n'étant pas un module
   feuille. Le coût réel est le poids du chunk et le référentiel servi au
   navigateur. Corrigé au fichier et au registre : une session future qui lirait
   l'ancienne version en conclurait qu'un build vert prouve l'hygiène du paquet.
6. **RÉSERVE PRÉEXISTANTE, RAPPORTÉE ET NON CORRIGÉE.** Le garde
   `bundleClient.guard.test.ts` ne lit que les spécifieurs `@/lib/clinical/…`.
   La chaîne `PropositionBilanPanel` (`'use client'`) →
   `biology-library/courrier` → `biology-library/statuts` → `orientationEngine`
   + `corpusSyntheseV1` **le traverse par un module voisin** : crypto-browserify
   et `ORIENTATION_RULES_V1`, retenue par un `sha256(...)` de portée module,
   partent au chunk client du cockpit — depuis le 2026-08-18, et donc
   aujourd'hui en production. Vérifiée lien par lien. Conséquence pour ce lot :
   les 145 lignes neuves d'`orientationEngine.ts` partent au navigateur par ce
   trou. Élargir le garde le fera rougir immédiatement — c'est un lot, pas une
   ligne, et il ne se pose pas dans un diff qui expose une table clinique.

**ET UNE RECOPIE MANQUÉE, RETROUVÉE PAR LA REVUE.** « Rien ne s'écrit » avait
été corrigé en quatre endroits ; **le fragment de changelog avait survécu**.
C'est le défaut nommé par [[corriger-balayer-chapeau-et-copies]] : le paragraphe
corrigé ne suffit pas, il faut balayer les recopies.

## 8 quinquies. La SECONDE revue Copilot — celle du correctif, et elle mord aussi

La première revue portait sur le commit d'avant ; elle ne se relance pas toute
seule et son aperçu l'écrit (« Get a fresh assessment by requesting another
Copilot review »). Demandée, elle a rendu **trois constats de plus**, dont un
qui change le moteur.

1. **UNE ZONE NE LIT PAS UN NOMBRE — `lacuneDeFeuille` ne reflétait pas les
   préconditions réelles d'`evaluerZone`.** La condition finale tenait la mesure
   pour lisible dès qu'UN des trois champs existait (valeur, interprétation,
   plancher). Deux états passaient donc pour « lus et tranchés » quand le moteur
   n'avait rien pu décider :
   - **feuille SEULE sur un plancher INSUFFISANT** — recueil partiel, plancher
     servi, fermeture qui déborde la zone visée : `evaluerZone` rend `null` et
     le plancher non nul taisait la lacune. La ligne partait en `nonIndiquees`.
     **ATTEIGNABLE AUJOURD'HUI** : les trois portes `Q_GAS_01` de la table
     signée sont des feuilles seules, et un TFD à moitié rempli est courant ;
   - **bande non publiée sur recueil complet** — un total sans `interpretation`
     ne dit rien à une zone `couleur`. Non atteignable sur les porteurs de la
     table (leurs bandes couvrent l'échelle) ; la garde est écrite pour le jour
     où une bande change.
   Corrigé par `zoneDecidable`, miroir exact d'`evaluerZoneMesuree` : `plage`
   lit le nombre, `interpretation` lit le `label`, `couleur` lit la `color`.
   Indécidable ⇒ la cause se nomme par les comptes du recueil
   (`recueil_incomplet` / `completude_illisible` / `mesure_indisponible`).
   Trois cas directs, dont **celui du vrai négatif** — sur-signaler serait
   l'autre faute. Mutation : restaurer l'ancienne condition rougit les deux
   premiers, et eux seuls.
2. **LE COMPTE DE FICHIERS ÉTAIT FAUX — pour la deuxième fois.** Voir le § 6 :
   la source doit être le diff contre la base, pas l'état de l'arbre.
3. **LE CORPS DE LA PR ANNONÇAIT ENCORE « sept formes »** quand l'union en porte
   huit. Corrigé sur la PR : un enregistrement de revue qui décrit un contrat
   périmé est un enregistrement faux.

## 8 sexies. La TROISIÈME revue Copilot — une donnée clinique sous le mauvais dossier

1. **L'ÉTAT DU PANNEAU N'ÉTAIT PAS DATÉ DU DOSSIER, et le jeton n'y suffisait
   pas.** Le jeton écarte une réponse EN RETARD ; il ne dit rien du rendu qui
   suit un changement de `idPatient`. React rend d'abord avec la nouvelle prop
   et l'ANCIEN état — l'effet qui le vide ne tourne qu'après le commit. **Le
   temps d'une image, les indications du patient précédent se peignaient sous
   l'en-tête du nouveau.** Bref, mais c'est une donnée clinique servie sous le
   mauvais dossier. Corrigé DANS le composant (`{ pour, corps }`, rendu filtré
   sur `pour === idPatient`) plutôt que par une `key` au point de montage : la
   `key` corrigerait le seul appelant d'aujourd'hui, un état daté ne s'oublie
   pas. `chargement` étant en retard du même rendu, la garde de non-affichage
   couvre aussi « rien de CE dossier n'est encore arrivé ».
   **AUCUN BANC UNITAIRE NE VOIT CETTE IMAGE**, et c'est dit dans le composant
   plutôt que faussement gardé : `act()` fait tourner l'effet avant que le rendu
   intermédiaire soit observable, si bien que le défaut et son correctif rendent
   le même DOM au banc. Ce qui est éprouvé est le contrat voisin — après
   bascule, c'est le contenu du NOUVEAU dossier qui paraît, et la réponse en
   retard d'un autre dossier n'atteint jamais l'écran.
   **ET LA MUTATION A APPRIS QUELQUE CHOSE** : retirer le jeton ne rougissait
   RIEN, l'état daté écartant déjà tout ce qui vient d'un autre patient. Le
   jeton n'est pas mort pour autant — il décide encore au RETOUR sur le même
   dossier (A → B → A), où les deux réponses portent le même `idPatient` et où
   seule la plus récente doit paraître. Ce cas manquait ; il est écrit, et la
   mutation le rougit.
2. **LE COMPTE DE MUTATIONS ÉTAIT FAUX** — « dix » quand la liste en portait
   onze. Voir le § 7 : le total se lit sur la liste, jamais sur un résumé.

## 9. Problèmes ouverts

- **LE DRAPEAU N'EST PAS POSÉ, ET RIEN N'EST DONC À L'ÉCRAN.** Geste
  d'exploitation du cabinet. Ordre : code en ligne vérifié par **contenance**
  (`merge-base --is-ancestor`), `env-set`, **conteneurs recréés** — un `env-set`
  seul ne change rien tant que les conteneurs tournent. Et la sonde : verrou
  fermé la route rend `actif: false` sans journaliser d'accès, verrou ouvert
  elle journalise — c'est le comportement qui constate, pas `env`.
- **Ce que le praticien verra réellement reste à mesurer.** Cinq des sept lignes
  publiées passent par `Q_GAS_01`, deux s'ouvrent seules (âge, intolérances
  déclarées). Le handoff de [[D-236]] affirmait que `Q_GAS_01` « n'est pas au
  pack de base » ; le registre fonctionnel le donne pourtant dans
  `packsRecommandes` du socle. **Les deux ne parlent pas de la même chose** —
  doctrine contre composition réelle en base —, et **aucun des deux n'a été
  relu en production dans ce lot**. À constater par conteneur avant d'annoncer
  quoi que ce soit sur le rendement.
- **`catalogueConduitesV1` est dans l'état d'hier** : signée le 2026-09-17,
  **aucun consommateur**, et **absente de la matrice de consommation**. Rapporté,
  pas corrigé — ce n'est pas ce lot.
- **Le chantier 6** (porte biologique) reste devant et **périmera
  l'attestation**.
- **Dix-sept n-grammes du corpus antérieurs** subsistent au registre et à la
  surface.

## 10. Prochaine action exacte

1. **T3 complet**, exit lu dans le fichier redirigé — jamais dans la
   notification de tâche de fond, qui a menti deux fois le 2026-09-19.
2. Commit sur `wn-post-attestation-2026-09-19`, PR avec `--body-file`, CI par
   `node scripts/wn-attendre-ci.mjs <N>` en **un seul appel bloquant** (`0` est
   le seul code qui autorise à annoncer la PR prête).
3. **Lire la revue Copilot AUX TROIS EMPLACEMENTS** avant de merger :
   `gh api repos/{owner}/{repo}/pulls/<N>/comments`, `.reviews[].body`, et le
   bloc « Suppressed comments » du corps de revue. Trois verdicts, aucun
   commentaire sans l'un d'eux.
4. Merge `--squash` **avec `--subject`** — sans lui, le journal Git annoncerait
   le sujet du commit de tête.
5. **Poser le drapeau — autorisé par le responsable le 2026-09-19**
   (« pose le drapeau quand il le faut »), et « quand il le faut » veut dire
   APRÈS le merge et APRÈS avoir constaté le code en ligne. Ordre du § 9 :
   contenance (`merge-base --is-ancestor`), `env-set`, **conteneurs recréés**,
   puis **sonde de comportement** — jamais `env`.

## 11. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite — **ce
  lot n'en comporte aucune**.
- Aucun contenu clinique du corpus au dépôt : la carte affiche des
  **identifiants** de claim, jamais un verbatim ni une paraphrase.
- **Aucun seuil ni critère inventé** — le lot n'écrit aucune borne : il lit
  celles que la table signée porte déjà.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
