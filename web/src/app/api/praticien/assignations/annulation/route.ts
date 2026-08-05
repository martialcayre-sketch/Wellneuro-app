import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { estAnnulable } from '@/lib/praticien/annulabilite';

// Annulation d'une assignation (Fil A). Petite route dédiée, patron de
// `rendez-vous/annulation` : l'annulation est un STATUT ('Annulée') idempotent,
// jamais une suppression — l'assignation reste une trace. Un `delete` serait de
// toute façon exclu : `ProtocolCheckin` et `AgendaSommeilNuit` référencent
// `Assignation` en FK RESTRICT (il échouerait), et les `QuestionnaireReponse`
// resteraient orphelines (lien souple `String`, sans FK).
//
// Portée : sont annulables les assignations dont le CONTENU n'atteste aucune
// passation (`estAnnulable`, `lib/praticien/annulabilite.ts`) — pas seulement
// celles au statut `non_rempli`. `non_rempli` ne revient JAMAIS une fois
// quitté et `deverrouille` (réouverture praticien) n'atteste rien non plus ;
// seule l'existence d'une `QuestionnaireReponse` (comptée ci-dessous) est une
// preuve fiable de soumission. Le refus vit dans la ROUTE, jamais seulement
// dans l'écran : c'est la leçon des trois chemins d'assignation (cf.
// `patient/submit/route.ts`).

export type AnnulationAssignationResponse =
  | { ok: true }
  | {
      ok: false;
      reason: 'unauthenticated' | 'invalid' | 'not_found' | 'already_filled' | 'exception';
      error: string;
    };

function echec(
  reason: 'unauthenticated' | 'invalid' | 'not_found' | 'already_filled' | 'exception',
  error: string,
  status: number,
): NextResponse<AnnulationAssignationResponse> {
  return NextResponse.json<AnnulationAssignationResponse>({ ok: false, reason, error }, { status });
}

export async function POST(req: Request): Promise<NextResponse<AnnulationAssignationResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

  try {
    const corps = (await req.json().catch(() => null)) as { idAssignation?: unknown } | null;
    const idAssignation =
      corps && typeof corps.idAssignation === 'string' ? corps.idAssignation.trim() : '';
    if (!idAssignation || idAssignation.length > 64) {
      return echec('invalid', 'Assignation invalide.', 400);
    }

    const emailSession = emailPraticien(session);
    if (!emailSession) return echec('unauthenticated', 'Authentification requise.', 401);

    // Garde d'appartenance : l'assignation d'un autre praticien est introuvable.
    const ass = await prisma.assignation.findFirst({
      where: { idAssignation, patient: filtrePatientsDuPraticien(emailSession) },
      select: { statut: true, statutReponses: true },
    });
    if (!ass) return echec('not_found', 'Assignation introuvable.', 404);

    // Court-circuit AVANT tout comptage : la clause d'état seule suffit à
    // refuser le cas courant (verrouille, modification_demandee, ou
    // l'incohérence défensive statut=Complété avec statutReponses=non_rempli
    // que personne n'écrit). Gardée DÉLIBÉRÉMENT malgré sa redondance logique
    // avec `estAnnulable` plus bas (un comptage à 0 la retrouverait) : elle
    // évite une requête pour le refus le plus fréquent, et elle survit à un
    // futur écrivain qui poserait `verrouille` sans jamais créer de
    // `QuestionnaireReponse` — un lecteur pressé qui la lirait comme un
    // doublon et la supprimerait rouvrirait ce trou-là. Le message
    // `already_filled` redevient vrai ici sauf dans cette branche défensive.
    const statutReponsesOuverte = ass.statutReponses === 'non_rempli' || ass.statutReponses === 'deverrouille';
    if (ass.statut === 'Complété' || !statutReponsesOuverte) {
      return echec(
        'already_filled',
        'Ce questionnaire a déjà été rempli — il ne peut pas être annulé.',
        409,
      );
    }

    // Idempotent : une assignation déjà annulée n'est pas ré-écrite — inutile
    // d'aller lire les réponses pour ce cas.
    if (ass.statut === 'Annulée') {
      return NextResponse.json<AnnulationAssignationResponse>({ ok: true });
    }

    // Seule attestation fiable d'une passation : au moins une
    // `QuestionnaireReponse` liée à cette assignation (lien souple `String`,
    // sans FK — cf. commentaire d'en-tête). C'est le cas qui motive ce lot :
    // `submit` crée la réponse (`patient/submit/route.ts:301`) puis marque
    // l'assignation (`:317`) HORS TRANSACTION. Une annulation qui tombe entre
    // les deux verrait encore `statutReponses = 'non_rempli'` et accepterait
    // à tort sans ce comptage.
    const nbReponses = await prisma.questionnaireReponse.count({ where: { idAssignation } });
    if (!estAnnulable({ statut: ass.statut, statutReponses: ass.statutReponses, aPassation: nbReponses > 0 })) {
      return echec(
        'already_filled',
        'Ce questionnaire a déjà été rempli — il ne peut pas être annulé.',
        409,
      );
    }

    // `updateMany` plutôt que `update` : répéter la garde d'état dans le
    // `where` rend cette écriture atomique sur sa partie état. Sans cette
    // répétition, une assignation redevenue `verrouille` entre le `findFirst`
    // et cet appel serait quand même réécrite en `Annulée`.
    //
    // Le `where` ne répète PAS la garde d'appartenance, et c'est sans risque
    // ici : `idAssignation` est `@unique`, donc au plus une ligne est touchée,
    // et `findFirst` plus haut a déjà validé qu'elle appartient au praticien.
    // Élargir un jour ce `where` (par `idPatient`, par exemple) sans y ajouter
    // l'appartenance en ferait une écriture de masse non scopée.
    //
    // La course avec `submit` est RÉTRÉCIE, pas fermée. Ce qui est fermé : une
    // soumission arrivée après le comptage ne peut plus être écrasée par une
    // annulation, l'écriture ne matchant plus rien. Ce qui ne l'est pas : une
    // annulation entrée AVANT que `submit` ne crée la réponse reste écrasée
    // par `submit:317`, exactement comme avant ce lot. La fermer vraiment
    // exigerait de transactionner `submit` — hors périmètre.
    const { count: lignesAnnulees } = await prisma.assignation.updateMany({
      where: { idAssignation, statut: { not: 'Complété' }, statutReponses: { in: ['non_rempli', 'deverrouille'] } },
      data: { statut: 'Annulée' },
    });

    // Zéro ligne touchée n'est PAS un succès : l'état a bougé entre le
    // comptage et l'écriture, donc l'annulation n'a pas eu lieu. Rendre
    // `ok: true` ici referait, sous un autre nom, le défaut que ce lot
    // supprime — une annulation que le praticien croit acquise et qui n'existe
    // nulle part. Le message reste vrai : ce qui a bougé, c'est une soumission.
    if (lignesAnnulees === 0) {
      return echec(
        'already_filled',
        'Ce questionnaire a déjà été rempli — il ne peut pas être annulé.',
        409,
      );
    }

    return NextResponse.json<AnnulationAssignationResponse>({ ok: true });
  } catch (err) {
    console.error('[assignations annulation POST]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
