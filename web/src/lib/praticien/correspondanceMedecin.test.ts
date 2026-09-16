import { describe, expect, it } from 'vitest';
import {
  estAncree,
  libelleLigne,
  libelleSens,
  LIBELLE_ORIGINE_GENEREE,
  LIBELLE_SENS_INDETERMINE,
  LIBELLES_SENS,
  LONGUEUR_MAX_MEDECIN_LIBELLE,
  LONGUEUR_MAX_TEXTE,
  preparerCorrespondance,
  sensExpose,
  VERDICTS_ANCRES,
} from './correspondanceMedecin';

const BASE = {
  idPatient: 'PAT_SEED_03',
  praticienEmail: 'praticien@wellneuro.fr',
  sens: 'sortant' as const,
  medecinLibelle: 'Dr Martin, médecin traitant',
  texte: 'Document de suivi remis en main propre.',
};

describe('preparerCorrespondance', () => {
  it('prépare une consignation valide, sortante puis entrante', () => {
    for (const sens of ['sortant', 'entrant'] as const) {
      const resultat = preparerCorrespondance({ ...BASE, sens });
      expect(resultat.ok).toBe(true);
      if (resultat.ok) {
        expect(resultat.donnees.sens).toBe(sens);
        expect(resultat.donnees.idSynthese).toBeNull();
        expect(resultat.donnees.echangeLe).toBeNull();
      }
    }
  });

  it('ne prépare JAMAIS de date de consignation — c’est la base qui la pose', () => {
    const resultat = preparerCorrespondance({ ...BASE });
    expect(resultat.ok).toBe(true);
    if (resultat.ok) {
      expect(Object.keys(resultat.donnees)).not.toContain('consigneLe');
      expect(Object.keys(resultat.donnees)).not.toContain('consigne_le');
    }
  });

  it('refuse un sens inconnu, absent ou non textuel', () => {
    for (const sens of ['autre', '', undefined, null, 3]) {
      const resultat = preparerCorrespondance({ ...BASE, sens });
      expect(resultat).toEqual({ ok: false, raison: 'sens_invalide' });
    }
  });

  it('refuse un libellé médecin vide ou blanc', () => {
    for (const medecinLibelle of ['', '   ', undefined, null]) {
      const resultat = preparerCorrespondance({ ...BASE, medecinLibelle });
      expect(resultat).toEqual({ ok: false, raison: 'medecin_libelle_vide' });
    }
  });

  it('refuse une adresse e-mail dans le libellé médecin (minimisation)', () => {
    const resultat = preparerCorrespondance({ ...BASE, medecinLibelle: 'dr.martin@cabinet.fr' });
    expect(resultat).toEqual({ ok: false, raison: 'medecin_libelle_email' });
  });

  it('refuse un libellé médecin trop long, accepte la borne exacte', () => {
    const juste = preparerCorrespondance({
      ...BASE,
      medecinLibelle: 'D'.repeat(LONGUEUR_MAX_MEDECIN_LIBELLE),
    });
    expect(juste.ok).toBe(true);
    const trop = preparerCorrespondance({
      ...BASE,
      medecinLibelle: 'D'.repeat(LONGUEUR_MAX_MEDECIN_LIBELLE + 1),
    });
    expect(trop).toEqual({ ok: false, raison: 'medecin_libelle_trop_long' });
  });

  it('refuse un texte vide, blanc ou absent', () => {
    for (const texte of ['', '   ', undefined, null]) {
      const resultat = preparerCorrespondance({ ...BASE, texte });
      expect(resultat).toEqual({ ok: false, raison: 'texte_vide' });
    }
  });

  it('refuse un texte trop long, accepte la borne exacte', () => {
    const juste = preparerCorrespondance({ ...BASE, texte: 'x'.repeat(LONGUEUR_MAX_TEXTE) });
    expect(juste.ok).toBe(true);
    const trop = preparerCorrespondance({ ...BASE, texte: 'x'.repeat(LONGUEUR_MAX_TEXTE + 1) });
    expect(trop).toEqual({ ok: false, raison: 'texte_trop_long' });
  });

  it('trime le libellé et le texte', () => {
    const resultat = preparerCorrespondance({
      ...BASE,
      medecinLibelle: '  Dr Martin  ',
      texte: '  Réponse reçue.  ',
    });
    expect(resultat.ok).toBe(true);
    if (resultat.ok) {
      expect(resultat.donnees.medecinLibelle).toBe('Dr Martin');
      expect(resultat.donnees.texte).toBe('Réponse reçue.');
    }
  });

  it('date d’échange absente, vide ou null → null', () => {
    for (const echangeLe of [undefined, null, '']) {
      const resultat = preparerCorrespondance({ ...BASE, echangeLe });
      expect(resultat.ok).toBe(true);
      if (resultat.ok) expect(resultat.donnees.echangeLe).toBeNull();
    }
  });

  it('refuse une date d’échange illisible ou non textuelle', () => {
    for (const echangeLe of ['pas-une-date', 42, {}]) {
      const resultat = preparerCorrespondance({ ...BASE, echangeLe });
      expect(resultat).toEqual({ ok: false, raison: 'date_echange_invalide' });
    }
  });

  it('refuse une date d’échange future, accepte le passé', () => {
    const futur = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    expect(preparerCorrespondance({ ...BASE, echangeLe: futur })).toEqual({
      ok: false,
      raison: 'date_echange_future',
    });
    const passe = preparerCorrespondance({ ...BASE, echangeLe: '2026-07-01' });
    expect(passe.ok).toBe(true);
    if (passe.ok) expect(passe.donnees.echangeLe?.toISOString()).toContain('2026-07-01');
  });

  it('idSynthese : chaîne non vide conservée, sinon null', () => {
    const avec = preparerCorrespondance({ ...BASE, idSynthese: 'SYN_001' });
    expect(avec.ok && avec.donnees.idSynthese).toBe('SYN_001');
    for (const idSynthese of [undefined, null, '', '   ', 42]) {
      const sans = preparerCorrespondance({ ...BASE, idSynthese });
      expect(sans.ok && sans.donnees.idSynthese).toBeNull();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LECTURE DU SENS — le défaut que ces bancs ferment.
//
// Avant eux, chaque écran portait son propre repli, et ils repliaient EN SENS
// INVERSE : `recentes/route.ts` rendait 'sortant' pour toute valeur hors
// vocabulaire, `CorrespondanceMedecinPanel` rendait « Réponse transcrite ». La
// même ligne se lisait donc « envoi » à l'accueil et « réponse » sur la fiche,
// l'accueil accompagnant en plus son libellé faux d'un extrait du texte.
// ─────────────────────────────────────────────────────────────────────────────

const HORS_VOCABULAIRE = ['autre', '', 'SORTANT', 'envoi', undefined, null, 3, {}];

describe('libelleSens', () => {
  it('rend les deux libellés du produit sur les deux sens connus', () => {
    expect(libelleSens('sortant')).toBe('Envoi consigné');
    expect(libelleSens('entrant')).toBe('Réponse transcrite');
    expect(LIBELLES_SENS.sortant).toBe('Envoi consigné');
    expect(LIBELLES_SENS.entrant).toBe('Réponse transcrite');
  });

  it('un sens hors vocabulaire ne devient NI un envoi NI une réponse', () => {
    for (const valeur of HORS_VOCABULAIRE) {
      const rendu = libelleSens(valeur);
      expect(rendu).toBe(LIBELLE_SENS_INDETERMINE);
      // Le cœur du banc : aucune des deux affirmations de direction n'est
      // servie. Départager les deux anciens replis aurait consisté à choisir
      // laquelle des deux erreurs garder.
      expect(rendu).not.toBe(LIBELLES_SENS.sortant);
      expect(rendu).not.toBe(LIBELLES_SENS.entrant);
    }
  });

  it('le libellé indéterminé reste vrai des deux sens — il ne nomme aucune direction', () => {
    expect(LIBELLE_SENS_INDETERMINE).not.toMatch(/envoi|réponse|reçu|transmis/i);
  });
});

describe('libelleLigne — l’origine prime sur le sens quand elle se lit', () => {
  it('une ligne ANCRÉE se dit préparée, jamais « envoyée » — sur les TROIS verdicts', () => {
    // Les deux colonnes d'ancrage ne se posent que par un générateur serveur,
    // au moment où le papier sort — avant toute remise. « Envoi consigné »
    // affirmait là un geste que personne n'avait fait. Le verdict de
    // concordance n'y change rien : c'est la PRÉSENCE de l'ancre qui dit
    // l'origine, pas sa fraîcheur.
    for (const verdict of VERDICTS_ANCRES) {
      expect(libelleLigne('sortant', verdict)).toBe(LIBELLE_ORIGINE_GENEREE);
      expect(libelleLigne('sortant', verdict)).not.toBe(LIBELLES_SENS.sortant);
    }
  });

  it('sans ancre, rien ne change : le sens lu fait foi', () => {
    expect(libelleLigne('sortant', 'sans_ancrage')).toBe(LIBELLES_SENS.sortant);
    expect(libelleLigne('entrant', 'sans_ancrage')).toBe(LIBELLES_SENS.entrant);
    for (const valeur of HORS_VOCABULAIRE) {
      expect(libelleLigne(valeur, 'sans_ancrage')).toBe(LIBELLE_SENS_INDETERMINE);
    }
  });

  it('un verdict ABSENT ou illisible n’atteste aucune ancre', () => {
    // Le défaut qu'a trouvé le banc du panneau : `!== 'sans_ancrage'` faisait
    // d'une charge sans verdict — un client ancien, une route qui oublie le
    // champ — une ligne « préparée ». L'inconnu ne vaut pas une origine ; la
    // ligne retombe sur ce qui était affiché avant.
    for (const verdict of [undefined, null, '', 'concordant', 3, {}]) {
      expect(libelleLigne('sortant', verdict)).toBe(LIBELLES_SENS.sortant);
      expect(estAncree(verdict)).toBe(false);
    }
  });

  it('une réponse TRANSCRITE reste transcrite, même ancrée', () => {
    // Aucun générateur n'écrit `entrant` aujourd'hui ; si l'un s'y mettait,
    // « Courrier préparé » retournerait le sens de l'échange sous les yeux du
    // praticien. Le sens lu gagne.
    expect(libelleLigne('entrant', 'concordante')).toBe(LIBELLES_SENS.entrant);
  });

  it('un sens illisible ET ancré ne devient pas une direction', () => {
    // L'ancre dit l'ORIGINE, pas la direction : « Courrier préparé » n'affirme
    // ni envoi ni réponse, il reste donc vrai ici.
    expect(libelleLigne('valeur_inattendue', 'concordante')).toBe(LIBELLE_ORIGINE_GENEREE);
    expect(LIBELLE_ORIGINE_GENEREE).not.toMatch(/envoi|réponse|reçu|transmis/i);
  });
});

describe('sensExpose', () => {
  it('laisse passer les deux sens connus, tels quels', () => {
    expect(sensExpose('sortant')).toBe('sortant');
    expect(sensExpose('entrant')).toBe('entrant');
  });

  it('rend `null` — jamais une valeur de repli — sur tout le reste', () => {
    for (const valeur of HORS_VOCABULAIRE) {
      expect(sensExpose(valeur)).toBeNull();
    }
  });

  it('les deux surfaces lisent la même valeur brute de la même façon', () => {
    // Contre-épreuve du défaut : une seule et même entrée, lue par le contrat
    // de route puis rendue à l'écran, ne peut plus produire deux verdicts.
    for (const brut of ['sortant', 'entrant', 'valeur_inattendue']) {
      expect(libelleSens(sensExpose(brut))).toBe(libelleSens(brut));
    }
  });
});
