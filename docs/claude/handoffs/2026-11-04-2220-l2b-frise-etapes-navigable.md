# Handoff — 2026-11-04 — L2b : la frise des étapes devient navigable, livrée éteinte

## Branche et état Git
- Branche `feat/l2b-frise-etapes-navigable`, partie d'`origin/main@c5fa8304`, worktree `.claude/worktrees/l2b-frise-etapes-navigable`.
- Une PR, squash. Série « rails et menus » : la session merge elle-même après le cycle `wn-merge` complet (autorisation du 2026-11-03).

## Objectif
Lot L2b de l'audit `docs/claude/propositions/2026-11-01-portail-rails-et-menus/` : la frise des six étapes du hub devient une navigation vers des cibles existantes seulement, selon le tableau de [[D-423]] §8, derrière un drapeau serveur éteint (§7).

## Décisions prises
- Q39 (chapitre 17 de l'audit) : après le constat de L2, le responsable garde la hauteur du bloc « Autres espaces » et lance L2b (« Garder, lancer L2b », 2026-11-04).
- Drapeau `WN_PORTAIL_FRISE_NAVIGABLE`, neuf et éteint, lu par `questionnaires/layout.tsx` (serveur) et servi au hub client par contexte. Aucune route ne le lit ni n'est touchée.
- Servie au seul dossier majeur, selon l'âge et non la clôture, par application de [[D-283]] §5 (aucune surface neuve à un mineur, âge inconnu traité comme mineur) et de Q36. Fail-closed : `statutAge === 'majeur'` exactement. Un mineur, clos ou non, garde la frise d'avant.
- Texte de l'étape 5 courante dans `TEXTES_ETAPE_ANALYSE_COURANTE` (`formulations.ts`), entré dans `TOUTES` de la garde D7.
- Cible de « Questionnaires » : `#mes-questionnaires` (enveloppe des groupes de la liste) si un groupe est rendu, sinon `#mon-parcours` (enveloppe de la carte).
- Correctif sans drapeau : `relative` sur la liste de la frise d'avant. Son `sr-only` faisait déborder la page à 390 px (494 px), constat incident de L2. La frise des écrans d'entrée en profite aussi, sans que `[token]/page.tsx` soit touché.
- Défaut trouvé au constat et corrigé : à 390 px, l'étape courante 5 ou 6 restait hors champ. La frise navigable la ramène dans son champ à l'affichage.

## Fichiers modifiés
- Neufs :
  - `components/patient/frise/` : `FriseEtapesNavigable.tsx`, `friseEtapes.ts`, `friseDrapeau.ts` et leurs bancs ;
  - `app/portail/[token]/questionnaires/layout.tsx` et `frise.cablage.test.tsx` ;
  - `e2e/portail-frise-etapes.spec.ts`.
- Modifiés :
  - le hub `questionnaires/page.tsx` : frise sous drapeau et garde d'âge, ancres, groupes calculés avant le rendu ;
  - `PatientJourneyProgress.tsx` : `relative`, `STATE_CLASSES` exporté ;
  - `formulations.ts` et sa garde ;
  - `playwright.config.ts` : drapeau armé ;
  - `visual.spec.ts` : instantané d'accessibilité, la `nav` porte le nom.
- Doc :
  - `docs/FEATURE_FLAGS.md` ;
  - l'audit (chapitre 11, état et constat de L2b ; chapitre 17, Q39) ;
  - PLAN, file C, ouvertures sans place numérotée ;
  - `changelog.d/2026-11-04-l2b-frise-etapes-navigable.md`.

## Validations exécutées
- Bancs : table étape → cible case par case, composant (nav, ordre, un seul `aria-current="step"`, bouton et texte, cibles `min-h-11`, `relative`, défilement vers l'étape courante), câblage du hub drapeau fermé ou ouvert : majeur, mineur, mineur clos, âge absent, clos majeur, étapes 5 et 6, bilan rejeté.
- Neuf mutations jouées puis annulées, toutes rouges :
  - cible du bilan sans `bilanConsultable` ;
  - texte d'analyse en `elements_transmis` ;
  - étape 5 passée cliquable ;
  - drapeau ignoré ;
  - liste toujours rendue ;
  - `relative` retiré ;
  - `aria-current` sur toutes les étapes ;
  - garde d'âge retirée ;
  - âge lu après la clôture ;
  - défilement retiré.
- T1 (`npm run check`) : typage et Vitest verts. Un seul rouge, hors lot : la parité `BANCS_BALAYAGE` de `scripts/wn-controle-fusion.test.mjs` ne connaît pas `CaptureRepas.test.tsx` (#1857, D-437), déjà relevé en #1859.
- T2 (`--fast --keep-db`) avant la garde d'âge et le défilement : vert, Vitest 15 975, E2E 319 passés (dix nouveaux), `axe` vert sur le hub. T2 final (`--fast`), sur l'état livré : vert en 9 min 8 s, Vitest 15 977, E2E 319 passés.
- Constat à l'écran : chapitre 11 de l'audit, « Constat à l'écran de L2b », sur trois dossiers, à 390 px, en confort 112,5 % et à 1 024 px, drapeau ouvert puis éteint.

## Problèmes ouverts
- Activation : place de la file C au-delà de la place 11, porte 18 ; posée par le responsable, jamais par l'assistant.
- Non constaté à l'écran, épinglé au banc : l'étape 6 courante sans bilan consultable, et `prochaine_etape_prete`.
- Le rouge local de parité `BANCS_BALAYAGE`, à confier au lot D-437.

## Prochaine action exacte
Merge de la PR par la session (cycle `wn-merge`). Puis arrêt : L3 (bouton « Menu ») attend son arbitrage et sa propre décision.

## Interdits encore actifs
- Ne toucher ni `[token]/page.tsx` ni `/api/portail/session` jusqu'à L3.
- Aucun chiffre sur une surface patient (D-333). Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
