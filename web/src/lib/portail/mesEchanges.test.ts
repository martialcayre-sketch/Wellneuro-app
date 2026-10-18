import { describe, expect, it } from 'vitest';
import { entreesMesEchanges, regrouperParJour, type SourcesMesEchanges } from './mesEchanges';

// « Mes échanges » ([[D-293]]) : une liste datée, le plus récent en haut, où
// chaque ligne dit qui a agi et ouvre la page qui porte l'élément.

function sources(over: Partial<SourcesMesEchanges> = {}): SourcesMesEchanges {
  return {
    bilan: null,
    fiches: [],
    lettre: null,
    protocole: null,
    questionnaires: [],
    comptesRendus: [],
    signalements: [],
    ...over,
  };
}

describe('entreesMesEchanges', () => {
  it('rien de remis ni de transmis : un journal vide', () => {
    expect(entreesMesEchanges(sources())).toEqual([]);
  });

  it('chaque espèce a son sens, son objet et sa page', () => {
    const entrees = entreesMesEchanges(
      sources({
        bilan: { id: 'env_1', envoyeLe: new Date('2026-10-01T08:00:00Z') },
        fiches: [{ idRemise: 'rem 1', libelle: 'Petit-déjeuner', remiseLe: new Date('2026-10-02T08:00:00Z') }],
        lettre: { id: 'let_1', remiseLe: new Date('2026-10-03T08:00:00Z') },
        protocole: { approbationId: 'app_1', approuveLe: new Date('2026-10-04T08:00:00Z') },
        questionnaires: [
          { idAssignation: 'ASS_1', titre: 'Enquête alimentaire', transmisLe: new Date('2026-10-05T08:00:00Z') },
        ],
        comptesRendus: [{ deposeLe: new Date('2026-10-06T08:00:00Z') }],
        signalements: [
          { categorie: 'demande_droit', statutTraitement: 'traite', soumisLe: new Date('2026-10-07T08:00:00Z') },
        ],
      }),
    );
    expect(entrees.map(e => [e.sens, e.objet, e.chemin])).toEqual([
      ['transmis', 'Signalement — Demande de droit · Traité', 'informations'],
      ['transmis', 'Compte rendu d’analyses', 'comptes-rendus'],
      ['transmis', 'Questionnaire « Enquête alimentaire »', 'questionnaires/ASS_1'],
      ['remis', 'Votre protocole', 'questionnaires'],
      ['remis', 'Le courrier pour votre médecin', 'courrier-medecin'],
      ['remis', 'Votre fiche — Petit-déjeuner', 'fiches/rem%201'],
      ['remis', 'Votre bilan', 'bilan'],
    ]);
  });

  it('le plus récent en haut, remis et transmis mêlés ; à instant égal, l’ordre est stable', () => {
    const meme = new Date('2026-10-05T08:00:00Z');
    const entrees = entreesMesEchanges(
      sources({
        bilan: { id: 'env_1', envoyeLe: meme },
        questionnaires: [{ idAssignation: 'ASS_1', titre: 'A', transmisLe: meme }],
        lettre: { id: 'let_1', remiseLe: new Date('2026-10-09T08:00:00Z') },
      }),
    );
    expect(entrees.map(e => e.cle)).toEqual(['lettre_adressage:let_1', 'bilan:env_1', 'questionnaire:ASS_1']);
  });

  it('un statut ou une catégorie inconnus ne fabriquent pas de mot', () => {
    const [entree] = entreesMesEchanges(
      sources({ signalements: [{ categorie: 'autre', statutTraitement: 'bizarre', soumisLe: new Date() }] }),
    );
    expect(entree.objet).toBe('Signalement — Signalement');
  });

  it('les clés sont uniques, même pour deux signalements ou comptes rendus du même instant', () => {
    const t = new Date('2026-10-05T08:00:00Z');
    const entrees = entreesMesEchanges(
      sources({
        comptesRendus: [{ deposeLe: t }, { deposeLe: t }],
        signalements: [
          { categorie: 'demande_droit', statutTraitement: 'recu', soumisLe: t },
          { categorie: 'demande_droit', statutTraitement: 'recu', soumisLe: t },
        ],
      }),
    );
    expect(new Set(entrees.map(e => e.cle)).size).toBe(entrees.length);
  });

  it('aucune ligne ne parle de lecture, de réponse du praticien ni de messagerie', () => {
    const entrees = entreesMesEchanges(
      sources({
        bilan: { id: 'env_1', envoyeLe: new Date() },
        signalements: [{ categorie: 'effet_indesirable', statutTraitement: 'clos', soumisLe: new Date() }],
      }),
    );
    const texte = entrees.map(e => e.objet).join(' ');
    expect(texte).not.toMatch(/\blu\b|lecture|réponse|message|e-mail/i);
  });
});

describe('regrouperParJour', () => {
  it('groupe par jour civil en heure de Paris, dans l’ordre reçu', () => {
    const entrees = entreesMesEchanges(
      sources({
        // 23 h 30 UTC le 17 = 1 h 30 à Paris le 18 : même jour que l'autre.
        bilan: { id: 'env_1', envoyeLe: new Date('2026-10-17T23:30:00Z') },
        lettre: { id: 'let_1', remiseLe: new Date('2026-10-18T09:00:00Z') },
        questionnaires: [{ idAssignation: 'ASS_1', titre: 'A', transmisLe: new Date('2026-10-12T09:00:00Z') }],
      }),
    );
    const jours = regrouperParJour(entrees);
    expect(jours.map(j => [j.jour, j.libelle, j.entrees.length])).toEqual([
      ['2026-10-18', '18 octobre 2026', 2],
      ['2026-10-12', '12 octobre 2026', 1],
    ]);
  });
});
