// ═══════════════════════════════════════════════════════════════════════════════
// NutriConsult Pro SIIN — Code.gs
// Google Apps Script — Serveur
// ═══════════════════════════════════════════════════════════════════════════════

const SHEET_ID = PropertiesService.getScriptProperties().getProperty('SHEET_ID');

// Identités email projet
const MAILBOX_CONTACT = 'contact@wellneuro.fr';
const MAILBOX_NOREPLY = 'noreply@wellneuro.fr';
const PRACTITIONER_UNIQUE_EMAIL = 'martialcayre@wellneuro.fr';
const ADMIN_EMAIL = 'admin@wellneuro.fr';

// Mode développement : permet à Martial d'accéder aux deux espaces avec le même compte Google.
// À supprimer ou vider avant mise en production.
const DEV_MULTI_ROLE_EMAILS = ['martialcayre@wellneuro.fr'];

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────

function doGet(e) {
  var assignId = (e && e.parameter && e.parameter.assign)
    ? String(e.parameter.assign)
    : '';
  var output = HtmlService.createHtmlOutputFromFile('index')
    .setTitle('NutriConsult Pro — SIIN')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  if (assignId) {
    // Injection sûre via JSON.stringify pour éviter toute injection de caractères spéciaux.
    output.append('<script>window.PRECONSULT_ASSIGN_ID=' + JSON.stringify(assignId) + ';<\/script>');
  }
  return output;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    // Row 1 = titre, Row 2 = note, Row 3 = headers
    sh.getRange(1, 1).setValue(name);
    sh.getRange(2, 1).setValue('Généré automatiquement par NutriConsult Pro SIIN');
    sh.getRange(3, 1, 1, headers.length).setValues([headers]);
    sh.getRange(3, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a3a5c').setFontColor('#ffffff');
  }
  return sh;
}

function generateId(prefix) {
  return prefix + new Date().getTime();
}

function formatDate(date) {
  if (!date || date === '') return '';
  try {
    return Utilities.formatDate(new Date(date), 'Europe/Paris', 'dd/MM/yyyy');
  } catch(e) {
    return '';
  }
}

// Données : row 1 = titre, row 2 = note, row 3 = headers, row 4+ = données
// getDataRange().getValues() → index 0=titre, 1=note, 2=headers, 3+=données
const DATA_START = 3; // index de la première ligne de données

// ─── AUTHENTIFICATION ─────────────────────────────────────────────────────────

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function isDevMultiRoleEmail_(email) {
  return DEV_MULTI_ROLE_EMAILS.map(normalizeEmail_).indexOf(normalizeEmail_(email)) !== -1;
}

function rowToUser_(row) {
  return {
    idPatient: row[0],  // A
    email:     row[1],  // B
    role:      row[2],  // C
    prenom:    row[3],  // D
    nom:       row[4]   // E
  };
}

function getAppData() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) return { error: 'not_logged_in' };

    const normalizedEmail = normalizeEmail_(email);
    const sh = getSheet('Patients');
    const rows = sh.getDataRange().getValues();
    const matches = [];

    for (let i = DATA_START; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue; // ligne vide
      if (normalizeEmail_(row[1]) === normalizedEmail && row[9] === 'OUI') {
        matches.push(rowToUser_(row));
      }
    }

    if (matches.length === 0) {
      return { error: 'user_not_found', email: email };
    }

    const devMultiRole = isDevMultiRoleEmail_(email);
    const praticien = matches.find(u => u.role === 'Praticien') || null;
    const patient   = matches.find(u => u.role === 'Patient') || null;

    // En développement, Martial démarre côté praticien si le rôle existe,
    // puis peut basculer côté patient depuis l'interface.
    const selected = devMultiRole ? (praticien || patient || matches[0]) : matches[0];

    return {
      success: true,
      email:     email,
      idPatient: selected.idPatient,
      role:      selected.role,
      prenom:    selected.prenom,
      nom:       selected.nom,

      // Informations utilisées uniquement par le sélecteur de rôle développement.
      devMultiRole: devMultiRole,
      devRoles: devMultiRole ? ['Praticien', 'Patient'] : [selected.role],
      devPraticienId: praticien ? praticien.idPatient : '',
      devPatientId: patient ? patient.idPatient : '',
      devDefaultRole: selected.role
    };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── FONCTIONS PATIENT ────────────────────────────────────────────────────────

function getPatientAssignations(email) {
  try {
    const sh = getSheet('Assignations');
    const rows = sh.getDataRange().getValues();
    const results = [];
    const normalizedEmail = normalizeEmail_(email);

    // Colonnes Assignations : A=ID, B=ID Patient, C=Email Patient, D=ID Q,
    // E=Titre, F=Date assignation, G=Date limite, H=Statut, I=Notes
    for (let i = DATA_START; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;
      if (normalizeEmail_(row[2]) === normalizedEmail) {
        results.push({
          idAssignation:  row[0],
          idPatient:      row[1],
          emailPatient:   row[2],
          idQuestionnaire: row[3],
          titre:          row[4],
          dateAssignation: formatDate(row[5]),
          dateLimite:     formatDate(row[6]),
          statut:         row[7],
          notesPraticien: row[8] || ''
        });
      }
    }
    return results;
  } catch(e) {
    return { error: e.message };
  }
}

function submitPlaintes(data) {
  try {
    const sh = getSheet('Rep_Plaintes');
    const now = new Date();
    const id = 'REP' + now.getTime();

    const lastRow = Math.max(sh.getLastRow(), DATA_START);
    const newRow  = lastRow + 1;

    sh.getRange(newRow, 1, 1, 12).setValues([[
      id,
      data.idPatient,
      data.email,
      data.idAssignation,
      now,
      data.fatigue,
      data.douleurs,
      data.digestion,
      data.surpoids,
      data.insomnie,
      data.moral,
      data.mobilite
    ]]);

    // Formules scoring
    sh.getRange(newRow, 13).setFormula(`=IFERROR(SUM(F${newRow}:L${newRow}),"")`);
    sh.getRange(newRow, 14).setFormula(
      `=IFERROR(IFS(M${newRow}>=56,"🟢 Faible charge",M${newRow}>=35,"🟠 Charge modérée",M${newRow}>0,"🔴 Charge élevée"),"—")`
    );

    updateAssignationStatus(data.idAssignation, 'Complété');

    const total = data.fatigue + data.douleurs + data.digestion +
                  data.surpoids + data.insomnie + data.moral + data.mobilite;
    const interpretation = total >= 56 ? '🟢 Faible charge'
                         : total >= 35 ? '🟠 Charge modérée'
                         : '🔴 Charge élevée';

    return { success: true, total: total, interpretation: interpretation };
  } catch(e) {
    return { error: e.message };
  }
}

function updateAssignationStatus(idAssignation, statut) {
  const sh = getSheet('Assignations');
  const rows = sh.getDataRange().getValues();
  for (let i = DATA_START; i < rows.length; i++) {
    if (rows[i][0] === idAssignation) {
      sh.getRange(i + 1, 8).setValue(statut); // Colonne H = Statut
      return;
    }
  }
}

// ─── NOTIFICATIONS EMAIL ──────────────────────────────────────────────────────

/**
 * Envoi transactionnel sans échange (documents/liens praticien -> patient).
 * Priorité: alias noreply@wellneuro.fr, fallback noReply.
 */
function sendNoReplyEmailToPatient_(patientEmail, sujet, corps) {
  try {
    GmailApp.sendEmail(patientEmail, sujet, corps, {
      from: MAILBOX_NOREPLY,
      name: 'NutriConsult',
      replyTo: MAILBOX_NOREPLY
    });
  } catch (e) {
    Logger.log('sendNoReplyEmailToPatient_ alias fallback: ' + e.message);
    MailApp.sendEmail(patientEmail, sujet, corps, {
      name: 'NutriConsult',
      noReply: true
    });
  }
}

/**
 * Envoi conversationnel patient <-> praticien.
 * Priorité: alias contact@wellneuro.fr, fallback replyTo contact.
 */
function sendContactEmailToPatient_(patientEmail, sujet, corps) {
  try {
    GmailApp.sendEmail(patientEmail, sujet, corps, {
      from: MAILBOX_CONTACT,
      name: 'NutriConsult - Contact',
      replyTo: MAILBOX_CONTACT
    });
  } catch (e) {
    Logger.log('sendContactEmailToPatient_ alias fallback: ' + e.message);
    MailApp.sendEmail(patientEmail, sujet, corps, {
      name: 'NutriConsult - Contact',
      replyTo: MAILBOX_CONTACT
    });
  }
}

/**
 * Accusé de réception au patient après soumission d'un questionnaire.
 * Silencieux en cas d'erreur (ne doit jamais bloquer submitQuestionnaire).
 */
function sendAcknowledgmentToPatient_(patientEmail, patientPrenom, titreQuestionnaire) {
  try {
    if (!patientEmail) return;
    var sujet = 'Vos réponses ont bien été reçues — NutriConsult';
    var corps = 'Bonjour ' + (patientPrenom || '') + ',\n\n'
      + 'Nous confirmons la bonne réception de vos réponses au questionnaire :\n'
      + '« ' + titreQuestionnaire + ' »\n\n'
      + 'Votre praticien en prendra connaissance prochainement.\n\n'
      + 'Merci de votre participation.\n\n'
      + '— L\'équipe NutriConsult';
    sendNoReplyEmailToPatient_(patientEmail, sujet, corps);
  } catch(e) {
    Logger.log('sendAcknowledgmentToPatient_ error: ' + e.message);
  }
}

function getWebAppUrl_() {
  var props = PropertiesService.getScriptProperties();
  var configuredUrl = props.getProperty('WEB_APP_URL') || props.getProperty('APP_URL') || '';
  if (configuredUrl) return configuredUrl;
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch(e) {
    Logger.log('getWebAppUrl_ error: ' + e.message);
    return '';
  }
}

function buildPatientAccessLink_(idAssignation) {
  var baseUrl = getWebAppUrl_();
  if (!baseUrl) return '';
  var separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
  return baseUrl + separator + 'assign=' + encodeURIComponent(idAssignation || '');
}

function formatDeadlineForEmail_(dateLimite) {
  if (!dateLimite) return '';
  try {
    return Utilities.formatDate(new Date(dateLimite), 'Europe/Paris', 'dd/MM/yyyy');
  } catch(e) {
    return '';
  }
}

function sendAssignmentLinkToPatient_(patientEmail, titreQuestionnaire, dateLimite, notes, idAssignation) {
  try {
    var link = buildPatientAccessLink_(idAssignation);
    if (!link) {
      Logger.log('sendAssignmentLinkToPatient_ skipped: WEB_APP_URL non configuré');
      return false;
    }
    var deadline = formatDeadlineForEmail_(dateLimite);
    var sujet = 'Questionnaire à compléter avant votre consultation — NutriConsult';
    var corps = 'Bonjour,\n\n'
      + 'Votre praticien vous invite à compléter le questionnaire suivant avant votre consultation :\n'
      + '« ' + titreQuestionnaire + ' »\n\n'
      + (deadline ? 'Date limite souhaitée : ' + deadline + '\n\n' : '')
      + (notes ? 'Message du praticien : ' + notes + '\n\n' : '')
      + 'Accéder à votre espace questionnaire :\n' + link + '\n\n'
      + 'Merci de votre participation.\n\n'
      + '— L\'équipe NutriConsult';
    sendNoReplyEmailToPatient_(patientEmail, sujet, corps);
    return true;
  } catch(e) {
    Logger.log('sendAssignmentLinkToPatient_ error: ' + e.message);
    return false;
  }
}

function sendPackAssignmentLinkToPatient_(patientEmail, packNom, count, dateLimite, notes, idAssignations) {
  try {
    var firstId = idAssignations && idAssignations.length ? idAssignations[0] : '';
    var link = buildPatientAccessLink_(firstId);
    if (!link) {
      Logger.log('sendPackAssignmentLinkToPatient_ skipped: WEB_APP_URL non configuré');
      return false;
    }
    var deadline = formatDeadlineForEmail_(dateLimite);
    var sujet = 'Questionnaires à compléter avant votre consultation — NutriConsult';
    var corps = 'Bonjour,\n\n'
      + 'Votre praticien vous invite à compléter ' + count + ' questionnaire' + (count > 1 ? 's' : '')
      + ' du pack « ' + packNom + ' » avant votre consultation.\n\n'
      + (deadline ? 'Date limite souhaitée : ' + deadline + '\n\n' : '')
      + (notes ? 'Message du praticien : ' + notes + '\n\n' : '')
      + 'Accéder à votre espace questionnaire :\n' + link + '\n\n'
      + 'Merci de votre participation.\n\n'
      + '— L\'équipe NutriConsult';
    sendNoReplyEmailToPatient_(patientEmail, sujet, corps);
    return true;
  } catch(e) {
    Logger.log('sendPackAssignmentLinkToPatient_ error: ' + e.message);
    return false;
  }
}

// ─── RAPPELS PRÉ-CONSULTATION ────────────────────────────────────────────────

/**
 * Envoie un rappel aux patients qui n'ont pas encore répondu, dans la fenêtre
 * [24h avant la date limite, date limite]. Utilise la colonne J de la feuille
 * Assignations comme marqueur « rappel déjà envoyé » (TRUE/vide).
 * À appeler via un déclencheur quotidien — voir configurerRappelsAutomatiques().
 */
function sendReminders_() {
  var sh = getSheet('Assignations');
  if (!sh) { Logger.log('sendReminders_: feuille Assignations introuvable'); return 0; }
  var rows = sh.getDataRange().getValues();
  var now = new Date().getTime();
  var sent = 0;

  for (var i = DATA_START; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0]) continue;                                     // ligne vide
    if (row[7] !== 'En attente') continue;                     // déjà complété
    if (row[9] === true || row[9] === 'TRUE') continue;        // rappel déjà envoyé (col J)

    var dateLimite = row[6];
    if (!dateLimite || dateLimite === '') continue;
    var deadline = new Date(dateLimite).getTime();
    if (isNaN(deadline)) continue;

    var reminderWindow = deadline - 24 * 60 * 60 * 1000;
    if (now < reminderWindow || now >= deadline) continue;     // hors fenêtre

    var patientEmail = row[2];
    var titreQ       = row[4];
    var idAssignation = row[0];
    var link = buildPatientAccessLink_(idAssignation);

    var sujet = 'Rappel — Questionnaire à compléter avant demain';
    var corps = 'Bonjour,\n\n'
      + 'Vous avez un questionnaire à compléter avant votre consultation :\n'
      + '« ' + titreQ + ' »\n\n'
      + 'Date limite : ' + formatDeadlineForEmail_(dateLimite) + '\n\n'
      + (link ? 'Accéder au questionnaire :\n' + link + '\n\n' : '')
      + 'Merci de votre participation.\n\n'
      + '— L\'équipe NutriConsult';

    try {
      sendNoReplyEmailToPatient_(patientEmail, sujet, corps);
      sh.getRange(i + 1, 10).setValue(true);   // col J = ReminderSent
      sent++;
    } catch(e) {
      Logger.log('sendReminders_ erreur pour ' + patientEmail + ' : ' + e.message);
    }
  }
  Logger.log('sendReminders_ : ' + sent + ' rappel(s) envoyé(s)');
  return sent;
}

/**
 * Configure un déclencheur quotidien à 8h00 pour sendReminders_.
 * À exécuter UNE SEULE FOIS depuis l'éditeur Apps Script :
 * Ouvrir Apps Script > Fonctions > configurerRappelsAutomatiques > Exécuter.
 */
function configurerRappelsAutomatiques() {
  // Supprimer l'éventuel déclencheur existant pour éviter les doublons.
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendReminders_') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('sendReminders_')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
  Logger.log('Déclencheur créé : sendReminders_ tous les jours à 8h.');
}

// ─── FONCTIONS PRATICIEN ──────────────────────────────────────────────────────

function getPraticienDashboard() {
  try {
    // Patients
    const patSh = getSheet('Patients');
    const patRows = patSh.getDataRange().getValues();
    const patients = [];
    for (let i = DATA_START; i < patRows.length; i++) {
      const row = patRows[i];
      if (!row[0] || row[2] !== 'Patient') continue;
      patients.push({
        idPatient:  row[0],
        email:      row[1],
        prenom:     row[3],
        nom:        row[4],
        telephone:  row[6],
        actif:      row[9]
      });
    }

    // Catalogue questionnaires (depuis le Sheet)
    const qSh = getSheet('Questionnaires');
    const qRows = qSh.getDataRange().getValues();
    const questionnaires = [];
    for (let i = DATA_START; i < qRows.length; i++) {
      const row = qRows[i];
      if (!row[0] || row[5] === 'NON') continue; // ignore inactifs
      questionnaires.push({
        id:          row[0], // A: ID
        titre:       row[1], // B: Titre
        categorie:   row[2], // C: Catégorie
        description: row[3], // D: Description patient
        duree:       row[4], // E: Durée estimée
        actif:       row[5]  // F: Actif
      });
    }

    // Packs standards
    const packs = getPacks();

    // Assignations récentes (50 dernières)
    const aSh = getSheet('Assignations');
    const aRows = aSh.getDataRange().getValues();
    const assignations = [];
    for (let i = DATA_START; i < aRows.length; i++) {
      const row = aRows[i];
      if (!row[0]) continue;
      assignations.push({
        idAssignation:   row[0],
        idPatient:       row[1],
        emailPatient:    row[2],
        idQuestionnaire: row[3],
        titre:           row[4],
        dateAssignation: formatDate(row[5]),
        statut:          row[7]
      });
    }

    return { patients, questionnaires, packs, assignations };
  } catch(e) {
    return { error: e.message };
  }
}

function addPatient(prenom, nom, email, telephone, dateNaissance) {
  try {
    const sh = getSheet('Patients');
    const praticienEmail = Session.getActiveUser().getEmail();
    const now = new Date();

    const lastRow = sh.getLastRow();
    const num = String(lastRow - 2).padStart(3, '0');
    const id = 'PAT' + num;

    const newRow = Math.max(lastRow, DATA_START) + 1;

    sh.getRange(newRow, 1, 1, 11).setValues([[
      id,
      email,
      'Patient',
      prenom,
      nom,
      dateNaissance ? new Date(dateNaissance) : '',
      telephone || '',
      praticienEmail,
      now,
      'OUI',
      ''
    ]]);

    return { success: true, id: id };
  } catch(e) {
    return { error: e.message };
  }
}


function getPatientIdByEmail(patientEmail) {
  const patSh = getSheet('Patients');
  const patRows = patSh.getDataRange().getValues();
  const normalizedEmail = normalizeEmail_(patientEmail);
  let fallbackId = '';

  for (let i = DATA_START; i < patRows.length; i++) {
    const row = patRows[i];
    if (!row[0]) continue;
    if (normalizeEmail_(row[1]) !== normalizedEmail) continue;
    if (!fallbackId) fallbackId = row[0];
    // Si le même email a deux rôles, on rattache toujours l'assignation au rôle Patient.
    if (row[2] === 'Patient') return row[0];
  }
  return fallbackId;
}

function assignQuestionnaire(patientEmail, idQuestionnaire, titreQ, dateLimite, notes, suppressEmail) {
  try {
    const sh = getSheet('Assignations');
    const praticienEmail = Session.getActiveUser().getEmail();
    const now = new Date();
    const id = 'ASS' + now.getTime();

    // Récupérer l'ID du rôle Patient depuis son email.
    // Important en mode développement : le même email peut avoir les rôles Praticien et Patient.
    const idPatient = getPatientIdByEmail(patientEmail);

    const lastRow = Math.max(sh.getLastRow(), DATA_START);
    sh.getRange(lastRow + 1, 1, 1, 9).setValues([[
      id,
      idPatient,
      patientEmail,
      idQuestionnaire,
      titreQ,
      now,
      dateLimite ? new Date(dateLimite) : '',
      'En attente',
      notes || ''
    ]]);

    var emailSent = suppressEmail ? false : sendAssignmentLinkToPatient_(patientEmail, titreQ, dateLimite, notes, id);
    return { success: true, id: id, emailSent: emailSent };
  } catch(e) {
    return { error: e.message };
  }
}

/**
 * Repousse la date limite d'une assignation sans en créer une nouvelle.
 * @param {string} idAssignation
 * @param {string} nouvelleDateStr - format 'YYYY-MM-DD'
 */
function extendAssignationDeadline(idAssignation, nouvelleDateStr) {
  try {
    if (!idAssignation || !nouvelleDateStr) return { error: 'Paramètres manquants' };
    const sh = getSheet('Assignations');
    const rows = sh.getDataRange().getValues();
    for (let i = DATA_START; i < rows.length; i++) {
      if (rows[i][0] === idAssignation) {
        sh.getRange(i + 1, 7).setValue(new Date(nouvelleDateStr));
        return { success: true };
      }
    }
    return { error: 'Assignation introuvable : ' + idAssignation };
  } catch(e) {
    Logger.log('extendAssignationDeadline error: ' + e.message);
    return { error: e.message };
  }
}

/**
 * Réassigne un questionnaire déjà complété pour un suivi longitudinal.
 * Crée une NOUVELLE ligne d'assignation — n'écrase jamais les résultats précédents.
 * @param {string} patientEmail
 * @param {string} idQuestionnaire
 * @param {string} nouvelleDateLimite - format 'YYYY-MM-DD'
 * @param {string} notes - optionnel
 */
function reassignQuestionnaireForFollowUp(patientEmail, idQuestionnaire, nouvelleDateLimite, notes) {
  try {
    var titre = idQuestionnaire;
    try {
      var qRows = getSheet('Questionnaires').getDataRange().getValues();
      for (var qi = DATA_START; qi < qRows.length; qi++) {
        if (qRows[qi][0] === idQuestionnaire) { titre = qRows[qi][1]; break; }
      }
    } catch(e) {}
    return assignQuestionnaire(
      patientEmail,
      idQuestionnaire,
      titre,
      nouvelleDateLimite,
      notes || 'Suivi longitudinal'
    );
  } catch(e) {
    Logger.log('reassignQuestionnaireForFollowUp error: ' + e.message);
    return { error: e.message };
  }
}

// ─── PACKS ────────────────────────────────────────────────────────────────────

function getPacks() {
  try {
    const sh = getSheet('Packs');
    if (!sh) return [];
    const rows = sh.getDataRange().getValues();
    const packs = [];
    for (let i = DATA_START; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || row[5] === 'NON') continue;
      let qids = [];
      try { qids = JSON.parse(row[4]); } catch(e) { qids = []; }
      packs.push({
        id:          row[0], // A: ID_Pack
        nom:         row[1], // B: Nom
        thematique:  row[2], // C: Thématique
        description: row[3], // D: Description
        qids:        qids,   // E: JSON array des IDs questionnaires
        actif:       row[5]  // F: Actif
      });
    }
    return packs;
  } catch(e) {
    return [];
  }
}

function assignPack(patientEmail, packId, dateLimite, notes) {
  try {
    // Chercher le pack
    const sh = getSheet('Packs');
    const rows = sh.getDataRange().getValues();
    let pack = null;
    for (let i = DATA_START; i < rows.length; i++) {
      if (rows[i][0] === packId) {
        let qids = [];
        try { qids = JSON.parse(rows[i][4]); } catch(e) {}
        pack = { nom: rows[i][1], qids: qids };
        break;
      }
    }
    if (!pack || !pack.qids.length) return { error: 'Pack introuvable ou vide' };

    // Lire le catalogue questionnaires pour récupérer les titres
    const qSh = getSheet('Questionnaires');
    const qRows = qSh.getDataRange().getValues();
    const qMap = {};
    for (let i = DATA_START; i < qRows.length; i++) {
      if (qRows[i][0]) qMap[qRows[i][0]] = qRows[i][1];
    }

    // Assigner chaque questionnaire du pack
    const assigned = [];
    const assignedIds = [];
    pack.qids.forEach(qid => {
      const titre = qMap[qid] || qid;
      const result = assignQuestionnaire(
        patientEmail,
        qid,
        titre,
        dateLimite,
        notes || ('Pack ' + pack.nom),
        true
      );
      if (result.success) {
        assigned.push(qid);
        assignedIds.push(result.id);
      }
      Utilities.sleep(50); // évite les doublons d'ID timestamp
    });

    var emailSent = assigned.length > 0
      ? sendPackAssignmentLinkToPatient_(patientEmail, pack.nom, assigned.length, dateLimite, notes || ('Pack ' + pack.nom), assignedIds)
      : false;
    return { success: true, count: assigned.length, packNom: pack.nom, emailSent: emailSent };
  } catch(e) {
    return { error: e.message };
  }
}

function createPack(nom, thematique, description, qids) {
  try {
    const headers = ['ID_Pack', 'Nom', 'Thématique', 'Description', 'QIDs_JSON', 'Actif'];
    const sh = getOrCreateSheet('Packs', headers);
    const id = 'PACK_' + new Date().getTime();
    const lastRow = Math.max(sh.getLastRow(), DATA_START);
    sh.getRange(lastRow + 1, 1, 1, 6).setValues([[
      id, nom, thematique || '', description || '',
      JSON.stringify(qids || []), 'OUI'
    ]]);
    return { success: true, id: id };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── ADAPTERS FRONT-END ───────────────────────────────────────────────────────

// Wrapper pour index.html : retourne champs idQuestionnaire + idPack normalisés
function getPraticienData() {
  const d = getPraticienDashboard();
  if (d.error) return d;
  if (d.questionnaires) {
    d.questionnaires = d.questionnaires.map(function(q) {
      return { idQuestionnaire: q.id, titre: q.titre, categorie: q.categorie,
               description: q.description, duree: q.duree, actif: q.actif };
    });
  }
  if (d.packs) {
    d.packs = d.packs.map(function(p) {
      return { idPack: p.id, nom: p.nom, thematique: p.thematique,
               description: p.description, qids: p.qids, actif: p.actif };
    });
  }
  if (d.assignations) {
    d.assignations = d.assignations.map(function(a) {
      return Object.assign({}, a, { titreQuestionnaire: a.titre });
    });
  }
  return d;
}

// Wrapper addPatient : accepte objet {prenom,nom,email,telephone,dateNaissance}
function addPatientFromClient(payload) {
  return addPatient(
    payload.prenom || '',
    payload.nom || '',
    payload.email || '',
    payload.telephone || '',
    payload.dateNaissance || ''
  );
}

// Wrapper assignQuestionnaire : accepte objet {emailPatient,idQuestionnaire,dateLimite,notes}
function assignQuestionnaireFromClient(payload) {
  // Récupérer le titre depuis le catalogue
  var titre = payload.idQuestionnaire;
  try {
    var qSh = getSheet('Questionnaires');
    var qRows = qSh.getDataRange().getValues();
    for (var i = DATA_START; i < qRows.length; i++) {
      if (qRows[i][0] === payload.idQuestionnaire) { titre = qRows[i][1]; break; }
    }
  } catch(e) {}
  return assignQuestionnaire(
    payload.emailPatient || '',
    payload.idQuestionnaire || '',
    titre,
    payload.dateLimite || '',
    payload.notes || ''
  );
}

function assignPackFromClient(payload) {
  return assignPack(
    payload.emailPatient || '',
    payload.idPack || '',
    payload.dateLimite || '',
    payload.notes || ''
  );
}

// savePack : alias createPack pour index.html
function savePack(payload) {
  return createPack(payload.nom, payload.thematique || '', payload.description || '', payload.qids || []);
}

function deletePack(packId) {
  try {
    const sh = getSheet('Packs');
    if (!sh) return { error: 'Sheet Packs introuvable' };
    const rows = sh.getDataRange().getValues();
    for (let i = DATA_START; i < rows.length; i++) {
      if (rows[i][0] === packId) {
        sh.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { error: 'Pack non trouvé' };
  } catch(e) {
    return { error: e.message };
  }
}


// ─── OUTIL DEV — CRÉER LES DEUX RÔLES POUR MARTIAL ──────────────────────────

function setupDevMultiRoleMartial() {
  const email = 'martialcayre@wellneuro.fr';
  const sh = getSheet('Patients');
  const rows = sh.getDataRange().getValues();
  const now = new Date();

  let hasPraticien = false;
  let hasPatient = false;

  for (let i = DATA_START; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    if (normalizeEmail_(row[1]) !== normalizeEmail_(email)) continue;
    if (row[2] === 'Praticien') hasPraticien = true;
    if (row[2] === 'Patient') hasPatient = true;
  }

  const rowsToAdd = [];
  if (!hasPraticien) {
    rowsToAdd.push([
      'PRA_DEV_MARTIAL', email, 'Praticien', 'Martial', 'Cayre', '', '', email, now, 'OUI', 'Compte développement praticien'
    ]);
  }
  if (!hasPatient) {
    rowsToAdd.push([
      'PAT_DEV_MARTIAL', email, 'Patient', 'Martial', 'Cayre', '', '', email, now, 'OUI', 'Compte développement patient'
    ]);
  }

  if (rowsToAdd.length > 0) {
    const lastRow = Math.max(sh.getLastRow(), DATA_START);
    sh.getRange(lastRow + 1, 1, rowsToAdd.length, 11).setValues(rowsToAdd);
  }

  return {
    success: true,
    email: email,
    praticien: hasPraticien || rowsToAdd.some(r => r[2] === 'Praticien'),
    patient: hasPatient || rowsToAdd.some(r => r[2] === 'Patient'),
    added: rowsToAdd.length
  };
}

// ─── OUTIL DEV — CRÉER LE COMPTE ADMIN WELLNEURO.FR ──────────────────────────

function setupPraticienWellneuro() {
  const ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SHEET_ID')
  );
  const sh = ss.getSheetByName('Patients');
  if (!sh) throw new Error('Feuille Patients introuvable');

  const now = new Date().toISOString();
  const existingEmails = sh.getDataRange().getValues()
    .slice(1)
    .map(r => String(r[1]).trim().toLowerCase());

  // contact@wellneuro.fr reste une messagerie d'échange patient, sans rôle applicatif.
  const comptes = [
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

// ─── INIT — À EXÉCUTER UNE FOIS DEPUIS L'ÉDITEUR GAS ─────────────────────────

function initCatalogue() {
  const headers = ['ID', 'Titre', 'Catégorie', 'Description patient', 'Durée', 'Actif'];
  const sh = getOrCreateSheet('Questionnaires', headers);

  // Effacer les données existantes (garder entête rows 1-3)
  if (sh.getLastRow() > DATA_START) {
    sh.deleteRows(DATA_START + 1, sh.getLastRow() - DATA_START);
  }

  const Q = [
    // ── PLAINTES ACTUELLES ───────────────────────────────────────────────────
    ['Q_PLAINTES', 'Questionnaire Plaintes Actuelles', 'Plaintes',
     'Évaluez votre niveau de gêne pour 7 symptômes courants au cours des 30 derniers jours (échelle 1–10).', '5 min', 'OUI'],

    // ── ALIMENTAIRE ───────────────────────────────────────────────────────────
    ['Q_ALI_01', 'Questionnaire Alimentaire SIIN', 'Alimentaire',
     'Évaluez la qualité globale de votre alimentation : légumes, fruits, protéines, graisses, sucres et comportements alimentaires.', '15 min', 'OUI'],
    ['Q_ALI_02', 'Alimentation — Diète méditerranéenne SIIN', 'Alimentaire',
     'Évaluez votre adhérence au régime méditerranéen en 14 questions (score /14).', '10 min', 'OUI'],
    ['Q_ALI_03', 'Évaluation des apports caloriques et protéiques — Pr. L. Monnier', 'Alimentaire',
     'Estimez vos apports quotidiens en protéines et calories selon la méthode Monnier (repérage rapide validé).', '10 min', 'OUI'],

    // ── FIBROMYALGIE ──────────────────────────────────────────────────────────
    ['Q_FIB_01', 'FiRST — Dépistage de la fibromyalgie', 'Fibromyalgie',
     'Dépistage rapide de la fibromyalgie en 6 questions (sensibilité 90,5% pour score ≥ 5/6).', '3 min', 'OUI'],
    ['Q_FIB_02', 'QIF — Questionnaire d\'Impact de la Fibromyalgie', 'Fibromyalgie',
     'Mesurez l\'impact de la fibromyalgie sur vos activités quotidiennes, travail et qualité de vie.', '10 min', 'OUI'],
    ['Q_FIB_03', 'ELFE — Liste Européenne d\'évaluation de la Fibromyalgie', 'Fibromyalgie',
     'Évaluation clinique approfondie des points douloureux fibromyalgiques (usage professionnel).', '20 min', 'NON'],

    // ── GASTRO-ENTÉROLOGIE ────────────────────────────────────────────────────
    ['Q_GAS_01', 'Troubles fonctionnels digestifs et intestinaux SIIN 2021', 'Gastro-entérologie',
     'Évaluation complète de vos troubles digestifs en 5 catégories (score /93).', '15 min', 'OUI'],
    ['Q_GAS_02', 'Score de Francis — Syndrome de l\'intestin irritable', 'Gastro-entérologie',
     'Évaluez la sévérité du SII : douleurs, ballonnements, impact sur la vie quotidienne.', '10 min', 'OUI'],
    ['Q_GAS_03', 'Échelle de Bristol — Type de selles', 'Gastro-entérologie',
     'Identifiez votre type de transit intestinal selon les 7 types de la classification de Bristol.', '2 min', 'OUI'],

    // ── GÉRONTOLOGIE ──────────────────────────────────────────────────────────
    ['Q_NEU_06', 'MMT — Mini Mental Test SIIN', 'Gérontologie',
     'Dépistage des troubles cognitifs et mnésiques (10 questions, interprétation pour micronutrition).', '10 min', 'OUI'],
    ['Q_NEU_09', 'Grille de Zarit — Fardeau de l\'aidant', 'Gérontologie',
     'Évaluez la charge globale des proches aidants (22 questions, score de léger à sévère).', '10 min', 'OUI'],

    // ── MODE DE VIE ───────────────────────────────────────────────────────────
    ['Q_MOD_01', 'Questionnaire Mode de Vie SIIN', 'Mode de vie',
     'Évaluez vos habitudes de vie : activité physique, sédentarité, rythmes biologiques, stimulants et hydratation.', '10 min', 'OUI'],
    ['Q_MOD_02', 'Activité et dépense énergétique globale SIIN', 'Mode de vie',
     'Estimez votre dépense énergétique quotidienne (kcal/jour) selon votre niveau d\'activité au travail et en dehors.', '5 min', 'OUI'],
    ['Q_MOD_03', 'AUDIT — Dépistage de la consommation d\'alcool', 'Mode de vie',
     'Évaluez votre consommation d\'alcool et dépistez une consommation à risque ou une dépendance (10 items, score /40).', '5 min', 'OUI'],

    // ── NEURO-PSYCHOLOGIE ─────────────────────────────────────────────────────
    ['Q_INF_04', 'HIT-6 — Impact de la migraine', 'Neuro-psychologie',
     'Évaluez l\'impact de vos maux de tête et migraines sur la vie quotidienne (6 items).', '5 min', 'OUI'],
    ['Q_NEU_01', 'BDI — Inventaire de dépression de Beck', 'Neuro-psychologie',
     'Évaluez la sévérité de vos symptômes dépressifs en 13 questions (score /39).', '5 min', 'OUI'],
    ['Q_NEU_02', 'MADRS — Échelle de dépression de Montgomery-Åsberg', 'Neuro-psychologie',
     'Évaluation détaillée de la dépression sur 10 items (score de 0 à 60).', '10 min', 'OUI'],
    ['Q_NEU_03', 'SIGH-SAD-SA — Dépression saisonnière et atypique', 'Neuro-psychologie',
     'Évaluation du trouble affectif saisonnier et de la dépression atypique (deux groupes A/B).', '15 min', 'OUI'],
    ['Q_NEU_04', 'SCOFF — Dépistage des troubles du comportement alimentaire', 'Neuro-psychologie',
     'Dépistage rapide de l\'anorexie et de la boulimie (5 questions oui/non).', '3 min', 'OUI'],
    ['Q_NEU_05', 'UPPS — Questionnaire d\'impulsivité', 'Neuro-psychologie',
     'Évaluez 4 facettes de l\'impulsivité : urgence, manque de préméditation, persévérance, recherche de sensations (45 items).', '15 min', 'OUI'],
    ['Q_NEU_07', 'AUDIT — Consommation d\'alcool', 'Neuro-psychologie',
     'Dépistez un usage problématique de l\'alcool (10 questions, score /40).', '5 min', 'OUI'],
    ['Q_NEU_08', 'ECAB — Dépendance cognitive aux benzodiazépines', 'Neuro-psychologie',
     'Évaluez la dépendance cognitive aux tranquillisants et somnifères (10 items vrai/faux).', '5 min', 'OUI'],
    ['Q_NEU_10', 'Dépendance à Internet', 'Neuro-psychologie',
     'Évaluez votre usage problématique d\'Internet en 20 questions.', '10 min', 'OUI'],

    // ── CARDIOLOGIE ───────────────────────────────────────────────────────────
    ['Q_CAR_01', 'Questionnaire cardio-métabolique SIIN', 'Cardiologie',
     'Évaluez vos facteurs de risque cardiovasculaire personnels et familiaux (16 items, score /25).', '8 min', 'OUI'],

    // ── TABACOLOGIE ───────────────────────────────────────────────────────────
    ['Q_TAB_01', 'Test de motivation à l\'arrêt du tabac — Lagrue & Légeron', 'Tabacologie',
     'Évaluez votre motivation réelle à arrêter de fumer (4 questions, score /23).', '5 min', 'OUI'],
    ['Q_TAB_02', 'Test de dépendance à la nicotine — Fagerström', 'Tabacologie',
     'Mesurez votre dépendance physique à la nicotine (6 questions, score /10).', '5 min', 'OUI'],

    // ── PNEUMOLOGIE ───────────────────────────────────────────────────────────
    ['Q_PNE_01', 'Questionnaire de qualité de vie BPCO', 'Pneumologie',
     'Évaluez l\'impact de votre maladie respiratoire sur votre qualité de vie (11 items, score /33 — comparatif).', '10 min', 'OUI'],

    // ── UROLOGIE ──────────────────────────────────────────────────────────────
    ['Q_URO_01', 'IPSS — Score International des Symptômes Prostatiques', 'Urologie',
     'Évaluez la sévérité de vos symptômes urinaires prostatiques (7 items + qualité de vie, score /35 + /6).', '5 min', 'OUI'],

    // ── PÉDIATRIE ─────────────────────────────────────────────────────────────
    ['Q_PED_01', 'Échelle de Matinalité-Vespéralité Enfant — Dr Caci', 'Pédiatrie',
     'Évaluez le chronotype de l\'enfant : profil matin ou soir (10 items, score 10–43).', '5 min', 'OUI'],

    // ── RHUMATOLOGIE ──────────────────────────────────────────────────────────
    ['Q_INF_01', 'Questionnaire d\'hyperexcitabilité SIIN', 'Rhumatologie',
     'Évaluez les signes d\'hyperexcitabilité neuro-musculaire : crampes, spasmes, palpitations, sensibilités (24 items).', '10 min', 'OUI'],
    ['Q_INF_02', 'Hypersensibilité au déficit en magnésium — Spasmophilie', 'Rhumatologie',
     'Identifiez les signes de déficit en magnésium et de spasmophilie (13 items, score /52).', '5 min', 'OUI'],

    // ── SOMMEIL ───────────────────────────────────────────────────────────────
    ['Q_SOM_01', 'PSQI — Index de qualité du sommeil de Pittsburgh', 'Sommeil',
     'Évaluez la qualité globale de votre sommeil sur le dernier mois (7 composantes).', '10 min', 'OUI'],
    ['Q_SOM_02', 'ESS — Échelle de somnolence d\'Epworth', 'Sommeil',
     'Évaluez votre tendance à vous endormir dans 8 situations de la vie quotidienne.', '5 min', 'OUI'],
    ['Q_SOM_03', 'Questionnaire de Berlin — Apnée du sommeil', 'Sommeil',
     'Dépistez un syndrome d\'apnées obstructives du sommeil (3 catégories).', '5 min', 'OUI'],
    ['Q_SOM_04', 'IRLS — Syndrome des jambes sans repos', 'Sommeil',
     'Évaluez la sévérité du syndrome des jambes sans repos (10 questions, score /40).', '5 min', 'OUI'],
    ['Q_SOM_05', 'Chronotype de Horne — Matinalité/Vespéralité', 'Sommeil',
     'Déterminez votre chronotype (matin ou soir) pour adapter vos rythmes biologiques.', '10 min', 'OUI'],
    ['Q_SOM_06', 'Questionnaire de fatigue de Pichot', 'Sommeil',
     'Évaluez votre niveau de fatigue globale en 8 questions (seuil significatif > 22).', '5 min', 'OUI'],
    ['Q_SOM_07', 'MFI-20 — Échelle multidimensionnelle de fatigue', 'Sommeil',
     'Évaluez 5 dimensions de la fatigue : générale, physique, activité, motivation, mentale (20 items).', '10 min', 'OUI'],
    ['Q_SOM_08', 'IDTAS-AE — Dépression & Trouble Affectif Saisonnier', 'Sommeil',
     'Évaluez la présence d\'une dépression saisonnière et ses variations mensuelles.', '15 min', 'OUI'],

    // ── STRESS ────────────────────────────────────────────────────────────────
    ['Q_INF_03', 'Dopamine · Noradrénaline · Sérotonine · Mélatonine — SIIN', 'Stress',
     'Évaluez les signes d\'insuffisance en neurotransmetteurs sur 4 axes (4×10 questions).', '15 min', 'OUI'],
    ['Q_INF_05', 'Questionnaire d\'auto-évaluation de l\'anxiété', 'Stress',
     'Évaluez vos symptômes d\'anxiété somatique au cours des 7 derniers jours (11 items).', '5 min', 'OUI'],
    ['Q_STR_01', 'Questionnaire de stress SIIN', 'Stress',
     'Évaluez votre niveau de stress et ses manifestations (fatigue, tension, somatisation). Protocole dopaminergique/sérotoninergique/mixte.', '15 min', 'OUI'],
    ['Q_STR_02', 'PSS-10 — Échelle de stress perçu de Cohen', 'Stress',
     'Évaluez votre perception du stress au cours du dernier mois (10 questions).', '5 min', 'OUI'],
    ['Q_STR_03', 'Questionnaire de stress de Cungi', 'Stress',
     'Évaluez votre niveau de stress chronique dans 12 situations de vie quotidienne.', '5 min', 'OUI'],
    ['Q_STR_04', 'DASS-21 — Dépression Anxiété Stress', 'Stress',
     'Évaluez vos niveaux de dépression, d\'anxiété et de stress (21 questions, 3 sous-scores).', '10 min', 'OUI'],
    ['Q_STR_05', 'BMS-10 — Burnout Measure Short', 'Stress',
     'Dépistez un état d\'épuisement professionnel (burnout) en 10 questions.', '5 min', 'OUI'],
    ['Q_STR_06', 'Questionnaire de Karasek', 'Stress',
     'Évaluez votre stress au travail : latitude décisionnelle, demande psychologique, soutien social.', '10 min', 'OUI'],
    ['Q_STR_07', 'HAD — Échelle Hospitalière Anxiété-Dépression', 'Stress',
     'Dépistez anxiété (score A) et dépression (score D) en 14 questions.', '5 min', 'OUI'],
    ['Q_STR_08', 'WART — Test d\'addiction au travail', 'Stress',
     'Identifiez les comportements de workaholisme et d\'addiction au travail (25 items).', '10 min', 'OUI'],

    // ── GÉRONTOLOGIE ─────────────────────────────────────────────────────────
    ['Q_GEO_01', 'Grille de Tinetti — Équilibre et marche', 'Gérontologie',
     'Évaluez votre équilibre et votre marche — dépistage du risque de chute (score /28).', '10 min', 'OUI'],
    ['Q_GEO_02', 'SARC-F — Dépistage de la sarcopénie', 'Gérontologie',
     'Dépistez une perte de masse musculaire (sarcopénie) en 5 questions simples (score /10).', '3 min', 'OUI'],

    // ── TABACOLOGIE (suite) ───────────────────────────────────────────────────
    ['Q_TAB_03', 'QCT2 de Gilliard — Comportement tabagique', 'Tabacologie',
     'Analysez votre profil tabagique selon 4 dimensions : Dépendance, Sevrage, Appétence, Habitude (28 items).', '10 min', 'OUI'],
    ['Q_TAB_04', 'Questionnaire d\'évaluation du cannabis', 'Tabacologie',
     'Évaluez votre consommation de cannabis et ses conséquences (16 items).', '10 min', 'OUI'],
    ['Q_TAB_05', 'Di Franza — Dépendance nicotinique adolescent (HONC)', 'Tabacologie',
     'Dépistez la dépendance à la nicotine chez l\'adolescent en 10 questions oui/non.', '3 min', 'OUI'],

    // ── PÉDIATRIE (suite) ─────────────────────────────────────────────────────
    ['Q_PED_02', 'Conners Enseignant — Évaluation TDAH (forme courte)', 'Pédiatrie',
     'Évaluation du TDAH par l\'enseignant : opposition, inattention, hyperactivité (28 items, 0-3).', '10 min', 'OUI'],
    ['Q_PED_03', 'Conners Parents — Évaluation TDAH (forme courte)', 'Pédiatrie',
     'Évaluation du TDAH par les parents : opposition, inattention, hyperactivité (27 items, 0-3).', '10 min', 'OUI'],

    // ── CANCÉROLOGIE ──────────────────────────────────────────────────────────
    ['Q_CAN_01', 'QLQ-C30 — Qualité de vie oncologique (EORTC)', 'Cancérologie',
     'Questionnaire de qualité de vie validé pour les patients atteints de cancer (30 items, fonctions + symptômes).', '15 min', 'OUI'],
    ['Q_CAN_02', 'QLQ-BR23 — Module cancer du sein (EORTC)', 'Cancérologie',
     'Module complémentaire QLQ-C30 spécifique cancer du sein : image corporelle, symptômes traitement, bras, sein (23 items).', '10 min', 'OUI'],
  ];

  // Écrire toutes les lignes
  if (Q.length > 0) {
    sh.getRange(DATA_START + 1, 1, Q.length, 6).setValues(Q);
  }

  Logger.log('Catalogue initialisé : ' + Q.length + ' questionnaires');
  return { success: true, count: Q.length };
}

function initPacks() {
  const headers = ['ID_Pack', 'Nom', 'Thématique', 'Description', 'QIDs_JSON', 'Actif'];
  const sh = getOrCreateSheet('Packs', headers);

  if (sh.getLastRow() > DATA_START) {
    sh.deleteRows(DATA_START + 1, sh.getLastRow() - DATA_START);
  }

  // Aucun pack prédéfini — à créer via le Pack Builder praticien
  Logger.log('Packs : feuille réinitialisée (vide)');
  return { success: true, count: 0 };
}

// ─── MOTEUR QUESTIONNAIRES DYNAMIQUES ────────────────────────────────────────

function serveQuestionnaire(idQ) {
  try {
    const def = getQuestionnaireForClient(idQ);
    if (!def) return {error: 'Questionnaire introuvable: ' + idQ};
    return {success: true, questionnaire: def};
  } catch(e) {
    return {error: e.message};
  }
}

function submitQuestionnaire(payload) {
  // payload: {idPatient, email, idAssignation, idQuestionnaire, answers}
  try {
    const {idPatient, email, idAssignation, idQuestionnaire, answers} = payload;
    if (!idQuestionnaire || !answers) return {error: 'Données manquantes'};

    // En mode multi-rôle, on force l'enregistrement sur l'ID de la ligne Patient.
    const patientIdForSave = getPatientIdByEmail(email) || idPatient || '';

    // Calculer le score
    const scores = calculateScore(idQuestionnaire, answers);

    // Extraire interprétation principale
    let mainInterp = '';
    if (scores.interpretation) mainInterp = scores.interpretation.label || '';
    else if (scores.subScores && scores.subScores[0] && scores.subScores[0].interpretation)
      mainInterp = scores.subScores.map(s => s.label + ': ' + (s.interpretation ? s.interpretation.label : '')).join(' | ');

    // Enregistrer dans Rep_Questionnaires
    const sh = getOrCreateSheet('Rep_Questionnaires', [
      'ID_Reponse','ID_Patient','Email','ID_Assignation','ID_Questionnaire',
      'Titre_Questionnaire','Date_Soumission','Reponses_JSON','Scores_JSON',
      'Score_Principal','Interpretation'
    ]);
    const idRep = generateId('REP');
    const def = QUESTIONNAIRE_CATALOGUE[idQuestionnaire];
    const titre = def ? def.titre : idQuestionnaire;
    sh.appendRow([idRep, patientIdForSave, email, idAssignation, idQuestionnaire,
      titre, new Date(), JSON.stringify(answers), JSON.stringify(scores),
      scores.total || '', mainInterp]);
    if (idAssignation) {
      const aSh = getSheet('Assignations');
      if (aSh) {
        const rows = aSh.getDataRange().getValues();
        for (let i = DATA_START; i < rows.length; i++) {
          if (rows[i][0] === idAssignation) {
            // Colonne H = Statut. Le libellé doit rester cohérent avec l'interface : "Complété".
            aSh.getRange(i + 1, 8).setValue('Complété');
            break;
          }
        }
      }
    }
    var patientPrenom = '';
    try {
      var patRows = getSheet('Patients').getDataRange().getValues();
      for (var pi = DATA_START; pi < patRows.length; pi++) {
        if (normalizeEmail_(patRows[pi][1]) === normalizeEmail_(email) && patRows[pi][2] === 'Patient') {
          patientPrenom = patRows[pi][3];
          break;
        }
      }
    } catch(e) {}
    sendAcknowledgmentToPatient_(email, patientPrenom, titre);

    return {success: true, scores: scores, titre: titre};
  } catch(e) { return {error: e.message}; }
}

function getQuestionnaireResults(patientEmail) {
  try {
    const results = [];
    const normalizedEmail = normalizeEmail_(patientEmail);

    // Rep_Questionnaires (questionnaires génériques)
    const shQ = getSheet('Rep_Questionnaires');
    if (shQ) {
      const rowsQ = shQ.getDataRange().getValues();
      for (let i = DATA_START; i < rowsQ.length; i++) {
        const row = rowsQ[i];
        if (!row[0]) continue;
        if (normalizeEmail_(row[2]) === normalizedEmail) {
          let scores = {};
          try { scores = JSON.parse(row[8]); } catch(e) {}
          results.push({
            idReponse: row[0], idPatient: row[1], email: row[2],
            idAssignation: row[3], idQuestionnaire: row[4], titre: row[5],
            date: formatDate(row[6]), _ts: row[6] ? new Date(row[6]).getTime() : 0,
            scores: scores,
            scorePrincipal: row[9], interpretation: row[10]
          });
        }
      }
    }

    // Rep_Plaintes (questionnaire Plaintes — structure spécifique)
    const shP = getSheet('Rep_Plaintes');
    if (shP) {
      const rowsP = shP.getDataRange().getValues();
      for (let i = DATA_START; i < rowsP.length; i++) {
        const row = rowsP[i];
        if (!row[0]) continue;
        if (normalizeEmail_(row[2]) === normalizedEmail) {
          const total = (Number(row[5]) || 0) + (Number(row[6]) || 0) + (Number(row[7]) || 0) +
                        (Number(row[8]) || 0) + (Number(row[9]) || 0) + (Number(row[10]) || 0) + (Number(row[11]) || 0);
          const interp = total >= 56 ? '🟢 Faible charge' : total >= 35 ? '🟠 Charge modérée' : total > 0 ? '🔴 Charge élevée' : '—';
          results.push({
            idReponse: row[0], idPatient: row[1], email: row[2],
            idAssignation: row[3], idQuestionnaire: 'Q_PLAINTES',
            titre: 'Questionnaire de Plaintes',
            date: formatDate(row[4]), _ts: row[4] ? new Date(row[4]).getTime() : 0,
            scores: {
              total: total,
              subScores: [
                { label: 'Fatigue', total: row[5] },
                { label: 'Douleurs', total: row[6] },
                { label: 'Digestion', total: row[7] },
                { label: 'Surpoids', total: row[8] },
                { label: 'Insomnie', total: row[9] },
                { label: 'Moral', total: row[10] },
                { label: 'Mobilité', total: row[11] }
              ]
            },
            scorePrincipal: total,
            interpretation: interp
          });
        }
      }
    }

    results.sort(function(a, b) {
      return (b._ts || 0) - (a._ts || 0);
    });
    results.forEach(function(r) { delete r._ts; });

    return results;
  } catch(e) { return { error: e.message }; }
}

function ping() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}

// ─── PHASE 2A — SYNTHÈSE IA CLINIQUE ─────────────────────────────────────────

var SYNTHESE_HEADERS = [
  'ID_Synthese', 'ID_Patient', 'Email_Patient', 'Date_Generation',
  'Modele', 'Version_Prompt', 'Resultats_JSON', 'Synthese_JSON',
  'Statut', 'Validation_Praticien', 'Notes_Praticien'
];

var SYSTEM_PROMPT_SYNTHESE = [
  "Tu es un assistant d'aide à la synthèse en neuronutrition. Tu aides un praticien formé SIIN à organiser les résultats de questionnaires validés remplis par un patient avant sa consultation.",
  "Tu ne poses pas de diagnostic médical. Tu formules des hypothèses, des priorités cliniques et des questions d'entretien.",
  "Tu t'appuies uniquement sur les scores et interprétations fournis dans les données patient.",
  "Le corpus SIIN complet n'est pas encore disponible : n'invente pas de protocole SIIN et ne cite pas de source absente.",
  "Ne recommande aucun dosage précis de compléments ou de médicaments.",
  "Toute recommandation doit rester générale et être présentée comme « à valider par le praticien ».",
  "Si les données sont insuffisantes pour conclure sur un axe, signale-le explicitement.",
  "Réponds en français. Le champ resume_praticien s'adresse au praticien (langage clinique concis). Le champ narratif_patient s'adresse au patient (langage accessible, bienveillant, sans jargon médical).",
  "Utilise uniquement les formulations prudentes : hypothèse, axe à explorer, priorité clinique probable, point de vigilance, à confirmer par l'entretien.",
  "Réponds exclusivement en JSON valide, sans texte avant ni après.",
  'Structure exacte : {"resume_praticien":"...","axes_prioritaires":[{"axe":"...","niveau_priorite":"eleve|modere|faible","arguments":["..."],"points_a_confirmer":["..."]}],"points_de_vigilance":["..."],"questions_entretien":["..."],"narratif_patient":"...","limites":"Synthèse générée par IA sans corpus SIIN complet — à valider par le praticien."}'
].join('\n');

function callClaudeForSynthesis_(userMessage) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurée dans les propriétés du script.');

  var model = props.getProperty('CLAUDE_MODEL') || 'claude-sonnet-4-6';

  var payload = {
    model: model,
    max_tokens: 2048,
    messages: [
      { role: 'user', content: userMessage }
    ],
    system: SYSTEM_PROMPT_SYNTHESE
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
  var code = response.getResponseCode();
  var body = response.getContentText();

  if (code !== 200) {
    Logger.log('callClaudeForSynthesis_ HTTP ' + code + ': ' + body.substring(0, 500));
    throw new Error('Erreur API Claude (HTTP ' + code + '). Réessayez dans quelques instants.');
  }

  var parsed = JSON.parse(body);
  var text = '';
  if (parsed.content && parsed.content.length > 0) {
    text = parsed.content[0].text || '';
  }
  if (!text) throw new Error('Réponse vide de l\'API Claude.');

  var jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('La réponse IA ne contient pas de JSON valide.');

  return JSON.parse(jsonMatch[0]);
}

function buildSyntheseUserMessage_(results, patientPrenom, patientNom) {
  var filtered = results.map(function(r) {
    return {
      titre: r.titre,
      date: r.date,
      scores: r.scores,
      scorePrincipal: r.scorePrincipal,
      interpretation: r.interpretation
    };
  });

  return 'Patient : ' + (patientPrenom || '') + ' ' + (patientNom || '') + '\n' +
    'Nombre de questionnaires complétés : ' + filtered.length + '\n\n' +
    'Résultats des questionnaires :\n' +
    JSON.stringify(filtered, null, 2);
}

function getPatientInfo_(email) {
  var sh = getSheet('Patients');
  var rows = sh.getDataRange().getValues();
  var normalizedEmail = normalizeEmail_(email);
  for (var i = DATA_START; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0]) continue;
    if (normalizeEmail_(row[1]) === normalizedEmail && row[2] === 'Patient') {
      return { idPatient: row[0], prenom: row[3], nom: row[4] };
    }
  }
  return null;
}

function generateAISynthesisForPatient(patientEmail) {
  try {
    var results = getQuestionnaireResults(patientEmail);
    if (!results || results.error) return { error: results ? results.error : 'Erreur lecture résultats' };
    if (!Array.isArray(results) || results.length === 0) return { error: 'Aucun résultat disponible pour ce patient.' };

    var patient = getPatientInfo_(patientEmail);
    if (!patient) return { error: 'Patient introuvable.' };

    var userMessage = buildSyntheseUserMessage_(results, patient.prenom, patient.nom);
    var synthese = callClaudeForSynthesis_(userMessage);

    var props = PropertiesService.getScriptProperties();
    var model = props.getProperty('CLAUDE_MODEL') || 'claude-sonnet-4-6';
    var idSynthese = 'SYN' + new Date().getTime();

    var sh = getOrCreateSheet('Syntheses_IA', SYNTHESE_HEADERS);
    var lastRow = Math.max(sh.getLastRow(), DATA_START);
    sh.getRange(lastRow + 1, 1, 1, 11).setValues([[
      idSynthese,
      patient.idPatient,
      patientEmail,
      new Date(),
      model,
      'v1',
      JSON.stringify(results),
      JSON.stringify(synthese),
      'Brouillon_IA',
      '',
      ''
    ]]);

    return {
      success: true,
      idSynthese: idSynthese,
      synthese: synthese,
      modele: model,
      date: formatDate(new Date())
    };
  } catch(e) {
    Logger.log('generateAISynthesisForPatient error: ' + e.message);
    return { error: e.message };
  }
}

function validateSynthesis(idSynthese) {
  try {
    var sh = getSheet('Syntheses_IA');
    if (!sh) return { error: 'Feuille Syntheses_IA introuvable' };
    var rows = sh.getDataRange().getValues();
    for (var i = DATA_START; i < rows.length; i++) {
      if (rows[i][0] === idSynthese) {
        sh.getRange(i + 1, 9).setValue('Validee_Praticien');
        sh.getRange(i + 1, 10).setValue(new Date());
        return { success: true };
      }
    }
    return { error: 'Synthèse introuvable' };
  } catch(e) {
    return { error: e.message };
  }
}

function rejectSynthesis(idSynthese) {
  try {
    var sh = getSheet('Syntheses_IA');
    if (!sh) return { error: 'Feuille Syntheses_IA introuvable' };
    var rows = sh.getDataRange().getValues();
    for (var i = DATA_START; i < rows.length; i++) {
      if (rows[i][0] === idSynthese) {
        sh.getRange(i + 1, 9).setValue('Rejetee');
        return { success: true };
      }
    }
    return { error: 'Synthèse introuvable' };
  } catch(e) {
    return { error: e.message };
  }
}

function getLatestSynthesis(patientEmail) {
  try {
    var sh = getSheet('Syntheses_IA');
    if (!sh) return null;
    var rows = sh.getDataRange().getValues();
    var normalizedEmail = normalizeEmail_(patientEmail);
    var latest = null;

    for (var i = DATA_START; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0]) continue;
      if (normalizeEmail_(row[2]) !== normalizedEmail) continue;
      if (row[8] === 'Rejetee') continue;
      var ts = row[3] ? new Date(row[3]).getTime() : 0;
      if (!latest || ts > latest._ts) {
        var synthese = {};
        try { synthese = JSON.parse(row[7]); } catch(e) {}
        latest = {
          idSynthese: row[0],
          date: formatDate(row[3]),
          modele: row[4],
          synthese: synthese,
          statut: row[8],
          _ts: ts
        };
      }
    }

    if (latest) delete latest._ts;
    return latest;
  } catch(e) {
    return null;
  }
}
