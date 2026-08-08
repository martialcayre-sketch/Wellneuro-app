// La redirection des anciens liens patients — le seul reste du parcours legacy.
//
// `web/src/app/patient/` a été supprimé le 2026-08-08 (dette 5, LOT-01). Ce qui
// reste est la redirection 307 de `web/next.config.mjs`, maintenue pour les
// liens e-mail DÉJÀ PARTIS chez des patients.
//
// Pourquoi ce spec existe, et pourquoi il n'existait pas avant : tant que la
// page rendait, une redirection cassée était un désagrément — le patient
// tombait sur l'ancien parcours, dégradé mais fonctionnel. Depuis le retrait,
// c'est un 404 sur un lien reçu par e-mail. Le retrait a donc **changé la
// conséquence d'une panne**, et la règle la plus chère du lot était celle qui
// n'avait aucun témoin : aucun test, unitaire ou E2E, n'empruntait cette
// redirection. Constat de la revue adversariale du 2026-08-08.
//
// Aucune donnée patient ici : l'identifiant d'assignation est fabriqué, et
// c'est justement le point — la redirection ne doit dépendre d'aucun état.
import { test, expect } from '@playwright/test';

test.describe('Anciens liens patients — le parcours legacy redirige, il ne tombe pas', () => {
  test('un lien /patient/<assignation> ramène au portail en 307, sans fuite ni indexation', async ({ request }) => {
    const reponse = await request.get('/patient/ASS_LIEN_EMAIL_FICTIF', { maxRedirects: 0 });

    // 307 et pas 308 : un permanent serait mis en cache durablement par les
    // navigateurs et les intermédiaires, et resterait actif sur les postes
    // patients sans aucun moyen de le rappeler.
    expect(reponse.status()).toBe(307);
    const destination = reponse.headers()['location'] ?? '';
    expect(destination).toContain('/portail/connexion');

    // Aucune donnée du lien d'origine ne doit être recopiée dans la
    // destination : l'adresse d'un patient est une donnée de santé indirecte,
    // et une redirection la déposerait dans les journaux serveur, l'historique
    // du navigateur et les barres d'URL partagées.
    expect(destination).not.toContain('ASS_LIEN_EMAIL_FICTIF');
    expect(destination).not.toContain('@');
  });

  test("la query string d'origine n'est PAS recopiée dans la destination", async ({ request }) => {
    // Le test qui a démenti le dépôt. Next recopie la query string d'origine
    // dans la destination, sauf si celle-ci en porte déjà une : sans le
    // marqueur `?depuis=lien-ancien` de `next.config.mjs`, un ancien lien
    // portant `?email=…` produisait `/portail/connexion?email=…`, soit
    // exactement la fuite que le commentaire de ce fichier déclarait
    // impossible depuis le 2026-08-05.
    const reponse = await request.get('/patient/ASS_LIEN_EMAIL_FICTIF?email=sophie.nicola%40example.test', {
      maxRedirects: 0,
    });

    expect(reponse.status()).toBe(307);
    const destination = reponse.headers()['location'] ?? '';
    expect(destination).toContain('/portail/connexion');
    expect(destination).not.toContain('example.test');
    expect(destination).not.toContain('email=');
  });

  test("la page d'arrivée, elle, porte bien l'en-tête de non-indexation", async ({ request }) => {
    // Ce que la redirection ne fait PAS : Next n'applique pas les en-têtes de
    // `headers()` à la réponse 307 elle-même (`X-Robots-Tag` y est absent —
    // mesuré). Ce qui protège réellement d'une indexation, c'est que la page
    // d'arrivée les porte, et c'est elle qu'un crawler suivrait.
    const arrivee = await request.get('/portail/connexion');
    expect(arrivee.headers()['x-robots-tag'] ?? '').toContain('noindex');
  });

  test("le patient qui suit le lien arrive sur l'entrée du portail, pas sur une page d'erreur", async ({ page }) => {
    // La redirection suivie jusqu'au bout : c'est le parcours réel d'un patient
    // qui clique dans un vieil e-mail. Sans cette assertion, un
    // `/portail/connexion` cassé laisserait les deux tests ci-dessus verts.
    await page.goto('/patient/ASS_LIEN_EMAIL_FICTIF');
    await expect(page).toHaveURL(/\/portail\/connexion/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
