# LOT-08 — Extinction opérante : livré, table toujours non signée

- **Branche** : `claude/lot-08-campagne-t0-5bwfzu`, vivante, partie de
  `27e09fedfc18` (`origin/main` contenu).
- **Campagne** : chaîne T0 opérationnelle. Le lot actif passe LOT-04 → LOT-08
  (bookkeeping dans ce même diff). Étapes 1 à 5 livrées ; **l'étape 6 — signer
  la table d'arrêt — reste un acte praticien séparé**, à confirmer
  distinctement après relecture du bloc « à connaître avant de signer » de
  `stopRulesV1.ts`. La production ne change pas au merge.
- **Décision** : `D-055` (six arbitrages), au registre, acceptée via
  l'approbation du plan du 2026-08-13.

## Ce que le lot livre

1. **`group_majority` publie `missing`/`repondus` à la racine** (patron
   `sum`/`psqi`/`tfd`, aucun bump de consigne) ; la bande — et le
   dominant/protocole — n'est servie que sur recueil complet ; `total`
   inchangé ; note de recueil partiel jointe à la note de l'instrument.
   Production relue avant décision : 1 passation `Q_STR_01`, sans `rawAnswers`,
   déjà inerte pour le raisonnement recalculé.
2. **La garde de complétude du moteur d'arrêt refuse « muet OU incomplet », au
   grain du déclencheur.** LE FAIT DU LOT, trouvé par le banc de bout en bout
   et nulle part ailleurs : la garde lisait la RACINE du porteur, or le DASS-21
   (`subscore`, deux des quatre déclencheurs de STOP-STR) ne publie ses comptes
   que PAR AXE — publier les comptes de `Q_STR_01` n'aurait fait que déplacer
   le verrou, et la signature aurait été un geste vide une seconde fois.
   `comptesDuPorteurVise` lit l'axe visé (résolution d'`extraireCible`, id
   prime sur libellé), la racine sinon ; introuvable ⇒ refus.
3. **`D-053 §5` a son code** : une contradiction `resolution.statut !==
   'resolue'` (escalade comprise) sur le DOSSIER interdit toute extinction, et
   n'en déclenche jamais — mesuré par banc (sortie identique octet pour octet
   hors extinction). Constats fournis par
   `constatsContradictionsPourDossier` (extrait de `contradictionsService`,
   verrou drapeau + signature compris) — système de contradictions éteint ⇒
   rien d'« ouvert », hiérarchie de verrous existante.
4. **Garde de restitution : éteinte ≠ recommandée**, fenêtre de 200 caractères
   normalisés autour de chaque citation, marqueurs tirés de la consigne v25
   (inchangée), instruments déjà passés hors du contrôle, journalisation
   seule. Un faux positif est ASSUMÉ et épinglé par banc : deux cibles dans la
   même fenêtre partagent leurs marqueurs.

## Pièges payés, à ne pas repayer

- **`Q_STR_01` alimente « Mon équilibre » en échelle inversée** : le recueil
  partiel y fabriquait un bien-être surestimé ; il vaut désormais « non
  mesuré ». Nommé dans D-055, suite `equilibre` verte.
- `separerConduite` sort `protocol` de l'interprétation : un banc qui asserte
  `interpretation.protocol` teste une clé qui n'existe plus — lire `conduite`
  à la racine.
- Import circulaire `orientationService` ↔ `contradictionsService` : au niveau
  fonction seulement, validé par la suite ET le build de production.
- La matrice de consommation (`MATRICE_CONSOMMATION.md`) dérive dès qu'un
  nouveau consommateur touche une source — la régénérer, ne pas l'éditer.

## Validation

T1 vert (0 échec, matrice régénérée). Suite Vitest complète : 4 633 verts
(position SIIN 57), forme courte 14 verte, lint vert, certification scoring
verte (65 instruments), audit campagnes exit 0, build de production vert.
**Le segment base éphémère + E2E de T3 relève du CI dans ce conteneur** : le
proxy refuse `cdn.playwright.dev` (WebKit intéléchargeable — même classe que
`D-049`), et le diff ne porte ni migration ni contrat SQL. `verify` fait foi
sur la PR.

## Ouvert

- Signature de la table d'arrêt (étape 6) — confirmation praticien distincte.
- Revue `wn-reviewer` (classe clinique) à refermer avant de passer la main.
- Dettes reconduites par D-055 : borne d'ancienneté `dejaRepondu`, complétude
  du moteur Berlin (préalable STOP-APN), synthèses historiques, garde de
  restitution journalisant (non bloquant).
