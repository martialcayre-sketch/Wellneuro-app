# Handoff — Transport des compositions C4 (LOT-02)

- Date : 2026-08-05, 13:23
- Campagne : `docs/claude/campagnes/2026-08-04-reprise-chantiers-en-suspens/`
- Lot : `lots/LOT-02-transport-compositions-c4.md` — **livré** (capacité et mesure)
- Branche : `worktree-lot02-transport-compositions`
- Fragment de changelog : `changelog.d/2026-08-05-transport-compositions-c4.md`
- Aucune migration. Aucune écriture en base par ce lot.

## Ce que le lot livre, et ce qu'il ne livre pas

**Il livre** le chemin d'écriture des compositions (`POST
/api/internal/supplements/compositions`, rejoué d'une branche de fin juillet) et le
producteur qui l'alimente (`tools/supplements/compositions/transporter.mjs`, neuf),
plus la mesure chiffrée que les critères de fin exigeaient.

**Il ne charge rien.** Les 138 728 fiches restent des coquilles jusqu'à ce qu'un
opérateur lance l'envoi. C'est délibéré : charger est une écriture en base de
production, donc un geste distinct, sur le modèle de `release-db`.

## La mesure, sur les 284 Mo réels

| | |
|---|---|
| Fiches vues | 140 148 (la taille exacte du catalogue) |
| Passeraient de coquille à composition connue | **138 728 (99,0 %)** |
| Lignes | 575 769, dont 545 900 résolues (94,8 %) |
| Libellés **inconnus** | **0** — le non-résolu est de l'ambiguïté |
| Doublons intra-fiche | 10 219, dont **7 307 identiques** et **2 912 divergents** |
| Lots | 278 |

## Les six choses à savoir avant de toucher à ce code

1. **Le manque n'était pas les 526 lignes sauvées.** Elles compilaient et
   respectaient le contrat — mais **rien ne POSTait vers elles**. `projeter.mjs`
   fait toute la résolution et annonce lui-même « Aucune écriture ». Les merger
   seules aurait rempli zéro fiche. Toute reprise de ce dossier doit vérifier
   qu'un **producteur** existe, pas seulement un consommateur.
2. **Un doublon divergent reste au dénominateur, un doublon identique en sort.**
   La base ne peut pas stocker deux lignes de même ingrédient et même forme — la
   seconde est écartée, ce n'est pas un choix. Ce qui se décide est la complétude :
   un doublon identique ne perd rien, un doublon divergent perd une dose qui ne
   reviendra jamais, et la fiche doit rester `partielle` plutôt que de servir
   « Compatible » sur une quantité sous-évaluée. **2 912 cas divergents** sur le
   corpus : ce n'est pas un cas limite.
3. **Le rejeu répare le dénominateur, pas les lignes.** `compositionSourceLignes`
   est une colonne scalaire, sa correction ne viole aucun append-only ; les lignes
   de composition, elles, sont figées. Un lot transporté avec un mauvais
   dénominateur se rattrape ; un lot transporté avec de mauvaises lignes, non.
4. **La recherche du produit reprend LES DEUX conditions du catalogue** — pointeur
   de version courante **et** `statutFiche` non `inactive`. Une seule des deux
   suffisait à écrire sur une fiche que personne ne sert : succès compté, fiche
   restée coquille. Un banc lit les deux fichiers et rougit s'ils divergent.
5. **`--dry-run` est le défaut, et c'est prouvé structurellement** — un client HTTP
   factice échoue si on l'appelle. L'envoi exige `--envoyer`, le secret, **et** que
   l'hôte de `--url` concorde avec `SUPPLEMENTS_TRANSPORT_HOTE`.
6. **Le banc du transporteur est câblé aux deux endroits** (`compositions-check` et
   `ci.yml`), et un test garde la **chaîne** (`check` appelle `compositions-check`),
   pas seulement la feuille. Il ne l'était nulle part au premier jet, et ses gardes
   étaient donc inertes.

## Ce qui reste ouvert, nommé et non corrigé

- **1 420 fiches ne sont pas transportées** : elles ont des lignes source mais
  aucune résolue. Leur `compositionSourceLignes` reste nul, donc complétude
  `absente` et écran « Composition inconnue ». Aucun écran ne ment — mais on sait
  quelque chose qu'on ne dit pas.
- **La garde de parité du dépôt ne couvre pas cette étape CI** : elle ne compare
  que les étapes antérieures à `setup-node`. Le câblage est gardé par un test
  dédié ; déplacer l'étape la ferait entrer dans la garde générale.
- **La garde deux clés est un cran plus faible que son modèle** tant que les deux
  vivent au même endroit : ici l'hôte est dans l'environnement, à côté du secret,
  ce qui la rapproche de `--base`/`MIGRATE_DATABASE_URL` sans l'égaler.

## Le geste qui reste, et il n'est pas fait

**Charger les compositions en production.** Ce n'est pas une tâche en attente de
l'assistant : c'est une décision. Quand elle sera prise :

```bash
export SUPPLEMENTS_INTERNAL_SECRET=…
export SUPPLEMENTS_TRANSPORT_HOTE=<hôte attendu>
node tools/supplements/compositions/transporter.mjs --envoyer --url https://<hôte>
```

Puis vérifier en base : combien de produits portent une composition, et combien de
fiches sont passées de `absente` à `integre` ou `partielle`.

## Validation au moment du handoff

- **T1 verte**, rejouée après chaque passe, y compris après les écrits de clôture.
- **T2 n'a pas rendu de verdict exploitable sur ce Mac.** Deux passes rouges, sur des
  écrans qu'aucun fichier du diff ne touche : une autre session exécutait Playwright en
  parallèle depuis `lot-a-dedup-assignations`, et les E2E réinitialisent le patient
  fictif dans la base pointée par `DATABASE_URL`, partagée entre worktrees. Deux runs
  simultanés s'effacent leurs fixtures — c'est le cas que `CLAUDE.md` interdit, et sa
  signature est visible dans la sortie : le même test passe sur un projet et échoue sur
  l'autre au sein d'une même passe. **Le verdict de référence est donc celui du CI**,
  qui provisionne sa propre base. Ne pas relire les deux logs rouges comme une
  régression du lot ; ne pas non plus les relire comme une preuve d'innocence.
- **36 tests** sur le transporteur, **plus** `compositions.test.ts` et
  `route.test.ts` créés de zéro — le chemin d'écriture n'en avait aucun.
- **Deux revues adversariales, deux NO-GO**, toutes deux traitées. La seconde a
  trouvé qu'un correctif de la première inversait le sens d'un signal clinique.
- **Chaque correctif falsifié** : cassé, banc rouge, remis, fichier identique.
  Trois tests se sont révélés verts pour une mauvaise raison au premier jet — les
  trois sont signalés dans les comptes rendus plutôt que masqués.
