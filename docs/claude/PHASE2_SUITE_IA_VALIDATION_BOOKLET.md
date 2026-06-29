# Phase 2 - Suite : validation IA, mini-corpus SIIN et booklet

## Objectif

Ce fichier guide la suite de la Phase 2 apres la mise en place initiale de la synthese IA clinique.

La priorite n'est plus de creer l'infrastructure de base, car elle existe deja dans le code. La priorite est maintenant de la tester, la securiser, la durcir, l'ameliorer cliniquement et preparer le booklet patient.

## Etat actuel confirme

Le code contient deja une premiere implementation Phase 2A :

- `generateAISynthesisForPatient(patientEmail)` dans `src/gas/Code.gs` ;
- `callClaudeForSynthesis_(userMessage)` dans `src/gas/Code.gs` ;
- stockage dans la feuille `Syntheses_IA` ;
- `validateSynthesis(idSynthese)` dans `src/gas/Code.gs` ;
- `rejectSynthesis(idSynthese)` dans `src/gas/Code.gs` ;
- bouton `Generer une synthese IA` dans `src/gas/index.html` ;
- rendu via `renderSynthese(r)` ;
- validation praticien via `validerSynthese()`.

La suite Phase 2 doit donc etre une phase de stabilisation et d'enrichissement, pas une reconstruction.

## Regles critiques

- Ne jamais committer de cle API.
- La cle Anthropic doit rester dans les proprietes Apps Script : `ANTHROPIC_API_KEY`.
- Ne jamais envoyer de donnees patient inutiles a l'API.
- Ne jamais affirmer que l'IA utilise un corpus SIIN complet tant que ce corpus n'existe pas.
- Ne pas inventer de protocole SIIN.
- Ne pas inventer de seuil clinique.
- Ne pas proposer de dosage precis sans validation clinique.
- Toute synthese IA reste un brouillon a valider par le praticien.
- Interface, textes et prompts utilisateur en francais.

## Proprietes Apps Script necessaires

```text
SHEET_ID=...
WEB_APP_URL=...
ANTHROPIC_API_KEY=...
CLAUDE_MODEL=...
```

`CLAUDE_MODEL` peut rester optionnel si le code fournit un fallback. Verifier cependant que le modele configure existe reellement cote Anthropic.

Ne jamais ajouter ces valeurs dans le depot, les logs, les issues ou les commits.

## Priorite 1 : validation reelle de la synthese IA

Objectif : verifier que la synthese fonctionne en situation controlee.

Etapes :

1. Verifier que `ANTHROPIC_API_KEY` est bien configuree dans les proprietes Apps Script.
2. Executer `testSyntheseIA()` depuis l'editeur Apps Script.
3. Tester uniquement avec patients fictifs autorises : Sophie Nicola, Jennifer Martin et Michel Dogne.
4. Verifier que la synthese ne mentionne pas de corpus SIIN complet.
5. Verifier que la synthese reste prudente : hypotheses, axes a explorer, points a confirmer.
6. Verifier que le bouton `Valider la synthese` fonctionne.
7. Verifier que la feuille `Syntheses_IA` est creee et alimentee correctement.
8. Verifier qu'une erreur API n'empeche jamais l'affichage des resultats classiques.

## Priorite 2 : securite et logs

Points a corriger ou verifier :

- Ne pas logger meme partiellement la cle API.
- Eviter les logs contenant des donnees patient identifiantes.
- Ne pas logger les reponses completes des patients.
- Garder les erreurs techniques utiles, mais sans donnees sensibles.
- Ajouter si necessaire une feuille d'audit simple.

Audit minimal recommande :

```text
Date_Generation
ID_Patient
Modele
Version_Prompt
Statut
Erreur_Technique_Courte
```

Eviter de stocker dans les logs :

- telephone ;
- date de naissance ;
- reponses brutes completes ;
- cle API ;
- contenu complet retourne par l'IA si donnees patient reelles.

Attention : si une fonction de test logge le debut de `ANTHROPIC_API_KEY`, elle doit etre durcie avant usage prolonge.

## Priorite 3 : robustesse JSON

Le prompt demande une reponse JSON stricte, mais un LLM peut parfois renvoyer :

- du texte avant le JSON ;
- des blocs Markdown ;
- des champs manquants ;
- des virgules finales ;
- une structure partielle.

A renforcer :

1. Verifier que `resume_praticien` existe.
2. Verifier que `axes_prioritaires` est un tableau.
3. Verifier que `points_de_vigilance` est un tableau.
4. Verifier que `questions_entretien` est un tableau.
5. Verifier que `narratif_patient` existe.
6. Si un champ manque, fournir une valeur par defaut.
7. Ne pas stocker une synthese vide comme `Brouillon_IA`.
8. Ajouter une version de schema pour pouvoir faire evoluer la structure.

Structure minimale attendue :

```json
{
  "resume_praticien": "...",
  "axes_prioritaires": [],
  "points_de_vigilance": [],
  "questions_entretien": [],
  "narratif_patient": "...",
  "limites": "Synthese generee par IA sans corpus SIIN complet, a valider par le praticien."
}
```

## Priorite 4 : feedback praticien

La feuille `Syntheses_IA` prevoit deja :

- `Validation_Praticien` ;
- `Notes_Praticien`.

La boucle de correction doit etre amelioree.

MVP attendu :

- bouton `Valider la synthese` ;
- bouton `Rejeter` ;
- champ `Notes praticien` ;
- sauvegarde des notes dans `Syntheses_IA` ;
- possibilite de regenerer une synthese apres correction du prompt.

Objectif : transformer les corrections praticien en materiau pour ameliorer le prompt SIIN minimal.

Statuts recommandes :

```text
Brouillon_IA
Validee_Praticien
Corrigee_Praticien
Rejetee
Erreur
```

## Priorite 5 : mini-corpus SIIN

Ne pas lancer un RAG complet maintenant.

Creer d'abord un mini-corpus manuel, court et maitrise.

Fichier recommande :

```text
prompts/siin_mini_corpus.md
```

Contenu attendu :

1. Les axes cliniques principaux : stress / axe HPA, sommeil, digestion / intestin-cerveau, inflammation, energie / fatigue, humeur, cognition.
2. Les associations frequentes de scores.
3. Les points d'entretien prioritaires.
4. Les principes generaux SIIN valides.
5. Le ton editorial wellneuro.fr.

Interdits :

- dosages precis non valides ;
- protocoles inventes ;
- citations de cours non importes ;
- recommandations therapeutiques presentees comme automatiques.

## Priorite 6 : preparation booklet patient

La synthese IA doit preparer le futur booklet, mais ne doit pas encore l'envoyer automatiquement au patient.

Structure cible du booklet :

1. Page de garde.
2. Resume patient accessible.
3. Profil neuronutritionnel.
4. Ce que les questionnaires suggerent.
5. Trois priorites maximum.
6. Objectifs du mois.
7. Message de validation praticien.
8. Mention : document genere apres validation du praticien.

Premiere etape technique :

- reutiliser `narratif_patient` produit par la synthese IA ;
- ajouter un bouton praticien `Preparer le booklet` apres validation ;
- generer d'abord une previsualisation HTML ;
- ne pas envoyer automatiquement au patient avant validation humaine.

## Fichiers concernes

### Serveur GAS

- `src/gas/Code.gs`
  - `generateAISynthesisForPatient` ;
  - `callClaudeForSynthesis_` ;
  - `buildSyntheseUserMessage_` ;
  - `validateSynthesis` ;
  - `rejectSynthesis` ;
  - `getLatestSynthesis`.

### Interface

- `src/gas/index.html`
  - `generateSynthese` ;
  - `renderSynthese` ;
  - `validerSynthese` ;
  - zone `ia-synthese`.

### Prompts

- `prompts/synthese_multi_questionnaires.md`
  - a enrichir avec le prompt prudent reel ;
- `prompts/siin_mini_corpus.md`
  - a creer quand Martial fournit les premiers elements SIIN ;
- `prompts/generation_bilan_pdf.md`
  - futur gabarit booklet.

## Tests minimum avant deploiement

1. `bash scripts/check_no_secrets.sh`.
2. Verifier syntaxe `Code.gs`.
3. Verifier syntaxe des scripts de `index.html`.
4. Tester generation IA sur un patient fictif avec au moins deux questionnaires.
5. Tester absence de cle API : l'interface doit afficher une erreur propre.
6. Tester erreur API Claude : les resultats classiques doivent rester visibles.
7. Tester validation praticien.
8. Tester rejet praticien si le bouton est ajoute.
9. Verifier creation et contenu de `Syntheses_IA`.
10. Verifier qu'aucune donnee patient reelle n'est dans le depot.

## Points de vigilance techniques

- `UrlFetchApp` peut echouer pour timeout, quota ou erreur HTTP Anthropic.
- Une synthese longue peut depasser `max_tokens`.
- Le modele configure peut etre obsolete ou non disponible.
- La feuille `Syntheses_IA` peut grossir vite si chaque regeneration cree une ligne.
- L'interface doit rester utilisable meme si l'IA echoue.
- Le prompt doit toujours rappeler l'absence de corpus SIIN complet.

## Hors perimetre immediat

- Import massif de PDF SIIN.
- RAG vectoriel.
- Migration Next.js.
- PostgreSQL.
- Auth0.
- Hebergement HDS.
- Coaching patient autonome.
- Envoi automatique du booklet au patient sans validation.
- Recommandations posologiques personnalisees.

## Definition of done

La suite Phase 2 est consideree prete quand :

- la synthese IA fonctionne avec une cle configuree ;
- elle echoue proprement sans cle ou en cas d'erreur API ;
- le praticien peut valider ou rejeter ;
- les notes praticien sont stockees ;
- le prompt ne pretend pas utiliser un corpus SIIN complet ;
- un mini-corpus SIIN peut etre injecte sans modifier la logique clinique ;
- la base technique du booklet est prete ;
- l'envoi au patient reste soumis a validation praticien.
