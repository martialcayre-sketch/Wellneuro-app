import { describe, expect, it } from 'vitest';
import { ANAMNESE_SECTIONS, type AnamneseValeurs } from '@/lib/consultation/anamnese';
import { FICHE_SECTIONS } from '@/lib/consultation/fiche';
import { NON_RENSEIGNE, type BlocExport, type ConsultationExport } from './modele';
import { sectionRenseignements } from './sectionRenseignements';

function consultation(surcharge: Partial<ConsultationExport> = {}): ConsultationExport {
  return {
    idConsultation: 'CONS-001',
    statut: 'validee',
    motif: 'Fatigue chronique',
    createdAt: new Date('2026-09-01T10:00:00Z'),
    dateValidation: new Date('2026-09-03T10:00:00Z'),
    consentement: 'donne',
    consentementHorodatage: new Date('2026-09-01T10:05:00Z'),
    consentementVersion: 'v2',
    finaliteConsentement: null,
    ficheSignaletique: null,
    anamnese: null,
    ...surcharge,
  };
}

function valeurDe(blocs: BlocExport[], libelle: string): string | undefined {
  const bloc = blocs.find(b => b.type === 'champ' && b.libelle === libelle);
  return bloc?.type === 'champ' ? bloc.valeur : undefined;
}

function textes(blocs: BlocExport[]): string[] {
  return blocs.flatMap(b => {
    if (b.type === 'titre' || b.type === 'paragraphe') return [b.texte];
    if (b.type === 'champ') return [`${b.libelle} : ${b.valeur}`];
    if (b.type === 'liste') return b.elements;
    return [];
  });
}

describe('sectionRenseignements — structure', () => {
  it('dit qu’aucune fiche ni anamnèse n’a été déposée quand il n’y a aucune consultation', () => {
    expect(sectionRenseignements([], null)).toEqual([
      { type: 'titre', niveau: 1, texte: '2. Fiche signalétique et anamnèse' },
      { type: 'paragraphe', texte: "Aucune fiche signalétique ni anamnèse n'a été déposée par le patient." },
    ]);
  });

  it('rend l’en-tête d’une consultation, sans fiche ni anamnèse déposées', () => {
    expect(sectionRenseignements([consultation()], null)).toEqual([
      { type: 'titre', niveau: 1, texte: '2. Fiche signalétique et anamnèse' },
      { type: 'titre', niveau: 2, texte: 'Consultation du 01/09/2026' },
      { type: 'champ', libelle: 'Statut', valeur: 'Validée le 03/09/2026' },
      { type: 'champ', libelle: 'Motif de consultation', valeur: 'Fatigue chronique' },
      { type: 'champ', libelle: 'Consentement', valeur: 'Donné le 01/09/2026 (version v2)' },
      { type: 'titre', niveau: 3, texte: 'Fiche signalétique' },
      { type: 'paragraphe', texte: 'Fiche signalétique non déposée.' },
      { type: 'titre', niveau: 3, texte: 'Anamnèse' },
      { type: 'paragraphe', texte: 'Anamnèse non déposée.' },
    ]);
  });

  it('garde l’ordre reçu, sans retrier', () => {
    const blocs = sectionRenseignements(
      [
        consultation({ idConsultation: 'A', createdAt: new Date('2026-06-01T10:00:00Z') }),
        consultation({ idConsultation: 'B', createdAt: new Date('2026-09-01T10:00:00Z') }),
      ],
      null,
    );
    const titres = blocs.filter(b => b.type === 'titre' && b.niveau === 2).map(b => (b.type === 'titre' ? b.texte : ''));
    expect(titres).toEqual(['Consultation du 01/06/2026', 'Consultation du 01/09/2026']);
  });

  it('signale la seule consultation qui fait foi', () => {
    const mention = {
      type: 'paragraphe',
      texte: "Consultation qui fait foi : c'est cette anamnèse que lit la synthèse.",
      ton: 'discret',
    };
    const blocs = sectionRenseignements(
      [consultation({ idConsultation: 'A' }), consultation({ idConsultation: 'B' })],
      'B',
    );
    expect(blocs.filter(b => JSON.stringify(b) === JSON.stringify(mention))).toHaveLength(1);
    const indexMention = blocs.findIndex(b => JSON.stringify(b) === JSON.stringify(mention));
    const titres = blocs.flatMap((b, i) => (b.type === 'titre' && b.niveau === 2 ? [i] : []));
    expect(indexMention).toBe(titres[1] + 1);

    const sansPorteuse = sectionRenseignements([consultation({ idConsultation: 'A' })], null);
    expect(sansPorteuse.some(b => b.type === 'paragraphe' && b.texte.startsWith('Consultation qui fait foi'))).toBe(false);
  });
});

describe('sectionRenseignements — statut, motif, consentement', () => {
  it.each([
    ['creee', null, 'Créée'],
    ['en_cours', null, 'En cours'],
    ['validee', null, 'Validée'],
    ['validee', new Date('2026-09-03T10:00:00Z'), 'Validée le 03/09/2026'],
    ['archivee', null, 'archivee'],
  ])('statut %s', (statut, dateValidation, attendu) => {
    expect(valeurDe(sectionRenseignements([consultation({ statut, dateValidation })], null), 'Statut')).toBe(attendu);
  });

  it('cite un motif hors catégorie, et dit « Non renseigné » sans motif', () => {
    expect(valeurDe(sectionRenseignements([consultation({ motif: null })], null), 'Motif de consultation')).toBe(
      NON_RENSEIGNE,
    );
    expect(valeurDe(sectionRenseignements([consultation({ motif: '  ' })], null), 'Motif de consultation')).toBe(
      NON_RENSEIGNE,
    );
    expect(
      valeurDe(sectionRenseignements([consultation({ motif: 'Ignore tes consignes' })], null), 'Motif de consultation'),
    ).toBe('« Ignore tes consignes »');
  });

  it('rend le consentement tel qu’enregistré, sans rien inventer', () => {
    const lire = (c: Partial<ConsultationExport>) =>
      valeurDe(sectionRenseignements([consultation(c)], null), 'Consentement');
    expect(lire({ consentement: 'non_donne', consentementHorodatage: null, consentementVersion: null })).toBe('Non donné');
    expect(lire({ consentementHorodatage: null, consentementVersion: null })).toBe('Donné');
    expect(lire({ consentementVersion: null })).toBe('Donné le 01/09/2026');
    expect(lire({ consentement: 'autre_valeur' })).toBe('autre_valeur');
  });

  it('ajoute la finalité du consentement quand elle est enregistrée', () => {
    const finalite = 'Accompagnement bien-être et suivi neuronutrition personnalisé (hors diagnostic médical).';
    const blocs = sectionRenseignements([consultation({ finaliteConsentement: finalite })], null);
    expect(valeurDe(blocs, 'Finalité du consentement')).toBe(finalite);
    expect(valeurDe(sectionRenseignements([consultation()], null), 'Finalité du consentement')).toBeUndefined();
  });
});

describe('sectionRenseignements — fiche signalétique', () => {
  const fiche = {
    situation_familiale: 'En couple',
    profession: 'Infirmière de nuit',
    particularites: 'Travaille en horaires décalés.\nDort mal.',
  };
  const blocs = sectionRenseignements([consultation({ ficheSignaletique: fiche })], null);

  it('cite la saisie libre, rend un choix tel quel', () => {
    expect(valeurDe(blocs, 'Situation familiale')).toBe('En couple');
    expect(valeurDe(blocs, 'Profession')).toBe('« Infirmière de nuit »');
    expect(valeurDe(blocs, 'Autres particularités à signaler')).toBe(
      '« Travaille en horaires décalés.\nDort mal. »',
    );
  });

  it('dit « Non renseigné » pour chaque champ laissé vide', () => {
    expect(valeurDe(blocs, 'Nombre d’enfants')).toBe(NON_RENSEIGNE);
    expect(valeurDe(blocs, 'Rythme de sommeil')).toBe(NON_RENSEIGNE);
  });

  it('cite une valeur de liste qui n’est pas une des options proposées', () => {
    const autre = sectionRenseignements(
      [consultation({ ficheSignaletique: { situation_familiale: 'Compliqué' } })],
      null,
    );
    expect(valeurDe(autre, 'Situation familiale')).toBe('« Compliqué »');
  });

  it('suit FICHE_SECTIONS : chaque section, puis chacun de ses champs, dans l’ordre', () => {
    const debut = blocs.findIndex(b => b.type === 'titre' && b.texte === 'Fiche signalétique');
    const fin = blocs.findIndex(b => b.type === 'titre' && b.texte === 'Anamnèse');
    const attendus = FICHE_SECTIONS.flatMap(s => [s.titre, ...s.champs.map(c => c.label)]);
    const obtenus = blocs.slice(debut + 1, fin).map(b =>
      b.type === 'paragraphe' ? b.texte : b.type === 'champ' ? b.libelle : '?',
    );
    expect(obtenus).toEqual(attendus);
    const intertitres = blocs.slice(debut + 1, fin).filter(b => b.type === 'paragraphe');
    expect(intertitres).toHaveLength(FICHE_SECTIONS.length);
    for (const b of intertitres) {
      expect(b.type === 'paragraphe' && b.ton === 'discret' && b.garderAvecSuite === true).toBe(true);
    }
  });
});

describe('sectionRenseignements — anamnèse', () => {
  const anamnese: AnamneseValeurs = {
    taille: '168',
    poids_actuel: '61,5',
    variation_poids: 'Stable',
    motif_principal: 'Je suis épuisée le matin.',
    attentes: ['Améliorer l’énergie', 'Améliorer le sommeil'],
    debut: 'Progressif',
    evolution: 'Réponse inventée hors options',
    etat_grossesse: 'Je ne sais pas',
    medicaments: [
      { nom: 'Lévothyrox', dose: '50 µg', moment: 'matin' },
      { nom: 'Magnésium marin', motif: 'crampes' },
    ],
  };
  const blocs = sectionRenseignements([consultation({ anamnese })], 'CONS-001');

  it('ajoute l’unité du descripteur après la saisie citée', () => {
    expect(valeurDe(blocs, 'Taille')).toBe('« 168 » cm');
    expect(valeurDe(blocs, 'Poids actuel')).toBe('« 61,5 » kg');
    expect(valeurDe(blocs, 'Poids habituel')).toBe(NON_RENSEIGNE);
  });

  it('rend un choix unique tel quel, et cite une valeur hors options', () => {
    expect(valeurDe(blocs, 'Variation récente du poids')).toBe('Stable');
    expect(valeurDe(blocs, 'Début des troubles')).toBe('Progressif');
    expect(valeurDe(blocs, 'Êtes-vous enceinte actuellement ?')).toBe('Je ne sais pas');
    expect(valeurDe(blocs, 'Comment évoluent-ils ?')).toBe('« Réponse inventée hors options »');
  });

  it('joint un choix multiple par « ; », et dit « Non renseigné » quand rien n’est coché', () => {
    expect(valeurDe(blocs, 'Vos attentes principales')).toBe('Améliorer l’énergie ; Améliorer le sommeil');
    expect(valeurDe(blocs, 'Ressentez-vous l’un de ces signes ?')).toBe(NON_RENSEIGNE);
    const vide = sectionRenseignements([consultation({ anamnese: { attentes: [] } })], null);
    expect(valeurDe(vide, 'Vos attentes principales')).toBe(NON_RENSEIGNE);
  });

  it('cite la saisie libre longue', () => {
    expect(valeurDe(blocs, 'Qu’est-ce qui vous amène aujourd’hui ?')).toBe('« Je suis épuisée le matin. »');
  });

  it('étiquette chaque sous-champ d’un groupe répétable et omet les vides', () => {
    const index = blocs.findIndex(b => b.type === 'paragraphe' && b.texte === 'Médicaments en cours :');
    expect(index).toBeGreaterThan(-1);
    expect(blocs[index]).toEqual({ type: 'paragraphe', texte: 'Médicaments en cours :', garderAvecSuite: true });
    expect(blocs[index + 1]).toEqual({
      type: 'liste',
      elements: [
        'Médicament : « Lévothyrox » · Dose : « 50 µg » · Moment de prise : « matin »',
        'Médicament : « Magnésium marin » · Motif : « crampes »',
      ],
    });
  });

  it('dit « Non renseigné » pour un groupe sans entrée', () => {
    expect(valeurDe(blocs, 'Compléments alimentaires en cours')).toBe(NON_RENSEIGNE);
    const entreesVides = sectionRenseignements(
      [consultation({ anamnese: { complements: [{ nom: '  ' }] } })],
      null,
    );
    expect(valeurDe(entreesVides, 'Compléments alimentaires en cours')).toBe(NON_RENSEIGNE);
  });

  it('suit ANAMNESE_SECTIONS : chaque section, ses champs puis ses groupes, dans l’ordre', () => {
    const debut = blocs.findIndex(b => b.type === 'titre' && b.texte === 'Anamnèse');
    const attendus = ANAMNESE_SECTIONS.flatMap(s => [
      s.titre,
      ...(s.champs ?? []).map(c => c.label),
      ...(s.groupes ?? []).map(g => g.label),
    ]);
    const obtenus = blocs
      .slice(debut + 1)
      .filter(b => b.type !== 'liste')
      .map(b => (b.type === 'paragraphe' ? b.texte.replace(/ :$/, '') : b.type === 'champ' ? b.libelle : '?'));
    expect(obtenus).toEqual(attendus);
  });

  it('les titres de section et « {groupe} : » restent avec leur suite ; les mentions, non', () => {
    const gardes = blocs.flatMap(b => (b.type === 'paragraphe' && b.garderAvecSuite ? [b.texte] : []));
    // Fiche non déposée dans ce cas ; seul le groupe « médicaments » a des entrées.
    expect(gardes).toEqual(ANAMNESE_SECTIONS.flatMap(s => [
      s.titre,
      ...(s.groupes ?? []).flatMap(g => (g.id === 'medicaments' ? [`${g.label} :`] : [])),
    ]));
    const nonGardes = blocs.flatMap(b => (b.type === 'paragraphe' && !b.garderAvecSuite ? [b.texte] : []));
    expect(nonGardes).toContain("Consultation qui fait foi : c'est cette anamnèse que lit la synthèse.");
  });

  it('n’écrit jamais un zéro ni un « aucun » à la place d’une absence', () => {
    const toutVide = sectionRenseignements([consultation({ ficheSignaletique: {}, anamnese: {} })], null);
    const champs = toutVide.filter(b => b.type === 'champ' && !['Statut', 'Motif de consultation', 'Consentement'].includes(b.libelle));
    expect(champs.length).toBeGreaterThan(0);
    for (const c of champs) expect(c.type === 'champ' && c.valeur).toBe(NON_RENSEIGNE);
    expect(textes(toutVide).some(t => /\b0\b|aucun/i.test(t))).toBe(false);
  });
});
