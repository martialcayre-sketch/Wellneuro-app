import { readFileSync, readdirSync } from 'fs';
import { extname, join, relative } from 'path';
import { describe, expect, it } from 'vitest';

// Garde structurelle G2 (Alliance 6.0-A, LOT-03) — « ce qui compte pour moi
// aujourd'hui » NE S'AGRÈGE PAS.
//
// Une parole de patient se conserve et se lit. Elle ne se compte pas, ne se
// moyenne pas, ne se note pas, ne se résume pas, et n'alimente aucun moteur
// clinique (`DC-27`). Le contrôle ne juge pas le contenu : il vérifie deux
// choses de FORME, qui sont les deux marches vers l'agrégat —
//
//   1. aucune surface de ce lot ne calcule ni n'affiche d'agrégat ;
//   2. aucun module clinique, de scoring ou de synthèse n'IMPORTE ce lot.
//
// Patron : `meteo-praticien-seul.guard.test.ts`, anti-vacuité comprise — sans
// elle, un renommage de dossier rendrait la garde verte et creuse.

const RACINE = join(__dirname, '..');

/** Les fichiers du lot. Leur ABSENCE doit rougir : voir l'anti-vacuité. */
const SURFACES_LOT = [
  'lib/patient/ceQuiCompte.ts',
  'app/api/portail/ce-qui-compte/route.ts',
  'app/api/praticien/ce-qui-compte/route.ts',
  'components/patient-cockpit/CeQuiComptePanel.tsx',
  'components/patient-companion/CeQuiCompteForm.tsx',
];

/**
 * Motifs d'agrégat. Recherchés sur le code SEUL — les commentaires de ces
 * fichiers parlent précisément de ce qu'ils s'interdisent, et les compter
 * ferait rougir la garde sur sa propre justification.
 */
const MOTIFS_AGREGAT: { motif: RegExp; nom: string }[] = [
  { motif: /\.reduce\s*\(/, nom: 'reduce' },
  { motif: /\bmoyenne\b/i, nom: 'moyenne' },
  { motif: /\btendance\b/i, nom: 'tendance' },
  { motif: /\bscore\b/i, nom: 'score' },
  { motif: /\bniveau\b/i, nom: 'niveau' },
  { motif: /\bnombreEntrees\b/i, nom: 'nombreEntrees' },
  { motif: /\b_count\b|\bcount\s*:/i, nom: 'count Prisma' },
  // Un décompte RENDU à l'écran. `entrees.length === 0` reste licite : c'est
  // la distinction « silence / réponse », pas un agrégat.
  { motif: /\{\s*entrees\.length\s*\}/, nom: 'décompte affiché' },
];

/** Modules qui ne doivent JAMAIS consommer les entrées « ce qui compte ». */
const CONSOMMATEURS_INTERDITS = [
  'lib/clinical',
  'lib/clinical-engine',
  'lib/scoring',
  'app/api/praticien/synthese',
];

const REFERENCES_AU_LOT = [
  'lib/patient/ceQuiCompte',
  'api/portail/ce-qui-compte',
  'api/praticien/ce-qui-compte',
  'CeQuiComptePanel',
  'CeQuiCompteForm',
  'entreeCeQuiCompte',
];

const EXTENSIONS = new Set(['.ts', '.tsx']);

function fichiersSources(dossier: string): string[] {
  let entrees;
  try {
    entrees = readdirSync(dossier, { withFileTypes: true });
  } catch {
    return [];
  }
  return entrees.flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersSources(chemin);
    return EXTENSIONS.has(extname(entree.name)) ? [chemin] : [];
  });
}

/** Retire commentaires de ligne et de bloc — le raisonnement n'est pas du code. */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('« Ce qui compte » — anti-agrégat (LOT-03, structurel)', () => {
  it('aucune surface du lot ne calcule ni n’affiche d’agrégat', () => {
    const fautifs: string[] = [];

    for (const relatif of SURFACES_LOT) {
      const code = sansCommentaires(readFileSync(join(RACINE, relatif), 'utf8'));
      code.split('\n').forEach((ligne, index) => {
        for (const { motif, nom } of MOTIFS_AGREGAT) {
          if (motif.test(ligne)) fautifs.push(`${relatif}:${index + 1} — « ${nom} » : ${ligne.trim()}`);
        }
      });
    }

    expect(fautifs, `Agrégat sur une parole de patient (DC-27) :\n${fautifs.join('\n')}`).toEqual([]);
  });

  it('aucun module clinique, de scoring ou de synthèse n’importe le lot', () => {
    const fautifs: string[] = [];
    const fichiers = CONSOMMATEURS_INTERDITS.flatMap((dossier) => fichiersSources(join(RACINE, dossier)));

    for (const chemin of fichiers) {
      const relatif = relative(RACINE, chemin);
      const source = readFileSync(chemin, 'utf8');
      source.split('\n').forEach((ligne, index) => {
        if (!/\bimport\b|\brequire\(|\bfetch\(|prisma\./.test(ligne)) return;
        for (const reference of REFERENCES_AU_LOT) {
          if (ligne.includes(reference)) fautifs.push(`${relatif}:${index + 1} — « ${reference} »`);
        }
      });
    }

    expect(
      fautifs,
      `« Ce qui compte » consommé par un moteur clinique (DC-27) :\n${fautifs.join('\n')}`,
    ).toEqual([]);
  });

  it('anti-vacuité : les deux périmètres scannés sont non vides', () => {
    // SANS CE BANC, la garde est creuse : un renommage de dossier ferait
    // scanner le vide, et deux `expect([]).toEqual([])` resteraient verts en
    // ne contrôlant plus rien.
    for (const relatif of SURFACES_LOT) {
      const source = readFileSync(join(RACINE, relatif), 'utf8');
      expect(source.length, `${relatif} doit exister et être non vide`).toBeGreaterThan(0);
    }

    const consommateurs = CONSOMMATEURS_INTERDITS.flatMap((dossier) => fichiersSources(join(RACINE, dossier)));
    expect(consommateurs.length, 'les dossiers cliniques doivent être scannés').toBeGreaterThan(0);

    for (const dossier of CONSOMMATEURS_INTERDITS) {
      expect(
        fichiersSources(join(RACINE, dossier)).length,
        `${dossier} doit contenir des sources à scanner`,
      ).toBeGreaterThan(0);
    }
  });

  it('la table n’a aucune surface de correction ni de suppression', () => {
    // `ce_qui_compte_entrees` n'a PAS de colonne `supersedes` (liste blanche
    // du contrat SQL). Aucune route ne doit donc muter une entrée : ni PATCH,
    // ni DELETE, ni update/upsert/delete Prisma.
    for (const relatif of [
      'app/api/portail/ce-qui-compte/route.ts',
      'app/api/praticien/ce-qui-compte/route.ts',
    ]) {
      const code = sansCommentaires(readFileSync(join(RACINE, relatif), 'utf8'));
      expect(code, `${relatif} ne doit exporter ni PATCH ni DELETE`).not.toMatch(
        /export\s+(async\s+)?function\s+(PATCH|DELETE|PUT)\b/,
      );
      expect(code, `${relatif} ne doit muter aucune entrée`).not.toMatch(
        /entreeCeQuiCompte\.(update|upsert|delete|deleteMany)\b/,
      );
      expect(code, `${relatif} ne doit pas référencer supersedes`).not.toMatch(/supersedes/i);
    }
  });

  it('l’écriture ne transmet jamais creeLe — la base pose le présent', () => {
    // Contrôle porté sur le SEUL littéral `data:` du `create`, et pas sur tout
    // le fichier : `creeLe` y est parfaitement légitime au `select` et dans la
    // réponse exposée. C'est sa présence dans les données ÉCRITES qui rendrait
    // un dépôt antidatable.
    const code = sansCommentaires(
      readFileSync(join(RACINE, 'app/api/portail/ce-qui-compte/route.ts'), 'utf8'),
    );
    const create = /entreeCeQuiCompte\.create\(\{([\s\S]*?)select\s*:/.exec(code);
    expect(create, 'le `create` du dépôt doit rester repérable dans la route').not.toBeNull();
    expect(create?.[1], 'creeLe ne doit pas figurer dans le `data` du create').not.toMatch(/creeLe/);
    // Et l'identifiant écrit vient bien de la session, jamais du corps.
    expect(create?.[1], 'idPatient doit venir de la session').toMatch(/idPatient\s*:\s*patient\.idPatient/);
    expect(create?.[1], 'aucun idPatient issu du corps').not.toMatch(/corps\.idPatient|body\.idPatient/);
  });
});
