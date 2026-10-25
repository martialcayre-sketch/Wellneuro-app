// BANC SUR BASE RÉELLE — le courrier complément ([[D-345]] §5, J3-12h lot 3).
// Ce que les bancs à base simulée ne tiennent pas, et que la revue du lot 2 a
// exigé :
//
//   1. PARITÉ. La liste calculée en TypeScript (`listeComplementsCibles`) est
//      celle que le trigger de la remise recalcule depuis le payload du
//      protocole approuvé — cas avec ingrédient compris : la remise passe. Une
//      liste qui oublie l'ingrédient, elle, est refusée.
//   2. LES DEUX OU RIEN. `consignerCourrierComplement` écrit le courrier et sa
//      liste dans une seule transaction : une liste que la base refuse
//      (désordre) laisse le dossier SANS courrier.
//   3. Un clic rejoué : `createMany` rend 0 ligne, sans erreur.
//   4. LA REMISE DU CLIC DE BOUT EN BOUT : `remettreCourrierComplement`, dans
//      une transaction, avec ses vraies lectures (âge, anamnèse envoyée,
//      accord) — remise, puis rejeu « déjà remis » ; un refus du trigger
//      annule la transaction entière, approbation créée dans la même comprise.
//   5. Collation : des identifiants de casse mélangée se trient en ordre
//      d'octets des deux côtés ; une référence catalogue nulle est refusée en
//      clair en TypeScript ET par le trigger.
//   6. LA FENÊTRE DE FRAÎCHEUR (J3-12h lot 4, routée de la revue CodeRabbit de
//      #1691), par les vrais lecteurs de la garde : aucune déclaration
//      n'expire (un « oui » de 2019 tient), seul un « non » postérieur du
//      praticien lève, un « oui » non daté ne se lève jamais, et une
//      déclaration posée après un aperçu « non requis » est vue par l'aperçu
//      SUIVANT, qui bloque le clic.
//
// SAUTÉ PAR DÉFAUT (T1, T2) : il écrit et commet. Il ne tourne que si
// `WN_COURRIER_COMPLEMENT_BANC_BASE` nomme la base de `DATABASE_URL`, sur un
// hôte LOCAL (patron de `collecte/documentsDeposes.pg.test.ts`) — en CI, après
// le contrat SQL du lot 2. Ses lignes (dossier `PAT_BANC_CCR_…`, propre au run,
// identités de fixture) restent dans la base éphémère.

import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import { listeComplementsCibles } from './courrierComplementListe';

const URL_BASE = process.env.DATABASE_URL ?? '';
const BASE_ANNONCEE = process.env.WN_COURRIER_COMPLEMENT_BANC_BASE ?? '';

function baseAutorisee(): boolean {
  if (!URL_BASE || !BASE_ANNONCEE) return false;
  const url = new URL(URL_BASE);
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${url.hostname} », le banc n'écrit que sur une base locale.`);
  }
  if (url.pathname.slice(1) !== BASE_ANNONCEE) {
    throw new Error(`REFUS : DATABASE_URL vise « ${url.pathname.slice(1)} », WN_COURRIER_COMPLEMENT_BANC_BASE annonce « ${BASE_ANNONCEE} ».`);
  }
  return true;
}

const ACTIF = baseAutorisee();
const RUN = randomBytes(4).toString('hex').toUpperCase();
const PRATICIEN = 'praticien.banc@wellneuro.fr';
const V4 = 'c1-protocol-draft-v4';
const H = 'a'.repeat(64);
const ANCRAGE = { sha256: H, version: `complement-cible-${H}` };
const sha = (texte: string) => createHash('sha256').update(texte, 'utf8').digest('hex');

function action(actionId: string, title: string, extra: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId,
    type: 'supplement_exploration',
    title,
    idealPlan: 'i',
    minimalPlan: 'm',
    rescuePlan: 'r',
    limitations: [],
    natureComplement: 'cible',
    interventionStatus: 'active',
    ...extra,
  };
}

// Deux ciblés (l'un avec ingrédient, intitulés accentués), un multivitaminé,
// un aliment : la liste ne porte que les deux ciblés.
const ACTIONS: ProtocolAction[] = [
  action('cible-b', 'Magnésium — intention ciblée', {
    supplementCatalogRef: { ingredientId: 'ing_banc_mg', ruleId: 'r', ruleVersion: 1, justification: 'j' },
  }),
  action('cible-A', 'Fer, intention ciblée'),
  action('multi', 'Multivitaminé', { natureComplement: 'multivitamine_vente_libre' }),
  { ...action('aliment', 'Assiette'), type: 'food', natureComplement: undefined },
];

describe.skipIf(!ACTIF)('courrier complément — base réelle (parité de la liste, les deux ou rien)', () => {
  let consigner: typeof import('./courrierComplementConsignation').consignerCourrierComplement;
  let prisma: typeof import('@/lib/prisma').prisma;
  let remettre: typeof import('./courrierComplementRemise').remettreCourrierComplement;
  let apercu: typeof import('./courrierComplementRemise').apercuCourrierComplement;
  let Refusee: typeof import('./courrierComplementRemise').RemiseComplementRefusee;
  let ecrirePhysio: typeof import('@/lib/physio-traitements/ecriture').ecrirePhysio;
  let observateur: pg.Client;
  let numero = 0;

  /** Une anamnèse ENVOYÉE qui déclare une grossesse : la garde rend « requis ». */
  async function anamneseGrossesse(idPatient: string): Promise<void> {
    await observateur.query(
      `INSERT INTO consultations (id, id_consultation, id_patient, email_patient, praticien_email, statut, anamnese, date_validation, updated_at)
       VALUES ($1, $1, $2, 'sophie.nicola+banc@example.test', $3, 'validee', '{"etat_grossesse": "Oui"}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [`cons_banc_ccr_${RUN.toLowerCase()}_${numero}`, idPatient, PRATICIEN],
    );
  }

  /** Une anamnèse ENVOYÉE déclarant une grossesse, à la date d'envoi donnée (`null` = non datée). */
  async function anamneseGrossesseDatee(idPatient: string, dateValidation: string | null): Promise<void> {
    await observateur.query(
      `INSERT INTO consultations (id, id_consultation, id_patient, email_patient, praticien_email, statut, anamnese, date_validation, updated_at)
       VALUES ($1, $1, $2, 'sophie.nicola+banc@example.test', $3, 'validee', '{"etat_grossesse": "Oui"}'::jsonb, $4::timestamptz, CURRENT_TIMESTAMP)`,
      [`cons_banc_ccr_datee_${RUN.toLowerCase()}_${numero}`, idPatient, PRATICIEN, dateValidation],
    );
  }

  /**
   * Une ligne du PRATICIEN sur la fiche physiologique, par son VRAI écrivain
   * (date posée par la base). Grossesse et allaitement sont réservés au
   * praticien (contrainte `donnees_physiologiques_criteres_du_patient`).
   */
  async function declarer(idPatient: string, critere: 'grossesse' | 'allaitement', reponse: string) {
    await prisma.$transaction(async tx => {
      const tete = await tx.donneePhysiologique.findFirst({
        where: { idPatient, critere }, orderBy: { ordre: 'desc' }, select: { id: true },
      });
      await ecrirePhysio(
        tx,
        idPatient,
        { acte: 'pose', critere, remplace: tete?.id ?? null, reponse, mesure: null, mesureLe: null },
        { source: 'praticien', email: PRATICIEN },
      );
    });
  }

  const apercuDu = (idPatient: string) =>
    apercu(prisma, { idPatient, actions: ACTIONS, contractVersion: V4, maintenantMs: Date.now() });

  /** Un dossier neuf, son protocole V4 approuvé et l'accord de partage. */
  async function dossier(actions: ProtocolAction[] = ACTIONS): Promise<{ idPatient: string; idApprobation: string }> {
    numero += 1;
    const idPatient = `PAT_BANC_CCR_${RUN}_${numero}`;
    const suffixe = `${RUN.toLowerCase()}_${numero}`;
    await observateur.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, date_naissance, updated_at)
       VALUES ($1, $2, $3, 'Sophie', 'Nicola', $4, '1985-03-14', CURRENT_TIMESTAMP)`,
      [`pat_banc_ccr_${suffixe}`, idPatient, `sophie.nicola+banc-ccr-${suffixe}@example.test`, PRATICIEN],
    );
    await observateur.query(
      `INSERT INTO protocol_drafts
         (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
          review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
       VALUES ($1, $2, 'dc', $3, $3, $3, 'prio', $4::jsonb, $3, $5, CURRENT_TIMESTAMP)`,
      [`pd_banc_ccr_${suffixe}`, idPatient, H, JSON.stringify({ actions }), V4],
    );
    await observateur.query(
      `INSERT INTO protocol_diffusion_approvals
         (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash, approved_at, confirmation)
       VALUES ($1, $2, $3, $4, $4, CURRENT_TIMESTAMP, 'content_approved_for_diffusion')`,
      [`pda_banc_ccr_${suffixe}`, idPatient, `pd_banc_ccr_${suffixe}`, H],
    );
    await observateur.query(
      `INSERT INTO trust_choice_events (id, id_patient, finalite, statut, document_version, enregistre_le)
       VALUES ($1, $2, 'partage_medecin_traitant', 'accorde', 'banc', CURRENT_TIMESTAMP)`,
      [`tce_banc_ccr_${suffixe}`, idPatient],
    );
    return { idPatient, idApprobation: `pda_banc_ccr_${suffixe}` };
  }

  const donnees = (idPatient: string, texte: string) => ({
    idPatient,
    praticienEmail: PRATICIEN,
    sens: 'sortant' as const,
    medecinLibelle: 'Dr Banc',
    texte,
    idSynthese: null,
    echangeLe: null,
  });

  async function courriers(idPatient: string): Promise<number> {
    const { rows } = await observateur.query(
      'SELECT count(*)::int AS n FROM correspondances_medecin WHERE id_patient = $1', [idPatient]);
    return rows[0].n as number;
  }

  beforeAll(async () => {
    observateur = new pg.Client({ connectionString: URL_BASE });
    await observateur.connect();
    ({ consignerCourrierComplement: consigner } = await import('./courrierComplementConsignation'));
    ({ prisma } = await import('@/lib/prisma'));
    ({
      remettreCourrierComplement: remettre,
      apercuCourrierComplement: apercu,
      RemiseComplementRefusee: Refusee,
    } = await import('./courrierComplementRemise'));
    ({ ecrirePhysio } = await import('@/lib/physio-traitements/ecriture'));
  });

  afterAll(async () => {
    await observateur?.end();
    await prisma?.$disconnect();
  });

  it('PARITÉ — la liste TypeScript, ingrédient compris, est celle du trigger : la remise passe', async () => {
    const { idPatient, idApprobation } = await dossier();
    const liste = listeComplementsCibles(ACTIONS, V4);
    expect(liste.ok).toBe(true);
    if (!liste.ok) return;
    expect(liste.elements).toHaveLength(2);
    expect(liste.elements.some(e => e.split(':').length === 3)).toBe(true);

    const consigne = await consigner(prisma, {
      idPatient, donnees: donnees(idPatient, 'Docteur, courrier du banc.'), ancrage: ANCRAGE, liste, maintenantMs: Date.now(),
    });
    expect(consigne.ok).toBe(true);
    if (!consigne.ok) return;

    const remise = await prisma.courrierComplementRemise.createMany({
      data: [{
        idPatient,
        idApprobation,
        idCorrespondance: consigne.idCorrespondance,
        texte: 'Docteur, courrier du banc.',
        texteSha256: sha('Docteur, courrier du banc.'),
        complements: liste.elements,
        complementsSha256: liste.sha256,
      }],
    });
    expect(remise.count).toBe(1);

    // Un clic rejoué : 0 ligne, sans erreur (le trigger rend NULL).
    const rejoue = await prisma.courrierComplementRemise.createMany({
      data: [{
        idPatient,
        idApprobation,
        idCorrespondance: consigne.idCorrespondance,
        texte: 'Docteur, courrier du banc.',
        texteSha256: sha('Docteur, courrier du banc.'),
        complements: liste.elements,
        complementsSha256: liste.sha256,
      }],
    });
    expect(rejoue.count).toBe(0);
  });

  it('PARITÉ, contre-épreuve — une liste qui oublie l’ingrédient est refusée par le trigger', async () => {
    const { idPatient, idApprobation } = await dossier();
    const sansIngredient = listeComplementsCibles(
      ACTIONS.map(a => ({ ...a, supplementCatalogRef: undefined })), V4);
    expect(sansIngredient.ok).toBe(true);
    if (!sansIngredient.ok) return;
    const consigne = await consigner(prisma, {
      idPatient, donnees: donnees(idPatient, 'Docteur, autre courrier.'), ancrage: ANCRAGE, liste: sansIngredient, maintenantMs: Date.now(),
    });
    expect(consigne.ok).toBe(true);
    if (!consigne.ok) return;
    const texte = 'Docteur, autre courrier.';
    await expect(prisma.courrierComplementRemise.createMany({
      data: [{
        idPatient,
        idApprobation,
        idCorrespondance: consigne.idCorrespondance,
        texte,
        texteSha256: sha(texte),
        complements: sansIngredient.elements,
        complementsSha256: sansIngredient.sha256,
      }],
    })).rejects.toThrow(/n'est pas celle du protocole approuvé/);
  });

  it('LES DEUX OU RIEN — une liste refusée par la base laisse le dossier sans courrier', async () => {
    const { idPatient } = await dossier();
    const liste = listeComplementsCibles(ACTIONS, V4);
    if (!liste.ok) throw new Error('fixture');
    const desordre = [...liste.elements].reverse();
    const avant = await courriers(idPatient);
    await expect(consigner(prisma, {
      idPatient,
      donnees: donnees(idPatient, 'Docteur, courrier refusé.'),
      ancrage: ANCRAGE,
      maintenantMs: Date.now(),
      liste: {
        elements: desordre,
        sha256: sha(desordre.join('\n')),
      },
    })).rejects.toThrow(/n'est pas distincte et triée/);
    expect(await courriers(idPatient)).toBe(avant);
  });

  it('REMISE DU CLIC — remise, puis rejeu « déjà remis », par les vraies lectures de la garde', async () => {
    const { idPatient, idApprobation } = await dossier();
    await anamneseGrossesse(idPatient);
    const liste = listeComplementsCibles(ACTIONS, V4);
    if (!liste.ok) throw new Error('fixture');
    const consigne = await consigner(prisma, {
      idPatient, donnees: donnees(idPatient, 'Docteur, courrier du clic.'), ancrage: ANCRAGE, liste, maintenantMs: Date.now(),
    });
    if (!consigne.ok) throw new Error('consignation');
    const entrees = {
      idPatient, idApprobation, actions: ACTIONS, contractVersion: V4, maintenantMs: Date.now(),
      idCorrespondanceVue: consigne.idCorrespondance,
    };
    expect(await prisma.$transaction(tx => remettre(tx, entrees))).toBe('remis');
    // Rejoué : la remise couvre désormais la liste — rien à remettre.
    expect(await prisma.$transaction(tx => remettre(tx, entrees))).toBe('rien');
    const { rows } = await observateur.query(
      'SELECT count(*)::int AS n FROM courriers_complement_remises WHERE id_patient = $1', [idPatient]);
    expect(rows[0].n).toBe(1);
  });

  it('REMISE DU CLIC — un refus du trigger annule la transaction entière, approbation du clic comprise', async () => {
    const { idPatient } = await dossier();
    await anamneseGrossesse(idPatient);
    const liste = listeComplementsCibles(ACTIONS, V4);
    if (!liste.ok) throw new Error('fixture');
    const consigne = await consigner(prisma, {
      idPatient, donnees: donnees(idPatient, 'Docteur, courrier refusé au clic.'), ancrage: ANCRAGE, liste, maintenantMs: Date.now(),
    });
    if (!consigne.ok) throw new Error('consignation');
    // Une approbation dont la version ne porte AUCUN complément ciblé : le
    // trigger refuse la remise ; la transaction du clic doit tout annuler.
    const idApprobation = `pda_banc_ccr_vide_${RUN.toLowerCase()}_${numero}`;
    await expect(prisma.$transaction(async tx => {
      await tx.protocolDraft.create({
        data: {
          id: `pd_banc_ccr_vide_${RUN.toLowerCase()}_${numero}`,
          idPatient,
          decisionCardId: 'dc',
          decisionCardInputHash: H,
          snapshotInputHash: H,
          reviewInputHash: H,
          selectedPriorityId: 'prio',
          payload: { actions: [] },
          inputHash: H,
          contractVersion: V4,
        },
      });
      await tx.protocolDiffusionApproval.create({
        data: {
          id: idApprobation,
          idPatient,
          protocolDraftId: `pd_banc_ccr_vide_${RUN.toLowerCase()}_${numero}`,
          decisionCardInputHash: H,
          protocolDraftInputHash: H,
          approvedAt: new Date(),
          confirmation: 'content_approved_for_diffusion',
        },
      });
      return remettre(tx, {
        idPatient, idApprobation, actions: ACTIONS, contractVersion: V4, maintenantMs: Date.now(),
        idCorrespondanceVue: consigne.idCorrespondance,
      });
    })).rejects.toBeInstanceOf(Refusee);
    const { rows } = await observateur.query(
      'SELECT count(*)::int AS n FROM protocol_diffusion_approvals WHERE id = $1', [idApprobation]);
    expect(rows[0].n).toBe(0);
  });

  it('COLLATION — des identifiants de casse mélangée se trient en ordre d’octets des deux côtés', async () => {
    const melange = [action('b-un', 'Un'), action('B-deux', 'Deux'), action('a-trois', 'Trois'), action('A-quatre', 'Quatre')];
    const { idPatient, idApprobation } = await dossier(melange);
    const liste = listeComplementsCibles(melange, V4);
    if (!liste.ok) throw new Error('fixture');
    expect(liste.elements.map(e => e.split(':')[0])).toEqual(['A-quatre', 'B-deux', 'a-trois', 'b-un']);
    const consigne = await consigner(prisma, {
      idPatient, donnees: donnees(idPatient, 'Docteur, collation.'), ancrage: ANCRAGE, liste, maintenantMs: Date.now(),
    });
    if (!consigne.ok) throw new Error('consignation');
    const remise = await prisma.courrierComplementRemise.createMany({
      data: [{
        idPatient, idApprobation, idCorrespondance: consigne.idCorrespondance,
        texte: 'Docteur, collation.', texteSha256: sha('Docteur, collation.'),
        complements: liste.elements, complementsSha256: liste.sha256,
      }],
    });
    expect(remise.count).toBe(1);
  });

  it('RÉFÉRENCE CATALOGUE NULLE — refusée en clair en TypeScript, et par le trigger', async () => {
    const nulle = [action('ref-nulle', 'Référence nulle', { supplementCatalogRef: null as never })];
    expect(listeComplementsCibles(nulle, V4)).toEqual({ ok: false, raison: 'reference_catalogue_invalide' });
    const { idPatient, idApprobation } = await dossier(nulle);
    // Une liste forgée qui ignore la référence : le trigger la refuse quand même.
    const forgee = listeComplementsCibles([action('ref-nulle', 'Référence nulle')], V4);
    if (!forgee.ok) throw new Error('fixture');
    const consigne = await consigner(prisma, {
      idPatient, donnees: donnees(idPatient, 'Docteur, référence nulle.'), ancrage: ANCRAGE, liste: forgee, maintenantMs: Date.now(),
    });
    if (!consigne.ok) throw new Error('consignation');
    await expect(prisma.courrierComplementRemise.createMany({
      data: [{
        idPatient, idApprobation, idCorrespondance: consigne.idCorrespondance,
        texte: 'Docteur, référence nulle.', texteSha256: sha('Docteur, référence nulle.'),
        complements: forgee.elements, complementsSha256: forgee.sha256,
      }],
    })).rejects.toThrow(/mal formée/);
  });

  it('accord retiré : rien n’est consigné, refus rendu (pas d’exception)', async () => {
    const { idPatient } = await dossier();
    await observateur.query(
      `INSERT INTO trust_choice_events (id, id_patient, finalite, statut, document_version, enregistre_le)
       VALUES ($1, $2, 'partage_medecin_traitant', 'retire', 'banc', CURRENT_TIMESTAMP + interval '1 second')`,
      [`tce_banc_ccr_retrait_${RUN.toLowerCase()}_${numero}`, idPatient],
    );
    const liste = listeComplementsCibles(ACTIONS, V4);
    if (!liste.ok) throw new Error('fixture');
    const consigne = await consigner(prisma, {
      idPatient, donnees: donnees(idPatient, 'Docteur, courrier sans accord.'), ancrage: ANCRAGE, liste, maintenantMs: Date.now(),
    });
    expect(consigne.ok).toBe(false);
    expect(await courriers(idPatient)).toBe(0);
  });

  it('devenu mineur après la garde (revue Codex P1-1) : l’âge relu sous verrou refuse, rien n’est consigné', async () => {
    const { idPatient } = await dossier();
    const liste = listeComplementsCibles(ACTIONS, V4);
    if (!liste.ok) throw new Error('fixture');
    // La garde de la route a vu un majeur ; la date est corrigée avant le verrou.
    await observateur.query(
      `UPDATE patients SET date_naissance = to_char(CURRENT_DATE - interval '10 years', 'YYYY-MM-DD') WHERE id_patient = $1`,
      [idPatient],
    );
    const consigne = await consigner(prisma, {
      idPatient,
      donnees: donnees(idPatient, 'Docteur, courrier pour un dossier devenu mineur.'),
      ancrage: ANCRAGE,
      liste,
      maintenantMs: Date.now(),
    });
    expect(consigne).toMatchObject({ ok: false, raison: 'garde_mineur' });
    expect(await courriers(idPatient)).toBe(0);
  });

  it('FRAÎCHEUR — un « oui » envoyé en 2019 tient : aucune déclaration n’expire, le courrier est requis', async () => {
    const { idPatient } = await dossier();
    await anamneseGrossesseDatee(idPatient, '2019-01-01T00:00:00Z');
    expect(await apercuDu(idPatient)).toMatchObject({ etat: 'manquant', statut: 'requis', grossesseDeclenche: true });
  });

  it('FRAÎCHEUR — ce « oui » ancien, le praticien le lève par un « non » postérieur (les deux critères)', async () => {
    const { idPatient } = await dossier();
    await anamneseGrossesseDatee(idPatient, '2019-01-01T00:00:00Z');
    await declarer(idPatient, 'grossesse', 'non');
    await declarer(idPatient, 'allaitement', 'non');
    expect(await apercuDu(idPatient)).toMatchObject({ etat: 'non_requis', statut: 'non_requis' });
  });

  it('FRAÎCHEUR — un « oui » envoyé sans date d’envoi ne se lève jamais, même par un « non » du praticien', async () => {
    const { idPatient } = await dossier();
    await anamneseGrossesseDatee(idPatient, null);
    await declarer(idPatient, 'grossesse', 'non');
    await declarer(idPatient, 'allaitement', 'non');
    expect(await apercuDu(idPatient)).toMatchObject({ etat: 'manquant', statut: 'requis', grossesseDeclenche: true });
  });

  it('FRAÎCHEUR — une déclaration posée après un aperçu « non requis » : l’aperçu suivant la voit et bloque le clic', async () => {
    const { idPatient } = await dossier();
    await declarer(idPatient, 'grossesse', 'non');
    await declarer(idPatient, 'allaitement', 'non');
    expect(await apercuDu(idPatient)).toMatchObject({ etat: 'non_requis' });
    // Le patient envoie ensuite une anamnèse qui déclare une grossesse (la
    // fiche physiologique, elle, réserve ce critère au praticien).
    await anamneseGrossesseDatee(idPatient, new Date().toISOString());
    expect(await apercuDu(idPatient)).toMatchObject({ etat: 'manquant', statut: 'requis', grossesseDeclenche: true });
  });
});
