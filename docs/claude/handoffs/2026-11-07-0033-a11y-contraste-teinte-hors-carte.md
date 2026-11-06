# Handoff — 2026-11-07 — portail patient : contraste de la teinte verte posée hors carte

## Branche et état du dépôt

- Branche `claude/gifted-poitras-8e2902`, un commit de correctif et ce handoff sur `origin/main` 1b2d3f7d. Session concurrente en worktree, cycle en `git`/`gh` direct.
- Aucune migration, aucun `schema.prisma`, aucune route API, aucun chemin clinique. **Pas de release-db attendue.**
- Essai `D-373` : la PR est déclarée « prête @<sha> », l'intégrateur la merge.

## Objectif

Corriger le défaut WCAG 1.4.3 relevé par axe le 2026-11-06 : `text-primary` sur `bg-primary/10` posé hors carte, sur le fond beige de la page, donne 4,09:1 pour 4,5:1 exigés. Retirer l'écart correspondant du spec axe de saisie.

## Décisions prises

- **`text-foreground` sur la teinte** (10,62:1 sur le fond de page), parmi les trois options du lot, sans jeton nouveau. Le ton `success` de `PatientInlineMessage` a déjà tranché ainsi le même défaut (arbitrage du 2026-10-10) : le fond teinté porte seul le ton. Écartés : un jeton de vert plus sombre et un `bg-surface` sous la teinte, qui laissent le vert dépendre du fond. C'est l'approfondissement du canevas (A5-R2) qui a fait passer ce motif sous le seuil.
- **Relevé des 16 usages, conteneur vérifié un par un.** Quatre en défaut, tous hors carte : le bandeau de rappel du consentement, les bandeaux « Merci » des deux agendas, le survol de `PatientButton` `ghost`. Les 12 autres vivent dans une carte (5,20:1) et ne changent pas.
- **Survol de `ghost` corrigé au niveau du composant** (`hover:text-foreground`). Il est en défaut seulement hors carte (« Modifier ma nuit », « Modifier ma journée », « Noter la journée d'hier », « Imprimer ou enregistrer en PDF »), mais une variante ne connaît pas son conteneur : la classe vaut donc aussi en carte.
- **`ECARTS_CONNUS` retiré en entier.** La demande visait l'entrée `color-contrast` ; #1895 avait entre-temps retiré l'autre, la liste serait restée vide. Liste et filtre partent : tout nœud fautif redevient un échec.

## Fichiers modifiés

- `web/src/app/portail/[token]/questionnaires/[idAssignation]/page.tsx`
- `web/src/components/patient/agenda-sommeil/AgendaSommeilJournal.tsx`
- `web/src/components/patient/agenda-alimentaire/AgendaAlimentaireJournal.tsx`
- `web/src/components/patient/ui/PatientButton.tsx`
- `web/e2e/portail-accessibilite-saisie.spec.ts`
- `changelog.d/2026-11-07-a11y-contraste-teinte-hors-carte.md`, ce handoff.

## Validations exécutées

- Sur l'arbre réaligné sur `origin/main` 1b2d3f7d : T1 complet (`npm run check`) vert ; T2 (`npm run test:worktree -- --fast`) vert en 7 min 58 s, 355 E2E passés, 21 ignorés.
- `portail-accessibilite-saisie.spec.ts` vert sur Desktop Chromium et iPhone 13, sans aucun écart toléré.
- `bash scripts/check_no_secrets.sh` : aucun secret.
- Contrastes calculés (formule WCAG, composition de la teinte à 10 %) : voir le fragment de changelog.

## Problèmes ouverts

- **Démontré, non observé** (`D-125`) : axe ne contrôle que le bandeau de rappel, sur fixture, par le chemin `PlaintesForm`. Les bandeaux « Merci » et le survol sont établis par le calcul et la lecture du conteneur : axe ne visite pas ces états dans ce spec.
- Rendu non regardé à l'œil : le texte de ces bandeaux passe du vert au brun foncé.
- Hors périmètre, non modifié : la ligne de la matrice de contraste de `docs/design-system-d1.md` sur `text-primary` (~1,9-2,3:1, « ne jamais utiliser ») ne correspond plus au vert patient actuel (5,98:1 sur carte).

## Prochaine action exacte

1. Attendre le CI (`node scripts/wn-attendre-ci.mjs <N>`), code `0` seul.
2. Lire la revue sur la tête (CodeRabbit, sinon PR-Agent ou `wn-reviewer`, `D-393` §2, `D-448`), un verdict par commentaire.
3. Poster « prête @<sha> » sur la PR ; l'intégrateur merge (essai `D-373`).

## Interdits encore actifs

- Aucune modification clinique, de seuil ni de donnée collectée.
- Pas de migration, pas de `schema.prisma`.
- Fixtures neutres seulement en E2E : jamais un dossier réel.
- Pas de `retries` Playwright. Un rouge WebKit du CI ne se relance pas.
- Pas de `gh pr merge` depuis cette file pendant l'essai `D-373`.
