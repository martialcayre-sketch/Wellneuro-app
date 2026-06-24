/**
 * Backend Google Apps Script du MVP NutriConsult NNPP2.
 *
 * Règle de sécurité : ne jamais écrire l'identifiant Google Sheets en dur.
 * Définir SHEET_ID dans les propriétés du script Apps Script.
 */
function getSheetId_() {
  return PropertiesService.getScriptProperties().getProperty('SHEET_ID');
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('NutriConsult NNPP2');
}
