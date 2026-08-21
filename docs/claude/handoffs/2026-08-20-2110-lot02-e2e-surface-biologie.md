# 2026-08-20 21:10 — LOT-02 Biologie : un parcours écrit, pas encore joué

## Ce qui a changé

- **`web/e2e/biologie-proposition-courrier.spec.ts`** (neuf) — parcours sériel
  sur Jennifer Martin : proposition non vide → déclaration d'un bilan hors
  outil → courrier établi et rendu pour transcription → seconde consignation
  refusée → verdict d'ancrage lu au fil.
- **`web/e2e/helpers/db.ts`** — `provisionnerDossierBiologie` /
  `nettoyerDossierBiologie`. Une passation `Q_STR_02` en zone danger suffit à
  déclencher `PANEL_STRESS_1` (mode `conditionnel`, donc dans
  `STATUTS_PROPOSES` : le formulaire de courrier s'affiche).
- **Les drapeaux, dans les TROIS endroits** : `wn-test-worktree.sh`, job
  `verify`, et `webServer.env` de Playwright.
- `web/prisma/seed.ts` intact, aucun code applicatif touché.

## À savoir pour la suite

- **LE SPEC N'A JAMAIS ÉTÉ JOUÉ.** Pas une fois. Le conteneur ne peut pas
  installer le navigateur Playwright (proxy). T1 et `tsc` sont verts, et cela
  ne prouve qu'une chose : les sélecteurs sont bien typés. Un sélecteur qui ne
  correspond à **rien** compile parfaitement. Les deux runs consécutifs sur le
  Mac sont le lot, pas une formalité — et il faut s'attendre à des retouches
  de sélecteurs au premier passage.
- **Le vrai défaut trouvé au cadrage n'était pas dans le spec** : aucun
  `WN_CB_*` n'était posé dans le harnais de test. Un parcours écrit sans ce
  préalable serait passé au vert en ne trouvant rien à cliquer — c'est-à-dire
  le pire résultat possible pour un banc.
- **Trois corrections de revue valaient le détour**, toutes du même genre —
  une assertion qui a l'air de prouver et qui ne prouve pas :
  compter les `listitem` du panneau (la liste « Ce que cette vue ne sait pas »
  en porte aussi, donc une proposition vide passait) ; épingler « Déjà
  documenté » (ce libellé bascule en « À répéter » au franchissement des
  365 jours, sans qu'une ligne bouge) ; `not.toBeEmpty()` sur un `<textarea>`
  React (le texte est dans la valeur, pas dans les enfants).
- **Le nettoyage est marqué**, pas approximatif : lettre reconnue à son
  destinataire, panel à sa date de bilan, passation à son préfixe. La première
  version supprimait toutes les correspondances sortantes du patient — inerte
  sur base éphémère, destructeur sur la base partagée du Mac.
- **Défaut nommé, non corrigé** : la double consignation n'a pas de garde
  serveur. Déjà au registre des questions ouvertes de la campagne.

## Vérifié

- T1 (`npm run check`) vert, `npx tsc --noEmit` vert, anti-secrets vert.
- **T2 non obtenu** : `wn-test-worktree.sh` meurt à l'installation des
  navigateurs, avant tout test.
- Revue `/code-review` : quatre constats, tous refermés ; deux notes
  non bloquantes traitées (l'épisode inutile retiré, le fragment de changelog
  écrit).
