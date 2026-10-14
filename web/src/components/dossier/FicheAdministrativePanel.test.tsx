// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FicheAdministrativePanel, type PatientDossier } from './FicheAdministrativePanel';
import { PATIENT } from './fixturesDossier';

// LE DOSSIER ÉDITÉ EST CELUI D'UN PATIENT FICTIF DU DÉPÔT, et rien d'autre.
const DOSSIER = {
  ...PATIENT,
  telephone: '0600000000',
  dateNaissance: '1984-01-17',
  adresse: '12 rue des Fictifs, 75000 Paris',
  medecinTraitantNom: 'Dr Martin',
  medecinTraitantCoordonnees: '01 02 03 04 05',
} as unknown as PatientDossier;

let corpsPatch: Record<string, unknown>[] = [];

function stub(reponse: Record<string, unknown> = { success: true }, ok = true) {
  corpsPatch = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      corpsPatch.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
      return { ok, json: async () => reponse } as Response;
    }),
  );
}

function monter(reponse?: Record<string, unknown>, ok?: boolean) {
  stub(reponse, ok);
  const onEnregistre = vi.fn();
  render(
    <FicheAdministrativePanel patient={DOSSIER} onEnregistre={onEnregistre} onFermer={() => {}} />,
  );
  return { onEnregistre };
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FicheAdministrativePanel — ce qui était devenu incorrigible', () => {
  beforeEach(() => {
    monter();
  });

  it('rend les huit champs du dossier, pas le seul téléphone', () => {
    // LE DÉFAUT QUE CE BANC GARDE. Le formulaire d'origine ne portait QU'UN
    // champ : une faute de frappe sur un nom saisi à la création était
    // définitive, et le praticien devait recréer un dossier — donc en
    // abandonner l'historique.
    for (const libelle of [
      /^prénom$/i,
      /^nom$/i,
      /date de naissance/i,
      /adresse e-mail/i,
      /^téléphone$/i,
      /adresse postale/i,
      /nom du médecin/i,
      /^coordonnées$/i,
    ]) {
      expect(screen.getByLabelText(libelle), String(libelle)).toBeTruthy();
    }
  });

  it('affiche les valeurs du dossier, y compris celles que le tableau ne montre pas', () => {
    expect((screen.getByLabelText(/adresse postale/i) as HTMLInputElement).value).toBe(
      '12 rue des Fictifs, 75000 Paris',
    );
  });

  it('★ ne propose plus le numéro de sécurité sociale (D-284 §2, lot g)', () => {
    // Son recueil n'a pas de fondement pour ce responsable : le champ a quitté
    // la fiche, sa section avec lui.
    expect(screen.queryByLabelText(/sécurité sociale/i)).toBeNull();
    expect(screen.queryByText(/sécurité sociale/i)).toBeNull();
  });
});

describe('FicheAdministrativePanel — n’envoyer que ce qui a changé', () => {
  it('★ ne poste QUE les champs modifiés', () => {
    // CE N'EST PAS UNE OPTIMISATION. La route lit `undefined` comme « ne touche
    // pas » : renvoyer tout le formulaire ferait réécrire les quatre copies
    // dénormalisées de l'e-mail dès qu'on corrige un téléphone.
    monter();
    fireEvent.change(screen.getByLabelText(/^prénom$/i), { target: { value: 'Michèle' } });
    fireEvent.click(screen.getByRole('button', { name: /^enregistrer$/i }));
    return waitFor(() => {
      expect(corpsPatch).toHaveLength(1);
      expect(corpsPatch[0]).toEqual({ idPatient: DOSSIER.idPatient, prenom: 'Michèle' });
    });
  });

  it('ne poste RIEN quand rien n’a bougé, et le dit', async () => {
    monter();
    fireEvent.click(screen.getByRole('button', { name: /^enregistrer$/i }));
    expect(await screen.findByText(/aucune modification/i)).toBeTruthy();
    expect(corpsPatch).toHaveLength(0);
  });

  it('vider un champ est une modification — c’est ainsi qu’on RETIRE un renseignement', async () => {
    // Sans cela, une adresse saisie par erreur resterait au dossier pour
    // toujours : le formulaire n'aurait aucun moyen de dire « retire-la ».
    monter();
    fireEvent.change(screen.getByLabelText(/adresse postale/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /^enregistrer$/i }));
    await waitFor(() => expect(corpsPatch[0]).toEqual({ idPatient: DOSSIER.idPatient, adresse: '' }));
  });
});

describe('FicheAdministrativePanel — le refus qui fait foi est celui de la route', () => {
  it('★ rend le message de la route, et en alerte', async () => {
    // AUCUNE VALIDATION RECOPIÉE ICI. Un contrôle côté écran dériverait de
    // celui de la route au premier changement, et le praticien verrait alors
    // deux verdicts différents sur la même saisie.
    monter(
      {
        success: false,
        reason: 'invalid_payload',
        error: 'Date de naissance invalide (format attendu : AAAA-MM-JJ).',
      },
      false,
    );
    fireEvent.change(screen.getByLabelText(/adresse postale/i), {
      target: { value: '1 rue des Fictifs' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toContain('Date de naissance invalide');
  });

  it('une adresse déjà prise est rendue lisible, pas en code', async () => {
    monter({ success: false, reason: 'duplicate_email' }, false);
    fireEvent.change(screen.getByLabelText(/adresse e-mail/i), {
      target: { value: 'sophie.nicola@fictif.wellneuro.fr' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^enregistrer$/i }));
    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).not.toContain('duplicate_email');
    expect(alerte.textContent!.length).toBeGreaterThan(10);
  });

  it('un refus ne prévient PAS la liste qu’il faut se rafraîchir', async () => {
    const { onEnregistre } = monter({ success: false, reason: 'exception' }, false);
    fireEvent.change(screen.getByLabelText(/^nom$/i), { target: { value: 'Dogne' } });
    fireEvent.click(screen.getByRole('button', { name: /^enregistrer$/i }));
    await screen.findByRole('alert');
    expect(onEnregistre).not.toHaveBeenCalled();
  });
});

describe('FicheAdministrativePanel — ce que l’écran DIT au praticien', () => {
  beforeEach(() => monter());

  it('dit que changer l’e-mail déplace la porte d’entrée du patient', () => {
    // CE N'EST PAS UN CHAMP DE CONTACT COMME LES AUTRES : c'est par cette
    // adresse que le patient reçoit ses liens. Le dire AVANT la saisie, pas
    // dans un message d'erreur après coup.
    expect(screen.getByText(/porte d’entrée/i)).toBeTruthy();
  });

  it('dit que noter un médecin traitant ne lui adresse rien', () => {
    // MÊME PHRASE QUE CELLE SERVIE AU PATIENT dans « Vos données
    // personnelles » : deux formulations pour un même fait laisseraient croire
    // qu'il y a deux faits.
    expect(screen.getByText(/ne lui adresse rien/i)).toBeTruthy();
  });

  it('renvoie l’état du dossier au menu de la ligne, derrière sa confirmation', () => {
    // `D-126` : désactiver ferme les liens en vol. Ce formulaire n'a aucune
    // confirmation — l'état ne doit donc jamais s'y changer.
    expect(screen.getByText(/se change depuis « Gérer le dossier »/i)).toBeTruthy();
    expect(screen.queryByLabelText(/état du dossier/i)).toBeNull();
  });
});
