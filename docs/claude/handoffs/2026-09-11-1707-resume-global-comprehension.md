# Handoff — 2026-09-11 — « Ce que j'ai compris » cesse d'arriver vide (D-168, D-169)

## Branche et état Git

`travail-suivant` à `04df7876`, identique à `origin/main`. **Aucune PR ouverte.**
Sept PR fusionnées depuis le handoff de 13 h 05 : #1010 (clôture de la nuit),
#1011 (table des tirages — migration seule), #1012 (provenance du texte publié —
migration seule), #1013 (adaptateur borné n°2), #1015 (l'appel et sa route),
#1016 (l'écran, le verrou, le retrait), #1017 (portail et registre).

**#1014 a été fermée sans merge** : branchée depuis le lot 3 au lieu de `main`,
elle portait le commit non squashé et GitHub n'a créé aucun run. Rouverte en
#1015. Le rebase aurait exigé un force-push, exclu.

`main` **local** reste derrière `origin` (behind 46), détenu par le worktree
`courrier-corps-null`, verrouillé par une session Claude **toujours vivante**
(pid 91588). Rien n'a été forcé.

## Objectif actuel

Que « Ce que j'ai compris de vous » cesse d'arriver vide, sans faire doublon avec
la reformulation de l'objectif. **C'est fait, et le doublon a été supprimé à la
racine plutôt que contourné.**

## Décisions prises

- **`D-168`** — l'appel **RELIE**, il ne reformule pas. La hiérarchie ne vient
  pas de lui : l'ordre des axes lui est **donné**, repris de celui qu'un
  praticien a validé. Six clauses le bornent — nature, hiérarchie, porte
  étroite, barre d'ouverture, verrou de publication, traçabilité et sa limite.
- **`D-169`** — la reformulation quitte l'**écran praticien seul**. La colonne
  reste, le portail continue d'afficher une reformulation existante, le contrat
  de la route ne change pas. Porte une **réserve** : si le résumé global était
  retiré, ce retrait devrait être réexaminé.
- **La barre d'ouverture n'invente aucun seuil** : la règle « deux rideaux, deux
  synthèses » se compte au sens de `D-158`, déjà écrit.
- **« Ordre validé » est exact, « ordre choisi » serait faux** — le praticien a
  validé la synthèse entière, l'éditeur ne lui permet pas de réordonner. Écrit
  dans le code : cela borne ce que la provenance peut affirmer.

## Fichiers modifiés

- **Deux migrations, appliquées et CONSTATÉES par conteneur.**
  `20260911140000_alliance_proposition_comprehension_ia_v1` (run `34598558264` —
  9 colonnes, 6 CHECK, FK RESTRICT, RLS deny-all, 0 ligne) et
  `20260911160000_alliance_comprehension_provenance_v1` (run `34602915814` —
  4 colonnes, 4 CHECK, 0 ligne portant une provenance sur 1 au total).
- **`lib/objectif/matiereComprehension.ts`** — adaptateur borné n°2 (+ sa garde
  de surface) et `constaterOuverture`.
- **`lib/objectif/propositionComprehension.ts`** — l'appel, sa consigne, sa
  version (`comprehension-v1`), `WN_MODELE_PROPOSITION_COMPREHENSION`.
- **`api/praticien/comprehension/proposition/route.ts`** — GET lit, POST produit.
- **`api/praticien/comprehension/route.ts`** — le verrou et la provenance.
- **`ComprehensionPanel.tsx`** — bouton, pré-remplissage, « une autre », verrou.
- **`ObjectifNegociePanel.tsx`** — le champ de reformulation retiré.
- **`DossierDeuxVoixView.tsx`** — la seconde voix remonte sous l'énoncé.
- **`prisma/checks/`** — deux contrats négatifs ; la liste blanche de
  `syntheses_comprehension` mise à jour **chez le contrat qui l'a créée**.

## Validations exécutées

- **522 fichiers, 7 444 bancs.** T1 vert sur chaque lot ; T3 avant chaque PR de
  migration ; CI verte sur les sept PR.
- **Trente-huit mutations jouées, trente-huit mutants tués.** Deux ont appris
  quelque chose : un faux survivant (l'échappement shell avait mangé la
  mutation, jamais appliquée) et un vrai — le banc du verrou ne prouvait le
  `trim` que du côté soumis, si bien qu'un tirage stocké avec un blanc de bord
  aurait laissé publier sa recopie exacte.
- Migrations et contrats joués contre une **base jetable** construite par
  `migrate deploy` ; contrôle de dérive schéma/migrations : aucune.
- **`D-049` classé neuf fois**, sur trois fichiers E2E, toujours avec le
  diagnostic du dépôt — navigation expirée, aucune requête de page émise. CI
  Linux vert à chaque fois.

## Problèmes ouverts

1. **La mise en service côté patient n'est pas demandée.** Le code est livré ;
   son allumage se demande.
2. **La branche « désaccords » n'est prouvée par aucune donnée réelle** — zéro
   désaccord en base. Un cas de contrat SQL et un banc unitaire en sont la seule
   preuve, et `D-168` le dit.
3. **La lettre de DPA n'est toujours pas envoyée**, et les trois trous du §7 RGPD
   restent ouverts (transfert, lieu d'inférence, rétention et prompt caching).
4. **`main` local behind 46**, worktree verrouillé par une session vivante.
5. **Deux branches distantes à trancher** — `sauvegarde/runbook-scalingo-staging`
   (81 lignes uniques, absentes de `main`) et
   `copilot/fix-github-actions-job-yet-again` (contenu absorbé, mais « Copilot »
   n'a jamais été précisé).
6. **Une erreur non capturée de Radix** (`BibliothequePanel`, jsdom) est apparue
   une fois en T2 : intermittente, non imputable — le fichier passe seul avec
   comme sans le diff, et le rejeu complet est net.

## Prochaine action exacte

Rien n'attend côté code. La mise en service du résumé global côté patient est un
arbitrage, pas un lot.

## Interdits encore actifs

- Autorisation GitHub jusqu'au **2026-09-17**, élargie le 2026-09-11 à
  `release-db` et aux migrations Scalingo — migration **seule** avant son code
  (`D-087`), relue, jouée en T3, puis **constatée par conteneur**. Le
  **force-push** n'a jamais été couvert.
- Restent gatés : **ce qui part vers un patient réel**, les arbitrages `D-xxx`,
  et **Copilot**, jamais précisé.
- Production : lecture seule par `scalingo run -d`, **par identifiant**.
  Aucune identité réelle au dépôt.
- `git checkout -b` **part de HEAD** : toujours nommer `origin/main`. Une PR
  branchée depuis le lot précédent naît en conflit, sans run — #1014.
- `release-db` : minuteur de 5 min avant approbation, et tout merge pendant
  l'attente tue le run.
- `scripts/changelog-collate.mjs` **sans argument est destructeur**.
