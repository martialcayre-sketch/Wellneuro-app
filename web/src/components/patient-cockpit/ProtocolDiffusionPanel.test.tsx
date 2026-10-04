// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProtocolDiffusionPanel } from './ProtocolDiffusionPanel';
import { TEXTE_ANNONCE, TEXTE_ANNONCE_A_VENIR } from '@/lib/fiches-assiette/apercuRemise';

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

// LE BADGE DIT CE QUE LE PORTAIL SERT. « Non transmis », figé depuis C2A
// LOT-03, s'affichait sur un protocole que le portail servait déjà : le
// praticien lisait l'inverse de ce que son patient voyait.
describe('ProtocolDiffusionPanel — ce que le portail sert', () => {
  it('dit « Servi sur le portail » quand le constat est servi', () => {
    render(<ProtocolDiffusionPanel canApprove={false} approved stale={false} approvedAt={APPROUVE_LE} servieAuPatient />);
    expect(screen.getByText('Servi sur le portail')).toBeTruthy();
    expect(screen.getByText(/servie sur le portail du patient/)).toBeTruthy();
    expect(screen.queryByText(/non transmis/i)).toBeNull();
  });

  it('dit « Plus servi au patient » quand le constat est éteint', () => {
    render(<ProtocolDiffusionPanel canApprove={false} approved stale={false} approvedAt={APPROUVE_LE} servieAuPatient={false} />);
    expect(screen.getByText('Plus servi au patient')).toBeTruthy();
    expect(screen.queryByText(/servie sur le portail/)).toBeNull();
  });

  it('n’affiche aucun badge de service tant que le constat n’est pas lu', () => {
    render(<ProtocolDiffusionPanel canApprove={false} approved stale={false} approvedAt={APPROUVE_LE} />);
    expect(screen.queryByText(/Servi sur le portail|Plus servi au patient|non transmis/i)).toBeNull();
  });

  it('n’affiche aucun badge de service sans approbation', () => {
    render(<ProtocolDiffusionPanel canApprove approved={false} stale={false} approvedAt={null} servieAuPatient={false} />);
    expect(screen.queryByText(/Servi sur le portail|Plus servi au patient/)).toBeNull();
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

// LES FICHES D'ASSIETTE QUE LE CLIC REMETTRAIT ([[D-251]] §7, lot 8) — celles
// qui partiront ET celles qui ne partiront pas, chacune avec sa phrase
// (`DC-24`). Libellés synthétiques.
describe('ProtocolDiffusionPanel — les fiches d’assiette', () => {
  const ligne = (surcharges: Record<string, unknown>) => ({
    plateCode: 'ASSIETTE_A',
    libelle: 'Assiette A',
    sourceId: 'WN-SRC-0001',
    actionId: 'a1',
    statut: 'part' as const,
    idVersion: 'v2',
    numero: 2,
    contenuSha256: 'a'.repeat(64),
    motif: null,
    detail: 'Partira : version 2.',
    ...surcharges,
  });

  it('dit, fiche par fiche, ce qui partira, ce qui est déjà remis, et ce qui ne partira pas', () => {
    render(
      <ProtocolDiffusionPanel
        canApprove
        approved={false}
        stale={false}
        approvedAt={null}
        fiches={{
          jeton: 'j',
          blocage: null,
          lignes: [
            ligne({}),
            ligne({ plateCode: 'ASSIETTE_B', libelle: 'Assiette B', statut: 'deja_remise', detail: 'Déjà remise (version 1) : rien ne change.' }),
            ligne({
              plateCode: 'ASSIETTE_C',
              libelle: 'Assiette C',
              statut: 'ne_part_pas',
              motif: 'aucune_version_validee',
              detail: 'Aucune version validée : validez la fiche au rayon « Fiches conseils » de la Bibliothèque.',
            }),
          ],
        }}
      />,
    );
    const a = screen.getByTestId('fiche-diffusion-ASSIETTE_A');
    expect(a.textContent).toContain('Partira');
    expect(a.querySelector('[data-variant]')?.getAttribute('data-variant')).toBe('success');
    expect(screen.getByTestId('fiche-diffusion-ASSIETTE_B').textContent).toContain('Déjà remise');
    const c = screen.getByTestId('fiche-diffusion-ASSIETTE_C');
    expect(c.textContent).toContain('Ne partira pas');
    expect(c.textContent).toContain('Fiches conseils');
    expect(c.querySelector('[data-variant]')?.getAttribute('data-variant')).toBe('warning');
  });

  it('sous un blocage, le motif est dit UNE fois, en tête', () => {
    const detail = 'Le dossier n’est pas en suivi : aucune fiche ne part.';
    render(
      <ProtocolDiffusionPanel
        canApprove
        approved={false}
        stale={false}
        approvedAt={null}
        fiches={{
          jeton: 'j',
          blocage: { motif: 'dossier_non_suivi', detail },
          lignes: [
            ligne({ statut: 'ne_part_pas', motif: 'dossier_non_suivi', detail, idVersion: null }),
            ligne({ plateCode: 'ASSIETTE_B', statut: 'ne_part_pas', motif: 'dossier_non_suivi', detail, idVersion: null }),
          ],
        }}
      />,
    );
    const section = screen.getByTestId('apercu-fiches-assiette');
    expect(section.textContent?.split(detail).length).toBe(2);
  });

  it('un protocole déjà validé : dit qu’un nouveau clic remet les fiches validées depuis', () => {
    render(
      <ProtocolDiffusionPanel
        canApprove
        approved
        stale={false}
        approvedAt={APPROUVE_LE}
        fiches={{ jeton: 'j', blocage: null, lignes: [ligne({})] }}
      />,
    );
    expect(screen.getByText(/un nouveau clic sur « Valider pour diffusion » remet les fiches validées depuis/)).toBeTruthy();
  });

  it('aucune assiette au protocole : le dit, au lieu d’une section vide', () => {
    render(
      <ProtocolDiffusionPanel canApprove approved={false} stale={false} approvedAt={null} fiches={{ jeton: 'j', blocage: null, lignes: [] }} />,
    );
    expect(screen.getByText(/Aucune action de ce protocole ne porte d’assiette/)).toBeTruthy();
  });

  it('sous un blocage, zéro ligne n’est JAMAIS lu « aucune action ne porte d’assiette » (`DC-24`)', () => {
    // Payload illisible, ou lecture des fiches en échec : on ne sait pas.
    render(
      <ProtocolDiffusionPanel
        canApprove
        approved={false}
        stale={false}
        approvedAt={null}
        fiches={{
          jeton: 'lecture_impossible',
          blocage: { motif: 'lecture_impossible', detail: 'Les fiches d’assiette n’ont pas pu être lues.' },
          lignes: [],
        }}
      />,
    );
    expect(screen.getByText(/n’ont pas pu être lues/)).toBeTruthy();
    expect(screen.queryByText(/Aucune action de ce protocole ne porte d’assiette/)).toBeNull();
  });

  it('drapeau fermé (`fiches` nul) : la section n’existe pas', () => {
    render(<ProtocolDiffusionPanel canApprove approved={false} stale={false} approvedAt={null} />);
    expect(screen.queryByTestId('apercu-fiches-assiette')).toBeNull();
  });
});

describe('ProtocolDiffusionPanel — l’e-mail neutre ([[D-251]] §9, lot 11)', () => {
  const part = {
    plateCode: 'ASSIETTE_A',
    libelle: 'Assiette A',
    sourceId: 'WN-SRC-0001',
    actionId: 'a1',
    statut: 'part' as const,
    idVersion: 'v2',
    numero: 2,
    contenuSha256: 'a'.repeat(64),
    motif: null,
    detail: 'Partira : version 2.',
  };
  const nePartPas = {
    ...part,
    statut: 'ne_part_pas' as const,
    idVersion: null,
    motif: 'aucune_version_validee' as const,
    detail: 'Aucune version validée.',
  };

  it('AVANT le clic : dit qu’un e-mail neutre suivra, seulement si une fiche part et que l’e-mail est dû', () => {
    const { rerender } = render(
      <ProtocolDiffusionPanel canApprove approved={false} stale={false} approvedAt={null} annonceParEmail fiches={{ jeton: 'j', blocage: null, lignes: [part] }} />,
    );
    expect(screen.getByText(TEXTE_ANNONCE_A_VENIR)).toBeTruthy();
    rerender(
      <ProtocolDiffusionPanel canApprove approved={false} stale={false} approvedAt={null} annonceParEmail fiches={{ jeton: 'j', blocage: null, lignes: [nePartPas] }} />,
    );
    expect(screen.queryByText(TEXTE_ANNONCE_A_VENIR)).toBeNull();
    rerender(
      <ProtocolDiffusionPanel canApprove approved={false} stale={false} approvedAt={null} annonceParEmail={false} fiches={{ jeton: 'j', blocage: null, lignes: [part] }} />,
    );
    expect(screen.queryByText(TEXTE_ANNONCE_A_VENIR)).toBeNull();
  });

  it('avec des fiches, le panneau ne promet plus « aucun envoi automatique »', () => {
    const { rerender } = render(
      <ProtocolDiffusionPanel canApprove approved={false} stale={false} approvedAt={null} fiches={{ jeton: 'j', blocage: null, lignes: [part] }} />,
    );
    expect(screen.queryByText(/aucun envoi automatique/)).toBeNull();
    rerender(<ProtocolDiffusionPanel canApprove approved={false} stale={false} approvedAt={null} />);
    expect(screen.getByText(/aucun envoi automatique/)).toBeTruthy();
  });

  it('APRÈS le clic : un e-mail parti se dit en statut', () => {
    render(<ProtocolDiffusionPanel canApprove approved stale={false} approvedAt={APPROUVE_LE} annonce="envoye" />);
    expect(screen.getByRole('status').textContent).toBe(TEXTE_ANNONCE.envoye.texte);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['echoue', 'non_configure', 'portail_ferme'] as const)(
    'APRÈS le clic : « %s » est une ALERTE — un échec ne ressemble pas à un succès',
    annonce => {
      render(<ProtocolDiffusionPanel canApprove approved stale={false} approvedAt={APPROUVE_LE} annonce={annonce} />);
      expect(screen.getByRole('alert').textContent).toBe(TEXTE_ANNONCE[annonce].texte);
    },
  );

  it('aucun e-mail dû : rien n’est dit', () => {
    render(<ProtocolDiffusionPanel canApprove approved stale={false} approvedAt={APPROUVE_LE} annonce={null} />);
    expect(screen.queryByText(/e-mail/)).toBeNull();
  });
});

describe('ProtocolDiffusionPanel — le courrier pour le médecin (D-262, LOT-03b)', () => {
  const LETTRE = { idCorrespondance: 'lettre_1', consigneLe: '2026-10-03T08:00:00.000Z', dejaRemise: false };
  const panneau = (lettre: typeof LETTRE | null) =>
    render(<ProtocolDiffusionPanel canApprove approved={false} stale={false} approvedAt={null} lettre={lettre} onApprove={() => undefined} />);

  it('AVANT le clic : la lettre qui partira est dite, avec sa date et l’e-mail qui suivra', () => {
    panneau(LETTRE);
    const bloc = screen.getByTestId('apercu-lettre-adressage');
    expect(bloc.textContent).toMatch(/La lettre d’adressage du 3 octobre 2026 sera remise au patient avec ce protocole/);
    expect(bloc.textContent).toMatch(/e-mail neutre, sans contenu de santé/);
  });

  it('déjà remise : le clic ne la remet pas, et aucun e-mail n’est annoncé pour elle', () => {
    panneau({ ...LETTRE, dejaRemise: true });
    const bloc = screen.getByTestId('apercu-lettre-adressage');
    expect(bloc.textContent).toMatch(/déjà remise au patient : ce clic ne la remet pas de nouveau/);
    expect(bloc.textContent).not.toMatch(/e-mail/);
  });

  it('aucune lettre (ou drapeau fermé) : rien n’est dit', () => {
    panneau(null);
    expect(screen.queryByTestId('apercu-lettre-adressage')).toBeNull();
  });

  it('la date est celle écrite dans la lettre (jour UTC), quel que soit le fuseau du navigateur', () => {
    panneau({ ...LETTRE, consigneLe: '2026-03-29T22:30:00.000Z' });
    expect(screen.getByTestId('apercu-lettre-adressage').textContent).toMatch(/du 29 mars 2026/);
  });
});
