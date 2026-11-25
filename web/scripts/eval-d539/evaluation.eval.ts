import { describe, expect, it, vi } from 'vitest';

// L'ÉVALUATION REJOUÉE DE [[D-539]] §8, selon [[D-545]] §7 — 25 dossiers
// fictifs × 3 passages, sous `synthese-v42` et `synthese-biologie-v2`. Le
// dossier 25 (une demande d'examen déclarée, non faite) s'ajoute aux 24 des
// évaluations précédentes, qui ne changent pas (D-559 §4, réponse
// `20261125-1220-b-h95`, C), repris par D-563 §5 pour `synthese-v42`.
//
// DEUX MODES (`WN_EVAL_APPELS`, posé par `lancer.sh`) :
// - `principal` ([[D-556]] §5 et §6, [[D-557]] §3) : l'appel principal SEUL.
//   Le drapeau `WN_SYNTHESE_BIOLOGIE_ENABLED` reste éteint pendant les
//   générations, comme en service : la route ne lit aucun résultat et le
//   second appel ne part pas. Le bloc de chaque dossier est construit par le
//   banc AVANT les générations (drapeau posé le temps de cette lecture, sans
//   appel au fournisseur), pour vérifier que l'appel principal n'en reçoit
//   rien et pour la lecture de la ligne 10 ;
// - `deux` : les deux appels, drapeau posé, comme au rejeu de #2286.
//
// CE BANC APPELLE VRAIMENT LE FOURNISSEUR. Il n'est dans l'`include` d'aucune
// configuration de CI : il se lance à la main, par
// `scripts/eval-d539/lancer.sh`, qui exige une confirmation explicite.
//
// Conditions du §8 : hors production (rien ne lit ni n'écrit une base : Prisma
// est simulé, en mémoire), dossiers entièrement fictifs ([[D-125]],
// `dossiers.ts`), les vraies consignes (`synthese-v42`,
// `synthese-biologie-v2`), le modèle de production, le vrai lecteur et le vrai
// constructeur du bloc, et le vrai assemblage : la VRAIE route
// `POST /api/praticien/synthese`, comme le banc de chaîne
// (`biologie.generation.test.ts`), dont ce fichier reprend les simulations —
// à deux exceptions près : le client Anthropic est le vrai (espionné, pour
// relever le message réellement envoyé à chaque appel), et le contexte
// clinique est construit par le vrai `buildContexteClinique`.
//
// Ce banc NE COTE PAS : il relève, pour chaque génération, les entrées et les
// sorties, et vérifie mécaniquement les « entrées vérifiées » du §8. La
// cotation contre la grille est une lecture (D-545 §6 : deux lectures, et un
// verdict motivé sur chaque désaccord).

/** `principale` = la consigne de l'appel principal, à la version exigée plus bas. */
type Appel = {
  consigne: 'principale' | 'synthese-biologie-v2' | 'inconnue';
  modele: string;
  messages: unknown;
  sortie: string;
  stopReason: string | null;
  usage: Record<string, number>;
};
type Journal = { niveau: string; event?: string; message?: string };
/** Par génération (AsyncLocalStorage) : sous parallélisme, rien n'est partagé. */
type Contexte = { appels: Appel[]; enregistre: Record<string, unknown> | null; logs: Journal[] };

const etat = vi.hoisted(() => ({
  // Renseigné à l'import du module (plus bas) : la fabrique du mock est hissée.
  courant: null as null | (() => Contexte | undefined),
  dossiers: new Map<string, import('./dossiers').Dossier>(),
}));

const { getServerSession, prisma, annulationsActives } = vi.hoisted(() => {
  const dossierDe = (idPatient: string) => {
    const d = etat.dossiers.get(idPatient);
    if (!d) throw new Error(`dossier fictif inconnu : ${idPatient}`);
    return d;
  };
  return {
    getServerSession: async () => ({ user: { email: 'praticien.eval@fictif.wellneuro.fr' } }),
    prisma: {
      patient: {
        findFirst: async ({ where }: { where: { idPatient: string } }) => {
          const d = dossierDe(where.idPatient);
          return { idPatient: d.idPatient, email: d.email, actif: true, suiviClotureLe: null };
        },
      },
      questionnaireReponse: {
        findMany: async ({ where }: { where: { idPatient: string } }) =>
          dossierDe(where.idPatient).reponses.map(r => ({ ...(r as Record<string, unknown>), idPatient: where.idPatient, statutValidite: null })),
      },
      consultation: {
        findFirst: async ({ where }: { where: { idPatient: string } }) => {
          const d = dossierDe(where.idPatient);
          return d.anamnese === null ? null : { ficheSignaletique: {}, anamnese: d.anamnese };
        },
      },
      resultatBiologique: {
        findMany: async ({ where }: { where: { idPatient: string } }) => dossierDe(where.idPatient).lignes,
      },
      syntheseIA: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const ctx = etat.courant?.();
          if (ctx) ctx.enregistre = data;
          return { idSynthese: data.idSynthese, dateGeneration: new Date() };
        },
      },
      auditSynthese: { create: async () => ({}) },
    },
    annulationsActives: async (_client: unknown, idPatient: string) =>
      new Map(dossierDe(idPatient).annulees.map(id => [id, { fictive: true }] as const)),
  };
});

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/generated/prisma', () => ({ Prisma: { DbNull: Symbol('DbNull') } }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: (s: { user?: { email?: string } } | null) => s?.user?.email?.toLowerCase() ?? null,
  filtrePatientsDuPraticien: (email: string) => ({ praticienEmail: { equals: email, mode: 'insensitive' } }),
}));
vi.mock('@/lib/praticien/journalAcces', () => ({ journaliserAccesDossier: async () => undefined }));
vi.mock('@/lib/anthropic', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/anthropic')>();
  type Corps = import('@anthropic-ai/sdk/resources/messages').MessageCreateParamsNonStreaming;
  const create = async (corps: Corps, options?: { timeout?: number; maxRetries?: number; signal?: AbortSignal }) => {
    // Lu à l'appel, pas à la fabrique : `appelBiologie` importe ce module.
    const { SYSTEM_PROMPT_SYNTHESE_BIOLOGIE } = await import('@/lib/synthese/appelBiologie');
    const systeme = Array.isArray(corps.system) ? corps.system.map(b => b.text).join('') : corps.system ?? '';
    const ctx = etat.courant?.();
    const releve = {
      consigne: (systeme === reel.SYSTEM_PROMPT_SYNTHESE
        ? 'principale'
        : systeme === SYSTEM_PROMPT_SYNTHESE_BIOLOGIE
          ? 'synthese-biologie-v2'
          : 'inconnue') as Appel['consigne'],
      modele: corps.model,
      messages: structuredClone(corps.messages),
    };
    try {
      const reponse = await reel.anthropic.messages.create(corps, options);
      ctx?.appels.push({
        ...releve,
        sortie: reponse.content.map(b => (b.type === 'text' ? b.text : `[${b.type}]`)).join(''),
        stopReason: reponse.stop_reason,
        usage: { ...(reponse.usage as unknown as Record<string, number>) },
      });
      return reponse;
    } catch (e) {
      // Un appel parti puis en échec reste un message envoyé : il se relève.
      ctx?.appels.push({ ...releve, sortie: `[échec : ${e instanceof Error ? e.name : typeof e}]`, stopReason: null, usage: {} });
      throw e;
    }
  };
  return { ...reel, anthropic: { messages: { create } } };
});
vi.mock('@/lib/biology-library/publie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/biology-library/publie')>()),
  annulationsActives,
}));
vi.mock('@/lib/physio-traitements/lecture', () => ({ lireTraitementsEnVigueur: async () => [] }));
vi.mock('@/lib/observability/logger', () => ({
  logger: {
    error: (e: { event?: string; message?: string }) => etat.courant?.()?.logs.push({ niveau: 'error', event: e.event, message: e.message }),
    warn: (e: { event?: string; message?: string }) => etat.courant?.()?.logs.push({ niveau: 'warn', event: e.event, message: e.message }),
    security: () => undefined,
  },
}));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { CLAUDE_MODEL, VERSION_PROMPT_SYNTHESE } from '@/lib/anthropic';
import { VERSION_PROMPT_SYNTHESE_BIOLOGIE } from '@/lib/synthese/appelBiologie';
import { LIBELLES_MOTIFS_BLOC } from '@/lib/clinical/blocBiologieSynthese';
import { lireBlocBiologiePourSynthese } from '@/lib/clinical/blocBiologieSyntheseService';
import { POST } from '@/app/api/praticien/synthese/route';
import { COUVERTURE_LUE_SUR_LE_BLOC, couvertureManquante, DOSSIERS, type Dossier } from './dossiers';

const als = new AsyncLocalStorage<Contexte>();
etat.courant = () => als.getStore();
for (const d of DOSSIERS) etat.dossiers.set(d.idPatient, d);

const PASSAGES = 3;
const MODELE_PRODUCTION = 'claude-sonnet-4-6';
// La consigne principale servie par `main` ; à reporter avec elle à chaque version.
const VERSION_EVALUEE = 'synthese-v42';
type Mode = 'principal' | 'deux';
const MODE: Mode | null = process.env.WN_EVAL_APPELS === 'principal' || process.env.WN_EVAL_APPELS === 'deux'
  ? process.env.WN_EVAL_APPELS
  : null;

/** Les morceaux du bloc qui ne doivent JAMAIS figurer dans le message de l'appel principal. */
function morceauxDuBloc(texteBloc: string): string[] {
  return [
    '## Résultats de biologie',
    'textes_laboratoire_cites',
    'Lecture déterministe du dossier',
    ...texteBloc.split('\n').filter(l => l.startsWith('- Prélevé le ')),
  ];
}

type Generation = {
  dossier: number;
  passage: number;
  statutHttp: number;
  erreur: string | null;
  appels: Appel[];
  /** Mode `deux` : le bloc envoyé au second appel. Mode `principal` : le bloc construit par le banc, envoyé à aucun appel. */
  blocBiologie: string | null;
  appelBiologie: unknown;
  syntheseJson: unknown;
  /** `secondBlocSeul` vaut `null` en mode `principal` : aucun second appel n'est attendu. */
  entrees: { principalSansBloc: boolean; secondBlocSeul: boolean | null; ordre: string[]; ecarts: string[] };
  logs: { niveau: string; event?: string; message?: string }[];
};

async function generer(d: Dossier, passage: number, mode: Mode, blocConstruit: string | null): Promise<Generation> {
  const ctx: Contexte = { appels: [], enregistre: null, logs: [] };
  let statutHttp = 0;
  let erreur: string | null = null;
  await als.run(ctx, async () => {
    try {
      const res = await POST(new Request('http://eval/api/praticien/synthese', {
        method: 'POST',
        body: JSON.stringify({ idPatient: d.idPatient }),
      }));
      statutHttp = res.status;
      if (res.status !== 200) erreur = JSON.stringify(await res.json());
    } catch (e) {
      erreur = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
  });

  const donnees = (ctx.enregistre?.donneesEntree ?? null) as { blocBiologie?: { texte: string } | null; appelBiologie?: unknown } | null;
  const texteBlocEnvoye = donnees?.blocBiologie?.texte ?? null;
  const ecarts: string[] = [];
  if (mode === 'principal' && texteBlocEnvoye !== null) ecarts.push('mode principal : la route a construit un bloc');
  // Mode `principal` : les morceaux cherchés sont ceux du bloc construit par le banc.
  const texteBloc = mode === 'principal' ? blocConstruit : texteBlocEnvoye;
  const principaux = ctx.appels.filter(a => a.consigne === 'principale');
  const seconds = ctx.appels.filter(a => a.consigne === 'synthese-biologie-v2');
  if (ctx.appels.some(a => a.consigne === 'inconnue')) ecarts.push('appel sous une consigne inconnue');
  if (ctx.appels.some(a => a.modele !== MODELE_PRODUCTION)) ecarts.push('modèle autre que celui de production');
  let principalSansBloc = principaux.length > 0;
  if (texteBloc !== null) {
    for (const a of principaux) {
      const envoye = JSON.stringify(a.messages);
      for (const m of morceauxDuBloc(texteBloc)) {
        if (envoye.includes(JSON.stringify(m).slice(1, -1))) {
          principalSansBloc = false;
          ecarts.push(`appel principal : morceau du bloc présent (${m.slice(0, 40)}…)`);
        }
      }
    }
  }
  let secondBlocSeul: boolean | null = texteBloc !== null && seconds.length > 0;
  if (mode === 'principal') {
    secondBlocSeul = null;
    if (seconds.length > 0) ecarts.push(`mode principal : ${seconds.length} second(s) appel(s) parti(s)`);
  }
  for (const a of mode === 'principal' ? [] : seconds) {
    const msgs = a.messages as { role: string; content: unknown }[];
    if (msgs[0]?.role !== 'user' || msgs[0]?.content !== texteBloc) {
      secondBlocSeul = false;
      ecarts.push('second appel : premier message différent du bloc exact');
    }
    // Une relance ajoute un tour assistant et un tour utilisateur de format, rien d'autre.
    if (msgs.length !== 1 && msgs.length !== 3) {
      secondBlocSeul = false;
      ecarts.push(`second appel : ${msgs.length} messages`);
    }
  }
  const ordre = ctx.appels.map(a => a.consigne);
  const premierSecond = ordre.indexOf('synthese-biologie-v2');
  if (premierSecond !== -1 && ordre.slice(premierSecond).includes('principale')) ecarts.push('appel principal après le second');

  return {
    dossier: d.numero,
    passage,
    statutHttp,
    erreur,
    appels: ctx.appels,
    blocBiologie: texteBloc,
    appelBiologie: donnees?.appelBiologie ?? null,
    syntheseJson: ctx.enregistre?.syntheseJson ?? null,
    entrees: { principalSansBloc, secondBlocSeul, ordre, ecarts },
    logs: ctx.logs,
  };
}

/**
 * Ce que D-545 §7 demande de couvrir et qui se lit sur le bloc : construit par
 * le vrai lecteur et le vrai constructeur, sans appel au fournisseur. Rend ce
 * qui manque ; vide = couverture tenue.
 */
async function couvertureManquanteSurLeBloc(): Promise<string[]> {
  const manque: string[] = [];
  for (const c of COUVERTURE_LUE_SUR_LE_BLOC) {
    const declares = DOSSIERS.filter(d => d.couvre.includes(c));
    if (declares.length === 0) manque.push(c);
    for (const d of declares) {
      const trace = await lireBlocBiologiePourSynthese(d.idPatient);
      if (trace === null) {
        manque.push(`${c} : dossier ${d.numero} sans bloc`);
        continue;
      }
      const tenu = c === 'laboratoire_non_identifie'
        // Le motif, tel que le bloc l'écrit dans la ligne des motifs d'une série.
        ? trace.texte.split('\n').some(l => l.includes('Motifs de non-comparabilité :') && l.includes(LIBELLES_MOTIFS_BLOC.laboratoire_non_identifie))
        // Un texte d'intervalle imprimé où ne figure aucune unité d'une valeur du bloc.
        : trace.formes.valeursUnites.length > 0
          && trace.formes.intervalles.some(i => !trace.formes.valeursUnites.some(v => i.includes(v.unite)));
      if (!tenu) manque.push(`${c} : non lu sur le bloc du dossier ${d.numero}`);
    }
  }
  return manque;
}

async function enParallele<T, R>(items: T[], largeur: number, f: (t: T) => Promise<R>): Promise<R[]> {
  const sorties: R[] = new Array(items.length);
  let suivant = 0;
  await Promise.all(Array.from({ length: Math.min(largeur, items.length) }, async () => {
    while (suivant < items.length) {
      const i = suivant++;
      sorties[i] = await f(items[i]);
    }
  }));
  return sorties;
}

describe('D-539 §8, selon D-545 §7 (D-557 §3 en mode principal) — évaluation rejouée (appels réels au fournisseur)', () => {
  it('relève les 75 générations et vérifie les entrées', async () => {
    const sortie = process.env.WN_EVAL_SORTIE;
    expect(process.env.WN_EVAL_D539_CONFIRME, 'lancer par scripts/eval-d539/lancer.sh').toBe('1');
    expect(MODE, 'WN_EVAL_APPELS : principal ou deux').not.toBeNull();
    const mode = MODE!;
    expect(sortie, 'WN_EVAL_SORTIE : dossier de sortie hors dépôt').toBeTruthy();
    expect(path.resolve(sortie!).startsWith(path.resolve(__dirname, '../../..')), 'sortie hors du dépôt').toBe(false);
    expect(process.env.ANTHROPIC_API_KEY, 'clé absente').toBeTruthy();
    expect(CLAUDE_MODEL).toBe(MODELE_PRODUCTION);
    expect(VERSION_PROMPT_SYNTHESE).toBe(VERSION_EVALUEE);
    expect(VERSION_PROMPT_SYNTHESE_BIOLOGIE).toBe('synthese-biologie-v2');
    expect(couvertureManquante()).toEqual([]);

    vi.stubEnv('WN_SYNTHESE_BIOLOGIE_ENABLED', 'true');
    vi.stubEnv('WN_CB_RESULTS_ENABLED', 'true');
    vi.stubEnv('WN_CB_ENABLED', 'true');
    vi.stubEnv('WN_SYNTHESE_STREAM', '');
    // Avant tout appel au fournisseur : la couverture qui se lit sur le bloc.
    expect(await couvertureManquanteSurLeBloc()).toEqual([]);
    // Le bloc de chaque dossier, construit par le vrai lecteur, sans appel au fournisseur.
    const blocs = new Map<number, string | null>();
    for (const d of DOSSIERS) blocs.set(d.numero, (await lireBlocBiologiePourSynthese(d.idPatient))?.texte ?? null);
    // Mode `principal` : drapeau éteint pendant les générations, comme en service.
    if (mode === 'principal') vi.stubEnv('WN_SYNTHESE_BIOLOGIE_ENABLED', '');

    // Sous-ensemble pour un essai de fumée : `WN_EVAL_DOSSIERS=1,2`, `WN_EVAL_PASSAGES=1`.
    const filtre = process.env.WN_EVAL_DOSSIERS?.split(',').map(Number);
    const passages = Number(process.env.WN_EVAL_PASSAGES ?? PASSAGES);
    const travaux = DOSSIERS
      .filter(d => !filtre || filtre.includes(d.numero))
      .flatMap(d => Array.from({ length: passages }, (_, i) => ({ d, passage: i + 1 })));

    const dossierSortie = path.join(sortie!, 'generations');
    fs.mkdirSync(dossierSortie, { recursive: true });
    const generations = await enParallele(travaux, Number(process.env.WN_EVAL_LARGEUR ?? 4), async ({ d, passage }) => {
      const g = await generer(d, passage, mode, blocs.get(d.numero) ?? null);
      const nom = `D${String(d.numero).padStart(2, '0')}-P${passage}.json`;
      fs.writeFileSync(path.join(dossierSortie, nom), JSON.stringify(g, null, 2));
      console.log(`${nom} : HTTP ${g.statutHttp}, ${g.appels.length} appel(s), écarts d'entrée ${g.entrees.ecarts.length}`);
      return g;
    });

    const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
    for (const g of generations) for (const a of g.appels) for (const k of Object.keys(usage) as (keyof typeof usage)[]) usage[k] += a.usage[k] ?? 0;
    const resume = {
      decision: mode === 'principal' ? 'D-563 §5 (appel principal seul, D-556 §5 et §6)' : 'D-539 §8, selon D-545 §7',
      appels: mode,
      commit: process.env.WN_EVAL_COMMIT ?? null,
      modele: CLAUDE_MODEL,
      consignes: mode === 'principal'
        ? { principale: VERSION_PROMPT_SYNTHESE }
        : { principale: VERSION_PROMPT_SYNTHESE, biologie: VERSION_PROMPT_SYNTHESE_BIOLOGIE },
      generations: generations.length,
      http200: generations.filter(g => g.statutHttp === 200).length,
      appelsPrincipaux: generations.reduce((n, g) => n + g.appels.filter(a => a.consigne === 'principale').length, 0),
      appelsBiologie: generations.reduce((n, g) => n + g.appels.filter(a => a.consigne === 'synthese-biologie-v2').length, 0),
      issuesBiologie: generations.map(g => (g.appelBiologie as { issue?: string } | null)?.issue ?? null),
      entreesConformes: generations.filter(g => g.entrees.principalSansBloc && g.entrees.secondBlocSeul !== false && g.entrees.ecarts.length === 0).length,
      usage,
    };
    fs.writeFileSync(path.join(sortie!, 'resume.json'), JSON.stringify(resume, null, 2));
    console.log(JSON.stringify(resume));
    vi.unstubAllEnvs();
  }, 4 * 60 * 60 * 1000);
});
