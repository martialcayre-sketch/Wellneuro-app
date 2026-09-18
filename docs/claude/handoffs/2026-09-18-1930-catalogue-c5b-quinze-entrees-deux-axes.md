# Handoff — 2026-09-18 — Le catalogue C5B passe à quinze entrées sur deux axes (D-230)

## 1. Branche et état Git

- Branche `wn-catalogue-c5b-douze-assiettes-2026-09-18`, partie de `origin/main`
  à `2a34fd4a` (#1190, `D-229`, mergée juste avant). Worktree
  `phases-hash-2026-09-16`, propre avant le lot.
- Lot d'une seule finalité : le lot que `D-229` §6 a routé le jour même.

## 2. Objectif de la session

Lever le mur du `plateCode` : le catalogue C5B portait **trois** entrées et
**aucune** des douze assiettes du corpus, donc aucune ligne d'indication ne
pouvait être signée. Les douze entrent — **et ce qui protège la liste
d'observation du praticien entre avec elles**, dans le même diff, parce que
c'était l'arbitrage.

## 3. Décisions prises

- **`D-230`** — quinze entrées, deux axes, deux points de service.
- **`axe` vit sur l'entrée, et le filtre est un POINT DE SORTIE.** Le champ seul
  se contourne par oubli : il suffit d'un second écran qui mappe la constante.
  Patron de `lignesIndicationAssietteServables` (`D-225`). **Écarté** : filtrer
  au seul point de rendu.
- **`sourceProtocole` rend l'axe VÉRIFIABLE** au lieu de déclaratif : le banc le
  confronte au registre des sources du dépôt, et refuserait une assiette
  d'indication adossée à une fiche patient (`D-216`).
- **`catalogVersion` NE CHANGE PAS, et `contentHash` non plus** : le catalogue
  s'ajoute, il ne se réécrit pas. Les deux champs neufs sont **hors** de
  `contentHash` — les y mettre aurait périmé toutes les références d'assiette
  déjà consignées en production.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

- **Ferme** le blocage de `D-229` §6 : le septième terme du verrou est
  satisfaisable, les lignes sont écrivables dès que leurs portes le sont.
- **Ferme** le défaut que la surface nommait depuis le 2026-09-16 : l'arbitrage
  « ne pas fondre les deux axes » est désormais porté par du code, plus par une
  phrase.
- **N'atteint pas** : aucune ligne d'indication n'est écrite, la table reste
  **VIDE** et son verrou **ÉTEINT**. Aucune signature, aucun drapeau, aucune
  migration. **Ce que le praticien voit ne change pas.**
- **N'atteint pas** : `assiettesParIndication` **n'a aucun appelant** — son
  consommateur est le lot d'exposition. Si ce lot ne vient pas, elle se supprime.

## 5. Fichiers modifiés

**Neufs** — `web/src/lib/food-compass/plates.guard.test.ts` (12 cas) · le
fragment `changelog.d/` du jour · ce handoff.

**Modifiés** — `plates.ts` (les douze entrées, deux champs, deux points de
service, hash de catalogue `7f8440be…` → `2a2742ac…`) · `plates.test.ts` (les
quinze codes, dans l'ordre) · `PractitionerFoodObservationPanel.tsx` (la liste
passe par le point de service) · son banc (un cas de câblage neuf) ·
`indicationsAssiettesV1.ts` (deux blocs de prose périmés) · `docs/DECISIONS.md` ·
la surface de relecture · `FILE_ATTENTE.md` · `docs/claude/SESSION_LOG.md`.

## 6. Validations exécutées

- **Empreintes CALCULÉES par les fonctions du dépôt**, jamais recopiées à la
  main : un banc jetable a produit les douze blocs et le hash de catalogue, puis
  a été supprimé dans le même lot.
- **T1** vert (404 tests, anti-secrets OK).
- **Bancs du périmètre** : 50 fichiers, 916 tests — `food-compass`,
  `food-observation`, `clinical`, route boussole, observatoire.
- **Le banc de câblage MUTÉ** (sauvegarde par `cp`, restauration vérifiée par
  `diff`) : remettre le catalogue entier dans la liste du praticien le fait
  rougir **seul**. Les autres cas du fichier choisissent `ASSIETTE_SOIR_LEGER`,
  présente dans les deux listes — ils seraient restés verts.
- **Le prédicat de recevabilité d'une source est exercé sur un CAS FAUX** : les
  douze sources réelles étant toutes recevables, le balayage seul resterait vert
  quoi qu'on fasse à son corps. Le cas joue une **fiche patient**
  (`WN-SRC-0296`), le piège que `D-216` nomme, et un identifiant hors registre.
- **T2 `--fast`** : **`T2-EXIT=0`**, lu dans le fichier. Séquence rapide verte en
  **3 min 27 s** — 582 fichiers, **9 743 tests unitaires**, **contrats SQL joués
  24 s**, dérive schéma↔migrations, build, **205 E2E** Chromium **et** WebKit.
  **Aucune signature `D-049`.** Rejoué une seconde fois après l'ajout de la
  contre-épreuve de source, pour que le vert porte sur l'état définitif.

## 7. Problèmes ouverts

- **Deux dettes de `D-229` restent ouvertes** : le déclencheur d'âge (chantier 3)
  et le régime alimentaire comme drapeau d'anamnèse. La méthylation dépend des
  deux.
- **`assiettesParIndication` sans appelant** — à supprimer si le lot d'exposition
  ne vient pas. Le dépôt a déjà supprimé une fonction de ce profil.
- **Le hash de catalogue est AFFICHÉ au praticien**
  (`PractitionerFoodCompassObservatory`) : il change visiblement. Aucune baseline
  visuelle ne capture cet onglet — vérifié, les quatre portent sur le cockpit,
  le tiroir besoins, la trajectoire et la connexion portail.
- **Numéro `D-230` à vérifier au merge** — vérifié libre à l'écriture (`main` à
  `D-229`, et les deux PR ouvertes n'en prennent aucun).

## 8. Prochaine action exacte

1. Ouvrir la PR, **lire la revue Copilot aux TROIS emplacements avant de
   merger** — inline, `.reviews[].body`, et le bloc « Suppressed comments » —
   puis merger avec `--subject` portant le bon `D-NNN`.
2. Ensuite le **chantier 3** : le déclencheur d'âge et la revisite de `DC-43`,
   avec la correction du commentaire d'`anamnese.ts` **dans le même lot**
   (`D-216` l'exige, sans quoi le dépôt se contredit).
3. Puis la dette du drapeau de régime, et seulement après les lignes
   d'indication elles-mêmes.

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite.
- Aucun contenu clinique du corpus au dépôt tant que G6 est fermée — le
  catalogue **désigne** ses protocoles, il ne recopie aucun claim, et aucune
  composition d'assiette n'est inventée.
- Une signature clinique ne se pose jamais par l'outil.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
