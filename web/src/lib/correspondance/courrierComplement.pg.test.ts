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
  let observateur: pg.Client;
  let numero = 0;

  /** Un dossier neuf, son protocole V4 approuvé et l'accord de partage. */
  async function dossier(): Promise<{ idPatient: string; idApprobation: string }> {
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
      [`pd_banc_ccr_${suffixe}`, idPatient, H, JSON.stringify({ actions: ACTIONS }), V4],
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
      idPatient, donnees: donnees(idPatient, 'Docteur, courrier du banc.'), ancrage: ANCRAGE, liste,
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
      idPatient, donnees: donnees(idPatient, 'Docteur, autre courrier.'), ancrage: ANCRAGE, liste: sansIngredient,
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
      liste: {
        elements: desordre,
        sha256: sha(desordre.join('\n')),
      },
    })).rejects.toThrow(/n'est pas distincte et triée/);
    expect(await courriers(idPatient)).toBe(avant);
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
      idPatient, donnees: donnees(idPatient, 'Docteur, courrier sans accord.'), ancrage: ANCRAGE, liste,
    });
    expect(consigne.ok).toBe(false);
    expect(await courriers(idPatient)).toBe(0);
  });
});
