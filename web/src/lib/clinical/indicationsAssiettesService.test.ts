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

/**
 * UNE PASSATION RÉELLE DE `Q_INF_03` — 40 items cotés, recueil COMPLET.
 *
 * POURQUOI ELLE ENTRE ICI, ET CE QU'ELLE FERME (constat de revue). Le chapeau
 * de ce banc annonçait contrôler « passations, anamnèse, date de naissance » ;
 * aucun cas n'en fournissait une seule. `dossierVide()` rendait `[]` au
 * `beforeEach`, et rien ne le redéfinissait — si bien que tout le chemin
 * `scoresRecalculesPourRaisonnement` → `derniereReponseParQuestionnaire` →
 * porte d'instrument n'était JAMAIS exécuté avec de la donnée, alors que cinq
 * des sept lignes publiées dépendent d'un instrument.
 *
 * LE SCORE STOCKÉ EST VOLONTAIREMENT FAUX — `DA` à 0 quand les réponses brutes
 * valent 10. C'est le mutant qui décide : un service qui lirait `scoresJson`
 * tel quel au lieu de recalculer garderait la porte fermée, et ce cas rougit.
 * Un score stocké est un instantané de la doctrine qui avait cours à la
 * soumission — c'est exactement la divergence que [[D-237]] §4 refuse.
 */
function reponsesBrutesQInf03(valeur: number): Record<string, number> {
  const brutes: Record<string, number> = {};
  for (const prefixe of ['D', 'N', 'S', 'ME']) {
    for (let index = 1; index <= 10; index += 1) brutes[`${prefixe}${index}`] = valeur;
  }
  return brutes;
}

function passationQInf03(over: Record<string, unknown> = {}) {
  return {
    idReponse: 'REP-QINF03',
    idQuestionnaire: 'Q_INF_03',
    dateReponse: new Date('2026-09-18T09:00:00.000Z'),
    scoresJson: {
      rawAnswers: reponsesBrutesQInf03(1),
      subScores: [
        { id: 'DA', label: 'Dopamine', total: 0, scaled: 0, max: 40, repondus: 10, items: 10 },
      ],
      total: 0,
    },
    statutValidite: 'VALID',
    ...over,
  };
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
    // ET LA LIGNE RETIRÉE EST COMPTÉE — sans quoi elle disparaissait sans
    // qu'aucun terme du résultat ne la mentionne, `corpusLu` restant VRAI.
    expect(resultat.retireesFauteDeClaim).toBe(1);
  });

  it('corpus ILLISIBLE : aucun retrait n’est compté — la raison est déjà dite', async () => {
    // Zéro, et ce n'est pas un repli : aucune ligne n'est servable, et
    // `corpusLu` porte la cause. Compter là un retrait par claim nommerait une
    // seconde cause qui n'a pas eu lieu.
    mockCorpus.claimsValidesAuCorpus.mockRejectedValue(new Error('connexion perdue'));
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    expect(resultat.corpusLu).toBe(false);
    expect(resultat.retireesFauteDeClaim).toBe(0);
  });

  it('corpus lu et complet : aucun retrait — la phrase ne paraîtra pas sans motif', async () => {
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    expect(resultat.retireesFauteDeClaim).toBe(0);
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

  it('une PASSATION ouvre la porte d’instrument — et le score est RECALCULÉ, jamais relu', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([passationQInf03()]);
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    const dopa = resultat.indiquees.find(a => a.ligneId === 'ASSIETTE-IND-DOPAMINERGIQUE');
    expect(dopa).toBeDefined();
    // `score 10` et non `score 0` : le stocké disait 0, les réponses brutes
    // valent 10. C'est le recalcul qui décide — la mutation qui rend
    // `scoresJson` tel quel referme la porte et rougit ici.
    expect(dopa?.motif).toContain('score 10');
    expect(dopa?.instruments).toEqual([{ idQuestionnaire: 'Q_INF_03', sousScore: 'DA' }]);
  });

  it('une passation INVALIDÉE n’ouvre rien — et la lacune dit « non cotable », pas « non passé »', async () => {
    // Le praticien a invalidé le recueil : le score cesse d'être lisible pour
    // le raisonnement, mais la passation a bien eu lieu. Confondre les deux
    // ferait dire au praticien qu'il n'a pas passé un instrument qu'il a passé.
    const drapeauOrigine = process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    process.env.WN_ENABLE_VALIDITE_PASSATIONS = '1';
    try {
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        passationQInf03({ statutValidite: 'INVALID' }),
      ]);
      const resultat = await evaluerAssiettesPourPatient('PAT001');
      if (!resultat.actif) throw new Error('le verrou devait être ouvert');
      expect(resultat.indiquees.map(a => a.ligneId)).not.toContain('ASSIETTE-IND-DOPAMINERGIQUE');
      const dopa = resultat.nonEvaluees.find(a => a.ligneId === 'ASSIETTE-IND-DOPAMINERGIQUE');
      expect(dopa?.lacunes.map(l => l.type)).toEqual(['instrument_non_cotable', 'instrument_non_cotable']);
    } finally {
      if (drapeauOrigine === undefined) delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
      else process.env.WN_ENABLE_VALIDITE_PASSATIONS = drapeauOrigine;
    }
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

  it('le claim cité DEUX FOIS ne paraît qu’une — dédoublonnage de l’union', async () => {
    // `WN-CL-0288-013` est le seul claim de la table cité deux fois : il fonde
    // l'indication de la protéinée ET porte sa réserve parkinsonienne, donc il
    // est dans `claimsIndication` ET dans `claimsSecurite`. Aucune assertion du
    // dépôt ne le regardait — les deux qui touchaient `.claims` portaient sur
    // l'épargne digestive, dont les six claims sont tous distincts. Retirer le
    // `new Set` laissait donc tout vert, et la carte affichait l'identifiant
    // deux fois sur un dossier réel.
    prisma.patient.findUnique.mockResolvedValue({ dateNaissance: '1950-03-12' });
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    const proteinee = resultat.indiquees.find(a => a.ligneId === 'ASSIETTE-IND-PROTEINEE');
    const doublon = proteinee?.claims.filter(c => c.startsWith('WN-CL-0288-013::')) ?? [];
    expect(doublon).toHaveLength(1);
    expect(new Set(proteinee?.claims).size).toBe(proteinee?.claims.length);
  });

  it('AUCUNE prose de relecture ne traverse — `raccourciAssume` ne sort pas du dépôt', async () => {
    // CONSTAT DE REVUE. Le champ existe sur la ligne, il est dans le périmètre
    // haché, et il était servi tel quel : la carte affichait au praticien un
    // texte écrit pour la relecture de signature, avec ses identifiants de code
    // (`claimsSecurite`, `insomnie_depression`, `Q_INF_03`, `D-224`). Le
    // reformuler périmerait l'attestation ; il ne voyage donc pas.
    prisma.patient.findUnique.mockResolvedValue({ dateNaissance: '1950-03-12' });
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    const proteinee = resultat.indiquees.find(a => a.ligneId === 'ASSIETTE-IND-PROTEINEE');
    expect(proteinee).toBeDefined();
    // La ligne PORTE bien un raccourci — sans quoi ce cas serait vide de sens.
    const ligne = INDICATIONS_ASSIETTES_V1.find(l => l.id === 'ASSIETTE-IND-PROTEINEE');
    expect(ligne?.raccourciAssume?.length ?? 0).toBeGreaterThan(80);
    expect(Object.keys(proteinee ?? {})).not.toContain('raccourciAssume');
    expect(JSON.stringify(proteinee)).not.toContain('claimsSecurite');
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

  it('les QUATRE comptes couvrent les sept lignes PUBLIÉES, retrait par claim compris', async () => {
    // L'INVARIANT ÉLARGI, ET C'EST LE CONSTAT DE REVUE. Le cas précédent
    // compte les lignes SERVABLES : il reste vert pendant que la table rétrécit.
    // Ici le dénominateur est le nombre de lignes PUBLIÉES — une ligne retirée
    // par le corpus doit se retrouver dans un compte, jamais nulle part.
    const toutes = toutesLesClesDuCorpus();
    for (const claim of [
      { claimId: 'WN-CL-0290-005', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0287-008', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0291-011', versionClaim: 'v1.0' },
    ]) {
      toutes.delete(cleClaimCorpus(claim));
    }
    mockCorpus.claimsValidesAuCorpus.mockResolvedValue(toutes);
    const resultat = await evaluerAssiettesPourPatient('PAT001');
    if (!resultat.actif) throw new Error('le verrou devait être ouvert');
    expect(resultat.retireesFauteDeClaim).toBe(3);
    expect(
      resultat.indiquees.length
      + resultat.nonEvaluees.length
      + resultat.nonIndiquees
      + resultat.retireesFauteDeClaim,
    ).toBe(7);
  });
});
