import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// J1-cockpit-b — [[D-333]] §2 règle 5 et §6 : « Aucun chiffre ne traverse au
// portail. Chaque module de calcul et chaque composant déclare sa surface ; un
// garde de frontière le prouve. »
//
// Le cockpit calcule et montre ; le portail reste sans chiffre (§1). La
// frontière ne tenait qu'à des habitudes : la réponse de `api/patient/equilibre`
// portait encore la valeur de chaque point de la trajectoire et l'écart du
// momentum, que rien n'affichait mais que tout le monde pouvait lire (Q10). Ce
// banc la rend opposable, en trois volets :
//
//   1. IMPORTS — une surface patient ne prend de `lib/equilibre` que la
//      composition destinée au patient (`lecturePatient`), la doctrine des
//      libellés (`natureIndiceGlobal`) et les constantes ; jamais une route
//      praticien, jamais un module d'indice du cockpit.
//   2. CONTRAT — la réponse servie au portail est une liste FERMÉE de clés, et
//      seuls deux nombres y vivent, ceux des représentations sans valeur du §1
//      (famille 2) : `indiceGlobal` pour la jauge sans chiffre, `couverture`
//      pour les cercles et les paliers dits en mots (et l'identifiant du
//      besoin, qui n'est pas une mesure).
//   3. RENDU — toute jauge d'une surface patient porte `showValue={false}`.
//
// LES SURFACES SONT DÉCOUVERTES, pas listées fichier par fichier : tout `.ts`
// ou `.tsx` sous les racines ci-dessous, présentes ou à venir.

const SRC = path.resolve(__dirname, '../..');
const RACINES_PATIENT = [
  'app/api/patient',
  'app/api/portail',
  'app/portail',
  'components/patient',
  'components/patient-companion',
  'components/patient-food-compass',
  'components/patient-food-observation',
  'components/portail',
];
/** Répertoires `components/patient*` qui ne sont PAS des surfaces patient,
 *  chacun avec son motif. Un répertoire neuf doit être rangé d'un côté ou de
 *  l'autre — sinon le banc rougit (voir plus bas). */
const HORS_PORTAIL: Record<string, string> = {
  'components/patient-cockpit': 'panneaux du cockpit praticien (fiche patient), jamais rendus au portail',
};

/** Seuls modules de `lib/equilibre` qu'une surface patient peut importer. */
const EQUILIBRE_PERMIS = new Set(['lecturePatient', 'natureIndiceGlobal', 'constants']);

/** Modules qui nomment ou décrivent un indice du cockpit (J1-cockpit-a et b). */
const MODULES_COCKPIT = ['lib/praticien/mentionStabiliteMetabolique', 'lib/praticien/provenanceChiffre'];

function surfacesPatient(): string[] {
  const trouves: string[] = [];
  const descendre = (dossier: string) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const p = path.join(dossier, entree.name);
      if (entree.isDirectory()) descendre(p);
      else if (/\.tsx?$/.test(entree.name) && !/\.test\.tsx?$/.test(entree.name)) trouves.push(p);
    }
  };
  for (const racine of RACINES_PATIENT) {
    const absolue = path.join(SRC, racine);
    if (existsSync(absolue)) descendre(absolue);
  }
  return trouves;
}

/** Chaque import, statique ou dynamique, rendu relatif à `src` sans extension. */
function importsDe(fichier: string): string[] {
  const source = readFileSync(fichier, 'utf8');
  const specs = [...source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)].map(m => m[1]);
  return specs.map(spec => {
    if (spec.startsWith('@/')) return spec.slice(2);
    if (spec.startsWith('.')) return path.relative(SRC, path.resolve(path.dirname(fichier), spec));
    return spec;
  });
}

function relatif(fichier: string): string {
  return path.relative(SRC, fichier);
}

describe('frontière du portail — imports', () => {
  const surfaces = surfacesPatient();

  it('tout répertoire components/patient* est rangé : surface patient ou hors portail motivé', () => {
    const nonRanges = readdirSync(path.join(SRC, 'components'), { withFileTypes: true })
      .filter(e => e.isDirectory() && /^(patient|portail)/.test(e.name))
      .map(e => `components/${e.name}`)
      .filter(d => !RACINES_PATIENT.includes(d) && !(d in HORS_PORTAIL));
    expect(nonRanges).toEqual([]);
  });

  it('la découverte trouve les surfaces patient (sinon ce banc ne garde rien)', () => {
    expect(surfaces.length).toBeGreaterThan(20);
    expect(surfaces.map(relatif)).toContain(path.join('app/api/patient/equilibre/route.ts'));
    expect(surfaces.map(relatif)).toContain(path.join('components/patient/MonEquilibreAccueil.tsx'));
  });

  it('aucune surface patient n’importe un module de lib/equilibre hors de la composition patient', () => {
    const fautes = surfaces.flatMap(f =>
      importsDe(f)
        .filter(
          i =>
            (i === 'lib/equilibre' || i.startsWith('lib/equilibre/')) &&
            !EQUILIBRE_PERMIS.has(i.slice('lib/equilibre/'.length)),
        )
        .map(i => `${relatif(f)} → ${i}`),
    );
    expect(fautes).toEqual([]);
  });

  it('aucune surface patient n’importe une route praticien ni un module d’indice du cockpit', () => {
    const fautes = surfaces.flatMap(f =>
      importsDe(f)
        .filter(i => i.startsWith('app/api/praticien/') || MODULES_COCKPIT.includes(i))
        .map(i => `${relatif(f)} → ${i}`),
    );
    expect(fautes).toEqual([]);
  });
});

describe('frontière du portail — rendu', () => {
  it('toute jauge d’une surface patient porte showValue={false}', () => {
    const jauges = surfacesPatient()
      .filter(f => f.endsWith('.tsx'))
      .flatMap(f => [...readFileSync(f, 'utf8').matchAll(/<ScoreGauge\b[\s\S]*?\/>/g)].map(m => ({ f: relatif(f), jsx: m[0] })));
    // Sans jauge trouvée, le cas serait vert sans rien prouver.
    expect(jauges.length).toBeGreaterThan(0);
    expect(jauges.filter(j => !/showValue=\{false\}/.test(j.jsx)).map(j => j.f)).toEqual([]);
  });
});

// ─── Contrat : la réponse réellement servie par la route du portail ─────────

const { prisma, readPatientSession, isSessionAuthorizedForAssignment } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
  },
  readPatientSession: vi.fn(),
  isSessionAuthorizedForAssignment: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/patient-session', () => ({ readPatientSession, isSessionAuthorizedForAssignment }));

/** Clés permises, par chemin (`[]` = élément de liste). Liste fermée. */
const CLES_PERMISES: Record<string, string[]> = {
  '': ['indiceGlobal', 'momentum', 'trajectoire', 'besoins'],
  momentum: ['tendance'],
  'trajectoire[]': ['date'],
  'besoins[]': ['id', 'libellePatient', 'strate', 'couverture'],
};
/** Les seuls chemins où un nombre peut paraître (§1, famille 2 ; l'identifiant). */
const NOMBRES_PERMIS = new Set(['indiceGlobal', 'besoins[].couverture', 'besoins[].id']);

function parcourir(valeur: unknown, chemin: string, cles: string[], nombres: string[]): void {
  if (typeof valeur === 'number') nombres.push(chemin);
  else if (Array.isArray(valeur)) valeur.forEach(v => parcourir(v, `${chemin}[]`, cles, nombres));
  else if (valeur && typeof valeur === 'object') {
    for (const [cle, v] of Object.entries(valeur)) {
      cles.push(`${chemin}::${cle}`);
      parcourir(v, chemin ? `${chemin}.${cle}` : cle, cles, nombres);
    }
  }
}

describe('frontière du portail — contrat de api/patient/equilibre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readPatientSession.mockReturnValue({ idPatient: 'PAT_1' });
    isSessionAuthorizedForAssignment.mockResolvedValue(true);
    prisma.assignation.findUnique.mockResolvedValue({ idAssignation: 'ASS_1', idPatient: 'PAT_1' });
    // Fixture : deux passations du versant dépressif de la HAD, à T0 et avant
    // J21 — de quoi faire exister indice, momentum, trajectoire et couverture.
    // Un champ absent de la réponse ne prouverait pas qu'il est retiré.
    const jour = 24 * 60 * 60 * 1000;
    const axeD = (v: string) => Object.fromEntries(['D2', 'D4', 'D6', 'D8', 'D10', 'D12', 'D14'].map(id => [id, v]));
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idQuestionnaire: 'Q_NEU_11', dateReponse: new Date(Date.now() - 60 * jour), scoresJson: { rawAnswers: axeD('0') }, statutValidite: null },
      { idQuestionnaire: 'Q_NEU_11', dateReponse: new Date(Date.now() - 45 * jour), scoresJson: { rawAnswers: axeD('3') }, statutValidite: null },
    ]);
  });

  async function servi(): Promise<Record<string, unknown>> {
    const { GET } = await import('@/app/api/patient/equilibre/route');
    const res = await GET(new Request('http://localhost/api/patient/equilibre?id=ASS_1'));
    expect(res.status).toBe(200);
    return (await res.json()) as Record<string, unknown>;
  }

  it('la fixture fait exister chaque objet (sinon le contrat serait vert à vide)', async () => {
    const json = await servi();
    expect(json.indiceGlobal).not.toBeNull();
    expect(json.momentum).not.toBeNull();
    expect((json.trajectoire as unknown[]).length).toBeGreaterThanOrEqual(2);
    expect((json.besoins as { couverture: number | null }[]).some(b => b.couverture !== null)).toBe(true);
  });

  it('liste fermée de clés : aucun champ ajouté ne traverse sans passer par ce banc', async () => {
    const cles: string[] = [];
    parcourir(await servi(), '', cles, []);
    const horsListe = cles.filter(c => {
      const [chemin, cle] = c.split('::');
      return !(CLES_PERMISES[chemin] ?? []).includes(cle);
    });
    expect(horsListe).toEqual([]);
  });

  it('aucun nombre hors de la jauge et des couvertures — ni valeur de trajectoire, ni écart de momentum', async () => {
    const nombres: string[] = [];
    parcourir(await servi(), '', [], nombres);
    expect([...new Set(nombres)].filter(n => !NOMBRES_PERMIS.has(n))).toEqual([]);
  });
});
