---
description: Revue indépendante et en lecture seule du diff WellNeuro : bugs, sécurité, données patients, régressions et tests manquants.
argument-hint: "[zone ou commit]"
disable-model-invocation: true
context: fork
agent: Explore
effort: high
---

# WellNeuro — revue

!`git diff --stat`
!`cd "$(git rev-parse --show-toplevel)" && git diff --name-only`
!`cd "$(git rev-parse --show-toplevel)" && git status --short --untracked-files=all`

Argument : `$ARGUMENTS`

Examiner d’abord le diff, puis seulement le contexte nécessaire.

Priorité des constats :

1. bug ou perte de données ;
2. secret, auth, RGPD, donnée patient ;
3. migration ou changement clinique non autorisé ;
4. régression fonctionnelle ;
5. test manquant ;
6. dette non bloquante.

Ne pas modifier les fichiers.

## Passe sécurité sur le diff — ce qui se cherche explicitement

À chercher dans les lignes **ajoutées**, sans se fier au ressenti de lecture :

- clé, jeton, mot de passe, URL de connexion en dur — y compris dans un test,
  un commentaire, une fixture ou un `.md` ;
- lecture ou écriture d'un `.env`, journalisation d'une variable sensible ;
- `eval`, construction dynamique de commande, `curl … | bash` ;
- `rm -rf` portant sur une variable, `chmod 777`, vérification TLS désactivée ;
- requête SQL concaténée là où le client Prisma typé suffirait ;
- route serveur nouvelle ou modifiée : le contrôle d'accès est-il présent, et
  au bon endroit — avant la lecture des données, pas après ?

**Ne jamais recopier la valeur d'un secret trouvé** dans la sortie, la PR ou le
journal : le fichier, la ligne et la règle suffisent à le corriger.

## Diff touchant un questionnaire ou le scoring

Contrôles propres à ce périmètre, à ne pas déduire du diff seul :

- toute modification clinique est documentée (fragment `changelog.d/`) et
  s'appuie sur une source, pas sur une déduction ;
- `docs/questionnaires-drive-mapping.md` est mis à jour, et
  `docs/gouvernance-questionnaires-scoring.md` est respecté ;
- un questionnaire marqué `certifié` dans la matrice a bien une fixture dans
  `scripts/check_questionnaire_certification.js` ;
- un score Drive certifié ou ambigu expose la métadonnée `certification` dans
  `scoresJson` ;
- une absence de réponse rend **non scoré**, jamais `0` — un zéro implicite
  déplace le score sans que rien ne le signale.

Sortie : résumé, constats bloquants avec fichier/ligne, constats non bloquants, tests, go/no-go.
