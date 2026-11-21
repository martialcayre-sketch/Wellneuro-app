// PRA-6h (pra6-constat §3.2, règle `error-recovery`) — une réponse hors
// contrat reste dans son panneau.
//
// Nos routes rendent leur contrat (`unavailable: true`) même en 500. Le cas
// observé suppose un autre émetteur : un 500 JSON `{error}` sans les champs
// attendus. P01 et P53 basculaient alors sur l'erreur globale (« Une erreur
// est survenue »). Ici la réponse est interceptée (`page.route`) : la page doit
// rester debout, et chaque panneau dire son échec avec son texte actuel.
import { test, expect, type Page } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

async function servirHorsContrat(page: Page, chemins: string[]) {
  for (const chemin of chemins) {
    await page.route(
      (url) => url.pathname === chemin,
      (route) =>
        route.request().method() === 'GET'
          ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur interne' }) })
          : route.continue(),
    );
  }
}

test.describe('Lectures hors contrat (PRA-6h)', () => {
  test('P53 : la correspondance dit son échec dans son panneau, la page reste debout', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await servirHorsContrat(page, ['/api/praticien/correspondance-medecin/recentes']);
    await page.goto('/dashboard/correspondance');

    await expect(page.getByRole('heading', { name: 'Correspondance', level: 1 })).toBeVisible();
    await expect(page.getByText('La correspondance est momentanément indisponible. Rechargez la page.')).toBeVisible();
    await expect(page.getByText('Une erreur est survenue')).toHaveCount(0);
  });

  test('P01 : chaque panneau du Fil dit son échec, la page reste debout', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await servirHorsContrat(page, [
      '/api/praticien/fil',
      '/api/praticien/inbox-questionnaires',
      '/api/praticien/nouveaux-patients',
      '/api/praticien/meteo-adhesion',
      '/api/praticien/agenda-sommeil/suivi',
      '/api/praticien/correspondance-medecin/recentes',
    ]);
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Le Fil du jour', level: 1 })).toBeVisible();
    for (const texte of [
      'Le Fil est momentanément indisponible. Rechargez la page ou vérifiez votre session.',
      "L'inbox est momentanément indisponible. Rechargez la page.",
      'Les nouveaux patients sont momentanément indisponibles. Rechargez la page.',
      'La Météo est momentanément indisponible. Rechargez la page.',
      'Le suivi des agendas est momentanément indisponible. Rechargez la page.',
      'La correspondance est momentanément indisponible. Rechargez la page.',
    ]) {
      await expect(page.getByText(texte)).toBeVisible();
    }
    await expect(page.getByText('Une erreur est survenue')).toHaveCount(0);
  });

  // PRA-6h2 : la fiche patient. Sa lecture lisait `data.patient` sans tester
  // `r.ok` ni la forme ; un 500 `{error}` doit tomber dans son état d'échec
  // existant, et « Réessayer » relire la fiche puis rendre le focus au nom du
  // patient (arbitrage 20261118-2228-d). Dossier de fixture seulement.
  test('fiche : l’échec se dit dans la fiche, « Réessayer » la relit et rend le focus au nom', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    let restants = 1;
    await page.route(
      (url) => url.pathname === '/api/praticien/equilibre',
      (route) => {
        if (route.request().method() === 'GET' && restants > 0) {
          restants -= 1;
          return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur interne' }) });
        }
        return route.continue();
      },
    );
    await page.goto('/dashboard/patients/PAT_SEED_01');

    const alerte = page.getByRole('alert').filter({ hasText: 'La fiche patient n’a pas pu être lue.' });
    await expect(alerte).toBeVisible();
    await expect(page.getByText('Une erreur est survenue')).toHaveCount(0);

    await alerte.getByRole('button', { name: 'Réessayer' }).click();
    const titre = page.getByRole('heading', { level: 1, name: 'Sophie Nicola' });
    await expect(titre).toBeVisible();
    await expect(titre).toBeFocused();
  });
});
