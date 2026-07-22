### SP-SPI LOT-01 — l'E2E du refus comble le trou de #216 (2026-07-22)

#216 laissait un manque explicite : les tests unitaires couvraient le domaine, la
route et le composant de la proposition de pack, mais rien ne prouvait que
l'écran s'affiche pour un vrai patient en reprise, dans un vrai navigateur, ni
que le refus s'y tienne. La raison invoquée — « le patient fictif du banc n'est
jamais en reprise » — était réelle, pas rédhibitoire.

- **Patient dédié.** Jennifer Martin (`PAT_SEED_02`) est seedée mais utilisée par
  aucun autre spec. La mise en reprise mute ses réponses et son jeton ; l'appliquer
  à Michel (`PAT_SEED_03`) aurait cassé `portail-parcours`, qui tourne en
  parallèle sur la même base éphémère.
- **Helper `preparerReprisePourTest`** (`e2e/helpers/db.ts`) : jeton d'accès
  permanent, réponses antidatées au-delà du seuil de reprise, accusé TRUST déjà
  donné (un patient qui revient a consenti à l'origine, donc « Avant de commencer »
  est sauté), et ardoise vierge de propositions. Toutes ces écritures sont
  fidèles à un vrai retour après longue absence.
- **Le parcours prouvé** : la proposition s'affiche, ses deux réponses sont au
  même niveau, aucun chiffre de score ; le refus enregistre et affiche l'accusé ;
  et au rechargement la question **ne se repose pas** — le cœur de la réserve.

Vert sur les deux projets (Desktop Chromium + iPhone 13). Aucun code applicatif
touché : uniquement le banc E2E.
