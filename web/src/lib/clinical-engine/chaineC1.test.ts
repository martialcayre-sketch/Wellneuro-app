import { afterEach, describe, expect, it, vi } from 'vitest';

// `orientationService` instancie un client Prisma au chargement : la chaîne C1
// lui emprunte ses cinq fermetures de recalcul, pas sa base.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { construireChaineC1 } from './chaineC1';
import { confirmAssessmentEpisode } from './assessmentEpisode';
import { adaptRuntimeInputs, proposeRuntimeEpisode } from './runtimeFromPrisma';
import {
  DATE_RIDEAU_FIXTURE,
  PLAINTES_DIGESTIF_ET_PONDERAL,
  reponsesRuntimeRideauT0,
} from './dossierT0Fixture';
import { PRIORITY_RULES_METADATA, PRIORITY_RULES_V1 } from '@/lib/clinical/priorityRulesV1';

// CAS DE RÉFÉRENCE DU LOT-04 ([[D-054]]). Ce banc éprouve la chaîne dans les
// DEUX positions du verrou : table non signée — ce que la production sert
// aujourd'hui — et table signée, ce que la signature praticien déclenchera.
// Éprouver la seule position ouverte laisserait le merge sans banc.

const HORODATAGE = '2026-01-03T00:00:00.000Z';
const PATIENT = 'PAT_TEST';

function simulerSignature(): void {
  PRIORITY_RULES_METADATA.validationExterne = true;
  PRIORITY_RULES_METADATA.dateValidation = '2026-08-12T00:00:00.000Z';
}

afterEach(() => {
  PRIORITY_RULES_METADATA.validationExterne = false;
  PRIORITY_RULES_METADATA.dateValidation = null;
});

function chaine(options: {
  plaintes?: Record<string, number>;
  exclure?: string[];
  objectif?: string | null;
} = {}) {
  const lignes = reponsesRuntimeRideauT0(
    DATE_RIDEAU_FIXTURE,
    options.plaintes ?? PLAINTES_DIGESTIF_ET_PONDERAL,
  );
  const inputs = adaptRuntimeInputs(
    { idPatient: PATIENT, createdAt: DATE_RIDEAU_FIXTURE },
    lignes,
    {
      anamnese: {
        motif_principal: 'Ballonnements et prise de poids depuis un an.',
        ...(options.objectif === null ? {} : { objectif_prioritaire: options.objectif ?? 'Retrouver un confort digestif' }),
      },
    },
  );
  const { proposal } = proposeRuntimeEpisode(inputs, 'T0');
  const exclus = new Set(options.exclure ?? []);
  const episode = confirmAssessmentEpisode(
    proposal,
    proposal.inWindowResponseIds.filter(id => !exclus.has(id)),
    HORODATAGE,
  );
  return construireChaineC1({
    snapshotId: 'snapshot-fixture',
    reviewId: 'review-fixture',
    decisionCardId: 'decision-fixture',
    patientId: PATIENT,
    horodatage: HORODATAGE,
    episode,
    patientContext: inputs.patientContext,
    responses: inputs.responses,
    selectionPraticien: null,
  });
}

describe('chaîne C1 — table NON signée (production d’aujourd’hui)', () => {
  it('l’abstention reste non évaluée et aucune priorité n’est produite', () => {
    const { review, decisionCard } = chaine();
    expect(review.rules).toEqual([]);
    expect(review.abstention.status).toBe('not_evaluated');
    expect(review.abstention.limitations).toContain(
      'Aucune règle d’abstention cliniquement validée n’est fournie.',
    );
    expect(decisionCard.priorityCandidates).toEqual([]);
    expect(decisionCard.proposedMainPriorityId).toBeNull();
    expect(decisionCard.selectedMainPriority).toBeNull();
    expect(decisionCard.limitations).toContain(
      'Aucune priorité ne peut être proposée avant une évaluation explicite de l’abstention et la revue des bloqueurs.',
    );
  });

  // LA PLAINTE N'EST PAS DERRIÈRE LE VERROU ([[D-054]], arbitrage 7) : elle
  // restitue une bande publiée par un instrument certifié, pas une sortie de
  // règle. Sans ce cas, on ne saurait pas que le lot livre quelque chose de
  // visible au merge.
  it('la plainte dominante est servie même table non signée', () => {
    expect(chaine().plainteDominante).toEqual({
      domaine: 'surpoids', libelle: 'Surpoids', valeur: 9, bande: 'Intensité très élevée',
    });
  });
});

describe('chaîne C1 — cas de référence, table signée', () => {
  it('produit deux priorités candidates, chacune adossée à des claims', () => {
    simulerSignature();
    const { decisionCard, review } = chaine();
    const claimsParRegle = new Map(PRIORITY_RULES_V1.map(regle => [regle.id, regle.justificationClaims]));

    expect(decisionCard.priorityCandidates.length).toBeGreaterThanOrEqual(2);
    for (const candidat of decisionCard.priorityCandidates) {
      // AUCUN CANDIDAT SANS CLAIM — interdit explicite du lot.
      expect(claimsParRegle.get(candidat.ruleId)?.length ?? 0).toBeGreaterThan(0);
      // AUCUN CANDIDAT PRODUIT PAR LE LLM — l'autre interdit.
      expect(candidat.origin).toBe('engine');
      // Chaque candidat s'adosse à une règle CLINIQUEMENT VALIDÉE de la revue.
      const regle = review.rules.find(r => r.ruleId === candidat.ruleId);
      expect(regle?.lifecycle).toBe('clinically_validated');
      expect(candidat.rationale).toContain('Q_MOD_03');
      expect(candidat.limitations).toContain(
        'Une priorité candidate est une proposition hiérarchisée soumise au praticien : elle n’est ni un diagnostic, ni une prescription.',
      );
    }
    // Rangs uniques et contigus : la garde de `buildDecisionCard` jetterait
    // sinon, et un rang dupliqué est le mode de panne d'un classement dérivé
    // d'une priorité intrinsèque.
    expect(decisionCard.priorityCandidates.map(c => c.rank)).toEqual([1, 2]);
  });

  // LA PLAINTE DOMINANTE COMMANDE LE CLASSEMENT. Sans elle, `PRIO-DIG-01`
  // (priorité intrinsèque 1) sortirait en tête ; le patient déclare son surpoids
  // à 9 et sa digestion à 8, et c'est le pondéral qui remonte. Inverser les deux
  // valeurs fait rougir ce cas.
  it('la plainte dominante remonte en tête du classement', () => {
    simulerSignature();
    const { decisionCard, plainteDominante } = chaine();
    expect(plainteDominante?.domaine).toBe('surpoids');
    expect(decisionCard.priorityCandidates[0].ruleId).toBe('PRIO-PON-01');
    expect(decisionCard.priorityCandidates[1].ruleId).toBe('PRIO-DIG-01');
    expect(decisionCard.proposedMainPriorityId).toBe(decisionCard.priorityCandidates[0].candidateId);
    // PROPOSÉE, JAMAIS SÉLECTIONNÉE : la sélection reste un geste praticien.
    expect(decisionCard.selectedMainPriority).toBeNull();
  });

  it('la plainte la plus intense change le classement quand elle change d’axe', () => {
    simulerSignature();
    const { decisionCard, plainteDominante } = chaine({
      plaintes: { ...PLAINTES_DIGESTIF_ET_PONDERAL, Q003: 10, Q004: 7 },
    });
    expect(plainteDominante?.domaine).toBe('digestion');
    expect(decisionCard.priorityCandidates[0].ruleId).toBe('PRIO-DIG-01');
  });

  it('l’abstention est évaluée explicitement et motivée', () => {
    simulerSignature();
    const { review, decisionCard } = chaine();
    expect(review.abstention.status).toBe('not_required');
    expect(review.abstention.ruleIds).toEqual(['PRIO-DIG-01', 'PRIO-PON-01']);
    expect(review.abstention.limitations.join(' ')).toContain('aucun motif d’abstention');
    expect(decisionCard.abstention.status).toBe('not_required');
  });

  // `validateProvenance` jette sur une source absente du snapshot : ce cas dit
  // que la provenance produite est réellement ancrée, et pas seulement acceptée.
  it('la provenance d’un candidat ne cite que des sources du snapshot', () => {
    simulerSignature();
    const { decisionCard, snapshot } = chaine();
    const sources = new Set(snapshot.sourceRefs.map(source => source.responseId));
    const besoins = new Set(snapshot.balanceAssessment.needs.map(besoin => besoin.needId));
    for (const candidat of decisionCard.priorityCandidates) {
      expect(candidat.provenance.responseIds.length).toBeGreaterThan(0);
      for (const responseId of candidat.provenance.responseIds) expect(sources).toContain(responseId);
      for (const needId of candidat.provenance.needIds) expect(besoins).toContain(needId);
    }
  });

  // CRITÈRE DU LOT, ET ÉCART ASSUMÉ ([[D-054]], arbitrage 4). « Stress au mieux
  // mineur » est tenu PAR CONSTRUCTION : la V1 ne porte aucune règle d'axe
  // stress, et aucun pont ne relie les règles d'arrêt aux priorités. Le banc le
  // dit plutôt que de laisser croire à un mécanisme.
  it('aucun candidat d’axe stress ne peut être produit', () => {
    simulerSignature();
    const { decisionCard } = chaine();
    for (const candidat of decisionCard.priorityCandidates) {
      expect(candidat.ruleId).not.toMatch(/STR/);
      expect(candidat.label.toLowerCase()).not.toContain('stress');
    }
    expect(PRIORITY_RULES_V1.some(regle => regle.id.includes('STR'))).toBe(false);
  });

  // DC-24 — le canal de plainte hors épisode ne devient pas une normalité : la
  // table ne peut RIEN évaluer, et l'abstention le dit.
  it('canal de plainte non mesurable ⇒ abstention requise et zéro candidat', () => {
    simulerSignature();
    const { review, decisionCard, plainteDominante } = chaine({ exclure: ['REP_Q_MOD_03'] });
    expect(plainteDominante).toBeNull();
    expect(review.abstention.status).toBe('required');
    expect(review.abstention.limitations.join(' ')).toContain('Q_MOD_03');
    expect(decisionCard.priorityCandidates).toEqual([]);
    expect(decisionCard.proposedMainPriorityId).toBeNull();
  });

  // DONNÉES INSUFFISANTES ⇒ ON RÉDUIT LA CONCLUSION (`DC-25`) — relevé en revue
  // le 2026-08-12.
  //
  // LE CAS EXACT, ET IL N'EST PAS THÉORIQUE : `Q_MOD_03` amputé d'UN SEUL
  // domaine rend `total: null` — le canal est déclaré non mesurable, donc
  // l'abstention est `required` — alors que les six domaines répondus portent
  // encore leurs valeurs et déclencheraient les deux règles. Avant le
  // correctif, la carte servait une liste hiérarchisée sous un bandeau de
  // suspension : `buildDecisionCard` remettait bien la priorité PROPOSÉE à
  // `null`, mais gardait les candidats classés.
  it('abstention requise sur un recueil partiel ⇒ zéro candidat, malgré des domaines déclenchants', () => {
    simulerSignature();
    const { review, decisionCard, plainteDominante } = chaine({
      // Digestion à 8 et surpoids à 9 sont bien là ; la mobilité manque.
      plaintes: { Q001: 2, Q002: 2, Q003: 8, Q004: 9, Q005: 2, Q006: 2 },
    });
    // La plainte reste AFFICHABLE — elle restitue des bandes réellement
    // publiées —, mais elle ne fonde aucune priorité.
    expect(plainteDominante?.domaine).toBe('surpoids');
    expect(review.abstention.status).toBe('required');
    expect(decisionCard.priorityCandidates).toEqual([]);
    expect(decisionCard.proposedMainPriorityId).toBeNull();
    expect(decisionCard.limitations).toContain(
      'Aucune priorité ne peut être proposée avant une évaluation explicite de l’abstention et la revue des bloqueurs.',
    );
  });

  // Le texte de l'abstention DIT L'ÉTAT DU DISPOSITIF, pas l'état du patient :
  // aucun producteur de constat de sécurité déterministe n'existe, et affirmer
  // « aucun constat de sécurité n'est présent » servirait l'absence d'un
  // contrôle comme le résultat d'un contrôle (`DC-24`).
  it('l’abstention ne présente jamais un contrôle absent comme un contrôle passé', () => {
    simulerSignature();
    const motifs = chaine().review.abstention.limitations.join(' ');
    expect(motifs).toContain('aucun producteur n’existe à ce jour');
    expect(motifs).not.toContain('Aucun constat de sécurité n’est présent');
  });

  // L'objectif prioritaire du patient s'exprime en LIMITATION, jamais en
  // provenance ([[D-054]], arbitrage 3) : ce n'est pas une mesure, et son texte
  // n'entre pas dans la carte persistée.
  it('l’objectif prioritaire est signalé sans jamais entrer dans la provenance', () => {
    simulerSignature();
    const avec = chaine();
    const sans = chaine({ objectif: null });
    const limitation = 'L’objectif prioritaire déclaré par le patient est affiché au praticien ; il n’entre pas dans le déclenchement de cette règle.';
    expect(avec.decisionCard.priorityCandidates[0].limitations).toContain(limitation);
    expect(sans.decisionCard.priorityCandidates[0].limitations).not.toContain(limitation);
    expect(JSON.stringify(avec.decisionCard)).not.toContain('Retrouver un confort digestif');
  });
});

describe('chaîne C1 — déterminisme', () => {
  // LA PROPRIÉTÉ DONT DÉPEND TOUT LE RECALCUL SERVEUR. Deux constructions aux
  // mêmes entrées doivent rendre les mêmes trois empreintes, sans quoi le
  // vérificateur rendrait 409 sur une carte honnête.
  it('mêmes entrées ⇒ mêmes trois empreintes, dans les deux positions du verrou', () => {
    const ferme = [chaine(), chaine()];
    expect(ferme[0].decisionCard.inputHash).toBe(ferme[1].decisionCard.inputHash);
    simulerSignature();
    const ouvert = [chaine(), chaine()];
    expect(ouvert[0].snapshot.inputHash).toBe(ouvert[1].snapshot.inputHash);
    expect(ouvert[0].review.inputHash).toBe(ouvert[1].review.inputHash);
    expect(ouvert[0].decisionCard.inputHash).toBe(ouvert[1].decisionCard.inputHash);
    // La signature CHANGE la carte : c'est bien le verrou qui commande, et non
    // un hasard de fixture.
    expect(ouvert[0].decisionCard.inputHash).not.toBe(ferme[0].decisionCard.inputHash);
  });
});

// LE VERROU DU VERROU — relevé en revue le 2026-08-12.
//
// `chaineC1Fixture` vit dans `src/` et expose une fonction qui OUVRE le verrou
// d'une table clinique. Son garde `assertBanc()` n'était tenu par rien : un banc
// qui ne l'éprouve pas est un garde qu'une refonte peut retirer en silence,
// exactement le mode de panne que ce module existe pour éviter.
describe('chaineC1Fixture — la signature de fixture ne s’exécute qu’en banc', () => {
  it('signerTablePriorites() jette hors de Vitest, et n’ouvre rien', async () => {
    const { signerTablePriorites } = await import('./chaineC1Fixture');
    const marqueur = process.env.VITEST;
    try {
      delete process.env.VITEST;
      expect(() => signerTablePriorites()).toThrow('acte praticien');
    } finally {
      if (marqueur === undefined) delete process.env.VITEST;
      else process.env.VITEST = marqueur;
    }
    // Le verrou est resté FERMÉ : le refus n'a pas laissé la table à moitié
    // signée.
    expect(PRIORITY_RULES_METADATA.validationExterne).toBe(false);
    expect(PRIORITY_RULES_METADATA.dateValidation).toBeNull();
  });
});
