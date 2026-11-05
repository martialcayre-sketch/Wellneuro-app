# Texte de décision — D-447 « Rail latéral » (brouillon L5)

> Brouillon rédigé à l'ouverture du lot L5 de l'audit « rails et menus »
> (`README.md`, chapitres 8, 11, 19 et 20). Numéro réservé le 2026-11-05 par
> `node scripts/wn-reserver-decision.mjs` (`refs/tags/reserve/D-447`, [[D-370]]
> §1). Relu et accepté mot pour mot par le responsable le 2026-11-05, avant
> tout code (« Accepté, coder L5 »). **Entré au registre avec L5**, dans
> `docs/decisions/D-447.md` ([[D-418]] §1), le titre passant au niveau `#` ;
> l'amendement de [[D-442]] §1 s'écrit alors en paragraphe daté dans
> `docs/decisions/D-442.md` ([[D-418]] §2), et la précision du §7 sous A6-R1
> dans `docs/claude/REGISTRE_FRONTIERES.md`. `docs/decisions/D-447.md` fait foi ;
> ce brouillon reste la trace de l'ouverture de L5.

### D-447 — Rail latéral du portail patient : dès 1 024 px, la liste « Mon espace » toujours dépliée remplace le bouton « Menu », hors questionnaire en cours ; majeurs seuls, derrière un drapeau éteint

- Date : 2026-11-05
- Statut : accepté mot pour mot par le responsable le 2026-11-05 ; entré au
  registre avec L5. Arbitrages du responsable du
  2026-11-02 (Q4, chapitre 15 de l'audit) et du 2026-11-05 (Q52 à Q60,
  chapitre 20), sur questions à options fermées.
- Domaine : portail patient, `web/src/app/portail/layout.tsx`, le thème
  patient de `web/src/app/globals.css` et un composant client neuf sous
  `web/src/components/patient/`. Lot L5 de l'audit
  `docs/claude/propositions/2026-11-01-portail-rails-et-menus/`.
- **Amende** [[D-442]] §1 : dès 1 024 px, sur les pages où paraît le rail, le
  bouton « Menu » ne paraît pas (§1).
  **Précise** A6-R1 (REGISTRE_FRONTIERES) côté patient et
  `.claude/rules/frontend-ui.md` (section « Superposition ») au §7.
  **Applique** [[D-442]] §1 à §3 (§1 à §3), [[D-423]] §2 et §4 (§2 et §3),
  [[D-444]] §1 et §2 (§1), [[D-283]] §5 (§1), [[D-288]] §1 (§8),
  [[D-293]] (§4), [[D-333]] §1 (§2), [[D-392]] §1 (§5).
- **Ne touche pas** :
  - les routes, les sondes, les drapeaux existants ; aucune lecture neuve :
    le rail reprend la garde du menu ([[D-442]] §1) et les sondes déjà
    montées au layout ;
  - `[token]/page.tsx`, l'écran « Merci ! » et `/api/portail/session` (Q21) ;
    le layout ne lit toujours que la signature du cookie, aucune base ;
  - le contenu, l'activation et le comportement du menu « Mon espace »
    ([[D-442]] §2 à §7) ; son état actif garde son filet ;
  - la barre basse ([[D-444]]) : elle reste sous 768 px, le rail commence à
    1 024 px ;
  - « Autres espaces » sur le hub ([[D-442]] §2, Q60) ;
  - le pied de page, ses numéros et ses textes ([[D-293]]) ;
  - `web/src/lib/portail/stockageAppareil.ts` : le rail n'écrit rien sur
    l'appareil (Q56) ;
  - le rail et le shell praticien (`SidebarRail`, `NavBar`,
    `MobileBottomNav`) ; le gel de D/49 ;
  - la base : aucune migration.

**§1 — Où paraît le rail.** Le rail paraît à partir de 1 024 px seulement ;
de 768 à 1 023 px, le bouton « Menu » reste seul, et sous 768 px rien ne
change (bouton « Menu » et barre basse, [[D-444]] §1). Il paraît sur les
pages où paraît le bouton « Menu » ([[D-442]] §1), sauf le questionnaire en
cours, `/questionnaires/[idAssignation]` (Q59) : la règle se lit sur le
chemin, comme pour la barre ([[D-444]] §1), aucun état de la page n'est lu.
Là où le rail paraît, il remplace le bouton « Menu » (Q54) : une page n'a
jamais qu'une navigation « Mon espace », et le panneau n'a jamais qu'un
déclencheur ([[D-444]] §2). Sur le questionnaire en cours, le bouton « Menu »
reste, à toute largeur. Le rail ne paraît donc jamais sur la connexion,
`lien/indisponible` ni les écrans de `[token]/page.tsx`, ni tant que « Avant
de commencer » ou la date de naissance ne sont pas franchis. Surface neuve,
il est servi au seul dossier **majeur** ([[D-283]] §5 : aucune surface neuve
à un mineur, âge inconnu traité comme mineur) ; la garde suit l'âge, pas la
clôture (Q36), et c'est celle du menu : pas de bouton « Menu », pas de rail.

**§2 — Contenu.** Le rail porte `<nav aria-label="Mon espace">` et la liste
du menu (Q55) : même source, même ordre ([[D-423]] §2, [[D-442]] §2) —
l'ancre « Mon parcours », puis les groupes « Au jour le jour », « Ce que
j’ai reçu », « Ce que je transmets », « Avec mon praticien ». Chaque entrée
garde sa condition et sa sonde, fermées par défaut ; un groupe sans entrée
ouverte n'a pas d'étiquette. Les sondes sont celles du layout, partagées avec
le hub et le menu : aucune requête n'est doublée. Aucun compteur, aucune
pastille, aucune icône obligatoire ([[D-333]] §1). Le rail ne remplace aucun
accès : « Autres espaces » reste sur le hub à toute largeur, et le rail se
tient à son côté dès 1 024 px (Q60) ; chaque page garde son retour.

**§3 — Activation.** [[D-442]] §3 s'applique au rail : un seul élément porte
`aria-current="page"`, selon [[D-423]] §4.

**§4 — Comportement.** Le rail n'est pas un panneau : il est rendu ouvert,
sans bascule, sans repli, sans état mémorisé (Q56). Il n'est pas fixé à
l'écran ; il tient dans sa colonne, collé en haut au défilement, et ne
recouvre jamais le pied de page, numéros d'urgence compris ([[D-293]]). Le
lien d'évitement « Aller au contenu » ([[D-442]] §6) reste le premier
élément de la page et mène à `<main id="contenu">`, après le rail. Un
panneau « Mon espace » ouvert se ferme quand la largeur atteint 1 024 px sur
une page du rail.

**§5 — Forme.** Le thème patient de `globals.css` reçoit deux jetons (Q57),
déclarés hors de `[data-theme='praticien']` :
- `nav-rail` : la largeur du rail, 15,75 rem (252 px à 100 %) ;
- `nav-active` : l'ombre de l'entrée active, `inset 3px 0 0
  var(--color-primary)`.

Le rail se pose en `bg-surface`, bordé de `border-border`. L'entrée active
porte `aria-current="page"`, la graisse, `text-foreground` et l'ombre
`nav-active`. Liens de liste, cible de 44 px au moins en `rem`, y compris en
confort 112,5 % ; libellés dans un `<span>`, passés à la ligne, jamais
tronqués. Aucun jeton `--rail-*`, aucun `data-theme="praticien"`, ni rail
nuit ni bascule (A5-R2) ; anneau de focus global, jamais `outline-none`. Le
rail ne s'imprime pas (`print:hidden`, [[D-392]] §1).

**§6 — Mise en page.** Sur les pages du rail, à partir de 1 024 px, l'espace
entre l'en-tête et le pied passe en deux colonnes, sur le modèle du shell
praticien (Q58) : `gap-6`, `px-6` de chaque côté, le `main` gardant son
`px-4` et la colonne son `max-w-2xl`. L'en-tête et le pied restent pleine
largeur, inchangés. La colonne vaut, par calcul, 668 px à 100 % et 623,5 px
à 112,5 % à 1 024 px ; cette largeur est acceptée, et le constat la mesure.
Sous 1 024 px, et sur le questionnaire en cours, la mise en page ne change
pas.

**§7 — A6-R1 et la règle d'interface.** Côté patient, « une étape à la
fois » règle le contenu d'une page ([[D-442]] §7, [[D-444]] §7). Une liste
des espaces visible en permanence à partir de 1 024 px, d'entrées de même
poids, sans bouton plein, sans compteur, où seul `aria-current` distingue la
page courante, absente du questionnaire en cours, ne l'enfreint pas : elle
ne met rien en avant et ne fait avancer aucune étape. A6-R1 reçoit cette
précision, sans autre changement (Q53 ; Q4 tenue).
`.claude/rules/frontend-ui.md` reçoit la sienne : le rail patient est une
navigation, pas un panneau superposé ; il reste hors de `PanneauSuperpose`,
comme `SidebarRail`, et ne reprend aucun composant du shell praticien.

**§8 — Exécution.** Surface neuve au sens de [[D-288]] §1 : livrée derrière
le drapeau serveur `WN_PORTAIL_RAIL_LATERAL`, éteint, lu par
`portail/layout.tsx` à chaque requête, inscrit dans `docs/FEATURE_FLAGS.md`.
Il n'a d'effet que si `WN_PORTAIL_MENU` est ouvert, dont il reprend la garde
(§1). Il prend une place de la file C au-delà de la place 11, dans l'ordre
de préparation, après le constat de l'activation de la barre basse
(porte 18) ; il est posé par le responsable. Drapeau fermé, le portail est
celui d'avant : ni rail, ni mise en page à deux colonnes, ni jeton employé,
et le bouton « Menu » paraît à toute largeur. Constat attendu : dossier de
test majeur, mineur et clos ; à 1 024 px en confort 100 % et 112,5 %, la
largeur de la colonne mesurée ; à 1 023 px, le bouton « Menu » sans rail ;
le questionnaire en cours à 1 024 px, le bouton sans rail ; le hub à
1 024 px, le rail et « Autres espaces » ; le pied lu en entier en fin de
défilement ; une page imprimée.

Aucun texte patient neuf : le rail porte le nom « Mon espace », accepté le
2026-11-04 ([[D-442]]).
