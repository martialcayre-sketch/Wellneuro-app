# Texte de décision — D-444 « Barre basse » (brouillon L4)

> Brouillon rédigé à l'ouverture du lot L4 de l'audit « rails et menus »
> (`README.md`, chapitres 11, 15, 18 et 19). Numéro réservé le 2026-11-05 par
> `node scripts/wn-reserver-decision.mjs` (`refs/tags/reserve/D-444`, [[D-370]]
> §1). Relu et accepté mot pour mot par le responsable le 2026-11-05, avant
> tout code (« Accepté, coder L4 »). **Entré au registre avec L4**, à son rang,
> comme [[D-442]] avec L3 : `docs/DECISIONS.md` fait foi ; ce brouillon reste
> la trace de l'ouverture de L4.

### D-444 — Barre basse du portail patient : quatre accès rapides sous 768 px, le pied d'urgence jamais recouvert ; majeurs seuls, derrière un drapeau éteint

- Date : 2026-11-05
- Statut : accepté mot pour mot par le responsable le 2026-11-05 ; entré au
  registre avec L4. Arbitrages du responsable du
  2026-11-02 (Q25, chapitre 15 de l'audit) et du 2026-11-05 (Q44 à Q51,
  chapitre 19), sur questions à options fermées.
- Domaine : portail patient, `web/src/app/portail/layout.tsx` et un composant
  client neuf sous `web/src/components/patient/`. Lot L4 de l'audit
  `docs/claude/propositions/2026-11-01-portail-rails-et-menus/`.
- **Précise** A6-R1 (REGISTRE_FRONTIERES) côté patient et
  `.claude/rules/frontend-ui.md` (section « Superposition ») au §7.
  **Applique** [[D-442]] §1 (§1), [[D-423]] §2 et §4 ([[D-360]] §2 compris,
  §2 et §5), [[D-283]] §5 (§1), [[D-288]] §1 (§8), [[D-293]] (§4),
  [[D-333]] §1 (§3), [[D-392]] §1 (§6), le principe de [[D-251]] §8 : un nom
  ne se confond pas avec un autre (§3).
- **Ne touche pas** :
  - les routes, les sondes, les drapeaux existants ; aucune lecture neuve :
    la barre reprend la garde du menu ([[D-442]] §1) et la sonde de
    bibliothèque ou de fiches déjà montée au layout ;
  - `[token]/page.tsx`, l'écran « Merci ! » et `/api/portail/session` (Q21) ;
    le layout ne lit toujours que la signature du cookie, aucune base ;
  - le menu « Mon espace » : son bouton reste dans l'en-tête, son contenu et
    son activation sont inchangés ; [[D-442]] n'est pas amendée (Q48) ;
  - le pied de page, ses numéros et ses textes ([[D-293]]) ;
  - le rail et le shell praticien (`SidebarRail`, `NavBar`,
    `MobileBottomNav`) ; le gel de D/49 ;
  - le rail latéral (L5) ;
  - la base : aucune migration.

**§1 — Où paraît la barre.** La barre est fixée en bas de l'écran, sous
768 px seulement (Q47) ; au-delà, le bouton « Menu » de l'en-tête reste seul.
Elle paraît sur les pages où paraît le bouton « Menu » ([[D-442]] §1), sauf
le questionnaire en cours, `/questionnaires/[idAssignation]` (Q51) : la règle
se lit sur le chemin, aucun état de la page n'est lu. Elle ne paraît donc
jamais sur la connexion, `lien/indisponible` ni les écrans de
`[token]/page.tsx`, ni tant que « Avant de commencer » ou la date de
naissance ne sont pas franchis. Surface neuve, elle est servie au seul
dossier **majeur** ([[D-283]] §5 : aucune surface neuve à un mineur, âge
inconnu traité comme mineur) ; la garde suit l'âge, pas la clôture (Q36),
et c'est celle du menu : pas de bouton « Menu », pas de barre.

**§2 — Contenu.** La barre porte `<nav aria-label="Accès rapides">`, distincte
de « Mon espace », « Autres espaces » et « Étapes de votre parcours ». Elle
compte au plus quatre cases, dans l'ordre de la maquette 4.0 (Q45), chacune
vers une page existante :
1. « Accueil » : le hub `/portail/{token}/questionnaires` ;
2. « Carnet » : le carnet alimentaire, `/portail/{token}/alimentation` ;
3. « Suivi » : les rendez-vous de suivi, `/portail/{token}/suivi` ;
4. « Bibliothèque » ou « Fiches » : l'entrée servie de « Ce que j’ai reçu »,
   Ma bibliothèque ou à défaut Fiches remises par mon praticien, jamais les
   deux ([[D-360]] §2 ; Q49). Elle garde sa sonde, fermée par défaut : tant
   que rien n'est remis ou que la sonde est en vol ou en échec, la case est
   absente et la barre en compte trois.

Les trois premières sont inconditionnelles, comme au hub ([[D-423]] §2, Q9).
La barre n'a pas de case « Plus » ni « Menu » : le panneau « Mon espace » ne
s'ouvre que par le bouton de l'en-tête (Q48). La barre ne remplace aucun
accès : « Autres espaces », le menu et le retour de chaque page restent.

**§3 — Libellés.** Une ligne par case, libellé toujours visible, une icône
facultative jamais seule. « Journal » de la maquette devient « Carnet », qui
ne se confond pas avec « Mes échanges », journal daté de [[D-293]] §1 ;
« Documents » devient le nom de l'entrée servie, « Bibliothèque » ou
« Fiches », qui ne se confond ni avec « Mes documents d’information » ni avec
« Mes documents déposés » (principe de [[D-251]] §8, EP-22 ; Q50). Aucun
compteur, aucune pastille, aucun « ! » ([[D-333]] §1).

**§4 — Le pied d'urgence.** Le pied de page, numéros d'urgence compris
([[D-293]]), n'est jamais recouvert en fin de défilement (Q46) : quand la
barre est rendue, le conteneur du portail réserve en bas la hauteur de la
barre plus la zone sûre de l'appareil ; le `main` ne porte pas cette réserve.
L'export `viewport` (`viewport-fit=cover`) qu'exige la zone sûre est posé
dans `app/portail/layout.tsx` seulement, drapeau ouvert seulement. Le pied ne
change ni de place, ni de texte.

**§5 — Activation.** Un seul élément de la barre porte `aria-current="page"`,
selon [[D-423]] §4 : « Accueil » sur `/questionnaires` et `/protocole` ;
« Carnet » sur `/alimentation` ; « Suivi » sur `/suivi` ; la quatrième case
sur `/bibliotheque`, `/fiches` et `/fiches/[idRemise]`. Toute autre page
n'allume aucune case.

**§6 — Forme.** Jetons sémantiques patient, aucun jeton `--rail-*` ; anneau
de focus global, jamais `outline-none`. Hauteur minimale en `rem`, cibles de
44 px au moins, y compris en confort 112,5 % ; un premier rendu ne fait pas
sauter la barre. La barre ne s'imprime pas (`print:hidden`, [[D-392]] §1).
Elle passe sous le panneau « Mon espace » ouvert et sous toute
superposition.

**§7 — A6-R1 et la règle d'interface.** Côté patient, « une étape à la
fois » règle le contenu d'une page ([[D-442]] §7). Une barre de quatre accès
de même poids, sans bouton plein, sans compteur, où seul `aria-current`
distingue la page courante, ne l'enfreint pas : elle ne met rien en avant et
ne fait avancer aucune étape. A6-R1 reçoit cette précision, sans autre
changement. `.claude/rules/frontend-ui.md` reçoit la sienne : la barre basse
patient est une navigation, pas un panneau superposé ; elle reste hors de
`PanneauSuperpose`, comme `MobileBottomNav`.

**§8 — Exécution.** Surface neuve au sens de [[D-288]] §1 : livrée derrière
le drapeau serveur `WN_PORTAIL_BARRE_BASSE`, éteint, lu par
`portail/layout.tsx` à chaque requête, inscrit dans `docs/FEATURE_FLAGS.md`.
Il n'a d'effet que si `WN_PORTAIL_MENU` est ouvert, dont il reprend la garde
(§1). Il prend une place de la file C au-delà de la place 11, dans l'ordre
de préparation, après le constat de l'activation du menu (porte 18) ; il est
posé par le responsable. Drapeau fermé, le portail est celui d'avant : ni
barre, ni réserve de bas, ni export `viewport`. Constat attendu : dossier de
test majeur, mineur et clos, à 390 px et en confort 112,5 %, le pied lu en
entier en fin de défilement, la bibliothèque ou les fiches servies puis
absentes, 1 024 px sans barre, une page imprimée.

Textes patient acceptés mot pour mot le 2026-11-05 : « Accueil », « Carnet », « Suivi »,
« Bibliothèque », « Fiches » (libellés des cases) ; « Accès rapides » (nom de
la navigation, lu par les lecteurs d'écran seulement).
