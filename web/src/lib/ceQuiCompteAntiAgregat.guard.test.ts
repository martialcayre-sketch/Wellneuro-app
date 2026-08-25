import { readFileSync, readdirSync, statSync } from 'fs';
import { extname, join, relative } from 'path';
import { describe, expect, it } from 'vitest';

// Garde structurelle G2 (Alliance 6.0-A, LOT-03) — « ce qui compte pour moi
// aujourd'hui » NE S'AGRÈGE PAS.
//
// Une parole de patient se conserve et se lit. Elle ne se compte pas, ne se
// moyenne pas, ne se note pas, ne se résume pas, et n'alimente aucun moteur
// clinique. C'est l'invariant de campagne « jamais un score » (CAMPAGNE.md
// § Résultat observable), adossé à `DC-19`/`DC-20` — aucun seuil, dose, poids
// ou borne inventé : noter une parole de patient poserait une échelle sans
// provenance. `DC-27` (« association ≠ causalité, score ≠ diagnostic ») ne
// porte PAS cet interdit et ne doit pas être cité pour lui.
//
// Le contrôle ne juge pas le contenu : il vérifie deux choses de FORME, qui
// sont les deux marches vers l'agrégat —
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
  // LOT-06 : la route d'assemblage RELIT les entrées « ce qui compte » pour les
  // rendre au patient. Cette liste est FIGÉE — sans cette ligne, la surface la
  // plus récemment ouverte serait justement celle où l'anti-agrégat ne
  // s'appliquerait pas.
  'app/api/portail/dossier/route.ts',
  // L'ÉCRAN qui rend ces entrées, et pas seulement la route qui les sert : la
  // liste portait déjà les deux surfaces d'affichage des lots précédents, et
  // c'est à l'affichage qu'un décompte se voit.
  'components/patient-companion/DossierDeuxVoixView.tsx',
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
  //
  // LE MOTIF NE NOMME PLUS LA COLLECTION, et c'est la correction d'un trou
  // réel : lié à `entrees`, il laissait passer `{ceQuiCompte.length}` sur
  // l'écran du LOT-06 — la garde tenait par le NOM que l'auteur avait choisi,
  // c'est-à-dire par rien.
  //
  // DEUX EXCEPTIONS, ET ELLES SONT NOMMÉES UNE PAR UNE : `{texte.length}`, le
  // compteur de caractères du champ de saisie (`CeQuiCompteForm`), et
  // `{texteAmendement.length}`, celui de la saisie « le dire autrement »
  // (`DossierDeuxVoixView`, 6.0-B LOT-04). Compter les caractères qu'on est en
  // train de taper est une aide à la saisie, pas une mesure de la parole du
  // patient — et la borne affichée est technique, identifiée comme telle
  // (`DC-20`). Elle est même l'inverse d'une troncature silencieuse : le
  // patient voit qu'il dépasse, rien n'est coupé.
  //
  // NOMMER LES CAS LICITES PLUTÔT QU'ÉNUMÉRER LES CAS INTERDITS garde
  // l'interdit général : une COLLECTION ne peut pas s'y glisser en se
  // renommant, et chaque compteur neuf doit passer par cette liste. Un motif du
  // genre « tout identifiant contenant `texte` » aurait rendu l'exception
  // ouverte à `textesServis.length`.
  {
    motif: /\{\s*(?!(?:texte|texteAmendement)\.length\s*\})[\w.]+\.length\s*\}/,
    nom: 'décompte affiché',
  },
];

/**
 * Modules qui ne doivent JAMAIS consommer les entrées « ce qui compte ».
 *
 * La liste balaie aussi large que l'intitulé du banc le promet : « ni de
 * SYNTHÈSE » ne peut pas s'arrêter à la route `api/praticien/synthese` en
 * laissant dehors le module de synthèse lui-même, ni les surfaces de
 * RESTITUTION qui sont l'endroit où un agrégat se verrait — `documents/`
 * porte `bilanPatient.ts`, la plus exposée d'entre elles.
 *
 * Un chemin peut désigner un DOSSIER ou un FICHIER : voir `fichiersSources`.
 */
const CONSOMMATEURS_INTERDITS = [
  'lib/clinical',
  'lib/clinical-engine',
  'lib/scoring',
  'lib/synthese-praticien.ts',
  'lib/documents',
  'lib/correspondance',
  'lib/equilibre',
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

/**
 * Sources d'un périmètre, qu'il soit un DOSSIER ou un FICHIER unique.
 *
 * Le repli sur le fichier n'est pas un confort : `readdirSync` échoue sur un
 * chemin de fichier (`ENOTDIR`), et sans ce repli `lib/synthese-praticien.ts`
 * rendrait `[]` EN SILENCE — la garde ne scannerait rien, et l'anti-vacuité
 * rougirait pour une raison fausse, ce qui est pire qu'un trou : c'est un trou
 * qui accuse le mauvais coupable.
 */
function fichiersSources(perimetre: string): string[] {
  let entrees;
  try {
    entrees = readdirSync(perimetre, { withFileTypes: true });
  } catch {
    try {
      return statSync(perimetre).isFile() && EXTENSIONS.has(extname(perimetre)) ? [perimetre] : [];
    } catch {
      return [];
    }
  }
  return entrees.flatMap((entree) => {
    const chemin = join(perimetre, entree.name);
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

    expect(
      fautifs,
      `Agrégat sur une parole de patient — invariant « jamais un score » (DC-19/DC-20) :\n${fautifs.join('\n')}`,
    ).toEqual([]);
  });

  it('aucun module clinique, de scoring ou de synthèse n’importe le lot', () => {
    const fautifs: string[] = [];
    const fichiers = CONSOMMATEURS_INTERDITS.flatMap((perimetre) => fichiersSources(join(RACINE, perimetre)));

    for (const chemin of fichiers) {
      const relatif = relative(RACINE, chemin);
      // BALAYAGE SUR LE TEXTE ENTIER, jamais ligne à ligne. Un filtre par
      // ligne (« la ligne contient-elle `import` ? ») rate la forme la plus
      // courante du dépôt — l'import multi-lignes, où le chemin du module vit
      // sur une ligne qui ne porte aucun mot-clef :
      //
      //     import {
      //       EntreeCeQuiCompteExposee,
      //     } from '@/app/api/praticien/ce-qui-compte/route';
      //
      // Les commentaires sont scannés eux aussi, et c'est délibéré : dans un
      // moteur clinique ou une surface de restitution, NOMMER ce lot mérite
      // déjà une lecture humaine. Le message d'échec nomme le fichier, donc
      // l'arbitrage tient en une ligne.
      const source = readFileSync(chemin, 'utf8');
      for (const reference of REFERENCES_AU_LOT) {
        if (source.includes(reference)) fautifs.push(`${relatif} — « ${reference} »`);
      }
    }

    expect(
      fautifs,
      `« Ce qui compte » consommé par un moteur clinique, une synthèse ou une restitution :\n${fautifs.join('\n')}`,
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

    const consommateurs = CONSOMMATEURS_INTERDITS.flatMap((perimetre) =>
      fichiersSources(join(RACINE, perimetre)),
    );
    expect(consommateurs.length, 'les périmètres cliniques doivent être scannés').toBeGreaterThan(0);

    for (const perimetre of CONSOMMATEURS_INTERDITS) {
      expect(
        fichiersSources(join(RACINE, perimetre)).length,
        `${perimetre} doit contenir des sources à scanner (dossier ou fichier)`,
      ).toBeGreaterThan(0);
    }
  });

  it('CONTRÔLE POSITIF : les deux listes de motifs mordent réellement', () => {
    // L'anti-vacuité prouve que les FICHIERS existent. Elle ne prouve pas que
    // les MOTIFS attrapent quoi que ce soit — et c'est l'autre façon dont
    // cette garde peut devenir verte et creuse : renommer `CeQuiComptePanel`
    // laisserait `REFERENCES_AU_LOT` périmée, un moteur clinique pourrait
    // importer le nouveau nom, et les deux `expect([]).toEqual([])`
    // resteraient verts en ne contrôlant plus rien. Une regex mal échappée
    // produirait le même vert silencieux côté `MOTIFS_AGREGAT`.

    // 1 — chaque référence du lot désigne quelque chose qui EXISTE : elle
    //     apparaît dans au moins une surface du lot. Un renommage la rend
    //     orpheline, et ce banc rougit.
    const surfaces = SURFACES_LOT.map((relatif) => readFileSync(join(RACINE, relatif), 'utf8'));
    for (const reference of REFERENCES_AU_LOT) {
      expect(
        surfaces.some((source) => source.includes(reference)),
        `« ${reference} » n’apparaît dans aucune surface du lot : liste périmée, garde creuse`,
      ).toBe(true);
    }

    // 2 — chaque motif d'agrégat attrape son spécimen. Les spécimens sont
    //     écrits ici, jamais lus du dépôt : ils n'ont pas à exister dans le
    //     code pour que la regex soit prouvée vivante.
    const SPECIMENS: Record<string, string> = {
      reduce: 'const total = entrees.reduce((a, b) => a + b, 0);',
      moyenne: 'const moyenne = total / entrees.length;',
      tendance: 'const tendance = comparer(entrees);',
      score: 'const score = noter(entree.texte);',
      niveau: 'const niveau = classer(entree.texte);',
      nombreEntrees: 'return { nombreEntrees: entrees.length };',
      'count Prisma': 'select: { _count: true }',
      'décompte affiché': '<p>{entrees.length}</p>',
    };
    for (const { motif, nom } of MOTIFS_AGREGAT) {
      const specimen = SPECIMENS[nom];
      expect(specimen, `aucun spécimen pour le motif « ${nom} »`).toBeTruthy();
      expect(motif.test(specimen), `le motif « ${nom} » n’attrape plus son spécimen`).toBe(true);
    }

    // 3 — et ils ne mordent pas sur du code anodin : un motif qui attrape tout
    //     ne prouve rien non plus.
    const ANODIN = 'const texte = entree.texte.trim();';
    for (const { motif, nom } of MOTIFS_AGREGAT) {
      expect(motif.test(ANODIN), `le motif « ${nom} » attrape du code anodin`).toBe(false);
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
