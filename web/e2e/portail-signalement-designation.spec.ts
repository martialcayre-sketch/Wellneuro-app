// Le signalement d'effet indésirable qui DÉSIGNE un élément du programme
// diffusé ([[D-281]] §2, fiche t20, reste 3) : la vraie route du portail
// contre le vrai trigger de PostgreSQL.
//
// ─────────────────────────────────────────────────────────────────────────────
// CE QUE LES BANCS UNITAIRES NE PEUVENT PAS DIRE
// ─────────────────────────────────────────────────────────────────────────────
// La route vérifie l'élément AVANT la base (`route.designation.test.ts`, base
// doublée), et le trigger `trust_aer_rattachement_garde` le vérifie dans la
// base (contrat SQL `trust_aer_rattachement_verdict_v1_negatif.sql`, lignes
// écrites à la main). Aucun des deux ne joue l'autre : rien ne disait que la
// ligne que la route ÉCRIT — l'identifiant d'action qu'elle a lu dans le
// programme reconstruit, le programme qu'elle a résolu — est celle que le
// trigger ACCEPTE, ni que le trigger refuse par lui-même ce que la route
// refuse avant lui. Deux gardes qui divergent laisseraient soit un patient
// refusé en erreur technique, soit une désignation hors programme figée.
//
// ─────────────────────────────────────────────────────────────────────────────
// LE PROGRAMME PASSE PAR LES VRAIES ROUTES PRATICIEN
// ─────────────────────────────────────────────────────────────────────────────
// Amorcée comme `biologie-arbitrage-revision.spec.ts` (dont l'en-tête dit
// pourquoi épisode et carte se LISENT au cockpit) : confirmation T0 à l'écran,
// sélection de priorité, version — ici relue. Puis, ce que ce spec est le seul
// E2E à faire, « Valider pour diffusion » par sa route. Une approbation posée en base ne vaudrait rien ici : la désignation
// n'existe que sur un programme SERVI au portail — rejeu de la carte, contrat
// patient —, et c'est la route de diffusion qui en oppose les bloqueurs.
//
// Drapeau de capture `WN_EI_INTERRUPTION=1` posé au serveur par
// `playwright.config.ts`, comme en production. La garde de diffusion reste
// inerte : aucune table n'est signée (M-1), rien ne s'interrompt.
//
// Patient fictif Jennifer Martin (PAT_SEED_02), majeure : la fixture biologie
// fournit les préconditions T0 dures. `workers: 1` garantit qu'aucun autre
// parcours ne tourne pendant celui-ci. Mode sériel : la diffusion est ce que
// le signalement vise.
import { test, expect, type APIRequestContext } from '@playwright/test';
import { patientPortailSessionCookie, praticienSessionCookie } from './helpers/auth';
import { confirmerEpisodeT0 } from './helpers/biologie';
import {
  PRODUIT_SIGNALEMENT_E2E,
  PURPOSE_SIGNALEMENT_E2E,
  insererSignalementHorsRoute,
  lireSignalementsDesignation,
  nettoyerDossierBiologie,
  nettoyerSignalementDesignation,
  provisionnerDossierBiologie,
} from './helpers/db';

const PATIENT_ID = 'PAT_SEED_02';
const PATIENT_EMAIL = 'jennifer.martin@fictif.wellneuro.fr';

const MOTIF_SELECTION =
  'Parcours E2E — priorité retenue pour éprouver la désignation, aucune portée clinique.';

/** Un identifiant qu'aucune action du programme ne porte. */
const ELEMENT_ABSENT = 'action-absente-du-programme-e2e';

/** Le message du trigger quand l'élément manque au `payload -> 'actions'`. */
const REFUS_TRIGGER = /l'élément désigné ne figure pas dans le programme visé/;

type CarteLue = {
  decisionCardId: string;
  priorityCandidates: { candidateId: string }[];
  selectedMainPriority: { candidateId: string } | null;
};

/** L'état `ready` du cockpit — même lecture que le parcours biologie. */
async function lireCockpitPret(
  request: APIRequestContext,
): Promise<{ episode: unknown; decisionCard: CarteLue }> {
  const reponse = await request.get(`/api/praticien/cockpit?idPatient=${PATIENT_ID}`);
  const corps = await reponse.text();
  expect(reponse.status(), `le cockpit n'a pas répondu 200 — corps : ${corps}`).toBe(200);
  const paye = JSON.parse(corps) as {
    status: string;
    snapshot?: { assessmentEpisode?: unknown };
    decisionCard?: CarteLue;
  };
  expect(paye.status, `le cockpit n'est pas « ready » : ${corps}`).toBe('ready');
  expect(paye.decisionCard, 'le cockpit n’a pas rendu de carte de décision').toBeTruthy();
  return { episode: paye.snapshot?.assessmentEpisode, decisionCard: paye.decisionCard as CarteLue };
}

/** Un signalement d'effet indésirable minimal, désignation comprise. */
function signalement(designation: { rattachement: string; elementActionId?: string; versionProgramme: string }) {
  return {
    categorie: 'effet_indesirable',
    produitLibelle: PRODUIT_SIGNALEMENT_E2E,
    symptomes: 'Signalement de banc, aucun symptôme réel.',
    severiteDeclaree: 'legere',
    actionPrise: 'ne_sait_pas',
    ...designation,
  };
}

/** Le programme diffusé, tel que la route de diffusion l'a approuvé. */
let protocolDraftId: string;
/** La liste et la version que le portail sert au formulaire. */
let elementsProgramme: { actionId: string; title: string }[];
let versionProgramme: string;

test.describe.configure({ mode: 'serial' });

test.describe('Signalement d’effet indésirable — la désignation, de la route au trigger', () => {
  test.beforeEach(({}, testInfo) => {
    // Un parcours d'API : rien n'y dépend de la fenêtre, et le rejouer sur un
    // second profil diffuserait deux fois le même programme.
    test.skip(testInfo.project.name !== 'Desktop Chromium', 'parcours d’API : un seul profil');
  });

  // `beforeAll` et `afterAll` tournent même quand `beforeEach` saute tous les
  // tests du profil : ils se gardent eux-mêmes (revue `wn-reviewer`).
  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== 'Desktop Chromium') return;
    // Le reste d'un run tué d'abord : une approbation laissée derrière
    // retiendrait sa version, et le ramassage du dossier biologie buterait.
    await nettoyerSignalementDesignation(PATIENT_ID);
    await provisionnerDossierBiologie(PATIENT_ID);
  });

  test.afterAll(async ({}, testInfo) => {
    if (testInfo.project.name !== 'Desktop Chromium') return;
    try {
      await nettoyerSignalementDesignation(PATIENT_ID);
    } finally {
      await nettoyerDossierBiologie(PATIENT_ID);
    }
  });

  test('le praticien diffuse un programme, et le portail en sert la liste à désigner', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);
    await confirmerEpisodeT0(page);

    const avant = await lireCockpitPret(page.request);
    const candidat = avant.decisionCard.priorityCandidates[0];
    expect(candidat, 'la carte ne classe aucune priorité').toBeTruthy();
    const selection = await page.request.post('/api/praticien/cockpit/priorite', {
      data: {
        episode: avant.episode,
        decisionCard: avant.decisionCard,
        candidateId: candidat.candidateId,
        rationale: MOTIF_SELECTION,
      },
    });
    expect(selection.status(), `sélection refusée — corps : ${await selection.text()}`).toBe(200);
    const { episode, decisionCard } = await lireCockpitPret(page.request);

    // UNE INTERVENTION FERME : la seule que la liste du patient retient (D-281
    // §2, arbitrage du 2026-10-16). Relue — sans la coche, la diffusion
    // refuserait (`not_reviewed`).
    const version = await page.request.post('/api/praticien/protocoles/versions', {
      data: {
        episode,
        decisionCard,
        baseVersionId: null,
        submission: {
          version: 'c1-protocol-draft-v4',
          purpose: PURPOSE_SIGNALEMENT_E2E,
          followUpCriterion: 'Aucun : version de banc.',
          actions: [
            {
              actionId: 'act-e2e-designation',
              type: 'hydration',
              title: 'Un verre d’eau au lever',
              idealPlan: 'Un grand verre d’eau chaque matin.',
              minimalPlan: 'Un demi-verre d’eau le matin.',
              rescuePlan: 'Quelques gorgées d’eau au lever.',
              limitations: [],
              interventionStatus: 'active',
            },
          ],
          therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
          limitations: [],
          reviewed: true,
        },
      },
    });
    const corpsVersion = await version.text();
    expect(version.status(), `version refusée — corps : ${corpsVersion}`).toBe(200);
    const { versionId } = JSON.parse(corpsVersion) as { versionId: string };

    // L'empreinte de la version LUE au fil, comme l'écran la lit avant de
    // diffuser — jamais découpée dans l'identifiant.
    const fil = await page.request.get(
      `/api/praticien/protocoles/versions?idPatient=${PATIENT_ID}&decisionCardId=${encodeURIComponent(decisionCard.decisionCardId)}`,
    );
    const corpsFil = await fil.text();
    expect(fil.status(), `fil des versions illisible — corps : ${corpsFil}`).toBe(200);
    const { history } = JSON.parse(corpsFil) as { history: { versionId: string; inputHash: string }[] };
    const relue = history.find(v => v.versionId === versionId);
    expect(relue, `la version posée manque au fil — corps : ${corpsFil}`).toBeDefined();

    const diffusion = await page.request.post('/api/praticien/protocoles/diffusion', {
      data: {
        idPatient: PATIENT_ID,
        decisionCardId: decisionCard.decisionCardId,
        protocolDraftInputHash: relue!.inputHash,
      },
    });
    const corpsDiffusion = await diffusion.text();
    expect(diffusion.status(), `diffusion refusée — corps : ${corpsDiffusion}`).toBe(200);
    protocolDraftId = versionId;

    // CÔTÉ PATIENT : la liste que le formulaire reçoit. Servie, elle porte
    // l'intervention ferme — la preuve que le programme est bien SERVI au
    // portail, sans quoi la désignation se ferait sans liste.
    await context.clearCookies();
    await context.addCookies([patientPortailSessionCookie(PATIENT_ID, PATIENT_EMAIL)]);
    const etat = await page.request.get('/api/portail/trust/etat?designation=1');
    const corpsEtat = await etat.text();
    expect(etat.status(), `état TRUST refusé — corps : ${corpsEtat}`).toBe(200);
    const lu = JSON.parse(corpsEtat) as {
      elementsProgramme: { actionId: string; title: string }[] | null;
      versionProgramme: string | null;
    };
    expect(lu.elementsProgramme, `désignation fermée — corps : ${corpsEtat}`).not.toBeNull();
    expect(lu.elementsProgramme).toEqual([expect.objectContaining({ title: 'Un verre d’eau au lever' })]);
    elementsProgramme = lu.elementsProgramme!;
    versionProgramme = lu.versionProgramme!;
  });

  test('un élément servi, déposé par la route, est accepté par le trigger et figé tel quel', async ({ page, context }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT_ID, PATIENT_EMAIL)]);
    const choisi = elementsProgramme[0].actionId;

    const depot = await page.request.post('/api/portail/trust/signalement', {
      data: signalement({ rattachement: 'element', elementActionId: choisi, versionProgramme }),
    });
    const corps = await depot.text();
    expect(depot.status(), `dépôt refusé — corps : ${corps}`).toBe(200);
    expect((JSON.parse(corps) as { ok: boolean }).ok).toBe(true);

    // CE QUE LA BASE A GARDÉ : la ligne a franchi le trigger, et elle vise le
    // programme diffusé et l'élément désigné — rien de recomposé en chemin.
    const lignes = await lireSignalementsDesignation(PATIENT_ID);
    expect(lignes).toEqual([
      expect.objectContaining({ rattachement: 'element', elementActionId: choisi, protocolDraftId }),
    ]);
  });

  test('un élément absent du programme est refusé par la route, puis par le trigger seul', async ({ page, context }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT_ID, PATIENT_EMAIL)]);

    // LA ROUTE D'ABORD : refus en 400, avec le message au patient — jamais
    // l'erreur technique que la base aurait rendue.
    const depot = await page.request.post('/api/portail/trust/signalement', {
      data: signalement({ rattachement: 'element', elementActionId: ELEMENT_ABSENT, versionProgramme }),
    });
    expect(depot.status()).toBe(400);
    // Le message, pas seulement le motif : `invalid_payload` sert aussi au
    // rattachement manquant.
    const refusRoute = (await depot.json()) as { reason: string; error: string };
    expect(refusRoute.reason).toBe('invalid_payload');
    expect(refusRoute.error).toMatch(/ne figure plus dans votre programme/);
    expect(await lireSignalementsDesignation(PATIENT_ID)).toHaveLength(1);

    // LE TRIGGER ENSUITE, route contournée, sur le MÊME programme diffusé.
    // Le témoin d'abord : l'élément servi passe — la ligne ne diffère du refus
    // qui suit que par l'identifiant, c'est donc lui que le trigger refuse.
    expect(await insererSignalementHorsRoute(PATIENT_ID, protocolDraftId, elementsProgramme[0].actionId)).toBeNull();
    const refus = await insererSignalementHorsRoute(PATIENT_ID, protocolDraftId, ELEMENT_ABSENT);
    expect(refus, 'le trigger a accepté un élément absent du programme').toMatch(REFUS_TRIGGER);
    expect(await lireSignalementsDesignation(PATIENT_ID)).toHaveLength(1);
  });
});
