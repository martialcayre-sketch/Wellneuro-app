// Rappel de l'agenda du sommeil POSÉ PAR LE PATIENT SUR SON APPAREIL — un
// fichier calendrier (iCalendar, RFC 5545) qu'il ajoute lui-même à l'agenda de
// son téléphone. Domaine PUR : aucune dépendance, aucun réseau.
//
// POURQUOI SUR L'APPAREIL. `REGISTRE_FRONTIERES.md` interdit toute tâche
// planifiée et toute relance déduite d'un état : un rappel envoyé par le
// serveur, même demandé par le patient, en serait une. Ici le serveur n'envoie
// rien et ne sait rien : le fichier est fabriqué dans le navigateur, au geste
// du patient, et c'est son téléphone qui sonne (arbitrage du responsable du
// 2026-10-07, LOT-05 de la campagne 2026-10-07-agenda-sommeil-adhesion).
//
// CE QUE LE FICHIER NE PORTE PAS, ET POURQUOI :
// - AUCUN LIEN. Un lien de session posé dans un calendrier synchronisé (iCloud,
//   Google) serait une clé d'accès au dossier copiée hors de l'appareil.
// - AUCUNE DONNÉE DE SANTÉ, ni même le mot « sommeil » : le titre s'affiche sur
//   l'écran verrouillé et dans les agendas partagés. « Rappel du matin » ne dit
//   rien de plus que l'heure ; le patient sait à quoi il sert, il l'a posé.
// - AUCUN FUSEAU. L'heure est « flottante » (sans `Z` ni `TZID`) : 7 h 30 reste
//   7 h 30 à l'heure locale du téléphone, comme les heures de l'agenda, qui sont
//   en horloge murale.

export const TITRE_RAPPEL = 'Rappel du matin';

const RE_HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;

function horodatageUtc(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

export function genererRappelIcs({
  heure,
  dateDebut,
  nombre,
  uid,
  maintenant,
}: {
  heure: string; // HH:MM, heure locale du rappel
  dateDebut: string; // AAAA-MM-JJ, premier matin du rappel
  nombre: number; // nombre de matins (≥ 1)
  uid: string; // identifiant unique de l'événement
  maintenant: Date; // horodatage de création (DTSTAMP)
}): string {
  if (!RE_HEURE.test(heure)) throw new TypeError('Heure de rappel invalide.');
  if (!RE_DATE.test(dateDebut)) throw new TypeError('Date de début invalide.');
  if (!Number.isInteger(nombre) || nombre < 1) throw new TypeError('Nombre de rappels invalide.');

  const [h, m] = heure.split(':');
  const debut = `${dateDebut.replaceAll('-', '')}T${h}${m}00`;
  // RFC 5545 : lignes terminées par CRLF.
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    // PRODID neutre : il n'est pas affiché, mais iCloud le conserve, et une
    // marque de soin suffirait à trahir un suivi.
    'PRODID:-//Rappel du matin//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${horodatageUtc(maintenant)}`,
    `DTSTART:${debut}`,
    'DURATION:PT5M',
    `RRULE:FREQ=DAILY;COUNT=${nombre}`,
    `SUMMARY:${TITRE_RAPPEL}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${TITRE_RAPPEL}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
