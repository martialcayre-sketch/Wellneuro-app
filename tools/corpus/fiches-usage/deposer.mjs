// LE DÉPÔT D'UN BROUILLON DE FICHE D'USAGE OU DE LIBELLÉ ([[D-314]] §3, §4) —
// le second geste, séparé de la rédaction ; patron de
// `tools/corpus/fiches/deposer.mjs`.
//
// Il rejoue d'abord, sur le fichier tel qu'il est, le contrat et le contrôle
// contre la structure signée (`web/src`, par le hook d'alias) : un brouillon
// retouché à la main ne part pas sans eux. Puis il l'envoie à la route interne
// des versions ou des libellés, qui revérifie tout. Ce qu'elle crée est un
// BROUILLON : la validation reste un acte du praticien, par un autre chemin
// (`DC-16`).
//
// LA CIBLE S'ÉCRIT EN TOUTES LETTRES (`--cible`, jamais l'environnement) ; le
// secret vient de l'environnement (RAG_INTERNAL_SECRET) et ne s'imprime jamais.
// AUCUN TEXTE DANS LE TERMINAL : des codes, des numéros, des chemins.
//
//   node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
//     tools/corpus/fiches-usage/deposer.mjs --validate <brouillon.json>…
//   node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
//     tools/corpus/fiches-usage/deposer.mjs --cible https://app.wellneuro.fr <brouillon.json>…

import { readFile, writeFile } from 'node:fs/promises';
import { adresseDIngestion, cheminVoisin, ErreurOutil, erreurSansTexte } from '../fiches/lib/assemblage.mjs';

const { lireBrouillonVersionUsage, lireBrouillonLibelle } = await import('@/lib/fiches-usage/contrat');
const { controlerVersionContreStructure, controlerLibelleContreStructure } = await import('@/lib/fiches-usage/controle');

const ROUTES = { version: '/api/internal/fiches-usage/ingest', libelle: '/api/internal/fiches-usage/libelles/ingest' };

function lireArguments() {
  const a = process.argv.slice(2);
  const o = { validate: false, cible: null, fichiers: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--validate') o.validate = true;
    else if (a[i] === '--cible') o.cible = a[++i];
    else if (a[i].startsWith('--')) throw new ErreurOutil(`Argument inconnu : ${a[i]}`);
    else o.fichiers.push(a[i]);
  }
  if (o.fichiers.length === 0) throw new ErreurOutil('Aucun brouillon à déposer.');
  return o;
}

/** L'adresse d'une route, depuis une cible validée par la règle du patron (https hors local). */
function adresse(cible, sorte) {
  return new URL(ROUTES[sorte], adresseDIngestion(cible).adresse).href;
}

/** La sorte d'un brouillon, son identifiant, et ses anomalies au contrat et à la structure. */
function controler(brouillon) {
  const sorte = 'ficheId' in (brouillon ?? {}) ? 'version' : 'termeId' in (brouillon ?? {}) ? 'libelle' : null;
  if (!sorte) return { sorte, id: '?', anomalies: [{ code: 'sorte_inconnue' }] };
  const id = String(sorte === 'version' ? brouillon.ficheId : brouillon.termeId);
  try {
    if (sorte === 'version') {
      const lu = lireBrouillonVersionUsage(brouillon);
      return { sorte, id, lu, anomalies: controlerVersionContreStructure({ ...lu, rubriques: Object.keys(lu.contenu) }) };
    }
    const lu = lireBrouillonLibelle(brouillon);
    return { sorte, id, lu, anomalies: controlerLibelleContreStructure(lu) };
  } catch (e) {
    return { sorte, id, anomalies: [{ code: 'contrat', detail: erreurSansTexte(e) }] };
  }
}

async function main() {
  const args = lireArguments();
  if (!args.validate) adresseDIngestion(args.cible);
  const secret = process.env.RAG_INTERNAL_SECRET?.trim();
  if (!args.validate && !secret) {
    console.error('RAG_INTERNAL_SECRET est requis pour déposer (node --env-file=web/.env.local …).');
    process.exit(1);
  }
  if (!args.validate) console.log(`Cible : ${adresseDIngestion(args.cible).hote}`);

  let echecs = 0;
  for (const fichier of args.fichiers) {
    let brouillon;
    try {
      brouillon = JSON.parse(await readFile(fichier, 'utf8'));
    } catch (e) {
      echecs++;
      console.log(`  ${fichier} : illisible — ${erreurSansTexte(e)}`);
      continue;
    }
    const { sorte, id, anomalies } = controler(brouillon);
    if (anomalies.length > 0) {
      echecs++;
      const refus = cheminVoisin(fichier, 'controles');
      await writeFile(refus, `${JSON.stringify({ anomalies }, null, 2)}\n`, { mode: 0o600 });
      console.log(`  ${fichier} : BLOQUÉ (${[...new Set(anomalies.map(a => a.code))].join(', ')}) → ${refus}`);
      continue;
    }
    if (args.validate) {
      console.log(`  ${id} : conforme au contrat et à la structure (${brouillon.versionConsigne}).`);
      continue;
    }
    try {
      // Le fichier tel qu'il est : la route rejoue elle-même le contrat, qui
      // refuse tout champ que le serveur pose (dont `nature`).
      const rep = await fetch(adresse(args.cible, sorte), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
        body: JSON.stringify(brouillon),
        redirect: 'error',
      });
      const corps = await rep.json().catch(() => ({}));
      if (rep.ok && corps.ok) {
        console.log(`  ${id} : ${corps.statut} — n° ${corps.numero}`);
        continue;
      }
      echecs++;
      const refus = cheminVoisin(fichier, 'refus');
      await writeFile(refus, `${JSON.stringify({ statut: rep.status, corps }, null, 2)}\n`, { mode: 0o600 });
      console.log(`  ${id} : REFUSÉ (HTTP ${rep.status}) → ${refus}`);
    } catch (e) {
      echecs++;
      console.log(`  ${id} : ÉCHEC — ${erreurSansTexte(e)}`);
    }
  }
  process.exit(echecs > 0 ? 1 : 0);
}

await main().catch(e => {
  console.error(`Arrêt — ${erreurSansTexte(e)}`);
  process.exit(1);
});
