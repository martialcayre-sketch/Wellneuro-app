#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const command = args[0] || "status";
const cwd = process.cwd();
const baseDir = path.join(cwd, "docs", "claude", "campagnes");

function flag(name, fallback = undefined) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
function has(name) {
  return args.includes(name);
}
function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "campagne";
}
function dateIso() {
  return new Date().toISOString().slice(0, 10);
}
function ensureBase() {
  fs.mkdirSync(baseDir, { recursive: true });
}
function readCampaigns() {
  ensureBase();
  return fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(baseDir, entry.name);
      const campaign = path.join(dir, "CAMPAGNE.md");
      if (!fs.existsSync(campaign)) return null;
      const text = fs.readFileSync(campaign, "utf8");
      const status = text.match(/^statut:\s*"?([^"\n]+)"?/m)?.[1] || "inconnu";
      const title = text.match(/^#\s+(.+)$/m)?.[1] || entry.name;
      const lotsDir = path.join(dir, "lots");
      const lots = fs.existsSync(lotsDir)
        ? fs.readdirSync(lotsDir).filter((f) => f.endsWith(".md")).sort()
        : [];
      const lotData = lots.map((file) => {
        const lotText = fs.readFileSync(path.join(lotsDir, file), "utf8");
        return {
          file,
          status: lotText.match(/^statut:\s*"?([^"\n]+)"?/m)?.[1] || "inconnu",
          title: lotText.match(/^#\s+(.+)$/m)?.[1] || file
        };
      });
      return { dir, name: entry.name, status, title, lots: lotData };
    })
    .filter(Boolean)
    .sort((a, b) => b.name.localeCompare(a.name));
}
function activeCampaign() {
  const campaigns = readCampaigns();
  return campaigns.find((c) => !["terminé", "abandonne", "abandonné"].includes(c.status))
    || campaigns[0];
}
function nextLot(campaign) {
  if (!campaign) return null;
  return campaign.lots.find((lot) => !["terminé", "abandonne", "abandonné"].includes(lot.status));
}
function createCampaign() {
  ensureBase();
  const titleIndex = args.indexOf("--title");
  let title = titleIndex >= 0 ? args[titleIndex + 1] : "";
  if (!title && args[1] && !args[1].startsWith("--")) title = args[1];
  if (!title) {
    console.error("Titre requis : --title \"Nom de la campagne\"");
    process.exit(1);
  }
  const lotsCount = Math.max(1, Math.min(12, Number(flag("--lots", "5")) || 5));
  const prefix = flag("--prefix", "LOT");
  const output = flag("--output", baseDir);
  const dirname = `${dateIso()}-${slugify(title)}`;
  const campaignDir = path.join(output, dirname);
  const lotsDir = path.join(campaignDir, "lots");

  if (fs.existsSync(campaignDir) && !has("--force")) {
    console.error(`La campagne existe déjà : ${campaignDir}`);
    process.exit(2);
  }

  const lotNames = ["cadrage", "socle", "implementation", "integration", "validation", "stabilisation", "documentation", "cloture"];
  const lots = Array.from({ length: lotsCount }, (_, i) => ({
    id: `${prefix}-${String(i).padStart(2, "0")}`,
    title: lotNames[i] || `lot-${i}`
  }));

  if (has("--dry-run")) {
    console.log(campaignDir);
    lots.forEach((lot) => console.log(path.join(lotsDir, `${lot.id}-${lot.title}.md`)));
    return;
  }

  fs.mkdirSync(lotsDir, { recursive: true });
  const table = lots.map((lot, i) =>
    `| ${lot.id} | ${lot.title} | à_faire | ${i === 0 ? "—" : lots[i - 1].id} |`
  ).join("\n");

  const campaignText = `---
id: "${dirname}"
titre: "${title.replaceAll('"', "'")}"
statut: "à_faire"
créée_le: "${dateIso()}"
mise_à_jour: "${dateIso()}"
lot_courant: "${lots[0].id}"
---

# ${title}

## Objectif

À compléter depuis le brainstorming.

## Résultat observable

À compléter.

## Contraintes non négociables

- Aucun secret en dur.
- Tous les textes UI en français.
- Aucun patient réel.
- Exemples limités à Sophie Nicola, Jennifer Martin et Michel Dogne.
- Aucune migration Prisma/SQL ou écriture Supabase sans confirmation distincte.
- Changements minimaux.

## Décisions prises

À compléter.

## Questions ouvertes

À compléter.

## Dépendances

À compléter.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
${table}

## Done de campagne

- [ ] Tous les lots requis sont terminés.
- [ ] Les validations sont documentées.
- [ ] La documentation canonique est à jour.
- [ ] Le handoff final est produit.
`;
  fs.writeFileSync(path.join(campaignDir, "CAMPAGNE.md"), campaignText);
  fs.writeFileSync(path.join(campaignDir, "BRIEF.md"), `# Brief — ${title}\n\n## Brainstorming source\n\nÀ compléter.\n\n## Synthèse structurée\n\nÀ compléter.\n`);

  lots.forEach((lot, i) => {
    const depends = i === 0 ? "aucun" : lots[i - 1].id;
    const lotText = `---
id: "${lot.id}"
titre: "${lot.title}"
statut: "à_faire"
dépend_de: "${depends}"
---

# ${lot.id} — ${lot.title}

## But

À compléter.

## Résultat observable

À compléter.

## Périmètre

À compléter.

## Hors périmètre

À compléter.

## Fichiers probables

À compléter.

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.

## Étapes

- [ ] Vérifier les hypothèses.
- [ ] Implémenter le changement minimal.
- [ ] Exécuter les validations.
- [ ] Relire le diff.
- [ ] Documenter les résultats.

## Tests

À compléter.

## Critères de done

À compléter.

## Résultats

À compléter à la clôture.
`;
    fs.writeFileSync(path.join(lotsDir, `${lot.id}-${lot.title}.md`), lotText);
  });

  console.log(`Campagne créée : ${path.relative(cwd, campaignDir)}`);
}
function status() {
  const campaigns = readCampaigns();
  if (!campaigns.length) {
    console.log("Aucune campagne.");
    return;
  }
  for (const c of campaigns) {
    const done = c.lots.filter((l) => l.status === "terminé").length;
    console.log(`${c.name} | ${c.status} | ${done}/${c.lots.length} lots | ${c.title}`);
  }
}
function showNext(quiet = false) {
  const campaign = activeCampaign();
  const lot = nextLot(campaign);
  if (!campaign) {
    if (!quiet) console.log("Aucune campagne.");
    return;
  }
  if (!lot) {
    console.log(`${path.relative(cwd, campaign.dir)} | aucun lot incomplet`);
    return;
  }
  console.log(`${path.relative(cwd, campaign.dir)} | ${lot.file} | ${lot.status}`);
}

switch (command) {
  case "create":
  case "créer":
  case "creer":
    createCampaign();
    break;
  case "next":
    showNext(has("--quiet"));
    break;
  case "status":
  default:
    status();
}
