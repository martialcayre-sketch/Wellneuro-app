import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LA DÉSIGNATION D'UN ÉLÉMENT DU PROGRAMME ([[D-281]] §2, étape 3).

const {
  prisma, notifierPraticienSignalement, designationOuverte, programmeDiffuse, resolveProtocoleDiffuse,
} = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    trustAdverseEffectReport: { create: vi.fn() },
  },
  notifierPraticienSignalement: vi.fn(),
  designationOuverte: vi.fn(),
  programmeDiffuse: vi.fn(),
  resolveProtocoleDiffuse: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/trust/notification', () => ({ notifierPraticienSignalement }));
vi.mock('@/lib/trust/pauseEffetIndesirableServeur', () => ({ designationOuverte, programmeDiffuse }));
vi.mock('@/lib/protocol/portailProtocol', () => ({ resolveProtocoleDiffuse }));

import { signPatientSession } from '@/lib/patient-session';
import { actionOrientation } from '@/lib/clinical-engine/orientationAdressage';
import { POST } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'sophie.nicola@example.test',
  prenom: 'Sophie',
  nom: 'Nicola',
  actif: true,
  accessTokenRevoked: false,
  praticienEmail: 'praticien@wellneuro.fr',
};

const PROGRAMME = {
  protocolDraftId: 'draft-1',
  version: 'v-courante',
  actions: [
    actionOrientation(true),
    { actionId: 'action-5', type: 'medical_referral', title: 'Voir votre gastro-entérologue' },
    { actionId: 'action-6', type: 'biological_exploration', title: 'Prise de sang' },
    { actionId: 'a-magnesium', type: 'supplement_exploration', title: 'Magnésium le soir' },
    { actionId: 'a-zinc', type: 'supplement_exploration', title: 'Zinc', interventionStatus: 'differee' },
  ],
  servi: true,
};

const SIGNALEMENT = {
  categorie: 'effet_indesirable',
  produitLibelle: 'Magnésium',
  symptomes: 'Maux de ventre',
  severiteDeclaree: 'legere',
  versionProgramme: 'v-courante',
};

function request(body: object): Request {
  const cookie = signPatientSession({ idPatient: patient.idPatient, email: patient.email });
  return new Request('http://localhost/api/portail/trust/signalement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: `wn_portail=${encodeURIComponent(cookie)}` },
    body: JSON.stringify(body),
  });
}

const ecrit = () => prisma.trustAdverseEffectReport.create.mock.calls[0]?.[0]?.data;

describe('POST signalement — désignation d’un élément (D-281 §2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.WN_EI_INTERRUPTION = '1';
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.trustAdverseEffectReport.create.mockResolvedValue({});
    designationOuverte.mockResolvedValue(true);
    programmeDiffuse.mockResolvedValue(PROGRAMME);
    resolveProtocoleDiffuse.mockResolvedValue({ protocolDraftId: 'draft-1' });
  });
  afterEach(() => {
    delete process.env.WN_EI_INTERRUPTION;
  });

  it('un élément du programme : rattachement, élément et programme résolu par le serveur sont écrits', async () => {
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId: 'a-magnesium' }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ rattachement: 'element', elementActionId: 'a-magnesium', protocolDraftId: 'draft-1' });
  });

  it.each(['ne_sait_pas', 'autre_produit'])('« %s » : rattaché au programme, sans élément', async (rattachement) => {
    const res = await POST(request({ ...SIGNALEMENT, rattachement, elementActionId: 'a-magnesium' }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ rattachement, elementActionId: null, protocolDraftId: 'draft-1' });
  });

  it.each(['orientation-medecin', 'action-5', 'action-6'])('« %s » (orientation vers le médecin, prise de sang) n’est pas désignable : 400, rien n’est écrit', async (elementActionId) => {
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId }));
    expect(res.status).toBe(400);
    expect(prisma.trustAdverseEffectReport.create).not.toHaveBeenCalled();
  });

  // LA LISTE QUE LE PATIENT VOIT (arbitrages du responsable du 2026-10-16) :
  // une intervention non ferme n'y figure pas ; un programme non servi au
  // portail se désigne sans liste.
  it('une intervention non ferme (différée) n’est pas désignable par le patient : 400, rien n’est écrit', async () => {
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId: 'a-zinc' }));
    expect(res.status).toBe(400);
    expect(prisma.trustAdverseEffectReport.create).not.toHaveBeenCalled();
  });

  it('programme non servi au portail (« indisponible ») : un élément est refusé, 400, rien n’est écrit', async () => {
    programmeDiffuse.mockResolvedValue({ ...PROGRAMME, servi: false });
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId: 'a-magnesium' }));
    expect(res.status).toBe(400);
    expect(prisma.trustAdverseEffectReport.create).not.toHaveBeenCalled();
  });

  it.each(['ne_sait_pas', 'autre_produit'])('programme non servi au portail : « %s » rattache au programme diffusé, sans élément', async (rattachement) => {
    programmeDiffuse.mockResolvedValue({ ...PROGRAMME, servi: false });
    const res = await POST(request({ ...SIGNALEMENT, rattachement }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ rattachement, elementActionId: null, protocolDraftId: 'draft-1' });
  });

  // LES IDENTIFIANTS SONT POSITIONNELS : un choix fait sur une version remplacée
  // désignerait une autre action de la nouvelle.
  it.each([undefined, 'v-remplacee'])('une version du programme absente ou remplacée (%s) : 400, rien n’est écrit', async (versionProgramme) => {
    const res = await POST(request({ ...SIGNALEMENT, versionProgramme, rattachement: 'element', elementActionId: 'a-magnesium' }));
    expect(res.status).toBe(400);
    expect(prisma.trustAdverseEffectReport.create).not.toHaveBeenCalled();
  });

  it('« Je ne sais pas » sur une version remplacée : accepté, rattaché au programme courant', async () => {
    const res = await POST(request({ ...SIGNALEMENT, versionProgramme: 'v-remplacee', rattachement: 'ne_sait_pas' }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ rattachement: 'ne_sait_pas', elementActionId: null, protocolDraftId: 'draft-1' });
  });

  // LE REPLI (D-281 §5, arbitrage du 2026-10-16) : une désignation illisible
  // vise le programme diffusé, sans rattachement — le signalement attend l'avis
  // comme le formulaire d'avant, au lieu de ne rien bloquer.
  it.each([
    ['la lecture du programme', () => programmeDiffuse.mockRejectedValue(new Error('base indisponible'))],
    ['la lecture de l’âge', () => designationOuverte.mockRejectedValue(new Error('base indisponible'))],
  ])('%s en échec : le signalement vise le programme diffusé, sans rattachement, et attend l’avis', async (_, echec) => {
    echec();
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId: 'a-magnesium' }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ protocolDraftId: 'draft-1' });
    expect(ecrit()).not.toHaveProperty('rattachement');
    expect(ecrit()).not.toHaveProperty('elementActionId');
    expect(notifierPraticienSignalement).toHaveBeenCalled();
  });

  it.each(['element', 'ne_sait_pas', 'autre_produit'])('« %s » sur un programme diffusé dont l’intégrité ne se vérifie pas : même repli, le signalement attend l’avis', async (rattachement) => {
    programmeDiffuse.mockResolvedValue(null);
    const res = await POST(request({ ...SIGNALEMENT, rattachement, elementActionId: 'a-magnesium' }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ protocolDraftId: 'draft-1' });
    expect(ecrit()).not.toHaveProperty('rattachement');
    expect(ecrit()).not.toHaveProperty('elementActionId');
  });

  it.each([
    ['la lecture du programme', () => programmeDiffuse.mockRejectedValue(new Error('base indisponible'))],
    ['l’intégrité du programme', () => programmeDiffuse.mockResolvedValue(null)],
  ])('%s en échec, la lecture du programme diffusé aussi : capturé sans programme, jamais perdu', async (_, echec) => {
    echec();
    resolveProtocoleDiffuse.mockRejectedValue(new Error('base indisponible'));
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId: 'a-magnesium' }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ protocolDraftId: null });
    expect(ecrit()).not.toHaveProperty('rattachement');
    expect(notifierPraticienSignalement).toHaveBeenCalled();
  });

  it('une lecture en échec sans programme diffusé : capturé sans programme, rien ne bloque', async () => {
    programmeDiffuse.mockRejectedValue(new Error('base indisponible'));
    resolveProtocoleDiffuse.mockResolvedValue(null);
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId: 'a-magnesium' }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ protocolDraftId: null });
  });

  it('une désignation lisible ne se replie jamais : le programme diffusé n’est pas relu', async () => {
    await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId: 'a-magnesium' }));
    expect(resolveProtocoleDiffuse).not.toHaveBeenCalled();
    expect(ecrit()).toMatchObject({ rattachement: 'element' });
  });

  it('un élément absent du programme : 400 en français, rien n’est écrit', async () => {
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId: 'a-inconnu' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/ne figure plus dans votre programme/);
    expect(prisma.trustAdverseEffectReport.create).not.toHaveBeenCalled();
  });

  it('un rattachement hors liste : 400, rien n’est écrit', async () => {
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'oui' }));
    expect(res.status).toBe(400);
    expect(prisma.trustAdverseEffectReport.create).not.toHaveBeenCalled();
  });

  it('sans programme diffusé, rien ne se rattache : le signalement est capturé', async () => {
    programmeDiffuse.mockResolvedValue(null);
    resolveProtocoleDiffuse.mockResolvedValue(null);
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId: 'a-magnesium' }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ protocolDraftId: null });
    expect(ecrit()).not.toHaveProperty('rattachement');
  });

  it('désignation fermée (dossier mineur ou sans date) : le chemin d’avant, aucun rattachement écrit', async () => {
    designationOuverte.mockResolvedValue(false);
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId: 'a-magnesium' }));
    expect(res.status).toBe(200);
    expect(ecrit()).not.toHaveProperty('rattachement');
    expect(ecrit()).toMatchObject({ protocolDraftId: null });
    expect(programmeDiffuse).not.toHaveBeenCalled();
  });

  // LE FORMULAIRE D'AVANT : « oui » au programme vise le programme diffusé ; sa
  // lecture en échec ne fait plus perdre le signalement (500 avant le correctif).
  // Deux entrées dans ce chemin : un formulaire sans désignation, et une
  // désignation fermée (dossier mineur ou sans date) malgré un rattachement envoyé.
  const ENTREES_FORMULAIRE_AVANT = [
    ['sans désignation', {}, () => undefined],
    ['désignation fermée', { rattachement: 'element', elementActionId: 'a-magnesium' },
      () => designationOuverte.mockResolvedValue(false)],
  ] as const;

  it.each(ENTREES_FORMULAIRE_AVANT)('formulaire d’avant (%s), « oui » : le signalement vise le programme diffusé, sans rattachement', async (_, champs, preparer) => {
    preparer();
    const res = await POST(request({ ...SIGNALEMENT, ...champs, rattacheAuProgramme: 'oui' }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ protocolDraftId: 'draft-1' });
    expect(ecrit()).not.toHaveProperty('rattachement');
  });

  it.each(ENTREES_FORMULAIRE_AVANT)('formulaire d’avant (%s), lecture du programme en échec : capturé sans programme, jamais perdu', async (_, champs, preparer) => {
    preparer();
    resolveProtocoleDiffuse.mockRejectedValue(new Error('base indisponible'));
    const res = await POST(request({ ...SIGNALEMENT, ...champs, rattacheAuProgramme: 'oui' }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ protocolDraftId: null });
    expect(notifierPraticienSignalement).toHaveBeenCalled();
  });

  it('formulaire d’avant, « non » : rien n’est rattaché, le programme n’est pas lu', async () => {
    const res = await POST(request({ ...SIGNALEMENT, rattacheAuProgramme: 'non' }));
    expect(res.status).toBe(200);
    expect(ecrit()).toMatchObject({ protocolDraftId: null });
    expect(resolveProtocoleDiffuse).not.toHaveBeenCalled();
  });

  it('drapeau absent : aucune association, la désignation n’est même pas consultée', async () => {
    delete process.env.WN_EI_INTERRUPTION;
    const res = await POST(request({ ...SIGNALEMENT, rattachement: 'element', elementActionId: 'a-magnesium' }));
    expect(res.status).toBe(200);
    expect(ecrit()).not.toHaveProperty('rattachement');
    expect(designationOuverte).not.toHaveBeenCalled();
  });
});
