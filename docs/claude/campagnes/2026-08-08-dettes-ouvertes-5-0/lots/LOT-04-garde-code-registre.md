---
id: "LOT-04"
titre: "Le libellé emprunte le nom d'un barreau qu'il ne lit pas — et le seed omet une clé que le moteur produit"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-04 — Relier « Scoring vérifié » au barreau `scoring_verifie`, et rendre le seed aussi fidèle que le moteur

## But

Deux dettes nommées par `D-036`, qui partagent leur sujet — ce que l'écran dit de
la vérification d'un scoring, et ce qu'un banc peut en prouver.

**Ce lot produit une mesure, et c'est sa raison d'être principale.** La sortie du
garde EST la liste des instruments dont l'écran taît une vérification que le
registre déclare. Sans elle, la troisième dette de `D-036` (le badge muet) ne
peut pas être arbitrée sur autre chose qu'un chiffre relevé une fois à la main.

## Pourquoi ce n'est pas le LOT-03

Les deux lots gardent une « dérive entre deux sources », et l'arbitrage
d'ouverture du LOT-03 a posé la question. Ils ne partagent **aucun mécanisme** :
le LOT-03 compare deux tables Postgres et vit dans `web/prisma/checks/` ; celui-ci
compare deux fichiers du dépôt et vit dans `scripts/lib/`. Paliers de validation
différents, revues différentes, et un diff du LOT-03 qui les porterait tous deux
aurait trois finalités.

## Périmètre

### 1. Le garde code ↔ registre

`scripts/lib/verifier_registre_instruments.js` reçoit le catalogue comme du
**texte** et ne compare aujourd'hui que les **identifiants** (`:205-210`). Lui
faire comparer `def.scoring.certification.status` (catalogue de code, écrit à la
main) au `statutCertification` de `docs/claude/corpus/instrument_registry.json`,
sur le vocabulaire déjà déclaré `:11-26`.

Ce que le garde doit dire, et qui n'est pas trivial : les deux échelles ne sont
pas la même. `certification.status` vaut `certifie` / `ambigu` / `a_verifier` /
`non_score` ; `statutCertification` est un barreau de cycle de vie en huit
échelons plus deux états terminaux. **La correspondance à établir est celle des
divergences qui MENTENT** — un `certifie` à l'écran sous un barreau qui n'atteint
pas `scoring_verifie` — et non une bijection.

Joué par l'étape CI existante « Registre des instruments (banc du validateur) ».

### 2. Le seed aussi fidèle que le moteur

`web/prisma/seed.ts` porte 15 blocs `scoresJson`, **aucun** ne porte la clé
`certification` que tous les moteurs produisent (`questions.ts`,
`certification: sc.certification || null`) et que `api/patient/submit` persiste.
Conséquence : la colonne « Qualité » de la fiche patient retombe toujours sur
« Historique », et aucun E2E ne voit un seul des six libellés de passation.

Poser la clé sur les blocs dont le catalogue déclare une certification, plus
**une** assertion Playwright — aucun E2E n'ouvre aujourd'hui le tableau
« Détail des réponses ».

**Le plafond s'écrit, il ne s'adoucit pas** : Sophie Nicola porte cinq
passations, quatre certifiées au catalogue ; la cinquième (PSQI, `Q_SOM_01`)
restera « Historique » même seed étendu — c'est l'un des instruments muets.

## Hors périmètre

- **Faire parler le badge** pour les 18 instruments que le registre déclare
  `scoring_verifie` et que l'écran laisse en « Statut inconnu ». C'est une
  décision produit, à prendre **sur la liste que ce lot produit**, et à écrire au
  **prochain numéro libre du registre** : elle suppose de choisir la source
  d'autorité d'une affirmation clinique, ce que `D-034` fige. (Elle visait
  `D-037` ; ce numéro est pris depuis le 2026-08-09 par la décision HDS — un
  numéro ne se réserve pas, `decisions-numerotation.mjs` refuse tout trou.)
- Renommer quelque valeur de donnée que ce soit pour aligner le dossier sur
  l'écran (`D-034` : `instrument_registry.json`, le champ `cosmin`).
- La cohérence packs ↔ miroir relationnel — LOT-03.

## Interdits

- Ne pas dériver l'attendu du module testé : un attendu qui bouge avec sa source
  ne prouve rien.
- Ne pas creuser d'exception dans un motif de garde.

## Preuve attendue

- Le garde est **mutation-testé** : introduire une divergence
  `certification.status` ↔ barreau fait rougir ; l'inverse aussi.
- La liste des divergences est **consignée avec sa date** dans `## Résultats` —
  c'est la matière de la décision produit ci-dessus.
- T2 avant commit ; T3 si le seed bouge (il change les données des parcours).
