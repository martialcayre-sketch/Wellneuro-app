// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MissingDataPanel } from './MissingDataPanel';
import type { ContradictionAffichee } from '@/lib/clinical/contradictionsService';

afterEach(cleanup);

/**
 * `TwoLevelReading` ne monte son détail qu'une fois déplié : sans ce geste, une
 * assertion sur le détail échoue pour une raison d'interaction, pas de contenu.
 */
function deplierLeDetail(): void {
  fireEvent.click(screen.getByRole('button', { name: /Voir le détail/ }));
}

// Ce que ce banc garde : les constats du moteur DÉTERMINISTE apparaissent avec
// ce qui les rend défendables — leurs limites et, quand il existe, le motif
// pour lequel ils coexistent avec une suggestion d'instrument sur le même axe
// ([[D-048]], `DC-37`). Un constat rendu SANS son recoupement laisse le
// praticien devant deux entrées voisines sans savoir qu'elles ne disent pas la
// même chose.

const constat: ContradictionAffichee = {
  id: 'C-STR',
  forme: 'DISCORDANCE',
  description: "L'adaptation au stress déclarée est perturbée alors que le DASS-21 est dans la bande « Normal ».",
  actionSuggeree: 'Clarifier en entretien avant toute conclusion.',
  hypotheses: ['Une charge de stress que les échelles ne captent pas.'],
  limitations: ['Un questionnaire isolé ne suffit pas à conclure.'],
  passations: [
    { idQuestionnaire: 'Q_MOD_01', date: '2026-03-12', dateLisible: '12/03/2026' },
    { idQuestionnaire: 'Q_STR_04', date: '2026-08-10', dateLisible: '10/08/2026' },
  ],
  ecartJours: 151,
  claims: [{ claimId: 'WN-CL-0238-002', versionClaim: 'v1.0' }],
  importance: 'useful_not_urgent',
  resolution: { statut: 'ouverte' },
  regleId: 'C-STR',
  recoupementJustifie: 'Recoupe R2-STR-01 : celle-ci propose une mesure, C-STR nomme une contradiction.',
};

describe('MissingDataPanel — constats déterministes de contradiction', () => {
  it('sans contradiction, le panneau est celui d’avant', () => {
    // Le paramètre est optionnel : aucun appelant existant n'a à changer, et un
    // oubli ne fait pas disparaître le reste du panneau.
    render(<MissingDataPanel missingData={[]} discordances={[]} />);
    expect(screen.getByRole('region', { name: 'Données manquantes' })).toBeTruthy();
    expect(screen.queryByText(/Contradiction entre instruments/)).toBeNull();
  });

  it('le constat paraît avec son action, son ancienneté et ses limites', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[constat]} />);

    // Le résumé est visible d'emblée : le praticien voit qu'il y a une
    // contradiction sans avoir à cliquer.
    expect(screen.getByText(/Contradiction entre instruments/)).toBeTruthy();
    expect(screen.getByText(/DASS-21 est dans la bande/)).toBeTruthy();

    deplierLeDetail();
    expect(screen.getByText(/Clarifier en entretien/)).toBeTruthy();
    // LES PASSATIONS SONT NOMMÉES ET DATÉES : sans elles, le praticien lit une
    // affirmation qu'il ne peut pas ouvrir (`DC-34`, `DC-35`).
    expect(screen.getByText(/Q_MOD_01 — 12\/03\/2026/)).toBeTruthy();
    expect(screen.getByText(/Q_STR_04 — 10\/08\/2026/)).toBeTruthy();
    // L'écart ACCOMPAGNE les dates, il ne les remplace pas.
    expect(screen.getByText(/151 jours d'écart/)).toBeTruthy();
    // Ce que le constat NE dit pas suit le constat jusqu'à l'écran.
    expect(screen.getByText(/Un questionnaire isolé ne suffit pas/)).toBeTruthy();
  });

  it('la justification de recoupement est RENDUE, pas seulement transportée', () => {
    // Le cas central de [[D-048]] point 3 : cette phrase existait dans la table
    // depuis son écriture et n'était lue par personne.
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[constat]} />);
    deplierLeDetail();
    expect(screen.getByText(/Recoupe R2-STR-01/)).toBeTruthy();
  });

  it('sans recoupement déclaré, aucune phrase n’est inventée', () => {
    const sansRecoupement = { ...constat };
    delete (sansRecoupement as { recoupementJustifie?: string }).recoupementJustifie;
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[sansRecoupement]} />);
    deplierLeDetail();
    expect(screen.queryByText(/Recoupe/)).toBeNull();
    expect(screen.getByText(/Contradiction entre instruments/)).toBeTruthy();
  });

  it('sans écart applicable, les passations restent nommées et aucun « 0 jour » n’apparaît', () => {
    // `null` veut dire « moins de deux passations distinctes » ; afficher
    // « 0 jour » dirait à tort qu'elles sont du même jour (`DC-24`). Les dates,
    // elles, restent — c'est la traçabilité, pas l'écart, qui est due.
    render(
      <MissingDataPanel
        missingData={[]}
        discordances={[]}
        contradictions={[{ ...constat, ecartJours: null }]}
      />,
    );
    deplierLeDetail();
    expect(screen.queryByText(/jour/)).toBeNull();
    expect(screen.getByText(/Q_MOD_01 — 12\/03\/2026/)).toBeTruthy();
  });

  it('les claims fondateurs sont rendus : le constat est remontable', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[constat]} />);
    deplierLeDetail();
    expect(screen.getByText(/WN-CL-0238-002 v1\.0/)).toBeTruthy();
    // La règle qui a mordu : sans elle, un faux positif n'est pas remontable.
    expect(screen.getByText(/Règle C-STR/)).toBeTruthy();
  });

  it('l’objet minimal de `DC-30` est rendu : priorité et état de résolution', () => {
    // `DC-30` est actée, donc opposable. Le vocabulaire est celui que le
    // panneau affiche déjà pour les données manquantes.
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[constat]} />);
    deplierLeDetail();
    expect(screen.getByText(/Utile mais non urgente/)).toBeTruthy();
    expect(screen.getByText(/non résolue/)).toBeTruthy();
  });

  it('le constat reste marqué praticien seul', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[constat]} />);
    deplierLeDetail();
    expect(screen.getAllByText(/Visible uniquement par le praticien/).length).toBeGreaterThan(0);
  });
});

// Ce que ce banc garde : la forme `CONFLIT_SOURCES` ([[D-103]]) n'hérite pas de
// l'écran de la discordance. Deux défauts, trouvés en relisant le rendu avant
// de conclure le lot, et tous deux invisibles côté serveur.

const conflit: ContradictionAffichee = {
  id: 'CS-BIO-01',
  forme: 'CONFLIT_SOURCES',
  description:
    'Deux claims du corpus certifié se contredisent — le bilan biologique complet '
    + "se réalise-t-il systématiquement ? WN-CL-0312-018 soutient que le bilan est "
    + 'recommandé une fois par an. WN-CL-0387-013 soutient que le bilan complet '
    + "n'est pas à réaliser systématiquement. Aucun des deux n'a été retenu contre l'autre.",
  actionSuggeree: 'Trancher pour ce dossier si le bilan complet est indiqué.',
  hypotheses: ['Les deux claims viseraient des situations différentes.'],
  limitations: ['Le conflit porte sur le caractère systématique du bilan.'],
  // Un conflit oppose des CLAIMS : aucune passation, écart non applicable.
  passations: [],
  ecartJours: null,
  claims: [
    { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0387-013', versionClaim: 'v1.0' },
  ],
  importance: 'useful_not_urgent',
  resolution: {
    statut: 'escaladee_praticien',
    motif: 'Aucun axe de comparaison de DC-54 n’est exploitable sur ce corpus.',
  },
  regleId: 'CS-BIO-01',
};

describe('MissingDataPanel — conflit entre sources du corpus', () => {
  // PREMIER DÉFAUT : l'intitulé était « Contradiction entre instruments » pour
  // les trois formes. Sur un conflit de claims, il envoyait le praticien
  // chercher deux questionnaires qui n'existent pas.
  it('n’est PAS étiqueté « entre instruments »', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[conflit]} />);
    expect(screen.getByText(/Conflit entre sources du corpus/)).toBeTruthy();
    expect(screen.queryByText(/Contradiction entre instruments/)).toBeNull();
  });

  // SECOND DÉFAUT : le panneau ne disait l'état que s'il valait `ouverte`. Un
  // conflit escaladé serait apparu sans son état, et surtout SANS le motif —
  // c'est-à-dire sans ce que la politique a renoncé à faire (`DC-55`).
  it('dit qu’il est escaladé, et pourquoi la machine ne tranche pas', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[conflit]} />);
    deplierLeDetail();
    expect(screen.getByText(/escaladée — arbitrage praticien attendu/)).toBeTruthy();
    expect(screen.getByText(/Pourquoi la machine ne tranche pas/)).toBeTruthy();
    expect(screen.getByText(/Aucun axe de comparaison de DC-54/)).toBeTruthy();
  });

  it('rend ses DEUX claims : le désaccord est ouvrable des deux côtés', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[conflit]} />);
    deplierLeDetail();
    expect(screen.getByText(/WN-CL-0312-018 v1\.0/)).toBeTruthy();
    expect(screen.getByText(/WN-CL-0387-013 v1\.0/)).toBeTruthy();
  });

  // Sans passation, l'écran ne doit pas afficher de bloc de passations ni un
  // écart : `null` est « non applicable », jamais « le même jour » (`DC-24`).
  it('n’affiche ni passation ni écart', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[conflit]} />);
    deplierLeDetail();
    expect(screen.queryByText(/jours entre/)).toBeNull();
    expect(screen.queryByText(/Q_MOD_01/)).toBeNull();
  });
});
