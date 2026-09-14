// Le parcours NOMINAL du constructeur de protocole, joué à l'écran de bout en
// bout : confirmation T0 → sélection d'une priorité → saisie des trois plans →
// « Enregistrer la version ».
//
// ─────────────────────────────────────────────────────────────────────────────
// POURQUOI CE PARCOURS N'EXISTAIT PAS, ET CE QUE SON ABSENCE A LAISSÉ PASSER
// ─────────────────────────────────────────────────────────────────────────────
// Aucun spec ne contenait « Ajouter une action » ni « Enregistrer la version » :
// tout ce qui écrivait un protocole postait DIRECTEMENT à la route de
// versionnement. Ce choix est délibéré et documenté là où il est fait
// (`biologie-arbitrage-revision.spec.ts` : piloter le constructeur ferait de ce
// parcours-là un banc du constructeur). Mais personne ne jouait le parcours
// nominal, et le trou a un coût mesurable : `emptyAction` posait
// `type: 'food'` EN DUR, `collectSubmission` ne regardait pas le type, et la
// route ne le refusait pas non plus. Une orientation vers le médecin traitant
// enregistrée sans toucher au sélecteur partait donc « Alimentation » — hachée,
// persistée, et servie telle quelle au patient.
//
// Ce spec est le banc que ce défaut n'avait pas.
//
// ─────────────────────────────────────────────────────────────────────────────
// TOUT PASSE PAR L'ÉCRAN, Y COMPRIS LA SÉLECTION DE PRIORITÉ
// ─────────────────────────────────────────────────────────────────────────────
// `selectedAt` entre dans l'empreinte de la carte et `canonical.ts` importe
// `node:crypto` : le navigateur ne peut pas DÉRIVER la carte qui suit une
// sélection. Il n'a pas à le faire — l'écran poste le choix à sa route puis
// RELIT le cockpit, et c'est ce geste-là qu'on joue ici en cliquant. La
// différence avec le parcours biologie est donc assumée : lui éprouve la chaîne
// d'arbitrage et se garde du constructeur ; celui-ci éprouve le constructeur, et
// casserait légitimement si son ergonomie changeait.
//
// Patient fictif Jennifer Martin (PAT_SEED_02) : la fixture biologie fournit les
// préconditions T0 dures (rideau cotable, consultation validée, synthèse
// postérieure). `workers: 1` garantit qu'aucun autre parcours ne tourne pendant
// celui-ci.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';
import { confirmerEpisodeT0 } from './helpers/biologie';
import {
  provisionnerDossierBiologie,
  nettoyerDossierBiologie,
  nettoyerProtocoleEtArbitrages,
} from './helpers/db';

const PATIENT_ID = 'PAT_SEED_02';

const MOTIF_SELECTION =
  'Parcours E2E — priorité retenue pour éprouver le constructeur, aucune portée clinique.';

let debutDuRun: Date;

test.describe('Constructeur de protocole — le parcours nominal, à l’écran', () => {
  test.beforeAll(async () => {
    debutDuRun = new Date(Date.now() - 1_000);
    await provisionnerDossierBiologie(PATIENT_ID);
  });

  test.afterAll(async () => {
    await nettoyerProtocoleEtArbitrages(PATIENT_ID, debutDuRun);
    await nettoyerDossierBiologie(PATIENT_ID);
  });

  test('la décision est restituée, le silence est refusé, et la version s’enregistre', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);
    await confirmerEpisodeT0(page);

    const rail = page.getByRole('tablist', { name: 'Cycle clinique' });

    // ── 1. LA PRIORITÉ SE RETIENT À L'ÉCRAN ──────────────────────────────────
    await rail.getByRole('tab', { name: /Décision 21 j/ }).click();
    const formulairePriorite = page.getByRole('group', { name: 'Priorité à retenir' });
    await expect(
      formulairePriorite,
      'le panneau de sélection ne s’est pas monté : la carte ne classe aucun candidat, '
        + 'ou la décision est bloquée par un signal d’anamnèse',
    ).toBeVisible();
    await formulairePriorite.getByRole('radio').first().check();
    await page.getByLabel(/Pourquoi cette priorité/).fill(MOTIF_SELECTION);
    await page.getByRole('button', { name: 'Retenir cette priorité' }).click();
    // Le rail est le signal d'aboutissement : « renseignée » ne s'affiche que
    // lorsque le geste que la phase PORTE a été posé ([[D-179]]).
    await expect(rail.getByRole('tab', { name: 'Décision 21 j renseignée' })).toBeVisible();

    // ── 2. LA DÉCISION EST RESTITUÉE À CÔTÉ DU FORMULAIRE ────────────────────
    await rail.getByRole('tab', { name: /Actions/ }).click();
    await expect(page.getByRole('heading', { name: 'Protocole 21 jours' })).toBeVisible();
    // Le titre diffère de celui de la phase Décision — deux nœuds de même nom
    // accessible casseraient le mode strict.
    await expect(
      page.getByRole('heading', { name: 'Ce que la décision a retenu' }),
      'la priorité retenue n’est pas rappelée à côté du constructeur : le praticien '
        + 'compose à l’aveugle',
    ).toBeVisible();

    // ── 3. LE SILENCE EST REFUSÉ, ET LE REFUS DIT QUOI ───────────────────────
    await page.getByRole('button', { name: 'Ajouter une action' }).click();
    const selecteurType = page.getByLabel('Type de l’action 1');
    await expect(
      selecteurType,
      'le sélecteur de type s’ouvre sur une valeur : un type non choisi partirait au patient',
    ).toHaveValue('');

    await page.getByLabel('Raison d’être').fill('Parcours E2E — aucune portée clinique.');
    await page.getByLabel('Critère observable à J21').fill('Aucun : version de banc.');
    await page.getByLabel('Intitulé de l’action 1').fill('Orienter vers le médecin traitant');
    await page.getByLabel('Plan idéal de l’action 1').fill('Prendre rendez-vous cette semaine.');
    await page.getByLabel('Plan minimal de l’action 1').fill('Appeler le cabinet.');
    await page.getByLabel('Plan de secours de l’action 1').fill('En reparler à J21.');
    await page.getByLabel('Charge déclarée par le praticien').selectOption('light');

    await page.getByRole('button', { name: 'Enregistrer la version' }).click();
    // BORNÉ AU CONSTRUCTEUR : Next.js pose son propre `role="alert"` d'annonce
    // de route (`__next-route-announcer__`), et un `getByRole('alert')` de page
    // entière viole le mode strict en résolvant deux nœuds.
    const constructeur = page.locator('#protocol-version-builder');
    const refus = constructeur.getByRole('alert');
    await expect(refus).toContainText('L’action 1 n’a pas de type');
    await expect(selecteurType).toHaveAttribute('aria-invalid', 'true');

    // Le refus survit à la frappe : il vivait dans le même état que les accusés
    // de relecture, que la moindre saisie vidait — avant toute correction.
    await page.getByLabel('Raison d’être').fill('Parcours E2E — aucune portée clinique (bis).');
    await expect(refus).toContainText('L’action 1 n’a pas de type');

    // ── 4. LE TYPE POSÉ, LA VERSION S'ENREGISTRE ─────────────────────────────
    await selecteurType.selectOption('medical_referral');
    await page.getByRole('button', { name: 'Enregistrer la version' }).click();
    await expect(
      page.getByText('Version enregistrée sur le serveur — non transmise au patient.'),
      'la version n’a pas été enregistrée depuis l’écran — c’est pourtant le seul '
        + 'chemin qu’un praticien emprunte',
    ).toBeVisible();
    await expect(constructeur.getByRole('alert')).toHaveCount(0);
  });
});
