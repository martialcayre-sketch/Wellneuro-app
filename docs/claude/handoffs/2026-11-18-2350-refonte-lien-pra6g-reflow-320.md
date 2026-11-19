# Handoff — 2026-11-18 — Refonte Lien / Empreinte, PRA-6g : reflow à 320 px (P25, P46)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra6g-reflow-320-87fbf9`, worktree `.claude/worktrees/refonte-lien-pra6g-reflow-320-87fbf9`, avancée par `--ff-only` jusqu'à `1354683d` (#2246).
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> » (D-373, D-454).

## Objectif

Le lot PRA-6g du constat PRA-6 (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/pra6-constat.md`, §3.7, règle `horizontal-scroll`, WCAG 1.4.10) : supprimer les deux débordements à 320 px (zoom 200 % du téléphone), le prouver par un E2E, et mesurer, sans les corriger, les seize écrans qui débordent à 195 px.

## Décisions prises

- **P25, onglet Biologie, import d'un compte rendu (62 px).** Mesuré : le libellé et le champ fichier occupent 340 px dans une place de 236 px. Le champ fichier impose sa largeur propre comme largeur minimale du libellé (item flex, `min-width: auto`). Correctif : `min-w-0 max-w-full` sur le libellé et le champ (`ImportCompteRenduPanel.tsx`). Le libellé se replie et « Déposer » passe à la ligne. Au bureau (1 280 px), la disposition est inchangée, vérifiée en capture. `FichePatientPanel.tsx` n'est pas touché.
- **P46 identifié.** C'est le rayon Connaissances (`/dashboard/bibliotheque/connaissances`). Les 5 px viennent d'un **texte** et non d'un élément, ce qui explique que le constat n'ait nommé personne. Le message affiché quand `WN_RECHERCHE_CORPUS_ENABLED` est éteint contient le nom du drapeau, un mot sans espace. Correctif : `break-words` sur la carte du message (`connaissances/page.tsx`). Recherche ouverte (drapeau allumé), l'écran tenait déjà à 320 px sous Chromium et WebKit, mesuré.
- **Banc.** Pas de nouveau fichier. `e2e/bibliotheque-mobile.spec.ts`, le seul banc de reflow pleine page qui nomme le coupable, reçoit un `describe` à 320 px (P46, P25). La largeur est posée par le test, donc les deux projets le jouent : Chromium et WebKit (iPhone 13). Son détecteur, factorisé dans le même fichier, compte aussi les nœuds de texte : sans eux, P46 restait anonyme. Le test existant (Questionnaires) passe par le même détecteur, sans changement d'attente.
- **P46 joué dans ses deux états.** Le banc ne pose pas le drapeau, mais un `.env.local` de poste peut le poser : le test attend soit le message, soit le bouton « Rechercher ».
- **T1 et T2 sous `TMPDIR` isolé**, voir les validations.

## Fichiers modifiés

- `web/src/components/patient-cockpit/ImportCompteRenduPanel.tsx` (classes du libellé et du champ fichier, un commentaire).
- `web/src/app/dashboard/bibliotheque/connaissances/page.tsx` (`break-words`).
- `web/e2e/bibliotheque-mobile.spec.ts` (détecteur partagé, éléments et textes ; deux tests à 320 px).
- `changelog.d/2026-11-18-refonte-lien-pra6g-reflow-320.md`, ce handoff.

## Validations exécutées

- Mesure avant correctif (Playwright local, `next dev`, base locale seedée, fixtures `PAT_DEMO_01` et `PAT_SEED_01`), à 320 px sous Chromium et WebKit : P25 à 62 px, P46 à 5 px, les valeurs exactes du constat.
- Le banc étendu a été joué contre le serveur de dev **sans le correctif** : quatre rouges sur quatre. Chacun nomme son coupable : `texte dans div[rounded-xl … p-5 …]` pour P46, `label[flex flex-col …] | input[text-sm text-foreground]` pour P25. **Avec le correctif** : six verts sur six, test Questionnaires compris, sous les deux moteurs.
- T1 complet (`npm run check`) : un rouge, `scripts/wn-codex-avis.test.mjs` « dossier temporaire supprimé ». Instruit : le test compare le `TMPDIR` **partagé** avant et après son banc, et deux dossiers `wn-codex-p0-test-*` d'une autre session y sont apparus pendant le run (des centaines y traînent depuis le 2026-11-16). Le diff ne touche pas `scripts/`. Rejoué avec un `TMPDIR` isolé : 0.
- T2 (`npm run test:worktree -- --fast`, `TMPDIR` isolé, joué seul sur le Mac après attente) : résultat à la PR.
- Captures de référence : `visual.spec.ts` ne couvre ni l'onglet Biologie ni Connaissances, donc aucune régénération.

## Problèmes ouverts (restes) — proposition de lot « 195 px »

Mesuré le 2026-11-18, sous WebKit (projet iPhone 13), à 195 × 332 (zoom 200 % sur 390 px), sur fixture, **après** les correctifs de PRA-6a à 6d, 6i et 6g. Les chiffres diffèrent donc du constat. Sont relevés les éléments débordants les plus extérieurs et les nœuds de texte. Les causes sont *probables* : elles sont lues sur la mesure, pas éprouvées par un correctif.

| Écran | Débord. (constat → mesure) | Cause probable |
|---|---|---|
| P01 Fil | 91 → 6 | « Jamais montrée aux patients » (`span text-xs`) dans une ligne sans repli |
| P25 Biologie | 187 → 48 | `SaisieBilan` : `div.min-w-48` (192 px) du choix d'analyte, et le champ voisin |
| P33 Agenda | 75 → 75 | formulaire « Planifier un rendez-vous » et « Rendez-vous à venir » à 254 px : un enfant de largeur minimale ; titre `text-3xl` « Agenda & consultations » |
| P34 Copilote | 17 → 17 | titre `text-3xl` « Consultation copilote » (mot long au corps 30 px) |
| P35 Trajectoires | 33 → 0 | tient (corrigé en amont) |
| P36 Cabinet | 57 → 0 | tient (corrigé en amont) |
| P37 Questionnaires | 73 → 73 | titre `text-3xl` « Questionnaires » ; rangée « Modifier / Désactiver » en `shrink-0` ; « 64/64 instruments » |
| P40 Analyses biologiques | 99 → 99 | `<select>` des prélèvements (largeur de sa plus longue option) ; codes `font-mono` sans espace (`POP_…`) |
| P44 Compléments | 77 → 35 | titre `text-3xl` « Compléments alimentaires » |
| P46 Connaissances | 130 → 49 | titre `text-3xl` « Connaissances » ; recherche ouverte : champ `min-w-[16rem]` (256 px) |
| P47 Corpus | 40 → 40 | rangée `flex items-center gap-2` « Notebook » sans repli |
| P49 Règles | 94 → 0 | tient (la liste « Intention clinique » rognée à 320 px n'a pas été revue) |
| P51 Synthèse, P52 Documents | 7 → 7 | non identifiée par le détecteur des plus extérieurs : à instruire |
| P53 Correspondance | 74 → 74 | titre `text-3xl` « Correspondance » ; deux cartes à 199 px |
| P57 Paramètres | 73 → 73 | cartes à 252 px : `dd` sans coupure (adresse e-mail du praticien, valeurs `font-mono`) |

Familles, par ordre de rendement :
1. Titre de page `text-3xl` (`EnTeteRayon` et titres équivalents) : un mot long dépasse à 195 px (P33, P34, P37, P44, P46, P53). Un `break-words`, ou un `hyphens-auto` sous `lang="fr"`, toucherait six écrans d'un geste.
2. Codes et valeurs `font-mono` sans espace (P40, P57) : `break-all` ou `break-words` au cas par cas.
3. Largeurs minimales fixes (`min-w-48`, `min-w-[16rem]`) et rangées `shrink-0` (P25, P46, P37).
4. Listes `<select>` natives à longue option (P40).
5. P01, P47, P51, P52 : cas isolés.

Autres restes :
- La sévérité reste celle d'une convention, pas d'un critère normatif : le responsable choisit d'ouvrir le lot ou non.
- Sur P49, la liste « Intention clinique » rognée par son conteneur à 320 px (§3.7) n'est pas traitée par ce lot.
- Le test `wn-codex-avis` (T1) dépend du `TMPDIR` partagé : faux rouge dès qu'une autre session crée un `wn-codex-p0-test-*` pendant le run. Hors périmètre, à router.

## Prochaine action exacte

Attendre le merge par l'intégrateur. Lot suivant de l'ordre retenu : PRA-6h. Ensuite, si le responsable l'ouvre, le lot « 195 px » ci-dessus.

## Interdits encore actifs

- Ni route, ni garde, ni drapeau, ni schéma, ni règle clinique.
- Aucun texte d'interface neuf, aucun libellé raccourci ; aucun décor avant COM-1 ; identités de fixture seulement.
- `FichePatientPanel.tsx` reste à PRA-6f tant que sa PR n'est pas mergée.
- La session ne merge pas.
