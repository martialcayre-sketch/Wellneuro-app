// Drapeau de la relance praticien de l'agenda du sommeil.
//
// Fail-closed : seule la chaîne exacte « true » active. Une variable absente,
// vide, « 1 » ou « TRUE » laisse la relance fermée — une faute de frappe dans
// un panneau d'environnement n'ouvre jamais un chemin d'envoi vers un patient
// par accident (même doctrine que WN_C4_ENABLED / WN_CB_ENABLED).
//
// Le paramètre par défaut est délibéré : c'est lui qui rend le drapeau
// testable sans toucher à `process.env`.
export function isRelanceAgendaEnabled(value = process.env.WN_AGENDA_RELANCE): boolean {
  return value === 'true';
}
