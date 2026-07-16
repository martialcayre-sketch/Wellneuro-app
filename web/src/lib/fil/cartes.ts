/**
 * Le Fil du jour (SP-FIL LOT-01) — construction des cartes depuis les données
 * existantes. Fonctions pures, sans accès base : la route
 * `api/praticien/fil` fournit les lignes, ce module décide quoi montrer et
 * pourquoi. Chaque carte porte son « pourquoi maintenant » et une action
 * explicite — proposition, jamais capture (décision A6, REGISTRE_FRONTIERES).
 */

export type TypeCarteFil =
  | 'signalement_trust'
  | 'synthese_a_valider'
  | 'assignation_en_retard'
  | 'reponse_recente'
  | 'reprise';

export type CarteFil = {
  type: TypeCarteFil;
  idPatient: string;
  patient: string;
  titre: string;
  pourquoi: string;
  /** Date de l'événement (ISO), null si non datable. */
  date: string | null;
  href: string;
  actionLabel: string;
};

export type SignalementRow = {
  idPatient: string;
  kind: 'effet_indesirable' | 'incident_confidentialite' | 'demande_droit';
  soumisLe: Date;
};
export type ReponseRow = { idPatient: string; titre: string; dateReponse: Date };
export type AssignationRow = { idPatient: string; titre: string; dateLimite: string | null; statut: string };
export type SyntheseRow = { idPatient: string; dateGeneration: Date };
export type DerniereActiviteRow = { idPatient: string; derniereReponse: Date };

/** Fenêtre de « récence » d'une réponse reçue. */
export const RECENCE_REPONSE_JOURS = 7;
/** Inactivité au-delà de laquelle un patient est signalé en reprise. */
export const SEUIL_REPRISE_MOIS = 6;
/** Plafond de cartes par type pour garder le Fil lisible. */
export const MAX_CARTES_PAR_TYPE = 5;

const JOUR_MS = 24 * 60 * 60 * 1000;

const formatDateFr = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(d);

function nomPatient(noms: Map<string, string>, idPatient: string): string {
  return noms.get(idPatient) ?? 'Patient';
}

/** `dateLimite` est stockée en chaîne `YYYY-MM-DD` (cf. api/praticien/assignations). */
function parseDateLimite(dateLimite: string | null): Date | null {
  if (!dateLimite || !/^\d{4}-\d{2}-\d{2}$/.test(dateLimite)) return null;
  const d = new Date(`${dateLimite}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const LIBELLE_SIGNALEMENT: Record<SignalementRow['kind'], string> = {
  effet_indesirable: 'Effet indésirable suspecté',
  incident_confidentialite: 'Incident de confidentialité',
  demande_droit: 'Demande d’exercice de droit',
};

/** Signalements TRUST non traités : toujours en tête du Fil — c'est un
 * patient qui attend une réponse humaine. */
export function cartesSignalementsTrust(
  signalements: SignalementRow[],
  noms: Map<string, string>,
): CarteFil[] {
  return signalements
    .slice()
    .sort((a, b) => b.soumisLe.getTime() - a.soumisLe.getTime())
    .slice(0, MAX_CARTES_PAR_TYPE)
    .map(s => ({
      type: 'signalement_trust' as const,
      idPatient: s.idPatient,
      patient: nomPatient(noms, s.idPatient),
      titre: LIBELLE_SIGNALEMENT[s.kind],
      pourquoi: `Déposé le ${formatDateFr(s.soumisLe)} — en attente de votre examen.`,
      date: s.soumisLe.toISOString(),
      href: '/dashboard/droits',
      actionLabel: 'Examiner',
    }));
}

export function cartesSynthesesAValider(
  syntheses: SyntheseRow[],
  noms: Map<string, string>,
): CarteFil[] {
  return syntheses
    .slice()
    .sort((a, b) => b.dateGeneration.getTime() - a.dateGeneration.getTime())
    .slice(0, MAX_CARTES_PAR_TYPE)
    .map(s => ({
      type: 'synthese_a_valider' as const,
      idPatient: s.idPatient,
      patient: nomPatient(noms, s.idPatient),
      titre: 'Synthèse IA en brouillon',
      pourquoi: `Générée le ${formatDateFr(s.dateGeneration)} — rien n'est diffusé sans votre validation.`,
      date: s.dateGeneration.toISOString(),
      href: '/dashboard/synthese',
      actionLabel: 'Relire et valider',
    }));
}

export function cartesAssignationsEnRetard(
  assignations: AssignationRow[],
  noms: Map<string, string>,
  maintenant: Date,
): CarteFil[] {
  const debutJour = new Date(maintenant);
  debutJour.setHours(0, 0, 0, 0);

  return assignations
    .filter(a => a.statut !== 'Complété')
    .map(a => ({ a, limite: parseDateLimite(a.dateLimite) }))
    .filter((x): x is { a: AssignationRow; limite: Date } => x.limite !== null && x.limite < debutJour)
    .sort((x, y) => x.limite.getTime() - y.limite.getTime())
    .slice(0, MAX_CARTES_PAR_TYPE)
    .map(({ a, limite }) => {
      const joursRetard = Math.max(1, Math.floor((debutJour.getTime() - limite.getTime()) / JOUR_MS));
      return {
        type: 'assignation_en_retard' as const,
        idPatient: a.idPatient,
        patient: nomPatient(noms, a.idPatient),
        titre: a.titre,
        pourquoi: `Échéance dépassée depuis ${joursRetard} jour${joursRetard > 1 ? 's' : ''} (limite : ${formatDateFr(limite)}).`,
        date: limite.toISOString(),
        href: `/dashboard/patients/${a.idPatient}`,
        actionLabel: 'Ouvrir la fiche',
      };
    });
}

export function cartesReponsesRecentes(
  reponses: ReponseRow[],
  noms: Map<string, string>,
  maintenant: Date,
): CarteFil[] {
  const seuil = maintenant.getTime() - RECENCE_REPONSE_JOURS * JOUR_MS;
  return reponses
    .filter(r => r.dateReponse.getTime() >= seuil)
    .sort((a, b) => b.dateReponse.getTime() - a.dateReponse.getTime())
    .slice(0, MAX_CARTES_PAR_TYPE)
    .map(r => ({
      type: 'reponse_recente' as const,
      idPatient: r.idPatient,
      patient: nomPatient(noms, r.idPatient),
      titre: r.titre,
      pourquoi: `Réponses reçues le ${formatDateFr(r.dateReponse)}.`,
      date: r.dateReponse.toISOString(),
      href: `/dashboard/patients/${r.idPatient}`,
      actionLabel: 'Consulter les réponses',
    }));
}

/**
 * Signal de reprise v1 : purement informatif, sans pack pré-composé (le pack
 * de réévaluation pré-composé arrive avec SP-SPI, après C2A — décision A6-5).
 */
export function cartesReprise(
  activites: DerniereActiviteRow[],
  noms: Map<string, string>,
  maintenant: Date,
): CarteFil[] {
  const seuil = new Date(maintenant);
  seuil.setMonth(seuil.getMonth() - SEUIL_REPRISE_MOIS);

  return activites
    .filter(a => a.derniereReponse < seuil)
    .sort((a, b) => a.derniereReponse.getTime() - b.derniereReponse.getTime())
    .slice(0, MAX_CARTES_PAR_TYPE)
    .map(a => {
      const mois = Math.max(
        SEUIL_REPRISE_MOIS,
        Math.floor((maintenant.getTime() - a.derniereReponse.getTime()) / (30 * JOUR_MS)),
      );
      return {
        type: 'reprise' as const,
        idPatient: a.idPatient,
        patient: nomPatient(noms, a.idPatient),
        titre: 'Suivi interrompu',
        pourquoi: `Dernières réponses il y a environ ${mois} mois — une réévaluation peut se discuter.`,
        date: a.derniereReponse.toISOString(),
        href: `/dashboard/patients/${a.idPatient}`,
        actionLabel: 'Ouvrir la fiche',
      };
    });
}

/** Ordre du Fil : ce qui attend le praticien d'abord, les signaux ensuite. */
export function construireFil(entrees: {
  signalements?: SignalementRow[];
  syntheses: SyntheseRow[];
  assignations: AssignationRow[];
  reponses: ReponseRow[];
  activites: DerniereActiviteRow[];
  noms: Map<string, string>;
  maintenant: Date;
}): CarteFil[] {
  const { signalements = [], syntheses, assignations, reponses, activites, noms, maintenant } = entrees;
  return [
    ...cartesSignalementsTrust(signalements, noms),
    ...cartesSynthesesAValider(syntheses, noms),
    ...cartesAssignationsEnRetard(assignations, noms, maintenant),
    ...cartesReponsesRecentes(reponses, noms, maintenant),
    ...cartesReprise(activites, noms, maintenant),
  ];
}
