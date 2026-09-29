# Handoff — 2026-09-29 — Fiches d'assiette : l'énoncé de la contre-revue Codex

## 1. Branche et état Git

`docs/contre-revue-codex-fiches-assiette`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`87d6cc41` (#1250). Documentation seule. PR #1251. Un merge à la fois : le
déploiement de `87d6cc41` attend encore le `verify` de `main`.

## 2. Objectif

Verser au dépôt l'énoncé de la contre-revue adverse de `D-251` (lots 1 à 11)
avant qu'elle soit jouée, pour qu'elle reste auditable. C'est la troisième des
conditions restantes du §10.

## 3. Décisions prises

- Contre-revue lancée par le responsable dans Codex ; Claude n'en prépare que
  l'énoncé (arbitrage du 2026-09-29).
- Forme : affirmations absolues à réfuter, pas un diff à relire (précédent du
  2026-09-08 : 7 réfutées sur 13).
- Revue Copilot de #1251, trois fils, tous corrigés :
  1. clôture absente → ce handoff, le fragment de changelog, l'entrée au
     SESSION_LOG ;
  2. « lecture seule » contredite par une mutation dans la copie de travail →
     mutation admise seulement dans un worktree jetable et propre, sinon
     `NON VÉRIFIABLE` ;
  3. A1 porte sur tout le dépôt mais `archive/` était hors périmètre →
     `archive/` incluse pour A1 seulement.

## 4. Fichiers modifiés

- `docs/claude/PROMPT_CONTRE_REVUE_CODEX_FICHES_ASSIETTE_2026-09-29.md` :
  l'énoncé (19 affirmations, en cinq surfaces).
- `changelog.d/2026-09-29-fiches-assiette-enonce-contre-revue.md`, ce handoff,
  `docs/claude/SESSION_LOG.md`.

## 5. Validations exécutées

- `grep` des motifs « Fiche MY » et « fiche(s) d'assiette » dans `archive/` :
  0 fichier. A1 peut la couvrir sans rien perdre.
- Aucun texte de fiche dans l'énoncé (texte synthétique et références de
  chemins seulement).
- CI de la tête initiale vert (`wn-attendre-ci`, code 0) ; celui de la tête
  corrigée : voir la PR.

## 6. Problèmes ouverts

- **Le constat de l'espace** (liste, page d'une fiche, tâche au fil, accusé,
  e-mail reçu) sur `PAT032`, après son prochain clic de diffusion.
- **Le résultat de la contre-revue** : chaque trouvaille est à vérifier dans
  l'arbre avant correction, et le résultat va dans
  `REVUE_CODEX_ADVERSE_FICHES_ASSIETTE_<date>.md`.
- **Document TRUST sur l'IA** : Claude le rédige, le responsable le valide, et
  il est versé au dépôt seulement.
- **La phase « Actions »** : chantier cadré, à ouvrir après les fiches, avec
  son propre `D-xxx`.

## 7. Prochaine action exacte

Merger #1251 une fois le déploiement de `87d6cc41` constaté. Le responsable
lance Codex sur l'énoncé et reclique « Valider pour diffusion » sur `PAT032`.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal.
- Codex n'est jamais invoqué par Claude.
- Les dossiers de test se lisent par identifiant, jamais par nom.
