import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : CE QUE LES JOURNAUX DU CHANTIER RECOPIENT D'UNE ERREUR ([[D-251]] §4,
// contre-revue adverse du 2026-09-29, P1-1).
//
// Le message d'une erreur Prisma peut recopier les arguments de l'appel : le
// texte d'une version de fiche, un identifiant de dossier, le payload d'un
// protocole. Les routes des fiches ne journalisaient déjà que la classe et le
// code — sauf six appels, que la contre-revue a trouvés et que ce banc
// empêche de revenir. Dans un `console.*` de ces fichiers, un argument ne peut
// pas être :
//   — le paramètre d'un `catch`, passé nu (l'objet porte son message) ;
//   — un `.message` ou un `.stack` ;
//   — un `String(…)` du paramètre d'un `catch`.
// `logger.*` n'est pas visé : il passe l'erreur par `sanitizeError`.

const RACINE = path.join(process.cwd(), 'src');
const PERIMETRE = [
  'lib/fiches-assiette',
  'app/api/praticien/fiches-assiette',
  'app/api/internal/fiches-assiette',
  'app/api/portail/fiches-assiette',
  'app/api/portail/lectures',
  'app/api/praticien/protocoles/diffusion',
  'components/fiches-assiette',
  'components/patient/fiches-assiette',
  'app/portail/[token]/fiches',
];

function fichiersSources(depart: string): string[] {
  if (!existsSync(depart)) return [];
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) trouves.push(...fichiersSources(complet));
    else if (/\.tsx?$/.test(entree) && !/\.test\.tsx?$/.test(entree)) trouves.push(complet);
  }
  return trouves;
}

/** Les arguments d'un appel dont `source[debut]` suit la parenthèse ouvrante. */
function argumentsDeLAppel(source: string, debut: number): string[] {
  const args: string[] = [];
  let profondeur = 0;
  let courant = '';
  for (let i = debut; i < source.length; i++) {
    const c = source[i];
    if (c === '\'' || c === '"' || c === '`') {
      const fin = source.indexOf(c, i + 1);
      courant += source.slice(i, fin + 1);
      i = fin;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') profondeur++;
    if (c === ')' || c === ']' || c === '}') {
      if (profondeur === 0) {
        args.push(courant.trim());
        return args.filter(Boolean);
      }
      profondeur--;
    }
    if (c === ',' && profondeur === 0) {
      args.push(courant.trim());
      courant = '';
      continue;
    }
    courant += c;
  }
  throw new Error('appel non refermé');
}

type Appel = { fichier: string; ligne: number; args: string[]; erreurs: string[] };

function appelsConsole(): Appel[] {
  const appels: Appel[] = [];
  for (const fichier of PERIMETRE.flatMap(dossier => fichiersSources(path.join(RACINE, dossier)))) {
    const source = readFileSync(fichier, 'utf8');
    const erreurs = [...source.matchAll(/catch\s*\(\s*([A-Za-z_$][\w$]*)/g)].map(m => m[1]);
    for (const m of source.matchAll(/console\.(?:error|warn|log|info|debug)\s*\(/g)) {
      appels.push({
        fichier: path.relative(RACINE, fichier),
        ligne: source.slice(0, m.index).split('\n').length,
        args: argumentsDeLAppel(source, (m.index ?? 0) + m[0].length),
        erreurs,
      });
    }
  }
  return appels;
}

function argumentFautif(arg: string, erreurs: string[]): boolean {
  if (/\.(?:message|stack)\b/.test(arg)) return true;
  if (erreurs.includes(arg)) return true;
  return erreurs.some(e => new RegExp(`^String\\(\\s*${e}\\s*\\)$`).test(arg));
}

describe('Journaux des fiches d’assiette — classe et code, jamais le message (D-251, P1-1)', () => {
  const appels = appelsConsole();

  it('le banc lit bien les journaux du chantier (il n’est pas vide)', () => {
    expect(appels.length).toBeGreaterThanOrEqual(10);
    expect(appels.some(a => a.fichier.includes(path.join('protocoles', 'diffusion')))).toBe(true);
    expect(appels.some(a => a.fichier.includes(path.join('internal', 'fiches-assiette')))).toBe(true);
  });

  it('aucun console.* ne recopie le message, la pile ou l’objet d’une erreur', () => {
    const fautifs = appels
      .filter(a => a.args.some(arg => argumentFautif(arg, a.erreurs)))
      .map(a => `${a.fichier}:${a.ligne} — ${a.args.join(' | ')}`);
    expect(fautifs).toEqual([]);
  });

  it('le détecteur mord : il refuse les formes que la contre-revue a trouvées, et laisse passer classe et code', () => {
    const erreurs = ['err', 'erreur', 'error'];
    expect(argumentFautif('err instanceof Error ? err.message : String(err)', erreurs)).toBe(true);
    expect(argumentFautif('erreur instanceof Error ? erreur.message : String(erreur)', erreurs)).toBe(true);
    expect(argumentFautif('error', erreurs)).toBe(true);
    expect(argumentFautif('String(err)', erreurs)).toBe(true);
    expect(argumentFautif('err.stack', erreurs)).toBe(true);
    expect(argumentFautif('...classeEtCode(err)', erreurs)).toBe(false);
    expect(argumentFautif('err instanceof Error ? err.name : typeof err', erreurs)).toBe(false);
    expect(argumentFautif('code', erreurs)).toBe(false);
  });
});
