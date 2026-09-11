# Handoff — 2026-09-11 — Les trois champs de l'objectif arrivent remplis (D-167)

## Branche et état Git

`travail-suivant` à `e8076978`, identique à `origin/main`. **Aucune PR ouverte.**
Dix PR fusionnées depuis le handoff du 2026-09-10 1241 : #1000 (provenance —
migration seule), #1001 (cache webpack hors image), #1002 (documents patient),
#1003 (table des propositions — migration seule), #1004 (l'appel et sa garde),
#1005 (les trois champs remplis), #1006 (rang du tirage — migration seule),
#1007 (provenance constatée au serveur), #1008 (sources plus récentes signalées),
#1009 (côté patient).

`main` **local** reste derrière `origin` (behind 39) : détenu par le worktree
`courrier-corps-null`, verrouillé par une session Claude **toujours vivante**
(pid 91588, 7 j 15 h d'uptime). Rien n'a été forcé ; réconcilier est un geste
humain.

## Objectif actuel

Fermer `D-167` : que les trois champs de l'objectif négocié arrivent **remplis**
au praticien, et que ce qui s'affiche comme « repris mot pour mot » le soit
vraiment. **C'est fait, des deux côtés.**

## Décisions prises

- **`D-167` §11** — la priorité proposée par le modèle est **tirée puis
  enregistrée** (`propositions_priorite_ia`), avec son rang ; l'objectif retenu
  porte `priorite_source_rang`. Un tirage non enregistré n'est pas citable.
- **`D-167` §6, rectifié** — la provenance **se constate au serveur**
  (`lib/objectif/provenanceVerifiee.ts`), par comparaison du texte enregistré au
  texte source. Elle ne se déclare pas depuis le navigateur (`D-164`, F1 P1).
- **Deux amendements au registre** — §10 décrivait un mécanisme de garde que le
  code dément ; §13 entrait en conflit avec un garde-fou déjà en place. Amendés,
  pas suivis : le registre est ce qu'on relit six mois plus tard.
- **Adaptateur borné n°3** (`lib/objectif/matierePriorite.ts`) — deux clés
  extraites de `syntheseJson`, `axes_prioritaires` ne sort jamais. Garde de
  surface propre (14 bancs), parce que `IMPORTS_INTERDITS` de `G3` ne prouve
  rien ici.

## Fichiers modifiés

- **Trois migrations, appliquées et CONSTATÉES par conteneur** :
  `20260910210000_alliance_objectif_provenance_v1` (run `34530138340`),
  `20260911000500_alliance_proposition_priorite_ia_v1` (run `34538566736`),
  `20260911024500_alliance_objectif_priorite_rang_v1` (run `34568841548`).
- **`web/scripts/build.sh`** — `rm -rf .next/cache/webpack`. Hors chantier, et
  c'est ce qui a débloqué toute la production.
- **`lib/objectif/`** — `matierePriorite.ts`, `propositionPriorite.ts`,
  `provenanceVerifiee.ts`.
- **Routes** — `praticien/objectifs/proposition-priorite` (GET lit, POST
  produit), `praticien/propositions-objectif` (GET rend `pourquoiVide`),
  `portail/dossier` (sert `origineEnonce` sur fait complet seulement).
- **`DossierDeuxVoixView.tsx`** — « Ce que vous avez écrit le <date>, repris mot
  pour mot ».
- **Transparence** — `usage_ia@v2`, `donnees_confidentialite@v7` ;
  `DOSSIER_RGPD.md` §5/§6/§7 ; `docs/rgpd/DEMANDE_DPA_ANTHROPIC.md` (brouillon).

## Validations exécutées

- Suite complète : **518 fichiers, 7 334 bancs**, `tsc` et `eslint` propres ;
  T3 avant chaque PR de migration ; CI verte sur les dix PR.
- **Test de mutation sur chaque banc ajouté.** Il a mordu trois fois sur mes
  propres bancs : un pré-remplissage testé *après* l'arrivée de la matière (donc
  ne prouvant rien), et deux exigences de la route non couvertes.
- **Cinq gardes du dépôt m'ont attrapé** : un contrat de provenance affirmant
  l'inverse de l'arbitrage rendu, une table absente de `effacerDossier`, une
  borne dupliquée, un banc défendant une phrase fausse, `MATRICE_CONSOMMATION`
  dérivée.

## Problèmes ouverts

1. **La lettre de DPA n'est pas envoyée** — `docs/rgpd/DEMANDE_DPA_ANTHROPIC.md`,
   brouillon. Elle appartient au responsable ; le tableau de trace attend des
   dates **lues** dans le fil de mail, pas déclarées.
2. **Trois trous du §7 RGPD**, délibérément hors de la lettre : mécanisme de
   transfert invoqué, lieu réel de l'inférence, rétention et prompt caching.
3. **`main` local behind 39**, worktree verrouillé par une session vivante.
4. **Deux branches distantes à trancher** — `sauvegarde/runbook-scalingo-staging`
   (81 lignes uniques : l'état du staging au 2026-07-24, absent de `main`) et
   `copilot/fix-github-actions-job-yet-again` (contenu **absorbé** par `main`,
   mais « Copilot » n'a jamais été précisé).
5. **`D-049`** classé trois fois de plus cette nuit (WebKit iPhone 13, macOS) ;
   les mêmes bancs passent en ~230 ms sur Chromium, et le CI Linux est vert.

## Prochaine action exacte

Envoyer la lettre de DPA — c'est du courrier, pas du code. Rien d'autre n'attend
sur `D-167`.

## Interdits encore actifs

- Autorisation GitHub jusqu'au **2026-09-17**, **élargie le 2026-09-11** à
  `release-db` et aux migrations Scalingo — la migration partant toujours
  **seule** avant son code (`D-087`), relue, jouée en T3, puis **constatée par
  conteneur**. Le **force-push** n'a jamais été couvert.
- Restent gatés à chaque fois : **ce qui part vers un patient réel** (le code se
  livre, sa mise en service se demande), les arbitrages `D-xxx`, et **Copilot**,
  jamais précisé.
- Production : lecture seule par `scalingo run -d`, **par identifiant**
  (`PAT0xx`). Aucune identité réelle au dépôt : fixtures seules.
- Un numéro de décision ne se réserve pas : il s'acquiert **au merge**.
- `scripts/changelog-collate.mjs` **sans argument est destructeur**.
- `release-db` a **deux pièges** : un minuteur de 5 min avant toute approbation
  (le refus ressemble à une erreur de permission), et tout merge sur `main`
  pendant l'attente tue le run.
