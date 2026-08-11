# Handoff — 2026-08-11 — LOT-01 : la doctrine clinique et les règles candidates

## Branche et état Git

- Branche : `campaign/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/lot-01`
- HEAD `367688ad`, **ahead 0 / behind 0** sur `origin/main` (fetch du 2026-08-11)
- Phase `wn-cycle` : `travail` — branche vivante, aucune PR. **Fenêtre de
  clôture ouverte** : cette entrée et celle du `SESSION_LOG` partent dans la PR
  du lot.
- Diff **purement documentaire** : aucun fichier de code, aucune migration,
  aucun schéma.

## Objectif

Ouvrir le LOT-01 par sa doctrine, avant d'écrire la première règle : poser une
constitution clinique d'exécution, l'auditer contre le code réellement écrit,
puis descendre les trois règles de discordance de la spec prédicat par prédicat
pour savoir lesquelles sont écrivables.

## Décisions prises

- **D-041** — discordance, convergence et conflit de sources sont **un objet à
  trois formes**, pas trois objets. Garde non négociable : aucun champ de
  certitude, de probabilité, de score ou de confiance. Seule `DISCORDANCE` est
  peuplée par le lot.
- **D-042** — la table V1 porte **une** règle. C-STR retenue à `≤ 8` (bande
  publiée ; le trou à 9 est laissé ouvert délibérément) ; C-SOM **retirée**
  (l'axe `ME` du DNST porte six items de sociabilité sur dix — la règle
  sélectionnerait des patients introvertis qui dorment bien) ; C-ALI
  **reportée** (le drapeau d'anamnèse « restriction déclarée » n'existe pas).
  Plus un banc de fraîcheur des claims épinglés.
- **D-043** — l'extrait permanent de `CLAUDE.md` est **opposable en revue** ;
  neuf règles basculent à « acté » (`DC-12`, `14`, `17`, `20`, `23`, `27`,
  `30`, `34`, `35`). Aucune n'est gardée par un banc : la dette est écrite
  règle par règle. `DC-29`, `DC-54`, `DC-55` restent proposition — D-041 les
  réserve.
- **D-044** — trois conséquences de la revue de clôture : type **propre** au
  moteur (pas `DiscordanceFinding`) ; critères du Lot B réduits, écart nommé ;
  déclencheur `release-db` étendu à `web/src/lib/clinical/**`.

## Fichiers modifiés

Nouveaux : `docs/claude/doctrine/{README,CONSTITUTION_CLINIQUE,AUDIT_DOCTRINE_CHAINE_T0}.md`,
`.../DOSSIER_REGLES_LOT-01.md`,
`changelog.d/2026-08-11-doctrine-clinique-et-dossier-lot-01.md`.

Modifiés : `CLAUDE.md` (extrait permanent), `.claude/rules/clinique-scoring.md`,
`docs/DECISIONS.md` (D-041 → D-044), `docs/claude/SESSION_LOG.md`,
`.../CAMPAGNE.md`, fiches `LOT-01`, `LOT-05` (`DC-39`), `LOT-07` (`DC-41`).

## Validations exécutées

- **T3 complet vert** — `npm run test:worktree`, `EXIT=0`, séquence CI complète
  en **3 min 47 s**, E2E Playwright Chromium + WebKit compris. **T1 vert** après
  les corrections de revue (296 tests). `check_no_secrets.sh` OK ·
  `wn-campaign-audit` EXIT=0 · `wn-etat-reel` 0 écart.
- **Revue `wn-reviewer`** : verdict initial **no-go**, neuf constats bloquants.
  Les six plus lourds ont été **revérifiés un par un dans le code** et étaient
  exacts.

## Ce qu'une revue a démenti — à ne pas réintroduire

1. La table d'orientation **est signée** (`orientationRulesV1.ts:1401`,
   `validationExterne: true`, 2026-08-06, 23 claims). L'en-tête du fichier
   porte encore des paragraphes antérieurs annonçant `false` — **la valeur de
   la table fait foi**. Ce qui ferme la route est le drapeau
   `WN_ENABLE_ORIENTATION_NNPP2`, mécanisme distinct de la signature.
2. `DC-26` ne peut pas être « acté » : `tools/corpus/orientation/` n'a jamais
   existé (§E). Passée à *partiel*.
3. `DrapeauxAnamnese` porte **dix** clés depuis `367688ad`, dont
   `intolerancesAlimentaires`. Une intolérance déclare une **cause**, pas une
   éviction : C-ALI reste reportée, mais en connaissance du drapeau.
4. `≥ 7` (plainte surpoids) **a** une provenance : bande « Intensité élevée »
   de `Q_MOD_03` (`mode-de-vie.ts:33-37`), déjà utilisée au même seuil par
   `R2-NEU-01` dans la table signée. Ne pas chercher la provenance d'un seuil
   de plainte dans `plaintes.ts`, qui n'est que de l'affichage.
5. Le seul seuil réellement sans source est **`plainte sommeil ≤ 2`** de C-SOM
   (il coupe à l'intérieur de la bande 1-3). Reporté avec la règle.
6. Six lignes de l'audit étaient `absent` en nommant un porteur : requalifiées.
   Répartition à jour : 11 / 18 / **13** / **16**.

## Problèmes ouverts

- **La « section 57 » n'est pas dans le dépôt.** Le rapport golden case est
  absent ; l'écart assumé sur cette régression n'est donc pas relisible. Le
  critère 2 du Lot B, lui, est dans le dépôt et il est explicitement **non
  tenu** (D-044).
- La fixture `clinical-fixtures/obesity-restriction-digestive-young-adult.json`
  que la fiche invoque n'existe pas encore.
- `justificationClaims` de C-STR non instruit : la descente s'est arrêtée aux
  instruments, qui fondent la règle mais ne remplissent pas ce champ.
- Cohabitation à l'écran des sorties C-STR et `R2-STR-01` : signalée, non
  résolue.
- Sous-score de rythme du DNST (ME3/ME4/ME7/ME10) et drapeau de restriction
  déclarée : les deux conditions du retour de C-SOM et C-ALI, chacune son
  `D-xxx`, hors de ce lot.

## Prochaine action exacte

PR documentaire de ce lot (`--body-file`, une seule finalité), puis
`node scripts/wn-attendre-ci.mjs <N>` — `0` est le seul code qui autorise à
l'annoncer prête.

Ensuite, **avant la première règle écrite** : le type propre du moteur (D-044)
et le contrat de fraîcheur des claims. Le déclencheur `release-db` part avec le
code, pas ici.

## Interdits encore actifs

- Le LLM ne produit jamais une contradiction ; il restitue celles du
  déterministe. Aucune vigilance déterministe supprimable par la sortie LLM.
- Aucun champ de certitude, de probabilité, de score ou de confiance sur
  l'objet produit — **c'est pour cela que `DiscordanceFinding` n'est pas
  réutilisé**.
- Pas de nouveau few-shot contenant des données patient.
- Le banc de fraîcheur ne prend **jamais** la forme d'un test unitaire : la
  base CI est vide, il serait vacué ([[D-012]], [[D-015]]).
- SHA de table comparé à un **littéral épinglé**, jamais recalculé dans le test
  (`orientationRulesV1.test.ts:95-101`).
- Ne pas retoucher `sources/` : c'est l'original de la campagne.
