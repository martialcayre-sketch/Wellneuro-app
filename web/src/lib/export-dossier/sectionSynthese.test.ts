import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateSyntheseSchema } from '@/lib/anthropic';
import { MODELE_REDACTION_PRATICIEN } from '@/lib/synthese-praticien';
import { dateFr, dateHeureFr, NON_RENSEIGNE, type BlocExport, type SyntheseExport } from './modele';
import { sectionSynthese } from './sectionSynthese';

const GENEREE = new Date('2026-09-12T08:30:00Z');
const VALIDEE = new Date('2026-09-14T16:05:00Z');
const BROUILLON = new Date('2026-09-20T09:00:00Z');

const ABSENT = 'Absent de cette synthèse.';
const LISTE_VIDE = 'Aucun élément dans cette synthèse.';

function jsonComplet(): Record<string, unknown> {
  return {
    resume_praticien: 'Profil évoquant un sommeil fragmenté, à confirmer en entretien.',
    axes_prioritaires: [
      {
        axe: 'Sommeil',
        niveau_priorite: 'eleve',
        arguments: ['Score PSQI élevé', 'Réveils nocturnes déclarés'],
        points_a_confirmer: ['Horaires de coucher en semaine'],
      },
      {
        axe: 'Digestion',
        niveau_priorite: 'modere',
        arguments: ['Inconfort post-prandial'],
        points_a_confirmer: ['Fréquence des épisodes'],
      },
    ],
    points_de_vigilance: ['Fatigue persistante déclarée'],
    questions_entretien: ['Depuis quand les réveils sont-ils apparus ?'],
    narratif_patient: 'Vos réponses suggèrent que votre sommeil mérite une attention particulière.',
    limites: 'Synthèse fondée sur des questionnaires déclaratifs.',
  };
}

function synthese(partiel: Partial<SyntheseExport> = {}): SyntheseExport {
  return {
    idSynthese: 'SYN000001',
    statut: 'Validee_Praticien',
    dateGeneration: GENEREE,
    dateValidation: VALIDEE,
    modele: 'claude-sonnet-4-6',
    syntheseJson: jsonComplet(),
    notesPraticien: null,
    avertissementMesureRetiree: null,
    ...partiel,
  };
}

function texte(bloc: BlocExport): string {
  switch (bloc.type) {
    case 'titre':
    case 'paragraphe':
      return bloc.texte;
    case 'champ':
      return `${bloc.libelle} : ${bloc.valeur}`;
    case 'liste':
      return bloc.elements.join('\n');
    case 'espace':
      return '';
  }
}

function tout(blocs: BlocExport[]): string {
  return blocs.map(texte).join('\n');
}

function champ(blocs: BlocExport[], libelle: string): string | undefined {
  const trouve = blocs.find((b) => b.type === 'champ' && b.libelle === libelle);
  return trouve?.type === 'champ' ? trouve.valeur : undefined;
}

/** Les blocs placés sous un titre de niveau 2, jusqu'au titre de niveau 2 suivant. */
function sousTitre(blocs: BlocExport[], titre: string): BlocExport[] {
  const debut = blocs.findIndex((b) => b.type === 'titre' && b.niveau === 2 && b.texte === titre);
  expect(debut, `titre « ${titre} » introuvable`).toBeGreaterThanOrEqual(0);
  const suite = blocs.slice(debut + 1);
  const fin = suite.findIndex((b) => b.type === 'titre' && b.niveau <= 2);
  return fin < 0 ? suite : suite.slice(0, fin);
}

function titres(blocs: BlocExport[], niveau: 1 | 2 | 3): string[] {
  return blocs.flatMap((b) => (b.type === 'titre' && b.niveau === niveau ? [b.texte] : []));
}

describe('sectionSynthese — synthèse complète', () => {
  const blocs = sectionSynthese(synthese({ notesPraticien: 'Revoir le sommeil en priorité.' }), null);

  it('ouvre sur le titre de section puis les métadonnées', () => {
    expect(blocs[0]).toEqual({ type: 'titre', niveau: 1, texte: '4. Dernière synthèse validée' });
    expect(champ(blocs, 'Statut')).toBe('Validée');
    expect(champ(blocs, 'Générée le')).toBe(dateHeureFr(GENEREE));
    expect(champ(blocs, 'Validée le')).toBe(dateHeureFr(VALIDEE));
    expect(champ(blocs, 'Générée le')).toBe('12/09/2026 à 10:30');
  });

  it("suit l'ordre de l'écran praticien", () => {
    expect(titres(blocs, 2)).toEqual([
      'Résumé praticien',
      'Axes prioritaires',
      'Points de vigilance',
      'Questions pour la consultation',
      'Texte destiné au patient',
      'Note du praticien',
      'Limites',
    ]);
    expect(titres(blocs, 3)).toEqual(['Axe 1 — Sommeil', 'Axe 2 — Digestion']);
  });

  it('restitue chaque champ, les textes de la synthèse sans guillemets', () => {
    expect(sousTitre(blocs, 'Résumé praticien')).toEqual([
      { type: 'paragraphe', texte: 'Profil évoquant un sommeil fragmenté, à confirmer en entretien.' },
    ]);
    expect(sousTitre(blocs, 'Points de vigilance')).toEqual([
      { type: 'liste', elements: ['Fatigue persistante déclarée'] },
    ]);
    expect(sousTitre(blocs, 'Questions pour la consultation')).toEqual([
      { type: 'liste', elements: ['Depuis quand les réveils sont-ils apparus ?'] },
    ]);
    expect(sousTitre(blocs, 'Texte destiné au patient')).toEqual([
      { type: 'paragraphe', texte: 'Vos réponses suggèrent que votre sommeil mérite une attention particulière.' },
    ]);
    expect(sousTitre(blocs, 'Note du praticien')).toEqual([
      { type: 'paragraphe', texte: '« Revoir le sommeil en priorité. »' },
    ]);
    expect(sousTitre(blocs, 'Limites')).toEqual([
      { type: 'paragraphe', texte: 'Synthèse fondée sur des questionnaires déclaratifs.', ton: 'discret' },
    ]);
  });

  it('détaille chaque axe : priorité, arguments, points à confirmer', () => {
    expect(sousTitre(blocs, 'Axes prioritaires')).toEqual([
      { type: 'titre', niveau: 3, texte: 'Axe 1 — Sommeil' },
      { type: 'champ', libelle: 'Priorité', valeur: 'Élevée' },
      { type: 'paragraphe', texte: 'Arguments :' },
      { type: 'liste', elements: ['Score PSQI élevé', 'Réveils nocturnes déclarés'] },
      { type: 'paragraphe', texte: 'À confirmer en entretien :' },
      { type: 'liste', elements: ['Horaires de coucher en semaine'] },
      { type: 'titre', niveau: 3, texte: 'Axe 2 — Digestion' },
      { type: 'champ', libelle: 'Priorité', valeur: 'Modérée' },
      { type: 'paragraphe', texte: 'Arguments :' },
      { type: 'liste', elements: ['Inconfort post-prandial'] },
      { type: 'paragraphe', texte: 'À confirmer en entretien :' },
      { type: 'liste', elements: ['Fréquence des épisodes'] },
    ]);
  });

  it("n'émet ni alerte ni mention de brouillon quand il n'y a pas lieu", () => {
    expect(blocs.some((b) => b.type === 'paragraphe' && b.ton === 'alerte')).toBe(false);
    expect(tout(blocs)).not.toContain('brouillon');
  });
});

describe('sectionSynthese — statut et rédaction', () => {
  it('Corrigée : validée puis annotée, note citée', () => {
    const blocs = sectionSynthese(
      synthese({ statut: 'Corrigee_Praticien', notesPraticien: '  Ajuster les horaires de repas.  ' }),
      null,
    );
    expect(champ(blocs, 'Statut')).toBe('Validée, puis annotée par le praticien');
    expect(sousTitre(blocs, 'Note du praticien')).toEqual([
      { type: 'paragraphe', texte: '« Ajuster les horaires de repas. »' },
    ]);
  });

  it('sans note : « Aucune note. », y compris pour une note blanche', () => {
    for (const notesPraticien of [null, '   ']) {
      const blocs = sectionSynthese(synthese({ notesPraticien }), null);
      expect(sousTitre(blocs, 'Note du praticien')).toEqual([
        { type: 'paragraphe', texte: 'Aucune note.', ton: 'discret' },
      ]);
    }
  });

  it('un statut inconnu est restitué brut, une date de validation absente est « Non renseigné »', () => {
    const blocs = sectionSynthese(synthese({ statut: 'Statut_Futur', dateValidation: null }), null);
    expect(champ(blocs, 'Statut')).toBe('Statut_Futur');
    expect(champ(blocs, 'Validée le')).toBe(NON_RENSEIGNE);
  });

  it('un statut qui porte le nom d’une propriété du prototype reste brut', () => {
    const blocs = sectionSynthese(synthese({ statut: 'constructor' }), null);
    expect(champ(blocs, 'Statut')).toBe('constructor');
  });

  it('rédaction IA vs rédaction praticien', () => {
    expect(champ(sectionSynthese(synthese(), null), 'Rédaction'))
      .toBe("Préparée avec l'assistance d'une IA, relue et validée par le praticien");
    expect(champ(sectionSynthese(synthese({ modele: MODELE_REDACTION_PRATICIEN }), null), 'Rédaction'))
      .toBe('Rédigée par le praticien');
  });
});

describe('sectionSynthese — avertissement et brouillon plus récent', () => {
  it('avertissement de mesure retirée : paragraphe alerte, avant le contenu', () => {
    const avertissement = 'Cette synthèse précède le retrait d’interprétation d’un questionnaire du dossier.';
    const blocs = sectionSynthese(synthese({ avertissementMesureRetiree: avertissement }), null);
    const i = blocs.findIndex((b) => b.type === 'paragraphe' && b.ton === 'alerte');
    expect(blocs[i]).toEqual({ type: 'paragraphe', texte: avertissement, ton: 'alerte' });
    const resume = blocs.findIndex((b) => b.type === 'titre' && b.texte === 'Résumé praticien');
    expect(i).toBeLessThan(resume);
  });

  it('brouillon plus récent : signalé, non inclus', () => {
    const blocs = sectionSynthese(synthese(), { statut: 'Brouillon_IA', dateGeneration: BROUILLON });
    const mention = {
      type: 'paragraphe',
      texte: `Une synthèse plus récente existe en brouillon (générée le ${dateFr(BROUILLON)}) ; `
        + "elle n'est pas incluse car elle n'a pas été validée.",
      ton: 'discret',
    };
    expect(blocs).toContainEqual(mention);
    expect(blocs.findIndex((b) => b.type === 'paragraphe' && b.texte === mention.texte))
      .toBeLessThan(blocs.findIndex((b) => b.type === 'titre' && b.niveau === 2));
    expect(dateFr(BROUILLON)).toBe('20/09/2026');
  });
});

describe('sectionSynthese — aucune synthèse validée', () => {
  it('sans brouillon : titre et phrase seuls', () => {
    expect(sectionSynthese(null, null)).toEqual([
      { type: 'titre', niveau: 1, texte: '4. Dernière synthèse validée' },
      { type: 'paragraphe', texte: "Aucune synthèse n'a encore été validée par le praticien." },
    ]);
  });

  it('avec brouillon : mention discrète, libellé du statut de l’écran', () => {
    expect(sectionSynthese(null, { statut: 'Brouillon_Praticien', dateGeneration: BROUILLON })).toEqual([
      { type: 'titre', niveau: 1, texte: '4. Dernière synthèse validée' },
      { type: 'paragraphe', texte: "Aucune synthèse n'a encore été validée par le praticien." },
      {
        type: 'paragraphe',
        texte: `Un brouillon (Brouillon praticien) généré le ${dateFr(BROUILLON)} existe ; `
          + "il n'est pas inclus car il n'a pas été validé.",
        ton: 'discret',
      },
    ]);
  });

  it('avec brouillon de statut inconnu : statut brut', () => {
    const blocs = sectionSynthese(null, { statut: 'Brouillon_X', dateGeneration: BROUILLON });
    expect(tout(blocs)).toContain('Un brouillon (Brouillon_X) généré le');
  });
});

describe('sectionSynthese — JSON partiel ou ancien', () => {
  const defauts = validateSyntheseSchema({});

  it("n'injecte aucun texte par défaut : un champ absent se dit absent", () => {
    const blocs = sectionSynthese(
      synthese({ syntheseJson: { resume_praticien: 'Résumé d’un ancien schéma.' } }),
      null,
    );
    const rendu = tout(blocs);
    expect(rendu).not.toContain(defauts.resume_praticien);
    expect(rendu).not.toContain(defauts.limites);
    expect(sousTitre(blocs, 'Résumé praticien')).toEqual([
      { type: 'paragraphe', texte: 'Résumé d’un ancien schéma.' },
    ]);
    for (const titre of [
      'Axes prioritaires',
      'Points de vigilance',
      'Questions pour la consultation',
      'Texte destiné au patient',
      'Limites',
    ]) {
      expect(sousTitre(blocs, titre)).toEqual([{ type: 'paragraphe', texte: ABSENT, ton: 'discret' }]);
    }
  });

  it('JSON illisible (null, chaîne, tableau) : toutes les rubriques absentes, sans texte par défaut', () => {
    for (const syntheseJson of [null, 'texte', [1, 2]]) {
      const blocs = sectionSynthese(synthese({ syntheseJson }), null);
      const rendu = tout(blocs);
      expect(rendu).not.toContain(defauts.resume_praticien);
      expect(rendu).not.toContain(defauts.limites);
      expect(sousTitre(blocs, 'Résumé praticien')).toEqual([{ type: 'paragraphe', texte: ABSENT, ton: 'discret' }]);
      expect(sousTitre(blocs, 'Limites')).toEqual([{ type: 'paragraphe', texte: ABSENT, ton: 'discret' }]);
    }
  });

  it('mauvais type → absent ; liste vide → aucun élément ; texte blanc → aucun texte', () => {
    const blocs = sectionSynthese(
      synthese({
        syntheseJson: {
          resume_praticien: 42,
          axes_prioritaires: [],
          points_de_vigilance: [],
          questions_entretien: 'pas une liste',
          narratif_patient: '   ',
          limites: '',
        },
      }),
      null,
    );
    expect(sousTitre(blocs, 'Résumé praticien')).toEqual([{ type: 'paragraphe', texte: ABSENT, ton: 'discret' }]);
    expect(sousTitre(blocs, 'Axes prioritaires')).toEqual([{ type: 'paragraphe', texte: LISTE_VIDE, ton: 'discret' }]);
    expect(sousTitre(blocs, 'Points de vigilance')).toEqual([{ type: 'paragraphe', texte: LISTE_VIDE, ton: 'discret' }]);
    expect(sousTitre(blocs, 'Questions pour la consultation'))
      .toEqual([{ type: 'paragraphe', texte: ABSENT, ton: 'discret' }]);
    expect(sousTitre(blocs, 'Texte destiné au patient'))
      .toEqual([{ type: 'paragraphe', texte: 'Aucun texte dans cette synthèse.', ton: 'discret' }]);
    expect(sousTitre(blocs, 'Limites'))
      .toEqual([{ type: 'paragraphe', texte: 'Aucun texte dans cette synthèse.', ton: 'discret' }]);
  });

  it('ignore les éléments non-chaînes et blancs d’une liste', () => {
    const blocs = sectionSynthese(
      synthese({ syntheseJson: { ...jsonComplet(), points_de_vigilance: [3, null, ' ', 'Fatigue', { x: 1 }] } }),
      null,
    );
    expect(sousTitre(blocs, 'Points de vigilance')).toEqual([{ type: 'liste', elements: ['Fatigue'] }]);
  });
});

describe('sectionSynthese — axes mal formés', () => {
  function axes(valeur: unknown): BlocExport[] {
    const blocs = sectionSynthese(synthese({ syntheseJson: { ...jsonComplet(), axes_prioritaires: valeur } }), null);
    return sousTitre(blocs, 'Axes prioritaires');
  }

  it('axes_prioritaires non tableau → absent', () => {
    for (const valeur of ['Sommeil', { axe: 'Sommeil' }, 3, null]) {
      expect(axes(valeur)).toEqual([{ type: 'paragraphe', texte: ABSENT, ton: 'discret' }]);
    }
  });

  it('axe réduit à son intitulé : priorité absente, listes vides', () => {
    expect(axes([{ axe: 'Sommeil' }])).toEqual([
      { type: 'titre', niveau: 3, texte: 'Axe 1 — Sommeil' },
      { type: 'champ', libelle: 'Priorité', valeur: 'Absente de cette synthèse' },
      { type: 'paragraphe', texte: 'Arguments :' },
      { type: 'paragraphe', texte: LISTE_VIDE, ton: 'discret' },
      { type: 'paragraphe', texte: 'À confirmer en entretien :' },
      { type: 'paragraphe', texte: LISTE_VIDE, ton: 'discret' },
    ]);
  });

  it('priorité inconnue restituée brute, listes de mauvais type absentes, intitulé manquant signalé', () => {
    expect(axes([{ niveau_priorite: 'critique', arguments: 'Score élevé', points_a_confirmer: [7, 'Horaires'] }]))
      .toEqual([
        { type: 'titre', niveau: 3, texte: 'Axe 1 — intitulé absent de cette synthèse' },
        { type: 'champ', libelle: 'Priorité', valeur: 'critique' },
        { type: 'paragraphe', texte: 'Arguments :' },
        { type: 'paragraphe', texte: ABSENT, ton: 'discret' },
        { type: 'paragraphe', texte: 'À confirmer en entretien :' },
        { type: 'liste', elements: ['Horaires'] },
      ]);
  });

  it('une priorité nommée comme une propriété du prototype reste brute', () => {
    expect(axes([{ axe: 'Sommeil', niveau_priorite: 'toString' }]))
      .toContainEqual({ type: 'champ', libelle: 'Priorité', valeur: 'toString' });
  });

  it('les axes non-objets ne sont pas restitués mais comptés', () => {
    const blocs = axes([null, 'Digestion', { axe: 'Sommeil', niveau_priorite: 'faible' }, [1]]);
    expect(titres(blocs, 3)).toEqual(['Axe 1 — Sommeil']);
    expect(blocs).toContainEqual({ type: 'champ', libelle: 'Priorité', valeur: 'Faible' });
    expect(blocs.at(-1)).toEqual({
      type: 'paragraphe',
      texte: '3 axes de forme illisible ne sont pas restitués.',
      ton: 'discret',
    });
  });

  it('un seul axe, illisible : signalé au singulier, sans « aucun élément »', () => {
    expect(axes([null])).toEqual([
      { type: 'paragraphe', texte: "1 axe de forme illisible n'est pas restitué.", ton: 'discret' },
    ]);
  });
});

describe('sectionSynthese — garde de module', () => {
  it("n'importe pas lib/anthropic, qui injecte des textes par défaut", () => {
    const source = readFileSync(join(__dirname, 'sectionSynthese.ts'), 'utf8');
    expect(source).not.toMatch(/from ['"]@\/lib\/anthropic['"]/);
    expect(source).not.toMatch(/validateSyntheseSchema\(/);
  });
});
