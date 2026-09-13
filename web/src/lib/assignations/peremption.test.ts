import { describe, expect, it } from 'vitest';
import {
  envoiPerime,
  joursDepuisPose,
  JOURS_PEREMPTION_ENVOI,
  QIDS_SANS_DATE_LIMITE,
} from './peremption';

// Le prédicat de péremption d'un envoi SANS échéance. Chaque test tient un
// terme, et chaque terme a une raison d'être : la règle ne doit voir QUE les
// envois qu'aucune autre horloge ne regarde.

const MAINTENANT = new Date('2026-09-13T12:00:00.000Z');

function ilYA(jours: number): string {
  return new Date(MAINTENANT.getTime() - jours * 86_400_000).toISOString();
}

function envoi(surcharges: Partial<Parameters<typeof envoiPerime>[0]> = {}) {
  return {
    statut: 'En attente',
    idQuestionnaire: 'Q_NEU_11',
    dateAssignation: ilYA(24),
    dateLimite: null,
    // Aucune passation : l'envoi ordinaire en attente. `undefined` ne
    // conviendrait pas — l'inconnu ne permet pas d'affirmer « sans retour ».
    aPassation: false,
    ...surcharges,
  };
}

describe('envoiPerime', () => {
  it('signale un envoi sans échéance qui attend au-delà du seuil', () => {
    expect(envoiPerime(envoi(), MAINTENANT)).toBe(true);
  });

  it('ne signale pas AU seuil — la borne est stricte, pas inclusive', () => {
    // Le 21ᵉ jour n'est pas un dépassement. Sans ce test, un `>=` glissé un jour
    // ferait apparaître le badge une journée trop tôt sur tous les dossiers.
    expect(envoiPerime(envoi({ dateAssignation: ilYA(JOURS_PEREMPTION_ENVOI) }), MAINTENANT)).toBe(false);
    expect(envoiPerime(envoi({ dateAssignation: ilYA(JOURS_PEREMPTION_ENVOI + 1) }), MAINTENANT)).toBe(true);
  });

  it('ignore un envoi qui PORTE une échéance, si vieux soit-il', () => {
    // Le Fil du jour en fait déjà une carte de retard, et `isDeadlineExpired` a
    // fermé la saisie côté patient. Un second signal ici donnerait deux nombres
    // derrière le même mot, à deux écrans d'écart.
    expect(envoiPerime(envoi({ dateAssignation: ilYA(300), dateLimite: '2026-01-01' }), MAINTENANT)).toBe(false);
  });

  it('exempte les agendas, dont la fenêtre EST de 21 jours', () => {
    for (const id of QIDS_SANS_DATE_LIMITE) {
      expect(envoiPerime(envoi({ idQuestionnaire: id, dateAssignation: ilYA(30) }), MAINTENANT)).toBe(false);
    }
  });

  it('ne regarde que ce qui attend — ni rendu, ni annulé', () => {
    expect(envoiPerime(envoi({ statut: 'Complété' }), MAINTENANT)).toBe(false);
    expect(envoiPerime(envoi({ statut: 'Annulée' }), MAINTENANT)).toBe(false);
  });

  it('ne dit jamais « sans retour » d’un envoi qui porte une passation', () => {
    // Une passation existe : il y a EU un retour, quel que soit le statut de
    // l'assignation. Le badge affirmerait le contraire et enverrait le
    // praticien annuler ce qui est déjà rentré.
    expect(envoiPerime(envoi({ aPassation: true }), MAINTENANT)).toBe(false);
    // Inconnu n'est pas « aucune » : un serveur qui ne publie pas le fait ne
    // permet pas de l'affirmer. Même fail-closed que le bouton d'annulation.
    expect(envoiPerime(envoi({ aPassation: undefined }), MAINTENANT)).toBe(false);
  });

  it('une date illisible ne périme rien', () => {
    // Fail-closed : on ne signale pas sur une donnée qu'on ne sait pas lire.
    expect(envoiPerime(envoi({ dateAssignation: 'pas une date' }), MAINTENANT)).toBe(false);
    expect(joursDepuisPose('pas une date', MAINTENANT)).toBe(0);
  });

  it('une pose dans le futur ne rend jamais un âge négatif', () => {
    expect(joursDepuisPose(ilYA(-5), MAINTENANT)).toBe(0);
  });
});

describe('le seuil lui-même', () => {
  it('vaut 21 jours — chiffre opérationnel, arbitré, non clinique', () => {
    // Ce test n'éprouve pas une propriété : il rend le chiffre VISIBLE en
    // revue. `DC-19`/`DC-20` exigent qu'un nombre non clinique soit identifié
    // comme tel ; le modifier doit coûter la lecture de cette ligne et du
    // commentaire qui le porte.
    expect(JOURS_PEREMPTION_ENVOI).toBe(21);
  });

  it('exempte exactement les deux agendas, et rien d’autre', () => {
    expect([...QIDS_SANS_DATE_LIMITE].sort()).toEqual(['Q_ALI_09', 'Q_SOM_09']);
  });
});
