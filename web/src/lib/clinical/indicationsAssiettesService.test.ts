import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LE BANC EXERCE LA TABLE RÉELLE, et ce choix est le cœur du dossier. Fabriquer
// des lignes de fixture aurait prouvé que le service sait évaluer DES lignes ;
// il n'aurait rien prouvé des ONZE qui sont signées. Ce qui est contrôlé ici,
// ce sont les entrées — passations, anamnèse, date de naissance — et les
// verdicts portent sur les vraies portes.
//
// SEULES DEUX CHOSES SONT MOQUÉES : la base (aucun dossier réel au banc) et la
// lecture du corpus (aucune connexion). Le verrou, le filtre de statut, le
// moteur, les libellés du catalogue C5B et le calcul d'âge sont RÉELS.

const { prisma, mockCorpus, mockSignee } = vi.hoisted(() => ({
  prisma: {
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
    patient: { findUnique: vi.fn() },
  },
  mockCorpus: { claimsValidesAuCorpus: vi.fn() },
  // `null` = LE VERDICT RÉEL du verrou. Un seul cas le force, pour éprouver le
  // second terme de la conjonction ; partout ailleurs la vraie signature décide,
  // sans quoi le banc cesserait de mordre le jour où elle tomberait.
  mockSignee: { valeur: null as boolean | null },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

vi.mock('@/lib/rag/claims/validite', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rag/claims/validite')>()),
  claimsValidesAuCorpus: mockCorpus.claimsValidesAuCorpus,
}));

vi.mock('@/lib/clinical/indicationsAssiettesV1', async (importOriginal) => {
  const reel = await importOriginal<typeof import('./indicationsAssiettesV1')>();
  return {
    ...reel,
    indicationsAssiettesSignees: (...args: Parameters<typeof reel.indicationsAssiettesSignees>) =>
      mockSignee.valeur === null ? reel.indicationsAssiettesSignees(...args) : mockSignee.valeur,
  };
});

import { cleClaim as cleClaimCorpus } from '@/lib/rag/claims/validite';
import { INDICATIONS_ASSIETTES_METADATA, INDICATIONS_ASSIETTES_V1, claimsDeLaLigne } from './indicationsAssiettesV1';
import { assiettesIndiqueesActives, evaluerAssiettesPourPatient } from './indicationsAssiettesService';

/** Tous les claims de la table, en clés du CORPUS — la jointure, pas une copie. */
function toutesLesClesDuCorpus(): Set<string> {
  return new Set(
    INDICATIONS_ASSIETTES_V1.flatMap(ligne =>
      claimsDeLaLigne(ligne).map(claim => cleClaimCorpus(claim)),
    ),
  );
}

function dossierVide() {
  prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  prisma.consultation.findFirst.mockResolvedValue(null);
  prisma.patient.findUnique.mockResolvedValue(null);
}

const ENV_ORIGINE = process.env.WN_ASSIETTES_INDIQUEES;

beforeEach(() => {
  vi.clearAllMocks();
  mockSignee.valeur = null;
  process.env.WN_ASSIETTES_INDIQUEES = 'true';
  mockCorpus.claimsValidesAuCorpus.mockResolvedValue(toutesLesClesDuCorpus());
  dossierVide();
});

afterEach(() => {
  if (ENV_ORIGINE === undefined) delete process.env.WN_ASSIETTES_INDIQUEES;
  else process.env.WN_ASSIETTES_INDIQUEES = ENV_ORIGINE;
});

describe('le verrou — une conjonction, et ses deux termes ferment seuls', () => {
  it('drapeau absent : inactif, et AUCUNE base n’est touchée', async () => {
    delete process.env.WN_ASSIETTES_INDIQUEES;
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    expect(resultat.actif).toBe(false);
    // Le vrai enjeu n'est pas le verdict, c'est ce qui N'A PAS eu lieu : ni
    // lecture du corpus, ni lecture du dossier. Une route qui journalise
    // l'accès au dossier s'appuie sur ce fait.
    expect(mockCorpus.claimsValidesAuCorpus).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('drapeau à une autre valeur que `true` : inactif', async () => {
    process.env.WN_ASSIETTES_INDIQUEES = '1';
    expect(assiettesIndiqueesActives()).toBe(false);
  });

  it('table non signée : inactif, même drapeau posé', async () => {
    mockSignee.valeur = false;
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    expect(resultat.actif).toBe(false);
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('drapeau posé ET table signée : actif — le verrou réel est OUVERT aujourd’hui', () => {
    expect(assiettesIndiqueesActives()).toBe(true);
  });
});

describe('le corpus — deux fermetures, deux raisons, jamais confondues', () => {
  it('corpus ILLISIBLE : rien n’est servi, `corpusLu` est faux, et le dossier n’est pas lu', async () => {
    mockCorpus.claimsValidesAuCorpus.mockRejectedValue(new Error('connexion perdue'));
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    expect(resultat.corpusLu).toBe(false);
    expect(resultat.indiquees).toEqual([]);
    expect(resultat.nonEvaluees).toEqual([]);
    // AUCUNE LIGNE SERVABLE ⇒ AUCUNE LECTURE DE DOSSIER. Lire un dossier pour
    // n'en rien faire serait un accès sans objet.
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('corpus LU mais aucun claim valide : rien n’est servi, et `corpusLu` est VRAI', async () => {
    mockCorpus.claimsValidesAuCorpus.mockResolvedValue(new Set<string>());
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    // LA DIFFÉRENCE AVEC LE CAS PRÉCÉDENT EST TOUT L'INTÉRÊT DU CHAMP : les
    // deux rendent des listes vides, et une carte qui les confondrait dirait
    // « rien n'est indiqué » là où la machine n'a pas pu regarder (`DC-24`).
    expect(resultat.corpusLu).toBe(true);
    expect(resultat.indiquees).toEqual([]);
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('un seul claim manquant retire SA ligne, et elle seule', async () => {
    const toutes = toutesLesClesDuCorpus();
    // `WN-CL-0290-005` ne fonde que la ligne sérotoninergique.
    toutes.delete(cleClaimCorpus({ claimId: 'WN-CL-0290-005', versionClaim: 'v1.0' }));
    mockCorpus.claimsValidesAuCorpus.mockResolvedValue(toutes);
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    const vues = [...resultat.indiquees, ...resultat.nonEvaluees].map(a => a.ligneId);
    expect(vues).not.toContain('ASSIETTE-IND-SEROTONINERGIQUE');
    expect(vues).toContain('ASSIETTE-IND-DETOXICATION');
  });
});

describe('la jointure des deux `cleClaim` — tenue par ce cas, et par rien d’autre', () => {
  it('le service interroge le corpus avec les VINGT couples de la table', async () => {
    await evaluerAssiettesPourPatient('PAT001');
    const demandes = mockCorpus.claimsValidesAuCorpus.mock.calls[0][0] as ReadonlyArray<{
      claimId: string;
      versionClaim: string;
    }>;
    expect(demandes).toHaveLength(INDICATIONS_ASSIETTES_METADATA.claimsSource.length);
    expect(new Set(demandes.map(d => d.claimId)).size).toBe(20);
  });

  it('les clés rendues par le corpus SUFFISENT au filtre — deux `cleClaim`, un seul format', async () => {
    // LE DÉFAUT QUE CE CAS FERME. `cleClaim` existe DEUX FOIS dans le dépôt —
    // `catalogueConduitesV1` pour les tables signées, `rag/claims/validite`
    // pour le corpus. Les deux rendent aujourd'hui `id::version`, mais rien ne
    // le garantissait : aucun banc ne confrontait les deux. Si l'un dérivait,
    // le filtre ne reconnaîtrait AUCUNE clé et le service rendrait zéro ligne
    // EN SILENCE — fail-closed, pour une raison introuvable.
    mockCorpus.claimsValidesAuCorpus.mockResolvedValue(toutesLesClesDuCorpus());
    prisma.patient.findUnique.mockResolvedValue({ dateNaissance: '1950-03-12' });
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    expect(resultat.indiquees.length + resultat.nonEvaluees.length + resultat.nonIndiquees).toBe(7);
  });
});

describe('ce que le service sert — les SEPT lignes publiées, jamais les quatre brouillons', () => {
  it('aucun brouillon ne paraît, ni indiqué ni non évalué', async () => {
    prisma.patient.findUnique.mockResolvedValue({ dateNaissance: '1950-03-12' });
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    const brouillons = INDICATIONS_ASSIETTES_V1.filter(l => l.statut === 'brouillon').map(l => l.id);
    expect(brouillons.length).toBe(4);
    const vues = [...resultat.indiquees, ...resultat.nonEvaluees].map(a => a.ligneId);
    for (const id of brouillons) expect(vues).not.toContain(id);
  });

  it('le sha servi est le LITTÉRAL de la métadonnée, jamais un recalcul', async () => {
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    expect(resultat.shaPerimetre).toBe(INDICATIONS_ASSIETTES_METADATA.shaPerimetre);
    expect(resultat.shaPerimetre).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('les portes réelles s’ouvrent — sur le dossier, pas sur une fixture de ligne', () => {
  it('une borne d’ÂGE ouvre seule l’assiette protéinée', async () => {
    // 1950 : bien au-delà de `> 60`, et stable quelle que soit l'année où le
    // banc tourne — `ageAnnees` est le vrai, aucune horloge n'est moquée.
    prisma.patient.findUnique.mockResolvedValue({ dateNaissance: '1950-03-12' });
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    const proteinee = resultat.indiquees.find(a => a.ligneId === 'ASSIETTE-IND-PROTEINEE');
    expect(proteinee).toBeDefined();
    expect(proteinee?.plateCode).toBe('ASSIETTE_PROTEINEE');
    expect(proteinee?.motif).toContain('âge');
    // Le libellé vient du CATALOGUE C5B, pas de la ligne ni du corpus.
    expect(proteinee?.libelle.length).toBeGreaterThan(0);
    expect(proteinee?.sourceProtocole).toBe('WN-SRC-0288');
  });

  it('une date de naissance absente n’ouvre AUCUNE borne d’âge — jamais « âge 0 »', async () => {
    prisma.patient.findUnique.mockResolvedValue({ dateNaissance: null });
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    expect(resultat.indiquees.map(a => a.ligneId)).not.toContain('ASSIETTE-IND-PROTEINEE');
  });

  it('un drapeau d’ANAMNÈSE ouvre seul l’épargne digestive', async () => {
    prisma.consultation.findFirst.mockResolvedValue({
      anamnese: { intolerances_alimentaires: ['Gluten'] },
    });
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    const epargne = resultat.indiquees.find(a => a.ligneId === 'ASSIETTE-IND-EPARGNE-DIGESTIVE');
    expect(epargne).toBeDefined();
    expect(epargne?.motif).toContain('intolerancesAlimentaires');
    // Les claims servis sont l'union des DEUX catégories — indication ET
    // sécurité —, dédoublonnée et triée. Jamais un verbatim.
    expect(epargne?.claims).toEqual([...(epargne?.claims ?? [])].sort());
    expect(epargne?.claims.every(c => /^WN-CL-\d{4}-\d{3}::/.test(c))).toBe(true);
  });

  it('une ligne ATTEINTE ne porte aucune lacune — le contrat de `lacunesDuDeclencheur`', async () => {
    prisma.consultation.findFirst.mockResolvedValue({
      anamnese: { intolerances_alimentaires: ['Gluten'] },
    });
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    // L'épargne digestive est une disjonction dont UNE branche seulement est
    // remplie : `Q_GAS_01` n'est pas passé. Si le service interrogeait les
    // lacunes sur une porte atteinte, elle paraîtrait ici en « non évaluée »
    // EN PLUS d'être indiquée — les deux à la fois.
    expect(resultat.nonEvaluees.map(a => a.ligneId)).not.toContain('ASSIETTE-IND-EPARGNE-DIGESTIVE');
  });
});

describe('ce qu’on n’a PAS pu regarder — `DC-24`, et c’est le motif du lot', () => {
  it('dossier vide : rien n’est indiqué, et tout ce qui manque est NOMMÉ', async () => {
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    expect(resultat.indiquees).toEqual([]);
    // Le fait qui compte : la carte ne peut PAS afficher un vide muet. Chaque
    // ligne servable a soit une porte atteinte, soit une lacune nommée.
    expect(resultat.nonEvaluees.length).toBeGreaterThan(0);
    const types = resultat.nonEvaluees.flatMap(a => a.lacunes.map(l => l.type));
    expect(types).toContain('instrument_non_passe');
    expect(types).toContain('anamnese_absente');
  });

  it('la lacune nomme l’instrument ET son axe quand la porte en vise un', async () => {
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    const dopa = resultat.nonEvaluees.find(a => a.ligneId === 'ASSIETTE-IND-DOPAMINERGIQUE');
    expect(dopa).toBeDefined();
    // Les deux branches visent `Q_INF_03`, sur les axes DA et NA : les DEUX
    // sont rapportées, parce que les deux manquent.
    expect(dopa?.lacunes).toHaveLength(2);
    expect(dopa?.lacunes.map(l => (l.type === 'instrument_non_passe' ? l.sousScore : null)))
      .toEqual(['DA', 'NA']);
  });

  it('une anamnèse PRÉSENTE sans la valeur cherchée n’est PAS une lacune', async () => {
    // Le patient a déclaré, et il n'a pas déclaré cela : c'est un vrai négatif,
    // pas une absence. Confondre les deux ferait passer pour « non regardé » ce
    // qui a été lu et tranché.
    prisma.consultation.findFirst.mockResolvedValue({ anamnese: { intolerances_alimentaires: [] } });
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    const epargne = resultat.nonEvaluees.find(a => a.ligneId === 'ASSIETTE-IND-EPARGNE-DIGESTIVE');
    expect(epargne?.lacunes.map(l => l.type)).not.toContain('anamnese_absente');
  });

  it('les trois comptes couvrent EXACTEMENT les sept lignes servables', async () => {
    prisma.patient.findUnique.mockResolvedValue({ dateNaissance: '1950-03-12' });
    prisma.consultation.findFirst.mockResolvedValue({
      anamnese: { intolerances_alimentaires: ['Gluten'] },
    });
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    // Aucune ligne servable ne disparaît en silence : une ligne est indiquée,
    // non évaluée, ou lue et non retenue — il n'y a pas de quatrième sort.
    expect(resultat.indiquees.length + resultat.nonEvaluees.length + resultat.nonIndiquees).toBe(7);
  });
});
