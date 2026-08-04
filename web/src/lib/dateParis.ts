// Date du jour AAAA-MM-JJ dans le fuseau Europe/Paris — DÉFINITION UNIQUE.
//
// ── POURQUOI UNE SEULE DÉFINITION, ET POURQUOI ELLE VIT ICI ──────────────────
// Cette fonction était définie dans `agenda-sommeil/portail.ts` et importée de
// là par six routes, dont aucune ne relève du sommeil pour trois d'entre elles.
// L'agenda alimentaire en a besoin à son tour : la recopier aurait posé une
// SECONDE horloge, et deux horloges finissent toujours par diverger.
//
// Ce n'est pas une crainte théorique. Le décalage de fuseau sur cette
// granularité produit un « hier » faux, et le faux peut atteindre DEUX jours :
// le conteneur Vercel tourne en UTC, un client en Europe/Paris, et une saisie
// de 00:30 heure de Paris tombe la veille en UTC. Une borne calculée d'un côté
// et comparée de l'autre refuse alors la journée que le patient est justement
// en train de noter. Le cas est documenté dans `e2e/portail-hub-agenda.spec.ts`,
// qui recalcule la date « comme le serveur » pour cette raison précise.
//
// D'où la règle : `estDateSaisissable`, les fenêtres de recueil et les vues de
// suivi lisent TOUTES cette fonction — jamais la date du client (non fiable),
// jamais `new Date().toISOString().slice(0, 10)` (qui rend la date UTC).
//
// Le corps est inchangé par rapport à sa version d'origine : ce déplacement ne
// modifie le comportement d'aucun appelant.

export function dateJourParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
