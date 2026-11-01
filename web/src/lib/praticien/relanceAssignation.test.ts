import { afterEach, describe, expect, it } from 'vitest';
import { isDeadlineExpired } from '@/lib/patient-access';
import {
  JOURS_ENTRE_RELANCES_ASSIGNATION,
  deciderRelanceAssignation,
  type EntreeRelanceAssignation,
} from './relanceAssignation';

// Le module est PUR et l'instant est injecté : les bornes s'éprouvent au
// millième de seconde, ce qu'une décision lisant l'horloge interdirait.
const LE_20 = '2026-03-20';
const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

function entree(surcharge: Partial<EntreeRelanceAssignation> = {}): EntreeRelanceAssignation {
  return {
    statut: 'En attente',
    statutReponses: 'deverrouille',
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

  // ÉCHUE = EXPIRÉE, SAUF DÉVERROUILLAGE ([[D-404]]) : passé le jour dit, la
  // soumission rend 410. Rappeler enverrait le patient vers une porte fermée.
  it('refuse une échéance passée tant que le questionnaire n’est pas déverrouillé', () => {
    for (const statutReponses of ['non_rempli', 'verrouille', 'modification_demandee']) {
      expect(deciderRelanceAssignation(entree({ statutReponses })))
        .toEqual({ ok: false, raison: 'echeance_expiree', possibleLe: null });
    }
    // Avant le terme, le refus reste celui de l'échéance : rien n'a expiré.
    expect(deciderRelanceAssignation(entree({
      statutReponses: 'non_rempli',
      maintenant: new Date('2026-03-20T12:00:00'),
    }))).toMatchObject({ raison: 'echeance_non_depassee' });
    // L'expiration prime sur la cadence : la raison à lever est le verrou.
    expect(deciderRelanceAssignation(entree({
      statutReponses: 'non_rempli',
      envoisPrecedents: [{ enregistreLe: new Date('2026-03-25T08:00:00') }],
    }))).toMatchObject({ raison: 'echeance_expiree' });
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

  // L'ORDRE DES REFUS COMPTE : un questionnaire déjà rendu ne doit pas se voir
  // reprocher son absence d'échéance. On ne demande rien à qui a répondu.
  it('le statut prime sur l’échéance', () => {
    expect(deciderRelanceAssignation(entree({ statut: 'Complété', dateLimite: null })))
      .toMatchObject({ raison: 'assignation_rendue' });
  });
});
