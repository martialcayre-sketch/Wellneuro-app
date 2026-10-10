# Handoff — 2026-10-10 — BIO-INGEST : passe des mutations de la contre-revue, bancs M16 et M18

## Branche et état Git

`test/bio-ingest-bancs-mutations`, tirée de `origin/main` à `cc3f2f30`
(#1385 déployée). Une PR, une finalité : consigner la passe des mutations et
ajouter les deux bancs qui manquaient. La copie principale est restée sur
`main` en retard (autre session), non touchée ; travail en worktree jetable.

## Objectif

Traiter le retour de Codex sur la passe des mutations (M12, M13, M17 mordent ;
M14 non vérifiable ; le reste non joué), fermer ce qu'il laissait ouvert, et
corriger les trous de banc confirmés avant le lot de clôture.

## Décisions prises

- M14 joué par l'auteur sur PostgreSQL local : MORD. Le « blocage » vu par
  Codex était la suite T2, pas le banc (sortie redirigée vers `/dev/null`).
- M16 et M18, signalés d'avance comme probablement sans banc, joués par
  l'auteur : les deux SURVIVENT. Correctifs de banc, pas de code de production.
- `signature()` admis comme neutraliseur du garde des journaux (nom + code
  Prisma, même contrat que `classeEtCode`) plutôt que de réécrire les routes de
  saisie.
- B2 et C3 maintenues par Codex sans argument neuf : traitement inchangé.
- Constat d'usage pris en agrégats (lecture seule, conteneur), à verser au lot
  de clôture.

## Fichiers modifiés

- `web/src/lib/fiches-assiette/journaux.guard.test.ts` (périmètre, neutraliseur)
- `web/src/app/api/praticien/biologie/import/decisions/route.test.ts` (neuf)
- `docs/claude/campagnes/2026-09-30-bio-ingest/REVUE_CODEX_MUTATIONS_2026-10-10.md` (neuf)
- `.../REVUE_CODEX_ADVERSE_2026-10-10.md` (§3), `.../CAMPAGNE.md`
- `changelog.d/2026-10-10-bio-ingest-bancs-mutations.md`

## Validations exécutées

- M14 : banc du plafond, témoin vert, muté rouge.
- M16 : 3 mutations (+ erreur nue) vertes avant, rouges après extension.
- M18 : 180 tests verts avant ; banc neuf 11/11 vert, 7 rouges sous mutation.
- `npm run check` et `npm run test:worktree -- --fast` : voir la PR.

## Problèmes ouverts

- M1 à M11 et M15 : aucun résultat de mutation versé par le contre-relecteur.
- Garde des journaux : le cron de purge prend son erreur par `.catch(err =>…)`,
  l'erreur nue n'y est pas vue (seuls `.message`/`.stack`).

## Prochaine action exacte

Merger cette PR après CI vert et lecture des commentaires, constater le
déploiement, puis ouvrir le lot de clôture BIO-INGEST dans une session neuve
(forme exacte de B2, D4 et dossier RGPD, écarts fiche/code, constat d'usage,
suivi BioFlow).

## Interdits encore actifs

- Pas de seconde passe Codex sans signal ; lancement manuel par le responsable.
- Lecture de production par conteneur seulement, en agrégats, sans identifiant
  de dossier dans le dépôt.
- Aucun `checkout`/`switch` dans la copie principale (autre session).
