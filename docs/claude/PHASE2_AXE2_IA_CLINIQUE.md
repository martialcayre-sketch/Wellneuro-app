# Phase 2 - Axe 2 : IA clinique prudente et synthese multi-questionnaires

## Objectif

Mettre en place une premiere couche d'IA clinique utile au praticien, sans attendre la constitution complete du corpus scientifique SIIN.

La Phase 2 ne doit pas pretendre remplacer le jugement clinique. Elle doit produire une aide structuree : synthese multi-questionnaires, hypotheses prioritaires, narratif patient et preparation du futur booklet.

## Positionnement produit

Phase 1 a industrialise le flux pre-consultation : le patient recoit un lien, complete les questionnaires en ligne, les scores sont disponibles cote praticien.

Phase 2 exploite ces resultats pour reduire le temps d'analyse et preparer un livrable qualitatif.

Priorite recommandee :

1. Synthese multi-questionnaires praticien.
2. Narratif patient pour booklet.
3. Corpus SIIN minimal embarque dans le prompt.
4. Corpus SIIN progressif, puis RAG seulement si le volume documentaire le justifie.

## Point cle : corpus SIIN non constitue

Le corpus scientifique SIIN complet n'est pas encore structure.

Donc, pour la premiere version, l'IA ne doit pas affirmer qu'elle s'appuie sur une base SIIN complete.

Elle peut s'appuyer sur :

- les scores calcules par le MVP ;
- les interpretations deja presentes dans `Questions.gs` ;
- des connaissances generalistes sur les questionnaires valides ;
- un cadre SIIN minimal fourni manuellement dans le prompt systeme ;
- la validation finale du praticien.

Elle ne doit pas :

- inventer de protocole SIIN ;
- inventer de seuil clinique ;
- citer des cours, PDF ou sources SIIN qui n'ont pas ete fournis ;
- recommander des dosages precis sans cadre valide ;
- generer une conclusion diagnostique definitive.

## Ce qui fonctionne des maintenant sans RAG

Claude peut deja produire une synthese utile sur les questionnaires standards :

- HAD ;
- PSS-10 ;
- DASS-21 ;
- BDI-13 ;
- MFI ;
- PSQI ;
- Epworth ;
- Berlin ;
- chronotype si les scores sont explicites ;
- scores digestifs, fatigue, sommeil, humeur, stress si le MVP fournit les sous-scores.

La synthese doit rester formulee comme :

- `hypothese` ;
- `axe a explorer` ;
- `priorite clinique probable` ;
- `point de vigilance` ;
- `a confirmer par l'entretien`.

Eviter les formulations de diagnostic ferme.

## Architecture technique Phase 2A (GAS-native)

Conserver Google Apps Script + Google Sheets.

Ajouter une integration LLM via `UrlFetchApp`, avec cle API stockee uniquement dans les proprietes du script.

Proprietes Apps Script envisagees :

```text
ANTHROPIC_API_KEY=...
CLAUDE_MODEL=claude-3-5-sonnet-latest
```

Ne jamais committer ces valeurs.

Fichiers principaux :

- `src/gas/Code.gs` : fonctions serveur, appel API, stockage syntheses.
- `src/gas/index.html` : bouton praticien, affichage synthese, validation / correction.
- `src/gas/Questions.gs` : ne pas modifier les scores ni seuils sans demande explicite.
- `prompts/synthese_multi_questionnaires.md` : gabarit prompt a enrichir.
- `prompts/generation_bilan_pdf.md` : futur gabarit booklet.

## Donnees disponibles cote code

La fonction `getQuestionnaireResults(patientEmail)` retourne deja :

- `idQuestionnaire` ;
- `titre` ;
- `date` ;
- `scores` ;
- `scorePrincipal` ;
- `interpretation` ;
- les sous-scores si presents.

C'est le point d'entree naturel de la Phase 2.

## Nouvelle feuille proposee : Syntheses_IA

Colonnes recommandees :

```text
ID_Synthese
ID_Patient
Email_Patient
Date_Generation
Modele
Version_Prompt
Resultats_JSON
Synthese_JSON
Statut
Validation_Praticien
Notes_Praticien
```

Statuts possibles :

```text
Brouillon_IA
Validee_Praticien
Corrigee_Praticien
Rejetee
Erreur
```

Objectif : tracer ce que l'IA a produit et ce que le praticien a valide.

## Fonctionnalites Phase 2A MVP

### 1. Bouton praticien : Generer synthese IA

Dans l'onglet resultats, apres selection d'un patient :

- afficher les resultats existants ;
- ajouter un bouton `Generer une synthese IA` ;
- envoyer les resultats du patient au serveur ;
- appeler Claude ;
- afficher une synthese structuree ;
- permettre au praticien de valider ou corriger.

### 2. Sortie IA attendue en JSON

Demander une sortie stricte, par exemple :

```json
{
  "resume_praticien": "...",
  "axes_prioritaires": [
    {
      "axe": "Stress / axe HPA",
      "niveau_priorite": "eleve",
      "arguments": ["PSS-10 eleve", "fatigue importante"],
      "points_a_confirmer": ["qualite du sommeil", "rythme alimentaire"]
    }
  ],
  "points_de_vigilance": ["..."],
  "questions_entretien": ["..."],
  "narratif_patient": "...",
  "limites": "Synthese generee sans corpus SIIN complet, a valider par le praticien."
}
```

### 3. Validation praticien obligatoire

Aucune synthese ne doit etre presentee comme finale sans validation humaine.

Boutons recommandes :

- `Valider la synthese` ;
- `Modifier avant validation` ;
- `Regenerer` ;
- `Rejeter`.

Pour MVP, `Valider` + `Regenerer` suffisent.

## Prompt systeme minimal

Principes :

- parler francais ;
- s'adresser au praticien dans la partie clinique ;
- s'adresser au patient dans le narratif patient ;
- rester prudent ;
- ne pas inventer de source ;
- utiliser les interpretations fournies par le logiciel comme donnees d'entree ;
- signaler quand les donnees sont insuffisantes.

Exemple de cadrage :

```text
Tu es un assistant d'aide a la synthese en neuronutrition. Tu aides un praticien a organiser les resultats de questionnaires.
Tu ne poses pas de diagnostic medical. Tu formules des hypotheses, priorites et questions d'entretien.
Tu t'appuies uniquement sur les scores et interpretations fournis.
Le corpus SIIN complet n'est pas encore disponible : n'invente pas de protocole SIIN et ne cite pas de source absente.
Toute recommandation doit rester generale et etre presentee comme a valider par le praticien.
Reponds en JSON strict.
```

## Corpus SIIN progressif

Ne pas commencer par importer 100 PDF.

Construire d'abord un mini-corpus manuel de 3 a 5 pages :

1. Axes cliniques utilises par Martial : stress / HPA, sommeil, digestion, inflammation, energie, humeur, cognition.
2. Associations frequentes de scores.
3. Priorites d'entretien.
4. Protocoles non posologiques ou principes generaux, si valides.
5. Ton editorial wellneuro.fr.

Quand le mini-corpus est stabilise, l'injecter directement dans le prompt systeme.

Le RAG complet n'est justifie que si le corpus devient trop volumineux pour le prompt ou si la citation de sources internes devient une exigence produit.

## Donnees RGPD et securite

- Utiliser uniquement des patients fictifs en developpement.
- Minimiser les donnees envoyees a l'API : scores, interpretations, dates relatives si possible.
- Eviter d'envoyer telephone, date de naissance, adresse ou donnees inutiles.
- Ne jamais logguer la cle API.
- Ne jamais stocker de donnees patient reelles dans le depot.
- Prevoir une mention claire : synthese IA a valider par le praticien.

## Tests minimum

Avec Sophie Nicola, Jennifer Martin et Michel Dogne uniquement :

1. Generer une synthese IA pour un patient ayant au moins 2 questionnaires.
2. Verifier que le JSON est parseable.
3. Verifier que la synthese cite uniquement les scores fournis.
4. Verifier qu'elle ne mentionne pas de corpus SIIN absent.
5. Verifier qu'une erreur API n'empeche pas l'affichage des resultats classiques.
6. Lancer `bash scripts/check_no_secrets.sh`.
7. Pousser avec `clasp push`, puis creer une version GAS et deployer si le test local est concluant.

## Definition of done Phase 2A MVP

- Un praticien peut selectionner un patient dans les resultats.
- Il peut cliquer sur `Generer une synthese IA`.
- L'IA produit une synthese multi-questionnaires structuree.
- La synthese est affichee clairement, avec avertissement de validation praticien.
- La synthese est stockee dans `Syntheses_IA`.
- Les erreurs API sont gerees proprement.
- Aucune cle API ni donnee patient reelle n'est commitee.

## Hors perimetre Phase 2A

- Migration Next.js / PostgreSQL.
- RAG vectoriel complet.
- Import massif de PDF SIIN.
- OCR questionnaire papier.
- Coaching patient autonome.
- Conseils posologiques personnalises non valides.
- Envoi automatique au patient sans validation praticien.

## Ordre de travail recommande pour Claude Code

1. Lire `CLAUDE.md`, `AGENTS.md`, `docs/claude/REGLES_CRITIQUES.md`.
2. Lire `src/gas/Code.gs` autour de `getQuestionnaireResults`.
3. Lire `src/gas/index.html` autour de `loadResults` et `renderResults`.
4. Enrichir `prompts/synthese_multi_questionnaires.md` avec le prompt MVP prudent.
5. Ajouter une fonction serveur `generateAISynthesisForPatient(patientEmail)`.
6. Ajouter un helper `callClaudeForSynthesis_(payload)` utilisant `ANTHROPIC_API_KEY` depuis `PropertiesService`.
7. Ajouter `getOrCreateSheet('Syntheses_IA', ...)` et stocker la sortie.
8. Ajouter le bouton cote praticien et l'affichage de la synthese.
9. Valider syntaxe, anti-secrets, puis deployer.
