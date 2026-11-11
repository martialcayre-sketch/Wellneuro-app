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

// [[D-439]] A2 : les arbitrages d'un conflit déclenché se LISTENT sous son
// constat, étiquetés par fiche ; aucun n'est désigné comme applicable au
// dossier, et le constat d'escalade reste affiché.
describe('MissingDataPanel — arbitrages listés sous un conflit', () => {
  const arbitrages = [
    { conflitId: 'CS-BIO-01', ficheId: 'FU_MG_P7', retenu: 'WN-CL-0312-018@v1.0', motif: 'motif un', le: '2026-11-07T10:00:00.000Z', aRelire: false },
    { conflitId: 'CS-BIO-01', ficheId: 'FU_ZINC_P7', retenu: 'WN-CL-0387-013@v1.0', motif: 'motif deux', le: '2026-11-05T10:00:00.000Z', aRelire: true },
  ];

  it('deux arbitrages sur deux fiches : les deux listés, étiquetés, aucun retenu pour le dossier', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[conflit]} arbitragesConflits={arbitrages} />);
    deplierLeDetail();
    expect(screen.getByText(/Arbitrages posés par fiche d’usage|Arbitrages posés par fiche d'usage/)).toBeTruthy();
    expect(screen.getByText(/aucun ne vaut pour ce dossier/)).toBeTruthy();
    // Chaque ligne porte SA référence, SON motif, SA date : une permutation
    // ou une duplication entre fiches rougit.
    const ligneMg = screen.getByText('FU_MG_P7').closest('li')!.textContent ?? '';
    const ligneZinc = screen.getByText('FU_ZINC_P7').closest('li')!.textContent ?? '';
    expect(ligneMg).toContain('WN-CL-0312-018@v1.0');
    expect(ligneMg).toContain('motif un');
    expect(ligneMg).toContain('07/11/2026');
    expect(ligneMg).not.toContain('à relire');
    expect(ligneZinc).toContain('WN-CL-0387-013@v1.0');
    expect(ligneZinc).toContain('motif deux');
    expect(ligneZinc).toContain('05/11/2026');
    expect(ligneZinc).toContain('à relire : une de ses références a changé');
    // L'escalade reste au-dessus, intacte (`DC-55`).
    expect(screen.getByText(/escaladée — arbitrage praticien attendu/)).toBeTruthy();
  });

  it('sans arbitrage (drapeau éteint) : aucune liste', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[conflit]} />);
    deplierLeDetail();
    expect(screen.queryByText(/Arbitrages posés par fiche/)).toBeNull();
  });

  it('les arbitrages d’un autre conflit ne s’affichent pas sous celui-ci', () => {
    const autres = arbitrages.map(a => ({ ...a, conflitId: 'CS-ZINC-02' }));
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[conflit]} arbitragesConflits={autres} />);
    deplierLeDetail();
    expect(screen.queryByText(/Arbitrages posés par fiche/)).toBeNull();
  });
});

// H98 (D-455) : une CONVERGENCE porte son niveau et ses déclarations, sous ses
// propres intitulés, et n'affiche pas d'état de résolution — un accord de
// sources n'a rien à résoudre (arbitrage du 2026-11-07).
describe('MissingDataPanel — constat de convergence', () => {
  const convergence: ContradictionAffichee = {
    ...constat,
    id: 'CONV-B5',
    regleId: 'CONV-B5',
    forme: 'CONVERGENCE',
    description: 'Sur le besoin 5, « Mouvement, fonctions corporelles et repos », 2 familles de mesure concordantes.',
    hypotheses: [],
    passations: [{ idQuestionnaire: 'Q_MOD_01', date: '2026-11-05', dateLisible: '05/11/2026' }],
    ecartJours: null,
    graduation: 'CONVERGENCE_FAIBLE',
    libelleGraduation: 'convergence faible — deux familles de mesure',
    declarations: ['antécédent respiratoire / apnée du sommeil déclaré'],
  };
  delete (convergence as Partial<ContradictionAffichee>).recoupementJustifie;

  it('affiche le niveau, les passations à l’appui et les déclarations', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[convergence]} />);
    expect(screen.getByText(/Convergence entre sources/)).toBeTruthy();
    deplierLeDetail();
    expect(screen.getByText(/convergence faible — deux familles de mesure/)).toBeTruthy();
    expect(screen.getByText(/Passations à l’appui/)).toBeTruthy();
    expect(screen.queryByText(/Passations confrontées/)).toBeNull();
    expect(screen.getByText(/antécédent respiratoire \/ apnée du sommeil déclaré/)).toBeTruthy();
  });

  it('n’affiche pas « non résolue » sur une convergence, mais la garde sur une discordance', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[convergence]} />);
    deplierLeDetail();
    expect(screen.queryByText(/non résolue/)).toBeNull();
    cleanup();
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[constat]} />);
    deplierLeDetail();
    expect(screen.getByText(/non résolue/)).toBeTruthy();
  });
});

// [[D-491]] — LA RÉSERVE SUR LA SOURCE. Le constat reste affiché ; la réserve
// se lit dans le résumé, sans déplier, et le claim en cause est marqué dans la
// liste des sources — jamais présenté comme admissible.
describe('MissingDataPanel — réserve sur la source (D-491)', () => {
  const conflitAReserve: ContradictionAffichee = {
    ...conflit,
    reserveSource: {
      motif: 'claims_non_admissibles',
      claims: [{ claimId: 'WN-CL-0387-013', versionClaim: 'v1.0' }],
    },
  };

  it('conflit : « Registre de conflits à relire » dans le résumé, le conflit reste', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[conflitAReserve]} />);
    expect(screen.getByText('Registre de conflits à relire')).toBeTruthy();
    expect(screen.getByText(/Conflit entre sources du corpus/)).toBeTruthy();
  });

  it('conflit : la phrase dit que le conflit n’est pas résolu, et seul le claim en cause est marqué', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[conflitAReserve]} />);
    deplierLeDetail();
    expect(screen.getByText(/Au moins un des deux claims ne satisfait pas les critères de validité du corpus\. Le conflit reste affiché : il n’est pas résolu pour autant/)).toBeTruthy();
    expect(screen.getByText(/WN-CL-0387-013 v1\.0 \(ne satisfait pas les critères de validité du corpus\)/)).toBeTruthy();
    expect(screen.queryByText(/WN-CL-0312-018 v1\.0 \(ne satisfait/)).toBeNull();
  });

  it('discordance : « Réserve sur la source », et le frein de l’extinction est dit maintenu', () => {
    const aReserve: ContradictionAffichee = {
      ...constat,
      reserveSource: { motif: 'claims_non_admissibles', claims: [{ claimId: 'WN-CL-0238-002', versionClaim: 'v1.0' }] },
    };
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[aReserve]} />);
    expect(screen.getByText('Réserve sur la source')).toBeTruthy();
    deplierLeDetail();
    expect(screen.getByText(/Au moins un claim qui fonde ce constat ne satisfait pas les critères de validité du corpus\. Le constat reste affiché, et il empêche toujours une règle d’arrêt de retirer une exploration\./)).toBeTruthy();
  });

  it('validité non vérifiée : intitulé et phrase propres, aucun claim marqué', () => {
    const nonVerifie: ContradictionAffichee = { ...constat, reserveSource: { motif: 'validite_non_verifiee' } };
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[nonVerifie]} />);
    expect(screen.getByText('Validité des sources non vérifiée')).toBeTruthy();
    deplierLeDetail();
    expect(screen.getByText(/La validité des claims cités n’a pas pu être vérifiée\./)).toBeTruthy();
    expect(screen.queryByText(/\(ne satisfait pas/)).toBeNull();
  });

  it('sans réserve : aucun intitulé de réserve', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[constat, conflit]} />);
    expect(screen.queryByText('Registre de conflits à relire')).toBeNull();
    expect(screen.queryByText('Réserve sur la source')).toBeNull();
  });
});
