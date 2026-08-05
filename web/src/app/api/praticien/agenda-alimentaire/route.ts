import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { listJours, type LectureJours } from '@/lib/agenda-alimentaire/persistence';
import { resolveJoursActifs } from '@/lib/agenda-alimentaire/jour';
import { calculerFenetreAli, type FenetreAgendaAli } from '@/lib/agenda-alimentaire/fenetre';
import { calculerAgregatsAli, type AgregatsAgendaAli } from '@/lib/agenda-alimentaire/agregats';
import { AGENDA_ALI_ID, type JourRow } from '@/lib/agenda-alimentaire/types';
import { dateJourParis } from '@/lib/dateParis';

// Vue praticien de l'agenda alimentaire : dossier de contrôle jour par jour,
// agrégats (LOT-06 les convertira en axes/indice), et compte de lignes
// en quarantaine. Garde d'appartenance et journal d'accès (G-TRUST-04) sur le
// GET nommé — patron copié de `praticien/agenda-sommeil/route.ts`.
//
// ── AUCUNE GARDE DE DRAPEAU `WN_AGENDA_ALI` ICI, ET C'EST DÉLIBÉRÉ ──────────
// Ce n'est pas un oubli : le drapeau gouverne la bibliothèque praticien, le hub
// patient et l'écriture (`isAgendaAlimentaireEnabled`), jamais cette lecture.
// Le modèle de persistance est append-only (D-015) — les journées survivent à
// l'extinction du drapeau — et fermer ce lecteur avec lui rendrait illisible
// une donnée déjà recueillie, exactement le défaut que LOT-05 ferme. Arbitrage
// posé en session, amendant sur ce point `D-025` (« l'extinction referme
// toutes les surfaces ») ; voir `docs/DECISIONS.md` et
// `docs/claude/campagnes/2026-08-04-agenda-alimentaire/lots/LOT-05-dossier-de-controle-et-lecteur-praticien.md`.
// Si un relecteur futur est tenté d'ajouter `isAgendaAlimentaireEnabled(...)`
// ici : ne pas le faire sans repasser par une décision qui rouvre ce point.

const ROUTE_JOURNAL = '/api/praticien/agenda-alimentaire';

type ErrorResponse = { ok: false; reason: string; error: string };

export type EpisodeAgendaAli = {
  idAssignation: string;
  titre: string;
  /**
   * `'annulee'` PRIME sur les deux autres. `web/src/app/api/praticien/assignations/annulation/route.ts`
   * accepte l'annulation (`statut: 'Annulée'`) précisément quand
   * `statutReponses === 'non_rempli'` — c'est-à-dire tant qu'aucune écriture
   * n'a repositionné `statutReponses`. Pour `Q_ALI_09`, cela vaut tant
   * qu'aucun `PUT /api/praticien/assignations` n'a posé `deverrouille` : ce
   * chemin n'est pas atteignable par l'écran (le bouton « Débloquer » ne se
   * rend que sur `modification_demandee`, état inaccessible à cet
   * instrument), mais il l'est par appel direct, et il retire alors
   * silencieusement l'annulabilité d'un agenda encore vivant. Sans cette
   * priorité, une
   * assignation annulée après 12 journées notées se lirait « En cours »
   * alors que le portail patient répond déjà 410 « annulé par votre
   * praticien » : le praticien et le patient verraient deux histoires
   * différentes. L'assignation reste LISTÉE malgré l'annulation — le modèle
   * est append-only (D-015), les journées existent et servent la
   * calibration.
   *
   * `'cloture'` reste dans le type pour mémoire de forme, mais est
   * AUJOURD'HUI INATTEIGNABLE pour Q_ALI_09 : ses deux seuls écrivains de
   * `statutReponses === 'verrouille'` sont `web/src/app/api/patient/submit/route.ts`
   * (qui refuse `Q_ALI_09` nommément) et la clôture de l'agenda du SOMMEIL.
   * Aucune route de clôture alimentaire n'existe. Ne pas lire cette branche
   * comme porteuse d'information tant qu'elle reste morte.
   */
  statut: 'en_cours' | 'cloture' | 'annulee';
  dateAssignation: string;
  fenetre: FenetreAgendaAli;
  jours: JourRow[];
  agregats: AgregatsAgendaAli | null;
  /**
   * Compte de LIGNES en quarantaine (`LectureJours.illisibles`) pour cette
   * assignation. Seul écart délibéré au patron du sommeil, qui n'a pas de
   * quarantaine : un dossier de contrôle qui tait ses lignes en quarantaine
   * ment par omission, le compte doit rester visible du praticien et pas
   * seulement du journal d'intégrité.
   */
  illisibles: number;
};

type GetResponse = { ok: true; episodes: EpisodeAgendaAli[] } | ErrorResponse;

function sanitizePatientId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(trimmed) ? trimmed : null;
}

/**
 * Filtre optionnel `idAssignation` : ABSENT (paramètre non fourni, ou fourni
 * vide) n'est PAS la même chose que PRÉSENT MAIS INVALIDE. Le patron du
 * sommeil (`web/src/app/api/praticien/agenda-sommeil/route.ts`) réutilise
 * `sanitizePatientId` pour ce filtre et confond les deux : une valeur hors
 * motif y retire silencieusement le filtre, et l'appelant reçoit tous les
 * épisodes du patient en 200 — repli assumé, pas modifié ici. Cette route
 * distingue les deux cas : absent → pas de filtre ; présent hors motif → 400
 * `invalid_payload`, au même titre qu'un `idPatient` malformé.
 */
function sanitizeIdAssignationFiltre(raw: string | null): { ok: true; value: string | null } | { ok: false } {
  if (raw === null) return { ok: true, value: null };
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: true, value: null };
  return /^[A-Za-z0-9_-]{1,64}$/.test(trimmed) ? { ok: true, value: trimmed } : { ok: false };
}

export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification praticien requise.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const idPatient = sanitizePatientId(searchParams.get('idPatient'));
    if (!idPatient) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }

    const idAssignationVerdict = sanitizeIdAssignationFiltre(searchParams.get('idAssignation'));
    if (!idAssignationVerdict.ok) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: "Identifiant d'assignation invalide." },
        { status: 400 },
      );
    }

    // Garde d'appartenance AVANT toute lecture Prisma — c'est elle qui écrit
    // le journal d'accès dossier (G-TRUST-04). Aucune lecture (assignations,
    // journées) ne doit précéder cet appel.
    const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (verdict !== 'accessible') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const idAssignationFiltre = idAssignationVerdict.value;
    const assignations = await prisma.assignation.findMany({
      where: {
        idPatient,
        idQuestionnaire: AGENDA_ALI_ID,
        ...(idAssignationFiltre ? { idAssignation: idAssignationFiltre } : {}),
      },
      orderBy: { dateAssignation: 'desc' },
    });

    const aujourdHui = dateJourParis();
    const episodes: EpisodeAgendaAli[] = [];
    for (const ass of assignations) {
      const lecture: LectureJours = await listJours(idPatient, ass.idAssignation);
      const joursActifs = resolveJoursActifs(lecture.jours);
      // 'annulee' prime : voir le commentaire du type EpisodeAgendaAli.
      const statut: EpisodeAgendaAli['statut'] =
        ass.statut === 'Annulée' ? 'annulee' : ass.statutReponses === 'verrouille' ? 'cloture' : 'en_cours';
      episodes.push({
        idAssignation: ass.idAssignation,
        titre: ass.titre,
        statut,
        dateAssignation: ass.dateAssignation.toISOString(),
        fenetre: calculerFenetreAli(joursActifs, aujourdHui, {
          datesIllisibles: lecture.datesIllisibles,
        }),
        jours: joursActifs,
        agregats: calculerAgregatsAli(joursActifs),
        illisibles: lecture.illisibles,
      });
    }

    return NextResponse.json({ ok: true, episodes });
  } catch (err) {
    console.error('[praticien/agenda-alimentaire GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
