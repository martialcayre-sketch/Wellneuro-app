# Handoff — 2026-09-19 — L'attestation des indications d'assiette (D-236)

## 1. Branche et état Git

- Branche `wn-post-lignes-assiettes-2026-09-19`, partie de `origin/main` à
  `b5d427ae` (#1202, `D-235`). Worktree `phases-hash-2026-09-16`.
- **Numéro `D-236` à vérifier au merge** — `D-233` et `D-234` ont été pris par
  des sessions voisines pendant le lot précédent.

## 2. Objectif de la session

Poser l'attestation de `INDICATIONS_ASSIETTES_V1`, en posant au responsable
**toutes** les questions qu'elle exige.

## 3. Ce que le lot livre

**La table est SIGNÉE.** `validationExterne: true`, `dateValidation`
`2026-09-19T18:27:15.000Z`, **vingt claims** pour vingt-et-une désignations,
`shaPerimetre` en **littéral de 64 hex**. **Onze lignes : sept publiées et
servables, quatre en brouillon** — hachées et attestées, jamais servies.

## 4. LE FAIT QUI A CHANGÉ LE LOT

Interrogé sur les brouillons, le responsable a répondu que **ces assiettes se
proposent en fonction du RÉSULTAT BIOLOGIQUE**. Vérifié sur pièce :

- **Sept des douze assiettes ont un claim fondant une porte biologique** ; la
  détoxication a un claim déclarant qu'il n'en existe pas (`WN-CL-0287-010`).
- **Aucune porte biologique n'est écrivable** : `OrientationDeclencheur` n'a pas
  de variante, et `biology-library/resultats.ts` valide la FORME d'un résultat en
  refusant toute borne — son seul consommateur est la route de sauvegarde.
- Les quatre brouillons déclarent donc désormais que leur porte écrite est un
  **proxy d'anamnèse**, et un cas de banc l'exige sur CHAQUE ligne.

**ET L'OUTIL S'EST TROMPÉ, deux fois, sur la méthylation** : il a affirmé qu'elle
n'avait aucun claim biologique. Vrai de son protocole `WN-SRC-0286`, **faux du
corpus**. Le responsable l'a réfuté ; la recherche a rendu **66 claims**, dont
`WN-CL-0282-007` (prescriptif) et `WN-CL-0043-014` qui en porte la borne.
**Leçon : chercher un claim dans la seule source du sujet est une erreur de
méthode.**

## 5. Décisions prises

- **`D-236`**, sur **quatre arbitrages** du responsable : le motif des brouillons
  devient biologique ; l'oméga 3 reçoit une **onzième ligne en brouillon** ;
  `TABLE_EXIGE_PRESCRIPTIF` vaut **`false`** ; `WN-CL-0330-027` est **écarté** du
  périmètre (il fonde un mécanisme, pas l'indication — `DC-01`, `DC-27`).
- **Le chantier de la porte biologique s'ouvre APRÈS l'attestation**, qu'il
  périmera. Consigné en file d'attente.

## 6. Fichiers modifiés

**TREIZE fichiers, comptés sur le diff et non de mémoire. Deux CRÉÉS** — le
fragment `changelog.d/` du jour · ce handoff.

**Onze MODIFIÉS** — `indicationsAssiettesV1.ts` (métadonnée signée, motifs des
brouillons, onzième ligne) · son banc de garde ·
`claimsEpinglesFraicheur.guard.test.ts` · `shaPerimetreLitteral.guard.test.ts` ·
le contrat SQL de fraîcheur · son fichier négatif · `docs/FEATURE_FLAGS.md` ·
`docs/DECISIONS.md` · la surface de relecture · `FILE_ATTENTE.md` ·
`docs/claude/SESSION_LOG.md`.

## 7. Validations exécutées

- **T1** vert (407 tests, anti-secrets OK). **T3 COMPLET** joué — voir le
  commentaire de PR, rapporté tel quel, exit lu **dans le fichier**.
- **T3 a mordu, et c'était juste** : `verrousSignatureDocumentes.guard.test.ts`
  exige que `docs/FEATURE_FLAGS.md` dise l'état RÉEL des verrous. Signer sans
  mettre la doc à jour l'a fait rougir sur deux cas — exactement l'angle mort
  « un statut changé à un seul endroit ».
- **Banc de garde à 45 cas**, dont un neuf exigeant que les quatre brouillons
  déclarent leur motif biologique **ligne par ligne**, pas seulement au chapeau.
- **Contrôle G6** : un n-gramme introduit (recopie de `WN-CL-0282-007`),
  reformulé pour désigner. Dix-sept subsistent au registre et à la surface,
  **antérieurs** et signalés.

## 8. Problèmes ouverts

- **AUCUN MOTEUR NE CONSOMME CETTE TABLE.** Elle est signée et servable, son lot
  d'exposition reste devant. `lignesIndicationAssietteServables` n'a toujours
  aucun appelant de production.
- **Le chantier de la porte biologique** : variante de déclencheur, lecteur de
  résultat, plages fonctionnelles, relecture des bornes de sept sources. Il
  **périmera cette attestation**.
- **`Q_GAS_01` n'est pas au pack de base** : cinq lignes ne s'ouvriront qu'au
  second tour.
- **Chantiers 4 et 5** (familles d'équivalence, barème) restent ouverts.
- **Dix-sept n-grammes du corpus antérieurs à ce lot** subsistent au registre et
  à la surface — G6 est franchie ailleurs que dans ce diff.

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite.
- Aucun contenu clinique du corpus au dépôt tant que G6 est fermée.
- **Aucun seuil ni critère inventé** — et la porte biologique en est l'épreuve :
  les bornes existent dans les claims, elles ne s'écriront qu'en les citant.
- **Une signature clinique ne se pose jamais par l'outil** : celle-ci a été
  transcrite sur déclaration, jamais composée.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
