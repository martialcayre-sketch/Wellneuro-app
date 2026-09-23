# Handoff — 2026-09-22 — La Boussole et l'assiette cessent de s'exclure (D-243)

## 1. Branche et état Git

- Branche : `wn-lot04-boussole-depuis-assiette-2026-09-22`, **rebasée sur
  `origin/main` après le merge de `D-242`** (branche non publiée à ce moment-là,
  donc aucun force-push).
- **Le numéro a bougé deux fois** (écrit sous `D-242`, pris par LOT-03 au
  merge) : `D-243`, vingt-deux références renumérotées. Il se prend AU MERGE.
- Worktree : `.claude/worktrees/phases-hash-2026-09-16`.
- Aucune migration, aucun `schema.prisma`, aucun drapeau, **aucune empreinte
  persistée périmée**.

## 2. Objectif de la session

« Go lot 03 et lot 04 full auto pour cette nuit ». LOT-04 du cadrage
Boussole/Assiette, qui exécute `D-213` §12 : « la Boussole reste ATTEIGNABLE
depuis le protocole ».

## 3. Ce que le lot livre

Un protocole **V4 peut porter les deux** : l'assiette prescrite et la Boussole
de son aliment. Trois points, et un seul est un vrai changement de contrat.

1. `normalizeActions` n'accepte plus `foodCompassRef` sur le seul chemin V2 mais
   **aussi en V4** — c'était le seul blocage à l'écriture.
2. `buildPatientFoodCompassView` accepte V2 **ou** V4.
3. En V4, la référence **reste sur l'action** : le détour « démonter puis
   réinjecter » n'existe que pour V2.

## 4. LE VERROU ÉTAIT PLUS ÉTROIT QUE SON NOM

`D-240` §11 disait V2 et V4 « mutuellement exclusifs » ; mesuré, c'était **un
point d'écriture** (`normalizeActions`), la relecture acceptant déjà un V4
porteur de référence. Ce lot aligne l'écriture sur la lecture, sans élargir
celle-ci — un cas l'épingle.

## 5. Décisions prises

- **V4 seulement, et explicitement.** V1 et V3 gardent leur refus mot pour mot.
- **L'exclusivité était unilatérale** : V2 EXIGE au moins une référence, V4
  n'exige aucune assiette. Seule la moitié qui bloquait tombe.
- **Aucun chemin existant ne change** : un protocole qui ne porte que des
  aliments reste servi en V2.
- **Aucun champ neuf au contrat patient** : le nom de l'assiette atteint le
  patient comme depuis `D-240`, par le `title` de l'action que la garde de
  registre anxiogène relit.
- **La liaison de la référence au protocole source reste vérifiée** sur le
  chemin V4 : la route re-dérive la référence contre le brouillon actif et
  compare son `refHash` — ce que le constructeur V2 faisait par un autre terme.

## 6. Fichiers

**Domaine (3)**
- `web/src/lib/clinical-engine/protocolDraft.ts` — le refus lit la version, et
  la référence entre dans la reconstruction.
- `web/src/lib/food-compass/contextual.ts` — la vue patient accepte V4.
- `web/src/app/api/praticien/protocoles/versions/route.ts` — en V4, la référence
  reste sur l'action ; le chemin V2 n'est emprunté que s'il est encore le chemin.

**Bancs (2)**
- `web/src/lib/clinical-engine/boussoleEtAssiette.test.ts` — **créé**, 7 cas.
- `web/src/lib/food-compass/foodCompass.test.ts` — 1 cas ajouté (la vue patient
  accepte un V4), fixture rendue paramétrable en version.

**Documents** — `docs/DECISIONS.md` (D-243), `changelog.d/` (créé),
le cadrage, `docs/claude/SESSION_LOG.md`, ce handoff (créé).

## 7. Validations exécutées

- **T1** `cd web && npm run check` — `T1-EXIT=0`, lu dans le fichier redirigé.
- **T2** `npm run test:worktree -- --fast` depuis la racine — `T2-EXIT=0`,
  **593 fichiers, 9 963 cas, E2E joués**, lu dans le fichier redirigé et non
  dans la notification de tâche, qui rapporte le code du dernier `echo`.
- **Quatre mutations, quatre rouges** : refus redevenu inconditionnel, référence
  abandonnée par la liste blanche, refus V1/V3 levé, vue patient ramenée à V2
  seule. Sauvegarde par `cp`, mutation **vérifiée appliquée**, restauration par
  `cp`.

## 8. Ce que le lot a trouvé au passage

**Le piège de la liste blanche, une seconde fois** : `normalizeActions`
reconstruit chaque action ; un cas vérifie que la clé EST LÀ après
construction. **Une correction de ma prose** : `buildPatientFoodCompassView`
rend trois empreintes au patient, c'est la projection sûre en aval qui les
coupe — le banc le dit à l'endroit de l'assertion fautive.

## 8 bis. La revue — deux constats, deux retenus

(1) V4 laissait passer `foodCompassRef` sur une action non alimentaire, que la
relecture refuse : **un refus à l'écriture est un message, un refus à la
relecture est un protocole mort** — `normalizeFoodCompassRef` a désormais la
forme de `normalizePlateRef`. (2) Le chemin V4 de la route n'avait aucun cas ;
les deux posés ont révélé un terme que le moteur ignore. Détail aux réponses de
la PR #1213. **À retenir** : lever un verrou, c'est chercher les gardes
voisines qu'il rendait inutiles.

## 9. Problèmes ouverts

- **Le chemin complet n'est pas câblé** : rien ne RELIE l'assiette et sa
  Boussole à l'écran du patient (`boussoles` est un tableau de premier niveau
  du fil, aucune action patient ne porte de `foodRef`). Les relier rouvre
  `vuePatientSurLeFil`, seule description de ce que le patient reçoit (`D-200`).
  Ce lot rend la chose possible, il ne la câble pas.
- **Hérité** : le refus de version de la vue patient reste avalé par le
  `catch { return null; }` de `patientReference.ts` — une Boussole refusée
  disparaît en silence. Mérite son propre lot.

## 10. Prochaine action exacte

Lire la revue aux TROIS emplacements, puis `gh pr merge --squash --subject`
nommant D-243 (PR #1213).

## 11. Interdits encore actifs

- Aucun champ neuf au contrat patient sans décision propre.
- Aucune famille de substitution déclarée (`D-242`).
- Aucune signature clinique posée par l'outil.
- Aucun `contentHash`, aucune empreinte persistée touchée.
