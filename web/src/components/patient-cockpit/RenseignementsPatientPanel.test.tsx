// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import type { Consultation } from '@/app/api/praticien/consultations/route';
import {
  RenseignementsPatientPanel,
  phraseEtatRenseignements,
  useRenseignementsPatient,
} from './RenseignementsPatientPanel';

// CE QUI SE JOUE ICI : une erreur de lecture ne doit JAMAIS se présenter comme
// une absence de renseignements. Le dossier peut porter une anamnèse entière
// que personne ne verrait — c'est le défaut que ce dépôt a déjà payé sur
// d'autres surfaces, et `DC-24` l'interdit : une absence n'est ni zéro, ni
// « rien à signaler ».
//
// Seuls les patients fictifs du dépôt peuvent apparaître ici.

const fetchMock = vi.fn();

const CONSULTATION_VIDE: Consultation = {
  idConsultation: 'CONS_1',
  idPatient: 'PAT_SEED_03',
  motif: null,
  statut: 'creee',
  dateValidation: null,
  createdAt: '2026-09-12T09:00:00.000Z',
  ficheSignaletique: null,
  anamnese: null,
  consentement: 'non_donne',
  consentementHorodatage: null,
  consentementVersion: null,
  finaliteConsentement: null,
};

const CONSULTATION_REMPLIE: Consultation = {
  ...CONSULTATION_VIDE,
  idConsultation: 'CONS_2',
  statut: 'validee',
  motif: 'Fatigue persistante',
  dateValidation: '2026-09-12T17:00:00.000Z',
  ficheSignaletique: {
    situation_familiale: 'En couple',
    profession: 'Professeure des écoles',
  },
  anamnese: {
    taille: '168',
    motif_principal: 'Je dors mal depuis six mois.',
    attentes: ['Améliorer le sommeil', 'Améliorer l’énergie'],
    // Groupe répétable, avec son identifiant RÉEL (`anamnese.ts`) : un
    // identifiant inventé rendrait le banc vert sur un panneau qui n'affiche
    // rien — le rendu est piloté par les descripteurs, pas par les clés
    // trouvées dans le JSON.
    complements: [{ nom: 'Magnésium', dose: '300 mg' }],
  },
  consentement: 'donne',
  consentementHorodatage: '2026-09-12T08:55:00.000Z',
  consentementVersion: 'v2',
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Harnais minimal : le panneau est présentationnel, la lecture vit au hook. */
function Harnais({ idPatient = 'PAT_SEED_03' }: { idPatient?: string }) {
  const etat = useRenseignementsPatient(idPatient);
  return (
    <div>
      <button type="button" onClick={() => void etat.charger()}>
        Charger
      </button>
      <RenseignementsPatientPanel {...etat} />
    </div>
  );
}

describe('RenseignementsPatientPanel — les trois états ne se confondent pas', () => {
  it('ERREUR DE LECTURE : une alerte, et JAMAIS le libellé d’absence', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ unavailable: true, reason: 'exception' }) });
    const { container } = render(<Harnais />);
    within(container).getByRole('button', { name: 'Charger' }).click();

    await waitFor(() => expect(within(container).getByRole('alert')).toBeTruthy());
    // Le point du banc : aucune des deux phrases d'absence ne doit apparaître.
    expect(container.textContent).not.toMatch(/Aucun renseignement déposé/);
    expect(container.textContent).not.toMatch(/Aucune consultation ouverte/);
  });

  it('CHARGEMENT : un troisième rendu, ni absence ni alerte', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<Harnais />);
    within(container).getByRole('button', { name: 'Charger' }).click();

    expect(within(container).getByRole('status')).toBeTruthy();
    expect(within(container).queryByRole('alert')).toBeNull();
    expect(container.textContent).not.toMatch(/Aucune consultation ouverte/);
  });

  it('DOSSIER SANS CONSULTATION : l’absence est dite, sans alerte', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ consultations: [] }) });
    const { container } = render(<Harnais />);
    within(container).getByRole('button', { name: 'Charger' }).click();

    await waitFor(() => expect(container.textContent).toMatch(/Aucune consultation ouverte/));
    expect(within(container).queryByRole('alert')).toBeNull();
  });

  // RÉGRESSION DU 2026-09-16, ET ELLE NE TOMBAIT PAS QUE CE PANNEAU. Un 200
  // sans le tableau promis posait `undefined` dans l'état ; la ligne d'état de
  // la zone focale appelait `.find` dessus, et LE COCKPIT ENTIER cessait de se
  // rendre — rail des phases compris. Le type disait « tableau », le runtime
  // disait autre chose, et personne ne vérifiait.
  it('un 200 sans le tableau promis est une ERREUR, et ne fait rien tomber', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const { container } = render(<Harnais />);
    within(container).getByRole('button', { name: 'Charger' }).click();

    await waitFor(() => expect(within(container).getByRole('alert')).toBeTruthy());
    expect(container.textContent).not.toMatch(/Aucune consultation ouverte/);
  });

  it('une panne réseau est une erreur, pas un dossier vide', async () => {
    fetchMock.mockRejectedValue(new Error('réseau coupé'));
    const { container } = render(<Harnais />);
    within(container).getByRole('button', { name: 'Charger' }).click();

    await waitFor(() => expect(within(container).getByRole('alert')).toBeTruthy());
    expect(container.textContent).not.toMatch(/Aucune consultation ouverte/);
  });
});

describe('RenseignementsPatientPanel — ce que le patient a écrit est rendu tel quel', () => {
  async function rendreAvec(consultations: Consultation[]) {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ consultations }) });
    const rendu = render(<Harnais />);
    within(rendu.container).getByRole('button', { name: 'Charger' }).click();
    await waitFor(() => expect(within(rendu.container).queryByRole('status')).toBeNull());
    return rendu;
  }

  it('rend le texte libre, les choix multiples et les groupes répétables', async () => {
    const { container } = await rendreAvec([CONSULTATION_REMPLIE]);

    expect(container.textContent).toContain('Je dors mal depuis six mois.');
    expect(container.textContent).toContain('Améliorer le sommeil');
    expect(container.textContent).toContain('Améliorer l’énergie');
    expect(container.textContent).toContain('Magnésium');
    expect(container.textContent).toContain('300 mg');
  });

  it('le suffixe d’unité accompagne la valeur, il ne la remplace pas', async () => {
    const { container } = await rendreAvec([CONSULTATION_REMPLIE]);
    expect(container.textContent).toContain('168 cm');
  });

  it('un champ posé mais non répondu est DIT « non renseigné », pas masqué', async () => {
    const { container } = await rendreAvec([CONSULTATION_REMPLIE]);

    // « Nombre d'enfants » fait partie de la fiche et n'a pas été rempli : le
    // praticien doit voir que la question a été posée.
    expect(container.textContent).toContain('Nombre d’enfants');
    expect(container.textContent).toContain('Non renseigné');
  });

  it('le consentement de la consultation est lisible — il ne l’était nulle part', async () => {
    const { container } = await rendreAvec([CONSULTATION_REMPLIE]);
    expect(container.textContent).toMatch(/Consentement\s*:\s*donne/);
    expect(container.textContent).toContain('v2');
  });

  it('une consultation sans dépôt le dit, section par section', async () => {
    const { container } = await rendreAvec([CONSULTATION_VIDE]);
    expect(container.textContent).toMatch(/Fiche signalétique\s*:\s*aucun dépôt/);
    expect(container.textContent).toMatch(/Anamnèse\s*:\s*aucun dépôt/);
  });

  it('NE CALCULE RIEN : aucun décompte des réponses n’apparaît', async () => {
    const { container } = await rendreAvec([CONSULTATION_REMPLIE]);
    // `DC-19`/`DC-20` : ce panneau affiche, il ne résume pas. Un « 2 réponses
    // sur 9 » serait un score déguisé.
    expect(container.textContent).not.toMatch(/\d+\s*(réponses?|champs?)\s*(sur|\/)/i);
  });
});

describe('phraseEtatRenseignements — la ligne qui reste visible sans ouvrir le tiroir', () => {
  it('sans aucun dépôt, elle nomme les DEUX absences', () => {
    expect(phraseEtatRenseignements([CONSULTATION_VIDE])).toBe(
      'Aucun renseignement déposé : ni fiche signalétique, ni anamnèse.',
    );
  });

  it('avec les deux dépôts, elle donne deux dates', () => {
    const phrase = phraseEtatRenseignements([CONSULTATION_REMPLIE]);
    expect(phrase).toContain('Fiche signalétique recueillie le 12/09/2026');
    expect(phrase).toContain('anamnèse déposée le 12/09/2026');
  });

  it('un dépôt partiel se dit partiel, et ne se tait pas sur ce qui manque', () => {
    const ficheSeule: Consultation = { ...CONSULTATION_REMPLIE, anamnese: null, dateValidation: null };
    const phrase = phraseEtatRenseignements([ficheSeule]);
    expect(phrase).toContain('Fiche signalétique recueillie');
    // LE POINT : l'absence d'anamnèse est ÉCRITE. Une ligne qui ne citerait que
    // ce qui existe laisserait croire que le dossier est complet.
    expect(phrase).toContain('anamnèse non déposée');
  });

  it('sur une anamnèse non validée, elle cite la date de création faute de validation', () => {
    const enCours: Consultation = {
      ...CONSULTATION_REMPLIE,
      statut: 'en_cours',
      dateValidation: null,
      createdAt: '2026-09-10T09:00:00.000Z',
    };
    expect(phraseEtatRenseignements([enCours])).toContain('anamnèse déposée le 10/09/2026');
  });
});
