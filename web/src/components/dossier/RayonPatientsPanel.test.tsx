// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RayonPatientsPanel } from './RayonPatientsPanel';
import { PATIENT, AUTRE_PATIENT, stubFetch, ouvrirMenu, item } from './fixturesDossier';

// LE RAYON PATIENTS — ce qui se joue ici est le DOSSIER, et rien d'autre.
//
// La surface d'émission du lien magique (gate G4) : quatre actions portent
// l'accès patient, dont trois concernent le jeton PERMANENT. La quatrième est
// d'une autre nature — 24 h, une seule ouverture — et n'existe que drapeau
// allumé.
//
// Le cycle de vie du dossier (IDP2, LOT-01b) : clôture de suivi et effacement
// réel. Ces actions ont quitté la carte du haut pour le menu « Gérer le
// dossier » de chaque ligne — d'où le passage par `ouvrirMenu()`.
//
// LES BANCS D'ASSIGNATION ONT DÉMÉNAGÉ le 2026-09-16, avec leur panneau :
// `components/bibliotheque/AssignationsPacksPanel.test.tsx`.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RayonPatientsPanel — émission d’un lien à usage unique (G4)', () => {
  beforeEach(() => vi.clearAllMocks());

  // Le drapeau éteint doit rendre l'action inatteignable, pas seulement grisée :
  // c'est ce qui garantit qu'un merge n'active rien.
  it('drapeau éteint : l’item n’existe pas', async () => {
    stubFetch();
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    expect(item(/renvoyer le lien/i)).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: /usage unique/i })).toBeNull();
  });

  it('drapeau allumé : l’item apparaît, à côté des actions du lien permanent', async () => {
    stubFetch();
    render(<RayonPatientsPanel lienMagiqueActif />);
    await ouvrirMenu();
    // Les trois actions historiques restent : la coexistence est visible.
    expect(item(/usage unique/i)).toBeTruthy();
    expect(item(/renvoyer le lien/i)).toBeTruthy();
    expect(item(/copier le lien/i)).toBeTruthy();
    expect(item(/révoquer l’accès/i)).toBeTruthy();
  });

  // Le libellé porte la différence de nature. Confondre les deux liens, c'est
  // promettre un accès permanent là où il expire en 24 h.
  it('le libellé annonce la durée et l’usage unique', async () => {
    stubFetch();
    render(<RayonPatientsPanel lienMagiqueActif />);
    await ouvrirMenu();
    expect(item(/usage unique/i).textContent).toMatch(/24\s*h/);
  });

  it('l’action postée est `lien_magique`, jamais celle du lien permanent', async () => {
    const appels = stubFetch();
    render(<RayonPatientsPanel lienMagiqueActif />);
    await ouvrirMenu();
    fireEvent.click(item(/usage unique/i));

    await waitFor(() => {
      const token = appels.filter(a => a.url === '/api/praticien/token');
      expect(token.length).toBe(1);
      expect(token[0].body).toMatchObject({ action: 'lien_magique', idPatient: 'PAT_SEED_03' });
    });
  });

  // Un échec silencieux ferait croire au praticien qu'un lien est parti, et le
  // patient attendrait un e-mail qui n'arrive jamais.
  it('un échec serveur est dit, et ne se présente pas comme un envoi', async () => {
    stubFetch({ surToken: () => ({ success: false, reason: 'portal_revoked', error: 'Accès portail révoqué.' }) });
    render(<RayonPatientsPanel lienMagiqueActif />);
    await ouvrirMenu();
    fireEvent.click(item(/usage unique/i));

    await waitFor(() => expect(screen.getByText(/révoqué/i)).toBeTruthy());
    expect(screen.queryByText(/valable 24 h/i)).toBeNull();
  });

  // Le serveur ACCEPTE (`success: true`, le lien est émis en base) et l'e-mail
  // meurt quand même. C'est le cas que les trois `catch` muets rendaient
  // indistinguable d'un succès : deux faits à dire, pas un.
  it('un lien émis dont l’e-mail meurt dit les deux faits, et rougit', async () => {
    stubFetch({
      surToken: () => ({ success: true, lien: 'https://x/portail/lien/J', envoi: 'echoue' }),
    });
    render(<RayonPatientsPanel lienMagiqueActif />);
    await ouvrirMenu();
    fireEvent.click(item(/usage unique/i));

    const ligne = await screen.findByText(/Lien à usage unique émis, mais l’e-mail n’est pas parti/);
    expect(ligne).toBeTruthy();
    // LA COULEUR, ET PAS PAR `getByRole('status')` : deux `span[role=status]`
    // coexistent dès qu'un tiroir est ouvert. L'assertion porte sur l'élément
    // du texte, seul endroit sans ambiguïté.
    expect(ligne.className).toContain('text-status-danger');
    expect(screen.queryByText(/valable 24 h/i)).toBeNull();
  });

  it('un renvoi d’accès mort rougit lui aussi, et dit quoi faire', async () => {
    stubFetch({ surToken: () => ({ success: true, envoi: 'echoue' }) });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/renvoyer le lien/i));

    const ligne = await screen.findByText(/Le lien n’est pas parti/);
    expect(ligne.className).toContain('text-status-danger');
    expect(screen.queryByText(/renvoyé au patient/)).toBeNull();
  });
});

describe('RayonPatientsPanel — cycle de vie du dossier (LOT-01b)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('groupe les deux fins de parcours et nomme l’effacement pour ce qu’il est', async () => {
    stubFetch();
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    expect(item(/clôturer le suivi/i)).toBeTruthy();
    expect(item(/effacer définitivement/i)).toBeTruthy();
    // « Supprimer » désignait une désactivation : le mot a disparu de l'écran.
    expect(screen.queryByText(/^Supprimer$/)).toBeNull();
  });

  it('la clôture passe par une confirmation avant tout appel', async () => {
    const appels = stubFetch();
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/clôturer le suivi/i));

    // Le dialogue nomme le dossier, et rien n'est encore parti.
    await screen.findByRole('heading', { name: /michel dogné/i });
    expect(appels.some(a => a.url.includes('cycle-de-vie'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /^clôturer le suivi$/i }));
    await waitFor(() => {
      const appel = appels.find(a => a.url.includes('cycle-de-vie'));
      expect(appel?.body).toMatchObject({ idPatient: 'PAT_SEED_03', action: 'cloture' });
    });
  });

  // Le serveur exige `confirmation: 'EFFACER'`. L'écran ne doit pas inventer
  // un second contrat, il doit refléter celui-là.
  it('l’effacement poste la confirmation exacte attendue par la route', async () => {
    const appels = stubFetch({ surCycleDeVie: () => ({ success: true, action: 'effacement', lignesSupprimees: 7 }) });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/effacer définitivement/i));

    const champ = await screen.findByLabelText(/saisissez/i);
    fireEvent.change(champ, { target: { value: 'EFFACER' } });
    fireEvent.click(screen.getByRole('button', { name: /^effacer définitivement$/i }));

    await waitFor(() => {
      const appel = appels.find(a => a.url.includes('cycle-de-vie'));
      expect(appel?.body).toMatchObject({
        idPatient: 'PAT_SEED_03',
        action: 'effacement',
        confirmation: 'EFFACER',
      });
    });
  });

  it('sans le mot saisi, aucun effacement n’est posté', async () => {
    const appels = stubFetch();
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/effacer définitivement/i));

    await screen.findByLabelText(/saisissez/i);
    fireEvent.click(screen.getByRole('button', { name: /^effacer définitivement$/i }));

    await waitFor(() => expect(screen.getByLabelText(/saisissez/i)).toBeTruthy());
    expect(appels.some(a => a.url.includes('cycle-de-vie'))).toBe(false);
  });

  // Le message de succès est le SEUL des trois textes de clôture que le
  // praticien voit à chaque fois : le dialogue le précède, le refus n'arrive
  // qu'en cas d'échec. Il n'était couvert par aucun test — c'est pour cela
  // qu'il a continué de promettre « aucun envoi » quand tout le reste avait été
  // corrigé le 2026-07-21. Il doit dire les deux choses : ce qui s'arrête, et
  // que le lien d'accès reste renvoyable.
  it('le message de clôture borne le refus au suivi et annonce le lien qui reste', async () => {
    stubFetch({ surCycleDeVie: () => ({ success: true, action: 'cloture' }) });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/clôturer le suivi/i));
    fireEvent.click(await screen.findByRole('button', { name: /^clôturer le suivi$/i }));

    const message = await screen.findByText(/suivi clôturé\s*:/i);
    expect(message.textContent).toMatch(/document de suivi/i);
    expect(message.textContent).toMatch(/renvoyer son lien/i);
    // Le refus doit rester BORNÉ : « aucun envoi » tout court reviendrait à la
    // promesse absolue que ce lot retire. Seul « de document de suivi » l'excuse.
    expect(message.textContent).not.toMatch(/aucun envoi(?! de document de suivi)/i);
  });

  // Même clôture, dossier déjà désactivé : le portail refuse déjà l'entrée,
  // promettre un lien renvoyable y serait faux. Le message doit suivre la même
  // condition que le dialogue, qui branche déjà sur `accesActif`.
  it('sur un dossier désactivé, le message de clôture ne promet aucun accès', async () => {
    stubFetch({
      patient: { ...PATIENT, actif: 'NON' },
      surCycleDeVie: () => ({ success: true, action: 'cloture' }),
    });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/clôturer le suivi/i));
    fireEvent.click(await screen.findByRole('button', { name: /^clôturer le suivi$/i }));

    const message = await screen.findByText(/suivi clôturé\s*:/i);
    expect(message.textContent).not.toMatch(/renvoyer son lien/i);
    expect(message.textContent).toMatch(/sans accès au portail/i);
  });

  it('un dossier clos propose la reprise, pas une seconde clôture', async () => {
    stubFetch({ patient: { ...PATIENT, suiviClotureLe: '2026-07-21T10:00:00.000Z' } });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    expect(item(/rouvrir le suivi/i)).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: /clôturer le suivi/i })).toBeNull();
  });

  it('un dossier clos est signalé par un libellé, pas par une nuance de gris', async () => {
    stubFetch({ patient: { ...PATIENT, suiviClotureLe: '2026-07-21T10:00:00.000Z' } });
    render(<RayonPatientsPanel />);
    await waitFor(() => expect(screen.getByText('Suivi clôturé')).toBeTruthy());
  });

  // La clôture interdit les envois, pas la lecture : le patient garde ses
  // archives, donc lui renvoyer son lien reste légitime.
  it('un dossier clos conserve ses actions d’accès au portail', async () => {
    stubFetch({ patient: { ...PATIENT, suiviClotureLe: '2026-07-21T10:00:00.000Z' } });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    // `MenuActions` pose `aria-disabled`, jamais `disabled` : lire `.disabled`
    // rendait ce banc incapable de rougir.
    expect(item(/renvoyer le lien/i).getAttribute('aria-disabled')).toBe(null);
  });

  // Régression : la désactivation coupe l'accès au portail du patient. Avant
  // ce lot, la même écriture demandait deux gestes (« Supprimer » puis
  // « Confirmer ») ; la renommer ne justifiait pas de lui retirer sa garde.
  it('la désactivation demande confirmation avant de couper l’accès', async () => {
    const appels = stubFetch();
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/désactiver le dossier/i));

    await screen.findByRole('heading', { name: /désactiver le dossier de michel dogné/i });
    expect(appels.some(a => a.method === 'PATCH')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /^désactiver le dossier$/i }));
    await waitFor(() => {
      const patch = appels.find(a => a.method === 'PATCH');
      expect(patch?.body).toMatchObject({ idPatient: 'PAT_SEED_03', actif: 'NON' });
    });
  });

  // Régression `D-126`, point 5. Ce formulaire était la SEULE porte de
  // désactivation sans dialogue de confirmation. La désactivation étant
  // devenue irréversible — elle ferme les liens en vol —, un praticien venu
  // corriger un numéro de téléphone pouvait tuer le lien envoyé deux heures
  // plus tôt, pour tout retour « Patient mis à jour. ».
  it('le formulaire « Modifier » n’envoie jamais `actif`', async () => {
    const appels = stubFetch();
    render(<RayonPatientsPanel />);
    fireEvent.click((await screen.findAllByRole('button', { name: /^modifier$/i }))[0]);

    // L'état reste LISIBLE, il n'est plus modifiable ici.
    expect(screen.getByText(/se change depuis « Gérer le dossier »/i)).toBeTruthy();

    // IL FAUT MODIFIER QUELQUE CHOSE POUR QUE LA FICHE POSTE (LOT-05) : elle
    // n'envoie que les champs qui ont changé, et ne poste rien quand rien n'a
    // bougé. Sans cette saisie, ce banc mesurerait ce silence-là, pas l'absence
    // d'`actif`.
    fireEvent.change(screen.getByLabelText(/^téléphone$/i), { target: { value: '0600000000' } });
    fireEvent.click(await screen.findByRole('button', { name: /^enregistrer$/i }));
    await waitFor(() => {
      const patch = appels.find(a => a.method === 'PATCH');
      expect(patch).toBeTruthy();
      expect(patch!.body).not.toHaveProperty('actif');
    });
  });

  // Régression `D-126`, point 6, et symétrique du banc « un dossier clos
  // conserve ses actions d'accès » ci-dessus : ce que la clôture laisse
  // ouvert, la désactivation le ferme. Le serveur refusait déjà les trois,
  // mais en « Patient introuvable. » sur un dossier que le praticien a sous
  // les yeux — un bouton qui ment est pire qu'un bouton grisé.
  //
  // « Copier le lien » EST DEDANS : il poste lui aussi (`action: 'lien'`), et
  // le garde `actif` d'`api/praticien/token` précède l'aiguillage des actions.
  // La quatrième action, le lien magique, n'existe que drapeau allumé.
  it('un dossier désactivé grise ses actions d’accès au portail', async () => {
    stubFetch({ patient: { ...PATIENT, actif: 'NON' } });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    expect(item(/renvoyer le lien/i).getAttribute('aria-disabled')).toBe('true');
    expect(item(/copier le lien/i).getAttribute('aria-disabled')).toBe('true');
  });

  it('un dossier inactif propose la réactivation, et l’envoie par PATCH', async () => {
    const appels = stubFetch({ patient: { ...PATIENT, actif: 'NON' } });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/réactiver le dossier/i));
    fireEvent.click(await screen.findByRole('button', { name: /^réactiver le dossier$/i }));

    await waitFor(() => {
      const patch = appels.find(a => a.method === 'PATCH');
      expect(patch?.body).toMatchObject({ idPatient: 'PAT_SEED_03', actif: 'OUI' });
    });
  });

  // Radix pose un voile et `aria-hidden` sur le reste du document : un message
  // rendu hors du dialogue est derrière l'overlay, souvent hors du viewport, et
  // muet pour un lecteur d'écran. Sur une action irréversible, l'échec serait
  // alors silencieux. `getByText` seul ne prouve rien — on exige le
  // confinement.
  it('dit l’échec DANS le dialogue, qui reste ouvert', async () => {
    stubFetch({
      surCycleDeVie: () => ({ success: false, reason: 'exception', error: 'Erreur technique.' }),
    });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/clôturer le suivi/i));
    fireEvent.click(await screen.findByRole('button', { name: /^clôturer le suivi$/i }));

    const alerte = await screen.findByRole('alert');
    expect(alerte.closest('[role="dialog"]')).not.toBeNull();
    // Le dialogue reste ouvert : on doit pouvoir réessayer ou annuler.
    expect(screen.getByRole('button', { name: /^clôturer le suivi$/i })).toBeTruthy();
  });

  it('rend lisible un refus serveur sur dossier clos', async () => {
    stubFetch({
      surCycleDeVie: () => ({ success: false, reason: 'dossier_cloture', error: 'Dossier clos.' }),
    });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/clôturer le suivi/i));
    fireEvent.click(await screen.findByRole('button', { name: /^clôturer le suivi$/i }));

    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toMatch(/suivi de ce dossier est clôturé/i);
  });

  // Le dialogue est unique pour tout le tableau : c'est là que se logerait un
  // effacement porté sur le mauvais dossier.
  it('la confirmation porte sur le patient dont le menu a été ouvert', async () => {
    const appels = stubFetch({ patients: [PATIENT, AUTRE_PATIENT] });
    render(<RayonPatientsPanel />);
    await ouvrirMenu(1);
    fireEvent.click(item(/effacer définitivement/i));

    await screen.findByRole('heading', { name: /sophie nicola/i });
    fireEvent.change(screen.getByLabelText(/saisissez/i), { target: { value: 'EFFACER' } });
    fireEvent.click(screen.getByRole('button', { name: /^effacer définitivement$/i }));

    await waitFor(() => {
      const appel = appels.find(a => a.url.includes('cycle-de-vie'));
      expect(appel?.body).toMatchObject({ idPatient: 'PAT_SEED_01' });
    });
  });

  it('une saisie abandonnée sur un dossier ne se reporte pas sur le suivant', async () => {
    stubFetch({ patients: [PATIENT, AUTRE_PATIENT] });
    render(<RayonPatientsPanel />);
    await ouvrirMenu(0);
    fireEvent.click(item(/effacer définitivement/i));
    fireEvent.change(await screen.findByLabelText(/saisissez/i), { target: { value: 'EFFACER' } });
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));

    await ouvrirMenu(1);
    fireEvent.click(item(/effacer définitivement/i));
    await screen.findByRole('heading', { name: /sophie nicola/i });
    expect((screen.getByLabelText(/saisissez/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByRole('button', { name: /^effacer définitivement$/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('trois clics sur un effacement ne produisent qu’un seul appel', async () => {
    const appels = stubFetch({ delaiCycleDeVie: 30 });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/effacer définitivement/i));
    fireEvent.change(await screen.findByLabelText(/saisissez/i), { target: { value: 'EFFACER' } });

    const bouton = screen.getByRole('button', { name: /^effacer définitivement$/i });
    fireEvent.click(bouton);
    fireEvent.click(bouton);
    fireEvent.click(bouton);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(appels.filter(a => a.url.includes('cycle-de-vie'))).toHaveLength(1);
  });

  // `phaseDossier` fait primer la clôture, ce qui est juste pour décider d'un
  // envoi. Mais afficher le seul « Suivi clôturé » sur un dossier désactivé
  // laisserait croire que le patient consulte encore ses archives.
  it('un dossier clos ET désactivé affiche les deux états', async () => {
    stubFetch({
      patient: { ...PATIENT, actif: 'NON', suiviClotureLe: '2026-07-21T10:00:00.000Z' },
    });
    render(<RayonPatientsPanel />);
    await waitFor(() => expect(screen.getByText('Suivi clôturé')).toBeTruthy());
    expect(screen.getByText('Inactif')).toBeTruthy();
  });

  it('ne promet pas la lecture des archives quand le dossier est désactivé', async () => {
    stubFetch({ patient: { ...PATIENT, actif: 'NON' } });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/clôturer le suivi/i));
    await screen.findByRole('heading', { name: /clôturer le suivi/i });

    expect(screen.queryByText(/conserve l’accès en lecture/i)).toBeNull();
    expect(screen.getByText(/n’a plus accès à son espace/i)).toBeTruthy();
  });

  // Les boutons remplacés portaient `disabled` pendant l'appel. Sans ce garde,
  // deux ouvertures successives du menu envoient deux fois le même lien.
  it('neutralise les actions d’accès pendant qu’un envoi est en vol', async () => {
    const appels = stubFetch({
      surToken: () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 40)) as never,
    });
    render(<RayonPatientsPanel />);
    const declencheur = await ouvrirMenu();
    fireEvent.click(item(/renvoyer le lien/i));

    fireEvent.click(declencheur);
    await waitFor(() =>
      expect(item(/renvoyer le lien/i).getAttribute('aria-disabled')).toBe('true'),
    );
    fireEvent.click(item(/renvoyer le lien/i));

    await waitFor(() => {
      expect(appels.filter(a => a.url === '/api/praticien/token')).toHaveLength(1);
    });
  });

  it('signale les dossiers clos dans le sélecteur de consultation', async () => {
    stubFetch({ patient: { ...PATIENT, suiviClotureLe: '2026-07-21T10:00:00.000Z' } });
    render(<RayonPatientsPanel />);
    // Le formulaire vit désormais dans son tiroir (SP-TRAJ LOT-05).
    await screen.findAllByRole('button', { name: /gérer le dossier/i });
    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle consultation' }));
    await waitFor(() => expect(screen.getByText(/Michel Dogné.*\(suivi clôturé\)/)).toBeTruthy());
  });
});

describe('RayonPatientsPanel — révocation d’accès (LOT-02c)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('demande confirmation avant tout appel, et dit ce qui est coupé', async () => {
    const appels = stubFetch();
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/révoquer l’accès/i));

    await screen.findByRole('heading', { name: /révoquer l’accès de michel dogné/i });
    expect(screen.getByText(/session en cours est coupée/i)).toBeTruthy();
    expect(screen.getByText(/usage unique déjà envoyés/i)).toBeTruthy();
    // Rien n'est parti tant que le praticien n'a pas confirmé.
    expect(appels.some(a => a.method === 'DELETE')).toBe(false);
  });

  it('annuler n’appelle rien', async () => {
    const appels = stubFetch();
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/révoquer l’accès/i));
    await screen.findByRole('heading', { name: /révoquer l’accès/i });

    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: /révoquer l’accès de/i })).toBeNull());
    expect(appels.some(a => a.method === 'DELETE')).toBe(false);
  });

  it('confirmer révoque une fois, et le message nomme les trois portes fermées', async () => {
    const appels = stubFetch();
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/révoquer l’accès/i));
    fireEvent.click(await screen.findByRole('button', { name: /^révoquer l’accès$/i }));

    await waitFor(() => {
      const revocations = appels.filter(a => a.method === 'DELETE');
      expect(revocations).toHaveLength(1);
      expect(revocations[0].url).toContain('PAT_SEED_03');
    });

    const message = await screen.findByText(/accès révoqué\s*:/i);
    expect(message.textContent).toMatch(/session en cours/i);
    expect(message.textContent).toMatch(/usage unique/i);
  });

  // Leçon du LOT-01b : un message rendu hors du dialogue passe derrière
  // l'overlay Radix et sous `aria-hidden`. L'échec doit être DANS le dialogue.
  it('un refus s’affiche dans le dialogue, qui reste ouvert', async () => {
    stubFetch({ surToken: () => ({ success: false, reason: 'forbidden', error: 'Patient non accessible.' }) });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/révoquer l’accès/i));
    fireEvent.click(await screen.findByRole('button', { name: /^révoquer l’accès$/i }));

    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toMatch(/pas accessible depuis votre compte/i);
    expect(screen.getByRole('heading', { name: /révoquer l’accès de/i })).toBeTruthy();
  });
});

describe('RayonPatientsPanel — tiroirs d’action (SP-TRAJ LOT-05)', () => {
  it('les formulaires ne sont plus empilés : chacun s’ouvre dans son tiroir', async () => {
    stubFetch();
    render(<RayonPatientsPanel />);
    await screen.findAllByRole('button', { name: /gérer le dossier/i });

    // Fermés par défaut : aucun champ de création dans le DOM.
    expect(screen.queryByPlaceholderText('Prénom *')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Nouveau patient' }));
    const tiroir = await screen.findByRole('dialog', { name: 'Nouveau patient' });
    expect(tiroir).toBeTruthy();
    expect(screen.getByPlaceholderText('Prénom *')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Créer le patient' })).toBeTruthy();
  });

  it('la création de consultation refermée sur succès s’annonce par la ligne de statut de la page', async () => {
    stubFetch();
    render(<RayonPatientsPanel />);
    await screen.findAllByRole('button', { name: /gérer le dossier/i });

    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle consultation' }));
    await screen.findByRole('dialog', { name: 'Nouvelle consultation' });

    // Sélectionne le patient puis soumet : le stub répond success.
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'PAT_SEED_03' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer une consultation/ }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText(/Consultation créée, lien d’accès envoyé au patient/)).toBeTruthy();
  });

  async function creerConsultation() {
    render(<RayonPatientsPanel />);
    await screen.findAllByRole('button', { name: /gérer le dossier/i });
    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle consultation' }));
    await screen.findByRole('dialog', { name: 'Nouvelle consultation' });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'PAT_SEED_03' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer une consultation/ }));
  }

  it('un envoi mort ne s’annonce plus « lien d’accès envoyé »', async () => {
    // LE TIROIR SE FERME QUAND MÊME. La consultation EST créée : le laisser
    // ouvert sur un dossier déjà créé inviterait à la double soumission. C'est
    // le TEXTE qui porte l'échec, et il dit quoi faire.
    stubFetch({ surConsultations: () => ({ success: true, idConsultation: 'CONS_1', envoi: 'echoue' }) });
    await creerConsultation();

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText(/mais l’e-mail n’est pas parti/)).toBeTruthy();
    expect(screen.queryByText(/lien d’accès envoyé au patient/)).toBeNull();
  });

  it('une messagerie non configurée ne dit pas « réessayez »', async () => {
    // Deux causes, deux gestes : réessayer n'a aucun sens sans SMTP posé.
    stubFetch({ surConsultations: () => ({ success: true, envoi: 'non_configure' }) });
    await creerConsultation();

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText(/la messagerie n’est pas configurée/)).toBeTruthy();
  });
});

describe('RayonPatientsPanel — rétablissement d’un accès révoqué', () => {
  beforeEach(() => vi.clearAllMocks());

  const REVOQUE = { patient: { ...PATIENT, accesRevoque: true } };
  const titreDialogue = /rétablir l’accès de michel dogné/i;

  it('un dossier révoqué porte sa pastille au dossier', async () => {
    stubFetch(REVOQUE);
    render(<RayonPatientsPanel />);
    await waitFor(() => expect(screen.getByText('Accès révoqué')).toBeTruthy());
  });

  it('la pastille se CUMULE avec l’état du dossier, elle ne le remplace pas', async () => {
    // Trois états indépendants : `D-126` §2 interdit de déduire la révocation
    // d'une désactivation, et l'inverse est vrai aussi.
    stubFetch({ patient: { ...PATIENT, actif: 'NON', accesRevoque: true } });
    render(<RayonPatientsPanel />);
    await waitFor(() => expect(screen.getByText('Accès révoqué')).toBeTruthy());
    expect(screen.getByText('Inactif')).toBeTruthy();
  });

  it('un dossier ouvert ne porte aucune pastille de révocation', async () => {
    stubFetch();
    render(<RayonPatientsPanel />);
    await screen.findAllByRole('button', { name: /gérer le dossier/i });
    expect(screen.queryByText('Accès révoqué')).toBeNull();
  });

  it('renvoyer le lien à un dossier révoqué demande confirmation AVANT tout appel', async () => {
    const appels = stubFetch(REVOQUE);
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/renvoyer le lien/i));

    await screen.findByRole('heading', { name: titreDialogue });
    // RIEN N'A ÉTÉ POSTÉ : le dialogue s'interpose, il ne commente pas après coup.
    expect(appels.some(a => a.url === '/api/praticien/token')).toBe(false);
  });

  it('confirmer poste l’accord explicite', async () => {
    const appels = stubFetch(REVOQUE);
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/renvoyer le lien/i));
    await screen.findByRole('heading', { name: titreDialogue });
    fireEvent.click(screen.getByRole('button', { name: /^rétablir l’accès$/i }));

    await waitFor(() => {
      const token = appels.filter(a => a.url === '/api/praticien/token');
      expect(token.length).toBe(1);
      expect(token[0].body).toMatchObject({
        idPatient: 'PAT_SEED_03',
        action: 'resend',
        retablirAcces: true,
      });
    });
  });

  it('annuler n’appelle rien et laisse l’accès fermé', async () => {
    const appels = stubFetch(REVOQUE);
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/renvoyer le lien/i));
    await screen.findByRole('heading', { name: titreDialogue });
    fireEvent.click(screen.getByRole('button', { name: /^annuler$/i }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: titreDialogue })).toBeNull());
    expect(appels.some(a => a.url === '/api/praticien/token')).toBe(false);
  });

  it('un dossier NON révoqué n’ouvre aucun dialogue et poste SANS drapeau', async () => {
    // Une confirmation systématique userait la seule qui compte.
    const appels = stubFetch();
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/renvoyer le lien/i));

    await waitFor(() => {
      const token = appels.filter(a => a.url === '/api/praticien/token');
      expect(token.length).toBe(1);
      expect((token[0].body as { retablirAcces?: boolean }).retablirAcces).toBeUndefined();
    });
    expect(screen.queryByRole('heading', { name: titreDialogue })).toBeNull();
  });

  it('un refus du rétablissement s’affiche DANS le dialogue, qui reste ouvert', async () => {
    // Derrière l'overlay, la ligne de statut de la page ne se lit pas.
    stubFetch({
      ...REVOQUE,
      surToken: () => ({ success: false, reason: 'forbidden', error: 'Patient non accessible.' }),
    });
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/renvoyer le lien/i));
    await screen.findByRole('heading', { name: titreDialogue });
    fireEvent.click(screen.getByRole('button', { name: /^rétablir l’accès$/i }));

    await screen.findByRole('alert');
    expect(screen.getByRole('heading', { name: titreDialogue })).toBeTruthy();
  });

  it('le sélecteur de consultation signale déjà l’accès révoqué', async () => {
    // Signalé À LA SÉLECTION, et pas seulement refusé après coup : le praticien
    // voit ce qu'il s'apprête à rouvrir avant de composer sa consultation.
    stubFetch(REVOQUE);
    render(<RayonPatientsPanel />);
    await screen.findAllByRole('button', { name: /gérer le dossier/i });
    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle consultation' }));
    await screen.findByRole('dialog', { name: 'Nouvelle consultation' });
    expect(screen.getByText(/Michel Dogné.*\(accès révoqué\)/)).toBeTruthy();
  });

  it('créer une consultation pour un dossier révoqué demande confirmation AVANT tout appel', async () => {
    const appels = stubFetch(REVOQUE);
    render(<RayonPatientsPanel />);
    await screen.findAllByRole('button', { name: /gérer le dossier/i });
    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle consultation' }));
    await screen.findByRole('dialog', { name: 'Nouvelle consultation' });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'PAT_SEED_03' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer une consultation/ }));

    await screen.findByRole('heading', { name: titreDialogue });
    expect(appels.some(a => a.url === '/api/praticien/consultations')).toBe(false);
  });

  it('confirmer la consultation poste l’accord ET le motif saisi', async () => {
    // Le motif est asserté parce qu'un remaniement qui reconstruirait le corps
    // sur le chemin confirmé le perdrait en silence : le praticien aurait
    // saisi son motif, la consultation partirait sans.
    const appels = stubFetch(REVOQUE);
    render(<RayonPatientsPanel />);
    await screen.findAllByRole('button', { name: /gérer le dossier/i });
    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle consultation' }));
    await screen.findByRole('dialog', { name: 'Nouvelle consultation' });
    const listes = screen.getAllByRole('combobox');
    fireEvent.change(listes[0], { target: { value: 'PAT_SEED_03' } });
    fireEvent.change(listes[1], { target: { value: 'Sommeil et récupération' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer une consultation/ }));

    await screen.findByRole('heading', { name: titreDialogue });
    fireEvent.click(screen.getByRole('button', { name: /^rétablir l’accès$/i }));

    await waitFor(() => {
      const posts = appels.filter(a => a.url === '/api/praticien/consultations');
      expect(posts.length).toBe(1);
      expect(posts[0].body).toMatchObject({
        idPatient: 'PAT_SEED_03',
        motif: 'Sommeil et récupération',
        retablirAcces: true,
      });
    });
  });

  it('la table se recharge après un rétablissement confirmé', async () => {
    // Sans quoi la pastille resterait allumée sur un accès rouvert, et le
    // praticien recliquerait sur un dialogue qui n'a plus lieu d'être.
    const appels = stubFetch(REVOQUE);
    render(<RayonPatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/renvoyer le lien/i));
    await screen.findByRole('heading', { name: titreDialogue });
    const avant = appels.filter(a => a.url.startsWith('/api/praticien/patients?page=')).length;
    fireEvent.click(screen.getByRole('button', { name: /^rétablir l’accès$/i }));

    await waitFor(() => {
      const apres = appels.filter(a => a.url.startsWith('/api/praticien/patients?page=')).length;
      expect(apres).toBeGreaterThan(avant);
    });
  });
});

// ★ CONSTAT DE REVUE DU 2026-09-16, ET IL ÉTAIT PLUS GRAVE QU'ANNONCÉ.
//
// `FicheAdministrativePanel` initialise son formulaire UNE FOIS, depuis
// `patient`. Sans `key`, ouvrir la fiche d'un second dossier pendant que celle
// du premier est affichée réutilise le même composant React : le formulaire
// garde les valeurs du PREMIER patient, tandis que `patient.idPatient` désigne
// le SECOND. Enregistrer écrivait alors le nom, l'e-mail et le NIR de l'un sur
// le dossier de l'autre — sans erreur, sans message, sans rien à relire.
describe('RayonPatientsPanel — la fiche suit le dossier qu’on ouvre', () => {
  it('★ ouvrir un SECOND dossier remplace les valeurs du premier', async () => {
    stubFetch({ patients: [PATIENT, AUTRE_PATIENT] });
    render(<RayonPatientsPanel />);

    const boutons = await screen.findAllByRole('button', { name: /^modifier$/i });
    expect(boutons.length).toBeGreaterThan(1);

    fireEvent.click(boutons[0]);
    const premier = (screen.getByLabelText(/adresse e-mail/i) as HTMLInputElement).value;

    fireEvent.click((await screen.findAllByRole('button', { name: /^modifier$/i }))[1]);
    const second = (screen.getByLabelText(/adresse e-mail/i) as HTMLInputElement).value;

    expect(second).not.toBe(premier);
  });

  it('★ et ce qu’on enregistre porte l’identifiant du dossier AFFICHÉ', async () => {
    // LE BANC QUI COMPTE. Le défaut ne se voyait pas à l'écran seulement : il
    // ÉCRIVAIT. Ici, le corps du PATCH doit nommer le second dossier, et le
    // champ modifié doit être celui qu'on vient de taper — pas un écart hérité
    // du premier patient.
    const appels = stubFetch({ patients: [PATIENT, AUTRE_PATIENT] });
    render(<RayonPatientsPanel />);

    fireEvent.click((await screen.findAllByRole('button', { name: /^modifier$/i }))[0]);
    const boutons = await screen.findAllByRole('button', { name: /^modifier$/i });
    fireEvent.click(boutons[1]);

    fireEvent.change(screen.getByLabelText(/^téléphone$/i), { target: { value: '0611111111' } });
    fireEvent.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await waitFor(() => {
      const envoi = appels.find(a => a.method === 'PATCH');
      expect(envoi).toBeTruthy();
      const corps = envoi!.body as Record<string, unknown>;
      // Un seul champ modifié, plus l'identifiant : si le formulaire avait
      // gardé l'état du premier dossier, tous les champs qui diffèrent entre
      // les deux patients partiraient aussi.
      expect(Object.keys(corps).sort()).toEqual(['idPatient', 'telephone']);
    });
  });
});
