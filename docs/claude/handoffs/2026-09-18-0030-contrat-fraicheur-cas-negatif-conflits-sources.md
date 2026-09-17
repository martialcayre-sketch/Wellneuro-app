# Handoff — 2026-09-18 — Le cas négatif de `conflits_sources` (D-228)

## 1. Branche et état Git

- Branche `wn-contrat-fraicheur-n11-2026-09-18`, partie de `origin/main` à
  `51cd30ef` (D-227, mergée juste avant).
- Worktree `phases-hash-2026-09-16`.
- Lot **court et d'une seule finalité** : un cas de test SQL, sa décision, son
  fragment. Aucun code applicatif.

## 2. Objectif de la session

Acquitter la dette routée par `D-227` : le registre des conflits de sources était
entré au contrat de fraîcheur le 2026-08-24 et n'avait **jamais** été exercé hors
de l'état sain. Le trou avait été trouvé la veille en écrivant `N10`, nommé avec
son correctif, et laissé ouvert plutôt que corrigé dans un lot dont ce n'était pas
la finalité.

## 3. Décisions prises

- **`D-228`** — le cas `N11` est ajouté au fichier négatif.
- **La mutation est `superseded_at`, et le choix n'est pas neutre** : `N7`, `N8`
  et `N9` mutent `active`, `N10` mute `statut`. La troisième propriété commune
  n'était éprouvée que sur un claim d'ORIENTATION, par `N4`. `N11` ferme la
  combinaison restante — table non-orientation × `superseded_at`.
- **Le claim muté est `WN-CL-0387-013`**, celui que le journal du contrat positif
  désigne depuis le 2026-08-24 comme n'ayant été, avant son entrée, cité que dans
  un commentaire — donc gardé par rien.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

- **Ferme** : chaque table signée du contrat a désormais son cas négatif.
- **N'atteint pas** : cette correspondance n'est tenue par **aucun banc**. Elle se
  vérifie table par table, à l'œil, entre le bloc de paires et les cas `N7+`.
  L'automatiser demanderait de dériver les cas SQL de la liste TypeScript — un lot
  en soi, non fait ici, et `D-228` §5 est le seul endroit qui le dit.
- **N'atteint pas** : aucune garde de production. Le fichier négatif ne tourne
  qu'en CI et n'est jamais joué contre la base réelle — il ÉCRIT ses fixtures
  avant de les annuler.

## 5. Fichiers modifiés

- `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1_negatif.sql` — le cas
  `N11`, le chapeau (« ONZE CAS » → « DOUZE »), le paragraphe `N7`–`N11`, et le
  `RAISE NOTICE` final.
- `docs/DECISIONS.md` (`D-228`), un fragment `changelog.d/`, ce handoff,
  `docs/claude/SESSION_LOG.md`.
- **Le contrat POSITIF n'est pas touché** : le bloc de prédicat reste identique
  entre les deux fichiers, et `claimsEpinglesFraicheur.guard.test.ts` le vérifie.

## 6. Validations exécutées

- **T2 `npm run test:worktree -- --fast`** : voir le commentaire de PR, rapporté
  tel quel. C'est lui qui joue les **contrats SQL** — ils ne sont pas dans le saut
  `--fast`, donc `N11` est réellement exercé.
- Le cas est **auto-vérifiant** : il exige que le prédicat lève ET que le détail
  nomme `WN-CL-0387-013` ET `remplacé (superseded_at)`. Un prédicat remplacé par
  un `RAISE EXCEPTION` inconditionnel ne passerait pas.

## 7. Problèmes ouverts

- **Numéro de décision** : `D-228` est pris ici, à vérifier au merge. Cinq
  collisions en trois nuits ; celle de `D-226` s'est jouée à **73 secondes**.
- **Piège de concurrence du CI, non documenté** : `.github/workflows/ci.yml:21-23`
  met tous les runs d'une branche dans un même groupe avec
  `cancel-in-progress: true` hors `main`. Relancer un ancien run **annule celui de
  la tête**. Constaté à mes dépens le 2026-09-17. Une ligne de `.claude/rules/`
  est en suspens chez le responsable d'une autre session — **ne pas l'écrire sans
  arbitrage**, deux sessions l'attendent.
- **Flake connu, deux occurrences** : `portail-parcours.spec.ts`, `socket hang up`
  / `ECONNRESET` qui se déplace. À ne JAMAIS confondre avec les deux signatures de
  `D-049` (requête jamais émise ; erreur interne du moteur).

## 8. Prochaine action exacte

1. Ouvrir la PR, **lire la revue Copilot et appliquer les corrections avant de
   merger**, puis merger avec `--subject` portant le bon `D-NNN`.
2. Ensuite, chantier 2 de S3 : le champ d'indication d'assiette et ses claims —
   **et lire chaque claim sur pièce, source ENTIÈRE, jamais depuis la surface**.
   C'est ce qui a rendu six claims de plus la veille.
3. Le validateur partagé de dérive des libellés d'anamnèse s'écrit **avant la
   première ligne** de ce chantier (`D-225`).

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; les dossiers de test se lisent par
  identifiant, jamais nommés, jamais visés par un seed ou un E2E.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite.
- Aucun contenu clinique du corpus au dépôt tant que G6 est fermée — une ligne
  **désigne** ses claims, elle ne les recopie pas.
- Une signature clinique ne se pose jamais par l'outil : surface, demande,
  transcription.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
