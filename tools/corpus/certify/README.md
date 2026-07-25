# Banc de certification des questionnaires (lot 3)

Compare **ce que dit la source** (PDF de l'instrument, extrait en verbatim par
`tools/corpus/extract`) à **ce que sert l'application** (catalogue
`web/src/lib/questions.ts` et moteur `calculateScore` réellement exécuté).

Le banc **constate**. Il ne corrige aucun scoring, n'écrit jamais dans le
catalogue, ne bascule aucun statut de certification. Sa sortie est une pièce
d'arbitrage pour le praticien — conformément à la doctrine de la campagne :
*le RAG certifie, source et explique ; le moteur déterministe calcule.*

## Usage

```bash
# 1. Rapatrier les PDF (lecture seule sur Drive, fichiers hors dépôt)
node tools/corpus/snapshot/fetch-drive.mjs --dossier <folderId> --filtre 'PSQI|Berlin'

# 2. Apparier au registre des sources
node tools/corpus/snapshot/snapshot.mjs

# 3. Extraire le verbatim (triple lecture A/B/C)
node --env-file=web/.env.local tools/corpus/extract/extract.mjs --pilote WN-SRC-0396,WN-SRC-0397

# 4. Certifier
node --env-file=web/.env.local tools/corpus/certify/certify.mjs \
  --instrument Q_SOM_07 --sources WN-SRC-0396,WN-SRC-0397
```

Sorties hors dépôt : `~/.wellneuro/corpus/certify/<instrument>/` —
`rapport.md`, `spec-B.json`, `spec-C.json`, `empreinte-servie.json`.

## Deux lectures, jamais une

La prose du PDF est transformée en spécification JSON par **deux modèles
indépendants** (Claude et GPT), aucun n'ayant le catalogue sous les yeux : un
lecteur qui connaîtrait la réponse attendue pourrait s'y aligner. Une
divergence vue par les deux est **confirmée** ; vue par une seule, elle reste
**à confirmer**. Si une lecture échoue, **rien n'est confirmé** — une lecture
solitaire ne doit jamais se présenter comme une lecture croisée.

## Ce que le banc sait détecter

| Code | Gravité | Ce qu'il attrape |
|---|---|---|
| `echelle_de_cotation` | critique | Cotation décalée (source 1-5, application 0-4) : tous les scores en dépendent |
| `nombre_items` | critique | Items en trop ou manquants |
| `inversion_absente` | critique | Items que la source inverse et que l'application ne renverse ni par le type de scoring **ni par la clé de réponse** ; signale à part le cas **partiel**, plus trompeur qu'une absence totale |
| `bareme_sans_source` | critique | La source dit qu'aucun barème global n'existe, l'application en affiche un |
| `bornes_score` | critique | Le score maximal **exécuté** diffère de celui de la source |
| `total_numerique_absent` | critique | La source définit un total, le moteur n'en produit aucun |
| `sous_echelles` | majeur | Découpage en dimensions différent (un total global masque des sous-échelles) |
| `seuil_non_represente` | majeur | Seuil de la source absent du scoring servi |
| `bornes_non_executables` | majeur | Le moteur lève une erreur sur les jeux de réponses extrêmes |
| `bornes_indeterminees` | majeur | Aucun total et aucune nature catégorielle assumée |
| `protocole_dans_interpretation` | majeur | Conduites cliniques (`protocol`) logées dans les bandes de score |
| `libelle_item` | mineur | Libellé éloigné de la source (similarité < 0,5) |

## Les bornes sont exécutées, pas lues

`empreinteServie` n'accorde aucune confiance à `maxTotal` : elle construit les
jeux de réponses extrêmes et **appelle `calculateScore`**. Une borne déclarée
peut mentir ; une borne exécutée, non. C'est la différence entre auditer un
commentaire et auditer un moteur.

Le catalogue est chargé par `scripts/lib/charger_catalogue.js` — **le même
module que le garde CI** `check_questionnaire_certification.js`. Le banc
compare donc au catalogue réellement servi, pas à une copie.

## Banc du banc

```bash
node --test tools/corpus/certify/lib/comparaison.test.mjs   # npm run certify-check
```

Ces cas prouvent que le comparateur **échoue quand il doit échouer** : échelle
décalée, inversion absente, inversion partielle, barème sans source, bornes
mensongères, moteur muet. Ils prouvent aussi qu'il **se tait quand il doit se
taire** — une inversion matérialisée dans la clé de réponse (cas PSS-10) n'est
pas une divergence.

## Garde-fous

- Aucun Drive ID, aucun PDF, aucun verbatim ne rentre dans le dépôt.
- Aucune écriture en base, aucun appel au RAG de production.
- Les divergences ne déclenchent **jamais** de correction automatique : les
  arbitrages passent par une PR relue et le `CHANGELOG`.
