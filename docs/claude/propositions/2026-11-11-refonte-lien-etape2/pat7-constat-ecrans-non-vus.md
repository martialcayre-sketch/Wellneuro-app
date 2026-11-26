# PAT-7 — constat à l'écran des écrans non vus (2026-11-17)

Suite de [`pat7-constat-partiel.md`](pat7-constat-partiel.md) §5, qui
laissait non vus U13 à U17, U29 et U39 à U41. Ce document mesure ces
écrans. Il ne décide rien et ne change aucun code. Il reprend les étiquettes
du constat partiel (`D-125`) : *observé sur fixture*, *démontré dans le
code*, *non vu*. Aucun constat ne dit ce que vit un patient réel.

## 1. Méthode

- **Code servi.** Build de production local (`next start`) de `origin/main`
  à `c5f99846`. Entre `c5f99846` et `68fe8737`, `git diff` est vide sur
  `web/src/app/portail`, `web/src/components/patient`,
  `web/src/components/patient-companion` et `globals.css`.
- **Base, drapeaux, réglages, mesures.** Ceux du constat partiel (§1) : base
  locale du worktree, trois fixtures, mêmes drapeaux, mêmes largeurs.
  Différences :
  - sur iPhone 13 (WebKit), 320 px avec et sans confort est mesuré pour
    tous les écrans ;
  - le débordement est cherché aussi sur les nœuds de texte (leçon de U26
    à PAT-7e) ;
  - mouvement réduit, impression et lecture simulée en 500 ne sont pas
    rejoués ici : ces écrans n'ont pas de composant d'animation ni
    d'impression propre au-delà de ceux du constat partiel.
- **États posés, fixture seulement.** Ils sont posés par les gestes et les
  routes qu'emploient les E2E du dépôt, dans un spec local non versé :
  - Sophie Nicola (`PAT_SEED_01`) :
    - U13, le résumé « Vérifiez votre questionnaire » d'un BDI rempli ;
    - U14 et U15, le même BDI une fois transmis ;
    - U16 et U17, un agenda du sommeil et un agenda alimentaire assignés
      par la route praticien, consentement passé ;
    - U39, les quatre choix de « Mes choix et autorisations » dépliés ;
    - U40, chacun des trois parcours de « Signaler un problème » ouvert,
      sans envoi.
  - Jennifer Martin (`PAT_SEED_02`) : U41, mise en reprise par
    `preparerReprisePourTest`, puis nettoyée par `nettoyerReprise`.
  - Aucun choix n'a été enregistré, aucun signalement envoyé.
- **Sonde, pour rejouer sans le spec.** Le spec reste local : la consigne
  de la session interdit de verser l'outillage de mesure. La méthode suffit
  à le refaire. Pour chaque état, à chaque largeur, la page est rechargée
  puis mesurée dans le navigateur :
  - débordement : `document.documentElement.scrollWidth - clientWidth`.
    Pour le nommer, chaque élément et chaque nœud de texte non vide (par un
    `Range`) dont le bord droit dépasse la largeur de la fenêtre, sauf
    s'il est `position: fixed` ou contenu dans un ancêtre en
    `overflow-x: auto | scroll | hidden | clip` ;
  - cibles : `a[href]`, `button`, `[role=button]`, `input`, `select`,
    `textarea`, `summary` et `[role=tab]` visibles, de moins de 44 px une
    fois réunis à leurs libellés (`input.labels`). Les liens dans une phrase
    et le contenu d'un `<details>` fermé sont exclus ;
  - axe-core, balises `wcag2a`, `wcag2aa`, `wcag21a` et `wcag21aa`, à
    1 024 px (bureau) et 390 px (iPhone) ;
  - clavier : jusqu'à 60 tabulations depuis le haut. Pour chaque arrêt, on
    relève l'anneau (`outline` non nul ou `box-shadow`), la présence dans
    la vue et la taille.

## 2. Résultat par écran

| Écran | État mesuré | Débordement | Cibles < 44 px propres à l'écran | axe | Clavier |
|---|---|---|---|---|---|
| U13 | résumé avant transmission (`h2` « Vérifiez votre questionnaire ») | 0 partout | aucune | 0 | sans écart |
| U14 | réponses transmises (`h2` « Vos réponses ») | 0 partout | aucune | 0 | sans écart |
| U15 | « Mon équilibre » | 0 partout | aucune | 0 | sans écart |
| U15 détail | « Mes 12 besoins » | **44 px à 195 px** (iPhone) ; 0 ailleurs, 320 px compris | aucune | 0 | sans écart |
| U16 | agenda du sommeil, « Votre nuit passée » | **14 px à 195 px** (iPhone) ; 0 ailleurs, 320 px compris | aucune | 0 | sans écart |
| U17 | agenda alimentaire | 0 partout | aucune | 0 | sans écart |
| U39 | quatre choix dépliés | 0 partout | aucune | 0 | sans écart |
| U40 | trois parcours de signalement ouverts | 0 partout | aucune | 0 | deux arrêts sans anneau mesuré (§3.3) |
| U41 | hub en reprise, « Refaire le point, si vous le souhaitez » | **11 px à 195 px** (iPhone, « Réessayer », §3.2) ; 0 ailleurs | aucune | 0 | sans écart |

Les seules cibles de moins de 44 px relevées sont celles qui se trouvent sur
chaque page :
- « Aller au contenu », visible au focus seulement ;
- les numéros du pied d'urgence, liens dans une phrase, gelés ;
- le lien « Confidentialité et droits » du pied.

Chaque écran a un seul `h1`.

## 3. Écarts

### 3.1 Débordements à 195 px

Seulement à 195 px, la largeur que le dépôt utilise pour le zoom 200 % au
téléphone ([[D-506]]). À 320 px, la largeur du critère WCAG 1.4.10, il n'y
en a aucun. C'est la classe d'écarts que PAT-7e a corrigée par des retours
à la ligne en CSS : #2201, handoff
`docs/claude/handoffs/2026-11-16-2330-refonte-lien-pat7e-zoom195.md`,
choix du responsable `20261116-1509-d`.
- **U15 détail, 44 px.** *Observé sur fixture* : la légende du graphe
  (« Corps », « Ancrage », « Esprit ») sort à droite. Les mentions « Pas
  encore de données » à côté de chaque besoin dépassent aussi, la plus large
  sur « Vos micronutriments essentiels ».
- **U16, 14 px.** *Observé sur fixture* : le texte du `h1` « Agenda du
  sommeil — 21 nuits » et la liste « heure de mise au lit »
  (`#agenda-heure-mise-au-lit`).

Aucun de ces correctifs n'ajoute de texte.

### 3.2 Hub en reprise : « Réessayer » sous « Suivi non reconnu. »

*Observé sur fixture*, sur bureau et sur iPhone. Sur Jennifer Martin en
reprise, le volet « Mon accompagnement » du hub affiche « Suivi non
reconnu. » avec « Réessayer » ; la console relève des réponses 404. C'est
le cas du §3.4 du constat partiel, vu alors à la première passe seulement :
[[D-488]] §7 retire ce bouton au seul point de suivi. À 195 px, ce bouton
déborde en plus de 11 px. Les deux écarts relèvent de PAT-7d. La question
`20261117-1243-d` de la liste commune porte cette observation.

### 3.3 U40 : deux arrêts clavier sans anneau mesuré

Sur Chromium bureau, dans le parcours « Un produit me semble mal toléré »,
deux arrêts de tabulation sur les champs de date (`type="date"`, « Depuis
quand… ») ne montrent ni contour ni ombre. La sonde lit le style de
l'élément `input`, pas celui de ses segments internes (jour, mois, année,
bouton du calendrier). C'est donc *non établi* : probable artefact de la
mesure. Un contrôle à l'œil est dû avant tout lot.

## 4. Lots

- **PAT-7f — débordements à 195 px, U15 détail et U16** : retours à la
  ligne en CSS, sans texte neuf, comme PAT-7e. C'est un écart établi, dans
  la ligne de la réponse `20261116-1509-d`.
- **PAT-7d** : inchangé, il attend la question `20261117-1243-d` (extension
  de [[D-488]] §7 au hub, « Réessayer » sur U24 et U25). Le débordement de
  « Réessayer » à 195 px suivra la décision : si le bouton disparaît au hub,
  l'écart disparaît avec lui.

## 5. Toujours non couvert

- **U29, une fiche remise** : *non vu*. Aucun helper E2E ne crée de
  `FicheAssietteRemise`. La table exige une approbation de diffusion du
  protocole, une action et une version de fiche validée. Pour la voir, il
  faudrait d'abord construire une fixture, ce qui forme un lot à part.
- **M1, l'état du rail à la traversée d'un questionnaire** : posé au
  responsable (liste commune `20261117-1242-d`).
- Lecteur d'écran réel, téléphone réel, comparaison aux prototypes, U21
  imprimable avec un protocole diffusé, étapes de l'entrée une par une : comme
  au constat partiel §5.
- L'en-tête de U10 : vu après PAT-3b (`pat7-constat-partiel.md` §6).
