import { scinderSousPlafond } from '@/lib/clinical/vigilanceLongueur';

// Mise en forme déterministe du contexte clinique patient (fiche signalétique +
// anamnèse) pour nourrir la synthèse IA du premier bilan.
//
// Analogue à `lib/scoring/miniSynthese.ts` : purement déterministe, aucune
// logique clinique nouvelle, typage défensif (les JSON stockés en base ne sont
// pas garantis conformes aux schémas). On ne fait que reformater en texte
// lisible ce que le patient a saisi via le portail.

// ─── helpers de lecture défensive ───────────────────────────────────────────

export function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

// Neutralisation pour le prompt (revue de sécurité du 2026-08-22, constat M —
// injection de prompt par les champs libres) : les chevrons perdent leur
// pouvoir de forger un délimiteur (`<donnees_declaratives_patient>` et tout
// autre balisage), les sauts de ligne celui d'injecter une structure Markdown
// (`## Résultats…`) dans le message. Le texte reste lisible — seuls les
// caractères porteurs de structure sont remplacés par leurs homoglyphes.
function neutraliser(s: string): string {
  return s
    .replace(/</g, '‹')
    .replace(/>/g, '›')
    // Tous les séparateurs de ligne, pas seulement CR/LF : U+2028 (LS),
    // U+2029 (PS), U+0085 (NEL) et U+000B (VT) sont traités comme des sauts
    // de ligne par certains rendus — les laisser passer rouvrirait
    // l'injection de section (revue adversariale, constat L1).
    .replace(/\s*[\r\n\u000B\u0085\u2028\u2029]+\s*/g, ' — ');
}

// Troncature par POINTS DE CODE, pas par unités UTF-16 : un `slice` nu peut
// couper un émoji en deux et laisser un surrogate orphelin que l'appel API
// rejette (revue adversariale, constat L4).
function tronquer(s: string, max: number): string {
  return [...s].slice(0, max).join('');
}

// Chaîne non vide, tronquée par sécurité, neutralisée pour le prompt.
export function texte(v: unknown, max = 2000): string {
  return typeof v === 'string' && v.trim() ? neutraliser(tronquer(v.trim(), max)) : '';
}

// Liste de libellés (checkbox-multi) — les valeurs stockées viennent des
// définitions de questionnaires, mais le JSON en base n'est pas garanti
// conforme : neutralisées aussi, par le même chemin.
export function liste(v: unknown, max = 50): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .slice(0, max)
    .map((x) => neutraliser(x.trim()));
}

// Entrées d'un groupe répétable (médicaments, compléments).
function entrees(v: unknown, max = 20): Array<Record<string, string>> {
  if (!Array.isArray(v)) return [];
  const out: Array<Record<string, string>> = [];
  for (const brut of v.slice(0, max)) {
    const rec = asRecord(brut);
    const entree: Record<string, string> = {};
    for (const [k, val] of Object.entries(rec)) {
      if (typeof val === 'string' && val.trim()) entree[k] = neutraliser(tronquer(val.trim(), 500));
    }
    if (Object.keys(entree).length) out.push(entree);
  }
  return out;
}

// IMC déterministe si taille (cm) et poids (kg) sont parsables et plausibles.
function calculImc(taille: string, poids: string): string | null {
  const t = parseFloat(taille.replace(',', '.'));
  const p = parseFloat(poids.replace(',', '.'));
  if (!Number.isFinite(t) || !Number.isFinite(p)) return null;
  if (t < 100 || t > 250 || p < 20 || p > 400) return null; // garde-fous plage plausible (taille en cm)
  const imc = p / ((t / 100) * (t / 100));
  if (!Number.isFinite(imc) || imc < 8 || imc > 100) return null;
  return imc.toFixed(1);
}

// Ajoute « Label : valeur » à un accumulateur de lignes si la valeur est non vide.
function pousser(lignes: string[], label: string, valeur: string): void {
  if (valeur) lignes.push(`- ${label} : ${valeur}`);
}

// ─── contexte clinique lisible ──────────────────────────────────────────────

/**
 * Construit un bloc texte français structuré à partir de la fiche signalétique
 * et de l'anamnèse (cœur clinique uniquement). Retourne '' si aucune matière
 * exploitable. On écarte volontairement le bruit administratif (composition du
 * foyer, nombre d'enfants).
 */
export function buildContexteClinique(fiche: unknown, anamnese: unknown): string {
  const f = asRecord(fiche);
  const a = asRecord(anamnese);
  const sections: string[] = [];

  // Motif et attentes
  {
    const lignes: string[] = [];
    pousser(lignes, 'Motif principal', texte(a.motif_principal));
    pousser(lignes, 'Objectif prioritaire', texte(a.objectif_prioritaire));
    const attentes = liste(a.attentes);
    if (attentes.length) pousser(lignes, 'Attentes', attentes.join(', '));
    if (lignes.length) sections.push(`### Motif et attentes\n${lignes.join('\n')}`);
  }

  // Histoire des troubles
  {
    const lignes: string[] = [];
    pousser(lignes, 'Début', texte(a.debut));
    pousser(lignes, 'Depuis', texte(a.debut_date));
    pousser(lignes, 'Événement déclencheur', texte(a.declencheur));
    pousser(lignes, 'Évolution', texte(a.evolution));
    pousser(lignes, 'Ce qui améliore', texte(a.facteurs_ameliorent));
    pousser(lignes, 'Ce qui aggrave', texte(a.facteurs_aggravent));
    const facteurs = liste(a.facteurs_declenchants);
    if (facteurs.length) pousser(lignes, 'Facteurs de la période de début', facteurs.join(', '));
    const symptomesFonctionnels = liste(a.symptomes_fonctionnels);
    if (symptomesFonctionnels.length) pousser(lignes, 'Difficultés fonctionnelles', symptomesFonctionnels.join(', '));
    if (lignes.length) sections.push(`### Histoire des troubles\n${lignes.join('\n')}`);
  }

  // Antécédents
  {
    const lignes: string[] = [];
    const domaines = liste(a.antecedents_domaines);
    if (domaines.length) pousser(lignes, 'Domaines', domaines.join(', '));
    pousser(lignes, 'Précisions', texte(a.antecedents_details));
    pousser(lignes, 'Chirurgies / hospitalisations', texte(a.chirurgies));
    pousser(lignes, 'Allergies / intolérances', texte(a.allergies));
    const intolerances = liste(a.intolerances_alimentaires);
    if (intolerances.length) pousser(lignes, 'Intolérances alimentaires déclarées', intolerances.join(', '));
    if (lignes.length) sections.push(`### Antécédents\n${lignes.join('\n')}`);
  }

  // Repères corporels (IMC)
  {
    const lignes: string[] = [];
    const taille = texte(a.taille, 20);
    const poids = texte(a.poids_actuel, 20);
    const imc = calculImc(taille, poids);
    if (imc) {
      pousser(lignes, 'IMC estimé', `${imc} (taille ${taille} cm, poids ${poids} kg)`);
    } else {
      if (taille) pousser(lignes, 'Taille', `${taille} cm`);
      if (poids) pousser(lignes, 'Poids actuel', `${poids} kg`);
    }
    pousser(lignes, 'Poids habituel', texte(a.poids_habituel, 20) ? `${texte(a.poids_habituel, 20)} kg` : '');
    pousser(lignes, 'Variation récente du poids', texte(a.variation_poids, 40));
    if (lignes.length) sections.push(`### Repères corporels\n${lignes.join('\n')}`);
  }

  // Contexte de vie (fiche signalétique)
  {
    const lignes: string[] = [];
    pousser(lignes, 'Situation familiale', texte(f.situation_familiale, 100));
    pousser(lignes, 'Profession', texte(f.profession, 200));
    pousser(lignes, 'Statut / rythme de travail', texte(f.statut_professionnel, 200));
    pousser(lignes, 'Activité physique', texte(f.activite_physique, 300));
    pousser(lignes, 'Régime alimentaire particulier', texte(f.regime_alimentaire, 300));
    pousser(lignes, 'Consommations (tabac, alcool…)', texte(f.consommations, 300));
    pousser(lignes, 'Rythme de sommeil', texte(f.rythme_sommeil, 300));
    pousser(lignes, 'Autres particularités', texte(f.particularites, 1000));
    if (lignes.length) sections.push(`### Contexte de vie\n${lignes.join('\n')}`);
  }

  return sections.join('\n\n');
}

// ─── vigilance déterministe (garantie, indépendante du LLM) ──────────────────

function decrireEntree(e: Record<string, string>): string {
  const nom = e.nom ?? '';
  const dose = e.dose ? ` (${e.dose})` : '';
  return `${nom}${dose}`.trim();
}

/** Un traitement en vigueur, tel que la ligne de vigilance le lit : nom et dose ([[D-335]] §8). */
export type TraitementPourVigilance = { nature: string | null; nom: string | null; dose: string | null };

/** Les deux sources, nommées quand elles coexistent ([[D-335]] §8, « sans fusion »). */
const SOURCE_ANAMNESE = ' (déclarés à l’anamnèse)';
const SOURCE_LIGNES = ' (lignes datées du dossier)';

/**
 * Le repère des morceaux de suite d'un point scindé ([[D-391]] §5). Jamais de
 * la forme `[C-…]` : `documents/depuisSynthese.ts` arrêterait au praticien un
 * point ainsi marqué, et le document du médecin perdrait la fin d'un
 * traitement qu'il reprend ([[D-391]] §3).
 */
const REPERE_SUITE_LIGNES = 'lignes datées du dossier';

/**
 * Extrait les points de vigilance garantis à partir de l'anamnèse : signaux
 * d'alerte médicaux cochés, traitements et automédication en cours. Ces items
 * sont ajoutés en tête des points de vigilance de la synthèse, indépendamment
 * de ce que produit le LLM. Retourne [] si rien à signaler.
 *
 * `lignesEnVigueur` ([[D-335]] §8, BP-13) : les traitements en vigueur du
 * dossier, lus quel que soit `WN_PHYSIO_TRAITEMENTS` ([[D-391]] §4) — sans
 * ligne, la sortie est celle d'avant. Ils prennent la MÊME forme que ceux de
 * l'anamnèse (nom, dose), et chaque ligne fait son propre point ([[D-391]]
 * §5) : le brouillon praticien refuse un point de plus de
 * `LONGUEUR_MAX_POINT` caractères, et un seul traitement aux bornes de
 * [[D-335]] §3 en fait 547 — le point trop long est scindé aux mots, sans
 * rien retirer. Les groupes d'une anamnèse ancienne gardent leur forme
 * exacte, et quand les deux sources portent une même nature, chacune est
 * nommée, sans fusion. Ce texte est écrit par le code APRÈS la réponse de
 * l'IA : rien de ce lot ne part au modèle.
 */
export function extraireVigilanceDeterministe(
  anamnese: unknown,
  lignesEnVigueur: readonly TraitementPourVigilance[] | null = null,
): string[] {
  const a = asRecord(anamnese);
  const out: string[] = [];
  const lignes = (nature: string) => (lignesEnVigueur ?? [])
    .filter(l => l.nature === nature)
    .map(l => decrireEntree({ nom: l.nom ?? '', ...(l.dose ? { dose: l.dose } : {}) }))
    .filter(Boolean);

  for (const signal of liste(a.signaux_alerte)) {
    out.push(`Signal d'alerte signalé par le patient : ${signal} — avis médical à évaluer en priorité.`);
  }

  const medicaments = entrees(a.medicaments).map(decrireEntree).filter(Boolean);
  const medicamentsLignes = lignes('medicament');
  const deuxSourcesMedicaments = medicaments.length > 0 && medicamentsLignes.length > 0;
  if (medicaments.length) {
    out.push(
      `Traitements médicamenteux en cours${deuxSourcesMedicaments ? SOURCE_ANAMNESE : ''} : ${medicaments.join(' ; ')} — vérifier les interactions, sans proposer d'ajustement posologique ni d'arrêt.`
    );
  }
  for (const traitement of medicamentsLignes) {
    out.push(...scinderSousPlafond(
      `Traitements médicamenteux en cours${SOURCE_LIGNES} : ${traitement} — vérifier les interactions, sans proposer d'ajustement posologique ni d'arrêt.`,
      REPERE_SUITE_LIGNES,
    ));
  }

  const automedication = liste(a.automedication);
  if (automedication.length) {
    out.push(`Automédication régulière signalée : ${automedication.join(', ')} — à prendre en compte.`);
  }

  const complements = entrees(a.complements).map(decrireEntree).filter(Boolean);
  const complementsLignes = lignes('complement');
  const deuxSourcesComplements = complements.length > 0 && complementsLignes.length > 0;
  if (complements.length) {
    out.push(`Compléments alimentaires en cours${deuxSourcesComplements ? SOURCE_ANAMNESE : ''} : ${complements.join(' ; ')} — vérifier les redondances et interactions.`);
  }
  for (const complement of complementsLignes) {
    out.push(...scinderSousPlafond(
      `Compléments alimentaires en cours${SOURCE_LIGNES} : ${complement} — vérifier les redondances et interactions.`,
      REPERE_SUITE_LIGNES,
    ));
  }

  return out;
}
