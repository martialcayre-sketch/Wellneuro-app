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

## Revue wn-reviewer : NO-GO, puis trois bloquants refermés

- **B1** — `Q_STR_01` alimente le **besoin 9** de « Mon équilibre »
  (fondation critique, échelle inversée) : publier `missing` change la
  définition du besoin — un partiel sévère ne plafonne plus le score global,
  qui REMONTE. `VERSION_SCORE_EQUILIBRE` bumpée v12/v13 → **v14/v15** (3e de la
  classe PSQI/TFD), doctrine dans `constants.ts`, banc « le plafond tombe ».
- **B2** — le bloc « à connaître avant de signer » de `stopRulesV1.ts`
  affirmait encore l'inertie : réécrit — le verrou est levé, signer allume
  extinction ET exclusion, et **l'ordre des signatures n'est gardé par rien**
  (arrêt signée sans contradictions actives ⇒ D-053 §5 ne freine rien — le
  signataire doit le choisir, pas le subir).
- **B3** — le banc de bout en bout jouait une configuration que le service
  n'émet jamais : rejoué avec `statutValidite: 'VALID'` et
  `exclureDejaRepondu: true`, dossier de référence **sans PSS-10** — éteint
  réellement `Q_STR_02` et `Q_STR_05`, cibles non passées.
- Mineures traitées : garde « incomplet » rendue mutation-tuable par le banc
  « un plancher n'éteint jamais » (M1) ; ordre id-avant-label épinglé (M2) ;
  bancs de route sur `ciblesParPresentation` (M3) ; marqueurs dérivés de
  `LIBELLE_EXTINCTION` et du motif de STOP-STR (M4) ; fenêtre asymétrique
  200/420 mesurée sur le motif, bornée par le haut par banc (M5) ;
  `CONVERGENCE` ne bloque pas (M8, banc) ; message de journal distinguant les
  deux classes (M7) ; motif « aucun bump » corrigé dans D-055 (M11).
- Restes assumés, dits : le bruit attendu du sens `recommandee_presentee_eteinte`
  (M6 — journal seul, à réexaminer à la signature) ; le double recalcul du
  dossier quand les contradictions s'allumeront (M10 — inerte aujourd'hui).

## Pièges payés, à ne pas repayer

- `separerConduite` sort `protocol` de l'interprétation : un banc qui asserte
  `interpretation.protocol` teste une clé qui n'existe plus — lire `conduite`
  à la racine.
- Import circulaire `orientationService` ↔ `contradictionsService` : cycle de
  MODULES (imports statiques croisés), sûr parce qu'aucun export n'est consommé
  à l'initialisation — exercé par les suites ET le build de production.
- La matrice de consommation (`MATRICE_CONSOMMATION.md`) dérive dès qu'un
  nouveau consommateur touche une source — la régénérer, ne pas l'éditer.
- La garde d'arrêt « axe introuvable ⇒ refus » est DOUBLEMENT fermée
  (le déclencheur échoue aussi) : sa mutation « repli racine » ne rougit pas,
  c'est l'ordre id/label qui est le juge — dit dans le banc.

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
