import { beforeEach, describe, expect, it, vi } from 'vitest';

// Bancs en style « SIGNATURE RÉELLE » : on ne mocke QUE Prisma, et on forge un
// vrai cookie avec `signPatientSession` (patron `comprehension/route.test.ts`).
// Mocker `@/lib/patient-session` neutraliserait l'authentification, or c'est
// justement l'authentification que cette surface doit prouver.

const { prisma, logger } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    objectifNegocie: { findMany: vi.fn() },
    entreeCeQuiCompte: { findMany: vi.fn() },
    syntheseComprehension: { findMany: vi.fn() },
    desaccordComprehension: { findMany: vi.fn() },
    ratificationObjectif: {
      findMany: vi.fn(),
      create: vi.fn(),
      // Moqués EXPRÈS bien que jamais appelés : sans eux, l'assertion
      // « append-only » lèverait au lieu de compter zéro.
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    amendementObjectif: {
      findMany: vi.fn(),
      create: vi.fn(),
      // Mêmes moqueries expresses, même motif (6.0-B, LOT-04).
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    assessmentEpisode: { findFirst: vi.fn() },
    reponseJalonObjectif: {
      findMany: vi.fn(),
      create: vi.fn(),
      // Mêmes moqueries expresses, même motif (6.0-B, LOT-05).
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({ logger }));

import { signPatientSession } from '@/lib/patient-session';
import { LONGUEUR_MAX_AMENDEMENT } from '@/lib/praticien/objectifNegocie';
import { JOURS_JALON, TOLERANCE_JOURS_JALON } from '@/lib/equilibre/constants';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { GET, POST } from './route';

const PATIENT = { idPatient: 'PAT_TEST', email: 'sophie.nicola@example.test' };
const URL_BASE = 'http://localhost/api/portail/dossier';

function cookieProprio(): string {
  return signPatientSession({ idPatient: PATIENT.idPatient, email: PATIENT.email });
}

function mockCompteActif(surcharges: Record<string, unknown> = {}): void {
  prisma.patient.findUnique.mockResolvedValue({
    idPatient: PATIENT.idPatient,
    actif: true,
    accessTokenRevoked: false,
    email: PATIENT.email,
    sessionsInvalidesAvant: null,
    ...surcharges,
  });
}

function getRequest(cookie?: string, query = ''): Request {
  return new Request(`${URL_BASE}${query}`, {
    headers: cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

function postRequest(
  cookie: string | undefined,
  corps: unknown,
  brut?: string,
  entetes: Record<string, string> = {},
): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
      ...entetes,
    },
    body: brut ?? JSON.stringify(corps),
  });
}

const objectif = (partiel: Record<string, unknown> = {}) => ({
  id: 'OBJ_1',
  enoncePatient: 'Je voudrais me réveiller sans avoir l’impression de n’avoir pas dormi.',
  reformulationPraticien: 'Un sommeil qui ne restaure pas, plutôt qu’une difficulté à s’endormir.',
  priorite: 'Le sommeil d’abord',
  negocieLe: new Date('2026-08-20T09:00:00.000Z'),
  supersedesObjectifId: null,
  creeLe: new Date('2026-08-20T09:00:00.000Z'),
  ...partiel,
});

const synthese = (partiel: Record<string, unknown> = {}) => ({
  id: 'SYN_1',
  texte: 'Vous venez pour un sommeil qui se casse au milieu de la nuit.',
  redigeeLe: null,
  publieeLe: new Date('2026-08-20T10:00:00.000Z'),
  creeLe: new Date('2026-08-20T10:00:00.000Z'),
  supersedesSyntheseId: null,
  ...partiel,
});

/** Le dossier nominal : un objectif, une entrée, une synthèse publiée. */
function mockDossierComplet(surcharges: Record<string, unknown[]> = {}): void {
  prisma.objectifNegocie.findMany.mockResolvedValue(surcharges.objectifs ?? [objectif()]);
  prisma.ratificationObjectif.findMany.mockResolvedValue(surcharges.ratifications ?? []);
  prisma.amendementObjectif.findMany.mockResolvedValue(surcharges.amendements ?? []);
  prisma.reponseJalonObjectif.findMany.mockResolvedValue(surcharges.reponsesJalon ?? []);
  // Par défaut : AUCUN cycle confirmé. C'est l'état le plus courant en
  // production aujourd'hui, et celui où `resoudreJalonDu` rendrait `T0`.
  prisma.assessmentEpisode.findFirst.mockResolvedValue(surcharges.ancreT0?.[0] ?? null);
  prisma.entreeCeQuiCompte.findMany.mockResolvedValue(
    surcharges.entrees ?? [
      {
        id: 'ENT_1',
        texte: 'Pouvoir reprendre la marche du dimanche avec ma fille.',
        saisiLe: null,
        creeLe: new Date('2026-08-21T08:00:00.000Z'),
      },
    ],
  );
  prisma.syntheseComprehension.findMany.mockResolvedValue(surcharges.syntheses ?? [synthese()]);
  prisma.desaccordComprehension.findMany.mockResolvedValue(surcharges.desaccords ?? []);
}

describe('/api/portail/dossier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.WN_DOSSIER_DEUX_VOIX = 'true';
    process.env.WN_CE_QUI_COMPTE = 'true';
    process.env.WN_COMPREHENSION = 'true';
  });

  // ── DRAPEAU ───────────────────────────────────────────────────────────────

  describe('le drapeau garde les deux verbes, fail-closed', () => {
    it.each([
      ['absent', undefined],
      ['vide', ''],
      ['1', '1'],
      ['TRUE', 'TRUE'],
      ['oui', 'oui'],
    ])('drapeau %s ⇒ 503 au GET, et la base n’est pas touchée', async (_nom, valeur) => {
      if (valeur === undefined) delete process.env.WN_DOSSIER_DEUX_VOIX;
      else process.env.WN_DOSSIER_DEUX_VOIX = valeur;

      const res = await GET(getRequest(cookieProprio()));
      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({ ok: false, reason: 'feature_disabled' });
      expect(prisma.objectifNegocie.findMany).not.toHaveBeenCalled();
      expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    });

    it('drapeau éteint ⇒ 503 au POST, et RIEN n’est écrit', async () => {
      delete process.env.WN_DOSSIER_DEUX_VOIX;
      const res = await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens: 'ratifie' }));
      expect(res.status).toBe(503);
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
    });

    it('503 et non 404 : le chemin existe, il n’est pas ouvert', async () => {
      delete process.env.WN_DOSSIER_DEUX_VOIX;
      const res = await GET(getRequest(cookieProprio()));
      expect(res.status).not.toBe(404);
      expect(res.status).toBe(503);
    });
  });

  // ── AUTHENTIFICATION ──────────────────────────────────────────────────────

  describe('authentification', () => {
    it('sans session ⇒ 401, aucune lecture', async () => {
      const res = await GET(getRequest());
      expect(res.status).toBe(401);
      expect(prisma.objectifNegocie.findMany).not.toHaveBeenCalled();
    });

    it('cookie illisible ⇒ 401', async () => {
      const res = await GET(getRequest('miettes-de-cookie'));
      expect(res.status).toBe(401);
    });

    it('compte désactivé ⇒ 403, aucune lecture du dossier', async () => {
      mockCompteActif({ actif: false });
      const res = await GET(getRequest(cookieProprio()));
      expect(res.status).toBe(403);
      expect(prisma.objectifNegocie.findMany).not.toHaveBeenCalled();
    });

    it('jeton révoqué ⇒ 403 au POST, rien n’est écrit', async () => {
      mockCompteActif({ accessTokenRevoked: true });
      const res = await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens: 'ratifie' }));
      expect(res.status).toBe(403);
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
    });

    it('lit TOUJOURS le dossier de la session, jamais un identifiant du corps', async () => {
      mockCompteActif();
      mockDossierComplet();
      await GET(getRequest(cookieProprio()));

      for (const appel of [
        prisma.objectifNegocie.findMany,
        prisma.entreeCeQuiCompte.findMany,
        prisma.syntheseComprehension.findMany,
        prisma.desaccordComprehension.findMany,
        prisma.ratificationObjectif.findMany,
      ]) {
        expect(appel).toHaveBeenCalledWith(
          expect.objectContaining({ where: expect.objectContaining({ idPatient: 'PAT_TEST' }) }),
        );
      }
    });
  });

  // ── L'ASSEMBLAGE ──────────────────────────────────────────────────────────

  describe('GET — l’assemblage des trois objets', () => {
    it('sert l’objectif courant, ce qui compte, et la synthèse publiée', async () => {
      mockCompteActif();
      mockDossierComplet();

      const res = await GET(getRequest(cookieProprio()));
      expect(res.status).toBe(200);
      const corps = await res.json();

      expect(corps.objectifs).toHaveLength(1);
      expect(corps.objectifs[0]).toMatchObject({ id: 'OBJ_1', etat: 'en_attente' });
      expect(corps.ratifiable).toBe(true);
      expect(corps.ceQuiCompte).toHaveLength(1);
      expect(corps.comprehension.synthese).toMatchObject({ id: 'SYN_1' });
    });

    it('`?interrupteur=1` ne lit RIEN et n’émet aucun événement de service', async () => {
      mockCompteActif();
      const res = await GET(getRequest(cookieProprio(), '?interrupteur=1'));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, ouvert: true });
      expect(prisma.objectifNegocie.findMany).not.toHaveBeenCalled();
      expect(prisma.syntheseComprehension.findMany).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('un dossier vide rend des LISTES VIDES, jamais un « rien à signaler »', async () => {
      mockCompteActif();
      mockDossierComplet({ objectifs: [], entrees: [], syntheses: [], desaccords: [] });

      const corps = await (await GET(getRequest(cookieProprio()))).json();
      expect(corps.objectifs).toEqual([]);
      expect(corps.ceQuiCompte).toEqual([]);
      expect(corps.comprehension.synthese).toBeNull();
      // Rien à ratifier : il n'y a aucun objectif.
      expect(corps.ratifiable).toBe(false);
    });

    it('`en_attente` sort tel quel — l’absence de geste n’est pas un refus (DC-24)', async () => {
      mockCompteActif();
      mockDossierComplet({ ratifications: [] });
      const corps = await (await GET(getRequest(cookieProprio()))).json();
      expect(corps.objectifs[0].etat).toBe('en_attente');
    });

    it('rend le DERNIER geste, jamais une majorité (DC-30)', async () => {
      mockCompteActif();
      mockDossierComplet({
        ratifications: [
          { id: 'R3', idObjectif: 'OBJ_1', sens: 'conteste', creeLe: new Date('2026-08-22T10:00:00.000Z') },
          { id: 'R2', idObjectif: 'OBJ_1', sens: 'ratifie', creeLe: new Date('2026-08-21T10:00:00.000Z') },
          { id: 'R1', idObjectif: 'OBJ_1', sens: 'ratifie', creeLe: new Date('2026-08-20T10:00:00.000Z') },
        ],
      });
      const corps = await (await GET(getRequest(cookieProprio()))).json();
      expect(corps.objectifs[0].etat).toBe('conteste');
    });

    it('sert la synthèse publiée LA PLUS RÉCENTE — un brouillon de révision ne retire rien', async () => {
      mockCompteActif();
      mockDossierComplet({
        syntheses: [
          synthese({
            id: 'SYN_2',
            publieeLe: null,
            supersedesSyntheseId: 'SYN_1',
            creeLe: new Date('2026-08-21T10:00:00.000Z'),
          }),
          synthese(),
        ],
      });
      const corps = await (await GET(getRequest(cookieProprio()))).json();
      expect(corps.comprehension.synthese).toMatchObject({ id: 'SYN_1' });
    });

    it('DEUX TÊTES : les deux sont servies, et rien n’est ratifiable (DC-30)', async () => {
      mockCompteActif();
      mockDossierComplet({
        objectifs: [
          objectif({ id: 'OBJ_A', creeLe: new Date('2026-08-21T09:00:00.000Z') }),
          objectif({ id: 'OBJ_B', creeLe: new Date('2026-08-21T10:00:00.000Z') }),
        ],
      });
      const corps = await (await GET(getRequest(cookieProprio()))).json();
      expect(corps.objectifs.map((o: { id: string }) => o.id).sort()).toEqual(['OBJ_A', 'OBJ_B']);
      expect(corps.ratifiable).toBe(false);
    });

    it('sert les amendements du patient — il doit pouvoir relire ce qu’il a écrit', async () => {
      mockCompteActif();
      mockDossierComplet({
        amendements: [
          {
            id: 'AME_1',
            idObjectif: 'OBJ_1',
            texte: 'Tenir debout jusqu’au dîner.',
            creeLe: new Date('2026-08-25T12:00:00.000Z'),
          },
        ],
      });
      const charge = await (await GET(getRequest(cookieProprio()))).json();
      expect(charge.amendements).toEqual([
        {
          id: 'AME_1',
          idObjectif: 'OBJ_1',
          texte: 'Tenir debout jusqu’au dîner.',
          creeLe: '2026-08-25T12:00:00.000Z',
        },
      ]);
      // `exprimeLe` n'est PAS servie : la colonne reste nulle par construction,
      // et l'exposer inviterait l'écran à la combler par `creeLe`.
      expect(charge.amendements[0]).not.toHaveProperty('exprimeLe');
    });

    it('« dit autrement » sort tel quel — ce n’est NI un accord NI un refus', async () => {
      mockCompteActif();
      mockDossierComplet({
        amendements: [
          {
            id: 'AME_1',
            idObjectif: 'OBJ_1',
            texte: 'Tenir debout jusqu’au dîner.',
            creeLe: new Date('2026-08-25T12:00:00.000Z'),
          },
        ],
      });
      const charge = await (await GET(getRequest(cookieProprio()))).json();
      expect(charge.objectifs[0].etat).toBe('dit_autrement');
    });

    it('LES DEUX TABLES : ratifier puis dire autrement rend « dit autrement »', async () => {
      mockCompteActif();
      mockDossierComplet({
        ratifications: [
          {
            id: 'RAT_1',
            idObjectif: 'OBJ_1',
            sens: 'ratifie',
            creeLe: new Date('2026-08-24T12:00:00.000Z'),
          },
        ],
        amendements: [
          {
            id: 'AME_1',
            idObjectif: 'OBJ_1',
            texte: 'Tenir debout jusqu’au dîner.',
            creeLe: new Date('2026-08-25T12:00:00.000Z'),
          },
        ],
      });
      // Lire la seule table des ratifications rendrait « ratifie » : c'est la
      // mutation que ce cas tue.
      const charge = await (await GET(getRequest(cookieProprio()))).json();
      expect(charge.objectifs[0].etat).toBe('dit_autrement');
    });

    it('un amendement du patient N’EST PAS soumis à la garde de registre praticien', async () => {
      // La garde vise un texte que le PRATICIEN écrit et que le patient subit.
      // Signaler le registre des mots que le patient a écrits sur lui-même
      // ferait dire au journal que sa façon de parler de lui pose problème.
      mockCompteActif();
      mockDossierComplet({
        objectifs: [objectif({ reformulationPraticien: null, priorite: null })],
        syntheses: [],
        amendements: [
          {
            id: 'AME_1',
            idObjectif: 'OBJ_1',
            texte: 'J’ai peur que ce soit grave et que rien ne s’arrange.',
            creeLe: new Date('2026-08-25T12:00:00.000Z'),
          },
        ],
      });
      await GET(getRequest(cookieProprio()));
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('ne rend aucun décompte ni aucune mesure', async () => {
      mockCompteActif();
      mockDossierComplet();
      const brut = await (await GET(getRequest(cookieProprio()))).text();
      for (const interdit of ['nombre', 'moyenne', 'taux', 'pourcentage']) {
        expect(brut.toLowerCase()).not.toContain(interdit);
      }
    });
  });

  // ── CHAQUE BLOC GARDE SON PROPRE DRAPEAU ──────────────────────────────────

  describe('un bloc dont le drapeau est éteint est ABSENT, pas vide', () => {
    it('`WN_CE_QUI_COMPTE` éteint ⇒ `ceQuiCompte: null`, et la table n’est pas lue', async () => {
      delete process.env.WN_CE_QUI_COMPTE;
      mockCompteActif();
      mockDossierComplet();

      const corps = await (await GET(getRequest(cookieProprio()))).json();
      expect(corps.ceQuiCompte).toBeNull();
      expect(prisma.entreeCeQuiCompte.findMany).not.toHaveBeenCalled();
      // Le reste du dossier, lui, reste servi.
      expect(corps.objectifs).toHaveLength(1);
    });

    it('`WN_COMPREHENSION` éteint ⇒ `comprehension: null`, et les deux tables sont muettes', async () => {
      delete process.env.WN_COMPREHENSION;
      mockCompteActif();
      mockDossierComplet();

      const corps = await (await GET(getRequest(cookieProprio()))).json();
      expect(corps.comprehension).toBeNull();
      expect(prisma.syntheseComprehension.findMany).not.toHaveBeenCalled();
      expect(prisma.desaccordComprehension.findMany).not.toHaveBeenCalled();
    });

    it('l’objectif n’a AUCUN drapeau propre : cette route seule l’ouvre au patient', async () => {
      delete process.env.WN_CE_QUI_COMPTE;
      delete process.env.WN_COMPREHENSION;
      mockCompteActif();
      mockDossierComplet();

      const corps = await (await GET(getRequest(cookieProprio()))).json();
      expect(corps.objectifs).toHaveLength(1);
      expect(corps.ceQuiCompte).toBeNull();
      expect(corps.comprehension).toBeNull();
    });
  });

  // ── CHEMIN SORTANT GARDÉ ──────────────────────────────────────────────────

  describe('DÉBRANCHEMENT — la garde de registre au service (D-090, journalisant)', () => {
    it('journalise un registre anxiogène servi dans la SYNTHÈSE, sans bloquer', async () => {
      mockCompteActif();
      mockDossierComplet({
        syntheses: [synthese({ texte: 'Une situation alarmante, à traiter sans délai.' })],
      });

      const res = await GET(getRequest(cookieProprio()));
      expect(res.status).toBe(200);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: EVENT_CODES.PORTAIL_DOSSIER_REGISTRE_ANXIOGENE }),
      );
      // Le texte est SERVI quand même : bloquer montrerait une page d'erreur au
      // patient pour un texte qu'il n'a pas écrit.
      const corps = await res.json();
      expect(corps.comprehension.synthese.texte).toContain('alarmante');
    });

    it('journalise aussi un registre anxiogène dans la REFORMULATION de l’objectif', async () => {
      mockCompteActif();
      mockDossierComplet({
        objectifs: [objectif({ reformulationPraticien: 'Une évolution alarmante à surveiller.' })],
        syntheses: [],
      });

      const res = await GET(getRequest(cookieProprio()));
      expect(res.status).toBe(200);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: EVENT_CODES.PORTAIL_DOSSIER_REGISTRE_ANXIOGENE }),
      );
    });

    it('journalise un registre anxiogène dans la PRIORITÉ — libellé libre du praticien', async () => {
      mockCompteActif();
      mockDossierComplet({
        objectifs: [objectif({ priorite: 'Urgent' })],
        syntheses: [],
      });

      const res = await GET(getRequest(cookieProprio()));
      expect(res.status).toBe(200);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: EVENT_CODES.PORTAIL_DOSSIER_REGISTRE_ANXIOGENE }),
      );
    });

    it('ne journalise RIEN sur un dossier au registre neutre', async () => {
      mockCompteActif();
      mockDossierComplet();
      await GET(getRequest(cookieProprio()));
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('ne met au journal ni le texte, ni le terme, ni l’identifiant du patient', async () => {
      mockCompteActif();
      mockDossierComplet({
        syntheses: [synthese({ texte: 'Une situation alarmante, à traiter sans délai.' })],
      });
      await GET(getRequest(cookieProprio()));

      const trace = JSON.stringify(logger.warn.mock.calls[0][0]);
      expect(trace).not.toContain('alarmante');
      expect(trace).not.toContain('PAT_TEST');
      expect(trace).not.toContain(PATIENT.email);
    });
  });

  // ── LE GESTE ──────────────────────────────────────────────────────────────

  describe('POST — la ratification', () => {
    beforeEach(() => {
      mockCompteActif();
      prisma.objectifNegocie.findMany.mockResolvedValue([
        { id: 'OBJ_1', supersedesObjectifId: null, creeLe: new Date('2026-08-20T09:00:00.000Z') },
      ]);
      prisma.ratificationObjectif.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'RAT_1',
            idObjectif: data.idObjectif,
            sens: data.sens,
            creeLe: new Date('2026-08-22T12:00:00.000Z'),
          }),
      );
    });

    it.each(['ratifie', 'conteste'])('accepte le sens « %s » et rend 201', async (sens) => {
      const res = await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens }));
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({ ok: true, ratification: { sens } });
    });

    it('écrit `idPatient` DE LA SESSION, jamais celui du corps', async () => {
      await POST(
        postRequest(cookieProprio(), {
          idObjectif: 'OBJ_1',
          sens: 'ratifie',
          idPatient: 'PAT_AUTRE',
        }),
      );
      expect(prisma.ratificationObjectif.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ idPatient: 'PAT_TEST' }) }),
      );
    });

    it('n’écrit AUCUNE date — ni celle du geste, ni celle de l’écriture', async () => {
      await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens: 'ratifie' }));
      const { data } = prisma.ratificationObjectif.create.mock.calls[0][0];
      // `creeLe` vient de la base ; `gesteLe` reste nulle — c'est une colonne
      // de DÉCLARATION, et le patient ne déclare pas de date, il clique.
      expect(Object.keys(data).sort()).toEqual(['idObjectif', 'idPatient', 'sens']);
    });

    it('IGNORE toute date du corps — antidater son propre geste est impossible', async () => {
      await POST(
        postRequest(cookieProprio(), {
          idObjectif: 'OBJ_1',
          sens: 'ratifie',
          gesteLe: '2020-01-01T00:00:00.000Z',
          creeLe: '2020-01-01T00:00:00.000Z',
        }),
      );
      const { data } = prisma.ratificationObjectif.create.mock.calls[0][0];
      expect(data).not.toHaveProperty('gesteLe');
      expect(data).not.toHaveProperty('creeLe');
    });

    it('APPEND-ONLY : deux réponses successives font DEUX lignes, rien n’est corrigé', async () => {
      await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens: 'ratifie' }));
      await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens: 'conteste' }));

      expect(prisma.ratificationObjectif.create).toHaveBeenCalledTimes(2);
      expect(prisma.ratificationObjectif.update).not.toHaveBeenCalled();
      expect(prisma.ratificationObjectif.updateMany).not.toHaveBeenCalled();
      expect(prisma.ratificationObjectif.upsert).not.toHaveBeenCalled();
      expect(prisma.ratificationObjectif.delete).not.toHaveBeenCalled();
      expect(prisma.ratificationObjectif.deleteMany).not.toHaveBeenCalled();
    });

    it('refuse un sens hors taxonomie en 400 — le CHECK n’est jamais atteint', async () => {
      for (const sens of ['peut_etre', 'RATIFIE', 42, null]) {
        const res = await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens }));
        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({ reason: 'sens_invalide' });
      }
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
    });

    it('refuse une référence d’objectif absente en 400', async () => {
      const res = await POST(postRequest(cookieProprio(), { sens: 'ratifie' }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ reason: 'objectif_absent' });
    });

    it('objectif d’un AUTRE dossier ou inexistant : MÊME 404, MÊME message', async () => {
      const inexistant = await POST(
        postRequest(cookieProprio(), { idObjectif: 'OBJ_FANTOME', sens: 'ratifie' }),
      );
      // Un objectif d'un autre dossier ne remonte pas de la lecture scopée : le
      // cas est INDISTINCT du précédent, et c'est le point.
      const autreDossier = await POST(
        postRequest(cookieProprio(), { idObjectif: 'OBJ_DUN_AUTRE', sens: 'ratifie' }),
      );

      expect(inexistant.status).toBe(404);
      expect(autreDossier.status).toBe(404);
      expect(await inexistant.json()).toEqual(await autreDossier.json());
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
    });

    it('une référence hors bornes rend le MÊME 404, sans toucher la base', async () => {
      const res = await POST(
        postRequest(cookieProprio(), { idObjectif: 'x'.repeat(65), sens: 'ratifie' }),
      );
      expect(res.status).toBe(404);
      expect(prisma.objectifNegocie.findMany).not.toHaveBeenCalled();
    });

    it('une version SUPPLANTÉE rend 409 — l’accord porterait sur un texte qui n’engage plus', async () => {
      prisma.objectifNegocie.findMany.mockResolvedValue([
        { id: 'OBJ_1', supersedesObjectifId: null, creeLe: new Date('2026-08-20T09:00:00.000Z') },
        { id: 'OBJ_2', supersedesObjectifId: 'OBJ_1', creeLe: new Date('2026-08-21T09:00:00.000Z') },
      ]);

      const res = await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens: 'ratifie' }));
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ reason: 'objectif_supplante' });
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
    });

    it('DEUX TÊTES : 409, et rien n’est ratifié — la discordance ne se départage pas', async () => {
      prisma.objectifNegocie.findMany.mockResolvedValue([
        { id: 'OBJ_A', supersedesObjectifId: null, creeLe: new Date('2026-08-21T09:00:00.000Z') },
        { id: 'OBJ_B', supersedesObjectifId: null, creeLe: new Date('2026-08-21T10:00:00.000Z') },
      ]);

      // Même en visant la PLUS RÉCENTE, le geste est refusé : ratifier « la plus
      // récente » trancherait en silence ce que `DC-30` demande de signaler.
      const res = await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_B', sens: 'ratifie' }));
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ reason: 'objectif_discordant' });
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
    });

    it('refuse un corps trop gros sur l’annonce seule, sans le lire', async () => {
      const res = await POST(
        postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens: 'ratifie' }, undefined, {
          'content-length': String(64 * 1024 + 1),
        }),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ reason: 'corps_trop_gros' });
    });

    it('un dossier SANS objectif rend le même 404 — rien à ratifier n’est pas une erreur à part', async () => {
      prisma.objectifNegocie.findMany.mockResolvedValue([]);
      const res = await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens: 'ratifie' }));
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ reason: 'objectif_introuvable' });
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
    });

    it('refuse un corps trop gros SANS annonce — le second étage existe pour ça', async () => {
      // Un client peut imposer un transfert `chunked` sans `content-length`, ou
      // mentir : sans cette borne sur le texte LU, le premier étage seul se
      // contournerait par une simple omission d’en-tête.
      const enorme = JSON.stringify({ idObjectif: 'OBJ_1', sens: 'x'.repeat(64 * 1024 + 10) });
      const res = await POST(postRequest(cookieProprio(), undefined, enorme));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ reason: 'corps_trop_gros' });
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
    });

    it('refuse un corps illisible ou non-objet en 400', async () => {
      for (const brut of ['{', '"une chaine"', '[]', 'null']) {
        const res = await POST(postRequest(cookieProprio(), undefined, brut));
        expect(res.status).toBe(400);
      }
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
    });

    it('un geste inconnu est REFUSÉ, jamais replié sur la ratification', async () => {
      // Deviner l'intention d'un patient à partir d'un mot qu'on ne comprend
      // pas écrirait un geste qu'il n'a pas posé.
      for (const geste of ['amendment', 'RATIFICATION', 'autre', '', 42, [], {}]) {
        const res = await POST(postRequest(cookieProprio(), { geste, idObjectif: 'OBJ_1', sens: 'ratifie' }));
        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({ ok: false, reason: 'geste_invalide' });
      }
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
      expect(prisma.amendementObjectif.create).not.toHaveBeenCalled();
    });

    it('un corps SANS `geste` reste une ratification — l’onglet resté ouvert continue de marcher', async () => {
      const res = await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens: 'ratifie' }));
      expect(res.status).toBe(201);
      expect(prisma.ratificationObjectif.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── POST — « LE DIRE AUTREMENT » (6.0-B, LOT-04) ──────────────────────────

  describe('POST — l’amendement du patient', () => {
    const TEXTE = 'Ce que je veux, c’est tenir debout jusqu’au dîner sans m’allonger.';

    beforeEach(() => {
      mockCompteActif();
      prisma.objectifNegocie.findMany.mockResolvedValue([
        { id: 'OBJ_1', supersedesObjectifId: null, creeLe: new Date('2026-08-20T09:00:00.000Z') },
      ]);
      prisma.amendementObjectif.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'AME_1',
            idObjectif: data.idObjectif,
            texte: data.texte,
            creeLe: new Date('2026-08-25T12:00:00.000Z'),
          }),
      );
    });

    const corps = (partiel: Record<string, unknown> = {}) => ({
      geste: 'amendement',
      idObjectif: 'OBJ_1',
      texte: TEXTE,
      ...partiel,
    });

    it('accepte le texte du patient et rend 201', async () => {
      const res = await POST(postRequest(cookieProprio(), corps()));
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({
        ok: true,
        amendement: { id: 'AME_1', idObjectif: 'OBJ_1', texte: TEXTE },
      });
      // Et AUCUNE ratification n'est écrite au passage : deux gestes, deux tables.
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
    });

    it('drapeau éteint ⇒ 503, et RIEN n’est écrit', async () => {
      delete process.env.WN_DOSSIER_DEUX_VOIX;
      const res = await POST(postRequest(cookieProprio(), corps()));
      expect(res.status).toBe(503);
      expect(prisma.amendementObjectif.create).not.toHaveBeenCalled();
    });

    it('sans session ⇒ 401, et rien n’est écrit', async () => {
      const res = await POST(postRequest(undefined, corps()));
      expect(res.status).toBe(401);
      expect(prisma.amendementObjectif.create).not.toHaveBeenCalled();
    });

    it('écrit `idPatient` DE LA SESSION, jamais celui du corps', async () => {
      await POST(postRequest(cookieProprio(), corps({ idPatient: 'PAT_AUTRE' })));
      expect(prisma.amendementObjectif.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ idPatient: 'PAT_TEST' }) }),
      );
    });

    it('n’écrit AUCUNE date, et ignore celles du corps — antidater est impossible', async () => {
      await POST(
        postRequest(
          cookieProprio(),
          corps({ exprimeLe: '2020-01-01T00:00:00.000Z', creeLe: '2020-01-01T00:00:00.000Z' }),
        ),
      );
      const { data } = prisma.amendementObjectif.create.mock.calls[0][0];
      expect(Object.keys(data).sort()).toEqual(['idObjectif', 'idPatient', 'texte']);
    });

    it('refuse un texte vide en 400 — un amendement sans mots n’est pas un amendement', async () => {
      for (const texte of ['', '   ', undefined, null, 42]) {
        const res = await POST(postRequest(cookieProprio(), corps({ texte })));
        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({ ok: false, reason: 'texte_absent' });
      }
      expect(prisma.amendementObjectif.create).not.toHaveBeenCalled();
    });

    it('refuse hors bornes en 400, SANS RIEN TRONQUER, et le dit en chiffres', async () => {
      const res = await POST(
        postRequest(cookieProprio(), corps({ texte: 'x'.repeat(LONGUEUR_MAX_AMENDEMENT + 1) })),
      );
      expect(res.status).toBe(400);
      const charge = await res.json();
      expect(charge).toMatchObject({ ok: false, reason: 'texte_trop_long' });
      expect(charge.error).toContain(String(LONGUEUR_MAX_AMENDEMENT));
      expect(prisma.amendementObjectif.create).not.toHaveBeenCalled();
    });

    it('accepte EXACTEMENT la borne, et le texte arrive entier', async () => {
      const pile = 'x'.repeat(LONGUEUR_MAX_AMENDEMENT);
      const res = await POST(postRequest(cookieProprio(), corps({ texte: pile })));
      expect(res.status).toBe(201);
      const { data } = prisma.amendementObjectif.create.mock.calls[0][0];
      expect(data.texte).toHaveLength(LONGUEUR_MAX_AMENDEMENT);
    });

    it('objectif d’un AUTRE dossier ou inexistant : MÊME 404, MÊME message', async () => {
      prisma.objectifNegocie.findMany.mockResolvedValue([]);
      const inexistant = await POST(postRequest(cookieProprio(), corps({ idObjectif: 'OBJ_FANTOME' })));
      expect(inexistant.status).toBe(404);
      const messageInexistant = (await inexistant.json()).error;

      // Un objectif qui existe, mais dans un AUTRE dossier : la lecture est
      // scopée à la session, il n'apparaît donc pas — même réponse, mot pour mot.
      prisma.objectifNegocie.findMany.mockResolvedValue([
        { id: 'OBJ_AUTRE', supersedesObjectifId: null, creeLe: new Date('2026-08-20T09:00:00.000Z') },
      ]);
      const autreDossier = await POST(postRequest(cookieProprio(), corps({ idObjectif: 'OBJ_1' })));
      expect(autreDossier.status).toBe(404);
      expect((await autreDossier.json()).error).toBe(messageInexistant);
      expect(prisma.amendementObjectif.create).not.toHaveBeenCalled();
    });

    it('une version SUPPLANTÉE rend 409 — le texte porterait sur une version qui n’engage plus', async () => {
      prisma.objectifNegocie.findMany.mockResolvedValue([
        { id: 'OBJ_1', supersedesObjectifId: null, creeLe: new Date('2026-08-20T09:00:00.000Z') },
        { id: 'OBJ_2', supersedesObjectifId: 'OBJ_1', creeLe: new Date('2026-08-21T09:00:00.000Z') },
      ]);
      const res = await POST(postRequest(cookieProprio(), corps({ idObjectif: 'OBJ_1' })));
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ ok: false, reason: 'objectif_supplante' });
      expect(prisma.amendementObjectif.create).not.toHaveBeenCalled();
    });

    it('DEUX TÊTES : 409, et rien n’est écrit — la discordance ne se départage pas (DC-30)', async () => {
      prisma.objectifNegocie.findMany.mockResolvedValue([
        { id: 'OBJ_1', supersedesObjectifId: null, creeLe: new Date('2026-08-20T09:00:00.000Z') },
        { id: 'OBJ_2', supersedesObjectifId: null, creeLe: new Date('2026-08-21T09:00:00.000Z') },
      ]);
      const res = await POST(postRequest(cookieProprio(), corps({ idObjectif: 'OBJ_1' })));
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ ok: false, reason: 'objectif_discordant' });
      expect(prisma.amendementObjectif.create).not.toHaveBeenCalled();
    });

    it('APPEND-ONLY : deux textes successifs font DEUX lignes, rien n’est corrigé', async () => {
      await POST(postRequest(cookieProprio(), corps()));
      await POST(postRequest(cookieProprio(), corps({ texte: 'En fait, dormir avant minuit.' })));
      expect(prisma.amendementObjectif.create).toHaveBeenCalledTimes(2);
      expect(prisma.amendementObjectif.update).not.toHaveBeenCalled();
      expect(prisma.amendementObjectif.updateMany).not.toHaveBeenCalled();
      expect(prisma.amendementObjectif.upsert).not.toHaveBeenCalled();
      expect(prisma.amendementObjectif.delete).not.toHaveBeenCalled();
      expect(prisma.amendementObjectif.deleteMany).not.toHaveBeenCalled();
    });

    it('une référence hors bornes rend le MÊME 404, sans toucher la base', async () => {
      const res = await POST(postRequest(cookieProprio(), corps({ idObjectif: 'x'.repeat(65) })));
      expect(res.status).toBe(404);
      expect(prisma.objectifNegocie.findMany).not.toHaveBeenCalled();
      expect(prisma.amendementObjectif.create).not.toHaveBeenCalled();
    });

    it('CHAQUE GESTE IGNORE LES CHAMPS DE L’AUTRE, et n’en écrit rien en base', async () => {
      // Un corps qui porte les deux jeux de champs ne doit pas produire un
      // hybride : le geste NOMMÉ décide seul de ce qui est lu et de ce qui est
      // écrit.
      await POST(postRequest(cookieProprio(), corps({ sens: 'ratifie' })));
      const ecritAmendement = prisma.amendementObjectif.create.mock.calls[0][0].data;
      expect(Object.keys(ecritAmendement).sort()).toEqual(['idObjectif', 'idPatient', 'texte']);
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();

      vi.clearAllMocks();
      mockCompteActif();
      prisma.objectifNegocie.findMany.mockResolvedValue([
        { id: 'OBJ_1', supersedesObjectifId: null, creeLe: new Date('2026-08-20T09:00:00.000Z') },
      ]);
      prisma.ratificationObjectif.create.mockResolvedValue({
        id: 'RAT_1',
        idObjectif: 'OBJ_1',
        sens: 'ratifie',
        creeLe: new Date('2026-08-25T12:00:00.000Z'),
      });

      await POST(
        postRequest(cookieProprio(), {
          geste: 'ratification',
          idObjectif: 'OBJ_1',
          sens: 'ratifie',
          texte: TEXTE,
        }),
      );
      const ecritRatification = prisma.ratificationObjectif.create.mock.calls[0][0].data;
      expect(Object.keys(ecritRatification).sort()).toEqual(['idObjectif', 'idPatient', 'sens']);
      expect(prisma.amendementObjectif.create).not.toHaveBeenCalled();
    });
  });

  // ── POST — « OÙ J'EN SUIS » (6.0-B, LOT-05) ───────────────────────────────

  describe('POST — la réponse d’étape du patient', () => {
    const TEXTE = 'Je tiens jusqu’au dîner trois soirs sur sept, c’est mieux qu’avant.';

    const corpsJalon = (partiel: Record<string, unknown> = {}) => ({
      geste: 'reponse_jalon',
      idObjectif: 'OBJ_1',
      jalon: 'J21',
      texte: TEXTE,
      ...partiel,
    });

    /**
     * L'ancre placée de façon à ouvrir la fenêtre voulue MAINTENANT. Les
     * fenêtres se calculent contre l'horloge réelle du serveur : une date
     * d'ancre figée au calendrier deviendrait fausse le lendemain.
     */
    const ancreOuvrant = (jours: number) => ({
      confirmedAt: new Date(Date.now() - jours * 24 * 60 * 60 * 1000),
    });

    beforeEach(() => {
      mockCompteActif();
      prisma.objectifNegocie.findMany.mockResolvedValue([
        { id: 'OBJ_1', supersedesObjectifId: null, creeLe: new Date('2026-08-20T09:00:00.000Z') },
      ]);
      // T0 confirmé il y a exactement 21 jours : la fenêtre du J21 est ouverte.
      prisma.assessmentEpisode.findFirst.mockResolvedValue(ancreOuvrant(JOURS_JALON.J21));
      prisma.reponseJalonObjectif.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'REP_1',
            idObjectif: data.idObjectif,
            jalon: data.jalon,
            texte: data.texte,
            eva: data.eva,
            creeLe: new Date('2026-08-26T12:00:00.000Z'),
          }),
      );
    });

    it('écrit la réponse et la rend relue, sans jamais poser de date', async () => {
      const res = await POST(postRequest(cookieProprio(), corpsJalon({ eva: 6 })));
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({
        ok: true,
        reponseJalon: { id: 'REP_1', idObjectif: 'OBJ_1', jalon: 'J21', texte: TEXTE, eva: 6 },
      });

      const { data } = prisma.reponseJalonObjectif.create.mock.calls[0][0];
      expect(Object.keys(data).sort()).toEqual(['eva', 'idObjectif', 'idPatient', 'jalon', 'texte']);
      expect(data.idPatient).toBe(PATIENT.idPatient);
    });

    it('SANS EVA, la colonne reçoit `null` — jamais zéro (DC-24)', async () => {
      await POST(postRequest(cookieProprio(), corpsJalon()));
      expect(prisma.reponseJalonObjectif.create.mock.calls[0][0].data.eva).toBeNull();
    });

    it('REFUSE `T0` AVANT LA BASE — sinon 23514, donc 500 pour le patient', async () => {
      // `resoudreJalonDu` rend `T0` pour un patient sans cycle confirmé : c'est
      // un chemin atteignable, pas une valeur théorique.
      const res = await POST(postRequest(cookieProprio(), corpsJalon({ jalon: 'T0' })));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ ok: false, reason: 'jalon_invalide' });
      expect(prisma.reponseJalonObjectif.create).not.toHaveBeenCalled();
    });

    it('REFUSE UNE EVA DÉCIMALE — le cast INTEGER l’arrondirait avant le CHECK', async () => {
      const res = await POST(postRequest(cookieProprio(), corpsJalon({ eva: 5.5 })));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ ok: false, reason: 'eva_invalide' });
      expect(prisma.reponseJalonObjectif.create).not.toHaveBeenCalled();
    });

    it('refuse une EVA hors bornes ou non numérique, sans rien écrire', async () => {
      for (const eva of [-1, 11, '5', '', [], true]) {
        const res = await POST(postRequest(cookieProprio(), corpsJalon({ eva })));
        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({ ok: false, reason: 'eva_invalide' });
      }
      expect(prisma.reponseJalonObjectif.create).not.toHaveBeenCalled();
    });

    it('distingue l’étape ABSENTE de l’étape INEXISTANTE', async () => {
      const absente = await POST(postRequest(cookieProprio(), corpsJalon({ jalon: '' })));
      expect(await absente.json()).toMatchObject({ ok: false, reason: 'jalon_absent' });

      const inexistante = await POST(postRequest(cookieProprio(), corpsJalon({ jalon: 'J7' })));
      expect(await inexistante.json()).toMatchObject({ ok: false, reason: 'jalon_invalide' });
      expect(prisma.reponseJalonObjectif.create).not.toHaveBeenCalled();
    });

    it('LE TEXTE EST OBLIGATOIRE — une EVA seule n’écrit rien', async () => {
      const res = await POST(postRequest(cookieProprio(), corpsJalon({ texte: '   ', eva: 8 })));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ ok: false, reason: 'texte_absent' });
      expect(prisma.reponseJalonObjectif.create).not.toHaveBeenCalled();
    });

    it('une version supplantée est refusée, comme pour les deux autres gestes', async () => {
      prisma.objectifNegocie.findMany.mockResolvedValue([
        { id: 'OBJ_1', supersedesObjectifId: null, creeLe: new Date('2026-08-20T09:00:00.000Z') },
        { id: 'OBJ_2', supersedesObjectifId: 'OBJ_1', creeLe: new Date('2026-08-22T09:00:00.000Z') },
      ]);
      const res = await POST(postRequest(cookieProprio(), corpsJalon()));
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ ok: false, reason: 'objectif_supplante' });
      expect(prisma.reponseJalonObjectif.create).not.toHaveBeenCalled();
    });

    it('un objectif d’un AUTRE dossier rend le même 404 qu’un inexistant', async () => {
      prisma.objectifNegocie.findMany.mockResolvedValue([
        { id: 'OBJ_9', supersedesObjectifId: null, creeLe: new Date('2026-08-20T09:00:00.000Z') },
      ]);
      const res = await POST(postRequest(cookieProprio(), corpsJalon()));
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ ok: false, reason: 'objectif_introuvable' });
      expect(prisma.reponseJalonObjectif.create).not.toHaveBeenCalled();
    });

    it('APPEND-ONLY : répondre deux fois au MÊME jalon fait DEUX lignes', async () => {
      await POST(postRequest(cookieProprio(), corpsJalon({ eva: 4 })));
      await POST(postRequest(cookieProprio(), corpsJalon({ texte: 'En fait j’ai rechuté.', eva: 2 })));
      expect(prisma.reponseJalonObjectif.create).toHaveBeenCalledTimes(2);
      expect(prisma.reponseJalonObjectif.update).not.toHaveBeenCalled();
      expect(prisma.reponseJalonObjectif.updateMany).not.toHaveBeenCalled();
      expect(prisma.reponseJalonObjectif.upsert).not.toHaveBeenCalled();
      expect(prisma.reponseJalonObjectif.delete).not.toHaveBeenCalled();
      expect(prisma.reponseJalonObjectif.deleteMany).not.toHaveBeenCalled();
    });

    it('CE GESTE IGNORE LES CHAMPS DES AUTRES, et n’écrit aucun hybride', async () => {
      await POST(postRequest(cookieProprio(), corpsJalon({ sens: 'conteste', eva: 3 })));
      const { data } = prisma.reponseJalonObjectif.create.mock.calls[0][0];
      expect(Object.keys(data).sort()).toEqual(['eva', 'idObjectif', 'idPatient', 'jalon', 'texte']);
      expect(prisma.ratificationObjectif.create).not.toHaveBeenCalled();
      expect(prisma.amendementObjectif.create).not.toHaveBeenCalled();
    });

    it('HORS FENÊTRE, RIEN N’EST ÉCRIT — même avec un corps parfaitement valide', async () => {
      // Le troisième jour : aucune étape n'est ouverte. Un `J21` posté quand
      // même daterait un point d'étape d'un moment que le patient n'a pas vécu.
      prisma.assessmentEpisode.findFirst.mockResolvedValue(ancreOuvrant(3));
      const res = await POST(postRequest(cookieProprio(), corpsJalon()));
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ ok: false, reason: 'jalon_ferme' });
      expect(prisma.reponseJalonObjectif.create).not.toHaveBeenCalled();
    });

    it('SANS CYCLE CONFIRMÉ, aucune étape n’est écrivable', async () => {
      // C'est l'état de tous les dossiers de production aujourd'hui, et c'est
      // celui où `resoudreJalonDu` rendrait `T0`.
      prisma.assessmentEpisode.findFirst.mockResolvedValue(null);
      const res = await POST(postRequest(cookieProprio(), corpsJalon()));
      expect(res.status).toBe(409);
      expect(prisma.reponseJalonObjectif.create).not.toHaveBeenCalled();
    });

    it('UNE ÉTAPE OUVERTE N’EN OUVRE PAS UNE AUTRE : le J90 est refusé pendant le J21', async () => {
      // La borne ne dit pas seulement « une fenêtre est ouverte » : elle dit
      // LAQUELLE. Sans la comparaison de jalon, un onglet resté ouvert
      // posterait le J90 dans la fenêtre du J21.
      const res = await POST(postRequest(cookieProprio(), corpsJalon({ jalon: 'J90' })));
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ ok: false, reason: 'jalon_ferme' });
      expect(prisma.reponseJalonObjectif.create).not.toHaveBeenCalled();
    });

    it('les DEUX BORNES de la tolérance écrivent, le jour d’après ne le fait plus', async () => {
      // Une demi-journée de marge VERS L'INTÉRIEUR de la fenêtre : la borne
      // exacte tombe sur l'instant même, et l'horloge avance entre la
      // construction du corps et sa lecture.
      for (const jours of [
        JOURS_JALON.J21 - TOLERANCE_JOURS_JALON + 0.5,
        JOURS_JALON.J21 + TOLERANCE_JOURS_JALON - 0.5,
      ]) {
        prisma.assessmentEpisode.findFirst.mockResolvedValue(ancreOuvrant(jours));
        const res = await POST(postRequest(cookieProprio(), corpsJalon()));
        expect(res.status).toBe(201);
      }
      expect(prisma.reponseJalonObjectif.create).toHaveBeenCalledTimes(2);

      prisma.assessmentEpisode.findFirst.mockResolvedValue(
        ancreOuvrant(JOURS_JALON.J21 + TOLERANCE_JOURS_JALON + 1),
      );
      const dehors = await POST(postRequest(cookieProprio(), corpsJalon()));
      expect(dehors.status).toBe(409);
      expect(prisma.reponseJalonObjectif.create).toHaveBeenCalledTimes(2);
    });

    it('le GET sert l’étape ouverte, calculée par le SERVEUR', async () => {
      mockDossierComplet({ ancreT0: [ancreOuvrant(JOURS_JALON.J42)] });
      const res = await GET(getRequest(cookieProprio()));
      const corps = await res.json();
      expect(corps.jalonDu).toMatchObject({ statut: 'ouverte', jalon: 'J42' });
    });

    it('sans cycle confirmé, le GET dit POURQUOI — sans reprocher un silence', async () => {
      mockDossierComplet();
      const res = await GET(getRequest(cookieProprio()));
      const corps = await res.json();
      expect(corps.jalonDu.statut).toBe('aucune');
      expect(corps.jalonDu.motif).toEqual(expect.any(String));
      // `T0` ne fuit jamais vers l'écran comme une étape proposable.
      expect(JSON.stringify(corps.jalonDu)).not.toContain('T0');
    });

    it('une réponse d’étape NE CHANGE PAS l’état de ratification de l’objectif', async () => {
      // Dire où l'on en est n'est ni ratifier, ni contester, ni reformuler.
      mockDossierComplet({
        reponsesJalon: [
          {
            id: 'REP_1',
            idObjectif: 'OBJ_1',
            jalon: 'J21',
            texte: TEXTE,
            eva: null,
            creeLe: new Date('2026-08-26T12:00:00.000Z'),
          },
        ],
      });
      const res = await GET(getRequest(cookieProprio()));
      const corps = await res.json();
      expect(corps.objectifs[0].etat).toBe('en_attente');
      // …et elle est bien SERVIE au patient, EVA nulle comprise.
      expect(corps.reponsesJalon).toEqual([
        expect.objectContaining({ id: 'REP_1', jalon: 'J21', eva: null }),
      ]);
    });
  });

  // ── JOURNALISATION SÛRE ───────────────────────────────────────────────────

  describe('les exceptions ne recopient jamais le dossier en logs', () => {
    it('une erreur Prisma est CAVIARDÉE — ni prose, ni e-mail', async () => {
      const espion = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCompteActif();

      const fuite = new Error(
        `Invalid \`prisma.ratificationObjectif.create()\` — data: { texte: "${PATIENT.email} — ${'prose clinique '.repeat(20)}" }`,
      );
      fuite.name = 'PrismaClientValidationError';
      prisma.objectifNegocie.findMany.mockRejectedValue(fuite);

      const res = await POST(postRequest(cookieProprio(), { idObjectif: 'OBJ_1', sens: 'ratifie' }));
      expect(res.status).toBe(500);

      const trace = espion.mock.calls.map((appel) => appel.join(' ')).join(' ');
      expect(trace).toContain('PrismaClientValidationError');
      expect(trace).not.toContain(PATIENT.email);
      expect(trace).not.toContain('prose clinique');
      espion.mockRestore();
    });

    it('une erreur ordinaire garde son message — il ne porte aucun payload', async () => {
      const espion = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCompteActif();
      prisma.objectifNegocie.findMany.mockRejectedValue(new Error('connexion interrompue'));

      const res = await GET(getRequest(cookieProprio()));
      expect(res.status).toBe(500);
      expect(espion.mock.calls.map((appel) => appel.join(' ')).join(' ')).toContain(
        'connexion interrompue',
      );
      espion.mockRestore();
    });
  });
});
