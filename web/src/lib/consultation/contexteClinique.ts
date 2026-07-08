// Mise en forme déterministe du contexte clinique patient (fiche signalétique +
// anamnèse) pour nourrir la synthèse IA du premier bilan.
//
// Analogue à `lib/scoring/miniSynthese.ts` : purement déterministe, aucune
// logique clinique nouvelle, typage défensif (les JSON stockés en base ne sont
// pas garantis conformes aux schémas). On ne fait que reformater en texte
// lisible ce que le patient a saisi via le portail.

// ─── helpers de lecture défensive ───────────────────────────────────────────

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

// Chaîne non vide, tronquée par sécurité.
function texte(v: unknown, max = 2000): string {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : '';
}

// Liste de libellés (checkbox-multi) — les valeurs stockées sont déjà lisibles.
function liste(v: unknown, max = 50): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, max);
}

// Entrées d'un groupe répétable (médicaments, compléments).
function entrees(v: unknown, max = 20): Array<Record<string, string>> {
  if (!Array.isArray(v)) return [];
  const out: Array<Record<string, string>> = [];
  for (const brut of v.slice(0, max)) {
    const rec = asRecord(brut);
    const entree: Record<string, string> = {};
    for (const [k, val] of Object.entries(rec)) {
      if (typeof val === 'string' && val.trim()) entree[k] = val.trim().slice(0, 500);
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

/**
 * Extrait les points de vigilance garantis à partir de l'anamnèse : signaux
 * d'alerte médicaux cochés, traitements et automédication en cours. Ces items
 * sont ajoutés en tête des points de vigilance de la synthèse, indépendamment
 * de ce que produit le LLM. Retourne [] si rien à signaler.
 */
export function extraireVigilanceDeterministe(anamnese: unknown): string[] {
  const a = asRecord(anamnese);
  const out: string[] = [];

  for (const signal of liste(a.signaux_alerte)) {
    out.push(`Signal d'alerte signalé par le patient : ${signal} — avis médical à évaluer en priorité.`);
  }

  const medicaments = entrees(a.medicaments).map(decrireEntree).filter(Boolean);
  if (medicaments.length) {
    out.push(
      `Traitements médicamenteux en cours : ${medicaments.join(' ; ')} — vérifier les interactions, sans proposer d'ajustement posologique ni d'arrêt.`
    );
  }

  const automedication = liste(a.automedication);
  if (automedication.length) {
    out.push(`Automédication régulière signalée : ${automedication.join(', ')} — à prendre en compte.`);
  }

  const complements = entrees(a.complements).map(decrireEntree).filter(Boolean);
  if (complements.length) {
    out.push(`Compléments alimentaires en cours : ${complements.join(' ; ')} — vérifier les redondances et interactions.`);
  }

  return out;
}
