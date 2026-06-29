# Phase 3 - Booklet patient : contexte pre-deploiement

## Objectif du document

Ce fichier sert de contexte complet avant de deployer la Phase 3 du MVP Wellneuro NNPP2.

La Phase 3 transforme la synthese IA validee par le praticien en booklet patient consultable, imprimable et envoyable manuellement. Elle reste dans l'architecture actuelle Google Apps Script + Google Sheets. Aucune migration technique n'est incluse.

## Etat Git au moment de redaction

- Branche : `main`.
- Depot distant : `origin/main` synchronise.
- Dernier commit pousse : `269d458 feat: add validated patient booklet workflow`.
- Commits recents inclus :
  - `269d458 feat: add validated patient booklet workflow` ;
  - `d8113b0 fix: stabiliser rendu UI et synthese IA` ;
  - `8724a34 docs: add phase 2 AI validation and booklet context`.
- Aucun deploiement GAS n'a ete effectue apres ces commits.
- Prochaine etape technique : `clasp push`, creation d'une version Apps Script, puis deploiement sur le deployment web app existant si validation humaine.

## Rappel des contraintes critiques

- Ne jamais coder `SHEET_ID` en dur.
- `SHEET_ID` doit rester lu via `PropertiesService.getScriptProperties().getProperty('SHEET_ID')`.
- Ne jamais committer `ANTHROPIC_API_KEY`, `.env`, `.clasp.json`, `.clasprc.json`, jetons OAuth ou donnees patients reelles.
- Patients fictifs autorises uniquement : Sophie Nicola, Jennifer Martin, Michel Dogne.
- Ne pas inventer de protocole SIIN, seuil clinique ou dosage.
- Le booklet ne constitue pas un diagnostic medical.
- L'envoi patient doit rester manuel et conditionne a une validation praticien.

## Proprietes Apps Script necessaires

```text
SHEET_ID=...
WEB_APP_URL=...
ANTHROPIC_API_KEY=...
CLAUDE_MODEL=...
```

`CLAUDE_MODEL` peut rester optionnel si le fallback du code est conserve, mais il faut verifier que le modele configure existe bien cote Anthropic avant validation reelle.

## Ce qui a ete fait en Phase 2

### Synthese IA

Le code contient maintenant un workflow de synthese IA praticien :

- generation d'une synthese IA depuis les resultats questionnaires ;
- appel Claude via `UrlFetchApp` ;
- stockage dans `Syntheses_IA` ;
- validation du schema JSON minimal ;
- valeurs par defaut en cas de champs manquants ;
- detection d'erreurs API et de reponses tronquees ;
- statut `Brouillon_IA`, puis validation ou rejet par le praticien ;
- notes praticien sauvegardees.

### Securite et robustesse IA

Les points suivants ont ete durcis :

- plus de log partiel de `ANTHROPIC_API_KEY` ;
- logs API Claude reduits, sans corps de reponse complet ;
- erreurs d'audit neutralisees avec masquage emails, URLs et IDs ;
- feuille `Audit_Syntheses_IA` creee pour tracer les generations ou erreurs ;
- rendu HTML praticien durci contre les injections dans les listes, questionnaires, resultats et syntheses.

### Boucle praticien

L'interface praticien permet :

- generer une synthese IA ;
- afficher le brouillon ;
- ajouter des notes ;
- valider ;
- rejeter ;
- regenerer ;
- sauvegarder les notes apres validation.

## Ce qui a ete fait en Phase 3

### Generation du booklet patient

La Phase 3 ajoute la generation d'un booklet patient a partir d'une synthese validee.

Fonctions principales dans `src/gas/Code.gs` :

- `generateBookletHTML(idSynthese)` ;
- `buildBookletHTML_(patientNom, dateDocument, synthese, notesPraticien)` ;
- `sendBookletToPatient(idSynthese, forceSend, reviewConfirmed)` ;
- `getBookletSendInfo_(idSynthese)` ;
- `logBookletEnvoi_(...)` ;
- `validateBookletSynthese_(s)`.

Le booklet contient :

1. page de garde ;
2. resume patient accessible ;
3. axes prioritaires, maximum trois ;
4. points de vigilance ;
5. prochaines etapes ;
6. message praticien si notes disponibles ;
7. mention finale de validation humaine et absence de diagnostic medical.

### Conditions de generation

Le booklet ne peut etre prepare que si :

- la synthese existe ;
- son statut est `Validee_Praticien` ou `Corrigee_Praticien` ;
- le JSON de synthese est lisible ;
- la synthese contient au moins un contenu exploitable : narratif patient suffisant, axe prioritaire ou point de vigilance.

Si ces conditions ne sont pas remplies, l'interface affiche une erreur propre et l'envoi patient n'est pas possible.

### Date du document

Le booklet utilise la date de validation praticien si elle existe, avec fallback sur la date de generation de la synthese.

Cette date est affichee :

- dans le document HTML ;
- dans la previsualisation praticien.

### Previsualisation praticien

Dans `src/gas/index.html`, le workflow ajoute :

- bouton `Preparer le booklet patient`, visible uniquement apres validation ou correction praticien ;
- previsualisation HTML dans une iframe ;
- bouton `Imprimer / PDF` via impression navigateur ;
- destinataire affiche dans la previsualisation ;
- statut d'envoi affiche si le booklet a deja ete envoye.

### Envoi patient manuel

L'envoi est manuel, jamais automatique.

Le praticien doit :

1. generer ou charger une synthese ;
2. valider ou corriger la synthese ;
3. preparer le booklet ;
4. relire la previsualisation ;
5. cocher la confirmation explicite de relecture ;
6. confirmer l'envoi patient.

Le serveur verifie aussi `reviewConfirmed === true`. Un appel direct a `sendBookletToPatient` sans confirmation est refuse et journalise.

### Anti-double envoi

Si un booklet a deja ete envoye pour la synthese :

- la previsualisation l'indique ;
- la derniere date d'envoi est affichee ;
- l'email patient est affiche masque ;
- le bouton devient `Renvoyer au patient` ;
- le renvoi demande une confirmation renforcee.

### Audit des envois booklet

La feuille `Booklet_Envois` est creee ou mise a jour automatiquement.

Colonnes prevues :

```text
Date_Envoi
ID_Synthese
ID_Patient
Email_Patient_Masque
Statut
Operation
Relecture_Confirmee
Erreur_Technique_Courte
```

Les statuts/operations attendus incluent :

- `Envoye` ;
- `Erreur` ;
- `Confirmation_Requise` ;
- `Envoi` ;
- `Renvoi` ;
- `Preparation` ;
- `Blocage_Relecture`.

Les emails sont masques via `maskEmail_`. Les erreurs sont neutralisees via `sanitizeAuditError_`.

## Prompts et documentation ajoutes

### `prompts/generation_bilan_pdf.md`

Ce fichier definit le cadre editorial et clinique du booklet patient :

- objectif ;
- entrees attendues ;
- structure du booklet ;
- ton editorial ;
- regles cliniques ;
- contraintes de securite ;
- mention finale obligatoire.

### `prompts/siin_mini_corpus.md`

Ce fichier cree un mini-corpus SIIN manuel et prudent.

Il contient :

- axes cliniques principaux ;
- associations frequentes de scores ;
- points d'entretien prioritaires ;
- principes generaux SIIN ;
- ton editorial wellneuro.fr.

Attention : ce mini-corpus est une reference courte, pas un RAG, pas un corpus SIIN complet et pas une source de protocoles automatiques.

## Fichiers modifies par la Phase 3

- `src/gas/Code.gs` : logique serveur IA, booklet, audit et envoi manuel.
- `src/gas/index.html` : UI praticien, preview booklet, impression, confirmation de relecture, envoi manuel.
- `prompts/generation_bilan_pdf.md` : cadrage du booklet patient.
- `prompts/siin_mini_corpus.md` : mini-corpus SIIN prudent.

## Validations locales deja effectuees

Les validations suivantes ont ete executees avant commit et push Git :

```bash
perl -0ne 'while (m#<script[^>]*>(.*?)</script>#gs) { print $1, qq(\n) }' src/gas/index.html | node --check --input-type=commonjs
node --check --input-type=commonjs < src/gas/Code.gs
bash scripts/check_no_secrets.sh
git diff --check
```

Resultat :

- syntaxe JS extraite de `index.html` valide ;
- syntaxe `Code.gs` valide ;
- aucun secret evident detecte ;
- pas d'erreur `git diff --check` ;
- diagnostics VS Code sans erreur sur les fichiers touches au moment du commit.

## Ce qui reste a faire pour boucler la Phase 3

### 1. Validation reelle Phase 2 en Apps Script

Avant de valider la Phase 3 en production, il faut confirmer que la Phase 2 IA fonctionne reellement :

1. verifier `ANTHROPIC_API_KEY` dans les proprietes Apps Script ;
2. verifier `SHEET_ID` et `WEB_APP_URL` ;
3. executer `testSyntheseIA()` depuis l'editeur Apps Script ;
4. tester uniquement avec Sophie Nicola, Jennifer Martin ou Michel Dogne ;
5. verifier que `Syntheses_IA` et `Audit_Syntheses_IA` se creent correctement ;
6. verifier que l'absence de cle API ou une erreur API n'empeche pas l'affichage des resultats classiques.

### 2. Deploiement GAS controle

Le code est pousse sur GitHub, mais pas encore sur Apps Script.

Etapes recommandees :

```bash
clasp status
clasp push
clasp version "phase 3 booklet patient valide praticien"
clasp deploy -i <DEPLOYMENT_ID_EXISTANT> -V <VERSION> -d "phase 3 booklet patient valide praticien"
```

Utiliser le deployment web app existant, ne pas creer un nouveau deployment sauf besoin explicite.

### 3. Tests manuels Phase 3

Apres deploiement, tester dans l'interface web app :

1. selectionner un patient fictif avec au moins deux questionnaires completes ;
2. ouvrir les resultats praticien ;
3. generer une synthese IA ;
4. verifier le contenu prudent de la synthese ;
5. ajouter une note praticien ;
6. valider la synthese ;
7. cliquer `Preparer le booklet patient` ;
8. verifier la previsualisation ;
9. verifier la date du document ;
10. verifier le destinataire ;
11. tester `Imprimer / PDF` ;
12. verifier que le bouton d'envoi est bloque tant que la case de relecture n'est pas cochee ;
13. cocher la relecture ;
14. envoyer au patient fictif ;
15. verifier la reception email ;
16. verifier `Booklet_Envois` ;
17. tenter un renvoi et verifier la confirmation renforcee.

### 4. Verification Google Sheets

Verifier les feuilles suivantes :

- `Syntheses_IA` ;
- `Audit_Syntheses_IA` ;
- `Booklet_Envois` ;
- `Assignations` avec colonne J `ReminderSent` si les rappels sont actifs.

Points a verifier :

- pas de cle API ;
- pas de reponses patient completes dans les erreurs ;
- email masque dans `Booklet_Envois` ;
- statuts coherents ;
- notes praticien stockees au bon endroit.

### 5. Documentation de cloture

Apres validation reelle, mettre a jour :

- `CHANGELOG.md` ;
- eventuellement `docs/checklist_tests_end_to_end.md` ;
- ce fichier avec la version GAS deployee et le resultat des tests.

## Tests d'acceptation Phase 3

La Phase 3 peut etre consideree bouclee quand :

- la synthese IA fonctionne sur patient fictif ;
- une synthese peut etre validee par le praticien ;
- le booklet se prepare uniquement apres validation ;
- le booklet refuse une synthese illisible ou trop vide ;
- la preview affiche date et destinataire ;
- l'impression/PDF navigateur fonctionne ;
- l'envoi patient est manuel ;
- la relecture est exigee cote interface et cote serveur ;
- le renvoi demande confirmation ;
- `Booklet_Envois` trace l'envoi avec email masque ;
- aucune donnee sensible ou secret n'est introduit dans le depot ou les logs.

## Hors perimetre Phase 3 MVP

- Generation PDF native Google Drive/Docs.
- Signature electronique du praticien.
- Historique complet des booklets dans l'interface.
- Envoi automatique au patient.
- Portail patient avec telechargement autonome.
- RAG SIIN complet.
- Import massif de PDF SIIN.
- Migration Next.js, PostgreSQL, Auth0 ou hebergement HDS.

## Consolidation code (2026-06-28)

Verification automatisee :

- syntaxe JS `Code.gs` : OK ;
- syntaxe JS extraite de `index.html` : OK ;
- `check_no_secrets.sh` : OK ;
- coherence frontend/backend : toutes les fonctions appelees par `google.script.run` existent cote serveur ;
- `CHANGELOG.md` mis a jour (Phases 1, 2 et 3) ;
- `docs/checklist_tests_end_to_end.md` mis a jour (Phases 1, 2, 3 et securite).

## Recommandation avant deploiement

Ne plus ajouter de fonctionnalite Phase 3 avant le premier test reel.

Ordre recommande :

1. relire ce fichier ;
2. verifier les proprietes Apps Script ;
3. pousser vers Apps Script avec `clasp push` ;
4. creer une version ;
5. deployer sur le deployment existant ;
6. tester avec patient fictif en suivant `docs/checklist_tests_end_to_end.md` ;
7. noter les resultats ;
8. corriger uniquement les bugs observes ;
9. mettre a jour `CHANGELOG.md` avec la version GAS deployee.
