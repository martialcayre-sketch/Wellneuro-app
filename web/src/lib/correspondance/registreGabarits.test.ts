// Garde structurelle du registre des gabarits patient (Socle LOT-03).
//
// Quatre volets, au patron de `trust/contenus/registre.test.ts` :
//   1. hash-lock — modifier un texte sans créer de version casse ici ;
//   2. liste figée — retirer ou réordonner une version publiée casse ici ;
//   3. déclarations — chaque gabarit dit sa conformité « données de santé »,
//      ses dates, et ses variables sont exactement celles de son corps ;
//   4. fidélité — chaque gabarit rendu avec des valeurs d'exemple reproduit
//      AU CARACTÈRE PRÈS ce que l'ancien code inline concaténait (les
//      chaînes attendues ci-dessous sont la copie des concaténations
//      historiques, pas du registre — c'est ce qui rend le volet probant).
import { describe, expect, it } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  REGISTRE_GABARITS_PATIENT,
  SEGMENTS_GABARITS,
  getGabarit,
  rendreGabarit,
  rendreSegment,
} from './registreGabarits';

// Le recalcul vit ici, pas dans le module : le registre est atteint par un
// composant client (via relanceEmail) et ne doit pas tirer node:crypto.
// `valideLe`/`redigeLe`/`donneesSante` hors champ — l'empreinte fige le TEXTE.
function empreinteGabarit(g: (typeof REGISTRE_GABARITS_PATIENT)[number]): string {
  return canonicalSha256({ key: g.key, version: g.version, sujet: g.sujet, corps: g.corps, variables: [...g.variables] });
}

describe('registre des gabarits patient — intégrité', () => {
  it('chaque version porte son empreinte exacte (hash-lock)', () => {
    for (const g of REGISTRE_GABARITS_PATIENT) {
      expect(empreinteGabarit(g), `${g.key}@${g.version}`).toBe(g.hash);
    }
  });

  it('expose les huit versions attendues, dans cet ordre', () => {
    expect(REGISTRE_GABARITS_PATIENT.map(g => `${g.key}@${g.version}`)).toEqual([
      'lien_magique@1',
      'acces_portail@1',
      'relance_agenda_sommeil@1',
      'assignation_questionnaire@1',
      'assignation_pack@1',
      'file_envoi@1',
      'accuse_reception@1',
      'envoi_bilan@1',
    ]);
  });

  it('les segments partagés sont figés', () => {
    expect(SEGMENTS_GABARITS.dateLimite).toBe('\nÀ compléter avant le : {{dateLimite}}');
    expect(SEGMENTS_GABARITS.notePraticien).toBe('\nNote de votre praticien : {{notes}}');
  });

  it('chaque gabarit déclare conformité, dates et variables cohérentes', () => {
    for (const g of REGISTRE_GABARITS_PATIENT) {
      expect(['conforme', 'ecart']).toContain(g.donneesSante.statut);
      if (g.donneesSante.statut === 'ecart') {
        expect(g.donneesSante.ecart.length, `${g.key} : un écart se décrit`).toBeGreaterThan(10);
      }
      expect(g.redigeLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (g.valideLe !== null) expect(g.valideLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Variables déclarées ⇔ placeholders du corps, dans les deux sens.
      for (const v of g.variables) {
        expect(g.corps, `${g.key} : {{${v}}} déclaré mais absent du corps`).toContain(`{{${v}}}`);
      }
      const placeholders = [...g.corps.matchAll(/\{\{([a-zA-Z]+)\}\}/g)].map(m => m[1]);
      for (const p of placeholders) {
        expect(g.variables, `${g.key} : {{${p}}} présent mais non déclaré`).toContain(p);
      }
    }
  });

  it('le rendu lève sur variable manquante ET sur placeholder résiduel', () => {
    const g = getGabarit('lien_magique');
    expect(() => rendreGabarit(g, { prenom: 'Sophie' })).toThrow(/variable manquante/);
    const factice = { ...g, corps: g.corps + ' {{intrus}}', variables: g.variables };
    expect(() => rendreGabarit(factice, { prenom: 'Sophie', lien: 'https://x' })).toThrow(/placeholder non rendu/);
  });

  it('rendreSegment : falsy → vide, valeur → segment exact (sans trim)', () => {
    expect(rendreSegment('dateLimite', null)).toBe('');
    expect(rendreSegment('dateLimite', '')).toBe('');
    expect(rendreSegment('dateLimite', '12/09/2026')).toBe('\nÀ compléter avant le : 12/09/2026');
    expect(rendreSegment('notePraticien', 'Prenez votre temps.')).toBe('\nNote de votre praticien : Prenez votre temps.');
  });
});

describe('registre des gabarits patient — fidélité aux textes historiques', () => {
  // Chaque chaîne attendue reproduit la CONCATÉNATION HISTORIQUE de
  // l'appelant, avec des valeurs d'exemple (fixtures neutres).

  it('lien magique', () => {
    const { sujet, corps } = rendreGabarit(getGabarit('lien_magique'), {
      prenom: 'Sophie',
      lien: 'https://app.wellneuro.fr/lien/abc',
    });
    expect(sujet).toBe('Votre lien d’accès — Wellneuro');
    expect(corps).toBe(
      `Bonjour Sophie,\n\n` +
      `Voici votre lien d'accès à votre espace patient Wellneuro :\nhttps://app.wellneuro.fr/lien/abc\n\n` +
      `Ce lien est valable 24 heures et ne s'ouvre qu'une fois. ` +
      `Passé ce délai, ou si vous l'avez déjà utilisé, vous pourrez en redemander ` +
      `un nouveau depuis la page qui s'affichera — sans passer par votre praticien.\n\n` +
      `Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message : ` +
      `sans clic de votre part, ce lien expirera seul.\n\n` +
      `L'équipe Wellneuro`,
    );
  });

  it("accès portail", () => {
    const { corps } = rendreGabarit(getGabarit('acces_portail'), {
      prenom: 'Jennifer',
      connexion: 'https://app.wellneuro.fr/portail/connexion',
    });
    expect(corps).toBe(
      `Bonjour Jennifer,\n\n` +
      `Votre praticien vous ouvre l'accès à votre espace patient Wellneuro.\n\n` +
      `Rendez-vous sur votre page d'accès :\nhttps://app.wellneuro.fr/portail/connexion\n\n` +
      `Vous pourrez vous connecter avec Google, ou recevoir un lien d'accès ` +
      `par e-mail à l'adresse enregistrée par votre praticien.\n\n` +
      `Lors de votre première connexion, il vous sera demandé de donner votre consentement, ` +
      `de remplir une courte fiche de renseignements puis un questionnaire d'anamnèse. ` +
      `Vos questionnaires de suivi seront ensuite mis à votre disposition.\n\n` +
      `L'équipe Wellneuro`,
    );
  });

  it('assignation de questionnaire — avec et sans segments', () => {
    const g = getGabarit('assignation_questionnaire');
    const avec = rendreGabarit(g, {
      titre: 'Questionnaire de suivi',
      dateInfo: rendreSegment('dateLimite', '12/09/2026'),
      noteInfo: rendreSegment('notePraticien', 'Prenez votre temps.'),
      portalUrl: 'https://app.wellneuro.fr/portail',
    });
    expect(avec.corps).toBe(
      `Bonjour,\n\n` +
      `Votre praticien vous invite à compléter le questionnaire suivant avant votre consultation :\n` +
      `« Questionnaire de suivi »\nÀ compléter avant le : 12/09/2026\nNote de votre praticien : Prenez votre temps.\n\n` +
      `Accédez à votre espace patient ici :\nhttps://app.wellneuro.fr/portail\n\n` +
      `L'équipe Wellneuro`,
    );
    const sans = rendreGabarit(g, {
      titre: 'Questionnaire de suivi',
      dateInfo: rendreSegment('dateLimite', ''),
      noteInfo: rendreSegment('notePraticien', null),
      portalUrl: 'https://app.wellneuro.fr/portail',
    });
    expect(sans.corps).toContain('« Questionnaire de suivi »\n\nAccédez');
  });

  it("pack et file d'envoi — liste préformatée", () => {
    const liste = ['Questionnaire A', 'Questionnaire B'].map(t => `• ${t}`).join('\n');
    const pack = rendreGabarit(getGabarit('assignation_pack'), {
      packNom: 'Base de consultation',
      liste,
      dateInfo: '',
      noteInfo: '',
      portalUrl: 'https://app.wellneuro.fr/portail',
    });
    expect(pack.corps).toBe(
      `Bonjour,\n\n` +
      `Votre praticien vous invite à compléter les questionnaires du pack « Base de consultation » avant votre consultation :\n` +
      `• Questionnaire A\n• Questionnaire B\n\n` +
      `Un seul lien suffit : après confirmation de votre email, vous pourrez accéder à tous les questionnaires en attente du pack et les remplir dans l'ordre de votre choix.\n\n` +
      `Accéder à vos questionnaires :\nhttps://app.wellneuro.fr/portail\n\n` +
      `L'équipe Wellneuro`,
    );
    const file = rendreGabarit(getGabarit('file_envoi'), {
      liste,
      dateInfo: '',
      noteInfo: '',
      portalUrl: 'https://app.wellneuro.fr/portail',
    });
    expect(file.corps).toBe(
      `Bonjour,\n\n` +
      `Votre praticien vous invite à compléter les questionnaires suivants :\n` +
      `• Questionnaire A\n• Questionnaire B\n\n` +
      `Un seul lien suffit : après confirmation de votre email, vous pourrez accéder à tous les questionnaires en attente et les remplir dans l'ordre de votre choix.\n\n` +
      `Accéder à vos questionnaires :\nhttps://app.wellneuro.fr/portail\n\n` +
      `L'équipe Wellneuro`,
    );
  });

  it('accusé de réception et envoi du bilan', () => {
    const accuse = rendreGabarit(getGabarit('accuse_reception'), { titre: 'Questionnaire de suivi' });
    expect(accuse.corps).toBe(
      `Bonjour,\n\n` +
      `Nous confirmons la bonne réception de vos réponses au questionnaire :\n` +
      `« Questionnaire de suivi »\n\n` +
      `Votre praticien Wellneuro en prendra connaissance prochainement.\n\n` +
      `L'équipe Wellneuro`,
    );
    const bilan = rendreGabarit(getGabarit('envoi_bilan'), {});
    expect(bilan.sujet).toBe('Votre bilan neuronutritionnel validé — Wellneuro');
    expect(bilan.corps).toBe(
      'Bonjour,\n\nVotre praticien vous transmet votre bilan neuronutritionnel Wellneuro.\nCe document a été préparé après validation humaine et ne constitue pas un diagnostic médical.\n\nBien cordialement,\nL\'équipe Wellneuro',
    );
  });
});
