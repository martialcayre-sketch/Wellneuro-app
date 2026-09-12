import { describe, expect, it } from 'vitest';
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
