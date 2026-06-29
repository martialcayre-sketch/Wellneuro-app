# Phase 1 - Axe 1 : questionnaires en ligne pre-consultation

## Objectif

Reduire la saisie praticien avant consultation : le patient recoit un lien, complete les questionnaires en ligne, les scores sont calcules et le praticien retrouve les resultats prets dans le tableau de bord.

## Perimetre Phase 1

- Conserver l'architecture GAS + Google Sheets.
- Reutiliser les fonctions existantes : assignation, portail patient, soumission, scoring et resultats.
- Ajouter l'envoi automatique d'un lien patient lors d'une assignation individuelle ou d'un pack.
- Garder OCR, vocal et parsing email comme annexes post-MVP, pas comme chemin principal.

## Regles critiques

- Ne jamais coder `SHEET_ID` en dur : utiliser `PropertiesService.getScriptProperties().getProperty('SHEET_ID')`.
- Ne jamais committer de secrets, fichiers `.env` reels, `.clasp.json`, `.clasprc.json`, tokens ou donnees patients reelles.
- Patients fictifs autorises uniquement : Sophie Nicola, Jennifer Martin et Michel Dogne.
- Ne pas modifier les seuils, scores ou interpretations cliniques sans demande explicite et mise a jour de `CHANGELOG.md`.
- Interface et emails utilisateur en francais.

## Etat initial utile

- [src/gas/Code.gs](../../src/gas/Code.gs) contient deja `assignQuestionnaire`, `assignPack`, `getPatientAssignations`, `submitQuestionnaire` et `getQuestionnaireResults`.
- [src/gas/index.html](../../src/gas/index.html) contient deja l'onglet praticien `Assigner`, le portail patient, le moteur de questionnaires et l'affichage des resultats.
- La sheet `Assignations` utilise les colonnes : ID, ID Patient, Email Patient, ID Questionnaire, Titre, Date assignation, Date limite, Statut, Notes.

## Tranche implementee en premier

1. Lors d'une assignation individuelle, `assignQuestionnaire` cree la ligne `Assignations`, puis envoie au patient un email avec lien vers le Web App.
2. Lors d'une assignation de pack, `assignPackFromClient` cree toutes les assignations cote serveur, puis envoie un seul email recapitulatif au patient.
3. Le lien utilise `WEB_APP_URL` ou `APP_URL` dans `ScriptProperties`, avec fallback `ScriptApp.getService().getUrl()`.
4. Si aucune URL n'est disponible, l'assignation reste creee et l'interface signale que `WEB_APP_URL` doit etre configure.

## Configuration requise

Dans les proprietes du script Apps Script, definir de preference :

```text
WEB_APP_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

La valeur exacte depend du deploiement GAS actif. Ne pas l'ecrire en dur dans le code.

## Tests minimum

- Assigner un questionnaire a Sophie Nicola : verifier ligne `Assignations`, email envoye, lien ouvrable.
- Assigner un pack : verifier plusieurs lignes `Assignations`, un seul email recu.
- Cote patient : ouvrir le lien, completer un questionnaire, verifier le statut `Complété` selon l'interface existante.
- Cote praticien : verifier que l'assignation passe en `Complété` apres soumission et que les resultats apparaissent.
- Lancer `bash scripts/check_no_secrets.sh` avant push.

## Suite Phase 1

- Ajouter un vrai statut d'envoi (`Lien envoye`, `Erreur email`) si la sheet peut evoluer.
- Ajouter un rappel automatique avant date limite.
- Ajouter une vue praticien de progression par patient avant consultation.
- Ajouter la generation de booklet apres validation praticien.