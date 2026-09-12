import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { construireFil, type CarteFil } from '@/lib/fil/cartes';
import { clesRefusees, filtrerCartesRefusees } from '@/lib/fil/refus';
import { partagerParLecture } from '@/lib/fil/lectureCartes';
import { jalonsSansDecision } from '@/lib/fil/jalonsJ21';
import { RIDEAU_T0, STATUTS_SYNTHESE_VALIDEE } from '@/lib/clinical-engine/preconditionsT0';
import { arbitragesSansRevision } from '@/lib/fil/biologieArbitree';
import { isCbEnabled } from '@/lib/biology-library/featureFlag';
import { momentumJalonsParPatient } from '@/lib/fil/momentumJ21';
import { bornesJourParis } from '@/lib/fil/fuseau';

export type FilApiResponse = {
  cartes: CarteFil[];
  /**
   * Les cartes LUES dont la trace se montre encore — « Carte lue … / Remettre ».
   * Liste SÉPARÉE et jamais fondue dans `cartes` : l'écran ne doit pas avoir à
   * deviner laquelle des deux il rend, et un client qui ignore ce champ affiche
   * simplement le Fil sans traces, ce qui reste juste.
   */
  lues?: CarteFil[];
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
    // Les questionnaires reçus ne produisent plus de carte de réception : ils
    // vivent dans l'inbox par patient (accueil-observatoire LOT-02) — seul le
    // groupBy d'activité reste, pour la carte `reprise`. Mais l'inbox retire
    // une réponse dès sa lecture confirmée (questionnaireLecturePraticien) :
    // sans rien d'autre, un patient lu sans synthèse générée devient invisible
    // partout. Les deux groupBy suivants (lectures, dernière synthèse par
    // patient toutes causes confondues) alimentent `synthese_a_generer`.
    const [
      effets,
      incidents,
      droits,
      syntheses,
      assignations,
      activites,
      checkinsJ21,
      episodesJ21,
      rdvs,
      lecturesGroupBy,
      dernieresSynthesesGroupBy,
      passationsRideau,
      episodesT0,
      premieresPassationsGroupBy,
      premieresSynthesesGroupBy,
      assignationsToutes,
      ratifications,
      amendements,
      etapes,
      finsPatient,
    ] = await Promise.all([
      prisma.trustAdverseEffectReport.findMany({ where: filtreNonTraite, select: selectSignalement, take: 10 }),
      prisma.trustPrivacyIncident.findMany({ where: filtreNonTraite, select: selectSignalement, take: 10 }),
      prisma.trustRightsRequest.findMany({ where: filtreNonTraite, select: selectSignalement, take: 10 }),
      prisma.syntheseIA.findMany({
        where: { statut: { in: ['Brouillon_IA', 'Brouillon_Praticien'] } },
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
      // `confirmedAt` et pas seulement `idPatient` ([[D-151]]) : la décision
      // d'un point d'étape est celle qui lui est POSTÉRIEURE. Sans la date, un
      // épisode J21 ancien masquait l'attente — entre cycles, mais aussi DANS
      // un seul cycle, les deux « J21 » vivant sur deux calendriers.
      prisma.assessmentEpisode.findMany({
        where: { milestone: 'J21' },
        select: { idPatient: true, confirmedAt: true },
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
      prisma.questionnaireLecturePraticien.groupBy({
        by: ['idPatient'],
        _max: { luLe: true },
      }),
      // Toutes synthèses confondues (pas seulement les brouillons) : une
      // synthèse déjà validée compte pour « générée », seule une lecture plus
      // récente qu'elle doit faire revenir la carte.
      prisma.syntheseIA.groupBy({
        by: ['idPatient'],
        _max: { dateGeneration: true },
      }),
      // T0 à confirmer (`M08`, [[D-150]]) : trois lectures d'ENSEMBLE, jamais
      // une évaluation par patient. Les préconditions dures se calculent par
      // dossier et ont leur propre écran ; les appeler ici ferait un N+1 sur
      // l'écran d'accueil du praticien.
      //
      // `statutValidite` est SÉLECTIONNÉ, pas filtré en SQL : le filtre est
      // gaté par drapeau et vit dans `validite.ts` (cf. [[D-146]]).
      prisma.questionnaireReponse.findMany({
        where: { idQuestionnaire: { in: [...RIDEAU_T0] } },
        select: { idPatient: true, idQuestionnaire: true, dateReponse: true, statutValidite: true },
      }),
      prisma.assessmentEpisode.findMany({
        where: { milestone: 'T0' },
        select: { idPatient: true },
      }),
      // `targetAt` du T0 = PREMIÈRE réponse du dossier, toutes sources
      // confondues — c'est ce que pose `dateDeReference` dans
      // `runtimeFromPrisma`, et la carte doit dater la même chose que
      // l'épisode qu'elle appelle.
      prisma.questionnaireReponse.groupBy({
        by: ['idPatient'],
        _min: { dateReponse: true },
      }),
      // Second rideau ([[D-158]]) : deux lectures d'ENSEMBLE de plus, même
      // discipline que ci-dessus — la carte NE rejoue PAS les préconditions
      // dures par dossier, elle situe le geste attendu.
      //
      // La PREMIÈRE validation de synthèse, comme la précondition : c'est la
      // borne depuis laquelle le second rideau se compte, et elle ne se déplace
      // pas quand une seconde synthèse est validée.
      prisma.syntheseIA.groupBy({
        by: ['idPatient'],
        where: { statut: { in: [...STATUTS_SYNTHESE_VALIDEE] }, dateValidation: { not: null } },
        _min: { dateValidation: true },
      }),
      // TOUTES les assignations, sans filtre de statut ni de date limite —
      // celle du dessus (`assignations`) ne retient que les retards, et ne
      // dirait rien d'un second rideau rendu.
      prisma.assignation.findMany({
        select: { idPatient: true, idQuestionnaire: true, dateAssignation: true, statut: true },
      }),
      // ── LE RETOUR DU PATIENT SUR SON OBJECTIF (Alliance 6.0-A/B) ──────────
      // Quatre tables, quatre gestes, et AUCUN TEXTE n'est lu : le Fil dit
      // qu'une parole existe, il ne la rapporte pas. La lire ici mettrait la
      // parole d'un patient dans une liste de tâches — elle se lit dans sa
      // fiche, sous sa version, avec ce qui l'entoure.
      prisma.ratificationObjectif.findMany({
        select: { id: true, idPatient: true, sens: true, creeLe: true },
        orderBy: { creeLe: 'desc' },
        take: 20,
      }),
      prisma.amendementObjectif.findMany({
        select: { id: true, idPatient: true, creeLe: true },
        orderBy: { creeLe: 'desc' },
        take: 20,
      }),
      prisma.reponseJalonObjectif.findMany({
        select: { id: true, idPatient: true, creeLe: true },
        orderBy: { creeLe: 'desc' },
        take: 20,
      }),
      prisma.finObjectif.findMany({
        select: { id: true, idPatient: true, voix: true, consigneePar: true, creeLe: true },
        orderBy: { creeLe: 'desc' },
        take: 20,
      }),
    ]);

    const lectures = lecturesGroupBy
      .filter((l): l is typeof l & { _max: { luLe: Date } } => l._max.luLe !== null)
      .map(l => ({ idPatient: l.idPatient, derniereLecture: l._max.luLe }));
    const dernieresSyntheses = new Map(
      dernieresSynthesesGroupBy
        .filter((s): s is typeof s & { _max: { dateGeneration: Date } } => s._max.dateGeneration !== null)
        .map(s => [s.idPatient, s._max.dateGeneration]),
    );

    // Biologie arbitrée sans révision (LOT-06) : lecture gatée par le drapeau
    // CB — drapeau éteint, aucune requête, aucune carte (rien ne s'allume).
    let biologiesArbitreesBrutes: ReturnType<typeof arbitragesSansRevision> = [];
    if (isCbEnabled()) {
      const [arbitrages, versions] = await Promise.all([
        prisma.arbitrageBiologique.findMany({
          select: {
            idPatient: true,
            protocolDraftId: true,
            intentionId: true,
            verdict: true,
            arbitreLe: true,
          },
        }),
        prisma.protocolDraft.findMany({
          select: { id: true, supersedesDraftId: true },
        }),
      ]);
      biologiesArbitreesBrutes = arbitragesSansRevision(arbitrages, versions);
    }

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
        ...lectures.map(l => l.idPatient),
        ...biologiesArbitreesBrutes.map(b => b.idPatient),
        ...passationsRideau.map(p => p.idPatient),
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
    // Le PLUS RÉCENT épisode par patient : c'est lui qui peut avoir tranché le
    // point d'étape le plus récent. Un épisode plus ancien ne tranche rien.
    const dernierEpisodeJ21ParPatient = new Map<string, Date>();
    for (const e of episodesJ21) {
      const connu = dernierEpisodeJ21ParPatient.get(e.idPatient);
      if (!connu || e.confirmedAt > connu) dernierEpisodeJ21ParPatient.set(e.idPatient, e.confirmedAt);
    }
    const jalonsBruts = jalonsSansDecision(checkinsJ21, dernierEpisodeJ21ParPatient, actifs);
    const momentums = await momentumJalonsParPatient(jalonsBruts.map(j => j.idPatient));
    const jalons = jalonsBruts.map(j => ({ ...j, momentum: momentums.get(j.idPatient) ?? null }));

    // LE RETOUR DU PATIENT SUR SON OBJECTIF, quatre gestes confondus et
    // ordonnés par le producteur. AUCUN DÉCOMPTE : une carte par geste, ancrée
    // sur sa ligne source — c'est ce qui permet au refus persisté (`G1`) de
    // savoir quoi écarter, et à la carte de ne pas revenir.
    const gestesObjectif = [
      ...ratifications.map((l) => ({
        id: l.id,
        idPatient: l.idPatient,
        geste: (l.sens === 'ratifie' ? 'ratifie' : 'conteste') as 'ratifie' | 'conteste',
        creeLe: l.creeLe,
      })),
      ...amendements.map((l) => ({
        id: l.id, idPatient: l.idPatient, geste: 'dit_autrement' as const, creeLe: l.creeLe,
      })),
      ...etapes.map((l) => ({
        id: l.id, idPatient: l.idPatient, geste: 'etape' as const, creeLe: l.creeLe,
      })),
      // LA VOIX DU PATIENT SEULEMENT : une fin que le praticien a déclarée
      // lui-même n'est pas un retour, c'est son propre geste. Et une ligne
      // ATTESTÉE — consignée par le praticien pour le patient — n'en est pas un
      // non plus : il sait déjà ce qu'il a entendu.
      ...finsPatient
        .filter((l) => l.voix === 'patient' && l.consigneePar === 'patient')
        .map((l) => ({
          id: l.id, idPatient: l.idPatient, geste: 'fin' as const, creeLe: l.creeLe,
        })),
    ].filter((g) => actifs.has(g.idPatient));

    const cartes = construireFil({
      gestesObjectif,
      consultations: rdvs.filter(r => actifs.has(r.idPatient)),
      signalements: signalements.filter(s => actifs.has(s.idPatient)),
      syntheses: syntheses.filter(s => actifs.has(s.idPatient)),
      lectures: lectures.filter(l => actifs.has(l.idPatient)),
      dernieresSyntheses,
      jalons,
      passationsRideau: passationsRideau.filter(p => actifs.has(p.idPatient)),
      premieresPassations: new Map(
        premieresPassationsGroupBy
          .filter((r): r is typeof r & { _min: { dateReponse: Date } } => r._min.dateReponse !== null)
          .map(r => [r.idPatient, r._min.dateReponse]),
      ),
      patientsAvecEpisodeT0: new Set(episodesT0.map(e => e.idPatient)),
      tailleRideauT0: RIDEAU_T0.length,
      premieresSyntheses: new Map(
        premieresSynthesesGroupBy
          .filter((r): r is typeof r & { _min: { dateValidation: Date } } => r._min.dateValidation !== null)
          .map(r => [r.idPatient, r._min.dateValidation]),
      ),
      assignationsToutes: assignationsToutes.filter(a => actifs.has(a.idPatient)),
      biologiesArbitrees: biologiesArbitreesBrutes.filter(b => actifs.has(b.idPatient)),
      assignations: assignations.filter(a => actifs.has(a.idPatient)),
      activites: activites
        .filter(a => actifs.has(a.idPatient) && a._max.dateReponse !== null)
        .map(a => ({ idPatient: a.idPatient, derniereReponse: a._max.dateReponse as Date })),
      noms,
      maintenant,
    });

    // Point de passage UNIQUE du refus (G1) : sur les cartes déjà construites,
    // jamais dans les fonctions de production — ce serait autant d'endroits à
    // garder cohérents. La lecture est bornée aux patients du praticien, comme
    // le Fil.
    const refus = await prisma.filCardRejection.findMany({
      where: { idPatient: { in: [...actifs] } },
      select: { id: true, carteCle: true, refusee: true, supersedesRejectionId: true, refuseLe: true },
    });

    // LA LECTURE VIENT APRÈS LE REFUS, et l'ordre n'est pas indifférent. Le
    // refus est le geste EXPLICITE : une carte écartée reste écartée, même si
    // le dossier a été lu depuis. L'inverse ferait reparaître en « Carte lue »
    // ce qu'un praticien avait délibérément rangé.
    const retenues = filtrerCartesRefusees(cartes, clesRefusees(refus));

    // `lecturesCartesFil`, ET SURTOUT PAS `lectures` : ce fichier porte déjà un
    // `lectures` à vingt lignes d'ici — la lecture d'une RÉPONSE DE
    // QUESTIONNAIRE, qui nourrit « synthèse à générer ». Le compilateur l'a
    // refusé ; sans lui, deux « lectures » auraient cohabité dans la même
    // fonction, et la prochaine lecture du fichier aurait été un piège.
    const lecturesCartesFil = await prisma.filCardLecture.findMany({
      where: { idPatient: { in: [...actifs] } },
      select: { idPatient: true, typeCarte: true, lue: true, lueLe: true },
    });
    const partage = partagerParLecture(retenues, lecturesCartesFil, maintenant);

    return NextResponse.json({ cartes: partage.visibles, lues: partage.lues });
  } catch (err) {
    console.error('[fil GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { cartes: [], unavailable: true, error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
