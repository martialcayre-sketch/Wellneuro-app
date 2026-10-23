import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RAISON_DIVERGENCE, refusChaineC1 } from '@/lib/clinical-engine/verifierChaineC1';
import { teteDuFil } from '@/lib/clinical-engine/selectionPrioritePrisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import {
  LIBELLE_PRIORITE_LIBRE_MAX,
  canoniserBesoinsVises,
  estDomainePrioriteLibre,
  normaliserLibellePrioriteLibre,
  type PrioriteLibre,
} from '@/lib/clinical-engine/prioriteLibre';
import { identifiantPrioriteLibre } from '@/lib/clinical-engine/prioriteLibreServeur';
import type { ConfirmedAssessmentEpisode, DecisionCard } from '@/lib/clinical-engine/types';
import { termeAnxiogene } from '@/lib/documents/vocabulaire';

// SÉLECTION PRATICIEN D'UNE PRIORITÉ — [[D-127]].
//
// LE GESTE QUI MANQUAIT. `buildProtocolDraft` exige depuis toujours une priorité
// choisie par le praticien ; aucun module de `src/` n'en produisait, et les deux
// sites de construction de carte du cockpit passaient `selectionPraticien: null`.
// Enregistrer une version de protocole était donc IMPOSSIBLE depuis
// l'application — constat OBSERVÉ en production le 2026-09-06 ([[D-125]]).
//
// POURQUOI CETTE ROUTE EXISTE, PLUTÔT QU'UN CHAMP DE PLUS DANS LE CORPS DU POST
// DE VERSION. La sélection entre dans l'empreinte de la carte, et
// `canonical.ts` importe `node:crypto` : le navigateur NE PEUT PAS calculer
// cette empreinte. Un écran qui poserait la sélection dans la carte qu'il
// détient produirait une carte que `refusChaineC1` rejetterait en 409. Le geste
// s'écrit donc au serveur, qui reconstruit ensuite la carte ; l'écran transmet
// un choix, il ne signe rien.
//
// AUTEUR ET HORODATAGE POSÉS CÔTÉ SERVEUR (patron `arbitrages_biologiques`) :
// le client ne fournit ni l'un ni l'autre. Une sélection est structurellement
// inantidatable et inattribuable à autrui.
//
// APPEND-ONLY : changer d'avis crée une LIGNE qui référence la précédente,
// jamais un `update`. Motif complet à [[D-127]] §3 — `selectedAt` entre dans
// l'empreinte de la carte, et chaque version de protocole ancre sa provenance
// sur cette empreinte ; réécrire en place ferait pointer l'ancre d'une version
// DÉJÀ ENREGISTRÉE vers une carte que la base ne saurait plus reconstruire.
//
// CE POST ÉCRIT et ne journalise pas : dispense GD-1, la même que les deux
// points de persistance du protocole — une écriture laisse déjà sa propre trace
// datée et attribuée.

const RATIONALE_MAX = 2000;

type PostBody = {
  episode?: ConfirmedAssessmentEpisode;
  decisionCard?: DecisionCard;
  candidateId?: string;
  /** La priorité POSÉE PAR LE PRATICIEN ([[D-279]]) — exclusive de `candidateId`. */
  prioriteLibre?: { domaine?: unknown; libelle?: unknown; besoinsVises?: unknown };
  rationale?: string;
};

type PostResponse =
  | { ok: true; selectionId: string; supersedesSelectionId: string | null }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PostResponse>({ ok: false, reason, error }, { status });
}

function estChaineNonVide(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && valeur.length > 0;
}

export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return echec('unauthenticated', 'Authentification requise.', 401);
    }

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const { episode, decisionCard } = body;
    if (!episode || !decisionCard) {
      return echec('invalid', 'episode et decisionCard sont requis.', 400);
    }
    if (episode.status !== 'confirmed' || !estChaineNonVide(episode.confirmedAt)) {
      return echec(
        'not_confirmed',
        'Seul un épisode confirmé porte une carte de décision.',
        400,
      );
    }
    if (!estChaineNonVide(episode.patientId) || !estChaineNonVide(decisionCard.decisionCardId)) {
      return echec('invalid', 'Identifiants de contrat manquants.', 400);
    }
    // DEUX FORMES, EXCLUSIVES ([[D-279]]) : un candidat du moteur, ou une
    // priorité posée par le praticien. Les deux à la fois, c'est ne pas savoir
    // ce que le praticien a choisi ; ni l'une ni l'autre, rien à écrire.
    const formeLibre = body.prioriteLibre !== undefined && body.prioriteLibre !== null;
    if (formeLibre === estChaineNonVide(body.candidateId)) {
      return echec('invalid', 'Une priorité est requise : un candidat ou une priorité posée, pas les deux.', 400);
    }

    // LE MOTIF EST LA DÉCISION, pas une note facultative : c'est ce que la
    // version de protocole citera, et ce qui se relit six semaines plus tard.
    // `trim` avant mesure — un motif fait d'espaces n'est pas un motif.
    const rationale = (body.rationale ?? '').trim();
    if (rationale === '') {
      return echec(
        'motif_requis',
        'Une priorité retenue s’accompagne du motif qui l’a fait retenir : sans lui, la version de protocole citera un choix que personne ne peut relire.',
        422,
      );
    }
    if (rationale.length > RATIONALE_MAX) {
      return echec('motif_trop_long', 'Le motif est trop long (2 000 caractères maximum).', 422);
    }

    const idPatient = episode.patientId;
    const decisionCardId = decisionCard.decisionCardId;

    const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session));
    if (verdict !== 'accessible') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    // INTÉGRITÉ DE LA CHAÎNE C1 ([[D-054]] arbitrage 5), APRÈS la garde
    // d'appartenance. Ce contrôle fait ici DEUX choses, et la seconde n'est pas
    // un effet de bord : il prouve que la carte soumise correspond au dossier,
    // ET — depuis [[D-127]] §1bis — que l'écran travaillait sur l'ÉTAT DE
    // SÉLECTION COURANT, puisque le recalcul relit la sélection en base. Un
    // praticien dont l'onglet est resté ouvert pendant qu'un autre choisissait
    // reçoit donc 409 plutôt que d'écraser silencieusement.
    const refusChaine = await refusChaineC1(episode, decisionCard);
    if (refusChaine) {
      return echec(RAISON_DIVERGENCE, refusChaine, 409);
    }

    // UN CONSTAT DE SÉCURITÉ BLOQUE TOUT, priorité posée comprise ([[D-279]]
    // §2). `buildDecisionCard` écarterait de toute façon la sélection — écrire
    // une ligne que le moteur ignorerait ferait croire au praticien qu'il a
    // décidé.
    if (decisionCard.safetyFindingIds.length > 0) {
      return echec(
        'decision_bloquee',
        'Des constats de sécurité sont ouverts : ils se revoient avant de retenir une priorité.',
        422,
      );
    }

    let candidateId: string;
    let libre: PrioriteLibre | null = null;
    if (formeLibre) {
      // LA PRIORITÉ POSÉE : domaine de la liste fermée, libellé normalisé —
      // tout blanc Unicode replié, largeur nulle retirée (revue #1402, P2-4) —
      // non vide, borné, et sans registre anxiogène : c'est l'intitulé que le
      // patient lira seul en tête de son protocole. L'identifiant se dérive
      // ICI, jamais à l'écran.
      const { domaine, libelle, besoinsVises } = body.prioriteLibre ?? {};
      if (!estDomainePrioriteLibre(domaine)) {
        return echec('domaine_inconnu', 'Choisissez un domaine dans la liste.', 422);
      }
      const libelleNormalise = typeof libelle === 'string' ? normaliserLibellePrioriteLibre(libelle) : '';
      if (libelleNormalise === '') {
        return echec('libelle_requis', 'Écrivez la priorité telle que le patient la lira.', 422);
      }
      if (libelleNormalise.length > LIBELLE_PRIORITE_LIBRE_MAX) {
        return echec('libelle_trop_long', 'La priorité est trop longue (200 caractères maximum).', 422);
      }
      const terme = termeAnxiogene(libelleNormalise);
      if (terme !== null) {
        return echec(
          'libelle_anxiogene',
          `La priorité emploie « ${terme} ». Ce texte est lu seul par votre patient : reformulez-le.`,
          422,
        );
      }
      // LES BESOINS VISÉS ([[D-338]] §3) : facultatifs, pris parmi les douze,
      // chacun une fois — rangés ici, refusés s'ils ne se lisent pas. Ils
      // n'entrent pas dans l'identifiant : seul le libellé le fait.
      const besoins = canoniserBesoinsVises(besoinsVises);
      if (besoins === null) {
        return echec('besoins_invalides', 'Les besoins visés se choisissent parmi les douze besoins, chacun une fois.', 422);
      }
      libre = { domaine, libelle: libelleNormalise, ...(besoins.length > 0 ? { besoinsVises: besoins } : {}) };
      candidateId = identifiantPrioriteLibre(libre);
    } else {
      candidateId = body.candidateId as string;
      // Le candidat doit être RÉELLEMENT classé par la carte que le serveur
      // vient de recalculer. `buildDecisionCard` le re-vérifiera au prochain
      // rendu de carte et jetterait sinon ; le dire ici rend le refus lisible
      // plutôt que de laisser le cockpit tomber en « proposition servie » au
      // tour suivant.
      const candidatConnu = decisionCard.priorityCandidates.some(
        candidat => candidat.candidateId === candidateId,
      );
      if (!candidatConnu) {
        return echec(
          'candidat_inconnu',
          'Cette priorité ne figure pas parmi les candidates de la décision. Rechargez le cockpit.',
          422,
        );
      }
      // Une abstention requise ne se tranche pas par un candidat : `DC-12`
      // retire les candidats, la règle de [[D-127]] est inchangée.
      if (decisionCard.abstention.status !== 'not_required') {
        return echec(
          'decision_bloquee',
          'La revue demande une abstention : il n’y a pas de candidat à retenir tant qu’elle n’est pas levée.',
          422,
        );
      }
    }

    // Le fil de cette carte, borné au patient. La tête est la ligne que rien ne
    // supplante — le fil est strictement linéaire par construction ([[D-127]]
    // §3bis), aucune règle de départage n'est appliquée ici.
    const fil = await prisma.decisionPrioritySelection.findMany({
      where: { idPatient, decisionCardId },
      select: {
        id: true,
        candidateId: true,
        rationale: true,
        selectedAt: true,
        supersedesSelectionId: true,
      },
    });
    const tete = teteDuFil(fil);
    if (fil.length > 0 && tete === null) {
      // Aucune tête sur un fil non vide : état qu'aucune route ne produit. On
      // refuse plutôt que d'en élire une — écrire à la suite d'un fil qu'on ne
      // sait pas lire produirait une seconde branche.
      return echec(
        'fil_illisible',
        'La suite des sélections de cette décision n’est pas lisible. Rechargez le cockpit.',
        409,
      );
    }

    try {
      const ligne = await prisma.decisionPrioritySelection.create({
        data: {
          idPatient,
          decisionCardId,
          // L'empreinte de la carte AU MOMENT DU CHOIX ([[D-127]] §2). Elle ne
          // barre rien — `refusChaineC1` vient de prouver que cette carte est
          // celle du dossier — mais elle rend le désaccord DISABLE le jour où
          // le dossier aura bougé.
          decisionCardInputHash: decisionCard.inputHash,
          candidateId,
          rationale,
          ...(libre
            ? { domaineLibre: libre.domaine, libelleLibre: libre.libelle, besoinsVises: libre.besoinsVises ?? [] }
            : {}),
          // `selectedAt` reste le défaut de la base : le client ne date pas son
          // propre acte.
          selectedByEmail: emailPraticien(session) ?? '',
          supersedesSelectionId: tete?.id ?? null,
        },
        select: { id: true, supersedesSelectionId: true },
      });
      return NextResponse.json<PostResponse>({
        ok: true,
        selectionId: ligne.id,
        supersedesSelectionId: ligne.supersedesSelectionId,
      });
    } catch (err) {
      // P2002 — DEUX courses possibles, une seule réponse. Soit deux premières
      // sélections concurrentes (garde de racine, unique partielle), soit deux
      // corrections de la même tête (garde de successeur). Dans les deux cas la
      // base vient de refuser une FOURCHE, et la réponse est la même : l'état a
      // changé sous l'écran, il faut relire. C'est exactement le rôle que
      // [[D-127]] §3bis donne à ces index — refuser plutôt qu'élire.
      const code = (err as { code?: unknown } | null | undefined)?.code;
      if (code === 'P2002') {
        return echec(
          'selection_stale',
          'Une autre sélection vient d’être posée sur cette décision. Rechargez le cockpit et relisez-la avant de choisir.',
          409,
        );
      }
      throw err;
    }
  } catch (err) {
    console.error(
      '[cockpit/priorite POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('server_error', 'Erreur serveur.', 500);
  }
}
