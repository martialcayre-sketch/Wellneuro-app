import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// UN SEUL MOTEUR DES STATUTS DE PHASE (J3-cabinet, [[D-385]]).
//
// La page des comptes du cabinet range chaque dossier sous sa prochaine étape
// par le calcul même de la fiche — c'est ce que D-385 §1 exige (« même calcul
// que “Prochaine étape” sur la fiche »). Le moteur est donc sorti de
// `FichePatientPanel` vers `statutsPhases.ts`, et l'état runtime qu'il lit vers
// `etatRuntimeDerive.ts`. Une copie locale réintroduite demain dans la fiche ou
// dans le cockpit referait deux calculs, qui divergeraient en silence : la page
// compterait un dossier sous une étape que la fiche ne montre pas.
//
// Sa limite, dite pour ne pas se croire couvert : il cherche des fragments
// reconnaissables du moteur, pas toute réécriture possible. La parité
// fiche ↔ page, elle, se prouve par un banc de comportement (PR 3 du lot).

const COMPOSANTS = path.resolve(__dirname, '../../components');
const lire = (fichier: string) => readFileSync(path.join(COMPOSANTS, fichier), 'utf8');

describe('statuts de phase — un seul moteur', () => {
  const fiche = lire('FichePatientPanel.tsx');
  const cockpit = lire('patient-cockpit/ClinicalRuntimeSection.tsx');
  const moteur = readFileSync(path.resolve(__dirname, 'statutsPhases.ts'), 'utf8');
  const derive = readFileSync(path.resolve(__dirname, 'etatRuntimeDerive.ts'), 'utf8');

  // Anti-vacuité : les fragments cherchés plus bas existent bien dans les modules.
  it('les fragments du moteur vivent dans les modules', () => {
    expect(moteur).toMatch(/rideauT0Satisfait/);
    expect(moteur).toMatch(/objectifsActifs/);
    expect(moteur).toMatch(/bloqueurs:/);
    expect(moteur).toMatch(/\bphaseDue\(/);
    expect(derive).toMatch(/rideau_t0/);
    expect(derive).toMatch(/isPrioriteLibreOuverte\(/);
    expect(derive).toMatch(/estJalonMesure\(/);
  });

  it('la fiche importe le moteur partagé', () => {
    expect(fiche).toMatch(/from '@\/lib\/trajectoire-partagee\/statutsPhases'/);
    expect(fiche).toMatch(/phaseDueDuDossier\(entreesStatuts\)/);
    expect(fiche).toMatch(/entreesPhaseDueDuDossier\(entreesStatuts\)/);
  });

  it.each([
    ['un statut calculé sur place', /\(id: IdPhase\): StatutPhase => \{/],
    ['le verdict du rideau lu sur place', /rideauT0Satisfait/],
    ['les conditions de la phase 3 lues sur place', /objectifsActifs/],
    ['un bloqueur composé sur place', /bloqueurs:/],
    ['des actions exigibles composées sur place', /actionsExigibles/],
    ['un appel direct à phaseDue', /\bphaseDue\(/],
  ])('la fiche ne porte pas de moteur local : %s', (_, motif) => {
    expect(fiche).not.toMatch(motif);
  });

  it('le cockpit dérive par le module partagé', () => {
    expect(cockpit).toMatch(/from '@\/lib\/trajectoire-partagee\/etatRuntimeDerive'/);
    expect(cockpit).toMatch(/deriverEtatRuntimePourPhases\(/);
  });

  it.each([
    ['le verdict du rideau extrait sur place', /rideau_t0/],
    ['la garde de priorité libre appelée sur place', /isPrioriteLibreOuverte\(/],
    ['la garde de sélection appelée sur place', /isSelectionPrioriteDue\(/],
    ['les jalons de mesure lus sur place', /estJalonMesure\(/],
  ])('le cockpit ne dérive pas sur place : %s', (_, motif) => {
    expect(cockpit).not.toMatch(motif);
  });
});
