import { describe, expect, it } from 'vitest';
import { ENTREES_AUTRES_ESPACES, type CleEntree } from '@/components/patient/autres-espaces/entreesAutresEspaces';
import { elementActif } from './activationMenu';
import { segmentDeSession } from './MenuMonEspace';
import { DESCRIPTION_MENU, LIBELLE_BOUTON_MENU, LIEN_EVITEMENT, TITRE_MENU } from './textesMenu';

// [[D-423]] §4, appliquée dans le menu par [[D-442]] §3.

const servies = (...cles: CleEntree[]) => ENTREES_AUTRES_ESPACES.filter(entree => cles.includes(entree.cle));
const TOUTES_SAUF_BIBLIOTHEQUE = servies(
  'suivi', 'carnet', 'bilan', 'fiches', 'courrierMedecin', 'courrierComplement', 'pourVotreMedecin',
  'renseignements', 'compteRendu', 'depot', 'dossier', 'echanges',
);

describe('menu « Mon espace » — élément actif par chemin', () => {
  const cas: [string, string | null, ReturnType<typeof elementActif>][] = [
    ['hub', 'questionnaires', 'parcours'],
    ['questionnaire en cours', 'questionnaires', 'parcours'],
    ['protocole', 'protocole', 'parcours'],
    ['rendez-vous de suivi', 'suivi', 'suivi'],
    ['carnet', 'alimentation', 'carnet'],
    ['bilan', 'bilan', 'bilan'],
    ['fiches remises', 'fiches', 'fiches'],
    ['dossier à deux voix', 'dossier', 'dossier'],
    ['ce qui compte', 'ce-qui-compte', 'dossier'],
    ['compréhension', 'comprehension', 'dossier'],
    ['compte rendu', 'comptes-rendus', 'compteRendu'],
    ['dépôt', 'documents', 'depot'],
    ['échanges', 'echanges', 'echanges'],
    ['informations', 'informations', null],
    ['conditions', 'conditions', null],
    ['écrans d’entrée', null, null],
  ];
  for (const [nom, segment, attendu] of cas) {
    it(`${nom} : ${String(attendu)}`, () => {
      expect(elementActif(segment, TOUTES_SAUF_BIBLIOTHEQUE)).toBe(attendu);
    });
  }

  it('`/fiches` et `/fiches/<id>` allument l’entrée servie : la bibliothèque quand elle remplace les fiches', () => {
    expect(segmentDeSession('/portail/T/fiches', 'T')).toBe('fiches');
    expect(segmentDeSession('/portail/T/fiches/REM_1', 'T')).toBe('fiches');
    expect(elementActif('fiches', servies('bibliotheque', 'suivi'))).toBe('bibliotheque');
    expect(elementActif('bibliotheque', servies('bibliotheque'))).toBe('bibliotheque');
    expect(elementActif('fiches', servies('suivi'))).toBeNull();
  });

  it('une page atteinte par son adresse, entrée fermée : rien n’est allumé', () => {
    expect(elementActif('echanges', servies('suivi', 'carnet'))).toBeNull();
    expect(elementActif('dossier', servies('suivi'))).toBeNull();
  });

  it('segment de session : jamais un préfixe, jamais sans jeton', () => {
    expect(segmentDeSession('/portail/T', 'T')).toBeNull();
    expect(segmentDeSession('/portail/T/', 'T')).toBeNull();
    expect(segmentDeSession('/portail/TX/suivi', 'T')).toBeNull();
    expect(segmentDeSession('/portail/connexion', null)).toBeNull();
    expect(segmentDeSession('/portail/T/questionnaires/ASS_1', 'T')).toBe('questionnaires');
  });
});

describe('textes du menu, acceptés mot pour mot ([[D-442]])', () => {
  it('tels qu’acceptés, sans chiffre', () => {
    expect([LIBELLE_BOUTON_MENU, TITRE_MENU, DESCRIPTION_MENU, LIEN_EVITEMENT]).toEqual([
      'Menu',
      'Mon espace',
      'Les pages de votre espace.',
      'Aller au contenu',
    ]);
    for (const texte of [LIBELLE_BOUTON_MENU, TITRE_MENU, DESCRIPTION_MENU, LIEN_EVITEMENT]) {
      expect(texte).not.toMatch(/\d/);
    }
  });
});
