import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { construireFil, type CarteFil } from '@/lib/fil/cartes';
import { clesRefusees, filtrerCartesRefusees } from '@/lib/fil/refus';
import { jalonsSansDecision } from '@/lib/fil/jalonsJ21';
import { momentumJalonsParPatient } from '@/lib/fil/momentumJ21';
import { bornesJourParis } from '@/lib/fil/fuseau';

export type FilApiResponse = {
  cartes: CarteFil[];
  unavailable?: boolean;
  error?: string;
};

// GET /api/praticien/fil — cartes du Fil du jour (SP-FIL LOT-01).
// Lecture seule sur les données existantes ; la sélection et les libellés
// « pourquoi maintenant » sont dans lib/fil/cartes.ts (fonctions pures).
export async function GET(): Promise<NextResponse<FilApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { cartes: [], unavailable: true, error: 'Non authentifié.' },
      { status: 401 },
    );
  }

  try {
    const maintenant = new Date();
    const email = emailPraticien(session) ?? '';
    // Fenêtre du jour civil de PARIS (le cabinet) pour les consultations
    // prévues (LOT-04) — le serveur tourne en UTC sur Vercel.
    const { debut: debutJour, fin: finJour } = bornesJourParis(maintenant);

    const filtreNonTraite = { statutTraitement: { in: ['recu', 'en_cours'] } };
    // Les identifiants de ligne source sont sélectionnés pour que chaque carte
    // porte une identité stable (`cle`, cf. lib/fil/cartes.ts) : c'est ce qui
    // rendra un refus persistant désignable, sans quoi il porterait sur une
    // projection recalculée à chaque ouverture.
    const selectSignalement = { id: true, idPatient: true, soumisLe: true };
    // Les questionnaires reçus ne produisent plus de carte : ils vivent dans
    // l'inbox par patient (accueil-observatoire LOT-02) — seul le groupBy
    // d'activité reste, pour la carte `reprise`.
    const [effets, incidents, droits, syntheses, assignations, activites, checkinsJ21, episodesJ21, rdvs] =
      await Promise.all([
        prisma.trustAdverseEffectReport.findMany({ where: filtreNonTraite, select: selectSignalement, take: 10 }),
        prisma.trustPrivacyIncident.findMany({ where: filtreNonTraite, select: selectSignalement, take: 10 }),
        prisma.trustRightsRequest.findMany({ where: filtreNonTraite, select: selectSignalement, take: 10 }),
        prisma.syntheseIA.findMany({
          where: { statut: 'Brouillon_IA' },
          orderBy: { dateGeneration: 'desc' },
          take: 20,
          select: { idSynthese: true, idPatient: true, dateGeneration: true },
        }),
        prisma.assignation.findMany({
          where: { statut: { not: 'Complété' }, dateLimite: { not: null } },
          select: { idAssignation: true, idPatient: true, titre: true, dateLimite: true, statut: true },
        }),
        prisma.questionnaireReponse.groupBy({
          by: ['idPatient'],
          _max: { dateReponse: true },
        }),
        // Jalon J21 : check-ins J21 soumis, moins les épisodes J21 déjà
        // consignés (différence calculée après scoping — cf. jalonsJ21.ts).
        prisma.protocolCheckin.findMany({
          where: { pointEtape: 'J21' },
          select: { id: true, idPatient: true, reponses: true, soumisLe: true },
        }),
        prisma.assessmentEpisode.findMany({
          where: { milestone: 'J21' },
          select: { idPatient: true },
        }),
        // Consultations prévues aujourd'hui (LOT-04). Déjà bornées au praticien
        // (la table porte praticienEmail) et au jour civil.
        prisma.rendezVous.findMany({
          where: {
            praticienEmail: { equals: email, mode: 'insensitive' },
            statut: 'planifie',
            dateHeure: { gte: debutJour, lt: finJour },
          },
          select: { id: true, idPatient: true, dateHeure: true },
        }),
      ]);

    const signalements = [
      ...effets.map(e => ({ id: e.id, idPatient: e.idPatient, kind: 'effet_indesirable' as const, soumisLe: e.soumisLe })),
      ...incidents.map(i => ({ id: i.id, idPatient: i.idPatient, kind: 'incident_confidentialite' as const, soumisLe: i.soumisLe })),
      ...droits.map(d => ({ id: d.id, idPatient: d.idPatient, kind: 'demande_droit' as const, soumisLe: d.soumisLe })),
    ];

    const idsConcernes = [
      ...new Set([
        ...signalements.map(s => s.idPatient),
        ...syntheses.map(s => s.idPatient),
        ...assignations.map(a => a.idPatient),
        ...activites.map(a => a.idPatient),
        ...checkinsJ21.map(c => c.idPatient),
        ...rdvs.map(r => r.idPatient),
      ]),
    ];
    // Toute carte dont le patient n'est pas dans ce résultat est écartée
    // (filtre `actifs` plus bas) : scoper ici suffit à borner tout le Fil.
    const patients = await prisma.patient.findMany({
      where: {
        idPatient: { in: idsConcernes },
        actif: true,
        ...filtrePatientsDuPraticien(email),
      },
      select: { idPatient: true, prenom: true, nom: true },
    });
    const noms = new Map(patients.map(p => [p.idPatient, `${p.prenom} ${p.nom}`.trim()]));
    const actifs = new Set(patients.map(p => p.idPatient));

    // Jalon J21 = check-in J21 sans épisode J21 consigné (différence pure),
    // enrichi du momentum réel quand il existe (bornée aux patients-jalon).
    const jalonsBruts = jalonsSansDecision(
      checkinsJ21,
      new Set(episodesJ21.map(e => e.idPatient)),
      actifs,
    );
    const momentums = await momentumJalonsParPatient(jalonsBruts.map(j => j.idPatient));
    const jalons = jalonsBruts.map(j => ({ ...j, momentum: momentums.get(j.idPatient) ?? null }));

    const cartes = construireFil({
      consultations: rdvs.filter(r => actifs.has(r.idPatient)),
      signalements: signalements.filter(s => actifs.has(s.idPatient)),
      syntheses: syntheses.filter(s => actifs.has(s.idPatient)),
      jalons,
      assignations: assignations.filter(a => actifs.has(a.idPatient)),
      activites: activites
        .filter(a => actifs.has(a.idPatient) && a._max.dateReponse !== null)
        .map(a => ({ idPatient: a.idPatient, derniereReponse: a._max.dateReponse as Date })),
      noms,
      maintenant,
    });

    // Point de passage UNIQUE du refus (G1) : sur les cartes déjà construites,
    // jamais dans les 5 fonctions de production — ce serait 5 endroits à garder
    // cohérents. La lecture est bornée aux patients du praticien, comme le Fil.
    const refus = await prisma.filCardRejection.findMany({
      where: { idPatient: { in: [...actifs] } },
      select: { id: true, carteCle: true, refusee: true, supersedesRejectionId: true, refuseLe: true },
    });

    return NextResponse.json({ cartes: filtrerCartesRefusees(cartes, clesRefusees(refus)) });
  } catch (err) {
    console.error('[fil GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { cartes: [], unavailable: true, error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
