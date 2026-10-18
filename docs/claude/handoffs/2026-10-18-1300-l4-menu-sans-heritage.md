# Handoff — L4 et L5 : menu sans « Héritage 4.0 », un rayon par entrée (D-324)

## Branche et état Git

- Branche `l4-menu-sans-heritage`, partie de `origin/main` 7ee0e0b7 (après
  #1543 et #1541). Worktree `d281-lot3-portail`. Un commit, PR à ouvrir.

## Objectif

Retirer du menu le groupe « Héritage 4.0 » (L4, fiche H43) et la page
Biologie fonctionnelle (L5), selon les réponses du responsable du 2026-10-18.

## Décisions prises

- **D-324** (non clinique, écrite dans ce lot) : réponses aux questions Q1,
  Q2, Q4 et Q5 de la pièce 17, plus quatre questions de forme. Agenda gardé,
  « Confiance & droits » dans La Spirale, « Synthèses » gardé au téléphone.
  Pour la Biologie, réponse libre : « chaque rayon de la bibliothèque en accès
  sur le menu ; la bibliothèque est trop confuse (concept à revoir) ».
  Groupe « Bibliothèque » à cinq entrées ; Documents et Synthèse IA retirés du
  menu du bureau ; `/dashboard/biologie` redirige vers « Analyses
  biologiques », qui porte aussi les fiches d'usage. D-324 amende D-310 §1.
- Mon décompte initial (« quatre rayons ») était faux : la page en portait
  six. Je l'ai corrigé devant le responsable avant le code (« cinq entrées »).
- L4 et L5 partent en une seule PR : séparés, l'écran des fiches d'usage
  aurait perdu son entrée de menu entre les deux.
- L'agenda est placé après « Consultation copilote » ; seule son entrée au
  menu avait été tranchée, pas son rang.

## Fichiers modifiés

- Menu : `components/ui/SidebarRail.tsx` (+ banc), `components/ui/MobileBottomNav.tsx`.
- Pages : `app/dashboard/bibliotheque/page.tsx` (redirection), nouvelles
  pages `questionnaires/`, `fiches-conseils/`, `complements/`, `biologie/`,
  `connaissances/`, en-tête commun `EnTeteRayon.tsx` ;
  `app/dashboard/biologie/page.tsx` (redirection). Bancs : `page.test.tsx`
  (×2) et `rayons.test.tsx`, qui reprend tous les cas de drapeau de la page
  unique et les fiches d'usage.
- `components/BibliothequePanel.tsx` : les onglets « Analyses biologiques »
  et « Fiches conseils » sont devenus des pages et sont retirés ; le panneau
  ne porte plus que le rayon Questionnaires.
- `components/fil/FileEnvoiAside.tsx` (+ banc) : le lien pointe sur
  `/dashboard/bibliotheque/questionnaires`.
- Gardes de biologie : `importeursBiologyLibrary.guard.test.ts` (les deux
  pages qui redirigent sortent, la page du rayon entre) ;
  `bioflowPublie.guard.test.ts` (la page du rayon entre dans le domaine
  biologie, la dérogation de l'ancienne page unique tombe : la liste diminue).
- E2E : `dashboard-praticien.spec.ts` (redirection de la Bibliothèque,
  nouvel E2E de la redirection de la biologie, feuille « Plus »),
  `bibliotheque-mobile`, `bibliotheque-fiches-conseils`,
  `orientation-file-envoi`, `visual.spec.ts` (adresses).
- `docs/claude/MATRICE_CONSOMMATION.md` régénéré (une surface indirecte de
  plus pour les compléments : deux pages au lieu d'une).
- `docs/DECISIONS.md` (D-324), `PLAN_WELLNEURO.md` (H43), changelog,
  SESSION_LOG.

## Validations exécutées

- Vitest des fichiers touchés : vert (menu, rayons, redirections, gardes).
- T1 complet vert, après régénération de la matrice de consommation.
- T2 : voir la PR.
- Bases d'images : les trois bases Desktop de la fiche capturent le menu.
  Elles sont à régénérer par le workflow `visual-baselines` au premier CI
  rouge, en committant seulement celles que le CI refuse.

## Problèmes ouverts

- Concept de Bibliothèque « à revoir » (responsable) : à cadrer dans un lot
  à part, sans rouvrir le découpage de D-324.
- Q8 de la pièce 17 (« Planifier le bilan ») : option sans objet tant
  qu'aucun rendez-vous n'est saisi.
- Résidu de t13 toujours sans réponse.

## Prochaine action exacte

T2, PR, CI, puis bases d'images Desktop si le CI les refuse. Revue CodeRabbit
sur le sha de tête, merge avec `--match-head-commit`, constat du déploiement.
Ensuite, page de la file A : ligne r2_01, mention de L4/L5 livrés (J1-base
reste ouvert pour ses autres parties).

## Interdits encore actifs

- Aucune migration ni modification de `schema.prisma` sans accord explicite.
- Aucune décision clinique sans D-xxx et fragment `changelog.d/`.
- Aucune identité réelle dans le dépôt ; production en lecture seule par
  conteneur.
- Un commit de bases d'images ne contient que les bases refusées par le CI,
  jamais un desserrage de seuil.
