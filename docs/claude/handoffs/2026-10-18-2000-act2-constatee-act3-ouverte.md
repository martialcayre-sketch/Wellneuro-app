# Handoff — ACT-2 constatée, ACT-3 ouverte

## Branche et état Git

`docs/plan-act2-act3` (worktree `cc8-migration`), fusionnée avec `origin/main` 9ec5c1bf. PR de documentation seule (plan H61, H75, H76 ; fragment ; SESSION_LOG ; ce handoff).

## Objectif

Constater ACT-2 à la première vraie diffusion, ouvrir ACT-3 et la constater dans l'image servie, consigner l'état de la file C.

## Décisions prises

- ACT-2 : critère de fin atteint. La diffusion est faite par le responsable, sur un dossier de test, à 17 h 44 UTC (code 74cdfd82). Elle porte une seule annonce `protocole_diffuse`, envoyée avec le clic, sans `document_remis` en double ni refus du plafond. L'e-mail reçu est identique au gabarit v1 validé (sans nom de document, sans contenu clinique).
- ACT-3 : `WN_PORTAIL_MES_ECHANGES=true` est posé à 17 h 47 UTC, sur l'ordre de la reprise. Les conteneurs ont été recréés à 17 h 47 UTC.
- « Garde d'âge absente du POST du rendez-vous de suivi » : ce n'est pas un écart. L'arbitrage du 2026-10-14 (D-284 §3, lot (h)) garde le suivi du protocole ouvert (`lib/patient/gardeAge.ts`). Le correctif rédigé a été retiré avant commit, après un no-go de `wn-reviewer`.

## Fichiers modifiés

- `docs/claude/PLAN_WELLNEURO.md` (H61, H75, H76) ; `changelog.d/2026-10-18-act3-mes-echanges-ouvert.md` ; `docs/claude/SESSION_LOG.md`.

## Validations exécutées

- Lecture de production par conteneur, en lecture seule et en agrégats (one-off-5336, 9920, 769).
- Image servie : `GET /api/portail/echanges` sans session renvoie 401 à six reprises (il renvoyait 404 `desactive` avant le redémarrage).
- T1 rapide vert sur le correctif, ensuite retiré ; aucun code dans cette PR.

## Problèmes ouverts

- ACT-3 : reste à constater un premier dossier servi par « Mes échanges », par conteneur.
- Premier jour `lu_le` : aucune lecture datée en base à 17 h 46 UTC.
- Ligne « rendez-vous de suivi » fermée environ 24 h entre deux points d'étape : routée en H61, fenêtres inchangées.
- J3-base : reste la frise (porte 16, lectures repères le 2026-10-29 et le 2026-11-12).
- File C au-delà de la place 3 : J3-collecte (migration, accord à demander), textes du responsable (bd, ba, cb).

## Prochaine action exacte

Merger cette PR sur CI vert et revue CodeRabbit de la tête, puis constater par conteneur la première ouverture de « Mes échanges » et le premier `lu_le`, dès qu'un dossier de test ouvre un document remis.

## Interdits encore actifs

- Aucune diffusion provoquée pour un constat ; aucune fenêtre, aucun seuil ni règle clinique changés (J7, J14, J21 à ±3 jours).
- Aucune migration ni `schema.prisma` sans accord du responsable.
- Production lue par conteneur seulement, par identifiant ; agrégats seuls dans les fichiers durables.
