import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { sourcesCitees } from '@/lib/bibliotheque-options/bibliothequeBesoin2V1';

// LE CONTRAT DES POSITIONS CITÉES — [[D-480]] §5.3, BP-17 PR 4. Patron de
// `clinical/claimsEpinglesFraicheur.guard.test.ts`, qui garde les claims.
//
// Une position d'expert citée par une table signée (`WN-PE-NNNN@vN.M`) doit
// exister, être la version courante de sa position, et son dernier acte être
// une signature d'empreinte égale (`web/prisma/checks/
// positions_citees_tables_signees_v1.sql`, préflight de release-db). Comme
// pour les claims, la liste est écrite deux fois — dans la table signée, en
// TypeScript, et dans le contrat — et le prédicat deux fois — dans le contrat
// et dans son négatif, joué en CI. Rien, en SQL, ne les tient ensemble : ce
// banc le fait.

const RACINE = path.resolve(__dirname, '../../../..');
const LIB = path.join(RACINE, 'web/src/lib');
const CONTRAT = 'web/prisma/checks/positions_citees_tables_signees_v1.sql';
const NEGATIF = 'web/prisma/checks/positions_citees_tables_signees_v1_negatif.sql';
const CI = '.github/workflows/ci.yml';
const RELEASE_DB = '.github/workflows/release-db.yml';
const RELEASE_SCRIPT = 'web/scripts/release-db-scalingo.sh';

const lire = (relatif: string) => readFileSync(path.join(RACINE, relatif), 'utf8');

function bloc(source: string, marqueur: string, fichier: string): string {
  const debut = source.indexOf(`-- >>> ${marqueur}`);
  const fin = source.indexOf(`-- <<< ${marqueur}`);
  if (debut === -1 || fin === -1 || fin <= debut) {
    throw new Error(`${fichier} : marqueurs ${marqueur} absents ou inversés`);
  }
  return source
    .slice(debut + `-- >>> ${marqueur}`.length, fin)
    .split('\n')
    .map(ligne => ligne.trimEnd())
    .join('\n')
    .trim();
}

// LES TABLES SIGNÉES QUI CITENT DES POSITIONS, et la table du contrat de
// chacune. Une table qui déclare des positions (`positionsSource: [`) sans
// entrée ici fait rougir ce banc : ses positions ne seraient gardées par rien.
// Les positions attendues se lisent dans la STRUCTURE (ce qu'elle cite, signée
// ou non), pas dans la déclaration de signature : fail-closed.
const TABLES_CITANT_DES_POSITIONS: Record<string, { table: string; positions: () => string[] }> = {
  'web/src/lib/bibliotheque-options/bibliothequeBesoin2V1.ts': {
    table: 'bibliotheque_options',
    positions: () => sourcesCitees().positions,
  },
};

/** Les fichiers de production sous `web/src/lib` qui déclarent une liste `positionsSource`. */
function fichiersDeclarantDesPositions(): string[] {
  const trouves: string[] = [];
  const parcourir = (dossier: string) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = path.join(dossier, entree.name);
      if (entree.isDirectory()) parcourir(chemin);
      else if (
        /\.tsx?$/.test(entree.name) &&
        !/\.(test|spec)\.tsx?$/.test(entree.name) &&
        !entree.name.endsWith('.d.ts') &&
        /positionsSource\s*:\s*\[/.test(readFileSync(chemin, 'utf8'))
      ) {
        trouves.push(path.relative(RACINE, chemin).split(path.sep).join('/'));
      }
    }
  };
  parcourir(LIB);
  return trouves.sort();
}

type Entree = { position_id: string; version: string; table_signee: string };
const cle = (e: Entree) => `${e.position_id}@${e.version}#${e.table_signee}`;

/** La liste du contrat, lue dans son bloc : une affectation JSON unique. */
function listeDuContrat(): Entree[] {
  const texte = bloc(lire(CONTRAT), 'LISTE_POSITIONS_CITEES', CONTRAT);
  const m = /^\s*epinglees := '(\[[\s\S]*\])'::jsonb;\s*$/m.exec(texte);
  if (!m) throw new Error(`${CONTRAT} : affectation de la liste introuvable`);
  const liste = JSON.parse(m[1]) as unknown;
  if (!Array.isArray(liste)) throw new Error(`${CONTRAT} : la liste n'est pas un tableau`);
  return liste as Entree[];
}

describe('positions citées — la liste du contrat est celle des tables signées', () => {
  it('chaque table signée qui déclare des positions a sa table au contrat', () => {
    const declarants = fichiersDeclarantDesPositions();
    // Anti-vacuité : la bibliothèque des options déclare `positionsSource`.
    expect(declarants).toContain('web/src/lib/bibliotheque-options/bibliothequeBesoin2V1.ts');
    expect(declarants).toEqual(Object.keys(TABLES_CITANT_DES_POSITIONS).sort());
  });

  it('la liste du contrat est exactement ce que citent les tables signées', () => {
    const attendus = Object.values(TABLES_CITANT_DES_POSITIONS)
      .flatMap(({ table, positions }) =>
        positions().map(p => {
          const [position_id, version] = p.split('@');
          return cle({ position_id, version, table_signee: table });
        }),
      )
      .sort();
    const auContrat = listeDuContrat().map(cle).sort();
    expect(auContrat).toEqual(attendus);
  });

  it('chaque entrée du contrat est bien formée et sans doublon', () => {
    const liste = listeDuContrat();
    for (const e of liste) {
      expect(Object.keys(e).sort()).toEqual(['position_id', 'table_signee', 'version']);
      expect(e.position_id).toMatch(/^WN-PE-[0-9]{4}$/);
      expect(e.version).toMatch(/^v[0-9]+\.[0-9]+$/);
      expect(Object.values(TABLES_CITANT_DES_POSITIONS).map(t => t.table)).toContain(e.table_signee);
    }
    expect(new Set(liste.map(cle)).size).toBe(liste.length);
  });
});

describe('positions citées — les deux écritures du prédicat', () => {
  const blocContrat = bloc(lire(CONTRAT), 'PREDICAT_POSITIONS_CITEES', CONTRAT);
  const blocNegatif = bloc(lire(NEGATIF), 'PREDICAT_POSITIONS_CITEES', NEGATIF);

  it('le contrat et son test négatif portent le MÊME prédicat', () => {
    expect(blocNegatif).toBe(blocContrat);
  });

  // Anti-vacuité : deux blocs vides seraient « identiques ».
  it('le prédicat contrôle l’existence, la version courante, le dernier acte et l’empreinte', () => {
    expect(blocContrat).toContain('ON v.position_id = e.position_id AND v.version = e.version');
    expect(blocContrat).toContain('ON s.id_version_revisee = v.id');
    expect(blocContrat).toContain('ORDER BY a.ordre DESC');
    expect(blocContrat).toContain('WHERE v.id IS NULL');
    expect(blocContrat).toContain('OR s.id IS NOT NULL');
    expect(blocContrat).toContain("OR dernier.acte IS DISTINCT FROM 'signee'");
    expect(blocContrat).toContain(
      'OR dernier.empreinte IS DISTINCT FROM public.positions_expert_empreinte_contenu(v.contenu);',
    );
  });
});

describe('positions citées — le contrat de production reste en lecture seule', () => {
  const contrat = lire(CONTRAT);

  it('le contrat ouvre une transaction en lecture seule et lève sous WN001', () => {
    expect(contrat).toMatch(/^BEGIN READ ONLY;$/m);
    expect(contrat).toMatch(/^ROLLBACK;$/m);
    expect(contrat).toContain("USING ERRCODE = 'WN001'");
  });

  it('le contrat ne porte aucun verbe d’écriture', () => {
    const sansCommentaires = contrat.replace(/--[^\n]*/g, ' ');
    expect(sansCommentaires).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT)\b/i);
  });
});

describe('positions citées — les contrats sont câblés', () => {
  const ci = lire(CI);
  const releaseDb = lire(RELEASE_DB);
  const releaseScript = lire(RELEASE_SCRIPT);

  it('le test négatif tourne en CI', () => {
    expect(ci).toContain('npx prisma db execute --file prisma/checks/positions_citees_tables_signees_v1_negatif.sql');
  });

  // La base du CI est vide : le contrat positif y rougirait dès la première
  // position citée.
  it('le contrat positif ne tourne PAS en CI', () => {
    expect([...ci.matchAll(/positions_citees_tables_signees_v1\.sql/g)]).toHaveLength(0);
  });

  it('le préflight production passe AVANT migrate deploy', () => {
    const preflight = releaseScript.indexOf(
      'prisma db execute --file prisma/checks/positions_citees_tables_signees_v1.sql',
    );
    const deploy = releaseScript.indexOf('npx prisma migrate deploy');
    expect(preflight).toBeGreaterThan(-1);
    expect(deploy).toBeGreaterThan(-1);
    expect(preflight).toBeLessThan(deploy);
  });

  // Le négatif ÉCRIT ses fixtures avant de les annuler.
  it('le test négatif ne tourne JAMAIS contre la production', () => {
    expect(releaseDb).not.toContain('positions_citees_tables_signees_v1_negatif');
    expect(releaseScript).not.toContain('positions_citees_tables_signees_v1_negatif');
  });

  // Une liste retouchée — ou la structure signée qui la nourrit — part par une
  // release approuvée, dont le préflight rejoue le contrat contre la production.
  it('le déclencheur de release-db couvre le contrat et la structure qui cite', () => {
    const paths = releaseDb.slice(releaseDb.indexOf('paths:'), releaseDb.indexOf('workflow_dispatch:'));
    expect(paths).toContain("- 'web/prisma/checks/positions_citees_tables_signees_v1.sql'");
    for (const fichier of Object.keys(TABLES_CITANT_DES_POSITIONS)) {
      expect(paths).toContain(`- '${fichier}'`);
    }
  });
});
