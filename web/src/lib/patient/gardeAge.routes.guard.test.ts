// Banc structurel de la pause d'âge (D-284 §3, lot (h)) — reste t02 du plan.
//
// Ce que ce banc protège : une route d'écriture patient neuve qui recueille une
// donnée de santé sans passer par la garde d'âge. La pause porte sur les
// questionnaires (agendas compris) et la biologie, côté patient seulement ; le
// reste du portail reste ouvert (arbitrage du responsable du 2026-10-14).
//
// Le balayage est écrit en balayage, et non en liste : toute route d'écriture
// sous `api/patient` ou `api/portail` doit être CLASSÉE ici — gardée, ou ouverte
// avec son motif. Une route neuve non classée fait rougir le banc, et la classer
// oblige à se poser la question.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const RACINE_API = path.join(__dirname, '..', '..', 'app', 'api');

/** Routes d'écriture qui recueillent un questionnaire, un agenda, de la biologie ou un document de santé. */
const GARDEES = [
  'patient/submit',
  'portail/agenda-alimentaire',
  'portail/agenda-sommeil',
  'portail/agenda-sommeil/cloture',
  'portail/comptes-rendus',
  // Dépôt d'un document par le patient : garde d'âge fermée (D-330).
  'portail/documents',
  // Sexe déclaré, statut menstruel et traitements en cours (D-335 §6).
  'portail/physio-traitements',
  'portail/valider',
];

/** Routes d'écriture hors du périmètre de la pause, chacune avec son motif. */
const OUVERTES: Record<string, string> = {
  'patient/consentement': 'consentement : préalable à la saisie, refusée ensuite par la soumission',
  'portail/ce-qui-compte': 'alliance, ouverte par l’arbitrage du 2026-10-14',
  'portail/comprehension': 'alliance, ouverte par l’arbitrage du 2026-10-14',
  'portail/consentement': 'consentement : préalable à la saisie, refusée ensuite par la soumission',
  'portail/date-naissance': 'c’est la route qui lève la pause',
  'portail/deconnexion': 'session, aucune donnée de santé',
  'portail/document-medecin/telechargement': 'journal de téléchargement d’un document remis',
  'portail/dossier': 'alliance, ouverte par l’arbitrage du 2026-10-14',
  'portail/fiche': 'fiche signalétique, ouverte par l’arbitrage du 2026-10-14',
  'portail/ja/observations': 'carnet du protocole, ouvert par l’arbitrage du 2026-10-14',
  'portail/lectures': 'accusé de lecture d’un document remis',
  'portail/lien/demande': 'redemande d’un lien d’accès',
  'portail/pack-reevaluation': 'réponse à une proposition de réévaluation, n’écrit aucune assignation',
  'portail/protocole/checkin': 'protocole, ouvert par l’arbitrage du 2026-10-14',
  'portail/session': 'session, aucune donnée de santé',
  'portail/trust/choix': 'droits et choix, ouverts par l’arbitrage du 2026-10-14',
  'portail/trust/lecture': 'accusé de lecture d’un document d’information',
  'portail/trust/signalement': 'signalement, ouvert par l’arbitrage du 2026-10-14',
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
 * La garde est-elle EFFECTIVE ? Son résultat doit être lié à un nom, ce nom
 * tester une branche, et cette branche RETOURNER — sans quoi la route poursuit
 * l'écriture. Un appel en commentaire, un résultat ignoré ou une branche qui ne
 * fait que journaliser ne comptent pas.
 */
function gardeEffective(source: string): boolean {
  const code = sansCommentaires(source);
  const liaison = code.match(/const\s+(\w+)\s*=\s*(?:await\s+)?refusSaisieSante(?:Pour)?\(/);
  if (!liaison) return false;
  for (const test of code.matchAll(/if\s*\(\s*(\w+)\s*\)/g)) {
    if (test[1] !== liaison[1]) continue;
    if (/\breturn\b/.test(corpsDeBranche(code, test.index + test[0].length))) return true;
  }
  return false;
}

/** Nombre de méthodes d'écriture exportées par un fichier de route. */
function methodesDEcriture(source: string): number {
  const code = sansCommentaires(source);
  const declarees = code.match(/export\s+(?:async\s+function|const|function)\s+(?:POST|PUT|PATCH|DELETE)\b/g) ?? [];
  const reexportees = [...code.matchAll(/export\s*\{([^}]*)\}/g)]
    .flatMap((m) => m[1].match(/\b(?:POST|PUT|PATCH|DELETE)\b/g) ?? []);
  return declarees.length + reexportees.length;
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

describe('pause d’âge — routes d’écriture patient (D-284 §3)', () => {
  const routes = routesDEcriture();

  it('le balayage trouve des routes (sinon le banc ne prouverait rien)', () => {
    expect(routes.size).toBeGreaterThanOrEqual(GARDEES.length + Object.keys(OUVERTES).length);
  });

  it('chaque route d’écriture patient est classée : gardée, ou ouverte avec son motif', () => {
    const nonClassees = [...routes.keys()].filter((r) => !GARDEES.includes(r) && !(r in OUVERTES));
    expect(nonClassees).toEqual([]);
  });

  it('chaque route gardée joue la garde d’âge et en suit le refus', () => {
    const sansGarde = GARDEES.filter((r) => !gardeEffective(routes.get(r) ?? ''));
    expect(sansGarde).toEqual([]);
  });

  it('chaque route gardée n’exporte qu’UNE méthode d’écriture : la garde lue est la sienne', () => {
    // La garde se juge sur le fichier entier. Une seconde méthode d'écriture
    // dans une route gardée pourrait s'en passer sans faire rougir le banc :
    // elle le fait rougir ici, et oblige à la classer (revue CodeRabbit).
    const plusieurs = GARDEES.filter((r) => methodesDEcriture(routes.get(r) ?? '') !== 1);
    expect(plusieurs).toEqual([]);
  });

  it('le compteur voit deux méthodes d’écriture, déclarées ou réexportées', () => {
    expect(methodesDEcriture('export async function POST() {}\nexport async function DELETE() {}')).toBe(2);
    expect(methodesDEcriture('export async function POST() {}\nexport { supprimer as DELETE };')).toBe(2);
    expect(methodesDEcriture('export async function GET() {}\nexport async function POST() {}')).toBe(1);
  });

  it('le détecteur refuse une garde citée en commentaire ou dont le résultat est ignoré', () => {
    expect(gardeEffective('// const r = await refusSaisieSantePour(id);\nif (r) return;')).toBe(false);
    expect(gardeEffective('await refusSaisieSantePour(id);')).toBe(false);
    expect(gardeEffective('const r = await refusSaisieSantePour(id);')).toBe(false);
    expect(gardeEffective('const r = await refusSaisieSantePour(id);\nif (r) return refus;')).toBe(true);
    // Branche qui ne retourne pas : la route poursuivrait l'écriture.
    expect(gardeEffective('const r = await refusSaisieSantePour(id);\nif (r) console.log(r);\nawait ecrire();')).toBe(false);
    expect(gardeEffective('const r = await refusSaisieSantePour(id);\nif (r) { logger.warn({ a: 1 }); }\nawait ecrire();')).toBe(false);
    expect(gardeEffective('const r = await refusSaisieSantePour(id);\nif (r) {\n  logger.warn({ a: 1 });\n  return json(r);\n}')).toBe(true);
  });

  it('le balayage voit une méthode réexportée', () => {
    expect(METHODE_ECRITURE.test('const handler = () => {};\nexport { handler as POST };')).toBe(true);
    expect(METHODE_ECRITURE.test('export async function GET() {}')).toBe(false);
  });

  it('aucune entrée de la classification ne désigne une route disparue', () => {
    const disparues = [...GARDEES, ...Object.keys(OUVERTES)].filter((r) => !routes.has(r));
    expect(disparues).toEqual([]);
  });

  it('l’ouverture d’un questionnaire refuse aussi sous la pause (lecture du formulaire)', () => {
    const source = fs.readFileSync(path.join(RACINE_API, 'patient', 'questionnaire', 'route.ts'), 'utf8');
    expect(gardeEffective(source)).toBe(true);
  });
});
