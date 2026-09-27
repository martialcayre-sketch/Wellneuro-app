# Handoff — 2026-09-27 — Export PDF du dossier patient (D-252)

## 1. Branche et état Git

`worktree-export-pdf-dossier-patient`, worktree
`.claude/worktrees/export-pdf-dossier-patient`, à jour d'`origin/main`
`188128a8` (#1236) par deux merges sans conflit. Deux commits WIP sur la
branche ; le merge de la PR est un squash.

## 2. Objectif

Depuis la fiche patient, exporter le dossier en PDF pour que le praticien le
soumette lui-même à un outil d'IA externe : renseignements administratifs,
fiche signalétique et anamnèse, réponses à tous les questionnaires avec leurs
scores, dernière synthèse validée complète (axes, priorités, points à
confirmer, questions pour la consultation).

## 3. Décisions prises

- Arbitrages du responsable, repris dans `D-252` §1 :
  - deux versions, « Pour une IA externe » (pseudonymisée) cochée par défaut, et
    « Complète » ;
  - synthèse : la dernière VALIDÉE ; un brouillon plus récent est signalé ;
  - scores comme l'écran praticien ;
  - téléchargement direct d'un PDF produit au serveur (`pdf-lib`).
- Masquage des textes libres AU POINT D'ENTRÉE de l'assembleur, sur un texte
  plié qui suit ce que le PDF imprimera. Les textes fixes du catalogue ne sont
  pas masqués. Les clés de réponse hors définition sont masquées aussi.
- Deux passes de revue adverse, avec un correctif après chacune. La seconde a
  trouvé des régressions du premier correctif : des doses masquées comme des
  dates, « le petit » masqué comme un nom. D'où le corpus de non-régression
  `masquage.corpus.test.ts`, qui oppose fuites et fidélité clinique ; c'est lui
  l'oracle. Les limites sont écrites dans `D-252` §2 et dans l'en-tête du
  corpus.
- Instrument du cabinet modifié après la passation : codes bruts sous la
  réserve, jamais rapportés aux questions actuelles.
- Agenda illisible : saisies « en nombre inconnu », jamais comptées.

## 4. Fichiers modifiés

- Nouveaux :
  - `web/src/lib/export-dossier/` : modèle, masqueur, sections, lecture des
    réponses, rendu PDF, assembleur, et leurs tests ;
  - `web/src/app/api/praticien/export-dossier/route.ts` (+ test) ;
  - `web/src/components/patient-cockpit/ExportDossierPanel.tsx` (+ test) ;
  - `web/src/lib/scoring/descriptifsScores.ts` (+ test), aides d'affichage
    sorties de `FichePatientPanel.tsx` ;
  - `web/e2e/export-dossier.spec.ts`.
- Modifiés :
  - `web/src/components/FichePatientPanel.tsx` (le bouton) ;
  - `web/src/lib/documents/vocabulaire.ts` ;
  - `web/src/lib/ceQuiCompteAntiAgregat.guard.test.ts` ;
  - `scripts/specs-drapeau-ali01.test.mjs` (liste motivée) ;
  - `web/package.json` et son lock (`pdf-lib`) ;
  - `docs/claude/MATRICE_CONSOMMATION.md` (régénérée) ;
  - `docs/DECISIONS.md` (`D-252`) ;
  - `changelog.d/2026-09-26-export-pdf-dossier-patient.md`.

## 5. Validations exécutées

- Vitest, périmètre de l'export, gardes comprises : 587 verts, 16 fichiers.
- Corpus du masqueur : rejoué contre le masqueur d'avant la seconde passe, il
  donne 81 échecs sur 153. Il discrimine.
- `node --test scripts/specs-drapeau-ali01.test.mjs` vert, `tsc` vert.
- T1 vert. T2 vert : 625 fichiers Vitest (10 776 tests), build, 217 E2E
  Chromium et WebKit, dont `export-dossier.spec.ts`.
- Contre-revue finale (`wn-reviewer`), six affirmations à réfuter par script :
  un P1 corrigé, l'e-mail très pointé dont les variantes compilaient des
  milliers d'alternatives (serveur bloqué jusqu'à 2 min, plus de 10 min par
  les coordonnées du médecin). Quatre P2 corrigés : reste de chiffres non
  borné, abréviation « mar », rejet non-`Error` journalisé tel quel,
  sur-masquage des noms-mots non écrit. Un banc chronomètre désormais la
  construction sur des champs extrêmes.
- Copilot, un constat corrigé : un élément de score persisté `null` faisait
  tomber l'export (même défaut sur les sous-scores).
- Contre-audit Codex (P0, première passe) : BLOQUER sur deux P0, corrigés.
  - P0-1 : la protection de `PATnnn` coupait le texte avant la recherche ; un
    e-mail qui le contient survivait. Les motifs se cherchent désormais sur le
    texte entier et entre les occurrences.
  - P0-2 : le titre saisi à l'envoi sortait comme un texte fixe. C'est
    maintenant le titre de la définition, et le titre saisi n'est plus lu.
  - Les fixtures portent l'identité dans les titres saisis, et le balayage du
    document entier le prouve.
- Contre-audit Codex, passe de correction :
  - P0-1 et P0-2 sont confirmés corrigés.
  - Un P0 neuf est corrigé : le filtrage des plages protégées était
    quadratique ; 640 000 caractères qui répètent `PAT030` bloquaient le
    serveur 16 s. Il passe désormais par un balayage des deux listes triées.
  - Un banc à 640 000 caractères a été ajouté. Il rougit contre l'ancien
    filtre (mutation jouée, 7,8 s) et passe en 0,6 s.
- Baselines visuelles Linux régénérées par `visual-baselines` et relues
  image par image : seul le bouton neuf change.

## 6. Problèmes ouverts

- **Registre RGPD** (`D-252` §3) : l'inscription du traitement « analyse du
  dossier par un outil d'IA externe choisi par le praticien » reste à
  l'arbitrage du responsable, hors de ce lot.
- **Captures visuelles Linux** : le bouton neuf dans l'en-tête de la fiche peut
  faire rougir la capture `fiche-cockpit` au CI. Il faut alors la régénérer par
  le workflow `visual-baselines`.
- **Contre-audit Codex** (P0) : c'est un geste manuel du responsable.
- Choix à confirmer par le responsable :
  - « [interdit] » pour 🚫 et ⛔ ;
  - l'échelle « (échelle de 1 à 5) » réservée aux pseudo-items nommés de
    `Q_SOM_09`.
- Sur-masquage assumé : des nombres séparés qui reproduisent la date de
  naissance (« 14, 3, 85 % ») sont masqués.
- Lettres translittérées hors cp1252 (ł, ı) collées à un nom : le PDF imprime
  « ?Nicola ».

## 7. Prochaine action exacte

Merge de la PR après CI vert, lecture des commentaires en ligne et
contre-audit Codex, puis constat du déploiement Scalingo. Ensuite, un export
réel du dossier `PAT030` par le praticien, relu avant tout envoi.

## 8. Interdits encore actifs

- Aucune identité réelle au dépôt : le dossier de la demande se désigne
  `PAT030`, jamais par son nom.
- Pas de seed ni d'E2E sur un dossier réel. L'E2E vise `PAT_SEED_01`.
- Aucune règle clinique, aucun seuil touché par l'export. Toute évolution de
  ce qu'il restitue passe par `D-252`.
- Un merge à la fois (`D-248`).
