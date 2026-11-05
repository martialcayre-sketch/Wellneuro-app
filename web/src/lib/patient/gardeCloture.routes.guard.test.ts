// Banc structurel de la garde de clôture — arbitrage du responsable du
// 2026-11-04, option A : un dossier clos ne recueille plus de réponse, et le
// refus vit dans la ROUTE (#181), pas seulement dans le hub (#1846).
//
// Même forme que `gardeAge.routes.guard.test.ts` : un balayage, pas une liste.
// Toute route d'écriture sous `api/patient` ou `api/portail` est CLASSÉE ici —
// fermée au dossier clos, ou ouverte avec son motif. Une route neuve non
// classée fait rougir le banc, et la classer oblige à se poser la question.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const RACINE_API = path.join(__dirname, '..', '..', 'app', 'api');

/** Routes d'écriture qui refusent `dossier_cloture` sur un dossier clos. */
const FERMEES = [
  // Arbitrage du 2026-11-04, option A : les routes de saisie.
  'patient/submit',
  'portail/agenda-alimentaire',
  'portail/agenda-sommeil',
  'portail/agenda-sommeil/cloture',
  // Même arbitrage : le pack de base est une assignation (D4 de LOT-01 IDP2).
  'portail/valider',
  // Arbitrage du 2026-11-05 : les autres saisies du portail.
  'portail/fiche',
  'portail/ja/observations',
  'portail/protocole/checkin',
  // Refus antérieurs à l'arbitrage.
  'portail/comptes-rendus',
  'portail/date-naissance',
  'portail/documents',
  'portail/physio-traitements',
];

/** Routes de saisie de l'arbitrage, où la clôture doit passer AVANT la garde d'âge. */
const CLOTURE_AVANT_AGE = [
  'patient/submit',
  'portail/agenda-alimentaire',
  'portail/agenda-sommeil',
  'portail/agenda-sommeil/cloture',
  'portail/valider',
];

/** Routes d'écriture ouvertes au dossier clos, chacune avec son motif. */
const OUVERTES: Record<string, string> = {
  'patient/consentement': 'consentement : préalable à la saisie, que la soumission refuse ensuite',
  'portail/ce-qui-compte': 'alliance : la clôture n’est pas un ordre de silence fait au patient',
  'portail/comprehension': 'contestation : la clôture n’est pas un ordre de silence fait au patient',
  'portail/consentement': 'consentement : préalable à la saisie, que la soumission refuse ensuite',
  'portail/deconnexion': 'session, aucune donnée recueillie',
  'portail/document-medecin/telechargement': 'journal de téléchargement d’un document remis : lecture des archives',
  'portail/dossier': 'dossier à deux voix : la clôture n’est pas un ordre de silence fait au patient',
  'portail/lectures': 'accusé de lecture d’un document remis : lecture des archives',
  'portail/lien/demande': 'redemande d’un lien d’accès, envoyable sur un dossier clos (décision du 2026-07-21)',
  'portail/pack-reevaluation': 'réponse à une proposition de réévaluation, n’écrit aucune assignation',
  'portail/session': 'session, aucune donnée recueillie',
  'portail/trust/choix': 'droits et choix du patient, qui survivent à la clôture',
  'portail/trust/lecture': 'accusé de lecture d’un document d’information',
  'portail/trust/signalement': 'signalement d’un effet indésirable, qui survit à la clôture',
};

/** Le source sans ses commentaires : un appel cité en commentaire ne garde rien. */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Méthodes d'écriture exportées, déclarées ou réexportées (`export { handler as POST }`). */
const METHODE_ECRITURE =
  /export\s+(?:async\s+function|const|function)\s+(?:POST|PUT|PATCH|DELETE)\b|export\s*\{[^}]*\b(?:POST|PUT|PATCH|DELETE)\b[^}]*\}/;

/** Le corps d'une branche : le bloc `{…}` équilibré, ou l'instruction seule. */
function corpsDeBranche(code: string, debut: number): string {
  let i = debut;
  while (i < code.length && /\s/.test(code[i])) i += 1;
  if (code[i] !== '{') return code.slice(i, code.indexOf(';', i) + 1);
  let profondeur = 0;
  for (let j = i; j < code.length; j += 1) {
    if (code[j] === '{') profondeur += 1;
    else if (code[j] === '}') {
      profondeur -= 1;
      if (profondeur === 0) return code.slice(i, j + 1);
    }
  }
  return '';
}

/**
 * Position de la première garde de clôture EFFECTIVE, ou -1. Deux formes :
 * `const r = await refusClotureSuiviPour(…)` suivi d'un `if (r)` qui retourne,
 * ou `if (!accepteNouvelEnvoi(…))` qui retourne. Un appel en commentaire, un
 * résultat ignoré ou une branche qui ne fait que journaliser ne comptent pas.
 */
function positionGarde(source: string): number {
  const code = sansCommentaires(source);
  const liaison = code.match(/const\s+(\w+)\s*=\s*(?:await\s+)?refusClotureSuiviPour\(/);
  if (liaison) {
    for (const test of code.matchAll(/if\s*\(\s*(\w+)\s*\)/g)) {
      if (test[1] !== liaison[1]) continue;
      if (/\breturn\b/.test(corpsDeBranche(code, test.index + test[0].length))) return liaison.index!;
    }
  }
  for (const test of code.matchAll(/if\s*\(\s*!\s*accepteNouvelEnvoi\(\s*[\w.]+\s*\)\s*\)/g)) {
    if (/\breturn\b/.test(corpsDeBranche(code, test.index + test[0].length))) return test.index;
  }
  return -1;
}

/** Position de la garde d'âge, ou -1. */
function positionGardeAge(source: string): number {
  return sansCommentaires(source).search(/refusSaisieSante(?:Pour)?\(/);
}

function routesDEcriture(): Map<string, string> {
  const trouvees = new Map<string, string>();
  for (const espace of ['patient', 'portail']) {
    const pile = [path.join(RACINE_API, espace)];
    while (pile.length) {
      const dossier = pile.pop()!;
      for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
        const plein = path.join(dossier, entree.name);
        if (entree.isDirectory()) pile.push(plein);
        else if (entree.name === 'route.ts') {
          const source = fs.readFileSync(plein, 'utf8');
          if (METHODE_ECRITURE.test(sansCommentaires(source))) {
            trouvees.set(path.relative(RACINE_API, path.dirname(plein)).split(path.sep).join('/'), source);
          }
        }
      }
    }
  }
  return trouvees;
}

describe('garde de clôture — routes d’écriture patient (arbitrage du 2026-11-04)', () => {
  const routes = routesDEcriture();

  it('le balayage trouve des routes (sinon le banc ne prouverait rien)', () => {
    expect(routes.size).toBeGreaterThanOrEqual(FERMEES.length + Object.keys(OUVERTES).length);
  });

  it('chaque route d’écriture patient est classée : fermée au dossier clos, ou ouverte avec son motif', () => {
    const nonClassees = [...routes.keys()].filter((r) => !FERMEES.includes(r) && !(r in OUVERTES));
    expect(nonClassees).toEqual([]);
  });

  it('chaque route fermée joue la garde de clôture et en suit le refus', () => {
    const sansGarde = FERMEES.filter((r) => positionGarde(routes.get(r) ?? '') < 0);
    expect(sansGarde).toEqual([]);
  });

  it('sur les routes de saisie, la clôture passe AVANT la garde d’âge', () => {
    const malOrdonnees = CLOTURE_AVANT_AGE.filter((r) => {
      const source = routes.get(r) ?? '';
      const age = positionGardeAge(source);
      return age < 0 || positionGarde(source) < 0 || positionGarde(source) > age;
    });
    expect(malOrdonnees).toEqual([]);
  });

  it('aucune entrée de la classification ne désigne une route disparue', () => {
    const disparues = [...FERMEES, ...Object.keys(OUVERTES)].filter((r) => !routes.has(r));
    expect(disparues).toEqual([]);
  });

  it('le détecteur refuse une garde citée en commentaire, ignorée ou sans retour', () => {
    expect(positionGarde('// const r = await refusClotureSuiviPour(id);\nif (r) return;')).toBe(-1);
    expect(positionGarde('await refusClotureSuiviPour(id);')).toBe(-1);
    expect(positionGarde('const r = await refusClotureSuiviPour(id);')).toBe(-1);
    expect(positionGarde('const r = await refusClotureSuiviPour(id);\nif (r) console.log(r);')).toBe(-1);
    expect(positionGarde('if (!accepteNouvelEnvoi(patient)) logger.warn({});')).toBe(-1);
    expect(positionGarde('const r = await refusClotureSuiviPour(id);\nif (r) return refus;')).toBeGreaterThanOrEqual(0);
    expect(positionGarde('if (!accepteNouvelEnvoi(patient)) {\n  return refus;\n}')).toBeGreaterThanOrEqual(0);
  });

  it('l’ouverture d’un questionnaire refuse aussi, avant la garde d’âge (lecture du formulaire)', () => {
    const source = fs.readFileSync(path.join(RACINE_API, 'patient', 'questionnaire', 'route.ts'), 'utf8');
    expect(positionGarde(source)).toBeGreaterThanOrEqual(0);
    expect(positionGarde(source)).toBeLessThan(positionGardeAge(source));
  });

  it('les lectures restent ouvertes : aucune garde de clôture dans les GET des routes fermées au POST', () => {
    for (const r of ['portail/agenda-alimentaire', 'portail/agenda-sommeil', 'portail/ja/observations', 'portail/protocole/checkin']) {
      const code = sansCommentaires(routes.get(r) ?? '');
      // Du GET à l'export suivant, quel que soit l'ordre des deux méthodes.
      const debut = code.search(/export\s+async\s+function\s+GET\b/);
      expect(debut, r).toBeGreaterThanOrEqual(0);
      const suite = code.slice(debut + 1).search(/\nexport\s/);
      const get = code.slice(debut, suite < 0 ? undefined : debut + 1 + suite);
      expect(get, r).toMatch(/function\s+GET\b/);
      expect(get, r).not.toMatch(/refusClotureSuiviPour|accepteNouvelEnvoi/);
    }
  });
});
