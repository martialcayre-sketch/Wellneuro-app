// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildValidationErgoC1Fixture } from '@/lib/clinical-engine/validationErgoFixture';
import type { DecisionCard } from '@/lib/clinical-engine/types';
import { DecisionSummaryCard } from './DecisionSummaryCard';
import {
  ATTESTATION_CLASSEMENT,
  LIMITATIONS_CANDIDAT,
  PORTEE_ATTESTATION,
  attestationValide,
} from '@/lib/clinical/perimetreClassementV1';

// LOT-05 « Doctrine exécutable » — LE BANC QUE LE LOT-04 A PAYÉ ([[D-101]]).
//
// La revue du LOT-04 a trouvé son vrai défaut à l'écran, pas au moteur : les
// textes qui distinguent deux motifs d'abstention étaient calculés, entraient
// dans l'empreinte de la carte, arrivaient au navigateur — et AUCUN composant
// ne les rendait. Six dossiers sur vingt-cinq seraient passés en écran muet.
//
// Le motif de la gate de population est dans la même position exacte : il vit
// sur `candidat.limitations`, et `buildDecisionCard` n'agrège PAS les
// limitations des candidats dans `decisionCard.limitations`. Sans ce banc, un
// axe dont personne n'a jamais vérifié la population s'afficherait comme un axe
// vérifié — c'est-à-dire que tout le lot serait invisible.

afterEach(cleanup);

const MOTIF_NON_CURE =
  'Proposé — les exclusions de population de cet axe ne sont pas curées :'
  + ' aucune source ne dit qui il ne couvre pas. L’absence d’exclusion déclarée'
  + ' ne vaut pas absence d’exclusion.';

function carteAvecLimitationCandidat(limitation: string): DecisionCard {
  const { decisionCard } = buildValidationErgoC1Fixture();
  const [premier, ...reste] = decisionCard.priorityCandidates;
  return {
    ...decisionCard,
    proposedMainPriorityId: premier.candidateId,
    priorityCandidates: [
      { ...premier, limitations: [...premier.limitations, limitation] },
      ...reste,
    ],
  };
}

/** Le détail vit derrière `TwoLevelReading` : il faut l'ouvrir pour le lire. */
function ouvrirLeDetail(): void {
  const bouton = screen.getByText(/Voir les sources et limites/i);
  fireEvent.click(bouton);
}

describe('DecisionSummaryCard — le motif de la gate atteint l’écran', () => {
  it('la limitation du candidat affiché est rendue', () => {
    render(<DecisionSummaryCard decisionCard={carteAvecLimitationCandidat(MOTIF_NON_CURE)} />);
    ouvrirLeDetail();
    expect(screen.getByText(MOTIF_NON_CURE)).toBeTruthy();
  });

  // CONTRE-ÉPREUVE. Le banc doit distinguer « rendu » de « présent dans
  // l'objet » : une limitation qui n'est sur AUCUN candidat affiché ne doit pas
  // apparaître, sans quoi l'assertion ci-dessus serait vraie pour de mauvaises
  // raisons (par exemple si le composant sérialisait la carte entière).
  it('une limitation portée par un autre candidat que celui affiché n’est pas rendue', () => {
    const { decisionCard } = buildValidationErgoC1Fixture();
    const [premier, second, ...reste] = decisionCard.priorityCandidates;
    const carte: DecisionCard = {
      ...decisionCard,
      proposedMainPriorityId: premier.candidateId,
      priorityCandidates: [
        premier,
        { ...second, limitations: [...second.limitations, 'MOTIF-DU-SECOND-CANDIDAT'] },
        ...reste,
      ],
    };
    render(<DecisionSummaryCard decisionCard={carte} />);
    ouvrirLeDetail();
    expect(screen.queryByText('MOTIF-DU-SECOND-CANDIDAT')).toBeNull();
  });

  it('les limitations de la carte et celles du candidat coexistent, sans doublon', () => {
    const carte = carteAvecLimitationCandidat(MOTIF_NON_CURE);
    const commune = carte.limitations[0];
    const avecDoublon: DecisionCard = {
      ...carte,
      priorityCandidates: [
        { ...carte.priorityCandidates[0], limitations: [MOTIF_NON_CURE, commune] },
        ...carte.priorityCandidates.slice(1),
      ],
    };
    render(<DecisionSummaryCard decisionCard={avecDoublon} />);
    ouvrirLeDetail();
    if (commune) expect(screen.getAllByText(commune)).toHaveLength(1);
    expect(screen.getByText(MOTIF_NON_CURE)).toBeTruthy();
  });

  // ── Signé et non signé ne se lisent plus dans la même liste ───────────────

  describe('DEUX GROUPES PAR PROVENANCE (arbitrage du 2026-09-10)', () => {
    // Une seule liste dédoublonnée mêlait ce que la RÈGLE RELUE dit et ce que le
    // MOTEUR ajoute. `PRIORITY_RULES_SHA256` porte sur la table des règles et la
    // procédure d'abstention — pas sur `lib/clinical-engine`, où vivent le
    // producteur, les quatre `LIMITATION_*` et le motif de la gate. Le praticien
    // lisait du relu et du non relu sans que rien ne les distingue.
    const carteAvecLimitations = (
      limitations: string[] = ['CE QUE LA RÈGLE DIT.', 'CE QUE LE MOTEUR AJOUTE.'],
    ): DecisionCard => ({
      decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
      reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
      version: 'c1-decision-card-v1', status: 'draft',
      priorityCandidates: [{
        candidateId: 'p1', origin: 'engine', label: 'Axe digestif', rank: 1,
        confidence: 'à_documenter', ruleId: 'PRIO-DIG-01', rationale: 'Fixture.',
        provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
        limitations,
        limitationsRegleSignee: ['CE QUE LA RÈGLE DIT.'], limitationsPerimetreClassement: [],
      }],
      proposedMainPriorityId: 'p1', selectedMainPriority: null, counterfactuals: [],
      missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
      abstention: { status: 'not_required', ruleIds: ['PRIO-DIG-01'], limitations: ['CADRE SIGNÉ.'] },
      limitations: [], inputHash: 'card-hash',
    });

    /** Une carte dont le seul texte « moteur » est celui qu'on veut éprouver. */
    const carteAvecLimitation = (texte: string): DecisionCard =>
      carteAvecLimitations(['CE QUE LA RÈGLE DIT.', texte]);

    it('les deux intitulés de provenance sont rendus', () => {
      render(<DecisionSummaryCard decisionCard={carteAvecLimitations()} />);
      fireEvent.click(screen.getByText(/Voir les sources et limites/));
      expect(screen.getByText('Limitations de la règle')).not.toBeNull();
      expect(screen.getByText(/Ajoutées par le moteur/)).not.toBeNull();
      // L'INTITULÉ DIT L'ESSENTIEL, et il est factuel : sans « hors périmètre
      // signé », le regroupement se lirait comme un rangement de confort.
      expect(screen.getByText(/hors périmètre signé/)).not.toBeNull();
    });

    /** L'intitulé du groupe qui contient ce texte. */
    const groupeDe = (texte: string): string =>
      screen.getByText(texte).closest('ul')?.previousElementSibling?.textContent ?? '';

    it('LA PROVENANCE VIENT DU PRODUCTEUR, JAMAIS DU LIBELLÉ — le cas de collision', () => {
      // LE DÉFAUT QUE CE CAS INTERDIT, et il a existé. Une première rédaction
      // groupait par ÉGALITÉ DE CHAÎNE avec `LIMITATIONS_CANDIDAT` : un motif de
      // gate portant le même libellé qu'un texte attesté s'affichait « relu ».
      // Un comportement que personne n'a relu héritait de la provenance
      // attestée, sans qu'aucun sha ne bouge. Le contrat de
      // `limitationsRegleSignee` l'interdisait déjà en toutes lettres.
      //
      // ICI LES DEUX TEXTES SONT IDENTIQUES AU CARACTÈRE PRÈS, et un seul est
      // déclaré du périmètre. C'est le producteur qui tranche, pas la chaîne.
      const collision = LIMITATIONS_CANDIDAT.classement.texte;
      const carte = carteAvecLimitations(['CE QUE LA RÈGLE DIT.', collision]);
      // Le producteur ne déclare RIEN du périmètre : ce texte est un motif de
      // gate qui porte le même libellé.
      carte.priorityCandidates[0].limitationsPerimetreClassement = [];
      render(<DecisionSummaryCard decisionCard={carte} />);
      fireEvent.click(screen.getByText(/Voir les sources et limites/));
      expect(groupeDe(collision)).toContain('hors périmètre signé');
      expect(groupeDe(collision)).not.toContain('relu');
    });

    it('UN TEXTE HORS PÉRIMÈTRE RESTE « hors périmètre signé »', () => {
      const carte = carteAvecLimitations(['CE QUE LA RÈGLE DIT.', 'MOTIF DE GATE, RELU PAR PERSONNE.']);
      carte.priorityCandidates[0].limitationsPerimetreClassement = [];
      render(<DecisionSummaryCard decisionCard={carte} />);
      fireEvent.click(screen.getByText(/Voir les sources et limites/));
      expect(groupeDe('MOTIF DE GATE, RELU PAR PERSONNE.')).toContain('hors périmètre signé');
    });

    it('SANS ATTESTATION, RIEN N’EST PRÉSENTÉ COMME RELU — même déclaré du périmètre', () => {
      // L'ÉCRAN LIT L'ATTESTATION, il ne recopie pas son résultat. Tant qu'elle
      // est retirée, un texte pourtant déclaré du périmètre par le producteur
      // reste dans le groupe non relu. C'est ce qui rend le retrait effectif à
      // l'écran sans qu'on ait à y toucher.
      const duPerimetre = LIMITATIONS_CANDIDAT.proposition.texte;
      const carte = carteAvecLimitations(['CE QUE LA RÈGLE DIT.', duPerimetre]);
      carte.priorityCandidates[0].limitationsPerimetreClassement = [duPerimetre];
      render(<DecisionSummaryCard decisionCard={carte} />);
      fireEvent.click(screen.getByText(/Voir les sources et limites/));
      // LE PRÉDICAT EST `attestationValide`, PAS `relu` — et cette ligne-ci a
      // été écrite deux fois. La première branchait sur le seul booléen : sous
      // une attestation PÉRIMÉE (`relu: true`, sha d'un périmètre antérieur),
      // ce cas partait dans la branche « relu » et rougissait, alors que
      // l'écran faisait exactement ce qu'il devait — retomber hors périmètre.
      // Un banc qui rougit pour la mauvaise raison envoie chercher le défaut
      // ailleurs. Vérifié par mutation le 2026-09-16.
      if (!attestationValide(ATTESTATION_CLASSEMENT)) {
        expect(groupeDe(duPerimetre)).toContain('hors périmètre signé');
      } else {
        expect(groupeDe(duPerimetre)).toContain(PORTEE_ATTESTATION.intituleEcran);
      }
    });

    it('CHAQUE TEXTE TOMBE DANS SON GROUPE — le cadre d’abstention est signé', () => {
      const { container } = render(<DecisionSummaryCard decisionCard={carteAvecLimitations()} />);
      fireEvent.click(screen.getByText(/Voir les sources et limites/));
      const listes = container.querySelectorAll('ul');
      const groupes = [...listes].map((ul) => [...ul.querySelectorAll('li')].map((li) => li.textContent));
      const regle = groupes.find((g) => g.includes('CE QUE LA RÈGLE DIT.'));
      const moteur = groupes.find((g) => g.includes('CE QUE LE MOTEUR AJOUTE.'));
      expect(regle).toContain('CADRE SIGNÉ.');
      expect(regle).not.toContain('CE QUE LE MOTEUR AJOUTE.');
      expect(moteur).not.toContain('CE QUE LA RÈGLE DIT.');
    });

    it('FAIL-SAFE : un texte qu’on ne sait pas rattacher tombe du côté NON signé', () => {
      // Sous-promettre plutôt que sur-promettre. Un texte inconnu du groupe
      // signé ne doit jamais hériter de sa couverture par défaut.
      const carte = carteAvecLimitations();
      carte.priorityCandidates[0].limitations = [...carte.priorityCandidates[0].limitations, 'TEXTE ORPHELIN.'];
      const { container } = render(<DecisionSummaryCard decisionCard={carte} />);
      fireEvent.click(screen.getByText(/Voir les sources et limites/));
      const groupes = [...container.querySelectorAll('ul')].map((ul) =>
        [...ul.querySelectorAll('li')].map((li) => li.textContent));
      const moteur = groupes.find((g) => g.includes('CE QUE LE MOTEUR AJOUTE.'));
      expect(moteur).toContain('TEXTE ORPHELIN.');
    });
  });

  // LA PROVENANCE DU CANDIDAT ATTEINT L'ÉCRAN.
  //
  // Même position exacte que les limitations d'abstention avant le LOT-05 :
  // `provenance.responseIds` est calculée, validée contre le snapshot (la
  // construction JETTE si un identifiant y est absent), hachée dans l'empreinte
  // et servie au navigateur sur CHAQUE candidat — et rendue par aucun
  // composant. `DC-34` exige que le praticien puisse ouvrir « quelles données
  // patient » ; `DC-01` fait de la chaîne observation → instrument une part de
  // ce qui valide la sortie.
  describe('les passations qui fondent le candidat', () => {
    function carteEtReleve() {
      const { decisionCard, snapshot } = buildValidationErgoC1Fixture();
      return {
        carte: { ...decisionCard, proposedMainPriorityId: decisionCard.priorityCandidates[0].candidateId },
        sourceRefs: snapshot.sourceRefs,
      };
    }

    it('l’instrument et la date du relevé sont rendus', () => {
      const { carte, sourceRefs } = carteEtReleve();
      render(<DecisionSummaryCard decisionCard={carte} sourceRefs={sourceRefs} />);
      ouvrirLeDetail();

      expect(screen.getByText('Passations qui fondent ce candidat')).toBeTruthy();
      expect(screen.getByText('Q_SOM_06 · 01/07/2026')).toBeTruthy();
    });

    it('le titre dit « ce candidat », jamais « cet argument »', () => {
      // Le candidat porte UN `rationale` monolithique et UN jeu de
      // `responseIds` dédupliqué : il n'existe pas de provenance par argument
      // côté déterministe, et en suggérer une serait un maillon FAUX — ce que
      // `DC-01` sanctionne plus lourdement qu'un maillon absent.
      const { carte, sourceRefs } = carteEtReleve();
      const { container } = render(<DecisionSummaryCard decisionCard={carte} sourceRefs={sourceRefs} />);
      ouvrirLeDetail();

      expect(container.textContent).not.toMatch(/fondent cet argument/i);
    });

    it('une source absente du relevé est DITE, pas élidée', () => {
      // Taire une source qu'on n'a pas su retrouver ferait passer une chaîne
      // trouée pour une chaîne complète.
      const { carte } = carteEtReleve();
      render(<DecisionSummaryCard decisionCard={carte} sourceRefs={[]} />);
      ouvrirLeDetail();

      expect(screen.getByText('Source non retrouvée au relevé de l’épisode')).toBeTruthy();
    });

    it('sans relevé fourni, la carte reste lisible', () => {
      // La prop est facultative : la carte se rend seule depuis toujours, et une
      // provenance qu'on ne sait pas traduire ne doit pas empêcher de lire la
      // priorité.
      const { carte } = carteEtReleve();
      render(<DecisionSummaryCard decisionCard={carte} />);
      ouvrirLeDetail();

      expect(screen.getByText('Passations qui fondent ce candidat')).toBeTruthy();
    });

    it('aucun claim n’est servi sous le candidat', () => {
      // `D-093` amendé par `D-163` : peindre des claims VALIDE sous un candidat
      // dont la sélection et le rang ne sont pas signés attacherait une
      // provenance certifiée à un acte qui ne l'est pas.
      const { carte, sourceRefs } = carteEtReleve();
      const { container } = render(<DecisionSummaryCard decisionCard={carte} sourceRefs={sourceRefs} />);
      ouvrirLeDetail();

      expect(container.textContent).not.toMatch(/WN-CL-/);
      expect(container.textContent).not.toMatch(/claim/i);
    });
  });

});
