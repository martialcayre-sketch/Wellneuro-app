// LE DÉPÔT D'UN BROUILLON DE FICHE ADAPTÉE ([[D-251]] §5, lot 5) — le second
// geste, séparé de la rédaction.
//
// Il rejoue d'abord, sur le fichier tel qu'il est, le contrat du lot 4 et les
// contrôles du lot 2 : un brouillon retouché à la main depuis sa rédaction ne
// part pas sans eux. Puis il l'envoie à la route interne
// `/api/internal/fiches-assiette/ingest`, qui revérifie tout et tranche seule le
// statut VALIDE des claims. Ce qu'elle crée est un BROUILLON : la validation
// reste un acte du responsable, par un autre chemin (`DC-16`).
//
// LA CIBLE S'ÉCRIT EN TOUTES LETTRES. `--cible` est obligatoire et n'est jamais
// tirée de l'environnement : un envoi en production ne part pas d'un fichier
// `.env` oublié. Le secret, lui, vient de l'environnement (RAG_INTERNAL_SECRET)
// et ne s'imprime jamais.
//
// AUCUN TEXTE DANS LE TERMINAL : des codes, des numéros, des chemins. Le détail
// d'un refus s'écrit à côté du brouillon, sous ~/.wellneuro/corpus/fiches/.
//
//   node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
//     tools/corpus/fiches/deposer.mjs --validate <brouillon.json>…
//   node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
//     tools/corpus/fiches/deposer.mjs --cible https://app.wellneuro.fr <brouillon.json>…

import { readFile, writeFile } from 'node:fs/promises';
import { adresseDIngestion, cheminVoisin, ErreurOutil, erreurSansTexte } from './lib/assemblage.mjs';
import { controlerBrouillon } from './lib/controles.mjs';
import { CLAIMS_PAR_DEFAUT, chargerClaimsLocaux } from './lib/entrees.mjs';

const { lireBrouillonFiche } = await import('@/lib/fiches-assiette/contrat');
const { controlerFiche } = await import('@/lib/fiches-assiette/invariants');
const { clesSecuriteDeLAssiette } = await import('@/lib/fiches-assiette/securite');

function lireArguments() {
  const a = process.argv.slice(2);
  const o = { validate: false, cible: null, claims: CLAIMS_PAR_DEFAUT, fichiers: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--validate') o.validate = true;
    else if (a[i] === '--cible') o.cible = a[++i];
    else if (a[i] === '--claims') o.claims = a[++i];
    else if (a[i].startsWith('--')) throw new ErreurOutil(`Argument inconnu : ${a[i]}`);
    else o.fichiers.push(a[i]);
  }
  if (o.fichiers.length === 0) throw new ErreurOutil('Aucun brouillon à déposer.');
  return o;
}

async function main() {
  const args = lireArguments();
  const cible = args.validate ? null : adresseDIngestion(args.cible);
  const secret = process.env.RAG_INTERNAL_SECRET?.trim();
  if (cible && !secret) {
    console.error('RAG_INTERNAL_SECRET est requis pour déposer (node --env-file=web/.env.local …).');
    process.exit(1);
  }
  if (cible) console.log(`Cible : ${cible.hote}`);

  const { claims } = await chargerClaimsLocaux(args.claims);
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

    const { lu, anomalies } = controlerBrouillon(
      { lireBrouillonFiche, controlerFiche },
      brouillon,
      claims,
      clesSecuriteDeLAssiette(String(brouillon.plateCode ?? '')),
    );
    if (anomalies.length > 0) {
      echecs++;
      const refus = cheminVoisin(fichier, 'controles');
      await writeFile(refus, `${JSON.stringify({ anomalies }, null, 2)}\n`, { mode: 0o600 });
      console.log(`  ${fichier} : BLOQUÉ par les contrôles (${[...new Set(anomalies.map(a => a.code))].join(', ')}) → ${refus}`);
      continue;
    }
    if (!cible) {
      console.log(`  ${lu.sourceId} : conforme au contrat et aux contrôles (${lu.versionConsigne}).`);
      continue;
    }

    try {
      const rep = await fetch(cible.adresse, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
        body: JSON.stringify(lu),
        // Une redirection ne renvoie ni le corps ni le secret ailleurs.
        redirect: 'error',
      });
      const corps = await rep.json().catch(() => ({}));
      if (rep.ok && corps.ok) {
        console.log(`  ${lu.sourceId} : ${corps.statut} — version ${corps.numero} (${String(corps.contenuSha256).slice(0, 12)}…)`);
        continue;
      }
      echecs++;
      if (rep.status === 422 && Array.isArray(corps.anomalies)) {
        const refus = cheminVoisin(fichier, 'refus');
        await writeFile(refus, `${JSON.stringify(corps, null, 2)}\n`, { mode: 0o600 });
        console.log(`  ${lu.sourceId} : REFUSÉ (${[...new Set(corps.anomalies.map(a => a.code))].join(', ')}) → ${refus}`);
      } else {
        // Un message de contrat ne recopie aucun texte de fiche ; il reste
        // écrit à côté du brouillon plutôt qu'au terminal.
        const refus = cheminVoisin(fichier, 'refus');
        await writeFile(refus, `${JSON.stringify({ statut: rep.status, corps }, null, 2)}\n`, { mode: 0o600 });
        console.log(`  ${lu.sourceId} : ÉCHEC HTTP ${rep.status} → ${refus}`);
      }
    } catch (e) {
      echecs++;
      console.log(`  ${lu.sourceId} : ÉCHEC — ${erreurSansTexte(e)}`);
    }
  }
  process.exit(echecs > 0 ? 1 : 0);
}

// Aucune erreur ne remonte jusqu'à Node, qui imprimerait son message.
await main().catch(e => {
  console.error(`Arrêt — ${erreurSansTexte(e)}`);
  process.exit(1);
});
