# Handoff — 2026-08-20 — LOT-02 Biologie : un parcours écrit, pas encore joué

## Ce qui a changé

- **`web/e2e/biologie-proposition-courrier.spec.ts`** (neuf) — parcours sériel
  sur Jennifer Martin : proposition non vide → déclaration d'un bilan hors
  outil → courrier établi et rendu pour transcription → seconde consignation
  refusée → verdict d'ancrage lu au fil.
- **`web/e2e/helpers/db.ts`** — `provisionnerDossierBiologie` /
  `nettoyerDossierBiologie`. Une passation `Q_STR_02` en zone danger suffit à
  déclencher `PANEL_STRESS_1` (mode `conditionnel`, donc dans
  `STATUTS_PROPOSES` : le formulaire de courrier s'affiche).
- **Les drapeaux, dans `webServer.env` de Playwright — et là seulement.**
  Première version : posés aussi au niveau du job CI et du script de worktree.
  Le CI a rougi sur 10 bancs unitaires, et la leçon vaut d'être retenue : la
  suite Vitest tourne en position CB ÉTEINTE, `/api/praticien/fil` interroge
  `arbitrageBiologique` dès que `WN_CB_ENABLED` est vrai, et ce modèle n'est
  pas dans le double de test. **Un drapeau posé sur le runner déplace la
  position de toute la suite** ; `webServer.env` ne touche que le serveur sous
  test.
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

## Rectificatif — 2026-08-21, après quatre rondes de CI

Le spec a tourné pour la première fois en CI, et il est **rouge pour une cause
que ni le cadrage ni la revue n'avaient vue**. Les trois hypothèses successives
que j'ai poussées étaient fausses, et il faut le dire dans cet ordre :

1. **« Les drapeaux ne sont pas armés »** — vrai, et corrigé, mais ce n'était
   pas la cause. Les poser au niveau du job a fait rougir 10 bancs unitaires
   (la suite Vitest tourne en position CB éteinte).
2. **« Le build cuit `false` dans la page »** — plausible, non prouvé,
   **démenti** : le `env:` de l'étape Build est valide et appliqué, l'échec est
   identique. Le changement est conservé mais marqué non prouvé nécessaire.
3. **La vraie cause** : `loadProposition()` n'est appelé que sur un runtime
   `ready`, c'est-à-dire après confirmation d'un **épisode T0** — et cette
   confirmation exige un rideau complet et une synthèse validée, fixture dont
   `e2e/mode-consultation.spec.ts:88-91` déclare la **non-couverture
   délibérée** (« le peupler déplacerait le seed partagé »).

**Ce qui a permis de trancher** : une sonde ajoutée au banc (la route est
interrogée avant l'écran, son corps affiché en cas d'échec) puis deux
comptages dans le message d'assertion. Sans eux, quatre rondes n'auraient
produit que « élément introuvable ». Le banc les garde — c'est ce qui rendra
le prochain échec lisible du premier coup.

**Ce que ça change pour la suite** : LOT-02 tel qu'écrit ne peut pas aboutir.
Trois issues sont posées dans le fichier de lot ; elles relèvent d'un
arbitrage de périmètre, pas d'une correction.
