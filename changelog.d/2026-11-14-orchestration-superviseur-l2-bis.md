### Orchestration : superviseur rejoué, suite de la revue de #2100 (2026-11-14)

Lot `orchestration-8` (L2 bis). Les neuf constats non bloquants de la revue
`wn-reviewer` sur la tête de #2100 sont corrigés, chacun avec son banc.

- **Moins de faux verts.** Un instantané périmé ne rend plus une PR
  `merge_a_examiner` : elle reste `prete_en_attente`. La revue PR-Agent ne
  compte que si la garde a jugé la tête même de l'instantané :
  `wn-revue-pr-agent` rend désormais la tête qu'il a lue, et l'instantané la
  garde. Entre deux exécutions d'un même check, `started_at` absent ou égal
  se départage par `id`, pour qu'un re-run en file l'emporte sur l'échec ou
  le succès qu'il remplace.
- **Ce qui n'est pas établi est dit.** Une liste de fichiers illisible ou
  tronquée, celle de la PR ou d'une voisine, donne
  `chevauchement_non_etabli`. Un état de PR hors énumération est une
  anomalie même quand aucune ligne `prete` ne nomme la PR.
- **Moins de bruit.** Une PR de fork n'est une anomalie que si un registre la
  nomme ou qu'une déclaration la vise. Une ligne `prete` traitée couvre la
  déclaration qu'elle annonce si elle la précède de dix minutes au plus et
  n'a pas été traitée avant elle.
- **Sortie de l'instantané.** Une sortie qui est un lien symbolique est
  refusée, et l'écriture se fait en `O_NOFOLLOW`. `SANS_NOUVELLES_MS` est
  importé de `scripts/lib/registres.mjs` au lieu d'être recopié.
