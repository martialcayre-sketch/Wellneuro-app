import { afterEach, describe, expect, it } from 'vitest';
import { isDeadlineExpired } from '@/lib/patient-access';
import {
  JOURS_ENTRE_RELANCES_ASSIGNATION,
  JOURS_NOUVELLE_ECHEANCE_RELANCE,
  deciderRelanceAssignation,
  nouvelleDateLimiteRelance,
  rappelPossibleLe,
  type EntreeRelanceAssignation,
} from './relanceAssignation';
import { MESSAGE_RELANCE_SANS_REPONSE, messageResultatRelance } from './relanceEcheance';

// Le module est PUR et l'instant est injecté : les bornes s'éprouvent au
// millième de seconde, ce qu'une décision lisant l'horloge interdirait.
const LE_20 = '2026-03-20';
const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

function entree(surcharge: Partial<EntreeRelanceAssignation> = {}): EntreeRelanceAssignation {
  return {
    statut: 'En attente',
    idQuestionnaire: 'Q_INF_03',
    dateLimite: LE_20,
    envoisPrecedents: [],
    maintenant: new Date('2026-03-25T09:00:00'),
    ...surcharge,
  };
}

describe('deciderRelanceAssignation', () => {
  it('relance une assignation en attente dont l’échéance est passée', () => {
    expect(deciderRelanceAssignation(entree())).toEqual({ ok: true });
  });

  it('ne relance pas ce qui est revenu ni ce qui est annulé', () => {
    expect(deciderRelanceAssignation(entree({ statut: 'Complété' })))
      .toMatchObject({ ok: false, raison: 'assignation_rendue' });
    expect(deciderRelanceAssignation(entree({ statut: 'Annulée' })))
      .toMatchObject({ ok: false, raison: 'assignation_annulee' });
  });

  // LE POINT DU LOT. Un rappel sans date ne dit rien de plus que l'invitation
  // initiale — « il reste un questionnaire », que le patient sait déjà. C'est
  // l'échéance qui rend le rappel actionnable, et c'est pour cela que le second
  // rideau la porte désormais (`WN_ECHEANCE_OBLIGATOIRE`).
  it('refuse de relancer une assignation sans échéance', () => {
    expect(deciderRelanceAssignation(entree({ dateLimite: null })))
      .toMatchObject({ ok: false, raison: 'sans_echeance', possibleLe: null });
  });

  it('refuse une échéance mal formée comme une échéance absente', () => {
    expect(deciderRelanceAssignation(entree({ dateLimite: '20/03/2026' })))
      .toMatchObject({ ok: false, raison: 'sans_echeance' });
  });

  // DÉPASSÉE = LE JOUR D'APRÈS. La date annonce une JOURNÉE entière au patient :
  // le relancer à 00 h 01 du jour dit lui reprocherait un retard qu'il n'a pas
  // encore, et lui apprendrait que la date ne veut rien dire.
  it('ne relance pas pendant la journée annoncée, et relance dès le lendemain', () => {
    const jourDit = deciderRelanceAssignation(
      entree({ maintenant: new Date('2026-03-20T23:59:59') }),
    );
    expect(jourDit).toMatchObject({ ok: false, raison: 'echeance_non_depassee' });
    expect((jourDit as { possibleLe: Date }).possibleLe.getTime())
      .toBe(new Date('2026-03-21T00:00:00').getTime());

    expect(deciderRelanceAssignation(entree({ maintenant: new Date('2026-03-21T00:00:00') })))
      .toEqual({ ok: true });
  });

  // LE LENDEMAIN PAR LE CALENDRIER ([[D-414]] §2). Le fuseau du serveur est
  // celui de Paris pour la durée de ces bancs : le 25 octobre 2026 dure 25 h
  // (heure d'hiver), le 29 mars 2026 en dure 23. Minuit + 24 h tombait à 23 h
  // le jour dit en octobre — une heure avant que le portail ne dise « Expiré ».
  describe('aux changements d’heure (Europe/Paris)', () => {
    const tzAvant = process.env.TZ;
    afterEach(() => {
      if (tzAvant === undefined) delete process.env.TZ;
      else process.env.TZ = tzAvant;
    });

    for (const [jour, lendemain] of [
      ['2026-10-25', '2026-10-26'],
      ['2026-03-29', '2026-03-30'],
    ] as const) {
      it(`tient la journée entière du ${jour}, ni plus ni moins que le portail`, () => {
        process.env.TZ = 'Europe/Paris';
        const minuitLendemain = new Date(`${lendemain}T00:00:00`);
        // Le banc ne vaut que si le fuseau a bien pris : 23 ou 25 h dans la journée.
        expect(minuitLendemain.getTime() - new Date(`${jour}T00:00:00`).getTime())
          .not.toBe(MS_PAR_JOUR);

        const justeAvant = new Date(minuitLendemain.getTime() - 1);
        const avant = deciderRelanceAssignation(entree({ dateLimite: jour, maintenant: justeAvant }));
        expect(avant).toMatchObject({ ok: false, raison: 'echeance_non_depassee' });
        expect((avant as { possibleLe: Date }).possibleLe.getTime()).toBe(minuitLendemain.getTime());
        expect(isDeadlineExpired(jour, justeAvant)).toBe(false);

        expect(deciderRelanceAssignation(entree({ dateLimite: jour, maintenant: minuitLendemain })))
          .toEqual({ ok: true });
        expect(isDeadlineExpired(jour, minuitLendemain)).toBe(true);
      });
    }
  });

  // [[D-562]] §3 (amende [[D-404]] §1) : une échue se relance sans
  // déverrouillage — la relance lui donne une nouvelle date, qui la rouvre.
  // Le statut des réponses n'entre plus dans la décision.
  it('relance une échéance passée sans déverrouillage préalable', () => {
    expect(deciderRelanceAssignation(entree())).toEqual({ ok: true });
    // Avant le terme, le refus reste celui de l'échéance.
    expect(deciderRelanceAssignation(entree({ maintenant: new Date('2026-03-20T12:00:00') })))
      .toMatchObject({ raison: 'echeance_non_depassee' });
  });

  // [[D-562]] §5 : l'agenda du sommeil se relance depuis son panneau, jamais
  // par ce rappel — ni seul, ni couvert par un rappel groupé.
  it('refuse l’agenda du sommeil, même échu', () => {
    expect(deciderRelanceAssignation(entree({ idQuestionnaire: 'Q_SOM_09' })))
      .toEqual({ ok: false, raison: 'agenda_sommeil', possibleLe: null });
    // L'agenda alimentaire n'est pas visé.
    expect(deciderRelanceAssignation(entree({ idQuestionnaire: 'Q_ALI_09' }))).toEqual({ ok: true });
  });

  it('tient la cadence entre deux rappels, et dit quand le prochain sera possible', () => {
    const dernier = new Date('2026-03-25T08:00:00');
    const possibleLe = new Date(dernier.getTime() + JOURS_ENTRE_RELANCES_ASSIGNATION * MS_PAR_JOUR);

    const trop = deciderRelanceAssignation(entree({
      envoisPrecedents: [{ enregistreLe: dernier }],
      maintenant: new Date(possibleLe.getTime() - 1),
    }));
    expect(trop).toMatchObject({ ok: false, raison: 'cadence' });
    expect((trop as { possibleLe: Date }).possibleLe.getTime()).toBe(possibleLe.getTime());

    expect(deciderRelanceAssignation(entree({
      envoisPrecedents: [{ enregistreLe: dernier }],
      maintenant: possibleLe,
    }))).toEqual({ ok: true });
  });

  // L'appelant n'est pas tenu de trier : se fier à son ordre ferait dépendre
  // une garde de cadence d'un `orderBy` qu'une lecture voisine pourrait changer
  // sans le savoir.
  it('retient le rappel le plus récent, quel que soit l’ordre reçu', () => {
    const vieux = new Date('2026-03-21T08:00:00');
    const recent = new Date('2026-03-25T08:00:00');
    const decision = deciderRelanceAssignation(entree({
      envoisPrecedents: [{ enregistreLe: recent }, { enregistreLe: vieux }],
      maintenant: new Date('2026-03-25T09:00:00'),
    }));
    expect(decision).toMatchObject({ ok: false, raison: 'cadence' });
  });

  // UNE SEULE RÈGLE ([[D-562]] §2, amendement du 2026-11-25) : l'instant que
  // la fiche reçoit est celui où la décision cesse de refuser par cadence.
  it('rappelPossibleLe : le plus récent rappel plus la cadence, null sans rappel', () => {
    expect(rappelPossibleLe([])).toBeNull();
    const vieux = new Date('2026-03-21T08:00:00');
    const recent = new Date('2026-03-25T08:00:00');
    const possibleLe = rappelPossibleLe([{ enregistreLe: recent }, { enregistreLe: vieux }]);
    expect(possibleLe?.getTime()).toBe(recent.getTime() + JOURS_ENTRE_RELANCES_ASSIGNATION * MS_PAR_JOUR);
    const envoisPrecedents = [{ enregistreLe: recent }];
    expect(deciderRelanceAssignation(entree({ envoisPrecedents, maintenant: new Date(possibleLe!.getTime() - 1) })))
      .toEqual({ ok: false, raison: 'cadence', possibleLe });
    expect(deciderRelanceAssignation(entree({ envoisPrecedents, maintenant: possibleLe! })))
      .toEqual({ ok: true });
  });

  // L'ORDRE DES REFUS COMPTE : un questionnaire déjà rendu ne doit pas se voir
  // reprocher son absence d'échéance. On ne demande rien à qui a répondu.
  it('le statut prime sur l’échéance', () => {
    expect(deciderRelanceAssignation(entree({ statut: 'Complété', dateLimite: null })))
      .toMatchObject({ raison: 'assignation_rendue' });
  });
});

describe('nouvelleDateLimiteRelance ([[D-562]] §1)', () => {
  it('donne le jour local de la relance plus 7 jours', () => {
    expect(JOURS_NOUVELLE_ECHEANCE_RELANCE).toBe(7);
    expect(nouvelleDateLimiteRelance(new Date('2026-12-13T09:00:00'))).toBe('2026-12-20');
    // Aux deux bords de la journée, la même date.
    expect(nouvelleDateLimiteRelance(new Date('2026-12-13T00:00:00'))).toBe('2026-12-20');
    expect(nouvelleDateLimiteRelance(new Date('2026-12-13T23:59:59'))).toBe('2026-12-20');
  });

  // PAR LE CALENDRIER, jamais + 7 × 24 h ([[D-414]] §2) : la semaine qui
  // traverse un changement d'heure garde ses sept jours. Fuseau de Paris
  // épinglé, et des instants qui font échouer la version naïve : à 00 h 30 la
  // semaine de 169 h (octobre) retombe la veille, à 23 h 30 la semaine de
  // 167 h (mars) déborde au lendemain.
  describe('aux changements d’heure (Europe/Paris)', () => {
    const tzAvant = process.env.TZ;
    afterEach(() => {
      if (tzAvant === undefined) delete process.env.TZ;
      else process.env.TZ = tzAvant;
    });

    it('compte en jours de calendrier, pas en heures', () => {
      process.env.TZ = 'Europe/Paris';
      const avantOctobre = new Date('2026-10-24T00:30:00');
      // Le banc ne vaut que si le fuseau a bien pris : la semaine dure 169 h.
      expect(new Date('2026-10-31T00:30:00').getTime() - avantOctobre.getTime()).toBe(7 * MS_PAR_JOUR + 3600_000);
      expect(nouvelleDateLimiteRelance(avantOctobre)).toBe('2026-10-31');
      expect(nouvelleDateLimiteRelance(new Date('2026-03-28T23:30:00'))).toBe('2026-04-04');
      expect(nouvelleDateLimiteRelance(new Date('2026-12-28T10:00:00'))).toBe('2027-01-04');
    });
  });

  // Un second clic après une relance partie reçoit la cadence, qui dit ce qui
  // s'est passé — jamais l'échéance « non passée » que la relance a créée.
  it('après une relance, la cadence prime sur la nouvelle échéance', () => {
    const maintenant = new Date('2026-12-13T09:00:00');
    expect(deciderRelanceAssignation(entree({
      dateLimite: nouvelleDateLimiteRelance(maintenant),
      envoisPrecedents: [{ enregistreLe: new Date('2026-12-13T08:59:00') }],
      maintenant,
    }))).toMatchObject({ raison: 'cadence' });
  });

  // La nouvelle date n'est pas échue le jour de la relance : la relance ne se
  // rejoue pas sur l'envoi qu'elle vient de rouvrir.
  it('rouvre l’envoi : la nouvelle date n’est pas dépassée', () => {
    const maintenant = new Date('2026-12-13T09:00:00');
    expect(deciderRelanceAssignation(entree({ dateLimite: nouvelleDateLimiteRelance(maintenant), maintenant })))
      .toMatchObject({ raison: 'echeance_non_depassee' });
  });
});

describe('messageResultatRelance ([[D-488]] DOC-20, T-89 à T-93)', () => {
  it('« Relance envoyée » ne se dit que du statut Envoye', () => {
    expect(messageResultatRelance({ ok: true, statut: 'Envoye', questionnaires: 1, nouvelleDateLimite: '2026-12-02' }))
      .toBe('Relance envoyée. Nouvelle date limite : 02/12/2026.');
    expect(messageResultatRelance({ ok: true, statut: 'Envoye', questionnaires: 2, nouvelleDateLimite: '2026-12-02' }))
      .toBe('Relance envoyée. Elle couvre les 2 envois échus de ce dossier ; nouvelle date limite : 02/12/2026.');
  });

  it('un statut non parti, connu ou inconnu, dit que rien n’a changé', () => {
    expect(messageResultatRelance({ ok: true, statut: 'Non_envoye', questionnaires: 1 }))
      .toBe('Relance non partie : l’envoi d’e-mails n’est pas configuré. Rien n’a changé.');
    expect(messageResultatRelance({ ok: true, statut: 'Erreur', questionnaires: 1 }))
      .toBe('Relance non partie : l’envoi a échoué. Rien n’a changé ; vous pouvez réessayer.');
    expect(messageResultatRelance({ ok: true, statut: 'Statut_inconnu', questionnaires: 1 }))
      .toBe('Relance non partie : l’envoi a échoué. Rien n’a changé ; vous pouvez réessayer.');
    expect(messageResultatRelance({ ok: true, questionnaires: 1 }))
      .toBe('Relance non partie : l’envoi a échoué. Rien n’a changé ; vous pouvez réessayer.');
  });

  it('un refus rend le message du serveur, et à défaut T-93', () => {
    expect(messageResultatRelance({ ok: false, error: 'Un rappel est déjà parti.' })).toBe('Un rappel est déjà parti.');
    expect(messageResultatRelance({ ok: false })).toBe(MESSAGE_RELANCE_SANS_REPONSE);
  });
});
