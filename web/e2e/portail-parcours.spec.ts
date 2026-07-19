// Parcours Phase 0 du portail patient (docs/checklist_tests_end_to_end.md) —
// formalisation Playwright committée d'un parcours déjà validé manuellement
// le 2026-07-10 (21/22 items, exécution ad hoc jamais committée). Objectif du
// lot R8 (suite) : ne plus "réinstaller puis jeter" ces tests à chaque lot.
//
// Un seul test.describe.serial séquentiel sur le patient fictif Michel Dogné
// (PAT_SEED_03), seul autorisé avec Sophie Nicola et Jennifer Martin.
// Prérequis local : voir web/e2e/README.md (DB de dev + npm run prisma:seed +
// NEXTAUTH_SECRET). Aucune opération SQL destructive : uniquement des lignes
// Assignation/Consultation créées par un run de test précédent, jamais les
// données historiques du seed (cf. helpers/db.ts).
import { test, expect, type Page } from '@playwright/test';
import { resetPortailState, closePrisma } from './helpers/db';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT = {
  idPatient: 'PAT_SEED_03',
  email: 'michel.dogne@fictif.wellneuro.fr',
};

// Remplit génériquement la section de questionnaire actuellement affichée
// (radios/select/number) sans dépendre du contenu exact d'un questionnaire
// donné du catalogue — le pack "Base de consultation" peut évoluer.
async function remplirSectionCourante(page: Page): Promise<void> {
  const radioNames = await page
    .locator('form input[type="radio"]')
    .evaluateAll(inputs => Array.from(new Set(inputs.map(i => (i as HTMLInputElement).name))));
  for (const name of radioNames) {
    await page.locator(`form input[type="radio"][name="${name}"]`).first().check();
  }

  const selects = page.locator('form select');
  for (let i = 0; i < (await selects.count()); i++) {
    await selects.nth(i).selectOption({ index: 1 });
  }

  const numbers = page.locator('form input[type="number"]');
  const numberCount = await numbers.count();
  for (let i = 0; i < numberCount; i++) {
    const input = numbers.nth(i);
    const min = await input.getAttribute('min');
    await input.fill(min && min.trim() !== '' ? min : '1');
  }
}

// Répond section par section jusqu'à la transmission finale. Depuis HC-F
// LOT-04 (Étape 10), le bouton "Transmettre au praticien" ouvre un dialog de
// confirmation accessible (PatientConfirmDialog, Radix) au lieu d'un
// window.confirm natif — il faut cliquer explicitement son bouton
// "Transmettre" pour valider.
// Depuis HC-F LOT-04 (Étape 6), les sections "Transmis au praticien" /
// "Correction demandée" / "Expiré" du hub sont repliées par défaut sous un
// <details> natif (sections secondaires, l'action recommandée les remplace
// en première lecture) — il faut ouvrir la section avant d'y chercher un
// texte ou un lien.
async function ouvrirSectionSecondaire(page: Page, titre: string): Promise<void> {
  const summary = page.locator('summary', { hasText: titre });
  if (await summary.count() === 0) return;
  const details = summary.locator('xpath=..');
  if (await details.getAttribute('open') === null) await summary.click();
}

async function repondreEtTransmettre(page: Page): Promise<void> {
  for (let section = 0; section < 30; section++) {
    await remplirSectionCourante(page);
    const bouton = page.getByRole('button', { name: /Suivant →|Voir le résumé|Transmettre au praticien/ });
    try {
      await expect(bouton).toBeEnabled({ timeout: 3000 });
    } catch {
      const diag = await page.evaluate(() => {
        const radios = Array.from(document.querySelectorAll('form input[type=radio]')) as HTMLInputElement[];
        const radioNames = Array.from(new Set(radios.map(r => r.name)));
        const uncheckedRadioGroups = radioNames.filter(n => !radios.some(r => r.name === n && r.checked));
        const selects = Array.from(document.querySelectorAll('form select')) as HTMLSelectElement[];
        const emptySelects = selects.filter(s => !s.value).length;
        const numbers = Array.from(document.querySelectorAll('form input[type=number]')) as HTMLInputElement[];
        const emptyNumbers = numbers.filter(n => n.value === '').length;
        return { radioNames, uncheckedRadioGroups, selectCount: selects.length, emptySelects, numberCount: numbers.length, emptyNumbers };
      });
      throw new Error(`Section non complétée par le remplissage générique : ${JSON.stringify(diag)}`);
    }
    const label = (await bouton.textContent()) ?? '';
    await bouton.click();
    if (label.includes('Voir le résumé')) {
      await page.getByRole('button', { name: 'Transmettre au praticien' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Transmettre' }).click();
      return;
    }
    if (label.includes('Transmettre')) {
      await page.getByRole('dialog').getByRole('button', { name: 'Transmettre' }).click();
      return;
    }
    if (section === 29) throw new Error('Questionnaire trop long pour la limite de sécurité du test.');
  }
}

test.describe.serial('Parcours portail patient — Phase 0 (Michel Dogné, patient fictif)', () => {
  let portailUrl: string;
  let idAssignation: string;
  let idQuestionnaire: string;

  test.beforeAll(async () => {
    await resetPortailState(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await closePrisma();
  });

  test('gate, consentement, fiche, anamnèse, onboarding, questionnaire, verrouillage, correction, déblocage, re-soumission', async ({
    page,
    context,
  }) => {
    // Parcours intégral (~2 min nominal depuis les étapes TRUST) : le budget
    // global de 120 s est trop juste quand le premier passage paie la
    // compilation à la demande de `next dev` (run local à froid). slow()
    // triple le budget de ce seul test, sans toucher les autres.
    test.slow();
    page.on('dialog', dialog => dialog.accept());

    await test.step('Provisionnement — le praticien crée la consultation (mêmes conditions que la réalité : un patient sans consultation n\'a rien à voir sur le portail)', async () => {
      // Le login OAuth Google réel n'est pas automatisé (fragile, hors
      // périmètre du parcours patient) : cookie de session NextAuth signé
      // directement, pattern standard pour tester une app NextAuth. Cookie
      // posé une seule fois : reste valide pour toute la suite du test,
      // y compris l'étape "Déblocage côté praticien" plus bas.
      await context.addCookies([await praticienSessionCookie()]);
      const res = await page.request.post('/api/praticien/consultations', {
        data: { idPatient: PATIENT.idPatient },
      });
      expect(res.ok()).toBe(true);
      const json = await res.json();
      expect(json.success).toBe(true);
      portailUrl = `/portail/${json.accessToken}`;
    });

    let etatDebug: Promise<{ status: number; corps: string } | null> = Promise.resolve(null);
    await test.step('Gate email', async () => {
      await page.goto(portailUrl);
      await expect(page.getByRole('heading', { name: 'Votre espace patient' })).toBeVisible();
      await page.getByPlaceholder('votre@email.fr').fill(PATIENT.email);
      // Instrumentation : capture la première réponse trust/etat suivant
      // l'ouverture de session — diagnostique le saut silencieux de la
      // séquence « Avant de commencer » observé en CI (iPhone + next start).
      etatDebug = page
        .waitForResponse(res => res.url().includes('/api/portail/trust/etat'), { timeout: 15_000 })
        .then(async res => ({ status: res.status(), corps: await res.text().catch(() => '?') }))
        .catch(() => null);
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/portail/session') && res.status() === 200),
        page.getByRole('button', { name: 'Accéder à mon espace' }).click(),
      ]);
    });

    await test.step('Avant de commencer (TRUST LOT-02) — 4 écrans, accusé de lecture', async () => {
      console.log('[debug trust/etat]', JSON.stringify(await etatDebug));
      await expect(
        page.getByRole('heading', { name: 'Bienvenue dans votre espace Wellneuro' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Continuer' }).click();
      await expect(
        page.getByRole('heading', { name: 'Un outil d’accompagnement, pas un service d’urgence' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Je comprends le cadre' }).click();
      await page.getByRole('button', { name: 'Continuer' }).click();
      await expect(page.getByRole('heading', { name: 'Avant de commencer' })).toBeVisible();
      // Trois confirmations distinctes, ciblées par libellé — jamais de case
      // « accepter tout » (le sélecteur générique attraperait les cases
      // masquées du contrôle de confort de lecture du header).
      for (const libelle of [
        /ne remplace pas un service d/,
        /conclusion médicale/,
        /mes données et mes choix/,
      ]) {
        await page.getByLabel(libelle).check();
      }
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/portail/trust/lecture') && res.status() === 200),
        page.getByRole('button', { name: 'J’ai pris connaissance de ces informations' }).click(),
      ]);
    });

    await test.step('Consentement', async () => {
      await expect(page.getByRole('heading', { name: 'Votre consentement au suivi' })).toBeVisible();
      await page.getByLabel(/ai lu ces informations/i).check();
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/portail/consentement') && res.status() === 200),
        page.getByRole('button', { name: 'Donner mon consentement' }).click(),
      ]);
    });

    await test.step('Fiche signalétique (paginée section par section depuis HC-F LOT-04)', async () => {
      await expect(page.getByRole('heading', { name: 'Fiche de renseignements' })).toBeVisible();
      // Section 1/3 — Cellule familiale.
      await page
        .locator('label:has-text("Situation familiale") + select')
        .selectOption({ label: 'Marié·e / Pacsé·e' });
      await page.getByRole('button', { name: 'Suivant →' }).click();
      // Section 2/3 — Profession.
      await page.locator('label:has-text("Profession") + input').fill('Retraité');
      await page.getByRole('button', { name: 'Suivant →' }).click();
      // Section 3/3 — Mode de vie (aucun champ requis) + mentions + envoi.
      await page.getByLabel(/exactitude des informations fournies/i).check();
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/portail/fiche') && res.status() === 200),
        page.getByRole('button', { name: /anamnèse/i }).click(),
      ]);
    });

    await test.step('Anamnèse (paginée section par section depuis HC-F LOT-04)', async () => {
      await expect(page.getByRole('heading', { name: 'Anamnèse' })).toBeVisible();
      // Section 1/6 — Repères corporels (aucun champ requis).
      await page.getByRole('button', { name: 'Suivant →' }).click();
      // Section 2/6 — Motif et attentes (seul champ requis de toute l'anamnèse).
      await page
        .locator('label:has-text("amène aujourd") + textarea')
        .fill('Fatigue persistante depuis plusieurs mois, difficultés de concentration.');
      await page.getByRole('button', { name: 'Suivant →' }).click();
      // Section 3/6 — Histoire des troubles.
      await page.getByRole('button', { name: 'Suivant →' }).click();
      // Section 4/6 — Signaux à signaler.
      await page.getByRole('button', { name: 'Suivant →' }).click();
      // Section 5/6 — Antécédents.
      await page.getByRole('button', { name: 'Suivant →' }).click();
      // Section 6/6 — Traitements et compléments + envoi.
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/portail/valider') && res.status() === 200),
        page.getByRole('button', { name: /Valider et accéder à mes questionnaires/i }).click(),
      ]);
    });

    await test.step('Onboarding — accès au hub des questionnaires', async () => {
      await expect(page.getByText('Merci !')).toBeVisible();
      await page.getByRole('link', { name: 'Accéder à mes questionnaires' }).click();
      await expect(page.getByRole('heading', { name: 'Mes questionnaires' })).toBeVisible();
    });

    await test.step('Session restaurée sur le portail sans nouvelle saisie email', async () => {
      await page.goto(portailUrl);
      await expect(page.getByPlaceholder('votre@email.fr')).toHaveCount(0);
      await expect(page.getByText('Merci !')).toBeVisible();
      await page.getByRole('link', { name: 'Accéder à mes questionnaires' }).click();
      await expect(page.getByRole('heading', { name: 'Mes questionnaires' })).toBeVisible();
    });

    await test.step('Ouverture du premier questionnaire à compléter', async () => {
      const premier = page.getByRole('link', { name: 'Commencer' }).first();
      await expect(premier).toBeVisible();
      // Le hub se re-rend quand /api/portail/trust/etat résout (état « avant
      // de commencer ») : un clic tombé entre deux rendus est perdu sans
      // erreur (constaté en local sous charge — trace : aucune navigation,
      // aucune requête). L'écoute de la réponse est armée avant le premier
      // clic, puis le clic est retenté tant que l'URL n'a pas changé.
      const reponsePromise = page.waitForResponse(
        res => res.url().includes('/api/patient/questionnaire?id=') && res.status() === 200,
        { timeout: 60_000 },
      );
      const surPageQuestionnaire = () => /\/questionnaires\/[^/?]+/.test(page.url());
      await expect(async () => {
        if (!surPageQuestionnaire()) {
          await premier.click({ timeout: 2_000 });
        }
        expect(surPageQuestionnaire()).toBe(true);
      }).toPass({ timeout: 30_000, intervals: [500, 1_000] });
      const json = await (await reponsePromise).json();
      idAssignation = json.assignation.idAssignation;
      idQuestionnaire = json.assignation.idQuestionnaire;
    });

    await test.step('Sauvegarde de brouillon puis réinitialisation (local uniquement)', async () => {
      await remplirSectionCourante(page);
      await page.getByRole('button', { name: 'Sauvegarder le brouillon' }).click();
      await expect(page.getByText('Brouillon enregistré sur cet appareil')).toBeVisible();
      await page.getByRole('button', { name: 'Réinitialiser ce questionnaire' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Réinitialiser' }).click();
    });

    await test.step('Réponses et transmission au praticien (200)', async () => {
      await repondreEtTransmettre(page);
      await expect(page).toHaveURL(new RegExp(`${portailUrl}/questionnaires$`));
      await ouvrirSectionSecondaire(page, 'Transmis au praticien');
      await expect(page.getByText('Transmis au praticien').first()).toBeVisible();
    });

    await test.step('Ouverture d’un autre questionnaire sans nouveau gate', async () => {
      const suivant = page.getByRole('link', { name: 'Commencer' }).first();
      await expect(suivant).toBeVisible();
      await suivant.click();
      await expect(page.getByPlaceholder('votre@email.fr')).toHaveCount(0);
      await expect(page.getByRole('link', { name: '← Mes questionnaires' })).toBeVisible();
      await page.getByRole('link', { name: '← Mes questionnaires' }).click();
      // Attendre le rendu complet du hub : l'étape suivante ouvre la section
      // repliée "Transmis au praticien", et ouvrirSectionSecondaire ne fait
      // rien si le <summary> n'est pas encore monté (hub en cours de fetch).
      await expect(page.getByRole('heading', { name: 'Mes questionnaires' })).toBeVisible();
    });

    await test.step('Tentative de re-soumission côté serveur (409)', async () => {
      // Un `answers` non vide est requis pour passer la validation 400 du
      // payload avant d'atteindre la vérification d'état "already_done" (409)
      // — le contenu importe peu, ce chemin ne relit jamais les réponses.
      const resubmit = await page.request.post('/api/patient/submit', {
        data: {
          idAssignation,
          idPatient: PATIENT.idPatient,
          email: PATIENT.email,
          idQuestionnaire,
          answers: { PLACEHOLDER: 1 },
        },
      });
      expect(resubmit.status()).toBe(409);
      const json = await resubmit.json();
      expect(json.reason).toBe('already_done');
    });

    await test.step('Vue verrouillée en lecture seule', async () => {
      await ouvrirSectionSecondaire(page, 'Transmis au praticien');
      const consulter = page.getByRole('link', { name: 'Consulter' }).first();
      const [reponsesReq] = await Promise.all([
        page.waitForRequest(req => req.url().includes('/api/patient/reponses')),
        consulter.click(),
      ]);
      await expect(page.getByText('verrouillées en lecture seule')).toBeVisible();
      // docs/checklist_tests_end_to_end.md documentait encore un email exposé
      // en query string sur cette route (point résiduel du run manuel du
      // 2026-07-10). Constaté ici : déjà corrigé par le lot R9 (email retiré
      // de ConsultationScreen, session cookie uniquement) — la doc était en
      // retard sur le code, pas l'inverse.
      expect(reponsesReq.url()).not.toContain('email=');
    });

    await test.step('Aperçu praticien de la vue patient (mécanisme PrévisualisationPatient, HC-F LOT-03)', async () => {
      // Réutilise l'assignation verrouillée déjà obtenue ci-dessus plutôt que
      // de reprovisionner un parcours complet — cookie praticien déjà posé à
      // l'étape de provisionnement.
      const portailConsultationUrl = page.url();

      await page.goto(`/dashboard/patients/${PATIENT.idPatient}`);
      await page.getByRole('button', { name: 'Voir ce que recevra le patient' }).click();

      const dialog = page.getByRole('dialog', { name: 'Aperçu — vue patient' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('verrouillées en lecture seule')).toBeVisible();
      await expect(dialog.getByText('Aperçu praticien — vue identique à celle du patient.')).toBeVisible();
      // readOnlyPreview masque la demande de correction et « Voir Mon équilibre » :
      // un praticien ne doit jamais pouvoir déclencher une action patient depuis l'aperçu.
      await expect(dialog.getByRole('button', { name: 'Demander une correction' })).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: 'Voir Mon équilibre' })).toHaveCount(0);

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();

      // Garde-fou patient-safe : le corps JSON brut de la route (pas seulement
      // ce que l'UI affiche) ne doit jamais exposer scoresJson/scorePrincipal/
      // interpretation — même si le composant ne les lit pas aujourd'hui.
      const res = await page.request.get(
        `/api/praticien/apercu-patient/reponses?id=${encodeURIComponent(idAssignation)}`
      );
      expect(res.ok()).toBe(true);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(Object.keys(json).sort()).toEqual(['dateReponse', 'ok', 'statutReponses', 'titre'].sort());

      // Retour sur le portail patient pour la suite du parcours séquentiel.
      await page.goto(portailConsultationUrl);
      await expect(page.getByText('verrouillées en lecture seule')).toBeVisible();
    });

    await test.step('Demande de correction', async () => {
      await page
        .getByPlaceholder(/je me suis trompé/i)
        .fill('Je me suis trompé à la première question, merci de me laisser corriger.');
      await page.getByRole('button', { name: 'Demander une correction' }).click();
      await expect(page.getByText(/a été transmise à votre praticien/)).toBeVisible();
    });

    await test.step('Déblocage côté praticien', async () => {
      // Cookie de session praticien déjà posé à l'étape de provisionnement.
      await page.goto(`/dashboard/patients/${PATIENT.idPatient}`);
      // Poste de pilotage (A6-R1) : le déblocage d'une demande de correction vit
      // dans la phase Patient (un bandeau permanent l'annonce quelle que soit la
      // phase). On ouvre la phase Patient via le rail avant de débloquer.
      await page.getByRole('tablist', { name: 'Cycle clinique' }).getByRole('tab', { name: /Patient/ }).click();
      await expect(page.getByText(/Demande de correction/)).toBeVisible();
      await page.getByRole('button', { name: 'Débloquer' }).click();
      await expect(page.getByText(/Demande de correction/)).toHaveCount(0);
    });

    await test.step('Re-soumission après déblocage', async () => {
      await page.goto(`${portailUrl}/questionnaires`);
      await expect(page.getByText('Déverrouillé par le praticien')).toBeVisible();
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/patient/questionnaire?id=') && res.status() === 200),
        page.getByRole('link', { name: 'Corriger' }).first().click(),
      ]);
      await repondreEtTransmettre(page);
      await expect(page).toHaveURL(new RegExp(`${portailUrl}/questionnaires$`));
      await ouvrirSectionSecondaire(page, 'Transmis au praticien');
      await expect(page.getByText('Transmis au praticien').first()).toBeVisible();
    });

    await test.step('Centre « Informations, confidentialité et droits » (TRUST LOT-02)', async () => {
      // Lien permanent du pied de page, visible depuis toutes les pages.
      await page.getByRole('link', { name: 'Confidentialité et droits' }).click();
      await expect(
        page.getByRole('heading', { name: 'Informations, confidentialité et droits' }),
      ).toBeVisible();
      // Version visible et état de lecture tracé par la séquence du début.
      await expect(page.getByText('Version v1 — publiée le 2026-07-16').first()).toBeVisible();
      await expect(page.getByText(/Pris connaissance le/).first()).toBeVisible();
      // Accordéon accessible : les numéros d'urgence s'affichent à la demande.
      await page.getByRole('group').filter({ hasText: 'En cas d’urgence' }).locator('summary').click();
      await expect(page.getByText('15 — SAMU, urgence médicale')).toBeVisible();
      // La séquence ne se représente pas : retour à l'espace sans blocage.
      await page.getByRole('link', { name: '← Mon espace' }).click();
      await expect(page.getByRole('heading', { name: 'Mes questionnaires' })).toBeVisible();
    });
  });
});

test('route patient : accès Ma spirale alimentaire (JA5-02)', async ({ page, context }) => {
  const sessionCookie = await praticienSessionCookie();
  await context.addCookies([sessionCookie]);

  const creation = await page.request.post('/api/praticien/consultations', {
    data: { idPatient: PATIENT.idPatient },
  });
  expect(creation.ok()).toBe(true);
  const creationJson = await creation.json();
  const token = creationJson.accessToken as string;

  const portailSession = await page.request.post('/api/portail/session', {
    data: { token, email: PATIENT.email },
  });
  expect(portailSession.ok()).toBe(true);

  await page.goto(`/portail/${token}/alimentation`);
  await expect(page).toHaveURL(new RegExp(`/portail/${token}/alimentation$`));
  await expect(page.getByRole('heading', { name: 'Ma spirale alimentaire' })).toBeVisible();
});
