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

// Les paires d'un bloc SQL, sous leur forme `('WN-CL-0000-000', 'v1.0')`.
function pairesSql(source: string): string[] {
  const trouvees = [...source.matchAll(/\('(WN-CL-\d{4}-\d{3})',\s*'(v?[\d.]+)'\)/g)];
  return trouvees.map(m => `${m[1]}@${m[2]}`).sort();
}

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
  it('la liste du contrat est exactement celle des tables signées', () => {
    const tables = tablesSignees();

    // Anti-vacuité : un balayage qui ne trouve plus rien rendrait ce banc vert
    // en ne comparant que des ensembles vides — le pire des silences ici.
    expect(tables.length).toBeGreaterThan(0);

    const attendus = [...new Set(tables.flatMap(t => t.claims))].sort();
    expect(attendus.length).toBeGreaterThanOrEqual(23);

    const auContrat = pairesSql(bloc(lire(CONTRAT), 'PREDICAT_FRAICHEUR_CLAIMS_EPINGLES', CONTRAT));
    expect(auContrat).toEqual(attendus);
  });

  // Le balayage reconnaît une table signée à sa liste `claimsSource`. Une table
  // qui la nommerait autrement serait invisible — et ses claims ne seraient
  // gardés par rien, en silence.
  it('aucune table citant des claims n’échappe au balayage', () => {
    expect(fichiersCitantDesClaimsHorsBalayage()).toEqual([]);
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
    expect(blocContrat).toContain('c.prescriptif IS NOT TRUE');
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
  // oubli : la base y est vide, les 23 claims y sont absents, il y rougirait à
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
