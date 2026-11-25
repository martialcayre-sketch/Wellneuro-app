#!/usr/bin/env node
// Prépare la COTATION de l'évaluation de D-539 §8 rejouée selon D-545 §7 (ou, en mode `principal`,
// de l'appel principal seul selon D-557 §3), à partir des générations
// relevées par `evaluation.eval.ts`. Ne cote pas : il met en forme ce qui se
// lit contre la grille, et relève des INDICES mécaniques qui orientent la
// lecture sans la remplacer (un indice n'est pas une violation, son absence
// n'est pas une conformité).
//
//   node scripts/eval-d539/extraire.mjs <dossier-de-sortie>
//
// Le mode se lit dans `resume.json` (`appels`) ; absent, c'est `deux`.
//
// Écrit, dans le dossier de sortie (hors dépôt) :
//   lecture-biologie.md   — mode `deux` seul : par génération, le bloc envoyé, la restitution du second appel ;
//   lecture-principale.md — par génération : la sortie de l'appel principal, champ par champ,
//                           et le narratif assemblé, phrase du §5 séparée ;
//   indices.json          — indices mécaniques et contrôle de la phrase du §5 ;
//   paquets/              — les mêmes lectures, découpées pour la lecture indépendante.

import fs from 'node:fs';
import path from 'node:path';

const sortie = process.argv[2];
if (!sortie) {
  console.error('usage : node scripts/eval-d539/extraire.mjs <dossier-de-sortie>');
  process.exit(1);
}
const dossierGen = path.join(sortie, 'generations');
const fichiers = fs.readdirSync(dossierGen).filter(f => /^D\d\d-P\d\.json$/.test(f)).sort();
const generations = fichiers.map(f => ({ nom: f.replace('.json', ''), ...JSON.parse(fs.readFileSync(path.join(dossierGen, f), 'utf8')) }));
const fichierResume = path.join(sortie, 'resume.json');
const resumeBanc = fs.existsSync(fichierResume) ? JSON.parse(fs.readFileSync(fichierResume, 'utf8')) : {};
const MODE = resumeBanc.appels === 'principal' ? 'principal' : 'deux';
const VERSION_PRINCIPALE = resumeBanc.consignes?.principale ?? '(version inconnue)';

const PHRASE = /^Votre praticien a reçu votre bilan biologique du (1er|\d{1,2}) [a-zéû]+ \d{4}\.$/;
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Termes qui signalent qu'un passage parle de biologie : la lecture les regarde.
const BIOLOGIE = /biolog|bilan (sanguin|martial|thyro|lipid|sanguin)|prise de sang|dosage|dosé|analyse|résultat|laboratoire|prélèvement|intervalle|ferritin|vitamine|B12|TSH|thyro|cortisol|magnésium|homocyst|folate|zinc|CRP|glyc|HbA1c|hémoglobine|oméga|LDL|cholest|triglyc|lipoprot|DHEA|IgA|transglutaminase|fer sérique|µg|ng\/mL|nmol|pmol|mmol|mUI|g\/L|mg\/L/i;

function lireJson(texte) {
  const m = texte.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function phrases(texte) {
  return String(texte).split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
}

/** Termes propres au dossier : libellés d'analyte, laboratoires, dates de prélèvement, valeurs avec unité. */
function termesDuBloc(bloc) {
  if (!bloc) return [];
  const termes = new Set();
  for (const l of bloc.split('\n')) {
    const entete = l.match(/^(.+?) — \d+ prélèvement/);
    if (entete) termes.add(entete[1]);
    const point = l.match(/^- Prélevé le (\d{4})-(\d{2})-(\d{2})[^:]*: ([^.(]+?)(?: \(unité non renseignée\))?\./);
    if (point) {
      termes.add(`${point[1]}-${point[2]}-${point[3]}`);
      termes.add(`${Number(point[3]) === 1 ? '1er' : Number(point[3])} ${MOIS[Number(point[2]) - 1]}`);
      termes.add(point[4].trim());
    }
    for (const m of l.matchAll(/Laboratoire : <textes_laboratoire_cites>("(?:[^"\\]|\\.)*")<\/textes_laboratoire_cites>/g)) {
      try { termes.add(JSON.parse(m[1]).split('\n')[0]); } catch { /* texte illisible : ignoré */ }
    }
  }
  return [...termes].filter(t => t.length >= 3);
}

function champsPrincipaux(s) {
  if (!s) return [];
  const champs = [];
  champs.push(['resume_praticien', s.resume_praticien]);
  (s.axes_prioritaires ?? []).forEach((a, i) => {
    champs.push([`axes_prioritaires[${i}].axe`, `${a.axe} (priorité : ${a.niveau_priorite})`]);
    (a.arguments ?? []).forEach((x, j) => champs.push([`axes_prioritaires[${i}].arguments[${j}]`, x]));
    (a.points_a_confirmer ?? []).forEach((x, j) => champs.push([`axes_prioritaires[${i}].points_a_confirmer[${j}]`, x]));
  });
  (s.points_de_vigilance ?? []).forEach((x, i) => champs.push([`points_de_vigilance[${i}]`, x]));
  (s.questions_entretien ?? []).forEach((x, i) => champs.push([`questions_entretien[${i}]`, x]));
  champs.push(['limites', s.limites]);
  return champs.filter(([, v]) => typeof v === 'string' && v.length > 0);
}

const indices = [];
let mdBio = '# Lecture — second appel (synthese-biologie-v2)\n';
let mdPrin = `# Lecture — appel principal (${VERSION_PRINCIPALE}${MODE === 'principal' ? ', seul' : ''}) et narratif assemblé\n`;
const blocsBio = [];
const blocsPrin = [];

for (const g of generations) {
  const principal = [...g.appels].reverse().find(a => a.consigne === 'principale');
  const second = [...g.appels].reverse().find(a => a.consigne === 'synthese-biologie-v2');
  const sortiePrincipale = principal ? lireJson(principal.sortie) : null;
  const sortieBio = second ? lireJson(second.sortie) : null;
  const s = g.syntheseJson ?? {};
  const termes = termesDuBloc(g.blocBiologie);

  // Narratif assemblé : la phrase du §5 est le DERNIER paragraphe ; le reste se lit.
  const narratif = String(s.narratif_patient ?? '');
  const paragraphes = narratif.split('\n\n');
  const dernier = paragraphes[paragraphes.length - 1];
  const phrasePosee = PHRASE.test(dernier);
  const narratifHorsPhrase = phrasePosee ? paragraphes.slice(0, -1).join('\n\n') : narratif;

  // La phrase dit la date la plus récente du bloc (contrôle de forme, non de fond).
  const dates = [...String(g.blocBiologie ?? '').matchAll(/Prélevé le (\d{4})-(\d{2})-(\d{2})/g)].map(m => `${m[1]}-${m[2]}-${m[3]}`).sort();
  const plusRecente = dates[dates.length - 1];
  const attendue = plusRecente
    ? `Votre praticien a reçu votre bilan biologique du ${Number(plusRecente.slice(8)) === 1 ? '1er' : Number(plusRecente.slice(8))} ${MOIS[Number(plusRecente.slice(5, 7)) - 1]} ${plusRecente.slice(0, 4)}.`
    : null;

  const passagesPrincipaux = [];
  // Ligne 10 : la sortie BRUTE du modèle (les vigilances déterministes, ajoutées
  // ensuite par le code, n'en sont pas) ; ligne 11 : le narratif ASSEMBLÉ.
  for (const [champ, valeur] of [...champsPrincipaux(sortiePrincipale), ['narratif_patient assemblé (hors phrase du §5)', narratifHorsPhrase]]) {
    for (const p of phrases(valeur)) {
      const termesTrouves = termes.filter(t => p.toLowerCase().includes(t.toLowerCase()));
      if (termesTrouves.length || BIOLOGIE.test(p)) passagesPrincipaux.push({ champ, passage: p, termesDuBloc: termesTrouves });
    }
  }

  indices.push({
    generation: g.nom,
    statutHttp: g.statutHttp,
    issueBiologie: g.appelBiologie?.issue ?? null,
    entrees: g.entrees,
    relancePrincipale: g.appels.filter(a => a.consigne === 'principale').length > 1,
    relanceBiologie: g.appels.filter(a => a.consigne === 'synthese-biologie-v2').length > 1,
    phrase: { posee: phrasePosee, conforme: attendue !== null && dernier === attendue, attendue, lue: dernier },
    principalTermesDuBloc: [...new Set(passagesPrincipaux.flatMap(p => p.termesDuBloc))],
    principalPassagesBiologie: passagesPrincipaux.length,
  });

  const enteteGen = `\n\n## ${g.nom}\n`;
  const bio = MODE === 'principal' ? '' : `${enteteGen}\n### Bloc envoyé au second appel\n\n\`\`\`\n${g.blocBiologie ?? '(aucun)'}\n\`\`\`\n\n### Restitution (second appel, issue : ${g.appelBiologie?.issue ?? '—'})\n\n` +
    `**resume_biologie_praticien**\n\n${sortieBio?.resume_biologie_praticien ?? '(vide)'}\n\n**points_de_vigilance_biologie**\n\n` +
    `${(sortieBio?.points_de_vigilance_biologie ?? []).map(x => `- ${x}`).join('\n') || '(aucun)'}\n`;
  if (bio) {
    mdBio += bio;
    blocsBio.push(bio);
  }

  const premierMessage = principal ? String(principal.messages?.[0]?.content ?? '') : '';
  const declaratif = premierMessage.match(/^<donnees_declaratives_patient>$[\s\S]*?^<\/donnees_declaratives_patient>$/m)?.[0] ?? '(aucune anamnèse transmise)';
  const prin = `${enteteGen}\n### Anamnèse transmise à l'appel principal\n\n\`\`\`\n${declaratif}\n\`\`\`\n\n` +
    `### Résultats du dossier (bloc NON transmis à l'appel principal${MODE === 'principal' ? ', construit par le banc' : ''} ; pour la ligne 10)\n\n\`\`\`\n${g.blocBiologie ?? '(aucun)'}\n\`\`\`\n\n` +
    `### Sortie brute de l'appel principal (champ par champ)\n\n` +
    champsPrincipaux(sortiePrincipale).map(([c, v]) => `- **${c}** : ${v}`).join('\n') +
    `\n\n### Narratif assemblé\n\n${narratifHorsPhrase}\n\n**Phrase du §5 (posée par le code)** : ${phrasePosee ? dernier : '(absente)'}\n`;
  mdPrin += prin;
  blocsPrin.push(prin);
  if (!sortiePrincipale) indices[indices.length - 1].principalIllisible = true;
}

if (MODE === 'deux') fs.writeFileSync(path.join(sortie, 'lecture-biologie.md'), mdBio);
fs.writeFileSync(path.join(sortie, 'lecture-principale.md'), mdPrin);
fs.writeFileSync(path.join(sortie, 'indices.json'), JSON.stringify(indices, null, 2));

// Paquets de lecture indépendante, sous 300 000 octets chacun.
const dossierPaquets = path.join(sortie, 'paquets');
fs.mkdirSync(dossierPaquets, { recursive: true });
function decouper(blocs, prefixe) {
  const paquets = [];
  let courant = [];
  let taille = 0;
  for (const b of blocs) {
    const t = Buffer.byteLength(b, 'utf8');
    if (taille + t > 300_000 && courant.length) { paquets.push(courant); courant = []; taille = 0; }
    courant.push(b);
    taille += t;
  }
  if (courant.length) paquets.push(courant);
  paquets.forEach((p, i) => fs.writeFileSync(path.join(dossierPaquets, `${prefixe}-${i + 1}.md`), p.join('')));
  return paquets.length;
}
const nBio = decouper(blocsBio, 'biologie');
const nPrin = decouper(blocsPrin, 'principale');

const resume = {
  generations: generations.length,
  http200: indices.filter(i => i.statutHttp === 200).length,
  issuesBiologie: indices.reduce((o, i) => ({ ...o, [i.issueBiologie]: (o[i.issueBiologie] ?? 0) + 1 }), {}),
  appels: MODE,
  entreesConformes: indices.filter(i => i.entrees.principalSansBloc && i.entrees.secondBlocSeul !== false && i.entrees.ecarts.length === 0).length,
  // Mode `principal` : drapeau éteint, la phrase du §5 n'est jamais posée ; un compte non nul est un écart.
  phrasesConformes: MODE === 'principal' ? null : indices.filter(i => i.phrase.conforme).length,
  phrasesPosees: indices.filter(i => i.phrase.posee).length,
  relancesPrincipales: indices.filter(i => i.relancePrincipale).length,
  relancesBiologie: indices.filter(i => i.relanceBiologie).length,
  generationsAvecTermesDuBlocDansLePrincipal: indices.filter(i => i.principalTermesDuBloc.length).map(i => `${i.generation}: ${i.principalTermesDuBloc.join(' | ')}`),
  paquets: { biologie: nBio, principale: nPrin },
};
console.log(JSON.stringify(resume, null, 2));
