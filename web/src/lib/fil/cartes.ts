/**
 * Le Fil du jour (SP-FIL LOT-01) — construction des cartes depuis les données
 * existantes. Fonctions pures, sans accès base : la route
 * `api/praticien/fil` fournit les lignes, ce module décide quoi montrer et
 * pourquoi. Chaque carte porte son « pourquoi maintenant » et une action
 * explicite — proposition, jamais capture (décision A6, REGISTRE_FRONTIERES).
 */

import { bornesJourParis, formatHeureParis } from './fuseau';

// `reponse_recente` a été retiré (accueil-observatoire LOT-02, décision
// propriétaire 2026-07-23) : les questionnaires reçus vivent dans l'inbox par
// patient (`lib/fil/inbox.ts`), plus dans le Fil. Les refus déjà posés sur ces
// clés restent en base, inertes (append-only).
export type TypeCarteFil =
  | 'consultation_prevue'
  | 'signalement_trust'
  | 'synthese_a_valider'
  | 'jalon_j21'
  | 'assignation_en_retard'
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
  /** Identité stable de la carte — voir `cleCarte`. */
  cle: string;
  /** Nombre de lignes sources portées par la carte (cartes agrégées) — 1 sinon. */
  nbElements?: number;
};

/**
 * Identité d'une carte du Fil (prérequis de G1 — refus persisté).
 *
 * Les cartes sont des projections recalculées à chaque ouverture : sans clé,
 * on ne peut pas dire ce qui a été refusé. La clé est **ancrée sur la ligne
 * source**, pas sur un triplet `type + patient + date` : une carte sans date
 * n'aurait pas de clé, et deux cartes de même type au même instant se
 * confondraient — le refus « sauterait » et la carte reviendrait le lendemain.
 *
 * Deux cartes font exception parce qu'elles sont agrégées et n'ont donc pas
 * de ligne source unique : `reprise` (clé = `idPatient + date de référence`,
 * stable tant que le patient reste inactif) et `synthese_a_valider` (clé =
 * `agregat + idPatient + date de la synthèse la plus récente`). Pour la
 * seconde, une nouvelle synthèse déplace la date de référence, donc la clé :
 * la carte écartée REVIENT — c'est voulu, un fait nouveau mérite une nouvelle
 * décision. Les refus posés sur l'ancienne clé restent en base, inertes
 * (append-only, jamais nettoyés).
 */
export function cleCarte(type: TypeCarteFil, identifiant: string): string {
  return `${type}:${identifiant}`;
}

export type SignalementRow = {
  /** Identifiant de la ligne source, dans sa table d'origine. */
  id: string;
  idPatient: string;
  kind: 'effet_indesirable' | 'incident_confidentialite' | 'demande_droit';
  soumisLe: Date;
};
export type AssignationRow = {
  idAssignation: string;
  idPatient: string;
  titre: string;
  dateLimite: string | null;
  statut: string;
};
export type SyntheseRow = { idSynthese: string; idPatient: string; dateGeneration: Date };
/** Carte agrégée : pas de ligne source, donc pas d'identifiant à remonter. */
export type DerniereActiviteRow = { idPatient: string; derniereReponse: Date };

/** Sens du momentum tel que le porte l'équilibre (T0 → dernier jalon mesuré). */
export type TendanceMomentumCarte = 'hausse' | 'stable' | 'baisse';
/**
 * Jalon J21 atteint sans décision consignée. La ligne source est le check-in
 * J21 (`idCheckin`) : ancre stable pour le refus G1. `adhesion` et `momentum`
 * sont des enrichissements FACTUELS et OPTIONNELS — cités seulement s'ils
 * existent réellement, jamais inventés (A8-2 : jamais un 0 à la place d'un
 * jalon non mesuré).
 */
export type JalonRow = {
  idCheckin: string;
  idPatient: string;
  soumisLe: Date;
  adhesion?: string | null;
  momentum?: { tendance: TendanceMomentumCarte; delta: number } | null;
};

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

/** Rendez-vous planifié (accueil-observatoire LOT-04). Ligne source réelle. */
export type RendezVousRow = { id: string; idPatient: string; dateHeure: Date };

/** Délai (min) sous lequel une consultation est annoncée « dans X min » plutôt
 * qu'à son heure — au-delà, ou passée, on affiche l'heure. */
const IMMINENCE_CONSULTATION_MIN = 60;

/**
 * Consultations prévues aujourd'hui → cartes « Pré-vol prêt » horodatées.
 * Réutilise le pré-vol SP-COP (href `/dashboard/copilote?idPatient=`), rien de
 * nouveau côté préparation. Bornées au jour civil de `maintenant`.
 */
export function cartesConsultationsPrevues(
  rdvs: RendezVousRow[],
  noms: Map<string, string>,
  maintenant: Date,
): CarteFil[] {
  // Jour civil de Paris (le cabinet), pas le jour UTC du serveur.
  const { debut, fin } = bornesJourParis(maintenant);

  return rdvs
    .filter(r => r.dateHeure >= debut && r.dateHeure < fin)
    .sort((a, b) => a.dateHeure.getTime() - b.dateHeure.getTime())
    .slice(0, MAX_CARTES_PAR_TYPE)
    .map(r => {
      const minutes = Math.round((r.dateHeure.getTime() - maintenant.getTime()) / 60000);
      const pourquoi =
        minutes >= 0 && minutes <= IMMINENCE_CONSULTATION_MIN
          ? `Consultation dans ${minutes} min.`
          : `Consultation à ${formatHeureParis(r.dateHeure)}.`;
      return {
        type: 'consultation_prevue' as const,
        idPatient: r.idPatient,
        patient: nomPatient(noms, r.idPatient),
        titre: 'Pré-vol prêt',
        pourquoi,
        date: r.dateHeure.toISOString(),
        href: `/dashboard/copilote?idPatient=${encodeURIComponent(r.idPatient)}`,
        actionLabel: 'Ouvrir le pré-vol',
        cle: cleCarte('consultation_prevue', r.id),
      };
    });
}

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
      // Trois tables sources distinctes : le `kind` les désambiguïse.
      cle: cleCarte('signalement_trust', `${s.kind}:${s.id}`),
    }));
}

/**
 * Synthèses en brouillon, agrégées PAR PATIENT (« N relectures en attente »,
 * maquette Spirale). L'agrégat global de la maquette est impossible : le refus
 * G1 est ancré sur un patient (FK), une carte trans-patients n'aurait pas de
 * refus valide. Voir `cleCarte` pour la sémantique de la clé d'agrégat.
 */
export function cartesSynthesesAValider(
  syntheses: SyntheseRow[],
  noms: Map<string, string>,
): CarteFil[] {
  const parPatient = new Map<string, { nb: number; dateRef: Date }>();
  for (const s of syntheses) {
    const agregat = parPatient.get(s.idPatient);
    if (!agregat) {
      parPatient.set(s.idPatient, { nb: 1, dateRef: s.dateGeneration });
    } else {
      agregat.nb += 1;
      if (s.dateGeneration > agregat.dateRef) agregat.dateRef = s.dateGeneration;
    }
  }
  return [...parPatient.entries()]
    .sort((a, b) => b[1].dateRef.getTime() - a[1].dateRef.getTime())
    .slice(0, MAX_CARTES_PAR_TYPE)
    .map(([idPatient, { nb, dateRef }]) => ({
      type: 'synthese_a_valider' as const,
      idPatient,
      patient: nomPatient(noms, idPatient),
      titre: `${nb} relecture${nb > 1 ? 's' : ''} en attente`,
      pourquoi: `Dernière synthèse générée le ${formatDateFr(dateRef)} — rien n'est diffusé sans votre validation.`,
      date: dateRef.toISOString(),
      href: '/dashboard/synthese',
      actionLabel: 'Relire',
      cle: cleCarte('synthese_a_valider', `agregat:${idPatient}:${dateRef.toISOString()}`),
      nbElements: nb,
    }));
}

/**
 * Jalons J21 atteints sans décision de 21 jours consignée. Une carte par
 * patient, ancrée sur son check-in J21 (ligne source réelle → refus G1
 * standard). Le « pourquoi maintenant » cite la date du check-in, et — quand
 * ils existent réellement — l'action principale observée et le momentum.
 */
export function cartesJalons(jalons: JalonRow[], noms: Map<string, string>): CarteFil[] {
  return jalons
    .slice()
    .sort((a, b) => b.soumisLe.getTime() - a.soumisLe.getTime())
    .slice(0, MAX_CARTES_PAR_TYPE)
    .map(j => {
      const morceaux = [
        `Check-in J21 reçu le ${formatDateFr(j.soumisLe)} — décision de 21 jours à consigner.`,
      ];
      if (j.adhesion) morceaux.push(`Action principale : « ${j.adhesion} ».`);
      if (j.momentum) {
        morceaux.push(
          j.momentum.tendance === 'stable'
            ? 'Momentum stable.'
            : `Momentum en ${j.momentum.tendance} de ${Math.abs(j.momentum.delta)}.`,
        );
      }
      return {
        type: 'jalon_j21' as const,
        idPatient: j.idPatient,
        patient: nomPatient(noms, j.idPatient),
        titre: 'Jalon J21 atteint — décision attendue',
        pourquoi: morceaux.join(' '),
        date: j.soumisLe.toISOString(),
        href: `/dashboard/patients/${j.idPatient}`,
        actionLabel: 'Ouvrir la fiche',
        cle: cleCarte('jalon_j21', j.idCheckin),
      };
    });
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
        cle: cleCarte('assignation_en_retard', a.idAssignation),
      };
    });
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
        // Seule carte agrégée du Fil : sa clé se fonde sur la date de référence
        // à défaut de ligne source. Voir `cleCarte`.
        cle: cleCarte('reprise', `${a.idPatient}:${a.derniereReponse.toISOString()}`),
      };
    });
}

/**
 * Résumé qualitatif du panneau « Aujourd'hui » (maquette : « 3 consultations ·
 * 2 relectures ») — remplace le compteur brut « N cartes ». Les consultations
 * ouvrent le résumé (maquette), même si dans le Fil les signalements passent
 * devant ; les cartes agrégées comptent leurs lignes sources (`nbElements`).
 */
const LIBELLES_RESUME: { type: TypeCarteFil; singulier: string; pluriel: string }[] = [
  { type: 'consultation_prevue', singulier: 'consultation', pluriel: 'consultations' },
  { type: 'signalement_trust', singulier: 'signalement', pluriel: 'signalements' },
  { type: 'synthese_a_valider', singulier: 'relecture', pluriel: 'relectures' },
  { type: 'jalon_j21', singulier: 'jalon', pluriel: 'jalons' },
  { type: 'assignation_en_retard', singulier: 'retard', pluriel: 'retards' },
  { type: 'reprise', singulier: 'reprise', pluriel: 'reprises' },
];

export function resumeFil(cartes: CarteFil[]): string {
  return LIBELLES_RESUME.map(({ type, singulier, pluriel }) => {
    const duType = cartes.filter(c => c.type === type);
    if (duType.length === 0) return null;
    const nb = duType.reduce((somme, c) => somme + (c.nbElements ?? 1), 0);
    return `${nb} ${nb > 1 ? pluriel : singulier}`;
  })
    .filter((libelle): libelle is string => libelle !== null)
    .join(' · ');
}

/**
 * Carte imminente : celle que la timeline met en avant (badge « Maintenant »,
 * action primaire). Avec des heures réelles (rendez-vous, LOT-04), c'est la
 * consultation À VENIR la plus proche ; à défaut, la tête de l'ordre fixe — ce
 * qui attend le praticien d'abord.
 */
export function indexCarteImminente(cartes: CarteFil[], maintenant?: Date): number {
  if (cartes.length === 0) return -1;
  if (maintenant) {
    const t = maintenant.getTime();
    let meilleur = -1;
    let plusProche = Infinity;
    cartes.forEach((c, i) => {
      if (c.type !== 'consultation_prevue' || !c.date) return;
      const d = new Date(c.date).getTime();
      if (d >= t && d < plusProche) {
        plusProche = d;
        meilleur = i;
      }
    });
    if (meilleur !== -1) return meilleur;
  }
  return 0;
}

/** Ordre du Fil : ce qui attend le praticien d'abord, les signaux ensuite. */
export function construireFil(entrees: {
  consultations?: RendezVousRow[];
  signalements?: SignalementRow[];
  syntheses: SyntheseRow[];
  jalons?: JalonRow[];
  assignations: AssignationRow[];
  activites: DerniereActiviteRow[];
  noms: Map<string, string>;
  maintenant: Date;
}): CarteFil[] {
  const {
    consultations = [],
    signalements = [],
    syntheses,
    jalons = [],
    assignations,
    activites,
    noms,
    maintenant,
  } = entrees;
  return [
    // Un signalement TRUST attend une réponse humaine : il précède tout, même
    // une consultation imminente. Viennent ensuite les consultations du jour.
    ...cartesSignalementsTrust(signalements, noms),
    ...cartesConsultationsPrevues(consultations, noms, maintenant),
    ...cartesSynthesesAValider(syntheses, noms),
    ...cartesJalons(jalons, noms),
    ...cartesAssignationsEnRetard(assignations, noms, maintenant),
    ...cartesReprise(activites, noms, maintenant),
  ];
}
