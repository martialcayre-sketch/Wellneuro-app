#!/usr/bin/env node
// Le miroir Azure du runner a bloqué l'installation Playwright le 2026-11-11.
// Conserver suites, composants et signatures ; changer seulement ce miroir.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function preparerMiroirsApt(racine) {
  const sources = path.join(racine, 'sources.list.d');
  const fichiers = ['sources.list', 'apt-mirrors.txt', 'apt-mirrors-security.txt']
    .map(nom => path.join(racine, nom));
  if (existsSync(sources)) {
    fichiers.push(...readdirSync(sources)
      .filter(nom => /\.(list|sources)$/.test(nom))
      .map(nom => path.join(sources, nom)));
  }
  let modifies = 0;
  for (const fichier of fichiers) {
    if (!existsSync(fichier)) continue;
    const avant = readFileSync(fichier, 'utf8');
    const apres = avant.replace(
      /https?:\/\/azure\.archive\.ubuntu\.com\/ubuntu\b/g,
      'https://archive.ubuntu.com/ubuntu',
    );
    if (avant !== apres) {
      writeFileSync(fichier, apres);
      modifies++;
    }
  }
  writeFileSync(path.join(racine, 'apt.conf.d', '99-playwright-network'),
    'Acquire::http::Timeout "15";\nAcquire::https::Timeout "15";\nAcquire::Retries "0";\nAPT::Update::Error-Mode "any";\n');
  return modifies;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.platform !== 'linux' || process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('Préparation APT réservée aux runners Linux GitHub Actions.');
  }
  console.log(`Miroir Ubuntu HTTPS : ${preparerMiroirsApt('/etc/apt')} fichier(s) corrigé(s).`);
}
