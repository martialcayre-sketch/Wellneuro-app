import { describe, expect, it } from 'vitest';
import {
  ErreurContratFicheUsage,
  LIBELLE_MAX,
  lireBrouillonLibelle,
  lireBrouillonVersionUsage,
  RUBRIQUE_MAX,
} from './contrat';

// Texte SYNTHÉTIQUE uniquement ([[D-251]] §4, D-314 §3).
const S = 'c'.repeat(64);
const VERSION = {
  ficheId: 'FU_SYNTH',
  contenu: { question: 'Question synthétique.', population: 'Population synthétique.' },
  structureSha256: S,
  modeleRedaction: 'modele-redacteur-fictif',
  modeleContreLecture: 'modele-relecteur-fictif',
  versionConsigne: 'fiche-usage-v1',
};
const LIBELLE = {
  termeId: 'HYP_SYNTH',
  libelle: 'Libellé synthétique',
  structureSha256: S,
  modeleRedaction: 'modele-redacteur-fictif',
  modeleContreLecture: 'modele-relecteur-fictif',
  versionConsigne: 'libelle-v1',
};

function refus(fn: () => unknown, motif: RegExp) {
  expect(fn).toThrow(ErreurContratFicheUsage);
  expect(fn).toThrow(motif);
}

describe('lireBrouillonVersionUsage — un brouillon, jamais une validation (DC-16)', () => {
  it('rebâtit un brouillon conforme', () => {
    expect(lireBrouillonVersionUsage(VERSION)).toEqual(VERSION);
  });

  it.each(['acte', 'validateur', 'relectureIntegrale', 'idVersion', 'empreinte', 'statut'])(
    'refuse nommément le champ de validation « %s »',
    champ => refus(() => lireBrouillonVersionUsage({ ...VERSION, [champ]: true }), /ne valide jamais/),
  );

  it.each(['id', 'numero', 'creeLe'])('refuse le champ du serveur « %s »', champ =>
    refus(() => lireBrouillonVersionUsage({ ...VERSION, [champ]: 1 }), /posé par le serveur/),
  );

  it('refuse une clé inconnue, au premier niveau', () => {
    refus(() => lireBrouillonVersionUsage({ ...VERSION, titre: 'x' }), /champ inconnu « titre »/);
  });

  it('refuse « explication patient » et toute rubrique hors liste (arbitrage 6, D-314 §8)', () => {
    refus(() => lireBrouillonVersionUsage({ ...VERSION, contenu: { explication_patient: 'Texte.' } }), /rubrique inconnue/);
    refus(() => lireBrouillonVersionUsage({ ...VERSION, contenu: { conclusion: 'Texte.' } }), /rubrique inconnue/);
  });

  it('refuse un contenu vide, une rubrique blanche, non textuelle, balisée ou démesurée', () => {
    refus(() => lireBrouillonVersionUsage({ ...VERSION, contenu: {} }), /aucune rubrique/);
    refus(() => lireBrouillonVersionUsage({ ...VERSION, contenu: { question: '\t\n ' } }), /vide/);
    refus(() => lireBrouillonVersionUsage({ ...VERSION, contenu: { question: { texte: 'Q.' } } }), /chaîne est attendue/);
    refus(() => lireBrouillonVersionUsage({ ...VERSION, contenu: { question: 'Voir <b>ici</b>.' } }), /balisage/);
    refus(() => lireBrouillonVersionUsage({ ...VERSION, contenu: { question: 'x'.repeat(RUBRIQUE_MAX + 1) } }), /trop long/);
  });

  it('laisse passer un chevron qui n’est pas une balise', () => {
    expect(lireBrouillonVersionUsage({ ...VERSION, contenu: { question: 'Une valeur < à la borne.' } }).contenu.question).toBe(
      'Une valeur < à la borne.',
    );
  });

  it('refuse un identifiant de fiche hors format, une empreinte de structure hors format', () => {
    refus(() => lireBrouillonVersionUsage({ ...VERSION, ficheId: 'FU-TIRET' }), /FU_/);
    refus(() => lireBrouillonVersionUsage({ ...VERSION, structureSha256: S.toUpperCase() }), /hexadécimaux/);
  });

  it('refuse une contre-lecture par le modèle rédacteur lui-même', () => {
    refus(
      () => lireBrouillonVersionUsage({ ...VERSION, modeleContreLecture: ' Modele-Redacteur-Fictif ' }),
      /second modèle/,
    );
  });
});

describe('lireBrouillonLibelle — la nature se déduit du terme', () => {
  it('rebâtit un libellé et en déduit la nature', () => {
    expect(lireBrouillonLibelle(LIBELLE)).toEqual({ ...LIBELLE, nature: 'hypothese' });
    expect(lireBrouillonLibelle({ ...LIBELLE, termeId: 'POP_SYNTH' }).nature).toBe('population');
  });

  it('refuse une nature fournie par l’appelant, une empreinte de libellé fournie', () => {
    refus(() => lireBrouillonLibelle({ ...LIBELLE, nature: 'hypothese' }), /posé par le serveur/);
    refus(() => lireBrouillonLibelle({ ...LIBELLE, libelleSha256: S }), /posé par le serveur/);
  });

  it('refuse un terme sans préfixe connu, un libellé blanc ou démesuré, un acte', () => {
    refus(() => lireBrouillonLibelle({ ...LIBELLE, termeId: 'FU_SYNTH' }), /HYP_/);
    refus(() => lireBrouillonLibelle({ ...LIBELLE, libelle: ' ' }), /vide/);
    refus(() => lireBrouillonLibelle({ ...LIBELLE, libelle: 'x'.repeat(LIBELLE_MAX + 1) }), /trop long/);
    refus(() => lireBrouillonLibelle({ ...LIBELLE, acte: 'validee' }), /ne valide jamais/);
  });
});
