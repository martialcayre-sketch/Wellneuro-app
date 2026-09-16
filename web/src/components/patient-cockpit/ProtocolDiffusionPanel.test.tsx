// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProtocolDiffusionPanel } from './ProtocolDiffusionPanel';

// Le panneau n'avait aucun banc de composant. Il en reçoit un avec le constat
// « servie au patient » ([[D-191]]) : une garde que personne ne voit se mesure à
// zéro — c'est la leçon du booklet, dont la confirmation était possible « depuis
// toujours » sans qu'aucun écran ne l'envoie.

afterEach(cleanup);

const APPROUVE_LE = '2026-07-20T08:00:00.000Z';

describe('ProtocolDiffusionPanel', () => {
  it('dit au praticien que son protocole n’est plus affiché au patient', () => {
    render(
      <ProtocolDiffusionPanel
        canApprove={false}
        approved
        stale={false}
        approvedAt={APPROUVE_LE}
        servieAuPatient={false}
      />,
    );
    const alerte = screen.getByRole('alert');
    expect(alerte.textContent).toMatch(/n’est plus affiché à votre patient/);
    expect(alerte.textContent).toMatch(/Relisez la version active/);
  });

  // `null` = rien n'est affirmé (lecture non aboutie, ou rien de diffusé). Un
  // `false` par défaut ferait crier l'écran avant d'avoir lu.
  it('n’affirme rien tant que le constat n’est pas lu', () => {
    render(
      <ProtocolDiffusionPanel canApprove={false} approved stale={false} approvedAt={APPROUVE_LE} />,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/validée pour diffusion le/i)).toBeTruthy();
  });

  it('ne crie pas sur un protocole réellement servi', () => {
    render(
      <ProtocolDiffusionPanel
        canApprove={false}
        approved
        stale={false}
        approvedAt={APPROUVE_LE}
        servieAuPatient
      />,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // SANS APPROBATION, RIEN N'EST SERVI — et « n'est plus affiché » serait un faux
  // constat : il n'a jamais été affiché.
  it('ne parle pas d’affichage quand rien n’est validé pour diffusion', () => {
    render(
      <ProtocolDiffusionPanel
        canApprove
        approved={false}
        stale={false}
        approvedAt={null}
        servieAuPatient={false}
      />,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/Vous pouvez la valider pour diffusion/i)).toBeTruthy();
  });

  // LES DEUX CONSTATS SONT DISTINCTS : `stale` compare deux VERSIONS, celui-ci
  // compare le DOSSIER à lui-même. Les confondre ferait proposer une
  // re-validation là où la relecture ne changerait rien.
  it('distingue la caducité de version de l’extinction de l’écran patient', () => {
    render(
      <ProtocolDiffusionPanel
        canApprove={false}
        approved
        stale
        approvedAt={APPROUVE_LE}
        servieAuPatient={false}
      />,
    );
    expect(screen.getByText(/la validation précédente est caduque/i)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/n’est plus affiché à votre patient/);
  });
});

// L'APERÇU AVANT LE GESTE ([[D-200]] dette 1). Le praticien validait pour
// diffusion sans avoir jamais vu une ligne de ce que son patient lirait : le
// seul aperçu du cockpit vivait sur fixture.
describe('ProtocolDiffusionPanel — l’aperçu de ce que le patient lira', () => {
  const contenu = {
    priorityLabel: 'Axe signé',
    purpose: 'Raison patient.',
    followUpCriterion: 'Critère patient.',
    adviceSheetRef: null,
    limitations: [],
    actions: [
      { actionId: 'a1', type: 'food' as const, title: 'Action ferme', minimalPlan: 'Plan minimal.' },
      {
        actionId: 'a2', type: 'biological_exploration' as const, title: 'Bilan', minimalPlan: 'Plan minimal bilan.',
        interventionStatus: 'conditionnelle_biologie' as const, attente: 'En attente de confirmation par votre bilan.',
      },
    ],
  };

  it('montre le contenu patient, phrase d’attente comprise', () => {
    render(
      <ProtocolDiffusionPanel
        canApprove
        approved={false}
        stale={false}
        approvedAt={null}
        apercu={{ ok: true, contenu }}
      />,
    );
    expect(screen.getByText(/Axe signé/)).toBeTruthy();
    expect(screen.getByText('Plan minimal.')).toBeTruthy();
    expect(screen.getByText('En attente de confirmation par votre bilan.')).toBeTruthy();
  });

  // UN REFUS DIT POURQUOI. Un aperçu vide apprendrait au praticien qu'il n'a
  // rien à montrer, jamais qu'il a quelque chose à lever.
  it('affiche le motif quand le contrat refuse', () => {
    render(
      <ProtocolDiffusionPanel
        canApprove={false}
        approved={false}
        stale={false}
        approvedAt={null}
        apercu={{ ok: false, motif: 'contrat_refuse', detail: 'Le protocole doit être relu par le praticien avant diffusion.' }}
      />,
    );
    expect(screen.getByText(/Aucun aperçu patient pour la version active/)).toBeTruthy();
    expect(screen.getByText(/doit être relu par le praticien/)).toBeTruthy();
  });

  it('ne montre rien tant que la lecture n’a pas abouti', () => {
    render(
      <ProtocolDiffusionPanel canApprove={false} approved={false} stale={false} approvedAt={null} />,
    );
    expect(screen.queryByText(/Vu par votre patient/)).toBeNull();
    expect(screen.queryByText(/Aucun aperçu patient/)).toBeNull();
  });
});
