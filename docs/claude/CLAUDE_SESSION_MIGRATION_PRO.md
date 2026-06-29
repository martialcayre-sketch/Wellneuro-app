# CLAUDE — Session Reprise Chromebook/Codespace
# Migration compte Google perso → compte pro Workspace wellneuro.fr

> Colle ce fichier en début de conversation Claude dans le Codespace.
> Il remplace temporairement CLAUDE_SESSION_BOOTSTRAP.md jusqu'à ce que
> le dépôt Git soit remis à jour.

---

## Contexte projet

Wellneuro NNPP2 — MVP Google Apps Script + Google Sheets.
Neuronutrition clinique, parcours praticien-patient.
Priorité absolue : stabiliser le MVP GAS. Pas de migration technologique sans demande explicite.

**Fichiers cœur :**
- `src/gas/Code.gs` — logique serveur, authentification, orchestration
- `src/gas/Questions.gs` — catalogue questionnaires et scoring
- `src/gas/index.html` — interface patient/praticien (Bootstrap 5.3)
- `src/gas/appsscript.json` — manifeste GAS

---

## Situation actuelle — migration compte pro (juin 2026)

Le projet a été migré du compte Google personnel `martialcayre@gmail.com`
vers le compte Google Workspace `martialcayre@wellneuro.fr`.

**Le dépôt Git N'A PAS encore été mis à jour.**
Les fichiers locaux sur le Chromebook (Codespace) sont la référence de travail.

### Ce qui a changé
- Nouveau compte GAS : `martialcayre@wellneuro.fr`
- Nouveau Google Sheet lié (nouveau SHEET_ID dans Script Properties)
- Nouvelle URL Web App (APP_URL dans Script Properties)
- L'ancien email `martialcayre@gmail.com` ne doit plus apparaître dans le code

### Ce qui reste inchangé
- Script ID GAS : `1sRH00LvhFvjm8OJa6Yv5KmOSwHyYXFxBLjSmEtzaKoTRlOLmEwUurAWq`
  (à vérifier dans .clasp.json local — ne pas committer .clasp.json)
- Structure des feuilles Google Sheets (colonnes inchangées)
- Logique clinique, scoring, questionnaires (intouchables sans demande explicite)

---

## Patch appliqué (ou à appliquer si pas encore fait)

### Fichier : `src/gas/Code.gs`

**Modification 1 — ligne 10**
```
AVANT : const DEV_MULTI_ROLE_EMAILS = ['martialcayre@gmail.com'];
APRÈS : const DEV_MULTI_ROLE_EMAILS = ['martialcayre@wellneuro.fr'];
```

**Modification 2 — ligne 533**
```
AVANT :   const email = 'martialcayre@gmail.com';
APRÈS :   const email = 'martialcayre@wellneuro.fr';
```

**Commande PowerShell pour vérifier que l'ancien email est absent :**
```powershell
Select-String -Path "src\gas\Code.gs" -Pattern "martialcayre@gmail.com"
# Résultat attendu : aucune ligne
```

**Commande bash (Codespace/Chromebook) :**
```bash
grep -n "martialcayre@gmail.com" src/gas/Code.gs
# Résultat attendu : aucune ligne
```

---

## Rôles et emails du domaine wellneuro.fr

### Tableau des rôles définis

| Email | Rôle GAS | Usage |
|---|---|---|
| `martialcayre@wellneuro.fr` | Praticien + Patient (DEV_MULTI_ROLE) | Compte développement/test principal |
| `contact@wellneuro.fr` | Praticien | Compte praticien de démonstration |
| `admin@wellneuro.fr` | Praticien | Administration et supervision |
| `noreply@wellneuro.fr` | — | Expéditeur email uniquement, pas de rôle applicatif |

> `noreply@wellneuro.fr` n'a PAS de rôle dans le Sheet Utilisateurs.
> Il est utilisé comme expéditeur dans les fonctions d'envoi d'email (GmailApp.sendEmail).
> Ne pas créer de compte utilisateur pour cet alias.

### Fonction à exécuter dans l'éditeur GAS après clasp push

```javascript
// Exécuter setupDevMultiRoleMartial() pour créer/mettre à jour
// les lignes Praticien + Patient de martialcayre@wellneuro.fr dans le Sheet
```

Pour `contact@wellneuro.fr` et `admin@wellneuro.fr` :
ajouter manuellement dans le Sheet (onglet Utilisateurs) OU via la fonction
`addPraticienWellneuro_()` définie dans le patch ci-dessous.

---

## Patch complet — `src/gas/Code.gs`

### Patch A — Mise à jour DEV_MULTI_ROLE_EMAILS (ligne 10)

```javascript
// REMPLACER :
const DEV_MULTI_ROLE_EMAILS = ['martialcayre@gmail.com'];

// PAR :
const DEV_MULTI_ROLE_EMAILS = ['martialcayre@wellneuro.fr'];
```

### Patch B — Mise à jour setupDevMultiRoleMartial (ligne 533)

```javascript
// REMPLACER :
  const email = 'martialcayre@gmail.com';

// PAR :
  const email = 'martialcayre@wellneuro.fr';
```

### Patch C — Nouvelle fonction utilitaire (à ajouter après setupDevMultiRoleMartial)

Ajouter après la fonction `setupDevMultiRoleMartial()` existante :

```javascript
/**
 * Crée ou vérifie les comptes praticiens wellneuro.fr dans le Sheet Utilisateurs.
 * À exécuter UNE FOIS manuellement depuis l'éditeur GAS après migration.
 *
 * Comptes créés :
 *   - contact@wellneuro.fr  → Praticien (démonstration)
 *   - admin@wellneuro.fr    → Praticien (administration)
 *
 * noreply@wellneuro.fr est exclu : alias d'envoi uniquement, pas de compte applicatif.
 */
function setupPraticienWellneuro_() {
  const ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SHEET_ID')
  );
  const sh = ss.getSheetByName('Utilisateurs');
  if (!sh) throw new Error('Feuille Utilisateurs introuvable');

  const now = new Date().toISOString();
  const existingEmails = sh.getDataRange().getValues()
    .slice(1)
    .map(r => String(r[1]).trim().toLowerCase());

  const comptes = [
    {
      id:     'PRA_CONTACT_WN',
      email:  'contact@wellneuro.fr',
      role:   'Praticien',
      prenom: 'Contact',
      nom:    'WellNeuro',
      note:   'Compte praticien démonstration'
    },
    {
      id:     'PRA_ADMIN_WN',
      email:  'admin@wellneuro.fr',
      role:   'Praticien',
      prenom: 'Admin',
      nom:    'WellNeuro',
      note:   'Compte praticien administration'
    }
  ];

  const added = [];
  comptes.forEach(function(c) {
    if (existingEmails.indexOf(c.email) !== -1) {
      Logger.log('Déjà présent : ' + c.email);
      return;
    }
    // Colonnes : A=ID, B=Email, C=Rôle, D=Prénom, E=Nom, F=Téléphone,
    //            G=DateNaissance, H=EmailPraticien, I=DateCreation, J=Actif, K=Notes
    sh.appendRow([
      c.id, c.email, c.role, c.prenom, c.nom,
      '', '', c.email, now, 'OUI', c.note
    ]);
    added.push(c.email);
    Logger.log('Créé : ' + c.email + ' (' + c.role + ')');
  });

  return {
    added: added,
    skipped: comptes.filter(c => existingEmails.indexOf(c.email) !== -1).map(c => c.email)
  };
}
```

---

## Checklist de reprise complète (ordre d'exécution)

```
[ ] 1. Ouvrir le Codespace sur le Chromebook
[ ] 2. Vérifier que les fichiers locaux sont à jour (git status)
[ ] 3. Appliquer Patch A + B dans src/gas/Code.gs si pas encore fait
[ ] 4. Ajouter Patch C (fonction setupPraticienWellneuro_) dans src/gas/Code.gs
[ ] 5. Vérifier l'absence de l'ancien email :
        grep -n "gmail.com" src/gas/Code.gs
[ ] 6. clasp push
[ ] 7. Dans l'éditeur GAS : exécuter setupDevMultiRoleMartial()
[ ] 8. Dans l'éditeur GAS : exécuter setupPraticienWellneuro_()
[ ] 9. Vérifier le Sheet Utilisateurs : 4 lignes attendues
        martialcayre@wellneuro.fr × 2 (Praticien + Patient)
        contact@wellneuro.fr × 1 (Praticien)
        admin@wellneuro.fr × 1 (Praticien)
[10] Ouvrir l'URL Web App → connexion martialcayre@wellneuro.fr → accès Praticien OK
[11] Basculer mode Patient → accès Patient OK
[12] git add src/gas/Code.gs && git commit -m "migration: email pro wellneuro.fr, rôles domaine"
[13] bash scripts/check_no_secrets.sh  (Git Bash sur Windows, ou bash Codespace)
```

---

## Règles critiques (rappel non négociable)

- Jamais de SHEET_ID en dur — uniquement via `PropertiesService.getScriptProperties().getProperty('SHEET_ID')`
- Jamais de secret dans le code ni dans Git (.clasp.json, .clasprc.json exclus du dépôt)
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin, Michel Dogne
- Pas de modification clinique (scores, seuils, questionnaires) sans demande explicite
- Interface et textes en français

---

## Script Properties à vérifier après migration

Dans l'éditeur GAS → Projet → Paramètres du projet → Propriétés de script :

| Clé | Valeur |
|---|---|
| `SHEET_ID` | ID du Google Sheet sous martialcayre@wellneuro.fr |
| `APP_URL` | URL du déploiement Web App actuel |

Ces valeurs ne doivent jamais apparaître dans le code source.
