### `wn-etat-reel` dit ce qu'il n'a pas confronté (2026-11-25)

Le résumé de `scripts/wn-etat-reel.mjs` annonçait toujours « 3 confrontées
(vue dérivée, cohérence des dates, lot courant), N écart(s) », même quand une
de ces confrontations n'avait rien eu à comparer : son silence comptait pour
zéro écart. Il rend désormais « non confronté (.wn/state.json absent ou
illisible) » quand l'état machine est absent, illisible ou vide, et
« k/3 confrontées (…), non confronté : … » quand une confrontation manque de
matière (vue `ACTIVE_CAMPAIGN.md` absente, date manquante ou invalide,
campagne active nulle ou introuvable sur disque). Le rapport JSON porte le
détail dans `confrontations` (`etatLu`, `menees`, `nonMenees`). Quand les
trois sont menées, la ligne est inchangée.

Constat : dans un clone frais, `.wn/state.json` est suivi par git, donc
présent, et les trois confrontations ont lieu. Les gardes de `comparerEtat`,
`wn-coherence-etat` et la consigne de passe sont inchangés. Banc
`scripts/wn-etat-reel.test.mjs` étendu de quatre tests hermétiques.
