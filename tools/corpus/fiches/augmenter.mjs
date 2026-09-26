// L'ADAPTATION D'UNE FICHE MY POUR LE PATIENT ([[D-251]] §5, lot 5) — hors
// ligne, sur le Mac, une fois par version de fiche.
//
// Deux modèles, jamais fusionnés :
//   — Sonnet RÉDIGE la fiche adaptée, sous la consigne versionnée
//     (consignes/redaction.md), depuis la seule fiche et ses claims ;
//   — GPT CONTRE-LIT chaque élément (titre, précaution, section, bloc) sous
//     consignes/contre-lecture.md. Un désaccord exclut l'élément, sans
//     repêchage (lib/assemblage.mjs dit ce que « exclure » veut dire pour
//     chacun).
// Les contrôles du lot 2 (`controlerFiche`) et le contrat du lot 4
// (`lireBrouillonFiche`) sont rejoués ICI, avant tout envoi, et sont
// bloquants : une fiche qui les rate n'est pas écrite comme brouillon.
//
// AUCUNE DONNÉE PATIENT N'ENTRE DANS UNE CONSIGNE. Aucun texte ne sort vers le
// terminal : seulement des comptes, des codes et des chemins. Le texte ne va
// que sous ~/.wellneuro/corpus/fiches/, jamais au dépôt, qui est public.
//
// Ce script n'envoie rien : le dépôt en base est `deposer.mjs`, un second
// geste.
//
//   npm --prefix tools/corpus ci        # une fois : SDK Anthropic et OpenAI
//   node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
//     tools/corpus/fiches/augmenter.mjs --source WN-SRC-0300[,WN-SRC-0297…]
//
// Sans --source : les sept fiches des assiettes choisissables ([[D-251]] §10).

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  appliquerRelecture,
  appliquerVerdicts,
  enParallele,
  ErreurOutil,
  erreurSansTexte,
  parseJsonLache,
  resumeSansTexte,
  sectionsARelire,
  unitesAContreLire,
} from './lib/assemblage.mjs';
import { consignesVerifiees } from './lib/consigne.mjs';
import { controlerBrouillon } from './lib/controles.mjs';
import { CLAIMS_PAR_DEFAUT, chargerClaimsLocaux, chargerSource, SORTIES } from './lib/entrees.mjs';

const { lireBrouillonFiche } = await import('@/lib/fiches-assiette/contrat');
const { controlerFiche } = await import('@/lib/fiches-assiette/invariants');
const { clesSecuriteDeLAssiette } = await import('@/lib/fiches-assiette/securite');
const { FICHE_MY_PAR_ASSIETTE } = await import('@/lib/fiches-assiette/appariement');
const { getRecommendedPlate } = await import('@/lib/food-compass/plates');

const PREMIERE_VAGUE = ['WN-SRC-0297', 'WN-SRC-0299', 'WN-SRC-0300', 'WN-SRC-0301', 'WN-SRC-0302', 'WN-SRC-0303', 'WN-SRC-0305'];
const MODELE_REDACTION = process.env.WN_FICHES_CLAUDE_MODEL || 'claude-sonnet-5';
const MODELE_FIDELITE = process.env.WN_FICHES_OPENAI_MODEL || 'gpt-5.4';
/**
 * CHIFFRES TECHNIQUES (`DC-20`) : appels simultanés au relecteur, et plafond de
 * sa réponse. Le plafond compte aussi les jetons de raisonnement ; une réponse
 * coupée n'est pas un verdict.
 */
const CONTRE_LECTURES_SIMULTANEES = 4;
const JETONS_MAX_CONTRE_LECTURE = 4096;

function lireArguments() {
  const a = process.argv.slice(2);
  const o = { sources: PREMIERE_VAGUE, claims: CLAIMS_PAR_DEFAUT };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--source') o.sources = a[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a[i] === '--claims') o.claims = a[++i];
    else throw new ErreurOutil(`Argument inconnu : ${a[i]}`);
  }
  return o;
}

function listeDeClaims(cles, claims) {
  return cles.length === 0 ? '(aucune)' : cles.map(cle => `- "${cle}" : ${claims.get(cle).texte}`).join('\n');
}

async function rediger(anthropic, consigne, { sourceId, plateCode, libelle, texteSource, clesFiche, clesSecurite, claims }) {
  const rep = await anthropic.messages.create({
    model: MODELE_REDACTION,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: consigne,
    messages: [
      {
        role: 'user',
        content:
          `ASSIETTE : ${plateCode} — ${libelle}\nFICHE : ${sourceId}\n\n` +
          `TEXTE SOURCE :\n"""\n${texteSource}\n"""\n\n` +
          `CLAIMS DE LA FICHE :\n${listeDeClaims(clesFiche, claims)}\n\n` +
          `RÉSERVES DE SÉCURITÉ (à porter TOUTES en précautions) :\n${listeDeClaims(clesSecurite, claims)}`,
      },
    ],
  });
  return parseJsonLache(rep.content.filter(b => b.type === 'text').map(b => b.text).join('\n'));
}

/**
 * Le verdict du relecteur sur UN élément, ou un échec TECHNIQUE — appel en
 * erreur, réponse coupée ou illisible. Un échec technique n'est ni un accord ni
 * un refus : il fait échouer la fiche (lib/assemblage.mjs).
 */
async function contreLire(openai, consigne, unite, texteSource, claims) {
  const cites = unite.claims.filter(cle => claims.has(cle));
  let rep;
  try {
    rep = await openai.responses.create({
      model: MODELE_FIDELITE,
      reasoning: { effort: 'medium' },
      max_output_tokens: JETONS_MAX_CONTRE_LECTURE,
      instructions: consigne,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text:
                `NATURE : ${unite.nature}\n\nTEXTE À VÉRIFIER :\n"""\n${unite.texte}\n"""\n\n` +
                (unite.contexte ? `CONTEXTE (à ne pas juger, pour situer l'élément) :\n"""\n${unite.contexte}\n"""\n\n` : '') +
                `CLAIMS CITÉS :\n${listeDeClaims(cites, claims)}\n\n` +
                `TEXTE SOURCE DE LA FICHE :\n"""\n${texteSource}\n"""`,
            },
          ],
        },
      ],
    });
  } catch (e) {
    return { fidele: false, technique: true, raison: `contre-lecture en échec : ${erreurSansTexte(e)}` };
  }
  if (rep.status && rep.status !== 'completed') {
    return { fidele: false, technique: true, raison: `contre-lecture inachevée (${rep.status})` };
  }
  try {
    const v = parseJsonLache(rep.output_text || '');
    if (typeof v?.fidele !== 'boolean') throw new Error('verdict sans « fidele »');
    return { fidele: v.fidele, raison: String(v.raison || '') };
  } catch {
    return { fidele: false, technique: true, raison: 'verdict illisible' };
  }
}

async function contreLireTout(outils, unites, texteSource) {
  const { openai, consignes, claims } = outils;
  const verdicts = await enParallele(unites, CONTRE_LECTURES_SIMULTANEES, u =>
    contreLire(openai, consignes.contreLecture, u, texteSource, claims),
  );
  return new Map(unites.map((u, i) => [u.id, verdicts[i]]));
}

function controler(brouillon, claims, clesSecurite) {
  return controlerBrouillon({ lireBrouillonFiche, controlerFiche }, brouillon, claims, clesSecurite);
}

async function ecrire(sourceId, horodatage, suffixe, donnees) {
  const dossier = path.join(SORTIES, sourceId);
  await mkdir(dossier, { recursive: true, mode: 0o700 });
  const fichier = path.join(dossier, `${horodatage}-${suffixe}.json`);
  await writeFile(fichier, `${JSON.stringify(donnees, null, 2)}\n`, { mode: 0o600 });
  return fichier;
}

async function adapter(sourceId, outils) {
  const { anthropic, openai, consignes, claims } = outils;
  const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
  const plateCode = Object.keys(FICHE_MY_PAR_ASSIETTE).find(code => FICHE_MY_PAR_ASSIETTE[code] === sourceId);
  if (!plateCode) throw new ErreurOutil(`${sourceId} : aucune assiette appariée.`);
  const libelle = getRecommendedPlate(plateCode)?.label ?? plateCode;

  const { texteSource, sourceSha256, pages, appariement } = await chargerSource(sourceId);
  const numero = sourceId.slice(-4);
  const clesFiche = [...claims.keys()].filter(cle => claims.get(cle).sourceId === sourceId && cle.startsWith(`WN-CL-${numero}-`)).sort();
  const clesSecurite = clesSecuriteDeLAssiette(plateCode);
  const manquantes = clesSecurite.filter(cle => !claims.has(cle));
  if (manquantes.length > 0) throw new ErreurOutil(`${sourceId} : réserve(s) de sécurité absente(s) de l'instantané : ${manquantes.join(', ')}.`);
  console.log(`${sourceId} (${plateCode}) : ${pages} page(s), appariement « ${appariement} », ${clesFiche.length} claim(s), ${clesSecurite.length} réserve(s).`);

  const base = {
    sourceId,
    plateCode,
    texteSource,
    sourceSha256,
    modeleRedaction: MODELE_REDACTION,
    modeleFidelite: MODELE_FIDELITE,
    versionConsigne: consignes.versionConsigne,
  };

  // 1. RÉDACTION, puis contrôles AVANT toute contre-lecture : une fiche déjà
  //    fausse ne mérite pas d'être relue par un second modèle.
  const brut = await rediger(anthropic, consignes.redaction, { sourceId, plateCode, libelle, texteSource, clesFiche, clesSecurite, claims });
  const avant = controler({ ...base, contenu: brut }, claims, clesSecurite);
  if (avant.anomalies.length > 0) {
    const fichier = await ecrire(sourceId, horodatage, 'revue', { etape: 'redaction', anomalies: avant.anomalies, redige: brut });
    return { sourceId, issue: 'echec', motif: 'controles', codes: avant.anomalies.map(a => a.code), fichier };
  }
  const redige = avant.lu.contenu;

  // 2. CONTRE-LECTURE de chaque élément, dans son contexte, puis assemblage.
  const assemblage = appliquerVerdicts(redige, await contreLireTout(outils, unitesAContreLire(redige), texteSource));
  if (assemblage.issue === 'echec') {
    const fichier = await ecrire(sourceId, horodatage, 'revue', { etape: 'contre-lecture', motif: assemblage.motif, exclusions: assemblage.exclusions, redige });
    return { sourceId, issue: 'echec', motif: assemblage.motif, codes: [], fichier };
  }

  // 2 bis. Les sections amputées, relues ENTIÈRES : un bloc gardé ne doit pas
  //        avoir perdu la borne que portait son voisin exclu.
  const relues = sectionsARelire(assemblage.contenu, assemblage.aRelire);
  const retenue = relues.length === 0 ? assemblage : appliquerRelecture(assemblage, await contreLireTout(outils, relues, texteSource));
  if (retenue.issue === 'echec') {
    const fichier = await ecrire(sourceId, horodatage, 'revue', { etape: 'relecture des sections', motif: retenue.motif, exclusions: retenue.exclusions, redige });
    return { sourceId, issue: 'echec', motif: retenue.motif, codes: [], fichier };
  }

  // 3. Les contrôles, rejoués sur la fiche retenue.
  const apres = controler({ ...base, contenu: retenue.contenu }, claims, clesSecurite);
  if (apres.anomalies.length > 0) {
    const fichier = await ecrire(sourceId, horodatage, 'revue', { etape: 'assemblage', anomalies: apres.anomalies, exclusions: retenue.exclusions, redige });
    return { sourceId, issue: 'echec', motif: 'controles', codes: apres.anomalies.map(a => a.code), fichier };
  }

  const fichier = await ecrire(sourceId, horodatage, 'brouillon', apres.lu);
  if (retenue.exclusions.length > 0) {
    await ecrire(sourceId, horodatage, 'revue', { etape: 'contre-lecture', exclusions: retenue.exclusions, redige });
  }
  return { sourceId, issue: 'brouillon', exclus: retenue.exclusions.length, ...resumeSansTexte(retenue.contenu), fichier };
}

async function main() {
  const args = lireArguments();
  if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY) {
    console.error('ANTHROPIC_API_KEY et OPENAI_API_KEY sont requis (node --env-file=web/.env.local …).');
    process.exit(1);
  }
  const consignes = consignesVerifiees();
  const { claims, empreintesFausses } = await chargerClaimsLocaux(args.claims);
  if (empreintesFausses.length > 0) {
    console.log(`Instantané des claims : ${empreintesFausses.length} claim(s) écarté(s), texte ne redonnant pas son empreinte.`);
  }
  console.log(`Consigne ${consignes.versionConsigne} · rédaction ${MODELE_REDACTION} · contre-lecture ${MODELE_FIDELITE}`);

  // Journaux des SDK coupés : au niveau « debug » (ANTHROPIC_LOG, OPENAI_LOG),
  // ils imprimeraient le corps des requêtes, donc la fiche.
  const outils = { anthropic: new Anthropic({ logLevel: 'off' }), openai: new OpenAI({ logLevel: 'off' }), consignes, claims };
  let echecs = 0;
  for (const sourceId of args.sources) {
    try {
      const r = await adapter(sourceId, outils);
      if (r.issue === 'brouillon') {
        console.log(`  ${sourceId} : BROUILLON — ${r.precautions} précaution(s), ${r.sections} section(s), ${r.blocs} bloc(s), ${r.exclus} élément(s) exclu(s) → ${r.fichier}`);
      } else {
        echecs++;
        console.log(`  ${sourceId} : ÉCHEC (${r.motif}${r.codes.length ? ` : ${[...new Set(r.codes)].join(', ')}` : ''}) → ${r.fichier}`);
      }
    } catch (e) {
      echecs++;
      // Une ErreurOutil ne porte qu'un identifiant ; les autres (SDK,
      // JSON.parse) peuvent recopier du texte : leur nom seul.
      console.log(`  ${sourceId} : ÉCHEC — ${erreurSansTexte(e)}`);
    }
  }
  process.exit(echecs > 0 ? 1 : 0);
}

// Aucune erreur ne remonte jusqu'à Node, qui imprimerait son message — et,
// pour un JSON.parse, la ligne fautive.
await main().catch(e => {
  console.error(`Arrêt — ${erreurSansTexte(e)}`);
  process.exit(1);
});
