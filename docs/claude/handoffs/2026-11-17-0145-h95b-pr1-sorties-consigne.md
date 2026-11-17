# Handoff — 2026-11-17 — H95 part B, lot de code, PR 1 de 2 : consigne v36, schéma v4, sorties par liste de champs, contrôle de contamination

## Branche et état Git

- Branche `b-h95-b-code`, dans le worktree `.claude/worktrees/b-f34-etape3-1` (réutilisé après le merge de #2208), tirée d'`origin/main` puis avancée par `--ff-only` (7535d667). Aucune fusion, aucun rebase.
- Session concurrente de la file B : `git` et `gh` en direct, sans `/wn-*`.
- PR 1 : hors de `web/src/lib/clinical/**`, aucune migration, donc aucune `release-db`.

## Objectif

Lot `h95-b-code` du carnet (ordre 72) : le code de D-513, bloc déterministe de biologie de la synthèse. La découpe en deux PR a été tranchée par `20261117-0900-b`. Cette PR 1 prépare les sorties et la consigne. Aucune biologie ne part encore au modèle.

## Décisions prises

- `20261117-0900-b` : deux PR. La PR 1 porte la consigne, le schéma, les listes de champs, le contrôle et `priorite-v2`. La PR 2 porte le constructeur, le drapeau, les textes du §12 et le dossier RGPD.
- `20261117-0901-b` : les textes sont validés tels quels (`docs/claude/propositions/2026-11-17-h95b-code-textes/README.md`) :
  - le contrat de sortie ;
  - `priorite-v2` ;
  - les textes du §12 : dossier RGPD, « Vos données personnelles » v24, « L'intelligence artificielle dans Wellneuro » v9, conditions v7 et e-mail @7 ;
  - le nom du drapeau, `WN_SYNTHESE_BIOLOGIE_ENABLED`.
- Les identifiants `0900-b` et `0901-b` sont mal horodatés : les questions ont été posées à 01:18, heure de Paris. Ils sont gardés, avec une note au registre.
- D-513 §7 a été relu après D-519 : aucune contradiction. Une note datée a été ajoutée à D-513 (amendement du 2026-11-17).
- Revue `wn-reviewer` : GO avec réserves. Verdicts :
  - P1-1 corrigé : le PATCH `enregistrer` rend le verdict recalculé et le client le pose. Une correction lève donc le blocage à l'écran.
  - P2-1 corrigé : `valider` réécrit le texte qu'il vient de contrôler. « Validée » vaut donc « contrôlée », et le booklet, le bilan du portail et « Ce que j'ai compris » n'ont pas besoin de garde propre.
  - P2-2 corrigé : pour une synthèse qui n'est plus un brouillon IA, le motif renvoie à une nouvelle synthèse.
  - P2-3 écarté : `null` sur une synthèse suspecte confond suspecte et absente pour l'appel de priorité. Le cas est théorique depuis P2-1, et le blocage est journalisé.
  - P2-4 corrigé par un banc : l'échappement est complet et une trace aux caractères spéciaux ne fait pas lever le détecteur. Aucun `try/catch` n'est ajouté.
  - P2-5 corrigé par un banc : le faux positif sans frontière des intervalles est fixé comme limite déclarée du §5. Note pour la PR 2 : la trace porte les intervalles en texte brut, jamais encodés.
  - P2-6 noté : le GET lit `donneesEntree`. C'est voulu, et à surveiller.
  - P2-7 écarté : la ligne de journal de l'impression porte `route: interne:impression_medecin`, ce qui reste lisible.
  - P2-8 routé : voir « Problèmes ouverts ».
- Contre-revue Codex P0 (`wn-codex-avis.mjs --mode revue`, avis conforme, déposé sur la PR) : deux P2, aucun P0 ni P1. Verdicts :
  - premier P2 corrigé : un bloc présent mais illisible, sous un schéma antérieur à v4, échappait à la règle des anciennes synthèses. La présence du bloc se juge désormais avant sa lecture détaillée ;
  - second P2 corrigé : le motif suit le statut de la synthèse à chaque sortie. Une synthèse validée renvoie donc à une nouvelle synthèse, et non à l'éditeur.

## Fichiers modifiés

- Consigne et schéma :
  - `web/src/lib/anthropic.ts` : v36, json-v4, contrat, `CHAMPS_BIOLOGIE_SYNTHESE`, lectures stricte et tolérante.
- Contrôle de contamination :
  - nouveaux : `web/src/lib/synthese/contaminationBiologie.ts` et `gardeContamination.ts` ;
  - `web/src/lib/observability/eventCodes.ts` (`SYNTHESE_IA.BIOLOGIE_HORS_CHAMPS`) ;
  - `web/src/lib/observability/sanitizeLogData.ts`.
- Listes de champs autorisés :
  - nouveau : `web/src/lib/synthese/projectionSorties.ts` ;
  - branchées dans `documents/compositionSynthese.ts`, `export-dossier/assembler.ts`, `export-dossier/sectionSynthese.ts` et `objectif/matierePriorite.ts`.
- Gardes des routes : `api/praticien/synthese/route.ts` (GET, PATCH valider et enregistrer), `api/praticien/documents/route.ts`, `api/praticien/documents/medecin/impression/route.ts`.
- Interface : `components/SynthesePraticienEditor.tsx` (`limites` éditable) et `components/SynthesePanel.tsx` (biologie en lecture seule, motif de blocage).
- `web/src/lib/objectif/propositionPriorite.ts` (`priorite-v2`).
- Bancs nouveaux :
  - `promptBiologie.guard.test.ts` : la section comparée au texte de D-513, puis épinglée ;
  - `contaminationBiologie.test.ts` ;
  - `projectionSorties.test.ts`.
- Bancs complétés : route de validation, aperçu, impression, export dans ses deux versions, éditeur, garde de la priorité. Empreintes v36 reportées.
- Documentation :
  - `docs/decisions/D-513.md` (note datée) ;
  - la proposition des textes ;
  - `changelog.d/2026-11-17-h95b-pr1-sorties-consigne-v36.md` ;
  - `docs/claude/plan-journal/H95/2026-11-17-01-part-b-code-pr1-sorties.md` ;
  - ce handoff.

## Validations exécutées

- `npm run check:rapide` vert, puis `npm run check` vert.
- Suites touchées : vertes (1 208 tests, puis 67 après les corrections de la revue).
- Premier T3 (`npm run test:worktree`) : rouge sur deux bornes de temps de `masquage.test.ts`. Ce fichier n'est pas touché par le lot, il passe seul (170/170), et ses bornes cèdent sous la charge du T3 complet. Le segment E2E n'avait pas tourné. Second T3, sur l'état d'avant la contre-revue Codex : vert en entier, E2E compris (412 passés, 10 min 57 s).
- Après les corrections Codex : `npm run check` rouge sur un seul banc, `scripts/wn-codex-avis.test.mjs` (« dossier temporaire supprimé »), qui a trouvé un dossier temporaire d'un passage concurrent. Ce script n'est pas touché par le lot et passe seul (30/30). Les suites touchées passent : 213, puis 1 254 tests.
- `promptBiologie.guard.test.ts` compare la section de la consigne au texte cité dans D-513 §3 : elle est identique au caractère près. `wn-reviewer` l'a vérifié de son côté par `diff`.

## Problèmes ouverts

- **Préexistant, hors lot** : dans `sanitizeLogData.ts`, les entrées `narratif_patient` et `resume_praticien` ne correspondent jamais, parce que `normalizeSensitiveKey` retire les soulignés. Ces deux champs ne sont donc pas masqués dans le journal. C'est à router en lot propre (file D, observabilité).
- La PR 2 reste à faire : constructeur sous `web/src/lib/clinical/` (donc `release-db`), drapeau éteint, trace `donneesEntree.blocBiologie` `{ texte, formes }` (le type est dans `contaminationBiologie.ts`), textes du §12 et dossier RGPD, banc de chaîne, évaluation sur dossiers fictifs.

## Prochaine action exacte

1. Merger la PR 1 (intégrateur).
2. Partir d'`origin/main` pour la PR 2 :
   - suivre le chemin du cockpit (`api/praticien/biologie/resultats`, `serieParAnalyte`) ;
   - écrire le constructeur et ses bancs (§11) ;
   - brancher le constructeur dans `generation.ts`, après le bloc des besoins, sous `WN_SYNTHESE_BIOLOGIE_ENABLED` et `isCbResultsEnabled` ;
   - publier les textes du §12, tels que validés, au registre et dans le dossier RGPD ;
   - mener l'évaluation fictive avant de déclarer la PR prête.

## Interdits encore actifs

- Aucun seuil, aucune règle, aucun texte clinique inventés. Les textes sont ceux de D-513 et de la proposition validée.
- Pas de pose du drapeau : c'est le geste du responsable, après les trois préalables du §12. Aucun dossier réel visé par un seed ou un E2E.
- Forme opaque au dépôt (D-251 §4). Pas de merge : c'est le rôle de l'intégrateur.
- Si `main` avance avec un fichier commun, demander au responsable.
- L'envoi de l'e-mail `conditions_utilisation@7` reste le geste du responsable.
