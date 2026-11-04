/**
 * Lectures de la carte « Sans avancée » ([[D-440]]) — le côté serveur de
 * `cartesSansAvancee` (module pur, `cartes.ts`), qui décide.
 *
 * DES LECTURES D'ENSEMBLE, BORNÉES AUX DOSSIERS DU PRATICIEN : un maximum par
 * source et par dossier, jamais une boucle par patient. La seule évaluation
 * par dossier est celle du §7, et elle ne porte que sur les cartes affichées
 * (`ceQuiRetientT0`).
 */

import { prisma } from '@/lib/prisma';
import { filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { preconditionsT0PourPatient } from '@/lib/clinical-engine/preconditionsT0Prisma';
import type { DossierParcoursRow, QuestionnaireSansReponseRow } from './cartes';

/** Statuts d'assignation qui ne sont plus attendus ([[D-422]] §1) ou déjà rendus. */
const STATUT_ANNULEE = 'Annulée';
const STATUT_COMPLETE = 'Complété';

function parPatient<T extends { idPatient: string }>(lignes: T[], date: (ligne: T) => Date | null): Map<string, Date> {
  const carte = new Map<string, Date>();
  for (const ligne of lignes) {
    const d = date(ligne);
    if (d) carte.set(ligne.idPatient, d);
  }
  return carte;
}

/**
 * Les dossiers du praticien, avec ce que la carte lit (§1, §2, §4). Les
 * exclusions se décident dans le module pur : dossier désactivé ou clos et
 * rendez-vous à venir sont LUS ici, jamais filtrés en SQL.
 */
export async function lireDossiersParcours(
  email: string,
  maintenant: Date,
): Promise<{ dossiers: DossierParcoursRow[]; noms: Map<string, string> }> {
  const patients = await prisma.patient.findMany({
    where: filtrePatientsDuPraticien(email),
    select: { idPatient: true, prenom: true, nom: true, actif: true, suiviClotureLe: true },
  });
  if (patients.length === 0) return { dossiers: [], noms: new Map() };
  const dansLesDossiers = { idPatient: { in: patients.map(p => p.idPatient) } };

  const [
    reponses,
    assignations,
    assignationsRepondues,
    syntheses,
    consultations,
    episodes,
    episodesT0,
    priorites,
    objectifs,
    brouillons,
    livrets,
    diffusions,
    rendezVous,
  ] = await Promise.all([
    prisma.questionnaireReponse.groupBy({ by: ['idPatient'], where: dansLesDossiers, _max: { dateReponse: true } }),
    prisma.assignation.findMany({
      where: dansLesDossiers,
      select: { idAssignation: true, idPatient: true, dateAssignation: true, dateLimite: true, statut: true },
    }),
    // « Sans réponse » = aucune réponse RATTACHÉE à l'assignation, quel que
    // soit son statut (§1, situation 3).
    prisma.questionnaireReponse.groupBy({
      by: ['idAssignation'],
      where: { ...dansLesDossiers, idAssignation: { not: null } },
    }),
    prisma.syntheseIA.groupBy({
      by: ['idPatient'],
      where: dansLesDossiers,
      _max: { dateGeneration: true, dateValidation: true },
    }),
    prisma.consultation.groupBy({ by: ['idPatient'], where: dansLesDossiers, _max: { dateValidation: true } }),
    prisma.assessmentEpisode.groupBy({ by: ['idPatient'], where: dansLesDossiers, _max: { confirmedAt: true } }),
    prisma.assessmentEpisode.groupBy({
      by: ['idPatient'],
      where: { ...dansLesDossiers, milestone: 'T0' },
      _min: { confirmedAt: true },
    }),
    prisma.decisionPrioritySelection.groupBy({ by: ['idPatient'], where: dansLesDossiers, _max: { createdAt: true } }),
    prisma.objectifNegocie.groupBy({ by: ['idPatient'], where: dansLesDossiers, _max: { creeLe: true } }),
    prisma.protocolDraft.groupBy({ by: ['idPatient'], where: dansLesDossiers, _max: { updatedAt: true } }),
    prisma.bookletEnvoi.groupBy({
      by: ['idPatient'],
      where: { ...dansLesDossiers, statut: 'Envoye' },
      _max: { dateEnvoi: true },
    }),
    prisma.protocolDiffusionApproval.groupBy({ by: ['idPatient'], where: dansLesDossiers, _count: { _all: true } }),
    prisma.rendezVous.groupBy({
      by: ['idPatient'],
      where: { ...dansLesDossiers, statut: 'planifie', dateHeure: { gt: maintenant } },
      _count: { _all: true },
    }),
  ]);

  const derniereReponse = parPatient(reponses, r => r._max.dateReponse);
  const syntheseGeneree = parPatient(syntheses, s => s._max.dateGeneration);
  const syntheseValidee = parPatient(syntheses, s => s._max.dateValidation);
  const consultationValidee = parPatient(consultations, c => c._max.dateValidation);
  const episodeConfirme = parPatient(episodes, e => e._max.confirmedAt);
  const t0 = parPatient(episodesT0, e => e._min.confirmedAt);
  const priorite = parPatient(priorites, p => p._max.createdAt);
  const objectif = parPatient(objectifs, o => o._max.creeLe);
  const brouillon = parPatient(brouillons, b => b._max.updatedAt);
  const livret = parPatient(livrets, l => l._max.dateEnvoi);
  const diffuses = new Set(diffusions.map(d => d.idPatient));
  const avecRendezVous = new Set(rendezVous.map(r => r.idPatient));
  const repondues = new Set(assignationsRepondues.map(a => a.idAssignation));

  // Une annulée n'est ni un pas (§2) ni un questionnaire attendu (§4).
  const derniereAssignation = new Map<string, Date>();
  const sansReponse = new Map<string, QuestionnaireSansReponseRow[]>();
  for (const a of assignations) {
    if (a.statut === STATUT_ANNULEE) continue;
    const connue = derniereAssignation.get(a.idPatient);
    if (!connue || a.dateAssignation.getTime() > connue.getTime()) derniereAssignation.set(a.idPatient, a.dateAssignation);
    if (a.statut === STATUT_COMPLETE || repondues.has(a.idAssignation)) continue;
    const liste = sansReponse.get(a.idPatient) ?? [];
    liste.push({ dateAssignation: a.dateAssignation, dateLimite: a.dateLimite });
    sansReponse.set(a.idPatient, liste);
  }

  const dossiers: DossierParcoursRow[] = patients.map(p => ({
    idPatient: p.idPatient,
    actif: p.actif,
    suiviClos: p.suiviClotureLe !== null,
    rendezVousAVenir: avecRendezVous.has(p.idPatient),
    aDesReponses: derniereReponse.has(p.idPatient),
    t0ConsigneLe: t0.get(p.idPatient) ?? null,
    diffuse: diffuses.has(p.idPatient),
    pas: {
      reponse: derniereReponse.get(p.idPatient),
      assignation: derniereAssignation.get(p.idPatient),
      synthese_generee: syntheseGeneree.get(p.idPatient),
      synthese_validee: syntheseValidee.get(p.idPatient),
      consultation_validee: consultationValidee.get(p.idPatient),
      episode_confirme: episodeConfirme.get(p.idPatient),
      priorite_choisie: priorite.get(p.idPatient),
      objectif_negocie: objectif.get(p.idPatient),
      brouillon_protocole: brouillon.get(p.idPatient),
      livret_envoye: livret.get(p.idPatient),
    },
    questionnairesSansReponse: sansReponse.get(p.idPatient) ?? [],
  }));
  const noms = new Map(patients.map(p => [p.idPatient, `${p.prenom} ${p.nom}`.trim()]));
  return { dossiers, noms };
}

/**
 * Ce qui retient le T0 ([[D-440]] §7) : les libellés des conditions dures non
 * satisfaites, par le chemin unique des trois routes
 * (`preconditionsT0PourPatient`, jalon T0). Une évaluation par dossier
 * DEMANDÉ — l'appelant ne passe que les cartes affichées.
 *
 * `null` = l'évaluation a échoué pour ce dossier : le repli se décide dans le
 * module pur (`ligneCeQuiRetientT0`), jamais un silence.
 */
export async function ceQuiRetientT0(idsPatients: string[]): Promise<Map<string, string[] | null>> {
  const resultats = await Promise.all(
    idsPatients.map(async (idPatient): Promise<[string, string[] | null]> => {
      try {
        const preconditions = await preconditionsT0PourPatient(idPatient, 'T0');
        return [idPatient, preconditions.dures.filter(c => !c.satisfaite).map(c => c.libelle)];
      } catch (err) {
        console.error('[fil GET] préconditions T0 :', err instanceof Error ? err.message : String(err));
        return [idPatient, null];
      }
    }),
  );
  return new Map(resultats);
}
