# Handoff — lot `autonomie-pieges-restes`, partie 14 : focus areas de PR-Agent (2026-11-24)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie14`, tirée d'`origin/main` à db55f70f, après le merge de #2309 (partie 13,
  squash 57f04ba0). Elle vit dans le worktree `.claude/worktrees/orch-ci`. L'ancienne
  `chore/autonomie-pieges-partie13` est périmée et n'a pas été touchée.
- Le commit est fait tard, juste avant le push (D-518).
- Carnet : le lot `autonomie-pieges-restes` (ordre 35) reste pris par cette session. `branche` et `tenu_le` ont été
  mis à jour avec `if_version`, en version 51.
- Boîte D lue au démarrage : un seul message `emis`, le `merge_fait` de #2309, passé à « lu ».

## 2. Objectif

Convertir en contrôle le piège « focus areas de PR-Agent » (mémoire du 2026-11-05 : #1878 renvoyée par
l'intégrateur, deux « Recommended focus areas for review » sans verdict sous « PR-Agent : aucun problème relevé »).
Rien ne le contrôlait : sur les déclarations de #2180 à #2312, #2274 et #2278 ont été mergées avec cinq focus areas
sans aucun verdict.

## 3. Décisions prises

- **Le contrôle vit dans `scripts/wn-integrer.mjs`**, la porte par laquelle passe chaque merge, avec un code neuf,
  **26**. C'est la seule porte qui lit à la fois la déclaration et le commentaire persistant.
  - Il refuse quand un titre n'est cité par aucun commentaire de conversation du propriétaire (`OWNER`, non robot,
    hors commentaires marqués de l'intégrateur) dont l'heure de parole ne dépasse pas celle de la déclaration
    servie (la déclaration elle-même comprise).
  - Il joue dans tous les modes, filet compris, avant tout contrôle coûteux.
- **`scripts/wn-revue-pr-agent.mjs` liste les titres attendus**, sur une ligne d'information placée avant la ligne
  `REVUE`. Son code de sortie ne change pas : il dit toujours si la revue porte sur la tête. Les consommateurs (wn-merge,
  superviseur, instantané, passe d'orchestrateur) lisent le code ou la dernière ligne, vérifiés par la revue.
- **Titres attendus** : les focus areas affichées, plus celles du bloc d'état (`findings`), quel que soit leur état.
  La règle écrite le veut : une remarque « résolue » par PR-Agent n'a pas reçu de verdict. Sur les données réelles,
  19 PR sur 25 citaient déjà ces remarques.
- **Citer, pas juger** : le contrôle ne vérifie que la présence du titre, pas le verdict. Un juge du verdict
  demanderait une forme imposée, que rien n'a décidée.
- **Titre d'un ou deux mots** : il ne vaut cité qu'en ouvrant une marque (`*`, `«`, guillemet, accent grave) et sur une
  fin de mot. La marque fermante n'est pas exigée juste après, parce que les verdicts réels écrivent
  `**Titre (précision)**` ou `**Titre — détail**`.
- **Échec fermé** : une section sans titre lisible, un bloc illisible, mal délimité ou doublé rendent « illisible »,
  et l'intégrateur refuse (26). Aucun cas « illisible » sur 128 PR réelles.
- **Écarté** : exiger un commentaire distinct de la déclaration (D-393 §3 le dit, mais les déclarations portent
  souvent leurs verdicts, comme #2258). Le contrôle ne le vérifie pas, et la règle le dit.
- **Risque** : P1 (outil de merge de l'intégrateur). Revue : `wn-reviewer`, puis PR-Agent → 0.
- **Revue `wn-reviewer` : GO, sans P0 ni P1.** Verdicts :
  - P2-1, un commentaire `<!-- wn-integrateur -->` reprenant un refus 26 citait le titre à la place de la file :
    corrigé (exclusion, cas de banc).
  - P2-2, un titre court (« Tests », « Migration ») était « cité » par la prose d'une déclaration : corrigé (marque
    ouvrante et fin de mot, cas de banc). Le premier correctif exigeait la marque fermante juste après le titre, ce
    qui refusait cinq PR réelles (#2212, #2228, #2251, #2269, #2281). Il a été assoupli sur leurs formes.
  - P3-1, un bloc mal délimité ou doublé se lisait vide : corrigé. P3-4, la ponctuation finale d'un titre : corrigé.
    P3-5, la ligne d'information hors de son propre `try` : corrigé.
  - P3-2 : la garde rend 0 sans commentaire persistant. C'est voulu, et la preuve PR-Agent reste celle de
    `wn-revue-pr-agent.mjs`. Écarté avec ce motif.
  - P3-3 (titres en double), la variante « citation sans verdict » et P3-6 (commentaire non distinct) : écrits en
    limites, dans le module et dans la règle.
  - Noms de banc : le cas « tête précédente » porte désormais un `last_seen_head_sha` d'une autre tête.

## 4. Fichiers modifiés

- Neufs : `scripts/lib/focus-areas-pr-agent.mjs`, `scripts/lib/focus-areas-pr-agent.test.mjs`.
- `scripts/wn-integrer.mjs` : `focusSansVerdict`, garde 26 dans `verdictGardes`, appel dans `gardes()`.
- `scripts/wn-revue-pr-agent.mjs` : `lignesFocus`, ligne d'information.
- Bancs : `scripts/wn-integrer.test.mjs`, `scripts/wn-revue-pr-agent.test.mjs`. `web/package.json` : banc neuf dans
  `bancs-outillage-check`.
- Docs : `.claude/rules/pr-revue-et-release-db.md` (§ PR-Agent), `docs/ROLES_MACHINES.md` (cinquième garde),
  `docs/claude/REGLES_PR_MERGE.md`.
- `changelog.d/2026-11-24-autonomie-pieges-partie14.md`, ce handoff.

## 5. Validations exécutées

- **Bancs** :
  - `focus-areas-pr-agent` : 24 cas.
  - `wn-integrer` : 22 cas neufs.
  - `wn-revue-pr-agent` : 3 cas neufs.
  - Les trois ensemble : 148 sur 148.
- **Dix-sept mutations inverses**, chacune rétablie ensuite (empreintes `shasum` comparées) : toutes rougissent au
  moins un cas. Elles visent :
  - la citation du plus long non retirée ;
  - le commentaire de l'intégrateur admis ;
  - le titre court sans marque ;
  - le titre court sans fin de mot ;
  - l'espace admis après l'astérisque ;
  - le bloc mal délimité lu vide ;
  - la ponctuation finale gardée ;
  - la citation postérieure admise ;
  - un non-propriétaire admis ;
  - la garde retirée ;
  - l'illisible admis ;
  - le bloc ignoré ;
  - la section illisible lue vide ;
  - le gras non retiré ;
  - l'auteur de la revue non vérifié ;
  - l'ancienne revue retenue ;
  - la ligne d'information retirée.
- **Rejeu en lecture seule** sur les commentaires réels de 128 PR déclarées (#2180 à #2312, téléchargés au bloc-notes,
  hors dépôt) : 119 passent et 9 auraient été refusées. Le détail est au changelog. Aucune lecture « illisible ».
- **T1** : `check:rapide` vert. `npm run check` complet vert (code 0), le banc neuf compris. T2 n'est pas joué : aucun
  E2E n'est concerné.

## 6. Problèmes ouverts

- **Effet au merge** : dès que cette PR est sur `main`, l'intégrateur refuse (26) toute PR dont un titre n'est pas
  cité. Celles déjà déclarées « prête » sans citer leurs titres devront poster un verdict et redéclarer. Cela inclut
  les « Possible Issue » et les remarques résolues des têtes précédentes.
- **Limites assumées** (écrites) :
  - une citation sans verdict passe ;
  - deux remarques de même titre se contentent d'une citation ;
  - un verdict donné en revue GitHub, en réponse en ligne ou dans le corps de la PR ne compte pas ;
  - le commentaire n'est pas vérifié distinct de la déclaration.
- `wn-integrer.mjs` ne vérifie toujours pas lui-même la preuve PR-Agent (`wn-revue-pr-agent.mjs` → 0) : elle reste
  un geste de l'intégrateur. L'écart est antérieur à cette partie. Candidat pour le lot, s'il est décidé.
- Toujours ouverts depuis la partie 13 :
  - `sources-check` est absent de `GARDES_NODE` de `wn-controle-fusion.mjs` ;
  - fixture E2E `WN-SRC-0998` : geste du responsable ;
  - pas de point de passage unique de l'ingestion.
- Toujours en suspens depuis la partie 11 :
  - deux dossiers `wn-repro-imp-*` sous `$TMPDIR` ;
  - les commentaires de `dansLeDepot` dans deux gardes.
- Pièges encore à traiter dans le lot :
  - SESSION_LOG réordonné ;
  - sessions concurrentes ;
  - crochets de la copie principale en retard ;
  - `wn-attendre-ci` ;
  - statut « transféré » (décision requise) ;
  - lint « objet d'erreur brut ».
- Toujours à arbitrer par le responsable : les deux lots rangés « bloque » par les passes cloud du 2026-11-21 faute
  de droits (403).

## 7. Prochaine action exacte

1. Commit, push, PR (`--body-file`), puis `wn-attendre-ci` en fond.
2. PR-Agent → 0. Chaque remarque reçoit un verdict qui cite son titre, comme le contrôle neuf l'exige.
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`). Ensuite, plus aucune écriture sur la PR (D-546).
4. Ensuite, le piège suivant : « SESSION_LOG réordonné ».

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Fixtures neutres seulement. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`. `release-db.yml` non touché.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Aucune référence `refs/tags/reserve/…` créée pour essai.
- Aucune routine créée, rallumée ni lancée. `orchestrateur/arret` vaut `false` ; cette session n'y touche pas. La
  phase 3 (pilote) attend le feu vert du responsable.
- Ne pas déclarer la porte 24 levée. Aucune adresse de page privée dans le dépôt.
- Horodater en lisant l'heure système.
