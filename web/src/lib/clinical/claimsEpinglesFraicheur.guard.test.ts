import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// LOT-01 chaîne T0 (D-042, précisé par D-044) — ce banc garde les trois
// propriétés que le SQL ne peut pas garder tout seul.
//
// 1. LA LISTE DES CLAIMS ÉPINGLÉS EST ÉCRITE TROIS FOIS : en TypeScript dans
//    chaque table signée, dans le contrat de production, et dans les fixtures du
//    fichier négatif. Rien, en SQL, ne les tient ensemble. Le jour où une table
//    signée épingle un claim de plus, le contrat continue de passer — sur
//    l'ancienne liste — et le claim neuf n'est gardé par rien. C'EST EXACTEMENT
//    LE TROU DE L'AUDIT §E que ce lot existe pour ne pas recopier.
// 2. LE PRÉDICAT EST ÉCRIT DEUX FOIS. Contrat et négatif portent le même bloc ;
//    s'ils divergent, le négatif éprouve un prédicat qui n'est plus celui qui
//    garde la production, tout en restant vert.
// 3. UN FICHIER POSÉ DANS `prisma/checks/` NE TOURNE NULLE PART tant qu'aucune
//    étape ne le nomme : il n'existe aucun runner générique.
//
// LA DÉCOUVERTE DES TABLES SIGNÉES EST AUTOMATIQUE, et c'est le point. Ce banc
// ne connaît pas `orientationRulesV1` par son nom : il balaie
// `web/src/lib/clinical/` et retient tout objet exporté qui se déclare table
// signée. `contradictionsV1` n'existe pas encore ; le jour où il arrive avec ses
// claims, ce banc rougit tant que le contrat ne les porte pas. Une liste
// d'imports codée en dur aurait laissé la table neuve passer sous le radar —
// c'est-à-dire précisément le cas que le contrat doit couvrir.

const RACINE = path.resolve(__dirname, '../../../..');
const CLINIQUE = path.join(RACINE, 'web/src/lib/clinical');
const CONTRAT = 'web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql';
const NEGATIF = 'web/prisma/checks/rag_claim_fraicheur_tables_signees_v1_negatif.sql';
const CI = '.github/workflows/ci.yml';
const RELEASE_DB = '.github/workflows/release-db.yml';

function lire(relatif: string): string {
  return readFileSync(path.join(RACINE, relatif), 'utf8');
}

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

// Les entrées d'un bloc SQL, sous leur forme
// `('WN-CL-0000-000', 'v1.0', 'orientation', true)`.
type EntreeSql = { cle: string; table: string; exigePrescriptif: boolean };

function entreesSql(source: string): EntreeSql[] {
  const trouvees = [
    ...source.matchAll(/\('(WN-CL-\d{4}-\d{3})',\s*'(v?[\d.]+)',\s*'(\w+)',\s*(true|false)\)/g),
  ];
  return trouvees
    .map(m => ({
      cle: `${m[1]}@${m[2]}#${m[3]}`,
      table: m[3],
      exigePrescriptif: m[4] === 'true',
    }))
    .sort((a, b) => a.cle.localeCompare(b.cle));
}

function pairesSql(source: string): string[] {
  return entreesSql(source).map(e => e.cle);
}

// D-046 — une table inconnue n'hérite pas d'un jeu de propriétés par défaut :
// elle doit être arbitrée. Ce banc refuse plutôt que de deviner.
const FICHIER_VERS_TABLE: Record<string, string> = {
  'orientationRulesV1.ts': 'orientation',
  'contradictionsV1.ts': 'contradictions',
};

// L'EXIGENCE EST DÉCLARÉE PAR TABLE, JAMAIS DÉDUITE PAR DÉFAUT — [[D-046]].
//
// Le prédicat SQL lit ce booléen sur chaque ligne au lieu de tester
// `table_signee = 'orientation'`. La différence n'est pas cosmétique : avec un
// test sur le nom, toute table FUTURE — celle des parcours (D-045), qui
// PRESCRIT des explorations — aurait été dispensée de `prescriptif` par le
// simple fait de ne pas s'appeler « orientation ». Fail-open, et silencieux.
// Ici, une table sans booléen déclaré fait rougir ce banc.
const TABLE_EXIGE_PRESCRIPTIF: Record<string, boolean> = {
  // Chaque règle d'orientation SUGGÈRE une exploration : c'est une prescription.
  orientation: true,
  // Une règle de contradiction CONSTATE que deux instruments divergent.
  contradictions: false,
};

interface TableSignee {
  fichier: string;
  claims: string[];
}

// LECTURE DU TEXTE, PAS IMPORT DU MODULE. Importer chaque fichier du répertoire
// pour inspecter ses exports serait plus élégant et strictement pire : le
// voisin `orientationService.ts` instancie un client Prisma AU CHARGEMENT et
// jette sans `DATABASE_URL`. Un banc de cohérence documentaire ne doit dépendre
// ni d'une base ni des effets de bord d'un module tiers ; il lit ce que les
// fichiers DÉCLARENT.
function tablesSignees(): TableSignee[] {
  const fichiers = readdirSync(CLINIQUE).filter(
    f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.d.ts'),
  );
  const trouvees: TableSignee[] = [];
  for (const fichier of fichiers) {
    const source = readFileSync(path.join(CLINIQUE, fichier), 'utf8');
    const blocs = [...source.matchAll(/claimsSource:\s*\[([\s\S]*?)\]/g)];
    if (blocs.length === 0) continue;
    const claims = blocs.flatMap(b =>
      [...b[1].matchAll(/claimId:\s*'([^']+)'\s*,\s*versionClaim:\s*'([^']+)'/g)].map(
        m => `${m[1]}@${m[2]}`,
      ),
    );
    trouvees.push({ fichier, claims: claims.sort() });
  }
  return trouvees;
}

// Le garde de la reconnaissance elle-même : une table qui citerait des claims
// sous un AUTRE nom de champ sortirait du balayage sans que rien ne bronche, et
// ses claims ne seraient gardés par personne.
//
// La condition est « porte une signature ET cite des identifiants de claims »,
// pas « porte une signature ». `corpusSyntheseV1.ts` porte bien un
// `validationExterne`, mais c'est un instantané de PROSE qui n'épingle aucun
// claim : l'exiger dans le contrat n'aurait aucun sens.
function fichiersCitantDesClaimsHorsBalayage(): string[] {
  return readdirSync(CLINIQUE)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.d.ts'))
    .filter(f => {
      const source = readFileSync(path.join(CLINIQUE, f), 'utf8');
      return (
        /validationExterne\s*:/.test(source) &&
        /WN-CL-\d{4}-\d{3}/.test(source) &&
        !/claimsSource\s*:/.test(source)
      );
    });
}

describe('claims épinglés — le contrat couvre TOUTES les tables signées', () => {
  // D-046 — une table de règles cliniques neuve doit être arbitrée avant
  // d'entrer au contrat : le jeu de propriétés qu'on exige de ses claims dépend
  // de ce qu'elle FAIT (prescrire ou constater). L'hériter en silence est
  // exactement ce que ce banc empêche.
  it('chaque table signée a une correspondance arbitrée', () => {
    for (const table of tablesSignees()) {
      expect(Object.keys(FICHIER_VERS_TABLE)).toContain(table.fichier);
    }
  });

  it('la liste du contrat est exactement celle des tables signées', () => {
    const tables = tablesSignees();

    // Anti-vacuité : un balayage qui ne trouve plus rien rendrait ce banc vert
    // en ne comparant que des ensembles vides — le pire des silences ici.
    expect(tables.length).toBeGreaterThan(1);

    const attendus = [
      ...new Set(
        tables.flatMap(t => t.claims.map(c => `${c}#${FICHIER_VERS_TABLE[t.fichier]}`)),
      ),
    ].sort();
    expect(attendus.length).toBeGreaterThanOrEqual(24);

    const auContrat = pairesSql(bloc(lire(CONTRAT), 'PREDICAT_FRAICHEUR_CLAIMS_EPINGLES', CONTRAT));
    expect(auContrat).toEqual(attendus);
  });

  // Le balayage reconnaît une table signée à sa liste `claimsSource`. Une table
  // qui la nommerait autrement serait invisible — et ses claims ne seraient
  // gardés par rien, en silence.
  it('aucune table citant des claims n’échappe au balayage', () => {
    expect(fichiersCitantDesClaimsHorsBalayage()).toEqual([]);
  });

  // LE CŒUR DE D-046. Chaque ligne du contrat porte l'exigence de `prescriptif`
  // qui lui est propre, et cette exigence doit correspondre à un arbitrage
  // déclaré. Une table qui entrerait au contrat sans le sien serait dispensée en
  // silence — le fail-open que D-046 prétend précisément interdire.
  it('chaque ligne du contrat porte l’exigence arbitrée de sa table', () => {
    const entrees = entreesSql(bloc(lire(CONTRAT), 'PREDICAT_FRAICHEUR_CLAIMS_EPINGLES', CONTRAT));
    expect(entrees.length).toBeGreaterThanOrEqual(24);

    const tables = [...new Set(entrees.map(e => e.table))].sort();
    expect(tables).toEqual(Object.keys(TABLE_EXIGE_PRESCRIPTIF).sort());

    for (const entree of entrees) {
      expect(entree.exigePrescriptif).toBe(TABLE_EXIGE_PRESCRIPTIF[entree.table]);
    }
  });

  // La même liste une troisième fois : les fixtures du négatif. Si elles
  // dérivaient, le négatif éprouverait le prédicat sur un décor qui n'est pas
  // celui de la production — et son cas « corpus sain » lèverait pour une raison
  // qui n'est pas la sienne.
  it('les fixtures du fichier négatif portent la même liste', () => {
    const auContrat = pairesSql(bloc(lire(CONTRAT), 'PREDICAT_FRAICHEUR_CLAIMS_EPINGLES', CONTRAT));
    const auxFixtures = pairesSql(bloc(lire(NEGATIF), 'PAIRES_FIXTURES', NEGATIF));
    expect(auxFixtures).toEqual(auContrat);
  });
});

describe('claims épinglés — les deux écritures du prédicat', () => {
  const blocContrat = bloc(lire(CONTRAT), 'PREDICAT_FRAICHEUR_CLAIMS_EPINGLES', CONTRAT);
  const blocNegatif = bloc(lire(NEGATIF), 'PREDICAT_FRAICHEUR_CLAIMS_EPINGLES', NEGATIF);

  it('le contrat et son test négatif portent le MÊME prédicat', () => {
    expect(blocNegatif).toBe(blocContrat);
  });

  // Anti-vacuité : sans ce cas, deux blocs vides seraient « identiques ».
  it('le prédicat contrôle bien les QUATRE propriétés, et la paire', () => {
    expect(blocContrat.length).toBeGreaterThan(500);
    expect(blocContrat).toContain("c.statut IS DISTINCT FROM 'VALIDE'");
    expect(blocContrat).toContain('c.active IS NOT TRUE');
    expect(blocContrat).toContain('c.superseded_at IS NOT NULL');
    // LE QUALIFICATEUR EXACT, pas la sous-chaîne. `toContain('c.prescriptif IS
    // NOT TRUE')` serait satisfait par `e.table_signee = 'aucune' AND
    // c.prescriptif IS NOT TRUE` — c'est-à-dire par un prédicat qui aurait
    // entièrement neutralisé la quatrième propriété.
    expect(blocContrat).toContain('OR (e.exige_prescriptif AND c.prescriptif IS NOT TRUE);');
    // La jointure porte sur la PAIRE : sur `claim_id` seul, une table signée
    // s'appuierait sur une version qu'elle n'a jamais relue.
    expect(blocContrat).toContain('c.version_claim = e.version_claim');
  });
});

describe('claims épinglés — le contrat de production reste en lecture seule', () => {
  const contrat = lire(CONTRAT);

  it('le contrat ouvre bien une transaction en lecture seule', () => {
    expect(contrat).toMatch(/^BEGIN READ ONLY;$/m);
  });

  it('le contrat ne porte aucun verbe d’écriture', () => {
    const sansCommentaires = contrat.replace(/--[^\n]*/g, ' ');
    expect(sansCommentaires).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT)\b/i);
  });
});

describe('claims épinglés — les contrats sont câblés', () => {
  const ci = lire(CI);
  const releaseDb = lire(RELEASE_DB);

  it('le test négatif tourne en CI — c’est lui qui prouve que le contrat mord', () => {
    expect(ci).toContain('prisma/checks/rag_claim_fraicheur_tables_signees_v1_negatif.sql');
  });

  // LE CONTRAT POSITIF NE DOIT PAS TOURNER EN CI, et c'est une propriété, pas un
  // oubli : la base y est vide, les 24 claims y sont absents, il y rougirait à
  // chaque exécution. `wn-test-worktree.sh` dérivant sa liste de ce fichier, l'y
  // câbler casserait aussi T2/T3 — sur une base sans corpus.
  it('le contrat positif ne tourne PAS en CI', () => {
    const positif = [...ci.matchAll(/rag_claim_fraicheur_tables_signees_v1\.sql/g)];
    expect(positif).toHaveLength(0);
  });

  // L'ORDRE, pas la présence. Une étape déplacée APRÈS `migrate deploy`
  // vérifierait la base une fois écrite : le préflight n'aurait plus de sens, et
  // une assertion de présence resterait verte — elle serait même satisfaite par
  // un simple commentaire.
  it('le préflight production passe AVANT migrate deploy', () => {
    const preflight = releaseDb.indexOf(
      'prisma db execute --file prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql',
    );
    const deploy = releaseDb.indexOf('npx prisma migrate deploy');
    expect(preflight).toBeGreaterThan(-1);
    expect(deploy).toBeGreaterThan(-1);
    expect(preflight).toBeLessThan(deploy);
  });

  // LE CAS QUI COMPTE. Le fichier négatif ÉCRIT ses fixtures avant de les
  // annuler. Le câbler dans `release-db.yml` le lancerait contre la production,
  // où le dépôt n'écrit que par migration relue.
  it('le test négatif ne tourne JAMAIS contre la production', () => {
    expect(releaseDb).not.toContain('rag_claim_fraicheur_tables_signees_v1_negatif');
  });

  // D-044 — sans cette ligne, le contrat ne démarrerait jamais seul : le lot ne
  // porte aucune migration, et `paths` ne voyait que `migrations/**`. C'est la
  // répétition du précédent D-015 (rejeu promis, jamais câblé) qui est refusée.
  it('le déclencheur couvre les tables de règles cliniques', () => {
    const paths = releaseDb.slice(releaseDb.indexOf('paths:'), releaseDb.indexOf('workflow_dispatch:'));
    expect(paths).toContain("'web/prisma/migrations/**'");
    expect(paths).toContain("'web/src/lib/clinical/**'");
  });
});
