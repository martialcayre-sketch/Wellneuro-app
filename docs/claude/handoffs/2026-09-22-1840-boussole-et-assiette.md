# Handoff — 2026-09-22 — La Boussole et l'assiette cessent de s'exclure (D-243)

## 1. Branche et état Git

- Branche : `wn-lot04-boussole-depuis-assiette-2026-09-22`, **rebasée sur
  `origin/main` après le merge de `D-242`** (branche non publiée à ce moment-là,
  donc aucun force-push).
- **Le numéro a bougé deux fois.** Ce lot a été écrit sous `D-242`. Une session
  voisine a mergé `D-241` (session portail à 30 jours), puis LOT-03 a pris
  `D-242` au merge : ce lot est donc `D-243`. Vingt-deux références renumérotées
  — code, registre, handoff. Le numéro se prend AU MERGE, et deux lots en vol le
  même jour suffisent à le déplacer deux fois.
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

`D-240` §11 l'a décrit comme « les contrats V2 et V4 sont mutuellement
exclusifs ». Mesuré, il tenait en **un point d'écriture** : `normalizeActions`
refusait TOUT `foodCompassRef` — **la seule des quatre gardes voisines à ignorer
le paramètre `version` pourtant en portée**. La RELECTURE, elle, acceptait déjà
un V4 porteur de référence (`assertProtocolDraftC5Structure` ne nomme que V1 et
V2). **Ce lot aligne l'écriture sur ce que la lecture tolérait** ; il n'élargit
pas la lecture, et un cas l'épingle pour qu'une révision ne « resserre » pas les
deux d'un coup en croyant corriger une asymétrie.

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

**LE PIÈGE DE LA LISTE BLANCHE, RENCONTRÉ UNE SECONDE FOIS.**
`normalizeActions` RECONSTRUIT chaque action : lever le refus sans ajouter le
champ à la reconstruction aurait donné un système qui compile, des bancs verts,
et une référence qui **disparaît à l'enregistrement**. Mot pour mot le piège que
`D-240` a nommé pour l'assiette. Un cas vérifie que la clé EST LÀ après
construction, pas seulement que la construction passe.

**UNE CORRECTION DE MA PROPRE PROSE.** Une première rédaction du banc affirmait
que « le patient ne reçoit rien de la référence ». C'est faux de
`buildPatientFoodCompassView`, qui rend TROIS empreintes — `protocolInputHash`,
`actionRefHash`, `inputHash`. C'est la projection SÛRE, en aval, qui les coupe.
Le banc le dit désormais à l'endroit exact où l'assertion fautive se trouvait.

## 8 bis. La revue — deux constats, deux retenus

**LE PREMIER EST L'ASYMÉTRIE DE CE LOT, REJOUÉE D'UN CRAN.** En ouvrant V4 à
`foodCompassRef`, je ne contrôlais pas le TYPE d'action. La relecture, elle,
refuse une référence C5 sur une action non alimentaire : on pouvait donc
persister une version que plus personne ne savait relire. **Un refus à
l'écriture est un message au praticien ; un refus à la relecture est un
protocole mort.** Les deux autres chemins portaient déjà ce terme — c'était le
seul des trois à ne pas l'avoir. `normalizeFoodCompassRef` a maintenant la même
forme que `normalizePlateRef`.

**LE SECOND EST UN DÉFAUT DE JOINTURE.** Le chemin V4 de la ROUTE n'avait aucun
cas — le banc éprouvait le moteur et la vue patient, jamais l'écriture réelle.
Deux cas sont posés, et le premier a d'abord échoué en 400 sur un terme que le
moteur ignore (« une référence C5 exige un protocole source actif ») : c'est
précisément ce qu'un banc de moteur ne peut pas voir.

**À retenir** : quand un lot lève un verrou, chercher les gardes VOISINES que ce
verrou rendait inutiles. Ici le contrôle de version masquait le contrôle de
type ; en levant l'un j'ai découvert que l'autre n'existait pas sur ce chemin.

## 9. Problèmes ouverts

**LE CHEMIN COMPLET N'EST PAS CÂBLÉ, et ce lot ne le prétend pas.** Le patient
voit l'assiette par le titre de son action, et sa Boussole dans une section
séparée : **rien ne RELIE les deux à l'écran**. `boussoles` est un tableau de
premier niveau du fil patient, et aucune action patient ne porte de `foodRef`.
Les relier demanderait de rouvrir `vuePatientSurLeFil`, dont le module dit être
la SEULE description de ce que le patient reçoit — et une seconde description a
déjà coûté des mois de champ mort à ce dépôt (`D-200`). Ce lot rend la chose
POSSIBLE ; il ne la câble pas.

**Hérité, non traité** : le refus de version de la vue patient reste AVALÉ par
le `catch { return null; }` de `patientReference.ts` — une Boussole refusée
disparaît en silence au lieu d'échouer. Ce lot en réduit la portée sans changer
ce comportement, qui mériterait son propre lot.

## 10. Prochaine action exacte

T2 depuis la racine, sortie redirigée puis relue ; PR `--base main` avec
`--body-file` ; `node scripts/wn-attendre-ci.mjs <N>` **depuis la racine** ;
lire la revue aux TROIS emplacements ; `gh pr merge --squash --subject` nommant
D-243.

## 11. Interdits encore actifs

- Aucun champ neuf au contrat patient sans décision propre.
- Aucune famille de substitution déclarée (`D-242`).
- Aucune signature clinique posée par l'outil.
- Aucun `contentHash`, aucune empreinte persistée touchée.
