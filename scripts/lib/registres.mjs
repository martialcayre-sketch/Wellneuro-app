// Contrôle déterministe des trois registres de coordination — liste commune
// de questions, registre des messages (`D-503`), carnet de lots (`D-510`).
//
// FONCTIONS PURES : des lignes en entrée, des constats en sortie. Aucune
// lecture, aucune écriture, aucun réseau, aucune horloge implicite
// (`maintenant` est toujours passé). La source des règles est
// `docs/ROLES_MACHINES.md` (« La liste commune de questions et le guichet »,
// « Le registre des messages entre agents », « Le carnet de lots ») : chaque
// énumération, chaque délai ci-dessous en est la transcription, et rien n'y
// est ajouté. Ce qui n'est pas une règle écrite sort en `avis`, jamais en
// `anomalie`.
//
// Ce que ce module NE fait PAS, et qui ne lui revient pas :
//   - il n'authentifie rien : une ligne reste un texte déclaratif écrit par
//     une session, qui se recoupe avec sa source (commentaire de PR, décision
//     mergée, réponse du responsable dans la session qui agit) ;
//   - il n'autorise rien : une « action due » est un rappel de la règle
//     écrite, pas une instruction ni une levée de porte ;
//   - il ne recopie jamais un texte libre (`texte`, `question`, `faits`,
//     `reponse`, `motif`…) : il nomme la ligne et le champ, le contenu reste
//     où il vit.

export const BOITES_FILES = ['A', 'A bis', 'B', 'C', 'D'];
export const BOITES_FIXES = [...BOITES_FILES, 'guichet', 'integrateur'];
export const OBJETS_MESSAGE = ['prete', 'merge_fait', 'reponse_arrivee', 'chevauchement', 'porte_levee', 'autre'];
export const ETATS_MESSAGE = ['emis', 'lu', 'traite'];
export const ETATS_LOT = ['pret', 'pris', 'bloque', 'fait'];
export const NATURES_QUESTION = ['ordinaire', 'clinique', 'migration'];
export const STATUTS_QUESTION = ['ouverte', 'en_seance', 'repondue', 'close'];

/** Un lot `pris` sans `pr` est sans nouvelles au-delà (`D-510`, « Sans nouvelles »). */
export const SANS_NOUVELLES_MS = 4 * 3600 * 1000;
/** Délai après la sonnerie avant la reprise du lot (même paragraphe). */
export const REPRISE_MS = 3600 * 1000;
/** `reponse_par` d'une question avancée sur accord de Codex (`D-505` §6). */
export const ACCORD_CODEX = 'accord session et Codex (D-505)';

const CHAMPS_REPONSE_LE = ['reponse_le', 'repondu_le', 'date_reponse'];

const RE_ID_DATE = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const RE_ID_LOT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RE_REF_PR = /#\d+/;

// Indices de contenu interdit (« Ce qui n'y entre jamais »). Heuristiques :
// elles sortent en `avis`, et ne citent jamais la valeur trouvée.
const INDICES_INTERDITS = [
  ['adresse e-mail', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/],
  ['jeton ou clé', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})/],
  ['identifiant technique (cuid ou uuid)', /\b(?:c(?=[a-z0-9]*\d)[a-z0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/],
];

const vide = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const texte = (v) => (typeof v === 'string' ? v : '');

/** Un nom de boîte ou de file ramené à la forme d'un identifiant : minuscules ASCII et tirets. */
export function normaliserBoite(nom) {
  return texte(nom)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Une valeur courte rendue sans caractère de contrôle, tronquée : jamais un texte libre entier. */
export function court(v, n = 40) {
  const s = String(v ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ');
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

// L'identifiant d'une ligne est le nom de son fichier d'export : un texte que
// ce script ne contrôle pas. Il est assaini à l'entrée, une fois, pour que
// tout ce qui le recopie ensuite (constats, détails, boîte) sorte sans
// caractère de contrôle et borné. Un identifiant altéré reste hors format.
const assainirIds = (lignes) => lignes.map((l) => ({ ...l, id: court(l.id, 80) }));

/** Millisecondes d'un horodatage ISO, ou `null` s'il est vide ou illisible. */
export function instant(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v.trim())) return null;
  const t = Date.parse(v.trim());
  return Number.isNaN(t) ? null : t;
}

function idDate(id) {
  const m = RE_ID_DATE.exec(id);
  if (!m) return null;
  const [, a, mo, j, h, mi, suffixe] = m;
  if (+h > 23 || +mi > 59) return null;
  // Une date qui existe : le 31 novembre ou le 30 février ne passent pas.
  const d = new Date(Date.UTC(+a, +mo - 1, +j));
  if (d.getUTCFullYear() !== +a || d.getUTCMonth() !== +mo - 1 || d.getUTCDate() !== +j) return null;
  return { jour: `${a}-${mo}-${j}`, suffixe };
}

function chaines(v, chemin, sortie = []) {
  if (typeof v === 'string') sortie.push([chemin, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => chaines(x, `${chemin}[${i}]`, sortie));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) chaines(x, chemin ? `${chemin}.${k}` : k, sortie);
  return sortie;
}

function relever(collection) {
  const constats = [];
  const poser = (gravite) => (id, regle, detail) => constats.push({ collection, id, gravite, regle, detail });
  return { constats, anomalie: poser('anomalie'), avis: poser('avis') };
}

function controlerContenu(ligne, r) {
  for (const [chemin, valeur] of chaines(ligne, '')) {
    if (chemin === 'id') continue;
    for (const [nature, motif] of INDICES_INTERDITS) {
      if (motif.test(valeur)) r.avis(ligne.id, 'contenu', `le champ \`${chemin}\` semble porter : ${nature} — à relire, un registre n'héberge ni donnée patient ni secret`);
    }
  }
}

function controlerHorodatages(ligne, champs, r) {
  for (const c of champs) {
    if (!vide(ligne[c]) && instant(ligne[c]) === null) r.anomalie(ligne.id, 'horodatage', `\`${c}\` n'est pas un horodatage lisible`);
  }
}

/** Les lignes du registre des messages contre la règle écrite (`D-503`). */
export function controlerMessages(messages) {
  const r = relever('messages');
  for (const m of messages) {
    const id = idDate(m.id);
    if (!id) r.anomalie(m.id, 'identifiant', 'attendu `AAAAMMJJ-HHMM-<boîte émettrice>` en minuscules ASCII');
    else {
      // Le suffixe abrège souvent le nom de la boîte (`pra3b` pour « PRA-3b ») :
      // seul un suffixe qui n'en est pas le début est relevé.
      const de = normaliserBoite(m.de).replaceAll('-', '');
      const suffixe = id.suffixe.replace(/-\d+$/, '').replaceAll('-', '');
      if (de && !de.startsWith(suffixe) && !de.startsWith(id.suffixe.replaceAll('-', ''))) {
        r.avis(m.id, 'identifiant', `le suffixe ne reprend pas la boîte émettrice \`de\` (« ${court(m.de)} »)`);
      }
    }
    for (const c of ['de', 'auteur', 'a', 'objet', 'etat', 'emis_le']) if (vide(m[c])) r.anomalie(m.id, 'champ', `\`${c}\` manque`);
    if (vide(m.texte)) r.avis(m.id, 'champ', '`texte` est vide');
    if (!vide(m.objet) && !OBJETS_MESSAGE.includes(m.objet)) r.anomalie(m.id, 'objet', `« ${court(m.objet)} » n'est pas un objet (${OBJETS_MESSAGE.join(', ')})`);
    if (!vide(m.etat) && !ETATS_MESSAGE.includes(m.etat)) r.anomalie(m.id, 'etat', `« ${court(m.etat)} » n'est pas un état (${ETATS_MESSAGE.join(', ')})`);
    if (m.relances !== undefined && !(Number.isInteger(m.relances) && m.relances >= 0)) r.anomalie(m.id, 'relances', '`relances` doit être un entier positif ou nul');
    controlerHorodatages(m, ['emis_le', 'lu_le', 'traite_le', 'relance_le'], r);
    if (m.etat === 'lu' && vide(m.lu_le)) r.anomalie(m.id, 'accuse', 'ligne `lu` sans `lu_le`');
    if (m.etat === 'traite' && vide(m.traite_le)) r.anomalie(m.id, 'accuse', 'ligne `traite` sans `traite_le`');
    if (m.etat === 'emis' && (!vide(m.lu_le) || !vide(m.traite_le))) r.anomalie(m.id, 'accuse', 'ligne `emis` qui porte déjà `lu_le` ou `traite_le`');
    if (Number.isInteger(m.relances) && m.relances > 0 && vide(m.relance_le)) r.anomalie(m.id, 'relances', '`relances` > 0 sans `relance_le`');
    if (m.objet === 'prete') {
      if (normaliserBoite(m.a) !== 'integrateur') r.anomalie(m.id, 'prete', 'une ligne `prete` s\'écrit à la boîte `integrateur`');
      if (!RE_REF_PR.test(texte(m.ref))) r.anomalie(m.id, 'prete', '`ref` doit nommer la PR (`#N`)');
    }
    if (m.objet === 'merge_fait' && !RE_REF_PR.test(texte(m.ref))) r.anomalie(m.id, 'merge_fait', '`ref` doit nommer la PR (`#N`)');
    if (m.objet === 'reponse_arrivee' && !idDate(texte(m.ref).trim())) r.avis(m.id, 'reponse_arrivee', '`ref` devrait être l\'identifiant de la question');
    controlerContenu(m, r);
  }
  return r.constats;
}

/** Les lignes du carnet de lots contre la règle écrite (`D-510`). */
export function controlerLots(lots, questions = null) {
  const r = relever('lots');
  const parId = new Map(lots.map((l) => [l.id, l]));
  const idsQuestions = questions ? new Set(questions.map((q) => q.id)) : null;
  const tenus = new Map();
  for (const l of lots) {
    if (!RE_ID_LOT.test(l.id)) r.anomalie(l.id, 'identifiant', 'attendu `<fiche>-<n>` en minuscules ASCII et tirets');
    if (!BOITES_FILES.includes(l.file)) r.anomalie(l.id, 'file', `« ${court(l.file)} » n'est pas une file (${BOITES_FILES.join(', ')})`);
    if (!ETATS_LOT.includes(l.etat)) r.anomalie(l.id, 'etat', `« ${court(l.etat)} » n'est pas un état (${ETATS_LOT.join(', ')})`);
    for (const c of ['titre', 'fiche', 'inscrit_par', 'inscrit_le']) if (vide(l[c])) r.anomalie(l.id, 'champ', `\`${c}\` manque`);
    if (!Number.isInteger(l.ordre)) r.anomalie(l.id, 'ordre', '`ordre` doit être un entier');
    if (l.reprises !== undefined && !(Number.isInteger(l.reprises) && l.reprises >= 0)) r.anomalie(l.id, 'reprises', '`reprises` doit être un entier positif ou nul');
    if (l.questions !== undefined && !Array.isArray(l.questions)) r.anomalie(l.id, 'questions', '`questions` doit être une liste d\'identifiants');
    controlerHorodatages(l, ['pris_le', 'tenu_le', 'fait_le', 'inscrit_le'], r);
    if (!vide(l.apres)) {
      if (l.apres === l.id) r.anomalie(l.id, 'apres', 'un lot ne peut pas être son propre préalable');
      else if (!parId.has(l.apres)) r.anomalie(l.id, 'apres', `le lot préalable « ${court(l.apres)} » n'est pas au carnet`);
    }
    if (l.etat === 'bloque' && vide(l.motif)) r.anomalie(l.id, 'bloque', 'lot `bloque` sans `motif`');
    if (l.etat === 'pris') {
      for (const c of ['pris_par', 'pris_le', 'tenu_le', 'branche']) if (vide(l[c])) r.anomalie(l.id, 'pris', `lot \`pris\` sans \`${c}\``);
      // La même session s'écrit parfois avec une autre casse ou une espace de trop.
      const session = texte(l.pris_par).trim().replace(/\s+/g, ' ').toLowerCase();
      if (vide(l.pr) && session) tenus.set(session, { nom: l.pris_par, ids: [...(tenus.get(session)?.ids ?? []), l.id] });
    }
    if (l.etat === 'fait' && vide(l.fait_le)) r.anomalie(l.id, 'fait', 'lot `fait` sans `fait_le`');
    if (idsQuestions && Array.isArray(l.questions)) {
      for (const q of l.questions) if (!idsQuestions.has(q)) r.avis(l.id, 'questions', `la question « ${court(q)} » n'est pas dans la liste commune exportée`);
    }
    controlerContenu(l, r);
  }
  for (const { nom, ids } of tenus.values()) {
    if (ids.length > 1) r.anomalie(ids[0], 'un_lot_par_session', `« ${court(nom, 60)} » tient ${ids.length} lots sans PR déclarée (${ids.join(', ')}) — une session en tient au plus un`);
  }
  return r.constats;
}

/** Les lignes de la liste commune contre la règle écrite (H89, `D-466`, `D-505`). */
export function controlerQuestions(questions) {
  const r = relever('questions');
  for (const q of questions) {
    if (!idDate(q.id)) r.anomalie(q.id, 'identifiant', 'attendu `AAAAMMJJ-HHMM-<file>`');
    for (const c of ['file', 'lot', 'question', 'arrivee']) if (vide(q[c])) r.anomalie(q.id, 'champ', `\`${c}\` manque`);
    if (!NATURES_QUESTION.includes(q.nature)) r.anomalie(q.id, 'nature', `« ${court(q.nature)} » n'est pas une nature (${NATURES_QUESTION.join(', ')}) — dans le doute, \`clinique\``);
    if (!STATUTS_QUESTION.includes(q.statut)) r.anomalie(q.id, 'statut', `« ${court(q.statut)} » n'est pas un statut (${STATUTS_QUESTION.join(', ')})`);
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) r.anomalie(q.id, 'options', 'une question porte deux à quatre options');
    else if (q.options.some((o) => !o || vide(o.lib) || vide(o.consequence))) r.anomalie(q.id, 'options', 'chaque option est suivie de sa conséquence');
    if (vide(q.date_utile)) r.avis(q.id, 'date_utile', '`date_utile` manque');
    if (!vide(q.arrivee) && instant(q.arrivee) === null) r.avis(q.id, 'horodatage', '`arrivee` n\'est pas un horodatage lisible');
    const repondue = q.statut === 'repondue' || q.statut === 'close';
    if (repondue && vide(q.reponse)) r.anomalie(q.id, 'reponse', `ligne \`${q.statut}\` sans \`reponse\``);
    if (repondue && CHAMPS_REPONSE_LE.every((c) => vide(q[c]))) r.anomalie(q.id, 'horodatage', `ligne \`${q.statut}\` sans horodatage de réponse`);
    for (const c of CHAMPS_REPONSE_LE.slice(1)) if (!vide(q[c])) r.avis(q.id, 'horodatage', `l'horodatage de réponse est écrit dans \`${c}\`, pas dans \`reponse_le\``);
    if (texte(q.reponse_par).includes('D-505') && NATURES_QUESTION.includes(q.nature) && q.nature !== 'ordinaire') {
      r.anomalie(q.id, 'autorite', `question \`${q.nature}\` répondue sur accord de Codex — \`D-505\` §6 ne porte que sur l'ordinaire`);
    }
    if (repondue && q.nature !== 'ordinaire' && vide(q.decision) && !/responsable/i.test(texte(q.reponse_par))) {
      r.avis(q.id, 'autorite', `réponse \`${court(q.nature)}\` dont \`reponse_par\` ne nomme ni le responsable ni une décision — son autorité se recoupe avant tout geste`);
    }
    controlerContenu(q, r);
  }
  return r.constats;
}

const heures = (ms) => Math.round((ms / 3600000) * 10) / 10;

/**
 * Ce que les règles écrites appellent, à l'instant `maintenant` (ms). Chaque
 * action cite la règle qui la fonde ; aucune n'est une autorisation.
 */
export function actionsDues({ messages = [], lots = [], questions = [], absentes = [] }, maintenant) {
  const actions = [];
  const sansMessages = absentes.includes('messages');
  const questionParId = new Map(questions.map((q) => [q.id, q]));

  // « Relance » : à chaque tour, l'intégrateur relit les lignes encore `emis`.
  for (const m of messages) {
    if (m.etat !== 'emis') continue;
    const t = instant(m.emis_le);
    actions.push({
      type: 'message_a_relancer',
      collection: 'messages',
      id: m.id,
      cible: court(m.a),
      age_h: t === null ? null : heures(maintenant - t),
      detail: `ligne \`emis\` (${court(m.objet, 20)}), ${Number.isInteger(m.relances) ? m.relances : 0} relance(s) — sonner la boîte si une session y est joignable`,
    });
  }

  for (const l of lots) {
    // « Sans nouvelles » : `pris` sans `pr`, `tenu_le` de plus de quatre heures.
    if (l.etat === 'pris' && vide(l.pr)) {
      const t = instant(l.tenu_le);
      if (t !== null && maintenant - t > SANS_NOUVELLES_MS && sansMessages) {
        // Sans le registre des messages, rien ne dit si le lot a déjà été sonné.
        actions.push({ type: 'lot_silence_a_verifier', collection: 'lots', id: l.id, cible: court(l.file), age_h: heures(maintenant - t), detail: '`pris` sans `pr`, tenu il y a plus de quatre heures — le registre des messages manque à l\'export : refaire l\'export avant de sonner ou de reprendre' });
      } else if (t !== null && maintenant - t > SANS_NOUVELLES_MS) {
        // La sonnerie nomme le lot : un identifiant entier de `ref`, pas un
        // fragment (`bio-1` n'est pas sonné par une ligne qui nomme `bio-12`).
        const sonnerie = messages
          .filter((m) => m.objet === 'autre' && normaliserBoite(m.a) === normaliserBoite(l.file) && texte(m.ref).split(/[^a-z0-9-]+/).includes(l.id) && (instant(m.emis_le) ?? 0) > t)
          .sort((x, y) => (instant(y.emis_le) ?? 0) - (instant(x.emis_le) ?? 0))[0];
        // Une sonnerie lue vaut nouvelles à l'heure de sa lecture ; si `tenu_le`
        // n'a pas bougé quatre heures après, le lot est de nouveau sans nouvelles.
        const lue = sonnerie && sonnerie.etat !== 'emis' ? (instant(sonnerie.lu_le) ?? instant(sonnerie.traite_le)) : null;
        if (sonnerie && sonnerie.etat !== 'emis') {
          if (lue !== null && maintenant - lue > SANS_NOUVELLES_MS) {
            actions.push({ type: 'lot_sans_nouvelles', collection: 'lots', id: l.id, cible: court(l.file), age_h: heures(maintenant - t), detail: `sonnerie ${sonnerie.id} lue il y a plus de quatre heures, \`tenu_le\` inchangé — une session de la file sonne de nouveau` });
          }
        } else if (!sonnerie) {
          actions.push({ type: 'lot_sans_nouvelles', collection: 'lots', id: l.id, cible: court(l.file), age_h: heures(maintenant - t), detail: `\`pris\` sans \`pr\`, tenu il y a plus de quatre heures — une session de la file sonne : ligne \`autre\` à la boîte, \`ref\` = le lot` });
        } else if (maintenant - instant(sonnerie.emis_le) > REPRISE_MS) {
          actions.push({ type: 'lot_reprise_possible', collection: 'lots', id: l.id, cible: court(l.file), age_h: heures(maintenant - t), detail: `sonné par la ligne ${sonnerie.id}, non lue depuis plus d'une heure — reprise par \`update\` avec \`if_version\`, \`reprises\` + 1, branche neuve` });
        }
      }
    }
    // « Prendre » : relire les lignes `bloque` dont le motif est peut-être levé.
    if (l.etat === 'bloque' && Array.isArray(l.questions) && l.questions.length > 0) {
      const lues = l.questions.map((id) => questionParId.get(id));
      if (lues.every((q) => q && (q.statut === 'repondue' || q.statut === 'close'))) {
        const reservee = lues.some((q) => q.nature !== 'ordinaire');
        actions.push({ type: 'lot_bloque_a_relire', collection: 'lots', id: l.id, cible: court(l.file), age_h: null, detail: `ses ${lues.length} question(s) ont une réponse — relire la source de chaque réponse et son autorité${reservee ? ' (clinique ou migration : responsable dans la session qui agit, ou décision mergée)' : ''} avant de repasser à \`pret\`` });
      }
    }
  }

  for (const q of questions) {
    if (q.statut === 'ouverte' || q.statut === 'en_seance') {
      const t = instant(q.arrivee);
      const echeance = instant(q.date_utile);
      const depassee = echeance !== null && maintenant > echeance + 24 * 3600 * 1000;
      const reservee = q.nature !== 'ordinaire';
      actions.push({
        type: 'question_ouverte',
        collection: 'questions',
        id: q.id,
        cible: reservee ? 'responsable' : 'guichet',
        age_h: t === null ? null : heures(maintenant - t),
        detail: `\`${court(q.statut, 12)}\`, nature \`${court(q.nature, 12)}\`${reservee ? ' — réponse réservée au responsable' : ''}${depassee ? ' — date utile dépassée' : ''}`,
      });
    }
    if (q.statut === 'repondue') {
      if (!vide(q.merge_le)) {
        actions.push({ type: 'question_a_clore', collection: 'questions', id: q.id, cible: court(q.file), age_h: null, detail: 'merge horodaté, ligne encore `repondue` — elle passe à `close`' });
      } else if (texte(q.reponse_par).includes('D-505')) {
        actions.push({ type: 'question_a_presenter', collection: 'questions', id: q.id, cible: 'guichet', age_h: null, detail: 'avancée sur accord de Codex — reste `repondue` jusqu\'à la séance, où le responsable peut la renverser' });
      } else if (vide(q.decision) && vide(q.pr)) {
        actions.push({ type: 'question_sans_suite', collection: 'questions', id: q.id, cible: court(q.file), age_h: null, detail: 'répondue sans décision ni PR inscrite — `close` si la réponse n\'en appelle aucune, sinon inscrire la suite' });
      } else {
        actions.push({ type: 'question_merge_a_constater', collection: 'questions', id: q.id, cible: court(q.file), age_h: null, detail: 'décision ou PR inscrite, merge non horodaté — à constater sur GitHub, hors de portée de ce contrôle' });
      }
    }
  }
  return actions;
}

/** Le lot suivant de chaque file : sa ligne `pret` au plus petit `ordre`, dont le lot `apres` est `fait`. */
export function lotsSuivants(lots) {
  const parId = new Map(lots.map((l) => [l.id, l]));
  const suivants = {};
  for (const file of BOITES_FILES) {
    const prets = lots
      .filter((l) => l.file === file && l.etat === 'pret' && Number.isInteger(l.ordre) && (vide(l.apres) || parId.get(l.apres)?.etat === 'fait'))
      .sort((x, y) => x.ordre - y.ordre || x.id.localeCompare(y.id));
    suivants[file] = prets[0]?.id ?? null;
  }
  return suivants;
}

// `ref` et `de` sont des champs libres : la boîte n'en rend que des formes
// reconnues. De `ref`, les seuls renvois `#N` et identifiants datés ; de `de`,
// le nom ramené à la forme d'une boîte, masqué s'il porte un indice interdit.
const RE_RENVOIS = /#\d+|\b\d{8}-\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\b/g;
const porteIndice = (v) => INDICES_INTERDITS.some(([, motif]) => motif.test(texte(v)));
function refAffichee(ref) {
  if (vide(ref)) return '';
  const renvois = texte(ref).match(RE_RENVOIS);
  return renvois ? court(renvois.join(' ')) : '(hors forme)';
}
const deAffiche = (de) => (porteIndice(de) ? '(masqué)' : court(normaliserBoite(de)));

/** La boîte d'une session : ses lignes non `traite`, les plus anciennes d'abord. */
export function boite(messages, nom) {
  const cle = normaliserBoite(nom);
  return assainirIds(messages)
    .filter((m) => normaliserBoite(m.a) === cle && m.etat !== 'traite')
    .sort((x, y) => (instant(x.emis_le) ?? 0) - (instant(y.emis_le) ?? 0) || x.id.localeCompare(y.id))
    .map((m) => ({ id: m.id, de: deAffiche(m.de), objet: court(m.objet, 20), ref: refAffichee(m.ref), etat: court(m.etat, 10) }));
}

// Le total et la répartition vivent à part : une valeur d'état « total », vide
// ou `__proto__` (les lignes sont des textes libres) ne peut rien écraser.
function compter(lignes, champ) {
  const par = new Map();
  for (const l of lignes) {
    const cle = vide(l[champ]) ? '(vide)' : court(l[champ], 20);
    par.set(cle, (par.get(cle) ?? 0) + 1);
  }
  return { total: lignes.length, par: Object.fromEntries(par) };
}

/** L'analyse entière d'un export : constats de règle, actions dues, lots suivants, comptes. */
export function analyser({ messages: m = [], lots: l = [], questions: q = [], absentes = [] }, maintenant) {
  const [messages, lots, questions] = [m, l, q].map(assainirIds);
  const constats = [...controlerMessages(messages), ...controlerLots(lots, questions.length > 0 ? questions : null), ...controlerQuestions(questions)];
  return {
    comptes: {
      messages: compter(messages, 'etat'),
      lots: compter(lots, 'etat'),
      questions: compter(questions, 'statut'),
    },
    anomalies: constats.filter((c) => c.gravite === 'anomalie'),
    avis: constats.filter((c) => c.gravite === 'avis'),
    actions: actionsDues({ messages, lots, questions, absentes }, maintenant),
    suivants: lotsSuivants(lots),
  };
}
