# Contexte Emails et Authentification

## Objectif
Ce document donne a Claude une vue fiable et actionnable de toutes les implantations liees:
- a l envoi d emails reels dans le MVP GAS,
- a l authentification des patients et praticiens,
- aux limites actuelles et a la trajectoire OAuth externe.

Perimetre cible: stabilisation MVP Google Apps Script sans migration technique implicite.

## Sources techniques de reference
- src/gas/Code.gs
- src/gas/index.html
- src/gas/appsscript.json
- docs/claude/PROJET_CONTEXTE.md
- docs/claude/REGLES_CRITIQUES.md
- AGENTS.md

## Etat actuel en une phrase
Les emails sont implementes en GAS et envoyables en reel sous preconditions runtime, tandis que l authentification est basee sur la session Google Apps Script, sans pages OAuth externes operationnelles a ce jour.

## Implantations emails existantes

### 1) Moteur d envoi principal
- Envoi transactionnel no-reply: sendNoReplyEmailToPatient_ (Code.gs)
- Envoi conversationnel contact: sendContactEmailToPatient_ (Code.gs)
- Strategie de robustesse: tentative GmailApp puis fallback MailApp en cas d erreur.

### 2) Flux assignation questionnaire
- Construction du lien patient: buildPatientAccessLink_ (Code.gs)
- Envoi lien assignation: sendAssignmentLinkToPatient_ (Code.gs)
- Point critique: si URL web absente, l envoi est saute avec log, donc impression de non-envoi possible.
- Appel metier: assignQuestionnaire (Code.gs)
- Appel UI: assignQuestionnaireFromClient (Code.gs), retour utilisateur dans index.html.

### 3) Flux assignation pack
- Envoi lien pack: sendPackAssignmentLinkToPatient_ (Code.gs)
- Appel metier: assignPack (Code.gs)
- Appel UI: assignPackFromClient (Code.gs), retour utilisateur dans index.html.

### 4) Rappels automatiques pre-consultation
- Traitement rappels: sendReminders_ (Code.gs)
- Mise en place du trigger quotidien: configurerRappelsAutomatiques (Code.gs)
- Anti-doublon fonctionnel via colonne ReminderSent.

### 5) Flux booklet patient
- Preparation HTML du booklet: generateBookletHTML (Code.gs)
- Envoi manuel final: sendBookletToPatient (Code.gs)
- Journalisation des envois: feuille Booklet_Envois via logBookletEnvoi_ (Code.gs)
- Preconditions UI: preview + case de confirmation relecture dans index.html, envoi via envoyerBookletAvecConfirmation.

## Preconditions runtime emails a respecter
1. Script Property SHEET_ID renseignee.
2. Script Property WEB_APP_URL renseignee pour les flux lien assignation et pack.
3. Autorisations Gmail valides pour le compte deployeur.
4. Deploiement actif coherent avec le projet modifie.
5. Workflow booklet respecte: synthese validee ou corrigee et confirmation relecture.

## Authentification actuelle (GAS)

### 1) Entree applicative
- Point d entree webapp: doGet (Code.gs)
- Parametre assign assaini: sanitizeAssignId_ (Code.gs)

### 2) Identification utilisateur
- Email session Google lu via getActiveUser: getAppData (Code.gs)
- Correspondance sur feuille Patients avec role et statut actif.

### 3) Roles et mode dev
- Roles geres: Patient et Praticien.
- Multi-role dev pour compte de test present dans Code.gs.

### 4) Parametres manifeste
- Web app executeAs USER_DEPLOYING et access ANYONE (appsscript.json)
- Scope gmail.send declare (appsscript.json)

## Limites connues et interpretation correcte
1. OAuth externe type Auth0 non implemente dans ce MVP GAS.
2. Les variables Auth0 du fichier exemple d environnement ne signifient pas une activation effective en GAS.
3. Une assignation peut etre creee avec succes sans email recu si WEB_APP_URL est absent ou invalide.
4. Le booklet peut ne pas partir si les preconditions de validation et relecture ne sont pas completes.

## Runbook incident rapide

### Incident A: aucun mail recu apres assignation
1. Verifier le message UI de retour emailSent.
2. Verifier WEB_APP_URL dans Script Properties.
3. Verifier logs execution autour de sendAssignmentLinkToPatient_.
4. Verifier spam ou onglets et fallback GmailApp/MailApp.

### Incident B: booklet non envoye
1. Verifier statut synthese dans generateBookletHTML.
2. Verifier case de relecture cochee dans index.html.
3. Verifier ligne la plus recente dans feuille Booklet_Envois.
4. Verifier logs autour de sendBookletToPatient.

## Conformite et securite
- Pas de secret dans code ou git.
- SHEET_ID jamais en dur.
- Donnees patients reelles interdites dans depot.
- Respect des contraintes formalisees dans docs/claude/REGLES_CRITIQUES.md et AGENTS.md.

## Position architecture recommandee
1. Court terme: restaurer et fiabiliser envoi email reel sur socle GAS existant.
2. Moyen terme: cadrer un lot OAuth externe separe avec exigences securite et RGPD explicites.
3. Hors scope immediat: migration technique globale tant que non demandee explicitement.

## Definition de done pour lot emails et auth
1. Assignation questionnaire: email recu avec lien valide.
2. Assignation pack: email recu avec lien valide.
3. Booklet: envoi confirme et trace Booklet_Envois en statut Envoye.
4. Auth actuelle: acces conforme role et statut actif.
5. Aucun secret ou donnee sensible introduit.
