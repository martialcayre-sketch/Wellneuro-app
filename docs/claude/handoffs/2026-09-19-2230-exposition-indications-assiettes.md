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
dans l'une des deux copies*. Sept formes, toutes des faits sur le **dossier** :
instrument non passé, passé mais non coté, recueil incomplet, mesure
indisponible, anamnèse absente, âge inconnu, régime non déclaré.

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

**DIX-NEUF EN TOUT — HUIT NEUFS, ONZE MODIFIÉS**, énumérés depuis
`git status`, jamais de mémoire : une première rédaction annonçait « sept neufs,
huit modifiés », le même écart qu'au lot précédent.

**HUIT NEUFS** — `indicationsAssiettesService.ts` + son banc (**19 cas**) ·
`api/praticien/assiettes-indiquees/route.ts` + son banc (**11 cas**) ·
`AssiettesIndiqueesPanel.tsx` + son banc (**15 cas**) — **45 au total**, relus
après les correctifs de relecture · `changelog.d/…-exposition-indications-assiettes.md` ·
ce handoff.

**ONZE MODIFIÉS** — `orientationEngine.ts` (le vocabulaire de lacune, +145
lignes, **aucun chemin existant touché**) · `indicationsAssiettesV1.ts` (prose
périmée, §8) · `plates.ts` (la réserve d'`assiettesParIndication` est levée) ·
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
- **TROIS MUTATIONS, TROIS ROUGES CIBLÉS** — sauvegarde par `cp`, jamais
  `git checkout --`, et application vérifiée avant de conclure :
  1. faire diverger l'un des deux `cleClaim` ⇒ **8 cas rouges**, dont celui qui
     existe pour ça ;
  2. une anamnèse absente cessant d'être une lacune ⇒ **1 cas**, le bon ;
  3. retirer le verrou précoce de la route ⇒ **1 cas**, celui du journal d'accès.

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
5. **Ne pas poser le drapeau.** C'est un geste du responsable, dans l'ordre du
   § 9.

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
