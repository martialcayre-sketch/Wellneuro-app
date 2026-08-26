import { cleanupAncreJalon, closePrisma } from './helpers/db';

/**
 * BALAYAGE D'ENTRÉE — les fixtures d'épisode ne survivent pas à un run
 * interrompu (Alliance 6.0-B, LOT-05, relevé en revue).
 *
 * `provisionAncreJalon` pose un `assessmentEpisode` T0 sur **PAT_SEED_01** pour
 * ouvrir une fenêtre de jalon. Son `afterAll` l'efface — mais un `Ctrl-C`, un
 * worker tué, ou le blocage WebKit intermittent de ce Mac laissent la ligne en
 * base. Or trois specs assertent que ce patient n'a AUCUN épisode confirmé
 * (`trajectoires`, `fiche-trajectoire`, `visual`), et `fiche-trajectoire` passe
 * AVANT `portail-dossier-deux-voix` dans l'ordre alphabétique : le nettoyage
 * d'entrée de la fixture elle-même arriverait trop tard.
 *
 * UN `globalTeardown` NE SUFFIRAIT PAS : il ne tourne pas davantage quand le
 * process est tué. Ce balayage-ci s'exécute avant TOUT spec, donc il répare le
 * run précédent quel qu'ait été son sort.
 *
 * Il n'efface QUE des lignes portant un identifiant de fixture réservé — jamais
 * une sélection par patient, qui emporterait des épisodes légitimes.
 */
export default async function globalSetup(): Promise<void> {
  await cleanupAncreJalon();
  await closePrisma();
}
