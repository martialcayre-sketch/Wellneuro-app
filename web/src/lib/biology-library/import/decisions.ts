import { prisma } from '@/lib/prisma';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { validerSaisieResultat } from '@/lib/biology-library/resultats';
import { cleVerrouCompteRendu } from './verrou';
import { lireValeurQuantitative, MOTIFS_ECART, unitesConcordent, type MotifEcart } from './valeurLue';

// DÉCISIONS DU PRATICIEN SUR LES LIGNES CANDIDATES (BIO-INGEST LOT-02,
// [[D-256]] A3/A5). C'est le SEUL chemin par lequel un import écrit dans
// `resultats_biologiques` : rien n'y entre sans ce geste.
//
// TOUT OU RIEN (A3, patron de la saisie groupée) : toutes les décisions
// passent le préflight, tous les refus sont collectés, et l'écriture n'a lieu
// que si toutes passent — en UNE transaction interactive où chaque validation
// CRÉE le résultat (`source = saisie_praticien`, SANS `saisiLe` : Prisma
// l'écrit en UTC, et la base le compare à la fin de l'extraction) PUIS décide
// la ligne. Un `P2002` (une saisie manuelle intercalée a pris la clé) se rend
// TEL QUEL, sans repli sur le résultat existant : la transaction entière est
// annulée et les lignes restent proposées (consigne de la revue de la
// migration).
//
// LE PRATICIEN PEUT CORRIGER la valeur et la date lues (arbitrage du
// 2026-10-02) : le résultat est sa saisie. Mais une ligne LUE non
// quantitative (« <0,5 », « positif ») reste refusée, même s'il tape un
// nombre — ce serait inventer une mesure que le compte rendu ne donne pas. Et
// l'unité LUE doit être celle de l'analyte retenu : aucune conversion
// ([[D-157]]), l'unité du résultat est relue au catalogue.
//
// Les écarts pré-marqués par l'écran (`non_quantitative`, `unite_divergente`)
// ne sont posés qu'ici, par la décision du praticien — jamais par le système.

export const DECISIONS_MAX = 100;

export type DecisionBrute = {
  idLigne?: unknown;
  decision?: unknown;
  analyteCode?: unknown;
  valeur?: unknown;
  preleveLe?: unknown;
  motif?: unknown;
};

export type RefusDecision = { idLigne: string | null; index: number; reason: string; error: string };

export const MESSAGES_REFUS_DECISION: Record<string, string> = {
  decisions_vides: 'Aucune ligne n’est décidée.',
  decisions_trop_nombreuses: 'Trop de lignes pour un seul enregistrement.',
  import_introuvable: 'Cette extraction est introuvable dans ce dossier.',
  import_non_extrait: 'Cette extraction n’est pas terminée : aucune ligne ne se décide encore.',
  import_remplace:
    'Une extraction plus récente de ce compte rendu existe : seules ses lignes se décident.',
  ligne_absente: 'La ligne à décider est mal désignée.',
  ligne_en_double: 'Cette ligne figure deux fois dans l’envoi.',
  ligne_introuvable: 'Cette ligne n’appartient pas à cette extraction.',
  ligne_deja_traitee: 'Cette ligne a déjà été décidée : relisez l’extraction.',
  decision_invalide: 'La décision doit être « valider » ou « écarter ».',
  motif_invalide: 'Choisissez le motif de l’écart.',
  non_quantitative: 'La valeur lue n’est pas un nombre : la ligne ne peut que s’écarter.',
  unite_divergente:
    'L’unité lue n’est pas celle de l’analyte au catalogue : aucune conversion n’est faite, la ligne ne peut que s’écarter.',
  analyte_absent: 'Choisissez l’analyte de cette ligne.',
  analyte_inconnu: 'Cet analyte n’existe pas au catalogue.',
  analyte_inactif: 'Cet analyte est inactif au catalogue : pas de nouvelle mesure.',
  analyte_en_double: 'Deux lignes portent le même analyte au même horodatage : gardez-en une.',
  valeur_invalide: 'La valeur mesurée doit être un nombre.',
  valeur_hors_capacite: 'La valeur dépasse la capacité de stockage (35 chiffres) : vérifiez la saisie.',
  date_invalide: 'La date de prélèvement est illisible.',
  date_future: 'La date de prélèvement est dans le futur : un prélèvement n’anticipe pas.',
  heure_absente: 'L’heure du prélèvement n’a pas été lue : saisissez-la.',
  doublon_mesure:
    'Une mesure de cet analyte existe déjà pour ce patient à cet horodatage exact. Rien n’a été enregistré.',
  lignes_invalides: 'Rien n’a été enregistré : reprenez les lignes signalées.',
};

/** Les refus qui tiennent à la FORME de l'envoi — leur présence rend un 400. */
const REFUS_DE_FORME = new Set([
  'ligne_absente', 'ligne_en_double', 'decision_invalide', 'motif_invalide',
  'analyte_absent', 'valeur_invalide', 'valeur_hors_capacite', 'date_invalide', 'analyte_en_double',
  'heure_absente',
]);

const HEURE_PARIS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
});

/**
 * Minuit pile À PARIS — la convention de l'extraction pour « heure non lue »
 * (`lireDatePrelevement` garde la date seule à minuit de Paris).
 */
function estMinuitParis(instant: Date): boolean {
  return HEURE_PARIS.format(instant) === '00:00';
}

export type IssueDecisions =
  | { ok: true; validees: number; ecartees: number }
  | { ok: false; reason: string; error: string; status: number; lignes?: RefusDecision[] };

type Validation = { idLigne: string; analyteCode: string; valeur: number; preleveLe: Date; unite: string | null };
type Ecart = { idLigne: string; motif: MotifEcart };

class ImportRemplace extends Error {
  constructor() {
    super('import_remplace');
    this.name = 'ImportRemplace';
  }
}

/**
 * L'extraction COURANTE d'un compte rendu : la plus récente qui n'a pas
 * échoué (une extraction en cours compte — elle va remplacer la précédente).
 * Seules ses lignes se décident (arbitrage du responsable, 2026-10-02) : deux
 * extractions du même document ne donnent pas deux jeux de résultats.
 */
type LecteurImports = { importBiologique: { findFirst: typeof prisma.importBiologique.findFirst } };

async function idExtractionCourante(client: LecteurImports, idCompteRendu: string, idPatient: string) {
  const courante = await client.importBiologique.findFirst({
    where: { idCompteRendu, idPatient, statut: { not: 'echec' } },
    orderBy: { lanceLe: 'desc' },
    select: { id: true },
  });
  return courante?.id ?? null;
}

class LigneDejaTraitee extends Error {
  constructor() {
    super('ligne_deja_traitee');
    this.name = 'LigneDejaTraitee';
  }
}

function refusGlobal(reason: string, status: number): IssueDecisions {
  return { ok: false, reason, error: MESSAGES_REFUS_DECISION[reason], status };
}

export async function deciderLignes(params: {
  idPatient: string;
  idImport: string;
  traitePar: string;
  decisions: unknown;
  maintenant?: Date;
}): Promise<IssueDecisions> {
  const { idPatient, idImport, traitePar } = params;
  const maintenant = params.maintenant ?? new Date();
  if (!Array.isArray(params.decisions) || params.decisions.length === 0) return refusGlobal('decisions_vides', 400);
  if (params.decisions.length > DECISIONS_MAX) return refusGlobal('decisions_trop_nombreuses', 400);

  const imp = await prisma.importBiologique.findFirst({
    where: { id: idImport, idPatient },
    select: { statut: true, idCompteRendu: true },
  });
  if (!imp) return refusGlobal('import_introuvable', 404);
  if (imp.statut !== 'extrait') return refusGlobal('import_non_extrait', 409);
  if ((await idExtractionCourante(prisma, imp.idCompteRendu, idPatient)) !== idImport) {
    return refusGlobal('import_remplace', 409);
  }

  const refus: RefusDecision[] = [];
  const refuser = (index: number, idLigne: string | null, reason: string) => {
    refus.push({ index, idLigne, reason, error: MESSAGES_REFUS_DECISION[reason] });
  };

  // PRÉFLIGHT, ÉTAGE 1 — la forme, sans lecture.
  const brutes = (params.decisions as unknown[]).map(b =>
    (b !== null && typeof b === 'object' && !Array.isArray(b) ? b : {}) as DecisionBrute);
  const vus = new Set<string>();
  const ids: string[] = [];
  brutes.forEach((b, index) => {
    const idLigne = typeof b.idLigne === 'string' ? b.idLigne.trim() : '';
    if (idLigne === '') return refuser(index, null, 'ligne_absente');
    if (vus.has(idLigne)) return refuser(index, idLigne, 'ligne_en_double');
    vus.add(idLigne);
    ids.push(idLigne);
  });

  // PRÉFLIGHT, ÉTAGE 2 — les lignes de CETTE extraction, de CE dossier.
  const lignes = ids.length === 0 ? [] : await prisma.ligneBiologiqueCandidate.findMany({
    where: { id: { in: ids }, idImport, idPatient },
    select: { id: true, statut: true, valeurLue: true, uniteLue: true, preleveLeLu: true },
  });
  const ligneParId = new Map(lignes.map(l => [l.id, l]));

  const codes = [...new Set(brutes.flatMap(b => (b.decision === 'valider' && typeof b.analyteCode === 'string'
    ? [b.analyteCode.trim()] : [])))].filter(c => c !== '');
  const analytes = codes.length === 0 ? [] : await prisma.biologyAnalyte.findMany({
    where: { code: { in: codes } },
    select: { code: true, unite: true, actif: true },
  });
  const analyteParCode = new Map(analytes.map(a => [a.code, a]));

  const validations: Array<Validation & { index: number }> = [];
  const ecarts: Ecart[] = [];
  const cles = new Set<string>();

  brutes.forEach((b, index) => {
    const idLigne = typeof b.idLigne === 'string' ? b.idLigne.trim() : '';
    if (idLigne === '' || refus.some(r => r.index === index)) return;
    const ligne = ligneParId.get(idLigne);
    if (!ligne) return refuser(index, idLigne, 'ligne_introuvable');
    if (ligne.statut !== 'proposee') return refuser(index, idLigne, 'ligne_deja_traitee');

    if (b.decision === 'ecarter') {
      if (typeof b.motif !== 'string' || !MOTIFS_ECART.includes(b.motif as MotifEcart)) {
        return refuser(index, idLigne, 'motif_invalide');
      }
      ecarts.push({ idLigne, motif: b.motif as MotifEcart });
      return;
    }
    if (b.decision !== 'valider') return refuser(index, idLigne, 'decision_invalide');

    // La LIGNE LUE doit être une mesure — la valeur tapée n'y change rien.
    if (lireValeurQuantitative(ligne.valeurLue) === null) return refuser(index, idLigne, 'non_quantitative');
    const analyteCode = typeof b.analyteCode === 'string' ? b.analyteCode.trim() : '';
    if (analyteCode === '') return refuser(index, idLigne, 'analyte_absent');
    const verdict = validerSaisieResultat({ valeur: b.valeur, preleveLe: b.preleveLe }, maintenant);
    if (!verdict.ok) return refuser(index, idLigne, verdict.raison);
    // L'HEURE EST EXIGÉE quand elle n'a pas été lue (arbitrage du 2026-10-02,
    // après la PR 2b) : un minuit de Paris renvoyé tel quel serait une heure
    // que personne n'a lue ni saisie. L'écran l'exige déjà ; le serveur le
    // tient pour tout client. Un prélèvement réellement fait à 00:00 pile sur
    // un compte rendu sans heure se saisit à la minute près.
    const heureNonLue = ligne.preleveLeLu === null || estMinuitParis(ligne.preleveLeLu);
    if (heureNonLue && estMinuitParis(verdict.preleveLe)) return refuser(index, idLigne, 'heure_absente');
    const analyte = analyteParCode.get(analyteCode);
    if (!analyte) return refuser(index, idLigne, 'analyte_inconnu');
    if (!analyte.actif) return refuser(index, idLigne, 'analyte_inactif');
    if (!unitesConcordent(ligne.uniteLue, analyte.unite)) return refuser(index, idLigne, 'unite_divergente');
    const cle = `${analyteCode}|${verdict.preleveLe.toISOString()}`;
    if (cles.has(cle)) return refuser(index, idLigne, 'analyte_en_double');
    cles.add(cle);
    validations.push({
      index, idLigne, analyteCode, valeur: verdict.valeur, preleveLe: verdict.preleveLe, unite: analyte.unite,
    });
  });

  // PRÉFLIGHT, ÉTAGE 3 — les doublons au dossier, même clé que l'unicité
  // partielle en base. Le P2002 de la transaction reste le filet d'une course.
  if (validations.length > 0) {
    const existants = await prisma.resultatBiologique.findMany({
      where: {
        idPatient,
        supersedesResultatId: null,
        OR: validations.map(v => ({ analyteCode: v.analyteCode, preleveLe: v.preleveLe })),
      },
      select: { analyteCode: true, preleveLe: true },
    });
    const pris = new Set(existants.map(e => `${e.analyteCode}|${e.preleveLe.toISOString()}`));
    for (const v of validations) {
      if (pris.has(`${v.analyteCode}|${v.preleveLe.toISOString()}`)) refuser(v.index, v.idLigne, 'doublon_mesure');
    }
  }

  if (refus.length > 0) {
    refus.sort((a, b) => a.index - b.index);
    const status = refus.some(r => REFUS_DE_FORME.has(r.reason)) ? 400 : 409;
    return { ok: false, reason: 'lignes_invalides', error: MESSAGES_REFUS_DECISION.lignes_invalides, status, lignes: refus };
  }

  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(imp.idCompteRendu)}))`;
      // Relu SOUS le verrou : une décision concurrente sur les mêmes lignes se
      // dit `ligne_deja_traitee`, pas `doublon_mesure` (revue, P2-9).
      const encore = await tx.ligneBiologiqueCandidate.count({
        where: { id: { in: ids }, idImport, idPatient, statut: 'proposee' },
      });
      if (encore !== validations.length + ecarts.length) throw new LigneDejaTraitee();
      // Relu aussi sous le verrou, que l'extraction prend : une ré-extraction
      // lancée entre le préflight et l'écriture passe devant.
      if ((await idExtractionCourante(tx, imp.idCompteRendu, idPatient)) !== idImport) throw new ImportRemplace();
      for (const v of validations) {
        // Le résultat D'ABORD, la ligne ENSUITE : la ligne désigne le résultat (A5).
        const resultat = await tx.resultatBiologique.create({
          data: {
            idPatient,
            analyteCode: v.analyteCode,
            valeur: v.valeur,
            unite: v.unite,
            preleveLe: v.preleveLe,
            source: 'saisie_praticien',
            saisiPar: traitePar,
            supersedesResultatId: null,
          },
          select: { id: true },
        });
        const { count } = await tx.ligneBiologiqueCandidate.updateMany({
          where: { id: v.idLigne, idImport, idPatient, statut: 'proposee' },
          data: { statut: 'validee', idResultat: resultat.id, traitePar },
        });
        if (count !== 1) throw new LigneDejaTraitee();
      }
      for (const e of ecarts) {
        const { count } = await tx.ligneBiologiqueCandidate.updateMany({
          where: { id: e.idLigne, idImport, idPatient, statut: 'proposee' },
          data: { statut: 'ecartee', motifEcart: e.motif, traitePar },
        });
        if (count !== 1) throw new LigneDejaTraitee();
      }
    }, { timeout: 20_000 });
  } catch (err) {
    if (err instanceof LigneDejaTraitee) return refusGlobal('ligne_deja_traitee', 409);
    if (err instanceof ImportRemplace) return refusGlobal('import_remplace', 409);
    // Sans repli : le résultat existant n'est ni relu ni rattaché.
    if ((err as { code?: string } | null)?.code === 'P2002') return refusGlobal('doublon_mesure', 409);
    console.error('[bio-ingest decisions] écriture refusée :', ...classeEtCode(err));
    return { ok: false, reason: 'server_error', error: 'Erreur technique.', status: 500 };
  }
  return { ok: true, validees: validations.length, ecartees: ecarts.length };
}
