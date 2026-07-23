/**
 * Horodatage de la timeline du Fil (colonne heure de la maquette Spirale).
 * Rien d'inventé : le texte affiché est toujours la date réelle de
 * l'événement source — l'heure seulement si l'événement date d'aujourd'hui,
 * une date courte sinon. Les échéances stockées à minuit (assignations en
 * retard) sont toujours des jours passés : elles affichent une date, jamais
 * un « 00:00 » absurde.
 */

const FORMAT_HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const FORMAT_DATE_COURTE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const FORMAT_DATE_ANNEE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function memeJourCivil(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function libelleTemporel(
  dateISO: string | null,
  maintenant: Date,
): { texte: string; estAujourdhui: boolean } {
  if (!dateISO) return { texte: '—', estAujourdhui: false };
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return { texte: '—', estAujourdhui: false };

  if (memeJourCivil(date, maintenant)) {
    return { texte: FORMAT_HEURE.format(date), estAujourdhui: true };
  }
  const hier = new Date(maintenant);
  hier.setDate(hier.getDate() - 1);
  if (memeJourCivil(date, hier)) return { texte: 'hier', estAujourdhui: false };
  if (date.getFullYear() === maintenant.getFullYear()) {
    return { texte: FORMAT_DATE_COURTE.format(date), estAujourdhui: false };
  }
  return { texte: FORMAT_DATE_ANNEE.format(date), estAujourdhui: false };
}
