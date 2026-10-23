import { describe, expect, it } from 'vitest';
import { ABSTENTION_PROCEDURE_V1 } from '../clinical/priorityRulesV1';
import { Q_MOD_03 } from '../questionnaires/mode-de-vie';
import type { DecisionPriorityCandidate } from './types';
import {
  BESOINS_VISABLES,
  DOMAINES_PRIORITE_LIBRE,
  canoniserBesoinsVises,
  estBesoinsVisesCanoniques,
  estDomainePrioriteLibre,
  estIdentifiantPrioriteLibre,
  isPrioriteLibreOuverte,
  libellePrioriteRetenue,
  normaliserLibellePrioriteLibre,
} from './prioriteLibre';
import { identifiantPrioriteLibre } from './prioriteLibreServeur';

describe('prioriteLibre (D-279)', () => {
  // LA LISTE RANGE COMME LE PATIENT COTE : les sept domaines de Q_MOD_03, dans
  // leur ordre et sous leurs libellés, plus « autre ». Une divergence ferait
  // ranger une priorité sous un domaine que le questionnaire ne connaît pas.
  it('reprend les sept domaines de « Mes plaintes actuelles », plus « autre »', () => {
    const domaines = Q_MOD_03.scoring.domains;
    expect(domaines).toHaveLength(7);
    expect(DOMAINES_PRIORITE_LIBRE.slice(0, -1).map(d => ({ id: d.id, label: d.libelle })))
      .toEqual(domaines.map(d => ({ id: d.id, label: d.label })));
    expect(DOMAINES_PRIORITE_LIBRE.at(-1)?.id).toBe('autre');
  });

  it('ferme la liste des domaines', () => {
    expect(estDomainePrioriteLibre('sommeil')).toBe(true);
    expect(estDomainePrioriteLibre('anxiete')).toBe(false);
    expect(estDomainePrioriteLibre(undefined)).toBe(false);
  });

  // Revue de la PR #1402, P2-4 : le CHECK `~ '\S'` laisse passer selon le ctype
  // un libellé fait d'espaces insécables ou de largeur nulle.
  it('normalise : blancs Unicode repliés, largeur nulle retirée, vide si rien ne reste', () => {
    expect(normaliserLibellePrioriteLibre('  Retrouver\u00A0un   sommeil\treparateur ')).toBe('Retrouver un sommeil reparateur');
    expect(normaliserLibellePrioriteLibre('\u00A0\u202F\u2007')).toBe('');
    expect(normaliserLibellePrioriteLibre('\u200B\u200D\uFEFF\u2060')).toBe('');
    expect(normaliserLibellePrioriteLibre('Do\u200Brmir')).toBe('Dormir');
  });

  it('retire le trait d’union conditionnel, les contrôles bidi et les remplissages', () => {
    expect(normaliserLibellePrioriteLibre('\u00AD\u200E\u200F\u202E\u2066\u3164\u034F')).toBe('');
    expect(normaliserLibellePrioriteLibre('Dor\u202Emir')).toBe('Dormir');
  });

  // Revue Copilot de la PR #1403 : une liste fermée laissait passer ceux-ci.
  it('retire toute la catégorie Cf, les sélecteurs de variante et le blanc braille', () => {
    expect(normaliserLibellePrioriteLibre('\u061C')).toBe('');
    expect(normaliserLibellePrioriteLibre('\uFE0F')).toBe('');
    expect(normaliserLibellePrioriteLibre('\u2800')).toBe('');
    expect(normaliserLibellePrioriteLibre('\u{E0041}\u{E0100}')).toBe('');
    expect(normaliserLibellePrioriteLibre('Dor\u061Cm\uFE0Fi\u2800r')).toBe('Dormir');
    expect(normaliserLibellePrioriteLibre('Do\uFEFFrmir')).toBe('Dormir');
    expect(normaliserLibellePrioriteLibre('Réduire les écarts')).toBe('Réduire les écarts');
  });

  it('dérive un identifiant `libre:<domaine>:<16 hex>`, stable et propre au libellé', () => {
    const id = identifiantPrioriteLibre({ domaine: 'sommeil', libelle: 'Dormir' });
    expect(id).toMatch(/^libre:sommeil:[0-9a-f]{16}$/);
    expect(identifiantPrioriteLibre({ domaine: 'sommeil', libelle: 'Dormir' })).toBe(id);
    expect(identifiantPrioriteLibre({ domaine: 'sommeil', libelle: 'Dormir mieux' })).not.toBe(id);
    expect(estIdentifiantPrioriteLibre(id)).toBe(true);
    expect(estIdentifiantPrioriteLibre('priority:PRIO-SOM-01')).toBe(false);
  });

  // LES BESOINS VISÉS ([[D-338]] §3) : les douze, et pas un de plus — la
  // migration les borne de la même façon (CHECK `besoins_vises_bornes_check`).
  it('offre les douze besoins, de 1 à 12', () => {
    expect([...BESOINS_VISABLES]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('range les besoins visés transmis, et refuse ce qui ne se lit pas', () => {
    expect(canoniserBesoinsVises(undefined)).toEqual([]);
    expect(canoniserBesoinsVises(null)).toEqual([]);
    expect(canoniserBesoinsVises([])).toEqual([]);
    expect(canoniserBesoinsVises([12, 2, 6])).toEqual([2, 6, 12]);
    expect(canoniserBesoinsVises([6, 6])).toBeNull();
    expect(canoniserBesoinsVises([0])).toBeNull();
    expect(canoniserBesoinsVises([13])).toBeNull();
    expect(canoniserBesoinsVises([2.5])).toBeNull();
    expect(canoniserBesoinsVises(['4'])).toBeNull();
    expect(canoniserBesoinsVises([null])).toBeNull();
    expect(canoniserBesoinsVises('4')).toBeNull();
    expect(canoniserBesoinsVises({ 0: 4 })).toBeNull();
  });

  // LA FORME CONSIGNÉE : celle que la carte accepte. `[]` n'en est pas une —
  // aucun besoin visé, c'est la clé absente.
  it('ne tient pour canonique qu’une liste non vide, connue, strictement croissante', () => {
    expect(estBesoinsVisesCanoniques([4])).toBe(true);
    expect(estBesoinsVisesCanoniques([2, 6, 7, 10, 11, 12])).toBe(true);
    expect(estBesoinsVisesCanoniques([])).toBe(false);
    expect(estBesoinsVisesCanoniques([6, 2])).toBe(false);
    expect(estBesoinsVisesCanoniques([6, 6])).toBe(false);
    expect(estBesoinsVisesCanoniques([0, 4])).toBe(false);
    expect(estBesoinsVisesCanoniques(undefined)).toBe(false);
  });

  it('laisse les besoins visés hors de l’identifiant : les changer n’est pas un pivot', () => {
    const sans = identifiantPrioriteLibre({ domaine: 'moral', libelle: 'Retrouver du lien' });
    expect(identifiantPrioriteLibre({ domaine: 'moral', libelle: 'Retrouver du lien', besoinsVises: [12] })).toBe(sans);
  });

  // LA PRIORITÉ POSÉE PASSE SOUS TOUTE ABSTENTION SANS CONSTAT DE SÉCURITÉ —
  // ce qui ne vaut « recueil incomplet seulement » ([[D-279]] §2) que parce que
  // la procédure signée n'a que DEUX motifs. Un motif neuf serait contourné en
  // silence par la priorité posée : il doit rougir ici, et rouvrir D-279.
  // (Revue du code du lot, P2-1.)
  it('ne connaît que deux motifs d’abstention : sécurité et recueil incomplet', () => {
    expect(ABSTENTION_PROCEDURE_V1.motifsRequired.map(motif => motif.id)).toEqual(['ABST-SEC-01', 'ABST-CAN-01']);
  });

  it('n’est fermée que par un constat de sécurité', () => {
    expect(isPrioriteLibreOuverte({ safetyFindingIds: [] })).toBe(true);
    expect(isPrioriteLibreOuverte({ safetyFindingIds: ['SAFETY_1'] })).toBe(false);
    expect(isPrioriteLibreOuverte(null)).toBe(false);
  });

  it('nomme la priorité retenue : libellé du candidat, ou celui du praticien', () => {
    const candidat = {
      candidateId: 'priority:PRIO-SOM-01', label: 'Axe sommeil et rythme circadien',
    } as unknown as DecisionPriorityCandidate;
    const selection = { selectedAt: '2026-01-04T00:00:00.000Z', selectedBy: 'practitioner' as const, rationale: 'Motif.' };
    expect(libellePrioriteRetenue({
      priorityCandidates: [candidat], selectedMainPriority: { ...selection, candidateId: 'priority:PRIO-SOM-01' },
    })).toBe('Axe sommeil et rythme circadien');
    const libre = { domaine: 'autre' as const, libelle: 'Reprendre une activité choisie' };
    expect(libellePrioriteRetenue({
      priorityCandidates: [], selectedMainPriority: { ...selection, candidateId: identifiantPrioriteLibre(libre), libre },
    })).toBe('Reprendre une activité choisie');
    expect(libellePrioriteRetenue({ priorityCandidates: [candidat], selectedMainPriority: null })).toBeNull();
  });
});
