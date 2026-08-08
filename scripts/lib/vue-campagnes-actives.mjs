// Rendu de `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` — une VUE dérivée de
// `.wn/state.json`, jamais une source.
//
// Ce module ne fait qu'une chose : rendre le texte. Il est extrait de
// `scripts/wn-campaign.mjs` (qui l'écrivait en ligne) pour qu'un garde puisse
// régénérer la vue attendue et la confronter au fichier sur disque — impossible
// tant que le rendu vivait dans un script dont le simple `import` exécute le CLI.
//
// Pourquoi ce garde existe : à la clôture 5.0 (2026-08-08), la vue a été
// régénérée AVANT l'édition de la source dont elle dérive. Elle a donc publié
// « Lot actif : LOT-06 » sous un état qui disait LOT-07. Ni T3, ni le CI, ni
// aucun test ne l'ont vu — c'est la revue adversariale qui l'a trouvé
// (`DECLARATION_5_0.md`, « Trouvée par la revue adversariale, pas par un
// test »), dans le paragraphe même qui dénonçait cette dette.

/**
 * Rend le contenu attendu de `ACTIVE_CAMPAIGN.md`.
 *
 * Fonction PURE : ni `fs`, ni horloge. `updatedAtParDefaut` n'est utilisé que
 * si l'état ne porte pas `updated_at` — l'appelant décide alors quelle date
 * injecter, plutôt qu'un `new Date()` caché ici qui rendrait la fonction
 * incomparable à elle-même une seconde plus tard.
 *
 * @param {object} etatMachine  Contenu de `.wn/state.json`.
 * @param {{name: string, title?: string}[]} campagnes  Campagnes lues sur disque.
 * @param {{updatedAtParDefaut?: string}} [options]
 * @returns {string}
 */
export function rendreVueCampagnesActives(etatMachine, campagnes, options = {}) {
  const etat = etatMachine || {};
  const liste = Array.isArray(campagnes) ? campagnes : [];

  const activeCampaignId = etat.active_campaign || "";
  const primary = liste.find((campagne) => campagne.name === activeCampaignId);
  const parallels = (Array.isArray(etat.parallel_campaigns) ? etat.parallel_campaigns : [])
    .filter((entry) => entry && typeof entry.campaign_id === "string")
    .map((entry) => ({ ...entry, campaign: liste.find((campagne) => campagne.name === entry.campaign_id) }));

  const hasActivity = Boolean(activeCampaignId || parallels.length);
  const status = etat.status || (hasActivity ? "active" : "idle");
  const updatedAt = (etat.updated_at || options.updatedAtParDefaut || "").slice(0, 10);

  const primaryBlock = activeCampaignId
    ? `## Activité primaire\n\n**Campagne** : ${activeCampaignId}\n**Titre** : ${primary?.title || activeCampaignId}\n**Statut** : active\n**Lot actif** : ${etat.active_lot || "aucun"}\n`
    : "## Activité primaire\n\nAucune campagne primaire active.\n";
  const parallelBlock = parallels.length
    ? parallels
        .map(
          (entry) =>
            `### ${entry.campaign_id}\n\n**Titre** : ${entry.campaign?.title || entry.campaign_id}\n**Statut** : ${entry.status || "active"}\n**Lot actif** : ${entry.active_lot || "aucun"}`,
        )
        .join("\n\n")
    : "Aucune campagne parallèle active.";

  return hasActivity
    ? `# Campagnes actives\n\n${primaryBlock}\n## Activités parallèles\n\n${parallelBlock}\n\n**Statut global** : ${status}\n**Mise à jour** : ${updatedAt}\n\n> La source de vérité machine est \`.wn/state.json\`. Cette vue est générée ; elle ne doit pas être modifiée manuellement.\n`
    // Même pied de page que la branche active : la phrase « cette vue est
    // générée » est ce qui dissuade de l'éditer à la main. La tronquer quand
    // la campagne est idle retirait le garde exactement là où le fichier est
    // le plus court, donc le plus tentant à corriger à la main.
    : `# Campagnes actives\n\nAucune campagne active.\n\n**Statut global** : ${status}\n**Mise à jour** : ${updatedAt}\n\n> La source de vérité machine est \`.wn/state.json\`. Cette vue est générée ; elle ne doit pas être modifiée manuellement.\n`;
}
