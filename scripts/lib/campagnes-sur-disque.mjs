// Lecture des campagnes sur disque — `docs/claude/campagnes/*/CAMPAGNE.md`.
//
// Extrait de `scripts/wn-campaign.mjs`, qui en est resté le seul appelant
// pendant longtemps. Le garde de cohérence de `scripts/wn-etat-reel.mjs` en a
// besoin lui aussi : il régénère la vue `ACTIVE_CAMPAIGN.md` pour la comparer
// au fichier écrit, et deux lecteurs différents rendraient cette comparaison
// fausse au premier écart de forme. Une première version du garde
// ré-implémentait la lecture ; elle divergeait sur quatre points (descente de
// l'arborescence, `id:` du front matter contre nom de dossier, repli du titre
// sur le `# H1`, dépouillement des guillemets simples). Aucun n'était rouge le
// jour de son écriture — par chance, pas par construction : le premier dossier
// dont le nom aurait différé de son `id:` faisait rougir un banc sur un fichier
// que `sync` venait d'écrire, avec un message conseillant une resynchronisation
// qui n'aurait rien changé.

import fs from "node:fs";
import path from "node:path";

/**
 * Front matter YAML minimal : lignes `clé: valeur` du premier bloc `---`.
 * Borné au bloc — un `titre:` apparaissant dans le corps du document ne doit
 * pas être lu comme une métadonnée.
 */
export function parseFrontmatter(text) {
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

/**
 * Toutes les campagnes sous `baseDir`, triées par nom décroissant.
 * Un `baseDir` absent rend `[]` — jamais une exception : ce lecteur sert des
 * scripts d'observation qui ne doivent pas échouer sur un dépôt incomplet.
 */
export function lireCampagnesSurDisque(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  const campaigns = [];
  const stack = [baseDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (!entry.isDirectory()) continue;
      if (entry.name === "lots") continue;
      stack.push(full);
      const campaign = path.join(full, "CAMPAGNE.md");
      if (!fs.existsSync(campaign)) continue;
      const text = fs.readFileSync(campaign, "utf8");
      const frontmatter = parseFrontmatter(text);
      const status = frontmatter.statut || text.match(/^statut:\s*"?([^"\n]+)"?/m)?.[1] || "inconnu";
      const title = frontmatter.titre || text.match(/^#\s+(.+)$/m)?.[1] || entry.name;
      const lotsDir = path.join(full, "lots");
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
      campaigns.push({
        dir: full,
        name: frontmatter.id || entry.name,
        status,
        title,
        lots: lotData,
        lotCourant: frontmatter.lot_courant || "",
        brancheCampagne: frontmatter.branche_campagne || "",
        brancheLotCourant: frontmatter.branche_lot_courant || "",
        ciblePrLot: frontmatter.cible_pr_lot || "",
        ciblePrCampagne: frontmatter.cible_pr_campagne || ""
      });
    }
  }
  return campaigns.sort((a, b) => b.name.localeCompare(a.name));
}
