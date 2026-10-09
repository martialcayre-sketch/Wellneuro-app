import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { ANAMNESE_SECTIONS } from '@/lib/consultation/anamnese';
import { NUMEROS_URGENCE_FR } from '@/lib/trust/gouvernance';
import {
  ENCART_URGENCE,
  QUESTION_SUICIDE_PAR_QUESTIONNAIRE,
  SECTION_ANAMNESE_SIGNAUX,
  afficheEncartUrgence,
} from './urgenceSuicide';

// LA GARDE DE L'ENCART ([[D-275]]). L'encart s'affiche par liste : un
// questionnaire qui poserait une question sur le suicide sans y figurer serait
// servi SANS numéro d'urgence, et rien ne le dirait. Ce banc rougit alors.

type Question = { id: string; texte?: string; options?: { l?: string }[] };
const LEXIQUE = /suicid|me tuer|auto-agression|pensées? de mort|idées? de mort|penser? à mourir|pensé à mourir|me faire du mal/i;

function questionsDe(def: { sections?: { questions?: Question[] }[] }): Question[] {
  return (def.sections ?? []).flatMap(s => s.questions ?? []);
}
function texteComplet(q: Question): string {
  return [q.texte ?? '', ...(q.options ?? []).map(o => o.l ?? '')].join(' ');
}

describe('encart d’urgence — la liste des questionnaires ([[D-275]])', () => {
  it('chaque question listée existe et porte bien sur le suicide', () => {
    for (const [idQ, idQuestion] of Object.entries(QUESTION_SUICIDE_PAR_QUESTIONNAIRE)) {
      const def = (QUESTIONNAIRE_CATALOGUE as Record<string, { sections?: { questions?: Question[] }[] }>)[idQ];
      expect(def, idQ).toBeDefined();
      const question = questionsDe(def).find(q => q.id === idQuestion);
      expect(question, `${idQ}.${idQuestion}`).toBeDefined();
      expect(texteComplet(question!), `${idQ}.${idQuestion}`).toMatch(LEXIQUE);
    }
  });

  it('AUCUN questionnaire du catalogue ne pose une question sur le suicide sans afficher l’encart', () => {
    const oublies: string[] = [];
    for (const [idQ, def] of Object.entries(QUESTIONNAIRE_CATALOGUE as Record<string, { sections?: { questions?: Question[] }[] }>)) {
      for (const q of questionsDe(def)) {
        if (LEXIQUE.test(texteComplet(q)) && !afficheEncartUrgence(idQ)) oublies.push(`${idQ}.${q.id}`);
      }
    }
    expect(oublies).toEqual([]);
  });

  it('la section de l’anamnèse qui affiche l’encart est celle où l’on coche « Idées noires ou suicidaires »', () => {
    const section = ANAMNESE_SECTIONS.find(s => s.id === SECTION_ANAMNESE_SIGNAUX);
    expect(section).toBeDefined();
    const options = (section!.champs ?? []).flatMap(c => ('options' in c && Array.isArray(c.options) ? c.options : []));
    expect(options).toContain('Idées noires ou suicidaires');
  });

  it('n’affiche pas l’encart ailleurs', () => {
    expect(afficheEncartUrgence('Q_STR_04')).toBe(false);
    expect(afficheEncartUrgence(undefined)).toBe(false);
    expect(afficheEncartUrgence('toString')).toBe(false);
  });

  it('les numéros et leurs libellés sont ceux de la gouvernance publiée', () => {
    const publies = new Map(NUMEROS_URGENCE_FR.map(n => [n.numero, n.libelle.toLowerCase()]));
    for (const { numero, libelle } of ENCART_URGENCE.numeros) {
      expect(publies.has(numero), numero).toBe(true);
      // Le libellé publié peut être plus long (« … personnes sourdes … ») ;
      // l'encart en reprend le début, jamais un texte différent.
      expect(publies.get(numero)!.replace(' — ', ', ').startsWith(libelle.toLowerCase().replace(' — ', ', ')), numero).toBe(true);
    }
  });
});
