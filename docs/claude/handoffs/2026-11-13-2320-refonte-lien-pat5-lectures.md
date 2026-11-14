# Handoff — 2026-11-13 — Refonte Lien / Empreinte, PAT-5 : lectures et espaces reçus (code)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat5-lectures`, créée depuis `origin/main` après le merge de DOC-10 (#2081), puis avancée en avance rapide sur `origin/main@d9c4f769`, puis sur `921f0908`.
- Worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT). La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».
- Feu vert du code donné par le responsable le 2026-11-13 (« Feu vert pour le code de PAT-5 »).

## Objectif

Coder PAT-5 selon les arbitrages du prototype (D-481, compléments DOC-9 et DOC-10) et les textes de D-488, sans décor (COM-1 reporté).

## Décisions prises

- **T-33 (Q4a)** : titre de `ComprehensionView` à ses trois emplacements. L'intitulé de la synthèse reprise dans U25 ne change pas.
- **T-36 (Q6a)** : `LienReconnexion` reçoit l'option `nouvelOnglet` (`target="_blank"`, `rel="noopener noreferrer"`). Le lien paraît sous le seul 401 d'un envoi : même onglet sur U23 (`CeQuiCompteForm`) ; nouvel onglet sur U24 (`ComprehensionView`) et sur les quatre envois de U25 (`DossierDeuxVoixView`). Le chargement garde son renvoi silencieux à l'entrée.
- **Q3a** : dans la carte d'objectif de U25, les intitulés « Ce que vous avez dit » (ou la variante datée) et « Ce que votre praticien en a compris » passent en `text-sm font-semibold`, sur `bg-voice-patient` et `bg-voice-practitioner`. La synthèse reprise sous l'objectif prend la voix du praticien, et les dépôts « Ce qui compte pour moi » celle du patient. Fonds et marges tombent à l'impression. Le séparateur viendra après COM-1 (Q2a).
- **Q5a** : `print:hidden` sur les retours de U23, U24, U25, U27, U28, U37 et U38. Il vaut aussi pour les commandes de U23, U24 et U25 (boutons, saisies des gestes, liens d'action) et pour le lien « Lire les conditions d'utilisation » de U37. Les cartes de fiches de U27 et U28 restent : ce sont des contenus. `Bibliotheque.tsx` n'est pas touché (DOC-10).
- Constat PR-Agent sur #2095 (lien orphelin) : « Me reconnecter » ne s'affiche plus qu'avec le message d'erreur qu'il complète (`erreur && sessionExpiree`), sur les trois écrans. Ouvrir ou refermer une saisie de U25 efface donc le message et le lien ensemble ; un test le prouve. Le second constat (état partagé entre E2E) est écarté : `provisionnerDossierDeuxVoix` purge le dossier à chaque `beforeEach`, et le spec le dit en commentaire.
- La branche a été fusionnée avec `origin/main@481c2450`, avec l'accord du responsable, pour lever la garde de fraîcheur. T1 complet passe vert ensuite.
- Aucun texte neuf ; aucun drapeau, aucune migration ; rien de clinique.

## Fichiers modifiés

- `web/src/components/patient/LienReconnexion.tsx`.
- `web/src/components/patient-companion/CeQuiCompteForm.tsx`, `ComprehensionView.tsx`, `DossierDeuxVoixView.tsx`, et leurs tests.
- `web/src/app/portail/[token]/` : `ce-qui-compte`, `comprehension`, `dossier`, `bibliotheque`, `fiches`, `informations`, `conditions` (`page.tsx`).
- `web/e2e/portail-reconnexion-envoi.spec.ts` (neuf) ; `web/e2e/helpers/db.ts` (`lireDesaccordsComprehension`).
- `changelog.d/2026-11-13-refonte-lien-pat5-lectures.md`, ce handoff.

## Validations exécutées

- Vitest des trois écrans : 120 tests passés.
- T1 `check:rapide` : un premier passage échoue sur deux dépassements de délai de `GenericQuestionnaire.test.tsx`, sous une charge machine de 35. Ce fichier passe seul (16/16), et le second passage est vert.
- T2 (`test:worktree --fast`), premier run : 13 échecs dans trois fichiers hors lot (`ProtocolMiniBuilder`, `MobileBottomNav`, `masquage`). Ce sont 7 dépassements de délai et 3 assertions de durée, sous une charge de 34. Les E2E n'ont pas tourné.
- Après la fusion, T1 complet (`npm run check`) passe vert.
- Second run de T2 : 9 échecs, tous hors lot, dans `ProtocolMiniBuilder` (délais dépassés) et `masquage` (assertions de durée), sous une charge machine de 38 à 46. Les trois fichiers hors lot passent seuls : 274 tests, 0 échec.
- Troisième run de T2, lancé quand la charge est passée sous 10 (le 2026-11-13 à 23 h 49) :
  - Vitest : 17 533 tests passés, 0 échec.
  - Playwright : 389 tests passés et 1 échec. Les 8 cas de `portail-reconnexion-envoi.spec.ts` passent, en Chromium comme en iPhone 13.
  - L'échec est hors lot : `mode-consultation-sans-chiffre.spec.ts:161` en iPhone 13, où le tiroir praticien ne s'ouvre pas en 10 s. Ce lot ne touche aucun fichier praticien ni aucun composant de ce spec.
- La branche a ensuite avancé en avance rapide sur `origin/main@921f0908`, qui ne touche aucun fichier du lot. Ce delta n'est pas couvert par le T2 local : le CI rejoue l'ensemble.

## Problèmes ouverts

- Le spec E2E simule la reconnexion en posant le cookie de session que pose l'atterrissage. La connexion réelle reste couverte par `portail-lien-magique` et `portail-google`.
- Pour un autre compte sur U25, le refus peut venir de la garde de version ou d'une garde antérieure : le spec prouve le refus et l'absence d'écriture, pas la garde qui tranche.
- Q2a et Q3a (séparateur, ornements des vides) attendent COM-1.
- Restent hors de PAT-5 : 1050-d, 1302-d, le lot Q5b, la valeur 5 des plaintes, la ligne de prises au zoom 200 %.

## Prochaine action exacte

1. T2 vert, E2E compris ; commit, PR, CI à 0 en tâche de fond.
2. Revue PR-Agent prouvée sur la tête (`wn-revue-pr-agent.mjs`), sinon wn-reviewer ; un verdict par remarque.
3. « prête @<sha> » au registre (boîte de l'intégrateur), puis fiche `lots/PAT-5` et journal.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; aucun décor avant COM-1, jamais hors des emplacements de D-481 §1 bis.
- Aucune question, option, cotation, condition d'apparition ni règle d'enregistrement modifiée ; rien de clinique.
- Aucune migration, aucun drapeau ; fichiers COM-0 gelés ; `Bibliotheque.tsx` hors lot (DOC-10).
- Production en lecture seule ; constat à l'écran en local seulement.
- Jamais de merge par la session ; toute écriture ArtifactData épinglée par `if_version`.
