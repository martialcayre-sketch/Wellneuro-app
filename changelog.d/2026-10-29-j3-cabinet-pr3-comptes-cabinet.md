### J3-cabinet, PR 3 : la page « Comptes du cabinet » (D-385, H58)

- Nouvelle page `/dashboard/cabinet`, entrée « Comptes du cabinet » du rail,
  sous « Fiche-trajectoire ». Deux tableaux, chacun avec son effectif :
  **Prochaine étape** (les sept phases du rail, « Rien n’attend »,
  « Indéterminé ») et **Protocole** (sans protocole diffusé, cycle en cours,
  fin de cycle, « Indéterminé »). La page compte, elle ne nomme ni n'ouvre
  aucun dossier : aucun journal d'accès par dossier.
- Masquage ([[D-298]]), patron de `agregerConstatAvantT0` (arbitrage du
  responsable du 2026-10-29) : dès qu'une ligne compte un à quatre dossiers,
  toute la répartition du tableau est masquée ; l'effectif reste affiché. Le
  masquage se fait côté serveur, et la route ne rend que l'agrégat.
- Nouveau chargeur `web/src/lib/praticien/comptesCabinet.ts` : lectures
  groupées (trajectoires, envois, phase 3), puis, dossier par dossier (quatre à
  la fois), le rejeu du cockpit par `rejeuEpisodeCockpit`, l'élection du jalon
  de la fiche, `deriverEtatRuntimePourPhases` et `phaseDueDuDossier` ; le
  tableau Protocole par `resolveProtocoleDiffuse` et `estFinDeCycle`. Le temps
  est un paramètre ; la durée du comptage est journalisée, sans dossier.
- Nouvelle route `GET /api/praticien/comptes-cabinet`, en session.
- Textes d'écran validés mot pour mot par le responsable le 2026-10-29.
- Bancs : parité fiche ↔ page sur les trois identités de fixture (même phase,
  même suite de jalons demandés au cockpit), « sous cinq » par tableau,
  élection du jalon, route, panneau, E2E de la page. Le banc du rail compte
  quinze entrées.
- Aucun seuil, aucune migration, rien sous `lib/clinical/` ; les modules des
  PR 1 et 2 sont inchangés.
