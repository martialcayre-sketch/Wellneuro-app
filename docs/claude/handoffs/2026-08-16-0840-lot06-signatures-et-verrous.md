# LOT-06 — signatures des tables cliniques et durcissement des verrous

- **État** : tout est sur `main`. Six PR mergées les 2026-08-15 et 16 (#683 à
  #689), plus cette PR de clôture. Rien en suspens dans le dépôt.
- **Campagne** : chaîne T0 — LOT-06, dernier lot. Le catalogue biologie reste
  une **proposition** ; aucune donnée n'est migrée.

## Livré

- **Catalogue biologie v5** — douze panels câblés sur des instruments réellement
  servis, treize zones de déclenchement tranchées, plage ferritine
  (`WN-CL-0044-003`), Karasek retiré (aucun claim ne le fonde), BMS-10 ajouté
  (cinq bandes adossées à cinq claims `VALIDE`).
- **`D-060`** — cadrage du lot « disjonction » : le contrat de déclenchement ne
  sait exprimer aucun « ou ». **Non implémenté.**
- **`D-061`** — quatre tables signées, dont priorités et biologie en passage en
  force nommé.
- **`D-062`** — la procédure d'abstention entre dans le périmètre signé.
- **`D-063`** — le verrou biologie passe d'un terme à cinq, dont `shaPerimetre`.

## À reprendre — trois gestes praticien, un lot de code

1. **Compléter la signature biologie.** Le verrou est FERMÉ : `dateValidation`
   est `null`, `claimsSource` vide, `shaPerimetre` `null`. Invisible aujourd'hui
   (table vide, le moteur refuse déjà faute de règle) — **mais la première règle
   ajoutée ne s'appliquera pas** tant que la signature reste en l'état. C'est le
   piège le plus probable de la reprise.
2. **Re-signer la table des priorités.** `D-062` a agrandi son périmètre
   (`4b51c649…` → `cfd9b876…`) ; `dateValidation` porte encore le 2026-08-15,
   posée sur l'ancien. Rien ne le détecte : les priorités n'ont pas de
   `shaPerimetre`, et c'est la seule table **sans drapeau d'exploitation** — donc
   la seule où signer allume directement.
3. **Étendre `shaPerimetre` aux quatre autres tables.** Fermerait des verrous
   actuellement ouverts : arbitrage praticien, pas geste d'assistant.
4. **Lot disjonction** (`D-060`) — cinq panels du catalogue restent
   inimplémentables sans lui. Fork à trancher avant de coder : la sémantique du
   recueil incomplet est arrêtée *fail-closed* mais attend la revue.

## Dettes de validation

**T2 et T3 n'ont jamais tourné de la session.** `wn-test-worktree.sh` installe
les navigateurs Playwright en dur (lignes 207-217) et `cdn.playwright.dev` est
refusé par l'allowlist du proxy. Contrats SQL et certification scoring : non
joués. **Revue `wn-reviewer` non lancée** sur trois PR cliniques.

## Pièges d'outillage dans le conteneur distant

- `gh` absent : `wn-attendre-ci.mjs` inutilisable.
- API GitHub directe bloquée par le proxy, même sur dépôt public.
- `actions_list` : **`head_sha` fait ignorer `workflow_id`** et remonte le run
  Copilot. Recette qui marche : `branch` + `workflow_id` + `perPage=1`, sans
  `head_sha`. Ne jamais l'appeler sans bornes, la sortie sature le contexte.
- `npm run check` ne joue que le périmètre modifié — un vert n'y vaut pas suite
  complète. Jouer explicitement les bancs concernés.

## Proposition non posée

Un **banc transverse sur les verrous de signature** : itérer sur les cinq
métadonnées et exiger les mêmes termes de chacune. L'asymétrie biologie (un
terme contre trois) est passée inaperçue jusqu'à `D-063` et a laissé poser une
signature invalide sans que rien ne rougisse.
