// Surface biologie de bout en bout (LOT-02 de 2026-08-18-biologie-consolidee) :
// proposition de bilan → déclaration d'un panel documenté → courrier médecin
// ancré → verdict d'ancrage au fil de correspondance.
//
// `WN_CB_PROPOSITION` est posé en production depuis le 2026-08-18 et AUCUN
// parcours ne traversait ces écrans : ce qui y casserait ne serait vu que par
// un praticien. Ce spec est cette garde.
//
// Patient fictif Jennifer Martin (PAT_SEED_02) : un épisode T0 confirmé et une
// passation `Q_STR_02` en zone danger sont provisionnés en base puis nettoyés.
// Aucun autre spec ne lit ces données. Le seed n'est PAS touché — le modifier
// emporterait `visual.spec.ts` (capture pixel), `fiche-detail-reponses` et
// `seedCertification.guard`.
//
// Mode sériel : les trois tests partagent un état de dossier qui s'accumule
// (déclaration, puis courrier consigné) — l'ordre est le parcours lui-même.
//
// Les drapeaux `WN_CB_ENABLED` et `WN_CB_PROPOSITION` sont exportés par
// `scripts/wn-test-worktree.sh` et par le job `verify` : sans eux la route rend
// 503 et ce spec passerait au vert en ne trouvant rien à cliquer.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';
import {
  provisionnerDossierBiologie,
  nettoyerDossierBiologie,
  MEDECIN_BIO_E2E,
  DATE_BILAN_BIO_E2E,
} from './helpers/db';

const PATIENT_ID = 'PAT_SEED_02';

test.describe.configure({ mode: 'serial' });

test.describe('Surface biologie — proposition, déclaration, courrier', () => {
  test.beforeAll(async () => {
    await provisionnerDossierBiologie(PATIENT_ID);
  });

  test.afterAll(async () => {
    await nettoyerDossierBiologie(PATIENT_ID);
  });

  test('la proposition de bilan est servie, et déclarer un bilan hors outil la recalcule', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    // Le panneau vit dans la phase Actions du cycle clinique — pas dans un
    // onglet à part. Sans épisode confirmé la phase resterait « à ouvrir » :
    // c'est la fixture qui la rend atteignable.
    // LE GESTE QUI OUVRE TOUT — et que le cadrage avait manqué. Le panneau de
    // proposition n'est monté que sur un runtime `ready`, et le `ready` naît de
    // la confirmation d'un épisode T0 : un POST déclenché par ce bouton, pas
    // une ligne en base. Sans ce clic, le client ne DEMANDE jamais la
    // proposition — la route peut répondre `ok`, l'écran reste vide.
    //
    // Le bouton doit être ACTIF : désactivé, il dit que la fixture ne satisfait
    // pas les préconditions dures (rideau cotable, anamnèse consignée, synthèse
    // validée postérieure au rideau), et la checklist affichée nomme laquelle.
    const confirmerT0 = page.getByRole('button', { name: 'Confirmer l’épisode T0' });
    await expect(confirmerT0).toBeVisible();
    await expect(
      confirmerT0,
      'le bouton de confirmation T0 est désactivé : une précondition dure manque '
        + 'à la fixture (rideau, anamnèse ou synthèse) — la checklist à l’écran dit laquelle',
    ).toBeEnabled();
    await confirmerT0.click();

    // La surface est interrogée AVANT l'écran, et ce n'est pas du confort de
    // débogage : le panneau n'est monté que si la route répond `ok`. Sans cette
    // sonde, une surface fermée (drapeau absent) et un moteur qui s'abstient
    // (motif clinique) rendent le MÊME symptôme qu'un sélecteur faux —
    // « élément introuvable » —, et le banc accuse l'écran pour une cause qui
    // n'y est pas. Le premier run en CI a coûté exactement cette confusion.
    const sonde = await page.request.get(
      `/api/praticien/biologie/proposition?idPatient=${PATIENT_ID}`,
    );
    const corpsSonde = await sonde.text();
    expect(
      sonde.status(),
      `la route de proposition n'a pas répondu 200 — corps : ${corpsSonde}`,
    ).toBe(200);
    expect(
      JSON.parse(corpsSonde).ok,
      `la proposition est indisponible — corps : ${corpsSonde}`,
    ).toBe(true);

    const rail = page.getByRole('tablist', { name: 'Cycle clinique' });
    await rail.getByRole('tab', { name: /Actions/ }).click();

    // La phase Actions est bien celle qui s'affiche — sinon l'absence du
    // panneau ne dirait rien de la biologie, seulement de la navigation.
    await expect(page.getByRole('heading', { name: 'Protocole 21 jours' })).toBeVisible();

    // Deux comptages avant l'assertion, et ils ne sont pas décoratifs : la
    // route répond `ok` et la phase Actions s'affiche, donc si le panneau
    // manque encore, c'est OU BIEN qu'il n'est pas rendu (le client n'a pas le
    // drapeau, `propositionDisponible` reste faux) OU BIEN qu'il est rendu et
    // que le rôle/nom ne le désigne pas. Le message d'échec doit le dire.
    const panneau = page.getByRole('region', { name: 'Biologie — proposition de bilan' });
    const nTexte = await page.getByText('Biologie — proposition de bilan').count();
    const nSection = await page.locator('section[aria-labelledby="proposition-bilan-title"]').count();
    await expect(
      panneau,
      `panneau introuvable — titre présent ${nTexte} fois dans le DOM, `
        + `sections étiquetées : ${nSection}. Zéro des deux = panneau NON RENDU `
        + `(drapeau client absent) ; au moins un = rendu mais non désigné.`,
    ).toBeVisible();

    // Point 1 — des LIGNES DE PROPOSITION, pas seulement un cadre. Compter les
    // `listitem` du panneau ne prouverait rien : la liste permanente « Ce que
    // cette vue ne sait pas » et les motifs imbriqués en portent aussi, si
    // bien qu'une proposition VIDE passerait le compte (constat de revue).
    // Le bouton de déclaration, lui, n'est rendu qu'une fois par ligne
    // proposée — et le message d'abstention doit être absent.
    await expect(
      panneau.getByText(/Aucun panel du catalogue n’est couvert/),
    ).toHaveCount(0);
    const declarations = panneau.getByRole('button', { name: 'Déjà exploré hors outil…' });
    await expect(declarations.first()).toBeVisible();

    // Le statut de la première ligne, AVANT déclaration — relevé pour le
    // message d'échec, PAS pour exiger qu'il bouge : voir plus bas.
    // `filter({ has })` veut une localisation RELATIVE, réenracinée dans chaque
    // `li` : lui passer `declarations.first()` — déjà résolu à un élément
    // précis de la page — ne filtre rien et fait expirer la lecture (constat du
    // CI, 2 min de timeout). C'est le rôle nu qu'il faut donner.
    const premiereLigne = panneau
      .locator('li')
      .filter({ has: page.getByRole('button', { name: 'Déjà exploré hors outil…' }) })
      .first();
    const statutAvant = (await premiereLigne.getByText(
      /Recommandé|À répéter|Conditionnel|Optionnel|Déjà documenté|Non indiqué actuellement/,
    ).first().innerText()).trim();

    // Point 2 — la déclaration d'un bilan déjà réalisé hors outil. Aucun
    // résultat n'est demandé ni conservé : seule la DATE est saisie.
    await declarations.first().click();
    await panneau
      .getByLabel(/Date du bilan/)
      .fill(DATE_BILAN_BIO_E2E.toISOString().slice(0, 10));
    await panneau.getByRole('button', { name: 'Consigner la déclaration' }).click();

    await expect(
      panneau.getByText('Déclaration consignée : la proposition a été recalculée'),
    ).toBeVisible();

    // CE QUI CHANGE N'EST PAS LE STATUT, et le CI l'a démontré : la première
    // ligne est restée « Conditionnel ». C'est le code qui a raison — un panel
    // en mode `conditionnel` s'affiche TOUJOURS `conditionnel`, « déclencheur
    // rempli ou non » (`indicationsBiologieV1.ts`, [[D-059]] §5). Exiger un
    // changement de statut demandait au moteur de contredire sa doctrine.
    //
    // Ce que la déclaration change réellement et visiblement : la ligne SAIT
    // qu'elle est documentée, et le geste devient une CORRECTION. C'est cela
    // qu'on éprouve — avec le statut d'avant dans le message, pour qu'un
    // futur écart se lise sans relire le moteur.
    await expect(
      premiereLigne.getByRole('button', { name: 'Corriger la date du bilan…' }),
      `la ligne (statut « ${statutAvant} ») ne porte pas le geste de correction : `
        + `la déclaration n'a pas été rattachée à ce panel`,
    ).toBeVisible();
  });

  test('le courrier s’établit, son texte est rendu pour transcription, et rien n’est envoyé', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);
    // Le test précédent a confirmé le T0. Si cette confirmation n'a pas été
    // persistée, le bouton est encore là et il faut le reposer : la
    // confirmation vit d'abord en mémoire, et ce banc ne présume pas de ce que
    // la base en retient. Le clic conditionnel est donc un constat, pas une
    // paresse — et il ne masque rien : si le panneau manque ensuite,
    // l'assertion suivante le dira.
    const confirmerT0 = page.getByRole('button', { name: 'Confirmer l’épisode T0' });
    if (await confirmerT0.isVisible().catch(() => false)) await confirmerT0.click();

    await page.getByRole('tablist', { name: 'Cycle clinique' }).getByRole('tab', { name: /Actions/ }).click();

    const panneau = page.getByRole('region', { name: 'Biologie — proposition de bilan' });
    await expect(panneau).toBeVisible();

    // Point 3 — le formulaire n'existe que s'il reste quelque chose à
    // proposer : il s'offre sur le même prédicat que le générateur.
    const formulaire = panneau.getByText('Courrier au médecin traitant');
    await expect(formulaire).toBeVisible();

    // Point 4 — l'absence d'envoi n'est pas une lacune du parcours, c'est la
    // propriété à prouver : la surface dit elle-même qu'elle n'envoie rien, et
    // le seul rendu du courrier est un texte à transcrire.
    await expect(panneau.getByText(/Aucun envoi automatique/)).toBeVisible();

    // Le destinataire est la MARQUE de la lettre : le nettoyage ne supprime
    // que celle-ci, jamais toutes les correspondances sortantes du dossier.
    await panneau.getByLabel('Nom du médecin destinataire').fill(MEDECIN_BIO_E2E);
    const bouton = panneau.getByRole('button', { name: 'Établir et consigner le courrier' });
    await bouton.click();

    await expect(panneau.getByText(/Courrier consigné au dossier/)).toBeVisible();
    // `toHaveValue`, pas `not.toBeEmpty()` : le texte d'un `<textarea>` piloté
    // par React vit dans sa VALEUR, pas dans ses enfants DOM — l'assertion
    // naïve rougirait sur un courrier pourtant rendu.
    const texte = panneau.getByLabel('Texte du courrier à transcrire');
    await expect(texte).toBeVisible();
    await expect(texte).toHaveValue(/\S/);

    // Point 5 — une seconde consignation au MÊME destinataire est refusée.
    // Le verrou est côté écran (la campagne le nomme : deux onglets peuvent
    // encore établir deux lettres) : c'est bien le bouton qu'il faut éprouver,
    // aucune garde serveur ne rendrait 409 ici.
    await expect(bouton).toBeDisabled();
  });

  test('le fil de correspondance porte le verdict d’ancrage de la lettre', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);
    await page.getByRole('tab', { name: 'Correspondance' }).click();

    // Point 6 — la raison de la dépendance au LOT-01 : la lettre qui vient
    // d'être établie porte l'ancre de la table courante, donc « concordant ».
    // Une lettre sans ancre ne dirait RIEN (DC-24) — c'est ce silence-là que
    // le verdict ne doit pas confondre avec une péremption.
    await expect(page.getByText(/ancrage concordant/).first()).toBeVisible();
  });
});
