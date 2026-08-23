# LOT-06 — la politique de résolution ne compare rien, et la descente DC-29 n'a rien rendu

- Date : 2026-08-24
- Campagne : `2026-08-18-doctrine-executable`, LOT-06 (V1 achevé)
- Décision : `D-103`
- Branche : `doctrine/lot06-conflit-sources`

## Ce qui a été mesuré avant de décider

Six lectures de production (conteneurs one-off `6772`, `2884`, `8077`, `9602`,
`7042`, `5301`, `4050`, `7801`, `9767`, `919`, `5934` — lecture seule, agrégats
sans identité). **La fiche du lot était fausse sur son postulat central.**

Elle annonçait « trois des quatre axes de `DC-54` sont mécanisables ». Sur les
8 224 claims `VALIDE` :

- `niveau_preuve` : **45 claims (0,55 %)**, **32 valeurs libres** — « B »,
  « AE », « élevé », « Niveau 1 / Niveau 2 », « evidence based », « non
  consensuel », « bon niveau de preuve »… aucun vocabulaire fermé, aucune
  hiérarchie publiée ;
- `classe_autorite` : **154 claims (1,87 %)**, **73 valeurs libres** — « EFSA »,
  « OMS », « HAS 2012 » à côté de « Pierre Deniker », « Thurin J.M. 2005 »,
  « Nadine Attal, directrice du Centre d'évaluation… » ;
- **un seul claim sur 8 224 porte les deux** ;
- `valide_at` est peuplé partout — et c'est la date de **validation praticien**,
  onze jours de juillet-août 2026, dans l'ordre de l'ingestion.

**Aucun axe n'est comparable.** Ce n'est pas que l'ordre manque : la donnée
manque.

## Ce que le lot livre

Trois modules neufs, aucune migration, aucun drapeau neuf.

- `politiqueResolutionConflit.ts` — la politique `DC-54`, déterministe et
  versionnée. Elle **déclare** ses quatre axes non comparés, chacun avec son
  motif mesuré, assemble ce motif en une phrase servie au praticien, et conclut
  à l'escalade. Un banc épingle qu'aucun axe n'est `comparable` : le jour où
  l'un le devient, il rougit et force à écrire la branche de comparaison.
- `conflitsSourcesV1.ts` — le registre des conflits **déclarés**, patron
  `contradictionsV1.ts` : un conflit publié, deux écartés avec motif, verrou de
  signature, `claimsSource`, SHA de périmètre.
- `conflitsSourcesEngine.ts` — le producteur. Premier producteur
  d'`escaladee_praticien` du dépôt : `contradictionsEngine.ts:228` posait
  `ouverte` en dur faute de politique pour conclure autrement.

Branchement : `contradictionsService.contradictionsPourPatient` prend un second
paramètre `claimsCites` (défaut vide) ; la route cockpit le remplit depuis
`claimsCitesParLaPropositionBilan`, **et seulement si le registre est signé** —
verrou fermé, aucune requête de plus qu'avant.

## Le conflit déclaré était déjà vécu dans le dépôt

`CS-BIO-01` oppose `WN-CL-0312-018` (« bilan biologique nutritionnel,
fonctionnel et systémique **une fois par an** ») à `WN-CL-0387-013` (« le bilan
biologique complet **n'est pas à réaliser systématiquement** chez toute personne
quel que soit l'âge »).

Ce n'est pas un conflit fabriqué pour le lot :
`indicationsBiologieV1.ts:319-323` fonde la répétition annuelle
(`delaiJours: 365`) sur le premier, et le commentaire de `:327` invoque le
second pour justifier qu'un panel d'approfondissement n'en ait pas. **Les deux
claims sont employés à sens opposés dans un même fichier signé.**

Le piège de l'axe « date » se voit sur ce couple : `WN-CL-0387-013` est validé
le 2026-08-03, `WN-CL-0312-018` le 2026-07-29. Une politique qui comparerait les
dates trancherait une question de preuve par l'ordre d'ingestion.

## `DC-29` — la descente a eu lieu, elle n'a rien rendu

Sur 8 224 claims actifs : « sources indépendantes » → **0**, « triangulation »
→ **0**, « convergen\* / faisceau » → 6, « méthodolog\* » → 3, « niveau de
preuve » → 7, « contradict\* » → 1, « discordan\* » → 2. Les dix-neuf candidats
relus un par un sont **tous des claims de contenu** — le faisceau de la
récompense, l'assiette oméga 3 dans la dépression majeure. Aucun claim de
méthode : le corpus est un corpus de neuronutrition, pas d'épistémologie.

La forme `CONVERGENCE` **reste vide**, état légitime, et
`conflitsSourcesV1.guard.test.ts` refuse désormais toute règle qui la porterait.
Sans ce banc, une telle règle serait ignorée en silence par
`contradictionsEngine.ts:188-192` — verte, muette et fausse.

## Deux choses à savoir avant de reprendre

**La garde « aucun champ de certitude » est un TYPE, pas un banc.** Un
`fiabiliteRelative` posé sur la forme `CONFLIT_SOURCES` laisse
`vitest run contradictionFinding.guard.test.ts` **au vert** : l'échec est
`contradictionFinding.guard.test.ts(81,11)` au `tsc`. Vu rouge le 2026-08-24, et
il faut le savoir — conclure « banc vert donc garde tenue » serait faux.

**Un verrou de signature exporté par le module qu'il garde n'est pas
éprouvable.** Premier écrit : `registreConflitsSourcesSigne()` vivait dans
`conflitsSourcesV1.ts`. Un banc qui remplace la métadonnée par simulation ne
change alors rien à ce que lit la fonction — même unité de chargement. Le verrou
est allé rejoindre `tableSignee()` dans `contradictionsService.ts`, d'où il se
ferme et s'ouvre sous banc.

## Deux défauts d'écran, trouvés en relisant le rendu avant de conclure

Le constat traverse `contradictionsPourPatient` → route cockpit →
`ClinicalRuntimeSection` → `MissingDataPanel`. Le chemin existait ; il était
écrit pour une seule forme.

- **L'intitulé était « Contradiction entre instruments » pour les trois
  formes.** Sur un conflit qui oppose deux claims et ne cite aucune passation,
  il envoyait le praticien chercher deux questionnaires qui n'existent pas. Le
  service avait déjà tiré cette conclusion pour la synthèse
  (`INTITULE_PAR_FORME`) ; l'écran ne pouvait pas la tirer, faute de connaître
  la forme. `ContradictionAffichee` porte désormais `forme`.
- **Le panneau ne disait l'état de résolution que s'il valait `ouverte`.** Un
  constat `escaladee_praticien` serait apparu **sans son état et sans son
  motif** — c'est-à-dire sans ce que la politique a renoncé à faire, ce que
  `DC-55` demande précisément de rendre visible. Le motif est maintenant rendu
  sous « Pourquoi la machine ne tranche pas ».

Aucun des deux ne se voyait côté serveur : les bancs de moteur et de service
étaient verts pendant que l'écran aurait menti.

## Prochaine action

**Signer le registre** — arbitrage du 2026-08-24 : livrer non signé, signer
après `wn-reviewer` et la passe Codex. Empreinte à figer dans `shaPerimetre` :
`ea18140366c114d6a51d19f82ecb082c98dab10b07b47effd527e1430fd581e2` (à
recalculer si le registre bouge d'un caractère — il a déjà changé une fois dans
ce lot, sur la correction d'élision ci-dessous).

**Trois autres gardes à découverte automatique ont mordu**, et c'est le
mécanisme qui fonctionne : le banc de fraîcheur des claims a exigé l'entrée des
deux claims au contrat SQL et à son négatif ; `verrousSignatureDocumentes` a
exigé la ligne du registre dans `docs/FEATURE_FLAGS.md` ; la matrice de
consommation a exigé sa régénération (la table d'indications biologiques gagne
une troisième surface indirecte, par la route cockpit).

**Un défaut de composition trouvé en relisant la phrase servie** : les positions
se lisant à la suite de « soutient que », une position commençant par une
voyelle donnait « soutient que un bilan ». Le connecteur est figé dans le
moteur — c'est donc à la position de commencer par une consonne, et un banc
l'épingle désormais avec la capitale initiale et la ponctuation finale.

Ce que la signature allume, **sans drapeau intermédiaire** :
`WN_ENABLE_CONTRADICTIONS_NNPP2=1` et `WN_CB_PROPOSITION=true` sont déjà posés
en production. Le constat apparaîtra sur tout dossier dont la proposition de
bilan cite `WN-CL-0312-018` — les quatre règles de répétition annuelle le
citent. Il escalade, il ne retire aucun panel.

## Dettes nommées, à ne pas redécouvrir

- **`DC-54` et `DC-55` ne basculent pas** : mécanisme complet, registre non
  signé. Même régime que `DC-42` au LOT-05.
- **L'escalade n'atteint ni l'extinction ni les préconditions T0.** Un constat
  escaladé reste « ouvert » et interdirait l'extinction partout où il serait
  passé à `contradictionEstOuverte` ; le branchement s'arrête au cockpit, et
  `preconditionsT0Prisma` reçoit `claimsCites` vide. Effet clinique distinct.
- **« Impact clinique significatif » n'est pas mécanisé** : tout conflit déclaré
  escalade, la sélection se fait à la curation.
- **`CS-MAG-01` attend son épinglage.** Le conflit le plus frontal du corpus —
  `WN-CL-0032-018` (« les médecins devraient prescrire du magnésium pour la
  dépression résistante sans plus attendre », prescriptif) contre
  `WN-CL-0362-014` (« dans la dépression, l'inositol et le magnésium sont
  inefficaces ») — est écarté parce qu'**aucun des deux claims n'est épinglé par
  une table signée**. Deux voisins portent le même désaccord et le seraient plus
  vite : `WN-CL-0327-002` et `WN-CL-0018-013`.
- **La phrase d'un conflit ne tient pas dans un point de vigilance.** Mesuré :
  la description composée de `CS-BIO-01` fait 569 caractères, et les deux lignes
  que `lignesDeVigilance` en tirerait feraient **768 et 607**, pour un plafond
  de **500** (`LONGUEUR_MAX_POINT`). Sans effet aujourd'hui — les conflits
  n'atteignent que le cockpit, qui ne plafonne rien. Le jour où un conflit
  alimentera la **synthèse**, l'enregistrement d'un brouillon praticien serait
  refusé avec un message qui ne nomme pas la cause : c'est le précédent exact de
  C-STR (730 caractères, scindée en 411 + 326). Il faudra **scinder par
  position**, pas raccourcir le texte curé.
- **Dérive documentaire constatée hors périmètre** : l'en-tête de
  `safetyEffetIndesirableV1.ts:70` écrit que « le drapeau `WN_EI_INTERRUPTION`
  est absent de la production ». Il y vaut `1` depuis le LOT-05 — c'est le geste
  de CAPTURE prévu par `D-101`, et l'inhibition reste fermée faute de signature.
  Le mécanisme est correct, la phrase est périmée. Fichier clinique, correction
  hors de ce lot.
