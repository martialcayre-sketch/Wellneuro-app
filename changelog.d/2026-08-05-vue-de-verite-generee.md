### Un rapporteur d'état, sans toucher au réparateur existant (2026-08-05)

`node scripts/wn-etat-reel.mjs` observe six dimensions du dépôt — flags actifs,
migrations sur disque, registre de certification, PR ouvertes, branches et
worktrees, routes patient/portail — et compare à `.wn/state.json`. Il **ne
corrige jamais rien** : c'est `node scripts/wn-cycle.mjs --appliquer`, déjà
existant, qui répare `git.*` et `updated_at`.

Aucune connexion base de données : les migrations sont lues sur disque, jamais
en production — cette lecture reste réservée à l'outil MCP Supabase, en
session (`CLAUDE.md`).

Découvert en écrivant ce lot : `--appliquer` doit se jouer **depuis `main`**,
jamais en cours de lot — sinon il écrit le nom d'une branche promise à
disparaître au premier merge, recréant la staleness qu'il corrige. C'est
vraisemblablement l'origine du bug initial (`.wn/state.json` pointait
`worktree-signature-table-orientation`, mort depuis des semaines). Purgé à la
main dans ce lot : `next_action` allégé de deux narrations closes (montée en
certification, orientation adaptative — toutes deux confirmées livrées par git
log), `active_campaign`/`active_lot`/`status` réactivés via
`node scripts/wn-campaign.mjs activate`, `lot_courant` de la campagne remis à
jour (il était resté sur LOT-00 après son merge — la clôture d'un lot doit
avancer ce pointeur, sans quoi `activate` dérive le mauvais lot actif).

`git.*` reste volontairement inchangé dans cette PR — sa réparation est un
geste post-merge, depuis `main`.
