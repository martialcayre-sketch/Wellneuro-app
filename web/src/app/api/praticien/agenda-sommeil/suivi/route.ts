import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { resumerAgendasEnCours, type LigneSuiviAgenda, type NuitsSuivi } from '@/lib/agenda-sommeil/suivi';
import { AGENDA_SOMMEIL_ID } from '@/lib/agenda-sommeil/types';
import { dateJourParis } from '@/lib/agenda-sommeil/portail';

export type SuiviAgendasApiResponse = {
  ok: boolean;
  lignes: LigneSuiviAgenda[];
  unavailable?: boolean;
  error?: string;
};

const INDISPONIBLE: Omit<SuiviAgendasApiResponse, 'error'> = {
  ok: false,
  lignes: [],
  unavailable: true,
};

// GET /api/praticien/agenda-sommeil/suivi — agendas du sommeil en cours du
// cabinet (aside du Fil). Lecture seule, faits datés calculés en mémoire,
// jamais persistés. Comme la Météo d'adhésion, cette liste ne journalise pas
// d'accès dossier : le journal G-TRUST-04 trace l'ouverture d'un dossier
// nommé, pas l'affichage d'une liste de cabinet (cf. lib/praticien/
// appartenance.ts — « jamais à l'insu d'une route qui n'a pas opté »).
export async function GET(): Promise<NextResponse<SuiviAgendasApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const patients = await prisma.patient.findMany({
      where: { actif: true, ...filtrePatientsDuPraticien(emailPraticien(session) ?? '') },
      select: { idPatient: true, prenom: true, nom: true },
      take: 200,
    });
    const ids = patients.map(p => p.idPatient);

    // Agendas encore OUVERTS. Aucun champ d'assignation ne dit « commencé » :
    // pendant tout le recueil, le statut reste « En attente » — on ne filtre
    // donc que sur ce qui FERME un agenda (annulation, clôture).
    const assignations = ids.length
      ? await prisma.assignation.findMany({
          where: {
            idPatient: { in: ids },
            idQuestionnaire: AGENDA_SOMMEIL_ID,
            statut: { not: 'Annulée' },
            statutReponses: { not: 'verrouille' },
          },
          select: {
            idAssignation: true,
            idPatient: true,
            titre: true,
            dateAssignation: true,
          },
        })
      : [];

    // Dates de nuits des seules assignations retenues — trois scalaires,
    // jamais le JSONB des réponses. PAS de groupBy : `_count` compte des
    // LIGNES, et une correction est une ligne (le domaine déduplique par
    // date, même règle que la fenêtre patient).
    const nuits = assignations.length
      ? await prisma.agendaSommeilNuit.findMany({
          where: { idAssignation: { in: assignations.map(a => a.idAssignation) } },
          select: { idAssignation: true, dateNuit: true, soumisLe: true },
        })
      : [];

    const nuitsParAssignation = new Map<string, NuitsSuivi>();
    for (const n of nuits) {
      const entree = nuitsParAssignation.get(n.idAssignation);
      const soumisLe = n.soumisLe.toISOString();
      if (entree) {
        entree.dates.push(n.dateNuit);
        if (entree.derniereSaisie === null || soumisLe > entree.derniereSaisie) {
          entree.derniereSaisie = soumisLe;
        }
      } else {
        nuitsParAssignation.set(n.idAssignation, { dates: [n.dateNuit], derniereSaisie: soumisLe });
      }
    }

    const lignes = resumerAgendasEnCours({
      assignations: assignations.map(a => ({
        idAssignation: a.idAssignation,
        idPatient: a.idPatient,
        titre: a.titre,
        dateAssignation: a.dateAssignation.toISOString(),
      })),
      nuitsParAssignation,
      noms: new Map(patients.map(p => [p.idPatient, `${p.prenom} ${p.nom}`.trim()])),
      // Jamais new Date() ni la date du client : serveur en UTC, métier en
      // Europe/Paris — même référence que la saisie patient.
      aujourdHui: dateJourParis(),
    });

    return NextResponse.json({ ok: true, lignes });
  } catch (err) {
    console.error('[agenda-sommeil suivi GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ...INDISPONIBLE, error: 'Erreur technique.' }, { status: 500 });
  }
}
