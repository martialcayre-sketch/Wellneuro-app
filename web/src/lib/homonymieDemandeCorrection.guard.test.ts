import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, expect, it } from 'vitest';

// GARDE D'HOMONYMIE — DEUX « DEMANDES DE CORRECTION », ET ELLES NE DOIVENT
// JAMAIS PORTER LE MÊME NOM (`D-170`).
//
// Il en existe deux dans ce dépôt, et elles n'ont NI le même objet, NI le même
// remède, NI la même phase :
//
//   • QUESTIONNAIRE — `Assignation.correctionDemandeeDate` : le patient veut
//     revenir sur ses RÉPONSES. Le praticien règle cela par un DÉBLOCAGE, en
//     phase Patient.
//   • OBJECTIF — `demandes_correction_objectif` (`D-170`) : le patient veut
//     qu'on reprenne le TEXTE de son objectif. Le praticien règle cela par une
//     REFORMULATION, en phase Compréhension.
//
// `D-170` nommait l'homonymie comme une DETTE, réglée par le seul suffixe
// `_objectif` sur la famille neuve, et écrivait : « le jour où l'un des deux
// objets se renomme, la dette se referme ». Le 2026-09-12 a montré que ce
// n'était pas assez, et pourquoi : nommer l'objet du seul côté NEUF laisse
// l'ANCIEN dire « demande de correction » tout court. Or c'est l'ancien qu'un
// praticien lit depuis des mois comme non ambigu — et c'est lui, en
// `prevol.ts`, qui portait le libellé « Demande de correction du patient »
// sous une puce nommant la VOIX (« Patient ») là où toutes ses voisines
// nomment l'OBJET. Un signal lu au mauvais sens envoie le praticien faire le
// mauvais geste dans la mauvaise phase.
//
// CE BANC NE JUGE PAS UN CONTENU, IL GARDE UNE DISTINCTION. Il n'interdit ni
// le mot « correction », ni l'une des deux familles : il exige seulement
// qu'aucune des deux ne se présente sans dire DE QUOI elle parle.
//
// LECTURE DU TEXTE, PAS IMPORT DES MODULES — patron des gardes voisines :
// plusieurs de ces fichiers instancient un client Prisma au chargement.

const RACINE = join(__dirname, '..');
const MOI = 'lib/homonymieDemandeCorrection.guard.test.ts';

/**
 * LA FAMILLE OBJECTIF, et elle seule, a droit au jeton nu
 * `demande_correction` : c'est le nom du geste dans une route dont l'objet
 * unique EST l'objectif. Liste FIGÉE — une surface neuve qui voudrait ce nom
 * doit passer par ici, et c'est le but.
 */
const FAMILLE_OBJECTIF = [
  'app/api/portail/dossier/route.ts',
  'app/api/portail/dossier/route.test.ts',
  'components/patient-companion/DossierDeuxVoixView.tsx',
  'components/patient-companion/DossierDeuxVoixView.test.tsx',
];

/**
 * LES SURFACES PRATICIEN où les deux familles se croisent. Le praticien est le
 * seul à voir les deux : le patient rencontre chacune dans un écran qui ne
 * parle que d'elle. Liste FIGÉE, et son ABSENCE doit rougir (anti-vacuité).
 */
const SURFACES_PRATICIEN = [
  'components/FichePatientPanel.tsx',
  'components/patient-cockpit/ObjectifNegociePanel.tsx',
  'components/copilote/PreVolPanel.tsx',
  'lib/copilote/prevol.ts',
];

/** « demande de correction », « demandent une correction », « demandé une correction »… */
const FORMULE = /demand\w*\s+(?:de|une)\s+correction/gi;

/**
 * CE QUI SUIT LA FORMULE ET LA REND LISIBLE. Chaque motif nomme un OBJET, et
 * jamais une voix : « du patient » ne qualifie rien — les deux viennent du
 * patient.
 */
const QUALIFIANTS: RegExp[] = [
  /^\s*(?:de|d’un|d'un|du|au|des)\s+questionnaires?/i,
  /^\s*de\s+(?:l’|l'|son\s+|ses\s+)?objectifs?/i,
  /^\s*(?:de|des)\s+(?:ses\s+)?réponses/i,
];

/** Retire commentaires de ligne, de bloc et JSX — ils parlent de ce qu'ils gardent. */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
}

function fichiersSources(repertoire: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(repertoire, { withFileTypes: true })) {
    const chemin = join(repertoire, entree.name);
    // `generated/` est écrit par Prisma : il porte le modèle
    // `DemandeCorrectionObjectif`, déjà suffixé, et ne se relit pas à la main.
    if (entree.isDirectory()) {
      if (entree.name === 'generated' || entree.name === 'node_modules') continue;
      trouves.push(...fichiersSources(chemin));
      continue;
    }
    if (/\.tsx?$/.test(entree.name)) trouves.push(chemin);
  }
  return trouves;
}

function lire(relatif: string): string {
  return readFileSync(join(RACINE, relatif), 'utf8');
}

describe('homonymie « demande de correction » — les deux familles ne portent pas le même nom', () => {
  // ── ANTI-VACUITÉ ──────────────────────────────────────────────────────────
  // Sans elles, un renommage de fichier rendrait toute la garde verte et
  // creuse : elle ne trouverait plus rien parce qu'elle ne lirait plus rien.
  it('les fichiers gardés existent, et parlent bien de correction', () => {
    for (const relatif of [...FAMILLE_OBJECTIF, ...SURFACES_PRATICIEN]) {
      expect(() => statSync(join(RACINE, relatif)), `${relatif} a disparu`).not.toThrow();
      expect(/correction/i.test(lire(relatif)), `${relatif} ne parle plus de correction`).toBe(true);
    }
  });

  it('la famille OBJECTIF porte effectivement le jeton nu qu\u2019on lui réserve', () => {
    const porteurs = FAMILLE_OBJECTIF.filter((relatif) => /demande_correction(?!_)/.test(lire(relatif)));
    expect(porteurs.length, 'aucun fichier de la famille objectif ne porte le geste').toBeGreaterThan(0);
  });

  // ── RÈGLE 1 — LE JETON NU EST RÉSERVÉ ─────────────────────────────────────
  it('le jeton nu `demande_correction` n\u2019existe nulle part hors de la famille OBJECTIF', () => {
    const intrus: string[] = [];
    for (const chemin of fichiersSources(RACINE)) {
      const relatif = relative(RACINE, chemin).split('\\').join('/');
      if (relatif === MOI || FAMILLE_OBJECTIF.includes(relatif)) continue;
      if (/demande_correction(?!_)/.test(sansCommentaires(readFileSync(chemin, 'utf8')))) {
        intrus.push(relatif);
      }
    }
    expect(
      intrus,
      `ces fichiers réemploient le nom du geste de l'objectif : ${intrus.join(', ')}`,
    ).toEqual([]);
  });

  // ── RÈGLE 2 — AUCUN LIBELLÉ PRATICIEN NE TAIT SON OBJET ───────────────────
  it('toute « demande de correction » écrite au praticien dit de quoi elle parle', () => {
    const muettes: string[] = [];
    for (const relatif of SURFACES_PRATICIEN) {
      const code = sansCommentaires(lire(relatif));
      for (const trouvee of code.matchAll(FORMULE)) {
        const suite = code.slice(trouvee.index + trouvee[0].length, trouvee.index + trouvee[0].length + 60);
        if (!QUALIFIANTS.some((qualifiant) => qualifiant.test(suite))) {
          muettes.push(`${relatif} : « ${trouvee[0]}${suite.slice(0, 30)} »`);
        }
      }
    }
    expect(muettes, `libellés sans objet :\n${muettes.join('\n')}`).toEqual([]);
  });
});
