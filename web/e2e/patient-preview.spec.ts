// Garde-fous d'authentification/validation de la route practicien-authentifiée
// api/praticien/apercu-patient/reponses (mécanisme PrévisualisationPatient,
// HC-F LOT-03). Le test de rendu réel (dialog, texte, corps JSON patient-safe
// sur une assignation verrouillée réelle) vit dans portail-parcours.spec.ts,
// qui dispose déjà d'une assignation verrouillée fraîchement produite —
// reprovisionner ce même parcours ici serait une duplication coûteuse.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

test.describe('api/praticien/apercu-patient/reponses', () => {
  test('401 sans session praticien', async ({ request }) => {
    const res = await request.get('/api/praticien/apercu-patient/reponses?id=ASS_INEXISTANT');
    expect(res.status()).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.reason).toBe('unauthenticated');
  });

  test('400 pour un identifiant invalide', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    const res = await page.request.get('/api/praticien/apercu-patient/reponses?id=;DROP TABLE');
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.reason).toBe('invalid');
  });

  test('404 pour une assignation inexistante', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    const res = await page.request.get('/api/praticien/apercu-patient/reponses?id=ASS_INEXISTANTE_XYZ');
    expect(res.status()).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.reason).toBe('not_found');
  });
});
