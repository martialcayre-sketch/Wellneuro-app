// Contrôle d'une classe de défaut que rien d'autre ne voit : un skill qui
// désigne un AUTRE skill non exposé à l'outil `Skill`.
//
// `disable-model-invocation: true` ne restreint pas « l'invocation
// automatique » : il retire le skill de la liste exposée à l'outil `Skill`.
// Une consigne écrite dans le skill A — « passer d'abord par `/wn-B` » — ne
// peut alors pas s'exécuter. La prose reste valide, la capacité est absente,
// et aucune suite de tests ne regarde là.
//
// ── Pourquoi ce garde a été redessiné le 2026-08-04 ─────────────────────────
//
// Les deux premières versions cherchaient un **verbe impératif** dans les 90
// caractères précédant la référence : pas de verbe, pas de constat. C'est un
// **fail-open**, et il a raté trois fois. La troisième était la plus visible :
// six branchements morts vivaient dans `wn-lot` et `wn-finish` sous un CI vert,
// parce qu'ils sont écrits en **titres d'étape nominaux** —
// « 5. **Revue** — `/wn-review` », « 7. **PR** — `/wn-pr` puis `/wn-merge` ».
// Aucun verbe. Une numérotation d'étape EST un impératif ; aucune liste de
// verbes ne l'aurait jamais attrapée, et l'allonger n'aurait fait que déplacer
// le trou.
//
// La règle est donc inversée, et **fail-closed** : toute occurrence d'une
// référence vers un skill non invocable est un constat. Ce qui l'éteint est un
// marqueur EXPLICITE qui **nomme sa cible** — `<!-- mention-seule: wn-review -->`
// —, c'est-à-dire un geste délibéré, relu en diff, qui affirme « ceci s'adresse
// à l'utilisateur, qui tapera la commande ». La charge de la preuve change de
// camp : ce n'est plus au garde de deviner qu'une prose est un ordre, c'est à
// l'auteur de déclarer qu'elle ne l'est pas.
//
// **Le marqueur nomme sa cible depuis le 2026-08-04**, et c'est un correctif de
// revue, pas un raffinement. Un marqueur valant pour la LIGNE entière est un
// blanc-seing local : dans le tableau de classes de `wn-lot`, un marqueur posé
// pour la cellule « Garde particulier » éteignait la cellule « Revue » de la
// même ligne, qui prescrivait `/wn-review` — exactement le branchement mort que
// l'étape 5 venait d'être réécrite pour éviter. Trois refus en découlent :
// un marqueur sans cible, une cible nommée qui n'apparaît pas sur la ligne, et
// une référence dont aucun marqueur ne porte le nom.
//
// Le prix est connu et assumé : les deux routeurs (`/wn`, `/wn-route`) nomment
// des skills à longueur de table, et portent donc un marqueur par cible. C'est
// du bruit à l'écriture — mais du bruit VISIBLE, là où l'ancien silence ne
// coûtait rien à personne jusqu'au jour où une étape ne s'exécutait pas.
//
// Aucune liste d'exemptions en dur, délibérément : le caractère invocable se
// lit dans le frontmatter de la cible (`estInvocableParLeModele`), donc une
// cible dont on lève le drapeau sort du périmètre toute seule. Une liste, elle,
// se périme au premier skill ajouté et redevient un fail-open.
//
// Périmètre : les `SKILL.md` sous `.claude/skills/`, et rien d'autre. `CLAUDE.md`
// et les autres documents citent les mêmes commandes à l'utilisateur ; les y
// soumettre est un autre sujet.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Un BOM et des lignes blanches avant l'ouverture sont tolérés : sans cela, un
// `SKILL.md` enregistré avec un BOM se lisait « sans frontmatter », donc sans
// drapeau, donc invocable — un fail-open silencieux sur un caractère invisible.
const FRONTMATTER = /^\uFEFF?(?:[ \t]*\r?\n)*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

// Une référence `/wn-plan`, `/supabase`… encadrée ou non de backticks. Non
// restreinte à la famille `wn` : le dépôt lie des skills tiers, et une cible
// inconnue est écartée plus bas de toute façon. C'est aussi ce qui évite de
// devoir toucher ce motif le jour où une famille s'ajoute.
//
// Le `/` doit OUVRIR un jeton. Sans cette condition, le motif appariait le
// fragment de chemin `.claude/skills/wn*/SKILL.md` et en extrayait `/wn` : six
// marqueurs du dépôt n'exemptaient ainsi aucune vraie référence, et un marqueur
// qui ne déclare rien ruine la propriété centrale du dessin — « un marqueur =
// une déclaration délibérée, relue en diff ».
const REFERENCE = /(?<![\w.*/-])\/([a-z][a-z0-9-]*)\b/gi;

// Le seul moyen d'éteindre un constat, et il NOMME sa cible :
// `<!-- mention-seule: wn-review -->`, plusieurs cibles séparées par des
// virgules. Commentaire HTML : invisible au rendu markdown, y compris dans une
// cellule de tableau. La forme ancienne — sans cible — est refusée, faute de
// quoi la migration resterait invérifiable et le blanc-seing de ligne
// reviendrait par la porte de derrière.
const MARQUEUR = /<!--\s*mention-seule\s*(?::\s*([^>]*?))?\s*-->/g;

export function separerFrontmatter(texte) {
  const m = FRONTMATTER.exec(texte);
  if (!m) return { frontmatter: "", corps: texte, present: false };
  return { frontmatter: m[1], corps: texte.slice(m[0].length), present: true };
}

// Un `#` en tête de ligne est un commentaire YAML : la mention du drapeau
// dans le bloc « EXCEPTION DÉLIBÉRÉE » de `wn-route` et `wn-reprompt` ne doit
// pas se lire comme le drapeau lui-même.
//
// La VALEUR, elle, se lit largement : `true`, `"true"`, `true # volontaire`.
// Exiger `true` seul et nu était un fail-open, et le plus dangereux du lot —
// le dépôt pratique déjà la convention du commentaire délibéré autour de ce
// drapeau, donc la forme qui débranchait le garde est celle qu'on écrit.
//
// **Les autres booléens vrais de YAML 1.1 comptent aussi** — `yes`, `on`, `y`,
// `1`. Relevé en revue le 2026-08-04 : ne lire que `true` laissait un skill
// étiqueté `disable-model-invocation: yes` passer pour invocable, donc HORS
// périmètre, donc tous ses branchements morts au vert. C'est le même fail-open
// que celui du commentaire de fin de ligne, une forme d'écriture plus loin.
export function estInvocableParLeModele(texte) {
  const { frontmatter } = separerFrontmatter(texte);
  for (const ligne of frontmatter.split(/\r?\n/)) {
    if (/^\s*#/.test(ligne)) continue;
    const m = /^\s*disable-model-invocation\s*:\s*(.*)$/i.exec(ligne);
    if (!m) continue;
    const valeur = m[1]
      .replace(/\s+#.*$/, "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .trim();
    if (/^(?:true|yes|on|y|1)\b/i.test(valeur)) return false;
  }
  return true;
}

/**
 * Les marqueurs d'une ligne, dans l'ordre, avec les cibles que chacun nomme.
 * Une cible peut s'écrire `wn-review` ou `/wn-review` — les deux se lisent.
 * @param {string} ligne
 * @returns {Array<{cibles: string[], brut: string}>}
 */
export function marqueursDeLigne(ligne) {
  const trouves = [];
  MARQUEUR.lastIndex = 0;
  let m;
  while ((m = MARQUEUR.exec(ligne)) !== null) {
    const liste = (m[1] || "")
      .split(",")
      .map((c) => c.trim().replace(/^\//, "").toLowerCase())
      .filter((c) => c !== "");
    trouves.push({ cibles: liste, brut: m[0] });
  }
  return trouves;
}

/** Les cibles nommées par les marqueurs de la ligne, toutes marqueurs confondus. */
export function porteLeMarqueur(ligne, cible) {
  return marqueursDeLigne(ligne).some((mq) => mq.cibles.includes(String(cible).toLowerCase()));
}

/** La ligne débarrassée de ses marqueurs — ce qu'on scanne pour y lire des références. */
function ligneSansMarqueur(ligne) {
  MARQUEUR.lastIndex = 0;
  return ligne.replace(MARQUEUR, " ");
}

/** Les cibles citées sur une ligne, marqueurs exclus. */
function ciblesDeLaLigne(ligne) {
  const vues = new Set();
  const nue = ligneSansMarqueur(ligne);
  REFERENCE.lastIndex = 0;
  let m;
  while ((m = REFERENCE.exec(nue)) !== null) vues.add(m[1].toLowerCase());
  return vues;
}

/**
 * Toutes les références de skill du corps. Une même cible citée deux fois sur
 * la même ligne ne compte qu'une fois : c'est un seul geste d'écriture, et un
 * seul marqueur l'éteint. `marquee` dit si un marqueur de la ligne NOMME cette
 * cible — nommer l'une n'éteint plus l'autre.
 * @param {string} corps
 */
export function referencesDeSkill(corps) {
  const trouvees = [];
  corps.split(/\r?\n/).forEach((ligne, index) => {
    const nommees = new Set(marqueursDeLigne(ligne).flatMap((mq) => mq.cibles));
    for (const cible of ciblesDeLaLigne(ligne)) {
      trouvees.push({
        cible,
        ligne: index + 1,
        texte: ligne.trim(),
        marquee: nommees.has(cible),
      });
    }
  });
  return trouvees;
}

/**
 * Les marqueurs mal formés du corps : sans cible (forme ancienne, blanc-seing
 * de ligne), ou nommant une cible qui n'apparaît pas sur la ligne — auquel cas
 * le marqueur ne déclare rien et redevient du bruit.
 * @param {string} corps
 * @returns {Array<{genre: string, ligne: number, texte: string, message: string}>}
 */
export function defautsDeMarqueur(corps) {
  const defauts = [];
  corps.split(/\r?\n/).forEach((ligne, index) => {
    const marqueurs = marqueursDeLigne(ligne);
    if (marqueurs.length === 0) return;
    const presentes = ciblesDeLaLigne(ligne);
    for (const mq of marqueurs) {
      if (mq.cibles.length === 0) {
        defauts.push({
          genre: "marqueur-sans-cible",
          ligne: index + 1,
          texte: ligne.trim(),
          message:
            `le marqueur ${mq.brut} ne nomme aucune cible — un marqueur vaut pour la cible ` +
            `qu'il nomme, pas pour la ligne : écrire <!-- mention-seule: wn-x -->.`,
        });
        continue;
      }
      for (const cible of mq.cibles) {
        if (presentes.has(cible)) continue;
        defauts.push({
          genre: "cible-absente",
          ligne: index + 1,
          texte: ligne.trim(),
          message:
            `le marqueur nomme /${cible}, qui n'apparaît pas sur cette ligne — ` +
            `un marqueur qui n'exempte rien est un blanc-seing en attente.`,
        });
      }
    }
  });
  return defauts;
}

/**
 * @param {Array<{nom: string, texte: string}>} skills
 * @returns {{violations: Array, scannes: number, cibles: number, marquees: number}}
 */
export function auditerSkills(skills) {
  const invocable = new Map();
  const violations = [];
  for (const { nom, texte } of skills) {
    const { present } = separerFrontmatter(texte);
    // Un frontmatter absent ou non refermé se disait « pas de drapeau », donc
    // « invocable », donc hors périmètre : tout branchement vers cette cible
    // devenait vert. Refuser de l'auditer est un CONSTAT, jamais un silence —
    // et la cible est tenue pour non invocable en attendant, faute de quoi le
    // refus lui-même rouvrirait le trou qu'il signale.
    if (!present) {
      violations.push({
        genre: "frontmatter",
        source: nom,
        cible: null,
        ligne: 1,
        texte: "",
        message:
          `frontmatter absent ou non refermé — impossible de lire ` +
          `disable-model-invocation, donc impossible de dire si cette cible s'invoque.`,
      });
    }
    invocable.set(nom, present ? estInvocableParLeModele(texte) : false);
  }

  let marquees = 0;
  for (const { nom, texte } of skills) {
    const { corps } = separerFrontmatter(texte);
    // Les numéros rendus sont ceux du FICHIER, pas du corps : un constat qui
    // désigne « SKILL.md:49 » quand la ligne fautive est la 60 fait chercher.
    const decalage = texte.split(/\r?\n/).length - corps.split(/\r?\n/).length;
    for (const d of defautsDeMarqueur(corps)) {
      violations.push({
        genre: d.genre,
        source: nom,
        cible: null,
        ligne: d.ligne + decalage,
        texte: d.texte,
        message: d.message,
      });
    }
    for (const ref of referencesDeSkill(corps)) {
      // Une cible inconnue du dépôt n'est pas notre affaire : un skill peut
      // citer une commande qui n'est pas un skill de cette famille.
      if (!invocable.has(ref.cible)) continue;
      // S'auto-citer ne demande aucune invocation.
      if (ref.cible === nom) continue;
      // Une cible exposée à l'outil `Skill` s'invoque : rien à signaler.
      if (invocable.get(ref.cible)) continue;
      if (ref.marquee) {
        marquees += 1;
        continue;
      }
      violations.push({
        genre: "reference",
        source: nom,
        cible: ref.cible,
        ligne: ref.ligne + decalage,
        texte: ref.texte,
        message:
          `désigne /${ref.cible}, qui porte disable-model-invocation : aucune invocation ` +
          `n'est possible depuis un skill.`,
      });
    }
  }

  return {
    violations,
    scannes: skills.length,
    cibles: [...invocable.values()].filter(Boolean).length,
    marquees,
  };
}

export function lireSkills(racine) {
  const dir = path.join(racine, ".claude/skills");
  if (!fs.existsSync(dir)) return [];
  const skills = [];
  for (const nom of fs.readdirSync(dir)) {
    const fichier = path.join(dir, nom, "SKILL.md");
    if (!fs.existsSync(fichier)) continue;
    skills.push({ nom, texte: fs.readFileSync(fichier, "utf8") });
  }
  return skills;
}

// Exécuté directement : le contrôle bloquant du CI. Il refuse d'être vert sur
// zéro skill lu — un scan qui ne trouve rien rendrait « aucune violation »,
// c'est-à-dire la même sortie qu'un dépôt sain.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const skills = lireSkills(process.cwd());
  if (skills.length === 0) {
    console.error("✗ Aucun skill lu sous .claude/skills — contrôle sans objet, refus d'être vert.");
    process.exit(2);
  }
  const { violations, scannes, marquees } = auditerSkills(skills);
  for (const v of violations) {
    console.error(`✗ .claude/skills/${v.source}/SKILL.md:${v.ligne} — ${v.message}`);
    if (v.texte) console.error(`  ${v.texte}`);
  }
  if (violations.length > 0) {
    console.error(
      `\n→ Deux issues, et deux seulement : réécrire l'étape en disant ce qu'elle doit PRODUIRE ` +
        `(le skill s'invoquant à la main), ou — si la ligne s'adresse à l'utilisateur et ne ` +
        `commande rien — y poser le marqueur <!-- mention-seule: nom-du-skill -->, qui NOMME ` +
        `la cible qu'il exempte et elle seule.`,
    );
    process.exit(1);
  }
  console.log(
    `OK : ${scannes} skills, aucune référence non marquée vers une cible non exposée ` +
      `(${marquees} mention(s) déclarée(s)).`,
  );
}
