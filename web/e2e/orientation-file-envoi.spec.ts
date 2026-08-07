// Orientation NNPP2 → file d'envoi → déduplication (LOT-01). Couverture zéro
// avant ce spec : ni le panneau d'orientation, ni le geste « Ajouter à la file
// d'envoi » qu'il expose depuis le LOT-02 (D-030), ni la déduplication après
// envoi n'étaient joués de bout en bout.
//
// Patient fictif Sophie Nicola (PAT_SEED_01) — c'est le patient de tous les
// autres specs praticien de fiche-trajectoire (`fiche-trajectoire.spec.ts`),
// d'où le nettoyage CHIRURGICAL (`nettoyerOrientationFileEnvoi`, pas
// `resetPortailState`) : cette dernière purge consultations, agendas et état
// TRUST de Sophie, dont dépendent quatre autres suites praticien.
//
// CE SPEC EXIGE LA BASE ÉPHÉMÈRE SEEDÉE (`npm run test:worktree`), pas la base
// de dev partagée. `POST /api/praticien/file-envoi` identifie le patient par
// son email ET filtre sur l'appartenance au praticien de la session : contre
// une base où Sophie n'appartient pas au praticien du cookie forgé, le panneau
// rend correctement sa recommandation et son bouton, puis l'ajout échoue sur
// « Ajout impossible : Patient introuvable. » — un rouge qui ne dit rien du
// code (constaté le 2026-08-07 en montant le harnais de mutation).
//
// Cinq étapes dans UN SEUL test, volontairement : c'est une chaîne, où chaque
// maillon dépend de l'état laissé par le précédent (recommandation → ajout →
// visible dans la file → envoyé → dédupliqué). Le découper en tests séparés
// ferait dépendre chacun d'un ordre d'exécution implicite, plus fragile qu'un
// enchaînement explicite.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';
import { nettoyerOrientationFileEnvoi, provisionnerReponseOrientation } from './helpers/db';
import { MESSAGE_DEJA_ASSIGNE } from '../src/lib/assignations/messages';

const PATIENT_ID = 'PAT_SEED_01';
const NOM_PATIENT = 'Sophie Nicola';
// Cible de R-STR-01 (déclencheur : zone couleur warning/danger/dark sur
// Q_STR_02) — la seule règle publiée aujourd'hui dont la suggestion cible un
// QUESTIONNAIRE (donc `ajoutable`, cf. OrientationPanel.tsx) plutôt qu'un pack.
const TITRE_CIBLE = 'BMS-10 — Burnout Mesure Short';
// Apostrophes typographiques ’ — copiées du composant, jamais retapées : une
// apostrophe droite ' romprait le match de texte exact sans qu'aucune erreur
// de compilation ne le signale.
const BOUTON_AJOUTER = 'Ajouter à la file d’envoi';
const STATUT_DEJA_EN_FILE = 'Déjà dans la file d’envoi — rien ne part sans votre validation.';

test.describe('Orientation NNPP2 → file d’envoi', () => {
  test.beforeEach(async () => {
    // L'ordre compte : nettoyer avant de provisionner, jamais l'inverse — sinon
    // un run interrompu au milieu du test précédent laisse une assignation ou
    // un brouillon que ce nettoyage effacerait APRÈS avoir posé la nouvelle
    // réponse, aucune garantie sur l'ordre des deleteMany face à un create.
    await nettoyerOrientationFileEnvoi(PATIENT_ID);
    await provisionnerReponseOrientation(PATIENT_ID);
  });

  test.afterAll(async () => {
    // Filet de fin de run : sans lui, l'assignation Q_STR_05 posée à l'étape 4
    // du DERNIER projet exécuté (Playwright enchaîne les projets l'un après
    // l'autre, un seul worker) resterait ouverte et ferait basculer tout autre
    // spec relisant l'orientation de Sophie directement en « déjà assigné ».
    await nettoyerOrientationFileEnvoi(PATIENT_ID);
  });

  test('recommandation → ajout à la file → envoi → déduplication', async ({ page }) => {
    await page.context().addCookies([await praticienSessionCookie()]);

    // ── 1. Le panneau d'orientation propose Q_STR_05, avec un bouton d'ajout ──
    // Deep-link direct sur l'onglet Trajectoire (couvert par
    // fiche-trajectoire.spec.ts) : le panneau d'orientation n'est monté que
    // là (TrajectoirePanel.tsx), au présent, jamais en lecture datée.
    await page.goto(`/dashboard/patients/${PATIENT_ID}?onglet=trajectoire`);

    const panneauOrientation = page.getByRole('region', { name: 'Orientation des explorations' });
    await expect(panneauOrientation).toBeVisible({ timeout: 15000 });

    // Scopé à LA ligne de la recommandation : le panneau peut, en théorie,
    // servir d'autres recommandations (autres règles, autres drapeaux) — on ne
    // suppose jamais qu'elle est seule.
    const ligneRecommandation = panneauOrientation.locator('li').filter({ hasText: TITRE_CIBLE });
    await expect(ligneRecommandation).toBeVisible({ timeout: 10000 });
    const boutonAjouter = ligneRecommandation.getByRole('button', { name: BOUTON_AJOUTER });
    await expect(boutonAjouter).toBeVisible();

    // ── 2. Cliquer bascule vers « déjà dans la file » ──
    await boutonAjouter.click();
    await expect(ligneRecommandation.getByText(STATUT_DEJA_EN_FILE)).toBeVisible({ timeout: 10000 });
    await expect(boutonAjouter).toBeHidden();

    // ── 3. La Bibliothèque montre la LIGNE, pas seulement le titre de colonne ──
    // dashboard-praticien.spec.ts ne vérifie que le titre « File d'envoi » sur
    // base vide ; ici la file porte un vrai brouillon, et c'est CE contenu
    // qu'on exige — sans quoi un ajout qui échoue silencieusement laisserait
    // passer le test.
    await page.goto('/dashboard/bibliotheque');
    const sectionFileEnvoi = page.locator('section').filter({
      has: page.getByRole('heading', { name: "File d'envoi" }),
    });
    const ligneBrouillonSophie = sectionFileEnvoi.locator('li').filter({ hasText: NOM_PATIENT });
    await expect(ligneBrouillonSophie).toBeVisible({ timeout: 10000 });
    await expect(ligneBrouillonSophie).toContainText(TITRE_CIBLE);

    // ── 4. Envoyer depuis cet écran ──
    await ligneBrouillonSophie.getByRole('button', { name: /^Envoyer/ }).click();
    await expect(page.getByText(new RegExp(`envoyé\\(s\\) à ${NOM_PATIENT}`))).toBeVisible({
      timeout: 10000,
    });
    // Assertion serveur, pas seulement d'écran : la ligne d'assignation existe
    // bien, avec le statut d'une assignation ouverte (le seul qui compte pour
    // `dejaAssigne`, cf. orientationService.ts — `STATUTS_ASSIGNATION_TERMINAL`).
    const listeAssignations = await page.request.get(
      `/api/praticien/patients?idPatient=${PATIENT_ID}`,
    );
    const payloadAssignations = (await listeAssignations.json()) as {
      assignations?: { idQuestionnaire: string; statut: string }[];
    };
    const assignationCreee = (payloadAssignations.assignations ?? []).find(
      (a) => a.idQuestionnaire === 'Q_STR_05',
    );
    expect(assignationCreee?.statut).toBe('En attente');

    // ── 5. Le brouillon a QUITTÉ la file ──
    // Sans cette assertion, retirer le passage à `statut: 'parti'`
    // (envoyer/route.ts, le `updateMany` gardé) ne rougirait RIEN : à l'étape
    // 6, les deux branches du panneau sont mutuellement exclusives sur
    // `dejaCouvert`, donc « déjà dans la file » y est absent quoi qu'il
    // arrive, et le spec ne revenait jamais sur la Bibliothèque. Un brouillon
    // renvoyable indéfiniment serait passé pour un parcours sain.
    //
    // ET CE MAILLON SE LIT AU SERVEUR, PAS À L'ÉCRAN. Deux formulations
    // d'écran ont été essayées et LAISSAIENT LA MUTATION VERTE (2026-08-07) :
    // `toHaveCount(0)` sur les lignes est vrai à l'instant zéro, et le message
    // « La file est vide » l'est aussi — `brouillons` part de `[]`, donc l'état
    // vide s'affiche PENDANT le chargement. Toute assertion d'absence sur cette
    // colonne est satisfaite par la fenêtre de rendu, jamais par le fait. Le
    // GET, lui, ne sert que les brouillons `brouillon` : s'il n'en rend plus
    // aucun pour ce patient, le brouillon a réellement quitté la file.
    const fileApresEnvoi = await page.request.get('/api/praticien/file-envoi');
    const payloadFile = (await fileApresEnvoi.json()) as {
      brouillons?: { idPatient: string }[];
      unavailable?: boolean;
    };
    // Une file illisible n'est pas une file vide : la route rend un JSON bien
    // formé sur 401 comme sur 500 (cf. file-envoi/route.ts). Sans ce test,
    // une panne d'authentification se lirait comme un envoi réussi.
    expect(payloadFile.unavailable ?? false).toBe(false);
    expect((payloadFile.brouillons ?? []).filter(b => b.idPatient === PATIENT_ID)).toHaveLength(0);

    // ── 6. Retour à la trajectoire : dédupliquée, jamais reproposée ──
    // PIÈGE CONNU : le brouillon envoyé passe à `statut: 'parti'`
    // (envoyer/route.ts) et le GET /api/praticien/file-envoi ne sert que les
    // brouillons `brouillon` — le badge « déjà dans la file » ne se rallume
    // donc PAS après un envoi. La déduplication se lit uniquement via
    // `MESSAGE_DEJA_ASSIGNE`, jamais via l'état « en file ».
    await page.goto(`/dashboard/patients/${PATIENT_ID}?onglet=trajectoire`);
    const panneauApresEnvoi = page.getByRole('region', { name: 'Orientation des explorations' });
    await expect(panneauApresEnvoi).toBeVisible({ timeout: 15000 });
    const ligneApresEnvoi = panneauApresEnvoi.locator('li').filter({ hasText: TITRE_CIBLE });
    await expect(ligneApresEnvoi).toBeVisible({ timeout: 10000 });
    await expect(ligneApresEnvoi.getByText(MESSAGE_DEJA_ASSIGNE)).toBeVisible({ timeout: 10000 });
    // Les deux suivantes ne peuvent pas échouer indépendamment de celle du
    // dessus (les branches de OrientationPanel sont exclusives sur
    // `dejaCouvert`) : gardes de refactor, jamais comptées comme preuve.
    await expect(ligneApresEnvoi.getByRole('button', { name: BOUTON_AJOUTER })).toHaveCount(0);
    await expect(ligneApresEnvoi.getByText(STATUT_DEJA_EN_FILE)).toHaveCount(0);
  });
});
