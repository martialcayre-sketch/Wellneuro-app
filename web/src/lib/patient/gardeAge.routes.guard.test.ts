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

/** Routes d'écriture qui recueillent un questionnaire, un agenda ou de la biologie. */
const GARDEES = [
  'patient/submit',
  'portail/agenda-alimentaire',
  'portail/agenda-sommeil',
  'portail/agenda-sommeil/cloture',
  'portail/comptes-rendus',
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
          if (/export\s+(?:async\s+function|const)\s+(?:POST|PUT|PATCH|DELETE)\b/.test(source)) {
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

  it('chaque route gardée appelle la garde d’âge', () => {
    const sansGarde = GARDEES.filter((r) => !/refusSaisieSante(?:Pour)?\(/.test(routes.get(r) ?? ''));
    expect(sansGarde).toEqual([]);
  });

  it('aucune entrée de la classification ne désigne une route disparue', () => {
    const disparues = [...GARDEES, ...Object.keys(OUVERTES)].filter((r) => !routes.has(r));
    expect(disparues).toEqual([]);
  });

  it('l’ouverture d’un questionnaire refuse aussi sous la pause (lecture du formulaire)', () => {
    const source = fs.readFileSync(path.join(RACINE_API, 'patient', 'questionnaire', 'route.ts'), 'utf8');
    expect(source).toMatch(/refusSaisieSantePour\(/);
  });
});
