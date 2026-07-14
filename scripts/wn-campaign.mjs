#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const command = args[0] || "status";
const cwd = process.cwd();
const baseDir = path.join(cwd, "docs", "claude", "campagnes");
const generatedNames = new Set([
  "BRIEF.md",
  "BRIEF_COMPILED.md",
  "CAMPAGNE.md",
  "CAMPAIGN_DRAFT.md",
  "CAMPAIGN_META.json"
]);
const defaultBrainstorm = (title) => `# Brainstorm - ${title}

## Intention metier

- A completer.

## Utilisateurs concernes

- Praticien.
- Patient.

## Idees brutes

- A completer.

## Contraintes

- UI en francais.
- Changements minimaux.
- Pas de secret en dur.
- Pas de migration sans validation explicite.

## Questions ouvertes

- A completer.
`;
const sectionKeywords = {
  intention: ["objectif", "intention", "vision", "but", "finalite", "ambition"],
  probleme: ["probleme", "douleur", "pain", "blocage", "friction", "limite", "besoin"],
  utilisateurs: ["utilisateur", "patient", "praticien", "admin", "medecin", "equipe"],
  parcours: ["parcours", "workflow", "scenario", "etape", "flux", "navigation"],
  fonctionnalites: ["fonction", "fonctionnalite", "module", "ecran", "bouton", "filtre", "pdf", "export", "recherche"],
  donnees: ["donnee", "modele", "table", "prisma", "supabase", "api", "integration", "base", "registre"],
  contraintes: ["contrainte", "securite", "secret", "rgpd", "migration", "langue", "francais", "legacy"],
  risques: ["risque", "dependance", "incertitude", "attention", "danger", "bloquant"],
  decisions: ["decision", "choix", "arbitrage", "question", "confirmer", "decider"]
};

function flag(name, fallback = undefined) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
function has(name) {
  return args.includes(name);
}
function normalizeSpaces(value) {
  return value.replace(/\s+/g, " ").trim();
}
function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---", 4);
  if (end < 0) return {};
  const block = text.slice(4, end);
  const data = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    value = value.replace(/^['\"]/, "").replace(/['\"]$/, "");
    data[key] = value;
  }
  return data;
}
function lotBranchName(campaignBranch, lotId) {
  const suffix = String(lotId || "lot-00").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (campaignBranch.endsWith("/integration")) {
    return `${campaignBranch.slice(0, -"/integration".length)}/${suffix}`;
  }
  return `${campaignBranch}/${suffix}`;
}
function defaultCampaignBranch(campaignId) {
  return `campaign/${campaignId}/integration`;
}
function normalizeStatus(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function isDoneStatus(value) {
  return normalizeStatus(value).startsWith("termine");
}
function isAbandonedStatus(value) {
  return normalizeStatus(value).startsWith("abandon");
}
function isClosedStatus(value) {
  return isDoneStatus(value) || isAbandonedStatus(value);
}
function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "campagne";
}
function dateIso() {
  return new Date().toISOString().slice(0, 10);
}
function ensureBase() {
  fs.mkdirSync(baseDir, { recursive: true });
}
function firstHeading(text, fallback) {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("#")) {
      const heading = normalizeSpaces(trimmed.replace(/^#+\s*/, ""));
      if (heading) return heading;
    }
  }
  return fallback;
}
function inferTitleFromSource(sourceDir) {
  if (!sourceDir || !fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) return "";
  const stack = [sourceDir];
  const mdFiles = [];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md") && !generatedNames.has(entry.name)) mdFiles.push(full);
    }
  }
  mdFiles.sort((a, b) => a.localeCompare(b));
  for (const file of mdFiles) {
    const text = fs.readFileSync(file, "utf8");
    const heading = firstHeading(text, "");
    if (heading) return heading;
  }
  return normalizeSpaces(path.basename(sourceDir).replace(/[-_]+/g, " "));
}
function resolvedCreateTitle() {
  const fromFlag = flag("--title", "");
  if (fromFlag) return fromFlag;
  const firstArg = args[1];
  if (firstArg && !firstArg.startsWith("--")) return firstArg;
  const sourceDir = flag("--source", "");
  if (sourceDir) {
    const inferred = inferTitleFromSource(path.resolve(sourceDir));
    if (inferred) return inferred;
  }
  return "";
}
function shouldPrefixDate() {
  if (has("--prefix-date")) return true;
  if (has("--no-prefix-date")) return false;
  return true;
}
function buildCampaignName(title) {
  const explicitSlug = flag("--slug", "");
  const rawSlug = explicitSlug ? slugify(explicitSlug) : slugify(title);
  return shouldPrefixDate() ? `${dateIso()}-${rawSlug}` : rawSlug;
}
function isMarkdown(file) {
  return file.toLowerCase().endsWith(".md");
}
function copySourceMarkdown(sourceDir, campaignDir, overwrite) {
  if (!sourceDir) return [];
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Dossier source introuvable : ${sourceDir}`);
  }
  const copied = [];
  const targetRoot = path.join(campaignDir, "sources");
  const stack = [sourceDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.isFile() || !isMarkdown(entry.name) || generatedNames.has(entry.name)) continue;
      const rel = path.relative(sourceDir, full);
      const target = path.join(targetRoot, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (fs.existsSync(target) && !overwrite) continue;
      fs.copyFileSync(full, target);
      copied.push(target);
    }
  }
  copied.sort((a, b) => a.localeCompare(b));
  return copied;
}
function ensureSeedIfEmpty(campaignDir, title, overwrite = false) {
  const existing = collectSourceDocs(campaignDir);
  const seedPath = path.join(campaignDir, "00_brainstorm.md");
  if (existing.length && !overwrite) return null;
  if (fs.existsSync(seedPath) && !overwrite) return seedPath;
  fs.writeFileSync(seedPath, defaultBrainstorm(title), "utf8");
  return seedPath;
}
function bestBucket(text, fallback = "autres") {
  const low = text.toLowerCase();
  let best = { key: fallback, score: 0 };
  for (const [key, words] of Object.entries(sectionKeywords)) {
    const score = words.reduce((acc, word) => acc + (low.includes(word) ? 1 : 0), 0);
    if (score > best.score) best = { key, score };
  }
  return best.score ? best.key : fallback;
}
function collectSourceDocs(campaignDir) {
  const docs = [];
  const stack = [campaignDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "lots") continue;
        stack.push(full);
        continue;
      }
      if (!entry.isFile() || !isMarkdown(entry.name) || generatedNames.has(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      docs.push({
        path: full,
        title: firstHeading(text, path.basename(full, ".md")),
        text
      });
    }
  }
  docs.sort((a, b) => a.path.localeCompare(b.path));
  return docs;
}
function classifyDocs(docs) {
  const buckets = {
    intention: [],
    probleme: [],
    utilisateurs: [],
    parcours: [],
    fonctionnalites: [],
    donnees: [],
    contraintes: [],
    risques: [],
    decisions: [],
    autres: []
  };
  const seen = new Set();
  for (const doc of docs) {
    let currentBucket = "autres";
    let currentHeading = "";
    for (const rawLine of doc.text.split(/\r?\n/)) {
      const line = normalizeSpaces(rawLine);
      if (!line) continue;
      if (rawLine.trimStart().startsWith("#")) {
        currentHeading = line.replace(/^#+\s*/, "");
        currentBucket = bestBucket(currentHeading, currentBucket);
        continue;
      }
      const bulletLike = rawLine.trimStart().startsWith("-") || rawLine.trimStart().startsWith("*");
      if (!bulletLike && (line.length < 30 || line.length > 260)) continue;
      const target = bestBucket(`${currentHeading} ${line}`, currentBucket);
      const content = line.replace(/^[-*]\s+/, "");
      const rel = path.relative(cwd, doc.path);
      const item = `- ${content} (${rel})`;
      const key = item.toLowerCase().replace(/\W+/g, "").slice(0, 180);
      if (seen.has(key)) continue;
      seen.add(key);
      if (buckets[target].length < 80) buckets[target].push(item);
    }
  }
  return buckets;
}
function renderSection(title, items) {
  const body = items.length ? items.join("\n") : "- A completer.";
  return `## ${title}\n\n${body}\n`;
}
function writeBriefCompiled(campaignDir, campaignName, docs, buckets) {
  const relCampaignDir = path.relative(cwd, campaignDir);
  const sourceList = docs.length
    ? docs.map((doc) => `- ${path.relative(cwd, doc.path)} - ${doc.title}`).join("\n")
    : "- Aucun fichier source trouve.";
  const text = `# Brief compile - ${campaignName}\n\n_Genere le ${dateIso()} par scripts/wn-campaign.mjs._\n\n## Identite de campagne\n\n- Dossier campagne : ${relCampaignDir}\n- Fichier final : ${path.relative(cwd, path.join(campaignDir, "CAMPAGNE.md"))}\n\n## Sources compilees\n\n${sourceList}\n\n${renderSection("1. Intention metier", buckets.intention)}\n${renderSection("2. Probleme a resoudre", buckets.probleme)}\n${renderSection("3. Utilisateurs concernes", buckets.utilisateurs)}\n${renderSection("4. Parcours cible", buckets.parcours)}\n${renderSection("5. Fonctionnalites candidates", buckets.fonctionnalites)}\n${renderSection("6. Donnees / modeles / integrations pressenties", buckets.donnees)}\n${renderSection("7. Contraintes projet", buckets.contraintes)}\n${renderSection("8. Risques et dependances", buckets.risques)}\n${renderSection("9. Decisions a prendre", buckets.decisions)}\n## 10. Decoupage recommande\n\n- R0 : audit de l'existant et clarification du perimetre, sans modification.\n- R1 : contrat fonctionnel, UX et checklist E2E.\n- R2 : tranche verticale minimale sur le scenario principal.\n- R3 : donnees / integrations / persistance, apres validation du besoin.\n- R4 : compatibilite legacy et cas limites.\n- R5 : UI, durcissement, securite et accessibilite.\n- R6 : tests, documentation et decision go/no-go.\n\n## Materiau non classe a relire\n\n${buckets.autres.length ? buckets.autres.slice(0, 100).join("\n") : "- Aucun."}\n`;
  fs.writeFileSync(path.join(campaignDir, "BRIEF_COMPILED.md"), text, "utf8");
}
function lotDraftBlock(index, title, objective) {
  return `## R${index} - ${title}\n\n### Objectif\n\n${objective}\n\n### Perimetre autorise\n\n- A preciser a partir du brief compile.\n\n### Hors perimetre\n\n- Refactor global.\n- Modifications non necessaires au lot.\n- Migrations non confirmees explicitement.\n\n### Fichiers probables a lire\n\n- A identifier au debut du lot.\n\n### Fichiers modifiables pressentis\n\n- A preciser apres R0/R1.\n\n### Criteres d'acceptation\n\n- Critere observable a completer.\n- Le lot reste limite au perimetre annonce.\n- Les interdits globaux sont respectes.\n\n### Risques / points de vigilance\n\n- Risque de perimetre trop large.\n- Verifier les impacts legacy avant modification.\n\n### Commandes de verification\n\n\`\`\`bash\n# A confirmer selon le repo apres R0\ncd web && npm run type-check\n\`\`\`\n\n---\n`;
}
function writeCampaignDraft(campaignDir, campaignName) {
  const blocks = [
    lotDraftBlock(0, "Audit / cadrage sans modification", "Identifier l'existant, les fichiers concernes et les incertitudes, sans modifier le code."),
    lotDraftBlock(1, "Contrat fonctionnel / UX / E2E", "Definir le comportement attendu, les scenarios, les etats et les criteres d'acceptation."),
    lotDraftBlock(2, "Tranche verticale minimale", "Livrer le scenario principal avec le plus petit nombre de changements."),
    lotDraftBlock(3, "Donnees / integrations / persistance", "Brancher les donnees et integrations necessaires apres validation du flux minimal."),
    lotDraftBlock(4, "Compatibilite / legacy / cas limites", "Securiser les anciens flux, fallbacks, redirections et cas limites."),
    lotDraftBlock(5, "UI / durcissement / securite", "Ameliorer les messages, validations, accessibilite et garde-fous."),
    lotDraftBlock(6, "Tests / documentation / go-no-go", "Verifier le build, la coherence fonctionnelle et documenter la decision."),
  ];
  const text = `# Campagne WellNeuro - ${campaignName}\n\n_Draft genere le ${dateIso()} par scripts/wn-campaign.mjs._\n\n## Objectif general\n\nA completer a partir de BRIEF_COMPILED.md.\n\n## Contexte\n\nA completer : etat actuel, decision de depart, dependances, hypotheses.\n\n## Contraintes globales\n\n- UI en francais.\n- Aucun secret en dur.\n- Aucune donnee patient reelle.\n- Exemples limites a Sophie Nicola, Jennifer Martin et Michel Dogne.\n- Aucune migration Prisma/SQL ou ecriture Supabase sans confirmation distincte.\n- Changements minimaux.\n\n## Hors perimetre global\n\n- Refactor large sans demande explicite.\n\n## Backlog ulterieur\n\n- A completer.\n\n---\n\n${blocks.join("\n")}\n`;
  fs.writeFileSync(path.join(campaignDir, "CAMPAIGN_DRAFT.md"), text, "utf8");
}
function writeCampaignMeta(campaignDir, campaignName, sourceDir, docs) {
  const meta = {
    title: campaignName,
    generatedAt: new Date().toISOString(),
    campaignDir: path.relative(cwd, campaignDir),
    sourceDir: sourceDir ? path.relative(cwd, sourceDir) : null,
    sourceFiles: docs.map((doc) => path.relative(cwd, doc.path))
  };
  fs.writeFileSync(path.join(campaignDir, "CAMPAIGN_META.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
}
function writeActiveCampaign(campaignName) {
  fs.writeFileSync(path.join(baseDir, "ACTIVE_CAMPAIGN.md"), `${campaignName}\n`, "utf8");
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
      const frontmatter = parseFrontmatter(text);
      const status = frontmatter.statut || text.match(/^statut:\s*"?([^"\n]+)"?/m)?.[1] || "inconnu";
      const title = frontmatter.titre || text.match(/^#\s+(.+)$/m)?.[1] || entry.name;
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
      return {
        dir,
        name: entry.name,
        status,
        title,
        lots: lotData,
        lotCourant: frontmatter.lot_courant || "",
        brancheCampagne: frontmatter.branche_campagne || "",
        brancheLotCourant: frontmatter.branche_lot_courant || "",
        ciblePrLot: frontmatter.cible_pr_lot || "",
        ciblePrCampagne: frontmatter.cible_pr_campagne || ""
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.name.localeCompare(a.name));
}
function activeCampaign() {
  const campaigns = readCampaigns();
  return campaigns.find((c) => !isClosedStatus(c.status) && c.lots.length > 0)
    || campaigns.find((c) => !isClosedStatus(c.status))
    || campaigns[0];
}
function nextLot(campaign) {
  if (!campaign) return null;
  return campaign.lots.find((lot) => !isClosedStatus(lot.status));
}
function createCampaign() {
  ensureBase();
  const title = resolvedCreateTitle();
  if (!title) {
    console.error("Titre requis : --title \"Nom de la campagne\" ou un nom libre en argument.");
    process.exit(1);
  }
  const sourceDirFlag = flag("--source", "");
  const sourceDir = sourceDirFlag ? path.resolve(sourceDirFlag) : "";
  const initOnly = has("--init-only");
  const autoFinal = has("--auto-final") || !initOnly;
  const activate = has("--activate");
  const overwrite = has("--overwrite") || has("--force");
  const lotsCount = Math.max(1, Math.min(12, Number(flag("--lots", "5")) || 5));
  const prefix = flag("--prefix", "LOT");
  const output = flag("--output", baseDir);
  const dirname = buildCampaignName(title);
  const campaignDir = path.join(output, dirname);
  const lotsDir = path.join(campaignDir, "lots");

  if (fs.existsSync(campaignDir) && !overwrite) {
    console.error(`La campagne existe déjà : ${campaignDir}`);
    process.exit(2);
  }

  if (activate && !autoFinal) {
    console.error("--activate nécessite une campagne finale (utiliser --auto-final ou retirer --init-only).");
    process.exit(5);
  }

  const lotNames = ["cadrage", "socle", "implementation", "integration", "validation", "stabilisation", "documentation", "cloture"];
  const lots = Array.from({ length: lotsCount }, (_, i) => ({
    id: `${prefix}-${String(i).padStart(2, "0")}`,
    title: lotNames[i] || `lot-${i}`
  }));

  if (has("--dry-run")) {
    console.log(campaignDir);
    console.log(path.join(campaignDir, "BRIEF_COMPILED.md"));
    console.log(path.join(campaignDir, "CAMPAIGN_DRAFT.md"));
    if (autoFinal) {
      console.log(path.join(campaignDir, "CAMPAGNE.md"));
    }
    lots.forEach((lot) => console.log(path.join(lotsDir, `${lot.id}-${lot.title}.md`)));
    if (activate) {
      console.log(path.join(baseDir, "ACTIVE_CAMPAIGN.md"));
    }
    return;
  }

  fs.mkdirSync(campaignDir, { recursive: true });

  let copied = [];
  if (sourceDir) {
    try {
      copied = copySourceMarkdown(sourceDir, campaignDir, overwrite);
    } catch (error) {
      console.error(error.message);
      process.exit(3);
    }
  }

  let seedPath = null;
  let docs = collectSourceDocs(campaignDir);
  if (!docs.length || initOnly) {
    seedPath = ensureSeedIfEmpty(campaignDir, title, overwrite);
    docs = collectSourceDocs(campaignDir);
  }
  const buckets = classifyDocs(docs);
  writeBriefCompiled(campaignDir, title, docs, buckets);
  writeCampaignDraft(campaignDir, title);
  writeCampaignMeta(campaignDir, title, sourceDir || null, docs);

  if (!autoFinal) {
    console.log(`Campagne initialisée : ${path.relative(cwd, campaignDir)}`);
    if (sourceDir) console.log(`Sources importées : ${copied.length}`);
    if (seedPath) console.log(`Canevas brainstorming : ${path.relative(cwd, seedPath)}`);
    console.log(`Brief compilé : ${path.relative(cwd, path.join(campaignDir, "BRIEF_COMPILED.md"))}`);
    console.log(`Draft campagne : ${path.relative(cwd, path.join(campaignDir, "CAMPAIGN_DRAFT.md"))}`);
    console.log("Campagne finale non créée (utiliser --auto-final).");
    return;
  }

  fs.mkdirSync(lotsDir, { recursive: true });
  const table = lots.map((lot, i) =>
    `| ${lot.id} | ${lot.title} | à_faire | ${i === 0 ? "—" : lots[i - 1].id} |`
  ).join("\n");

  const campaignBranch = defaultCampaignBranch(dirname);
  const campaignText = `---
id: "${dirname}"
titre: "${title.replaceAll('"', "'")}"
statut: "à_faire"
créée_le: "${dateIso()}"
mise_à_jour: "${dateIso()}"
lot_courant: "${lots[0].id}"
branche_campagne: "${campaignBranch}"
branche_lot_courant: "${lotBranchName(campaignBranch, lots[0].id)}"
cible_pr_lot: "${campaignBranch}"
cible_pr_campagne: "main"
---

# ${title}

## Objectif

À compléter depuis BRIEF_COMPILED.md.

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

## Artefacts de préparation

- BRIEF_COMPILED.md : synthèse structurée des sources.
- CAMPAIGN_DRAFT.md : canevas R0→R6.

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
  fs.writeFileSync(path.join(campaignDir, "BRIEF.md"), `# Brief — ${title}\n\n## Brainstorming source\n\nVoir BRIEF_COMPILED.md.\n\n## Synthèse structurée\n\nVoir CAMPAIGN_DRAFT.md.\n`);

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

  if (activate) {
    writeActiveCampaign(dirname);
  }

  console.log(`Campagne créée : ${path.relative(cwd, campaignDir)}`);
  if (sourceDir) console.log(`Sources importées : ${copied.length}`);
  if (seedPath) console.log(`Canevas brainstorming : ${path.relative(cwd, seedPath)}`);
  console.log(`Brief compilé : ${path.relative(cwd, path.join(campaignDir, "BRIEF_COMPILED.md"))}`);
  console.log(`Draft campagne : ${path.relative(cwd, path.join(campaignDir, "CAMPAIGN_DRAFT.md"))}`);
  if (activate) console.log(`Campagne active : ${path.relative(cwd, path.join(baseDir, "ACTIVE_CAMPAIGN.md"))}`);
}
function status() {
  const campaigns = readCampaigns();
  if (!campaigns.length) {
    console.log("Aucune campagne.");
    return;
  }
  for (const c of campaigns) {
    const done = c.lots.filter((l) => isDoneStatus(l.status)).length;
    console.log(`${c.name} | ${c.status} | ${done}/${c.lots.length} lots | ${c.title}`);
    const gitInfo = [
      c.brancheCampagne ? `campagne=${c.brancheCampagne}` : "",
      c.brancheLotCourant ? `lot=${c.brancheLotCourant}` : "",
      c.ciblePrLot ? `pr_lot->${c.ciblePrLot}` : "",
      c.ciblePrCampagne ? `pr_campagne->${c.ciblePrCampagne}` : ""
    ].filter(Boolean);
    if (gitInfo.length) {
      console.log(`  git | ${gitInfo.join(" | ")}`);
    }
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
  const lotBranch = campaign.brancheLotCourant || (campaign.brancheCampagne ? lotBranchName(campaign.brancheCampagne, lot.file.split("-").slice(0, 2).join("-")) : "");
  const targetBranch = campaign.ciblePrLot || campaign.brancheCampagne;
  const extras = [
    lotBranch ? `branche_lot=${lotBranch}` : "",
    targetBranch ? `cible_pr_lot=${targetBranch}` : ""
  ].filter(Boolean).join(" | ");
  if (extras) {
    console.log(`${path.relative(cwd, campaign.dir)} | ${lot.file} | ${lot.status} | ${extras}`);
    return;
  }
  console.log(`${path.relative(cwd, campaign.dir)} | ${lot.file} | ${lot.status}`);
}

switch (command) {
  case "create":
  case "créer":
  case "creer":
  case "init":
    createCampaign();
    break;
  case "next":
    showNext(has("--quiet"));
    break;
  case "status":
  default:
    status();
}
