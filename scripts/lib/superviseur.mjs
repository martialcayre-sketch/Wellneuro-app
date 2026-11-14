// Superviseur rejoué (lot L2 du plan du super-orchestrateur) : le croisement
// d'un EXPORT des registres de coordination (`wn-registres.mjs`) et d'un
// INSTANTANÉ GitHub (`wn-instantane-github.mjs`), à une heure injectée.
// Module pur : ni réseau, ni disque, ni horloge.
//
// Ce que la sortie vaut : un état passé — celui de l'export et de
// l'instantané, à leur heure — confronté aux règles écrites de
// `docs/ROLES_MACHINES.md`. Aucune action due n'autorise un geste : chacune
// porte ce qu'elle a observé (`observe`) et les lectures à refaire sur l'état
// réel avant d'agir (`a_confronter`). Le superviseur n'écrit rien, ne lance
// aucun agent, ne recopie aucun texte libre — ni des registres, ni de GitHub
// (titres et corps de PR, textes de commentaires) : il ne rend que des
// identifiants, des numéros, des états et des horodatages, passés par `court`.

import { analyser, court, instant } from './registres.mjs';

/** Au-delà, l'instantané décrit un état passé : mode dégradé. */
export const INSTANTANE_PERIME_MIN = 30;
/** Un instantané daté de plus loin que cela dans le futur n'est pas cru. */
export const AVANCE_HORLOGE_MS = 5 * 60 * 1000;
export const SCHEMA_INSTANTANE = 1;

/** Associations GitHub d'un auteur de commentaire qui a l'accès en écriture au dépôt. */
export const ASSOCIATIONS_DU_DEPOT = ['OWNER', 'MEMBER', 'COLLABORATOR'];

const SANS_NOUVELLES_MS = 4 * 3600 * 1000;
const vide = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const texte = (v) => (typeof v === 'string' ? v : '');
const iso = (t) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * Le numéro de PR qu'un champ désigne : `#N` d'abord ; un champ qui n'est
 * qu'un nombre (`pr: "2093"`) vaut aussi. Plusieurs renvois `#N` distincts :
 * `null` (ambigu, rien n'est croisé).
 */
export function numeroDePr(v) {
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v;
  const s = texte(v).trim();
  if (/^#?[1-9]\d*$/.test(s)) return Number(s.replace('#', ''));
  const renvois = [...new Set([...s.matchAll(/#([1-9]\d*)\b/g)].map((m) => Number(m[1])))];
  return renvois.length === 1 ? renvois[0] : null;
}

/**
 * L'instantané lu contre son contrat. Rend `{ prs, priseLe, degrade }` :
 * `prs` est une `Map` numéro → PR, vide si l'instantané n'est pas utilisable ;
 * `degrade` liste ce qui empêche de croire tout ou partie du croisement.
 */
export function lireInstantane(inst, maintenant) {
  const degrade = [];
  if (!inst || typeof inst !== 'object' || Array.isArray(inst)) {
    return { prs: new Map(), priseLe: null, degrade: ['instantané absent ou illisible : aucun croisement avec GitHub, les actions dues viennent des seuls registres'] };
  }
  const inutilisable = (motif, priseLe = null) => ({ prs: new Map(), priseLe, utilisable: false, degrade: [motif] });
  if (inst.schema !== SCHEMA_INSTANTANE || !Array.isArray(inst.prs) || !Array.isArray(inst.erreurs)) {
    return inutilisable(`instantané hors contrat (schéma attendu ${SCHEMA_INSTANTANE}, \`prs\` et \`erreurs\` en tableaux) : aucun croisement avec GitHub`);
  }
  const priseLe = instant(inst.pris_le);
  if (priseLe === null) return inutilisable('instantané sans heure de prise lisible : aucun croisement avec GitHub');
  if (priseLe > maintenant + AVANCE_HORLOGE_MS) return inutilisable('instantané daté dans le futur : horloge ou fichier douteux, aucun croisement avec GitHub', priseLe);
  const ageMin = (maintenant - priseLe) / 60000;
  if (ageMin > INSTANTANE_PERIME_MIN) degrade.push(`instantané vieux de ${Math.round(ageMin)} min — il décrit un état passé ; le refaire avant tout geste`);
  if (inst.erreurs.length > 0) degrade.push(`${inst.erreurs.length} lecture(s) GitHub en échec à la prise de l'instantané : les sondes concernées sont tenues pour non établies`);
  if (inst.sondes !== true) degrade.push('instantané pris sans les sondes de merge : aucune PR ne peut être dite examinable');
  const prs = new Map();
  let ecartees = 0;
  for (const p of inst.prs) {
    if (p && Number.isInteger(p.numero) && p.numero > 0 && !prs.has(p.numero)) prs.set(p.numero, p);
    else ecartees += 1;
  }
  if (ecartees > 0) degrade.push(`${ecartees} entrée(s) de PR hors contrat ou en double, écartée(s) : une ligne qui les nomme se lit « hors instantané »`);
  return { prs, priseLe, utilisable: true, degrade };
}

/**
 * La dernière déclaration « prête » d'une PR, par date de création, parmi
 * celles d'un auteur qui a l'accès au dépôt : le dépôt est public, et le
 * commentaire d'un tiers ne déclare rien (il sort en anomalie d'origine).
 */
export function derniereDeclaration(pr) {
  const ds = Array.isArray(pr?.declarations) ? pr.declarations.filter((d) => instant(d?.cree_le) !== null && ASSOCIATIONS_DU_DEPOT.includes(d?.association)) : [];
  return ds.sort((a, b) => instant(b.cree_le) - instant(a.cree_le))[0] ?? null;
}

/** Le check qui fait le CI de la PR, à défaut de la protection de branche (repli de `wn-attendre-ci`). */
export const CHECK_REQUIS = 'verify';

/** Le sha déclaré désigne-t-il la tête ? Un préfixe de sept caractères au moins vaut. */
export const surTete = (sha, tete) => /^[0-9a-f]{7,40}$/.test(texte(sha)) && /^[0-9a-f]{40}$/.test(texte(tete)) && tete.startsWith(sha);

/**
 * Les conditions de merge telles que l'instantané les montre, pour une PR
 * ouverte. Ce n'est pas l'étape 7 bis de `wn-merge` : une lecture passée,
 * qui dit seulement si l'examen vaut d'être fait maintenant.
 */
export function conditionsObservees(pr) {
  const d = derniereDeclaration(pr);
  const ch = pr.checks ?? null;
  const echecs = Array.isArray(ch?.echecs) ? ch.echecs.length : null;
  const enCours = Array.isArray(ch?.en_cours) ? ch.en_cours.length : null;
  let ci = 'checks verts sur la tête';
  if (ch === null || echecs === null || enCours === null) ci = 'checks non lus';
  else if (!(ch.total > 0)) ci = 'aucun check sur la tête';
  else if (echecs > 0) ci = `${echecs} check(s) en échec`;
  else if (enCours > 0) ci = `${enCours} check(s) en cours`;
  else if (ch.requis?.[CHECK_REQUIS] !== 'success') ci = `\`${CHECK_REQUIS}\` ${ch.requis?.[CHECK_REQUIS] ? `à ${court(ch.requis[CHECK_REQUIS], 20)}` : 'absent'} : un CI partiel n'est pas un CI vert`;
  let declaration = 'déclaration sur la tête';
  if (d === null) declaration = 'aucune déclaration « prête » sur la PR';
  else if (!surTete(d.sha, pr.tete)) declaration = 'déclaration sur un sha qui n\'est plus la tête';
  return [
    { id: 'declaration', ok: declaration === 'déclaration sur la tête', motif: declaration },
    { id: 'origine', ok: pr.meme_depot === true, motif: pr.meme_depot === true ? 'tête dans le dépôt' : 'tête hors du dépôt (fork) ou origine illisible' },
    { id: 'base', ok: pr.base === 'main', motif: pr.base === 'main' ? 'base `main`' : 'base autre que `main` (PR empilée) ou illisible' },
    { id: 'brouillon', ok: pr.brouillon === false, motif: pr.brouillon === false ? 'PR prête à la revue' : 'PR en brouillon ou état illisible' },
    { id: 'ci', ok: ci === 'checks verts sur la tête', motif: ci },
    { id: 'revue', ok: pr.revue_pr_agent?.code === 0, motif: pr.revue_pr_agent ? `wn-revue-pr-agent → ${court(pr.revue_pr_agent.code, 4)}` : 'revue PR-Agent non sondée' },
    { id: 'release-db', ok: pr.sonde_release_db?.code === 0, motif: pr.sonde_release_db ? `wn-sonde-release-db → ${court(pr.sonde_release_db.code, 4)}` : 'sonde release-db non jouée' },
  ];
}

const confronterMerge = (n) => [
  `gh pr view ${n} --json state,headRefOid,isDraft`,
  `node scripts/wn-attendre-ci.mjs ${n}`,
  `node scripts/wn-revue-pr-agent.mjs ${n}`,
  `node scripts/wn-sonde-release-db.mjs ${n}`,
  'étape 7 bis de wn-merge (contrôle sur l\'arbre fusionné, chevauchement, main inchangé)',
];
const confronterEtat = (n) => [`gh pr view ${n} --json state,mergedAt,mergeCommit`];
const confronterLigne = (collection, id) => `ArtifactData get ${collection}/${id} — version courante avant toute écriture (if_version)`;

/** Les fichiers de code communs à deux PR ouvertes (les `*.md` sont des documents, à part). */
function chevauchements(pr, ouvertes) {
  const miens = new Set((pr.fichiers ?? []).filter((f) => !texte(f).endsWith('.md')));
  if (miens.size === 0) return [];
  return ouvertes
    .filter((o) => o.numero !== pr.numero && Array.isArray(o.fichiers))
    .map((o) => ({ numero: o.numero, chemins: new Set(o.fichiers.filter((f) => miens.has(f))).size }))
    .filter((x) => x.chemins > 0)
    .sort((a, b) => b.chemins - a.chemins || a.numero - b.numero);
}

/**
 * Le croisement. `lu` : l'export tel que le rend `lireExport` (lignes avec
 * leur `id`, `absentes`). `instantane` : l'objet lu du fichier, ou `null`.
 * Rend `{ analyse, anomalies, actions, degrade, echeance }` — `analyse` est
 * celle de `wn-registres`, dont les actions sont reprises, sauf celles que
 * l'instantané précise.
 */
export function superviser(lu, instantane, maintenant) {
  const analyse = analyser(lu, maintenant);
  // Le croisement porte sur un instantané UTILISABLE, même vide : une ligne
  // `prete` confrontée à un instantané sans sa PR sort « hors instantané ».
  const { prs, priseLe, degrade, utilisable: croise } = lireInstantane(instantane, maintenant);
  const anomalies = [];
  const actions = [];
  const remplacees = new Set();
  const observe = (pr) => ({ pr: pr.numero, etat: court(pr.etat, 10), tete: pr.tete ? court(pr.tete, 40) : null, instantane_le: priseLe === null ? null : iso(priseLe) });
  const id = (v) => court(v, 80);
  const absentes = lu.absentes ?? [];
  const messages = lu.messages ?? [];
  const lots = lu.lots ?? [];
  const questions = lu.questions ?? [];
  const ouvertes = [...prs.values()].filter((p) => p.etat === 'open');

  if (croise) {
    // Une tête hors du dépôt ou une déclaration d'un auteur sans accès en
    // écriture : la preuve d'origine manque, quel que soit le registre.
    for (const pr of ouvertes) {
      if (pr.meme_depot !== true) anomalies.push({ collection: 'github', id: `#${pr.numero}`, regle: 'origine', detail: 'tête hors du dépôt (fork) ou origine illisible — aucune déclaration ne la couvre' });
      for (const d of pr.declarations ?? []) {
        if (!ASSOCIATIONS_DU_DEPOT.includes(d?.association)) anomalies.push({ collection: 'github', id: `#${pr.numero}`, regle: 'origine', detail: `déclaration « prête » d'un auteur sans accès au dépôt (${court(d?.association, 20)})` });
      }
    }

    // Messages `prete` non traités, confrontés à leur PR. Une ligne compte
    // pour `declaration_sans_message` si elle est encore à traiter, ou si elle
    // a été émise après la dernière déclaration : une ligne traitée (renvoi à
    // la file) ne couvre pas une déclaration neuve.
    const prNommees = new Set();
    for (const m of messages) {
      if (m.objet !== 'prete') continue;
      const n = numeroDePr(m.ref);
      if (n !== null) {
        const d = prs.has(n) ? derniereDeclaration(prs.get(n)) : null;
        if (m.etat !== 'traite' || d === null || (instant(m.emis_le) ?? 0) >= instant(d.cree_le)) prNommees.add(n);
      }
      if (m.etat === 'traite') continue;
      const base = { collection: 'messages', id: id(m.id), cible: 'integrateur' };
      if (n === null) {
        anomalies.push({ collection: 'messages', id: id(m.id), regle: 'prete', detail: '`ref` ne nomme pas une PR unique (#N) — la déclaration ne se rattache à rien' });
        continue;
      }
      const pr = prs.get(n);
      if (!pr) {
        actions.push({ ...base, type: 'prete_hors_instantane', pr: n, observe: null, a_confronter: confronterEtat(n), detail: `#${n} absente de l'instantané (ni ouverte, ni parmi les fermées récentes) — à constater sur GitHub` });
      } else if (pr.etat === 'merged') {
        actions.push({ ...base, type: 'merge_fait_manquant', pr: n, observe: observe(pr), a_confronter: [...confronterEtat(n), confronterLigne('messages', id(m.id))], detail: `#${n} mergée${pr.merge_le ? ` le ${court(pr.merge_le, 20)}` : ''}, ligne \`prete\` encore \`${court(m.etat, 10)}\` — passer à \`traite\` et écrire \`merge_fait\` à la boîte déclarante` });
      } else if (pr.etat === 'closed') {
        actions.push({ ...base, type: 'prete_sur_pr_fermee', pr: n, observe: observe(pr), a_confronter: [...confronterEtat(n), confronterLigne('messages', id(m.id))], detail: `#${n} fermée sans merge, ligne \`prete\` encore \`${court(m.etat, 10)}\` — passer à \`traite\`, la file reprend depuis son handoff` });
      } else if (pr.etat !== 'open') {
        anomalies.push({ collection: 'github', id: `#${n}`, regle: 'etat', detail: `état de PR « ${court(pr.etat, 12)} » hors énumération (open, merged, closed) — rien ne se conclut` });
      } else {
        const conditions = conditionsObservees(pr);
        const declaration = derniereDeclaration(pr);
        const emise = instant(m.emis_le);
        if (emise === null || priseLe === null || emise > priseLe) {
          actions.push({ ...base, type: 'prete_en_attente', pr: n, observe: observe(pr), a_confronter: confronterMerge(n), detail: `#${n} : ligne \`prete\` ${emise === null ? 'sans heure d\'émission lisible' : 'émise après la prise de l\'instantané'} — refaire l'instantané avant tout examen` });
        } else if (declaration !== null && !surTete(declaration.sha, pr.tete)) {
          actions.push({ ...base, type: 'prete_perimee', cible: court(m.de), pr: n, observe: observe(pr), a_confronter: [`gh pr view ${n} --json headRefOid`], detail: `la tête de #${n} a avancé après la déclaration — revue et CI à refaire sur la tête, puis nouvelle déclaration` });
        } else if (conditions.every((c) => c.ok)) {
          actions.push({ ...base, type: 'merge_a_examiner', pr: n, observe: observe(pr), a_confronter: confronterMerge(n), detail: `#${n} : déclaration, CI, revue et sonde au vert dans l'instantané — l'examen du merge vaut d'être fait, sur l'état réel` });
        } else {
          const ko = conditions.filter((c) => !c.ok).map((c) => `${c.id} (${c.motif})`);
          actions.push({ ...base, type: 'prete_en_attente', pr: n, observe: observe(pr), a_confronter: confronterMerge(n), detail: `#${n} déclarée, pas examinable selon l'instantané : ${ko.join(' ; ')}` });
        }
        const voisins = chevauchements(pr, ouvertes);
        if (voisins.length > 0) {
          actions.push({ ...base, type: 'chevauchement_signale', pr: n, observe: observe(pr), a_confronter: [`node scripts/wn-chevauchement.mjs ${n}`], detail: `fichiers de code communs avec ${voisins.map((v) => `#${v.numero} (${v.chemins})`).join(', ')} — signal, l'ordre des merges ne change pas` });
        }
      }
    }

    // Une déclaration sur la tête sans ligne `prete` au registre : l'intégrateur
    // qui ne lit que sa boîte ne la voit pas.
    if (!absentes.includes('messages')) {
      for (const pr of ouvertes) {
        const d = derniereDeclaration(pr);
        if (d !== null && surTete(d.sha, pr.tete) && !prNommees.has(pr.numero)) {
          actions.push({ type: 'declaration_sans_message', collection: 'github', id: `#${pr.numero}`, cible: 'integrateur', pr: pr.numero, observe: observe(pr), a_confronter: [`gh pr view ${pr.numero} --json comments`], detail: `#${pr.numero} déclarée « prête » sur la tête, aucune ligne \`prete\` au registre — la file écrit sa ligne` });
        }
      }
    }

    // Le carnet confronté aux PR qu'il nomme.
    for (const l of lots) {
      const n = numeroDePr(l.pr);
      if (n === null) continue;
      const pr = prs.get(n);
      if (!pr) continue;
      const base = { collection: 'lots', id: id(l.id), pr: n, observe: observe(pr) };
      if (pr.etat === 'merged' && l.etat !== 'fait') {
        actions.push({ ...base, type: 'lot_a_passer_fait', cible: 'integrateur', a_confronter: [...confronterEtat(n), confronterLigne('lots', id(l.id))], detail: `#${n} mergée, lot encore \`${court(l.etat, 10)}\` — passer à \`fait\` avec \`fait_le\`` });
      } else if (pr.etat === 'closed' && l.etat === 'pris') {
        actions.push({ ...base, type: 'lot_pr_fermee', cible: court(l.file), a_confronter: [...confronterEtat(n), confronterLigne('lots', id(l.id))], detail: `#${n} fermée sans merge — vider \`pr\` et poser \`tenu_le\` à l'heure du renvoi` });
      } else if (pr.etat === 'open' && l.etat === 'fait') {
        anomalies.push({ collection: 'lots', id: id(l.id), regle: 'carnet', detail: `lot \`fait\` alors que #${n} est encore ouverte` });
      }
    }

    // Les questions dont la PR est inscrite : le merge se constate ici.
    for (const q of questions) {
      if (q.statut !== 'repondue' || !vide(q.merge_le)) continue;
      const n = numeroDePr(q.pr);
      const pr = n === null ? null : prs.get(n);
      if (!pr || pr.etat !== 'merged') continue;
      remplacees.add(`questions/${id(q.id)}`);
      actions.push({ type: 'question_a_clore', collection: 'questions', id: id(q.id), cible: court(q.file), pr: n, observe: observe(pr), a_confronter: [...confronterEtat(n), confronterLigne('questions', id(q.id))], detail: `#${n} mergée${pr.merge_le ? ` le ${court(pr.merge_le, 20)}` : ''} — \`close\`, \`merge_le\` et \`pr\`` });
    }
  }

  // Les actions des registres seuls, sauf celles que l'instantané a précisées.
  const reprises = analyse.actions
    .filter((a) => !(a.type === 'question_merge_a_constater' && remplacees.has(`${a.collection}/${a.id}`)))
    .map((a) => ({ ...a, pr: null, observe: null, a_confronter: [confronterLigne(a.collection, a.id)] }));

  return {
    analyse,
    anomalies: [...analyse.anomalies, ...anomalies],
    actions: [...reprises, ...actions],
    degrade,
    echeance: prochaineEcheance({ lots, questions }, { priseLe, maintenant }),
  };
}

/**
 * La prochaine échéance à venir : un lot `pris` sans `pr` qui passera « sans
 * nouvelles », une date utile de question qui sera dépassée, ou l'instantané
 * qui deviendra périmé. `null` si rien n'arrive.
 */
export function prochaineEcheance({ lots = [], questions = [] }, { priseLe = null, maintenant }) {
  const candidats = [];
  for (const l of lots) {
    const t = instant(l.tenu_le);
    if (l.etat === 'pris' && vide(l.pr) && t !== null) candidats.push({ quand: t + SANS_NOUVELLES_MS, objet: 'lot_sans_nouvelles', ref: `lots/${court(l.id, 80)}` });
  }
  for (const q of questions) {
    const t = instant(q.date_utile);
    if ((q.statut === 'ouverte' || q.statut === 'en_seance') && t !== null) candidats.push({ quand: t + 24 * 3600 * 1000, objet: 'date_utile_depassee', ref: `questions/${court(q.id, 80)}` });
  }
  if (priseLe !== null) candidats.push({ quand: priseLe + INSTANTANE_PERIME_MIN * 60000, objet: 'instantane_perime', ref: 'instantané' });
  const avenir = candidats.filter((c) => c.quand > maintenant).sort((a, b) => a.quand - b.quand || a.ref.localeCompare(b.ref));
  return avenir.length === 0 ? null : { ...avenir[0], quand: iso(avenir[0].quand) };
}
