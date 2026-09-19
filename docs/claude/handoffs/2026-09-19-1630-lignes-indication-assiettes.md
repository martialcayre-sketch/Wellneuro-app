# Handoff — 2026-09-19 — Les dix lignes d'indication d'assiette (D-235)

## 1. Branche et état Git

- Branche `wn-lignes-indication-assiettes-2026-09-19`, partie de `origin/main`.
  Worktree `phases-hash-2026-09-16`.
- **`D-233` et `D-234` ont été pris par des sessions voisines pendant le lot.**
  Le numéro retenu est `D-235`, et les quatre `[[D-233]]` écrits dans le code ont
  été corrigés avant le commit. **À revérifier au merge.**

## 2. Objectif de la session

Le **chantier 2** de `D-216` : écrire les lignes d'indication d'assiette, chaque
claim relu **sur pièce, source entière**. C'est le seul des cinq chantiers qui
demande du clinique plutôt que du mécanisme.

## 3. Ce que le lot livre

**Dix lignes — sept publiées, trois en brouillon — et AUCUNE n'est servie.**
`validationExterne` vaut `false`, `shaPerimetre` vaut `null`, le point de service
rend `[]`. Écrire les lignes est un geste d'outil ; les **attester** n'en est pas
un.

## 4. LA RELECTURE A RÉFUTÉ LA SURFACE SUR QUATRE POINTS

Neuf protocoles relus en production, texte intégral, le 2026-09-19 — 103 claims.
**C'est le résultat principal du lot**, et il a changé le lot lui-même.

1. **`WN-CL-0293-011` n'est PAS une conjonction.** La surface lisait « atteinte
   des DEUX voies monoaminergiques » ; le claim écrit « sérotoninergiques
   **et/ou** dopaminergiques », sur les axes `SE` et `DA` — non `DA` et `NA`.
   **Un arbitrage du responsable reposait sur cette prémisse** : passer
   `declencheur` au pluriel pour permettre un ET. Il a été **revisité et écarté**
   en séance. Aucune des dix lignes ne demande de conjonction, et le champ reste
   singulier.
2. **Le MFI-20 (`Q_SOM_07`) n'a pas de barème** — actif au catalogue, mais sa
   source déclare qu'il n'existe pas de score global. Cette quatrième entrée du
   même claim exigerait d'inventer le seuil que la source refuse (`DC-19`).
3. **La porte large de la psychobiotique n'existe pas — CINQUIÈME CONSTAT** de la
   famille du 2026-09-18. `symptomes_fonctionnels` ne porte qu'**une** option, la
   déglutition ; `WN-CL-0291-013` ne nomme aucun instrument. Aucune ligne, pas
   même en brouillon.
4. **Trois claims proposés fondent une porte AUTRE que celle de leur ligne.**
   Arbitrage : une ligne ne cite que les claims qui fondent **sa** porte.

## 5. Décisions prises

- **`D-235`**, sur **cinq arbitrages du responsable**, dont **deux revisités en
  cours de lot** sur constat de relecture (le pluriel, écarté ; la protéinée,
  maintenue publiée).
- **`claimsSecurite` entre sur la ligne** — `WN-CL-0288-013` porte l'indication
  de la protéinée **et** son exception parkinsonienne, `-014` la prolonge.
  L'union des **deux** catégories fait le périmètre, et un claim de sécurité
  retiré retire sa ligne du service.
- **Trois brouillons, trois motifs** : l'anti-inflammatoire préventive (une porte
  d'âge seule ouvrirait sur toute une classe d'âge), la méthylation (le claim dit
  « plus susceptibles de nécessiter », non « est indiquée »), l'antioxydante
  (granularité du drapeau d'antécédents).

## 6. Fichiers modifiés

**Neufs** — le fragment `changelog.d/` du jour · ce handoff.

**Modifiés** — `indicationsAssiettesV1.ts` (champ `claimsSecurite`,
`claimsDeLaLigne`, verrou et service sur les deux catégories, **dix lignes**) ·
son banc de garde · `docs/DECISIONS.md` · la surface de relecture ·
`FILE_ATTENTE.md`.

**NON touchés, et c'est mesuré** : `TABLE_EXIGE_PRESCRIPTIF`, les paires du
contrat SQL de fraîcheur, l'enrôlement dans `shaPerimetreLitteral.guard.test.ts`.
Le balayage reconnaît une table signée à son `claimsSource` — **vide** — et non à
ses lignes ; y toucher avant la signature ferait rougir à l'inverse.

## 7. Validations exécutées

- **T1** vert (407 tests, anti-secrets OK). **T2 `--fast`** vert : **584 fichiers,
  9789 tests**, exit lu **dans le fichier**, jamais dans la notification.
- **Banc de garde : 43 cas**, dont dix neufs sur l'état livré.
- **CINQ MUTATIONS, CINQ ROUGISSEMENTS DISTINCTS**, module restauré par `cp` et
  vérifié identique par `diff` : retirer la sécurité de l'union fait rougir trois
  cas et eux seuls ; changer `>` en `>=` sur la borne de 60 ans fait rougir le cas
  des opérateurs ; pointer une assiette d'observation fait rougir le cas d'axe.
- **Un trou de banc fermé** : la fixture portait un `as LigneIndicationAssiette`
  qui éteignait le contrôle de champs — ajouter `claimsSecurite` au type n'avait
  fait rougir ni `tsc` ni le banc. Le cast est retiré.

## 8. Problèmes ouverts

- **L'attestation reste entière devant le responsable** : relire les dix lignes,
  confirmer claim par claim ce que **chacun fonde**, puis poser
  `validationExterne`, `dateValidation` et le `shaPerimetre` **recopié à la main**.
  Le jour de la signature, trois enrôlements se font **en un seul geste** —
  `TABLE_EXIGE_PRESCRIPTIF`, les paires du contrat SQL, le banc du sha littéral.
- **Deux réserves à connaître avant de signer** : `WN-CL-0288-012` et `-014` sont
  `prescriptif = false` ; l'exception parkinsonienne est **désignée, pas
  appliquée** — aucun champ ne lit un traitement en cours.
- **`Q_GAS_01` n'est pas au pack de base** et cinq lignes en dépendent : elles ne
  s'ouvriront qu'au second tour. Une indication réputée large sera rare.
- **Chantiers 4 et 5** (familles d'équivalence, barème) restent ouverts et **ne
  bloquent pas** la signature.
- **Numéro `D-235` à vérifier au merge.**

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite.
- Aucun contenu clinique du corpus au dépôt tant que G6 est fermée — **une ligne
  désigne ses claims, elle ne les recopie jamais**.
- **Aucun seuil ni critère inventé** : une porte sans claim qui la fonde reste
  interdite, et aucun banc ne peut le dire — seule la relecture le voit.
- Une signature clinique ne se pose jamais par l'outil.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
