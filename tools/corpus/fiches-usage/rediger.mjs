// LA RÉDACTION HORS LIGNE DES FICHES D'USAGE ET DE LEUR VOCABULAIRE
// ([[D-314]] §4) — sur le Mac, patron de `tools/corpus/fiches/augmenter.mjs`.
//
// Deux modèles, jamais fusionnés :
//   — Claude RÉDIGE, sous consignes/redaction.md, depuis la seule structure
//     signée (identifiants) et les claims qu'elle épingle ;
//   — GPT CONTRE-LIT chaque rubrique (dans le contexte des autres) et chaque
//     libellé, sous consignes/contre-lecture.md.
// Puis le vérificateur DC-03 ([[D-266]] §7). Un désaccord, un échec technique
// ou un verdict DC-03 négatif sur UN texte fait échouer la fiche entière : une
// version privée d'une rubrique ne serait jamais valide (lib/preparation.mjs).
// Le contrat et le contrôle contre la structure sont ceux de `web/src`,
// importés par le hook d'alias, jamais recopiés.
//
// AUCUNE DONNÉE PATIENT N'ENTRE DANS UNE CONSIGNE. Aucun texte ne sort vers le
// terminal : des comptes, des codes, des chemins. Le texte ne va que sous
// ~/.wellneuro/corpus/fiches-usage/, jamais au dépôt, qui est public.
// Ce script n'envoie rien en base : le dépôt est `deposer.mjs`, un second geste.
//
//   npm --prefix tools/corpus ci        # une fois : SDK Anthropic et OpenAI
//   node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
//     tools/corpus/fiches-usage/rediger.mjs [--fiche FU_…[,…]] [--terme HYP_…|POP_…[,…]]
//
// Sans --fiche ni --terme : toutes les fiches et tous les termes de la structure.

import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { enParallele, ErreurOutil, erreurSansTexte, parseJsonLache } from '../fiches/lib/assemblage.mjs';
import { CLAIMS_PAR_DEFAUT, chargerClaimsLocaux } from '../fiches/lib/entrees.mjs';
import { consignesVerifiees } from './lib/consigne.mjs';
import {
  claimsDeLaFiche,
  claimsDuTerme,
  contexteDeRubrique,
  messageContreLecture,
  messageRedactionFiche,
  messageRedactionLibelle,
  resumeSansTexte,
  rubriquesRedigees,
  sourcesDc03,
  verdictDEnsemble,
} from './lib/preparation.mjs';

const { FICHES_USAGE_BESOIN2_V1, FICHES_USAGE_BESOIN2_SHA256, ficheDeLaStructure } = await import(
  '@/lib/fiches-usage/ficheUsageBesoin2V1'
);
const { lireBrouillonVersionUsage, lireBrouillonLibelle } = await import('@/lib/fiches-usage/contrat');
const { controlerVersionContreStructure, controlerLibelleContreStructure } = await import('@/lib/fiches-usage/controle');
const { natureDuTerme } = await import('@/lib/fiches-usage/vocabulaire');
const { verifierDc03 } = await import('@/lib/bio-parcours/verifierDc03');

export const SORTIES = path.join(os.homedir(), '.wellneuro', 'corpus', 'fiches-usage');
const MODELE_REDACTION = process.env.WN_FICHES_USAGE_CLAUDE_MODEL || 'claude-sonnet-5';
const MODELE_CONTRE_LECTURE = process.env.WN_FICHES_USAGE_OPENAI_MODEL || 'gpt-5.4';
/** CHIFFRES TECHNIQUES (`DC-20`) : appels simultanés au relecteur, plafond de sa réponse. */
const CONTRE_LECTURES_SIMULTANEES = 4;
const JETONS_MAX_CONTRE_LECTURE = 4096;

function lireArguments() {
  const a = process.argv.slice(2);
  const o = { fiches: null, termes: null, claims: CLAIMS_PAR_DEFAUT };
  const liste = v => (v ?? '').split(',').map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--fiche') o.fiches = liste(a[++i]);
    else if (a[i] === '--terme') o.termes = liste(a[++i]);
    else if (a[i] === '--claims') o.claims = a[++i];
    else throw new ErreurOutil(`Argument inconnu : ${a[i]}`);
  }
  const structure = FICHES_USAGE_BESOIN2_V1;
  const tous = o.fiches === null && o.termes === null;
  return {
    claims: o.claims,
    fiches: tous ? structure.fiches.map(f => f.id) : (o.fiches ?? []),
    termes: tous ? [...structure.hypotheses, ...structure.populations] : (o.termes ?? []),
  };
}

async function rediger(anthropic, consigne, message) {
  const rep = await anthropic.messages.create({
    model: MODELE_REDACTION,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: consigne,
    messages: [{ role: 'user', content: message }],
  });
  return parseJsonLache(rep.content.filter(b => b.type === 'text').map(b => b.text).join('\n'));
}

/** Un verdict, ou un échec TECHNIQUE — qui n'est ni un accord ni un refus. */
async function contreLire(openai, consigne, entree) {
  let rep;
  try {
    rep = await openai.responses.create({
      model: MODELE_CONTRE_LECTURE,
      reasoning: { effort: 'medium' },
      max_output_tokens: JETONS_MAX_CONTRE_LECTURE,
      instructions: consigne,
      input: [{ role: 'user', content: [{ type: 'input_text', text: messageContreLecture(entree) }] }],
    });
  } catch (e) {
    return { fidele: false, technique: true, raison: `contre-lecture en échec : ${erreurSansTexte(e)}` };
  }
  if (rep.status && rep.status !== 'completed') return { fidele: false, technique: true, raison: `contre-lecture inachevée (${rep.status})` };
  try {
    const v = parseJsonLache(rep.output_text || '');
    if (typeof v?.fidele !== 'boolean') throw new Error('verdict sans « fidele »');
    return { fidele: v.fidele, raison: String(v.raison || '') };
  } catch {
    return { fidele: false, technique: true, raison: 'verdict illisible' };
  }
}

async function ecrire(id, horodatage, suffixe, donnees) {
  const dossier = path.join(SORTIES, id);
  await mkdir(dossier, { recursive: true, mode: 0o700 });
  const fichier = path.join(dossier, `${horodatage}-${suffixe}.json`);
  await writeFile(fichier, `${JSON.stringify(donnees, null, 2)}\n`, { mode: 0o600 });
  return fichier;
}

const horodatage = () => new Date().toISOString().replace(/[:.]/g, '-');

/** Le message d'un refus du contrat — écrit pour ne citer aucun texte —, sinon nom et code seuls. */
const detailDuContrat = e => (e?.name === 'ErreurContratFicheUsage' ? e.message : erreurSansTexte(e));

function anomaliesDuContrat(lire, brouillon) {
  try {
    return { lu: lire(brouillon), anomalies: [] };
  } catch (e) {
    return { lu: null, anomalies: [{ code: 'contrat', detail: detailDuContrat(e) }] };
  }
}

async function redigerFiche(ficheId, outils) {
  const { anthropic, openai, consignes, claims } = outils;
  const h = horodatage();
  const fiche = ficheDeLaStructure(ficheId, FICHES_USAGE_BESOIN2_V1);
  if (!fiche) throw new ErreurOutil(`${ficheId} : fiche absente de la structure.`);
  const cites = claimsDeLaFiche(fiche, claims);
  const message = messageRedactionFiche(fiche, cites);
  console.log(`${ficheId} : ${fiche.rubriques.length} rubrique(s), ${cites.length} claim(s).`);

  const rubriques = rubriquesRedigees(await rediger(anthropic, consignes.redaction, message), fiche.rubriques);
  const verdicts = await enParallele(fiche.rubriques, CONTRE_LECTURES_SIMULTANEES, r =>
    contreLire(openai, consignes.contreLecture, {
      nature: `rubrique « ${r} »`,
      texte: rubriques[r],
      contexte: contexteDeRubrique(rubriques, r),
      claimsCites: cites,
    }),
  );
  const sources = sourcesDc03(message, cites);
  const ensemble = verdictDEnsemble(
    fiche.rubriques.map((r, i) => ({ id: r, verdict: verdicts[i], dc03: verifierDc03(rubriques[r], sources) })),
  );
  if (ensemble.issue === 'echec') {
    const fichier = await ecrire(ficheId, h, 'revue', { etape: 'contre-lecture et DC-03', exclusions: ensemble.exclusions, redige: rubriques });
    return { id: ficheId, issue: 'echec', motif: [...new Set(ensemble.exclusions.map(x => x.motif))].join(', '), fichier };
  }

  const brouillon = {
    ficheId,
    contenu: rubriques,
    structureSha256: FICHES_USAGE_BESOIN2_SHA256,
    modeleRedaction: MODELE_REDACTION,
    modeleContreLecture: MODELE_CONTRE_LECTURE,
    versionConsigne: consignes.versionConsigne,
  };
  const { lu, anomalies } = anomaliesDuContrat(lireBrouillonVersionUsage, brouillon);
  const toutes = lu ? controlerVersionContreStructure({ ...lu, rubriques: Object.keys(lu.contenu) }) : anomalies;
  if (toutes.length > 0) {
    const fichier = await ecrire(ficheId, h, 'revue', { etape: 'contrat et structure', anomalies: toutes, redige: rubriques });
    return { id: ficheId, issue: 'echec', motif: [...new Set(toutes.map(a => a.code))].join(', '), fichier };
  }
  const fichier = await ecrire(ficheId, h, 'brouillon', lu);
  return { id: ficheId, issue: 'brouillon', resume: resumeSansTexte(lu), fichier };
}

async function redigerLibelle(termeId, outils) {
  const { anthropic, openai, consignes, claims } = outils;
  const h = horodatage();
  const nature = natureDuTerme(termeId);
  if (!nature) throw new ErreurOutil(`${termeId} : identifiant de terme hors format.`);
  // Refusé AVANT tout appel de modèle : un terme que la structure ne déclare
  // pas serait refusé au contrôle, après deux appels payants (revue).
  const declares = nature === 'hypothese' ? FICHES_USAGE_BESOIN2_V1.hypotheses : FICHES_USAGE_BESOIN2_V1.populations;
  if (!declares.includes(termeId)) throw new ErreurOutil(`${termeId} : terme absent de la structure.`);
  const { fiches, claims: cites } = claimsDuTerme(termeId, FICHES_USAGE_BESOIN2_V1, claims);
  // Sans claim, le libellé n'aurait pour base que l'identifiant ou un savoir
  // extérieur (DC-01) : refusé lui aussi avant tout appel (revue).
  if (cites.length === 0) throw new ErreurOutil(`${termeId} : aucun claim épinglé ne porte ce terme.`);
  const message = messageRedactionLibelle(termeId, nature, fiches, cites);
  console.log(`${termeId} : ${fiches.length} fiche(s) citante(s), ${cites.length} claim(s).`);

  const reponse = await rediger(anthropic, consignes.redaction, message);
  if (typeof reponse?.libelle !== 'string' || !/\S/u.test(reponse.libelle)) throw new ErreurOutil(`${termeId} : réponse sans « libelle ».`);
  const libelle = reponse.libelle.trim();
  const verdict = await contreLire(openai, consignes.contreLecture, {
    nature: `libellé du terme ${termeId} (${nature})`,
    texte: libelle,
    contexte: null,
    claimsCites: cites,
  });
  const ensemble = verdictDEnsemble([{ id: termeId, verdict, dc03: verifierDc03(libelle, sourcesDc03(message, cites)) }]);
  if (ensemble.issue === 'echec') {
    const fichier = await ecrire(termeId, h, 'revue', { etape: 'contre-lecture et DC-03', exclusions: ensemble.exclusions, redige: libelle });
    return { id: termeId, issue: 'echec', motif: [...new Set(ensemble.exclusions.map(x => x.motif))].join(', '), fichier };
  }

  const brouillon = {
    termeId,
    libelle,
    structureSha256: FICHES_USAGE_BESOIN2_SHA256,
    modeleRedaction: MODELE_REDACTION,
    modeleContreLecture: MODELE_CONTRE_LECTURE,
    versionConsigne: consignes.versionConsigne,
  };
  const { lu, anomalies } = anomaliesDuContrat(lireBrouillonLibelle, brouillon);
  const toutes = lu ? controlerLibelleContreStructure(lu) : anomalies;
  if (toutes.length > 0) {
    const fichier = await ecrire(termeId, h, 'revue', { etape: 'contrat et structure', anomalies: toutes, redige: libelle });
    return { id: termeId, issue: 'echec', motif: [...new Set(toutes.map(a => a.code))].join(', '), fichier };
  }
  // Le brouillon déposé ne porte pas `nature` : la route la déduit du terme.
  const { nature: _deduite, ...depot } = lu;
  const fichier = await ecrire(termeId, h, 'brouillon', depot);
  return { id: termeId, issue: 'brouillon', resume: resumeSansTexte(depot), fichier };
}

async function main() {
  const args = lireArguments();
  if (args.fiches.length + args.termes.length === 0) {
    console.log('Rien à rédiger : la structure ne déclare aucune fiche ni aucun terme.');
    process.exit(0);
  }
  if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY) {
    console.error('ANTHROPIC_API_KEY et OPENAI_API_KEY sont requis (node --env-file=web/.env.local …).');
    process.exit(1);
  }
  const consignes = consignesVerifiees();
  const { claims, empreintesFausses } = await chargerClaimsLocaux(args.claims);
  if (empreintesFausses.length > 0) console.log(`Instantané des claims : ${empreintesFausses.length} claim(s) écarté(s), empreinte fausse.`);
  console.log(`Consigne ${consignes.versionConsigne} · rédaction ${MODELE_REDACTION} · contre-lecture ${MODELE_CONTRE_LECTURE}`);

  // Journaux des SDK coupés : au niveau « debug », ils imprimeraient le corps
  // des requêtes, donc le texte.
  const outils = { anthropic: new Anthropic({ logLevel: 'off' }), openai: new OpenAI({ logLevel: 'off' }), consignes, claims };
  let echecs = 0;
  const taches = [...args.fiches.map(id => () => redigerFiche(id, outils)), ...args.termes.map(id => () => redigerLibelle(id, outils))];
  const ids = [...args.fiches, ...args.termes];
  for (const [i, tache] of taches.entries()) {
    try {
      const r = await tache();
      if (r.issue === 'brouillon') console.log(`  ${r.id} : BROUILLON — ${JSON.stringify(r.resume)} → ${r.fichier}`);
      else {
        echecs++;
        console.log(`  ${r.id} : ÉCHEC (${r.motif}) → ${r.fichier}`);
      }
    } catch (e) {
      echecs++;
      console.log(`  ${ids[i]} : ÉCHEC — ${erreurSansTexte(e)}`);
    }
  }
  process.exit(echecs > 0 ? 1 : 0);
}

// Aucune erreur ne remonte jusqu'à Node, qui imprimerait son message.
await main().catch(e => {
  console.error(`Arrêt — ${erreurSansTexte(e)}`);
  process.exit(1);
});
