// « Mes échanges » côté serveur ([[D-293]]) : le drapeau, et la lecture des
// sources, espèce par espèce, sous LEURS règles de visibilité.
//
// LA RÈGLE DE VISIBILITÉ EST EMPRUNTÉE, JAMAIS RECOPIÉE — même principe que
// `api/portail/lectures` : `whereEnvoiVisible` pour le bilan, `fichesALire` et
// `lettreALire` pour les remises, `resolveProtocoleDiffuse` pour le protocole,
// `listerTransmissions` pour les comptes rendus, `listerDepotsPatient` pour les
// documents déposés. Une surface fermée par son propre drapeau ne produit AUCUNE
// ligne.
//
// Sélections minimales : des identifiants, des dates, des titres de
// questionnaire, des catégories et des statuts. Jamais une réponse, une valeur,
// un texte de fiche ou de bilan, ni la réponse du praticien à une demande de
// droit (`TrustRightsRequest.reponse`, [[D-293]] §2).

import { prisma } from '@/lib/prisma';
import { whereEnvoiVisible } from '@/lib/documents/bilanPatient';
import { lectureFichesOuverte } from '@/lib/fiches-assiette/drapeau';
import { fichesALire } from '@/lib/fiches-assiette/servicePatient';
import { lettreAdressagePatientOuverte } from '@/lib/correspondance/lettreAdressageRemise';
import { lettreALire } from '@/lib/correspondance/lettreServicePatient';
import { resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
// La biologie se lit par son entrée publiée ([[D-306]] §2).
import { isBioPortailEnabled, listerTransmissions } from '@/lib/biology-library/publie';
import { depotDocumentsOuvert } from '@/lib/collecte/drapeau';
import { listerDepotsPatient } from '@/lib/collecte/documentsDeposesServeur';
import { IDS_SUSPENDUS } from '@/lib/questionnaires-catalog';
import type { SourcesMesEchanges } from '@/lib/portail/mesEchanges';

// « Transmis » = `verrouille`, le groupe « Transmis au praticien » du hub. Un
// questionnaire rouvert (correction demandée, déverrouillé) quitte le journal le
// temps de sa reprise : le hub le montre alors ailleurs, sous son état.
async function questionnairesTransmis(idPatient: string): Promise<SourcesMesEchanges['questionnaires']> {
  const assignations = await prisma.assignation.findMany({
    where: { idPatient, statutReponses: 'verrouille' },
    select: { idAssignation: true, idQuestionnaire: true, titre: true, statut: true },
  });
  // Même filtre que la liste du portail (`api/portail/assignations`) : un
  // instrument suspendu ne s'affiche plus, sauf s'il a été complété.
  const servies = assignations.filter(a => !IDS_SUSPENDUS.has(a.idQuestionnaire) || a.statut === 'Complété');
  if (servies.length === 0) return [];
  // La date de transmission est celle de la dernière réponse rattachée — la
  // même horloge que la reprise du portail et le Fil praticien.
  const dates = await prisma.questionnaireReponse.groupBy({
    by: ['idAssignation'],
    where: { idPatient, idAssignation: { in: servies.map(a => a.idAssignation) } },
    _max: { dateReponse: true },
  });
  const parAssignation = new Map(dates.map(d => [d.idAssignation, d._max.dateReponse]));
  return servies.flatMap(a => {
    const transmisLe = parAssignation.get(a.idAssignation);
    // Sans réponse rattachée, aucune date sûre : la ligne ne s'invente pas.
    return transmisLe ? [{ idAssignation: a.idAssignation, titre: a.titre || a.idQuestionnaire, transmisLe }] : [];
  });
}

async function signalements(idPatient: string): Promise<SourcesMesEchanges['signalements']> {
  const [effets, incidents, droits] = await Promise.all([
    prisma.trustAdverseEffectReport.findMany({ where: { idPatient }, select: { statutTraitement: true, soumisLe: true } }),
    prisma.trustPrivacyIncident.findMany({ where: { idPatient }, select: { statutTraitement: true, soumisLe: true } }),
    prisma.trustRightsRequest.findMany({ where: { idPatient }, select: { statutTraitement: true, soumisLe: true } }),
  ]);
  return [
    ...effets.map(e => ({ categorie: 'effet_indesirable', ...e })),
    ...incidents.map(i => ({ categorie: 'incident_confidentialite', ...i })),
    ...droits.map(d => ({ categorie: 'demande_droit', ...d })),
  ];
}

export async function sourcesMesEchanges(idPatient: string): Promise<SourcesMesEchanges> {
  const [bilan, fiches, lettres, protocole, questionnaires, comptesRendus, depots, signales] = await Promise.all([
    prisma.bookletEnvoi.findFirst({
      where: whereEnvoiVisible(idPatient),
      orderBy: [{ dateEnvoi: 'desc' }, { id: 'desc' }],
      select: { id: true, dateEnvoi: true },
    }),
    lectureFichesOuverte() ? fichesALire(idPatient) : Promise.resolve([]),
    lettreAdressagePatientOuverte() ? lettreALire(idPatient) : Promise.resolve([]),
    // LIMITE CONNUE, ACCEPTÉE par le responsable le 2026-10-18 (relecture
    // préalable à ACT-3) : la règle « servi » de l'accueil (rejeu de la carte,
    // contrat) n'est pas rejouée ici — même limite que `api/portail/lectures`
    // assume ([[D-315]]). Un protocole diffusé que l'accueil dit
    // « indisponible » paraît au journal, comme remis, et mène à l'accueil,
    // qui explique l'indisponibilité.
    resolveProtocoleDiffuse(idPatient),
    questionnairesTransmis(idPatient),
    isBioPortailEnabled() ? listerTransmissions(idPatient) : Promise.resolve([]),
    depotDocumentsOuvert() ? listerDepotsPatient(idPatient) : Promise.resolve([]),
    signalements(idPatient),
  ]);
  return {
    bilan: bilan ? { id: bilan.id, envoyeLe: bilan.dateEnvoi } : null,
    fiches: fiches.map(f => ({ idRemise: f.idRemise, libelle: f.libelle, remiseLe: new Date(f.remiseLe) })),
    lettre: lettres[0] ?? null,
    protocole: protocole ? { approbationId: protocole.approbationId, approuveLe: protocole.approvedAt } : null,
    questionnaires,
    comptesRendus: comptesRendus.map(c => ({ deposeLe: new Date(c.deposeLe) })),
    documentsDeposes: depots.map(d => ({ deposeLe: new Date(d.deposeLe) })),
    signalements: signales,
  };
}
