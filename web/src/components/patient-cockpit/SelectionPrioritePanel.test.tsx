// @vitest-environment jsdom
import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectionPrioritePanel } from './SelectionPrioritePanel';
import type { DecisionCard, DecisionPriorityCandidate } from '@/lib/clinical-engine/types';
import { BESOINS } from '@/lib/equilibre/constants';
import { questionnairesCiblesPourPriorite } from '@/lib/protocol/repassationCiblee';

function candidat(over: Partial<DecisionPriorityCandidate> = {}): DecisionPriorityCandidate {
  return {
    candidateId: 'priority:P1',
    origin: 'engine',
    label: 'Axe pondéral',
    rank: 1,
    confidence: 'à_documenter',
    ruleId: 'P1',
    rationale: 'Plainte pondérale dominante.',
    provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
    limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: [],
    ...over,
  };
}

function card(over: Partial<DecisionCard> = {}): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [candidat(), candidat({ candidateId: 'priority:P2', label: 'Axe sommeil', rank: 2, ruleId: 'P2' })],
    proposedMainPriorityId: 'priority:P1', selectedMainPriority: null,
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['P1'], limitations: [] }, limitations: [], inputHash: 'hash',
    ...over,
  };
}

// Les rendus s'ACCUMULENT dans le document (aucun `cleanup` global n'est
// configuré ici) : les requêtes passent donc par `within(container)`, comme le
// banc voisin `ProtocolMiniBuilder.test.tsx`. `screen` trouverait les éléments
// du cas précédent et rendrait « Found multiple elements ».
function rendre(
  over: Partial<DecisionCard> | null = {},
  onRetenir = vi.fn(),
  etat: 'idle' | 'saving' | 'error' = 'idle',
  erreur: string | null = null,
  selectionEcartee = false,
) {
  const decisionCard = over === null ? null : card(over);
  const { container } = render(
    <SelectionPrioritePanel
      decisionCard={decisionCard}
      selectionEcartee={selectionEcartee}
      etat={etat}
      erreur={erreur}
      onRetenir={onRetenir}
    />,
  );
  return { container, ecran: within(container), onRetenir };
}

const PHRASE_PEREMPTION = /Une priorité avait été retenue sur ce dossier/;

describe('SelectionPrioritePanel', () => {
  // LES TROIS SILENCES. Chacun a son propriétaire ailleurs à l'écran : un
  // second bloc répéterait, ou proposerait un choix que le moteur refuserait.
  it('ne rend rien sans carte de décision', () => {
    const { container } = rendre(null);
    expect(container.innerHTML).toBe('');
  });

  it('ne rend rien quand la décision est bloquée par un constat de sécurité', () => {
    const { container } = rendre({ safetyFindingIds: ['SEC-1'] });
    expect(container.innerHTML).toBe('');
  });

  // D-279 §2 — UN CONSTAT DE SÉCURITÉ RETIRE TOUT GESTE, et lui seul.
  it('ne rend rien quand un constat de sécurité est ouvert', () => {
    const { container } = rendre({
      abstention: { status: 'required', ruleIds: ['ABST-SEC-01'], limitations: ['Signal déclaré.'] },
      safetyFindingIds: ['SAFETY_1'],
    });
    expect(container.innerHTML).toBe('');
  });

  // D-279 : SANS CANDIDAT, OU SOUS RECUEIL INCOMPLET, le panneau ne se tait
  // plus — la priorité posée par le praticien est le seul geste, pré-choisi.
  it.each([
    ['aucun candidat classé (table non signée)', { priorityCandidates: [], proposedMainPriorityId: null }],
    ['abstention pour recueil incomplet', {
      priorityCandidates: [], proposedMainPriorityId: null,
      abstention: { status: 'required' as const, ruleIds: ['ABST-CAN-01'], limitations: ['Canal non mesurable.'] },
    }],
  ])('offre de poser la priorité : %s', (_cas, over) => {
    const { ecran, onRetenir } = rendre(over);
    expect(ecran.getByText(/Aucun axe n’est proposé pour ce dossier/)).toBeTruthy();
    expect(ecran.queryByRole('radio')).toBeNull();
    fireEvent.change(ecran.getByLabelText(/Domaine/), { target: { value: 'sommeil' } });
    fireEvent.change(ecran.getByLabelText(/Libellé de la priorité/), { target: { value: 'Retrouver un sommeil réparateur' } });
    fireEvent.change(ecran.getByLabelText(/Pourquoi cette priorité/), { target: { value: '  Le patient le place en tête.  ' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Retenir cette priorité' }));
    expect(onRetenir).toHaveBeenCalledWith(
      { prioriteLibre: { domaine: 'sommeil', libelle: 'Retrouver un sommeil réparateur' } },
      'Le patient le place en tête.',
    );
  });

  it('ferme le bouton tant que domaine et libellé manquent à une priorité posée', () => {
    const { ecran } = rendre({ priorityCandidates: [], proposedMainPriorityId: null });
    fireEvent.change(ecran.getByLabelText(/Pourquoi cette priorité/), { target: { value: 'Motif.' } });
    const bouton = ecran.getByRole('button', { name: 'Retenir cette priorité' }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    fireEvent.change(ecran.getByLabelText(/Domaine/), { target: { value: 'autre' } });
    fireEvent.change(ecran.getByLabelText(/Libellé de la priorité/), { target: { value: '\u00A0\u200B' } });
    expect(bouton.disabled).toBe(true);
  });

  it('à côté des candidats, propose aussi de poser une autre priorité', () => {
    const { ecran, onRetenir } = rendre();
    fireEvent.click(ecran.getByLabelText('Poser une autre priorité'));
    fireEvent.change(ecran.getByLabelText(/Domaine/), { target: { value: 'moral' } });
    fireEvent.change(ecran.getByLabelText(/Libellé de la priorité/), { target: { value: 'Apaiser les soirées' } });
    fireEvent.change(ecran.getByLabelText(/Pourquoi cette priorité/), { target: { value: 'Motif.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Retenir cette priorité' }));
    expect(onRetenir).toHaveBeenCalledWith({ prioriteLibre: { domaine: 'moral', libelle: 'Apaiser les soirées' } }, 'Motif.');
  });

  // D-338 §3 : LES DOUZE BESOINS SONT OFFERTS (arbitrage du 2026-10-22), et
  // l'effet de chaque case se lit avant de cocher — la mention suit le calcul
  // même de la re-passation, pas une liste recopiée.
  it('offre les douze besoins, dit lesquels n’ont rien à re-passer, et transmet les cochés rangés', () => {
    const { ecran, onRetenir } = rendre({ priorityCandidates: [], proposedMainPriorityId: null });
    const sansRepassation = BESOINS.filter(besoin => questionnairesCiblesPourPriorite([besoin.id]).length === 0);
    expect(sansRepassation.length).toBeGreaterThan(0);
    expect(sansRepassation.length).toBeLessThan(12);
    expect(ecran.getAllByRole('checkbox')).toHaveLength(12);
    for (const besoin of BESOINS) {
      const etiquette = ecran.getByText(besoin.libellePraticien).closest('label');
      expect(etiquette?.textContent?.includes('Aucun questionnaire à re-passer pour ce besoin.'))
        .toBe(sansRepassation.includes(besoin));
    }
    fireEvent.change(ecran.getByLabelText(/Domaine/), { target: { value: 'moral' } });
    fireEvent.change(ecran.getByLabelText(/Libellé de la priorité/), { target: { value: 'Retrouver du lien' } });
    const caseDe = (id: number) => ecran.getByText(BESOINS[id - 1].libellePraticien).closest('label')!.querySelector('input')!;
    fireEvent.click(caseDe(12));
    fireEvent.click(caseDe(9));
    fireEvent.click(caseDe(4));
    fireEvent.click(caseDe(4));
    fireEvent.change(ecran.getByLabelText(/Pourquoi cette priorité/), { target: { value: 'Motif.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Retenir cette priorité' }));
    expect(onRetenir).toHaveBeenCalledWith(
      { prioriteLibre: { domaine: 'moral', libelle: 'Retrouver du lien', besoinsVises: [9, 12] } },
      'Motif.',
    );
  });

  it('dit ce qui manque, et pourquoi cela bloque le protocole', () => {
    const { ecran } = rendre();
    expect(ecran.getByText(/Aucune priorité n’est retenue pour l’instant/)).toBeTruthy();
    expect(ecran.getByText(/le protocole 21 jours attend ce choix/)).toBeTruthy();
  });

  // LE RANG ET LE STATUT SONT MONTRÉS : le praticien décide AVEC ou CONTRE le
  // classement du moteur, il ne choisit pas à l'aveugle.
  it('montre chaque candidat avec son rang et son statut de confiance', () => {
    const { ecran } = rendre();
    expect(ecran.getByText('Axe pondéral')).toBeTruthy();
    expect(ecran.getByText('rang 1 · à_documenter')).toBeTruthy();
    expect(ecran.getByText('rang 2 · à_documenter')).toBeTruthy();
  });

  // LE MOTIF EST LA DÉCISION. Le bouton reste fermé tant qu'il manque — la
  // route refuserait de toute façon, mais un refus après coup ferait perdre la
  // saisie.
  it('n’autorise pas l’envoi sans candidat ni motif', () => {
    const { ecran } = rendre();
    const bouton = ecran.getByRole('button', { name: 'Retenir cette priorité' });
    expect((bouton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(ecran.getByLabelText(/Axe pondéral/));
    expect((bouton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(ecran.getByLabelText(/Pourquoi cette priorité/), { target: { value: '   ' } });
    expect((bouton as HTMLButtonElement).disabled).toBe(true);
  });

  it('transmet le candidat et le motif détouré des blancs', () => {
    const { ecran, onRetenir } = rendre();
    fireEvent.click(ecran.getByLabelText(/Axe sommeil/));
    fireEvent.change(ecran.getByLabelText(/Pourquoi cette priorité/), {
      target: { value: '  Réveils nocturnes au premier plan.  ' },
    });
    fireEvent.click(ecran.getByRole('button', { name: 'Retenir cette priorité' }));
    expect(onRetenir).toHaveBeenCalledWith({ candidateId: 'priority:P2' }, 'Réveils nocturnes au premier plan.');
  });

  it('ferme le bouton pendant l’enregistrement et le dit', () => {
    const { ecran } = rendre({}, vi.fn(), 'saving');
    const bouton = ecran.getByRole('button', { name: 'Enregistrement…' });
    expect((bouton as HTMLButtonElement).disabled).toBe(true);
  });

  // LE MESSAGE DU SERVEUR EST LE MESSAGE : il nomme le refus (carte périmée,
  // course concurrente, candidat inconnu). Le remplacer perdrait la seule
  // information utile.
  it('affiche le refus du serveur tel quel, en alerte', () => {
    const { ecran } = rendre({}, vi.fn(), 'error', 'Une autre sélection vient d’être posée sur cette décision.');
    const alerte = ecran.getByRole('alert');
    expect(alerte.textContent).toBe('Une autre sélection vient d’être posée sur cette décision.');
  });

  // LA PÉREMPTION D'UNE SÉLECTION ([[D-127]] §11). La carte servie est celle
  // construite SANS la sélection : elle est indiscernable, ici, de celle d'un
  // dossier où personne n'a jamais choisi. Seul le serveur sait qu'un acte
  // existait, et sans cette phrase il cessait d'être servi en silence.
  describe('quand une sélection consignée a été écartée', () => {
    it('le dit, et dit que rien n’a été effacé', () => {
      const { ecran } = rendre({}, vi.fn(), 'idle', null, true);
      const constat = ecran.getByRole('status');
      expect(constat.textContent).toMatch(PHRASE_PEREMPTION);
      expect(constat.textContent).toMatch(/rien n’a été effacé/);
      // Le geste reste offert : le dossier porte encore des candidats.
      expect(ecran.getByRole('button', { name: 'Retenir cette priorité' })).toBeTruthy();
    });

    // LES SILENCES PORTENT SUR LE GESTE, PAS SUR LE CONSTAT. Une décision
    // bloquée est le cas où la péremption est la PLUS probable (`DC-12` retire
    // les candidats) : s'y taire serait se taire là où il faut parler.
    it('parle même quand la décision est bloquée, sans proposer de choix', () => {
      const { ecran } = rendre({ safetyFindingIds: ['SEC-1'] }, vi.fn(), 'idle', null, true);
      expect(ecran.getByRole('status').textContent).toMatch(PHRASE_PEREMPTION);
      expect(ecran.queryByRole('button')).toBeNull();
      expect(ecran.queryByLabelText(/Pourquoi cette priorité/)).toBeNull();
    });

    // Depuis D-279, sans candidat le geste reste offert, et la phrase parle
    // au-dessus du formulaire de la priorité posée.
    it('parle quand plus aucun candidat n’est classé, au-dessus de la priorité à poser', () => {
      const { ecran } = rendre(
        { priorityCandidates: [], proposedMainPriorityId: null }, vi.fn(), 'idle', null, true,
      );
      expect(ecran.getByRole('status').textContent).toMatch(PHRASE_PEREMPTION);
      expect(ecran.getByLabelText(/Domaine/)).toBeTruthy();
    });

    // Sans carte, il n'y a pas de réponse `ready`, donc pas de drapeau — et le
    // silence tient de toute façon : il n'y a rien à quoi rattacher le constat.
    it('se tait quand même sans carte de décision', () => {
      const { container } = rendre(null, vi.fn(), 'idle', null, true);
      expect(container.innerHTML).toBe('');
    });

    it('ne dit rien de tel quand aucune sélection n’a été écartée', () => {
      const { ecran } = rendre();
      expect(ecran.queryByText(PHRASE_PEREMPTION)).toBeNull();
    });
  });

  describe('quand une priorité est déjà retenue', () => {
    const retenue = {
      selectedMainPriority: {
        candidateId: 'priority:P1',
        selectedAt: '2026-01-02T00:00:00.000Z',
        selectedBy: 'practitioner' as const,
        rationale: 'Plainte dominante pondérale, patient demandeur.',
      },
    };

    // LE MOTIF EST RE-AFFICHÉ, jamais seulement stocké : c'est la moitié de
    // l'acte, et c'est ce qu'on vient relire six semaines plus tard.
    it('montre la priorité retenue ET son motif, sans formulaire ouvert', () => {
      const { ecran } = rendre(retenue);
      expect(ecran.getByText('Axe pondéral')).toBeTruthy();
      expect(ecran.getByText('Plainte dominante pondérale, patient demandeur.')).toBeTruthy();
      expect(ecran.queryByLabelText(/Pourquoi cette priorité/)).toBeNull();
    });

    // CHANGER D'AVIS EST UN ACTE, PAS UNE RATURE : le champ repart VIDE, on ne
    // recycle pas le motif du choix précédent pour justifier le suivant.
    it('rouvre le formulaire avec un motif vierge', () => {
      const { ecran } = rendre(retenue);
      fireEvent.click(ecran.getByRole('button', { name: 'Retenir une autre priorité' }));
      const champ = ecran.getByLabelText(/Pourquoi cette priorité/) as HTMLTextAreaElement;
      expect(champ.value).toBe('');
      expect((ecran.getByRole('button', { name: 'Retenir cette priorité' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('referme le formulaire sans rien transmettre', () => {
      const { ecran, onRetenir } = rendre(retenue);
      fireEvent.click(ecran.getByRole('button', { name: 'Retenir une autre priorité' }));
      fireEvent.click(ecran.getByRole('button', { name: 'Annuler' }));
      expect(ecran.queryByLabelText(/Pourquoi cette priorité/)).toBeNull();
      expect(onRetenir).not.toHaveBeenCalled();
    });
  });

  // D-279 — UNE PRIORITÉ POSÉE DÉJÀ RETENUE se relit avec son domaine, et se
  // change en repartant de ce que le praticien avait écrit.
  describe('quand une priorité posée par le praticien est retenue', () => {
    const libre = { domaine: 'sommeil' as const, libelle: 'Retrouver un sommeil réparateur' };
    const retenue = {
      priorityCandidates: [],
      proposedMainPriorityId: null,
      selectedMainPriority: {
        candidateId: 'libre:sommeil:0123456789abcdef',
        selectedAt: '2026-01-02T00:00:00.000Z',
        selectedBy: 'practitioner' as const,
        rationale: 'Le patient le place en tête.',
        libre,
      },
    };

    it('montre son libellé, son domaine et son motif', () => {
      const { ecran } = rendre(retenue);
      expect(ecran.getByText('Retrouver un sommeil réparateur')).toBeTruthy();
      expect(ecran.getByText(/Priorité posée par le praticien — Sommeil \/ insomnie/)).toBeTruthy();
      expect(ecran.getByText('Le patient le place en tête.')).toBeTruthy();
    });

    it('relit ses besoins visés, et les reprend cochés quand on la change', () => {
      const { ecran } = rendre({
        ...retenue,
        selectedMainPriority: { ...retenue.selectedMainPriority, libre: { ...libre, besoinsVises: [5, 9] } },
      });
      expect(ecran.getByText(
        `Besoins visés : ${BESOINS[4].libellePraticien} · ${BESOINS[8].libellePraticien}`,
      )).toBeTruthy();
      fireEvent.click(ecran.getByRole('button', { name: 'Retenir une autre priorité' }));
      const coches = ecran.getAllByRole('checkbox').filter(entree => (entree as HTMLInputElement).checked);
      expect(coches).toHaveLength(2);
    });

    it('dit, à la relecture, quel besoin visé n’a rien à re-passer', () => {
      const sansRepassation = BESOINS.find(besoin => questionnairesCiblesPourPriorite([besoin.id]).length === 0)!;
      const { ecran } = rendre({
        ...retenue,
        selectedMainPriority: { ...retenue.selectedMainPriority, libre: { ...libre, besoinsVises: [sansRepassation.id] } },
      });
      expect(ecran.getByText(
        `Besoins visés : ${sansRepassation.libellePraticien} (aucun questionnaire à re-passer)`,
      )).toBeTruthy();
    });

    it('prévient, avant le geste, que les modifier après diffusion oblige à rediffuser', () => {
      const { ecran } = rendre({ priorityCandidates: [], proposedMainPriorityId: null });
      expect(ecran.getByText(/oblige à le\s+diffuser de nouveau/)).toBeTruthy();
    });

    it('la changer repart du domaine et du libellé écrits', () => {
      const { ecran } = rendre(retenue);
      fireEvent.click(ecran.getByRole('button', { name: 'Retenir une autre priorité' }));
      expect((ecran.getByLabelText(/Domaine/) as HTMLSelectElement).value).toBe('sommeil');
      expect((ecran.getByLabelText(/Libellé de la priorité/) as HTMLInputElement).value).toBe('Retrouver un sommeil réparateur');
    });
  });
});
