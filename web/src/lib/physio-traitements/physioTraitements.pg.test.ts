// BANC SUR BASE RÉELLE — l'écriture des lignes ([[D-391]] §7, condition de
// [[D-335]] §9). Le banc SQL à deux sessions de la migration
// (`scripts/banc-physio-traitements-deux-sessions.test.mjs`) tient les
// verrous et les triggers ; aucun banc ne jouait jusqu'ici l'écriture DU CODE,
// `ecriture.ts`, sur une vraie base. Celui-ci la joue :
//
//   1. UN TRAITEMENT, DE BOUT EN BOUT : pose, remplacement, retrait, chacun lu
//      en retour par `lireTraitementsEnVigueur` — le lecteur de la ligne de
//      vigilance ([[D-391]] §4). Un remplacement qui vise l'ancienne tête est
//      refusé en clair (`tete_changee`), sans rien écrire.
//   2. DEUX REMPLACEMENTS CONCURRENTS D'UN MÊME FIL : une seule passe, l'autre
//      est refusée nommément, et le fil garde une tête.
//   3. DEUX PREMIÈRES POSES CONCURRENTES D'UN MÊME CRITÈRE (grossesse, réservée
//      au praticien) : une seule passe ; puis son retrait ramène le critère à
//      « non renseigné ».
//
// LE CROISEMENT EST FORCÉ, pas espéré (revue `wn-reviewer`) : la session
// observatrice tient le verrou du fil ou du critère, attend que les DEUX
// transactions l'attendent (`pg_locks`), puis le rend. Sans ce verrou dans
// `ecriture.ts`, la seconde lirait l'ancienne tête et le trigger la
// refuserait d'une erreur SQL, pas du refus nommé : le banc rougit à coup sûr.
//
// SAUTÉ PAR DÉFAUT (T1, T2) : il écrit et commet. Il ne tourne que si
// `WN_PHYSIO_ECRITURE_BANC_BASE` nomme la base de `DATABASE_URL`, sur un hôte
// LOCAL (patron de `correspondance/courrierComplement.pg.test.ts`) — en CI,
// après le contrat SQL et le banc à deux sessions. Ses lignes (dossier
// `PAT_BANC_PHY_…`, propre au run, identité de fixture) restent dans la base
// éphémère.

import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import type { DemandeTraitement } from './demande';

const URL_BASE = process.env.DATABASE_URL ?? '';
const BASE_ANNONCEE = process.env.WN_PHYSIO_ECRITURE_BANC_BASE ?? '';

function baseAutorisee(): boolean {
  if (!URL_BASE || !BASE_ANNONCEE) return false;
  const url = new URL(URL_BASE);
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${url.hostname} », le banc n'écrit que sur une base locale.`);
  }
  if (url.pathname.slice(1) !== BASE_ANNONCEE) {
    throw new Error(`REFUS : DATABASE_URL vise « ${url.pathname.slice(1)} », WN_PHYSIO_ECRITURE_BANC_BASE annonce « ${BASE_ANNONCEE} ».`);
  }
  return true;
}

const ACTIF = baseAutorisee();
const RUN = randomBytes(4).toString('hex').toUpperCase();
const PRATICIEN = 'praticien.banc@wellneuro.fr';
const AUTEUR = { source: 'praticien' as const, email: PRATICIEN };

function pose(remplace: string | null, nom: string, dose: string | null): DemandeTraitement {
  return {
    acte: 'pose',
    remplace,
    nature: 'medicament',
    nom,
    dose,
    moment: null,
    motif: null,
    debut: { precision: 'inconnu', premierJour: null },
    fin: null,
    prescritParTiers: 'inconnu',
  };
}

/** La raison d'un refus nommé, ou le refus lui-même s'il n'en porte pas. */
function raison(r: PromiseSettledResult<unknown>): unknown {
  return r.status === 'rejected' ? (r.reason as { raison?: string }).raison ?? r.reason : null;
}

describe.skipIf(!ACTIF)('écriture des lignes physiologiques et des traitements — base réelle ([[D-391]] §7)', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let ecrireTraitement: typeof import('./ecriture').ecrireTraitement;
  let ecrirePhysio: typeof import('./ecriture').ecrirePhysio;
  let lireTraitementsEnVigueur: typeof import('./lecture').lireTraitementsEnVigueur;
  let lireDonneesDuDossier: typeof import('./lecture').lireDonneesDuDossier;
  let observateur: pg.Client;
  let numero = 0;

  async function dossier(): Promise<string> {
    numero += 1;
    const idPatient = `PAT_BANC_PHY_${RUN}_${numero}`;
    const suffixe = `${RUN.toLowerCase()}_${numero}`;
    await observateur.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, date_naissance, updated_at)
       VALUES ($1, $2, $3, 'Jennifer', 'Martin', $4, '1990-06-02', CURRENT_TIMESTAMP)`,
      [`pat_banc_phy_${suffixe}`, idPatient, `jennifer.martin+banc-phy-${suffixe}@example.test`, PRATICIEN],
    );
    return idPatient;
  }

  /**
   * Joue les écritures pendant que l'observateur tient le verrou de `cle`, et
   * ne le rend qu'une fois toutes en attente : elles se croisent toujours.
   */
  async function croisees<T>(cle: string, ecritures: (() => Promise<T>)[]): Promise<PromiseSettledResult<T>[]> {
    await observateur.query('SELECT pg_advisory_lock(335, hashtext($1))', [cle]);
    const issues = Promise.allSettled(ecritures.map(e => e()));
    try {
      const limite = Date.now() + 10_000;
      for (;;) {
        const { rows } = await observateur.query(
          `SELECT count(*)::int AS n FROM pg_locks
            WHERE locktype = 'advisory' AND NOT granted AND classid = 335 AND pid <> pg_backend_pid()`,
        );
        if (rows[0].n >= ecritures.length) break;
        if (Date.now() > limite) throw new Error(`les ${ecritures.length} écritures n'attendent pas le verrou « ${cle} »`);
        await new Promise(r => setTimeout(r, 20));
      }
    } finally {
      await observateur.query('SELECT pg_advisory_unlock(335, hashtext($1))', [cle]);
    }
    return issues;
  }

  const traitement = (idPatient: string, demande: DemandeTraitement) =>
    prisma.$transaction(tx => ecrireTraitement(tx, idPatient, demande, AUTEUR));

  async function lignes(table: 'traitements_en_cours' | 'donnees_physiologiques', idPatient: string): Promise<number> {
    const { rows } = await observateur.query(`SELECT count(*)::int AS n FROM ${table} WHERE id_patient = $1`, [idPatient]);
    return rows[0].n as number;
  }

  beforeAll(async () => {
    observateur = new pg.Client({ connectionString: URL_BASE });
    await observateur.connect();
    ({ prisma } = await import('@/lib/prisma'));
    ({ ecrireTraitement, ecrirePhysio } = await import('./ecriture'));
    ({ lireTraitementsEnVigueur, lireDonneesDuDossier } = await import('./lecture'));
  });

  afterAll(async () => {
    await observateur?.end();
    await prisma?.$disconnect();
  });

  it('un traitement : pose, remplacement, retrait — chacun lu en retour par le lecteur de la vigilance', async () => {
    const idPatient = await dossier();

    const premiere = await traitement(idPatient, pose(null, 'Traitement banc', '1 cp'));
    let enVigueur = await lireTraitementsEnVigueur(prisma, idPatient);
    expect(enVigueur.map(l => [l.id, l.nom, l.dose])).toEqual([[premiere.id, 'Traitement banc', '1 cp']]);

    const seconde = await traitement(idPatient, pose(premiere.id, 'Traitement banc', '2 cp'));
    enVigueur = await lireTraitementsEnVigueur(prisma, idPatient);
    expect(enVigueur.map(l => [l.id, l.dose])).toEqual([[seconde.id, '2 cp']]);

    // L'ancienne tête n'est plus remplaçable : refus nommé, rien d'écrit.
    const perimee = await Promise.allSettled([traitement(idPatient, pose(premiere.id, 'Traitement banc', '3 cp'))]);
    expect(raison(perimee[0])).toBe('tete_changee');
    expect(await lignes('traitements_en_cours', idPatient)).toBe(2);

    await traitement(idPatient, { acte: 'retrait', remplace: seconde.id });
    expect(await lireTraitementsEnVigueur(prisma, idPatient)).toEqual([]);
    expect(await lignes('traitements_en_cours', idPatient)).toBe(3);
  });

  it('deux remplacements concurrents d’un même fil : une seule passe, l’autre est refusé nommément', async () => {
    const idPatient = await dossier();
    const tete = await traitement(idPatient, pose(null, 'Traitement concurrent', null));

    const issues = await croisees(`${idPatient}|traitement`, [
      () => traitement(idPatient, pose(tete.id, 'Traitement concurrent', 'A')),
      () => traitement(idPatient, pose(tete.id, 'Traitement concurrent', 'B')),
    ]);
    expect(issues.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(issues.map(raison).filter(Boolean)).toEqual(['tete_changee']);

    const enVigueur = await lireTraitementsEnVigueur(prisma, idPatient);
    expect(enVigueur).toHaveLength(1);
    expect(['A', 'B']).toContain(enVigueur[0].dose);
    expect(await lignes('traitements_en_cours', idPatient)).toBe(2);
  });

  it('deux premières poses concurrentes d’un même critère : une seule passe ; son retrait le ramène à « non renseigné »', async () => {
    const idPatient = await dossier();
    const poser = (reponse: string) => prisma.$transaction(tx => ecrirePhysio(
      tx,
      idPatient,
      { acte: 'pose', critere: 'grossesse', remplace: null, reponse, mesure: null, mesureLe: null },
      AUTEUR,
    ));

    const issues = await croisees(`${idPatient}|physio|grossesse`, [() => poser('non'), () => poser('oui')]);
    const passee = issues.find((r): r is PromiseFulfilledResult<{ id: string }> => r.status === 'fulfilled');
    expect(passee).toBeDefined();
    expect(issues.map(raison).filter(Boolean)).toEqual(['tete_changee']);
    expect(await lignes('donnees_physiologiques', idPatient)).toBe(1);

    await prisma.$transaction(tx => ecrirePhysio(
      tx, idPatient, { acte: 'retrait', critere: 'grossesse', remplace: passee!.value.id }, AUTEUR,
    ));
    const { rows } = await observateur.query(
      `SELECT acte FROM donnees_physiologiques WHERE id_patient = $1 AND critere = 'grossesse' ORDER BY ordre`, [idPatient]);
    expect(rows.map(r => r.acte)).toEqual(['pose', 'retrait']);
    const lu = await lireDonneesDuDossier(prisma, idPatient);
    expect(lu.criteres.find(c => c.critere === 'grossesse')?.tete).toBeNull();
  });
});
