# PAT-7 — comparaison aux prototypes (2026-11-18)

Suite de [`pat7-constat-ecrans-non-vus.md`](pat7-constat-ecrans-non-vus.md)
§5. Ce document compare les écrans livrés aux cinq prototypes validés du
plan patient. Il ne décide rien et ne change aucun code. Il reprend les
étiquettes du constat partiel ([[D-125]]) : *observé sur capture*,
*démontré dans le code*, *non vu*. Aucun constat ne dit ce que vit un
patient réel.

## 1. Méthode

- **Prototypes comparés** (sources lues, previews rendues en local quand le
  type le permet) :

  | Lot | Fiches | Prototype |
  |---|---|---|
  | PAT-2 | U01–U09 | https://claude.ai/artifact/DrDQvM1LAzm78Rz9Q5kvbp |
  | PAT-3 | U10, U18–U21, U41 | https://claude.ai/artifact/GgXXFgPGumAtdxZUB2cky7 |
  | PAT-4 | U11–U14, U16, U17, U22 | https://claude.ai/artifact/89Vu8M7asaUBszXZhyWbUB (itération 2) |
  | PAT-5 | U15, U23–U32, U37, U38, X06 | https://claude.ai/artifact/RAM7H81H6f5ikjUXqpxBUn |
  | PAT-6 | U33–U36, U39, U40 | https://claude.ai/artifact/NsqRAGHvr96QcrjoxBZX3N |

- **Code servi.** Build de production local (`next start`) de `origin/main`
  à `da125214`, PAT-7f compris. Base locale du worktree, fixtures seules
  (Sophie Nicola, Jennifer Martin), drapeaux du constat partiel.
- **Captures.** Une passe par écran, pleine page, à 1 280 px (Chromium) et
  à 390 px (iPhone 13, WebKit), par les specs locaux du constat partiel,
  non versés.
- **Comparaison.** Une lecture par prototype, fiche par fiche : structure,
  textes, forme, états, arbitrages inscrits dans [[D-481]] et [[D-488]].
  Chaque écart donné ci-dessous pour *établi* a été relu dans le code par
  la session.
- **Écarts attendus, non comptés :**
  - aucun décor, aucun ornement de vide, aucun séparateur
    `divider-two-voices` (COM-1 reporté) ;
  - pas d'en-tête de U10 (PAT-3b) ;
  - contenus entre crochets des prototypes (contenu servi) ;
  - données propres aux fixtures.
- **Limites de la passe.**
  - Les prototypes PAT-4 et PAT-2 montrent parfois un état antérieur aux
    arbitrages : pourcentage, emojis, date AAAA-MM-JJ, texte des mineurs
    avant [[D-537]] §7. Le code suit les arbitrages ; ces écarts ne sont
    pas comptés.
  - Captures inexploitables pour la comparaison : U11 et U12 (portillon
    « Avant de commencer »), U13, U16 et U17 (assignation déjà transmise ou
    en 409 sur la base locale), U21 (renvoi vers `/questionnaires`, aucun
    protocole servi), U38 (renvoi vers `/informations`,
    `WN_PORTAIL_CONDITIONS` fermé). Ces fiches sont comparées au code
    seul. U13, U16 et U17 ont été vus à l'écran le 2026-11-17 (constat des
    écrans non vus), pour la mise en page seulement.

## 2. Résultat par lot

Partout, ce qui est conforme l'emporte : titres, ordre des blocs,
navigation et textes suivent les prototypes et [[D-488]] mot pour mot,
sauf les points listés. Les arbitrages inscrits sont appliqués, à une
exception près : Q5a de PAT-5 (§3.1). Deux points restent sans décision
écrite : la consigne des agendas (§2.3) et « (N questionnaires) » de U41,
Q2 du prototype PAT-3 (§2.2). Ils sont listés au §3.3.

### 2.1 PAT-2 — entrée (U01–U09)

- *Observé sur capture* : U01, U02 et U09 conformes en textes. Q1a, Q2a,
  Q3b, Q5a et Q6b sont appliqués. Pour Q7a, l'emplacement est appliqué ;
  le défilement suit [[D-506]], qui l'a remplacé. T-31a, T-31b et T-36 à
  T-39 sont mot pour mot dans `textesEntree.ts`.
- **U09 sans `h1`** (*observé sur capture*, mesure : aucun `h1`, aucune
  `nav`) : « Merci ! » est un `h2` (`app/portail/[token]/page.tsx:687`).
- **Frise de U09 coupée** (*observé sur capture*) : la carte de fin est en
  `max-w-md`, et la frise défile dans cette largeur. « Analyse du
  praticien » est coupé, « Restitution » est hors champ. Au téléphone, la
  frise tient sur une ligne qui défile ; le prototype la pose en 3 × 2.
- Forme, *démontré dans le code* :
  - colonnes plus étroites qu'au prototype (446 px contre 560, 672 en fin) ;
  - repère « Étape n sur 4 » sous le titre ;
  - « Précédent » en bouton neutre à côté de l'action ;
  - champs en 14 px et 44 px, contre 16 px et 48 px ;
  - indicateur de brouillon sans `role="status"` ;
  - ligne de version dans le bloc sable du consentement ;
  - conditions servies en un volet par section.

### 2.2 PAT-3 — Mon parcours, accompagnement, suivi

- *Observé sur capture* : ordre du hub, frise à anneau pétrole, volet
  ouvert d'office sur erreur, « Réessayer » local. Les deux questions du
  prototype :
  - Q1, sans compteur à « Transmis au praticien » : appliquée ;
  - Q2, « (N questionnaires) » servi par `packReevaluation.ts` : gardé de
    fait, sans décision écrite trouvée.
- Forme :
  - « Transmis au praticien » est un `<summary>` natif de 23 px, triangle
    à gauche (*observé sur capture*). Le prototype le pose en tête de volet
    à chevron, comme « Mon accompagnement ».
  - Erreur d'enregistrement de U41 en simple paragraphe, sans état cadré
    (*démontré dans le code*, `PropositionPackReevaluation.tsx:101-107`).
  - Cartes d'action du protocole bordées et teintées, au lieu d'un fond
    plein ; rayons intérieurs différents (12 ou 18 px contre 14 px).
- Texte : l'envoi échoué du point de suivi ajoute « Si le problème
  persiste, contactez votre praticien. », absent de la planche
  (`PatientErrorState`, aide par défaut).

### 2.3 PAT-4 — questionnaires et agendas

- *Démontré dans le code* : Q1b ([[D-506]]), Q2d, Q4a, Q6a, Q8a, Q9a et
  Q10a sont appliqués. U12 et U17 ont été livrés sur l'itération 2
  (#2062). *Observé sur capture* : Q2d (« N réponses sur M »), Q8a, Q9a et
  Q10a.
- Forme :
  - `h1` des pages de questionnaire en `text-lg` ;
  - badge d'état en texte simple ;
  - carte de U14 plus étroite que la colonne ;
  - repères en `/70` ;
  - « Sauvegarder le brouillon » bordé (le prototype : fantôme) ;
  - boutons des plaintes côte à côte au téléphone.
- U22 (*observé sur capture*) :
  - « Réinitialiser le brouillon local » en rouge, en haut ;
  - deux cartes au lieu d'une ;
  - titres de carte en capitales ;
  - bandeau « Aucune action… » gris (le prototype : sable).
- La consigne du bouton actif des agendas est rendue en erreur (rouge,
  `role="alert"`). La planche de l'itération 2 la montre en consigne
  (sauge, `role="status"`), sans cadre rouge
  (`SaisieJourneeForm.tsx:296-300`). Cet arbitrage n'est pas inscrit dans
  [[D-481]] : la réponse est à relire avant tout lot.

### 2.4 PAT-5 — lectures et espaces reçus

- *Démontré dans le code* : Q1c (jauge `showValue={false}`), Q2a, Q3a,
  Q4a, Q6a, Q7a (retirée) et Q8a sont appliqués. Q5a ne l'est qu'en
  partie (§3.1).
- **Titres en sans** (*démontré dans le code*). Les `h1` de U26
  (`MonBilan.tsx:110, :131`), U29 (`FicheRemiseLecture.tsx:67`), U30,
  U31 et U32 sont en `text-2xl font-semibold`, sans `font-display`. Le
  prototype les met en Lora, comme `PatientPageHeader` (`ui/PatientPageHeader.tsx:25`)
  le fait pour les autres pages du portail.
- Forme :
  - avis « Votre lecture est datée » sur fond blanc (le prototype : sauge) ;
  - synthèse de U24 sans fond de voix ;
  - « En pause » sans encart sable ;
  - « Lire la fiche » et « Ouvrir la version à imprimer » en `ghost` (le
    prototype : secondaire, une variante que `PatientButton` n'a pas) ;
  - accordéons de U37 en `<details>` natifs.

### 2.5 PAT-6 — transmissions et droits

- *Démontré dans le code* : Q1b à Q11a appliqués (#2109, #2125). Aucun
  écart de texte, hors la variante de U34 servie par drapeau.
- **Titres en sans** (*démontré dans le code*) : `h1` de U33
  (`DepotDocuments.tsx:172`), U34 (`TransmissionCompteRendu.tsx:192`) et
  U36 (`MesEchangesJournal.tsx:79`), comme au §2.4.
- Forme (*observé sur capture*) :
  - catégories de U33 en radios natifs ;
  - champ fichier natif ;
  - titre de U34 et de U35 dans la carte (le prototype : au-dessus) ;
  - « Annuler » de U40 bordé (le prototype : lien) ;
  - erreurs sans cadre.

## 3. Écarts

### 3.1 Établis, corrigeables sans texte neuf ni décor

- **Commandes imprimées malgré Q5a** (*démontré dans le code*). Q5a de
  PAT-5 ([[D-481]], DOC-9) masque le retour et les commandes à
  l'impression sur U23 à U25, U27, U28, U37 et U38. Deux commandes n'ont
  pas `print:hidden` :
  - « Lire la fiche » (`fiches-assiette/CarteFicheRemise.tsx:38-44`),
    sur U27 et U28 ;
  - « J'en ai pris connaissance » (`trust/ConditionsUtilisation.tsx:65-73`),
    sur U38.
- **Titres** :
  - **U09** : « Merci ! » en `h2`, aucun `h1`. C'est la classe d'écarts de
    PAT-7b : un `h1`, titre existant ;
  - **police des `h1`** sur U26, U29 à U34 et U36 : sans au lieu de Lora,
    contre les prototypes et `PatientPageHeader`, qui titre les autres pages.

### 3.2 Forme transverse : décision de design system

Ces écarts reviennent sur plusieurs familles. Ils passent par des
composants partagés de tout le portail (`PatientButton`,
`PatientInlineMessage`, `PatientField`, les rayons) :
- variantes de boutons : secondaire pétrole, fantôme souligné, bord
  `control-border` ;
- forme des messages d'erreur (cadre) et de succès ;
- champs en 16 px et 48 px ;
- rayons des cartes intérieures et des boutons ;
- options en cartes de 48 px au lieu de radios natifs (U33, U35, U07) ;
- largeurs de colonne, dont la carte de fin de U09 en `max-w-md`, qui
  coupe la frise (§2.1) : établi sur capture, mais c'est une largeur ;
- champ fichier habillé ;
- accordéons natifs remplacés par des volets à chevron (U10 « Transmis »,
  U37, conditions).

Ce sont des choix de forme montrés par les prototypes. Ils n'ont pas été
tranchés comme des questions, et l'app a parfois choisi autrement pour une
raison écrite : le succès en texte courant pour le contraste AA,
arbitrage du 2026-10-10. Les reprendre écran par écran ferait diverger les
familles. Ils demandent une décision d'ensemble avant tout lot.

### 3.3 Textes, sécurité, décisions

- Notés, jamais proposés en lot (textes gelés) :
  - encart d'urgence de U08, phrase continue teintée, contre une liste
    sur sable au prototype ;
  - fond de l'encart de U36.
- Textes servis absents des planches :
  - l'aide sous l'envoi échoué du suivi (§2.2) ;
  - le bouton « Imprimer ou enregistrer en PDF » de U21 ;
  - « (N questionnaires) » de U41 (Q2 du prototype PAT-3, non tranchée
    par écrit).
- Consigne des agendas en erreur ou en consigne : à relire contre la
  réponse de l'itération 2 de PAT-4 (§2.3).
- « Réinitialiser le brouillon local » en rouge sur U22 : signal de geste
  destructeur à garder ou non.
- Icônes d'options du catalogue (Bristol). Q3b garde les emojis porteurs
  d'une réponse. Les options du catalogue sont hors du plan (§2) : aucun
  écart compté.

## 4. Lots

- **PAT-7g — commandes à l'impression** : `print:hidden` sur les deux
  commandes du §3.1. Cela applique Q5a telle qu'inscrite ; aucun texte.
- **PAT-7h — titres** : un `h1` sur U09 (titre existant, comme PAT-7b) et
  la police Lora sur les `h1` de U26, U29 à U34 et U36. Aucun texte. La
  frise de U09 n'en fait pas partie : c'est une largeur, rangée au §3.2.
- **Forme transverse (§3.2)** : pas de lot avant une décision d'ensemble.
- **PAT-7d** : inchangé, il attend `20261117-1243-d`.

## 5. Toujours non couvert

- U29 (aucune fixture de fiche remise) ; U21 avec un protocole diffusé ;
  U38 sous `WN_PORTAIL_CONDITIONS` ; saisies de U11 et U12 vues au
  bureau ; états 401, 409, chargement et succès des familles PAT-4 à PAT-6.
- Impression rendue (X06) : jugée sur le code seul.
- Lecteur d'écran réel, téléphone réel.
- L'en-tête de U10 : après PAT-3b.
