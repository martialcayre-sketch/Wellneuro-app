/**
 * Inbox des questionnaires en attente de consultation (accueil Observatoire,
 * LOT-02) — domaine PUR, aucun accès base.
 *
 * Décision propriétaire 2026-07-23 : l'inbox REMPLACE les cartes « Reçu » du
 * Fil. Une ligne PAR PATIENT (nombre + dernière date + derniers titres),
 * jamais une ligne par questionnaire — c'est la « liste interminable » que
 * l'accueil ne doit plus être.
 *
 * « En attente de consultation » : réponses postérieures à la dernière
 * consultation VALIDÉE du patient — la même ancre que le pré-vol SP-COP
 * (`Consultation.dateValidation`). Sans consultation validée, toutes les
 * réponses attendent.
 */

export type ReponseInboxRow = { idReponse: string; idPatient: string; titre: string; dateReponse: Date };

export type LigneInbox = {
  idPatient: string;
  patient: string;
  nb: number;
  /** ISO — la réponse la plus récente du patient. */
  derniereDate: string;
  /** Titres des dernières réponses (au plus 3, sans doublon), plus récent d'abord. */
  titres: string[];
};

const MAX_TITRES = 3;

export function lignesInbox(
  reponses: ReponseInboxRow[],
  derniereConsultationValidee: Map<string, Date>,
  noms: Map<string, string>,
  reponsesLues = new Set<string>(),
): LigneInbox[] {
  const parPatient = new Map<string, ReponseInboxRow[]>();
  for (const r of reponses) {
    if (reponsesLues.has(r.idReponse)) continue;
    const ancre = derniereConsultationValidee.get(r.idPatient);
    if (ancre && r.dateReponse <= ancre) continue; // déjà vue en consultation
    const liste = parPatient.get(r.idPatient);
    if (liste) liste.push(r);
    else parPatient.set(r.idPatient, [r]);
  }

  return [...parPatient.entries()]
    .map(([idPatient, lignes]) => {
      const triees = lignes.slice().sort((a, b) => b.dateReponse.getTime() - a.dateReponse.getTime());
      const titres: string[] = [];
      for (const l of triees) {
        if (!titres.includes(l.titre)) titres.push(l.titre);
        if (titres.length >= MAX_TITRES) break;
      }
      return {
        idPatient,
        patient: noms.get(idPatient) ?? 'Patient',
        nb: lignes.length,
        derniereDate: triees[0].dateReponse.toISOString(),
        titres,
      };
    })
    .sort((a, b) => b.derniereDate.localeCompare(a.derniereDate));
}
