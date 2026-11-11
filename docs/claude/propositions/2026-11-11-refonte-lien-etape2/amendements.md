# Refonte Lien / Empreinte — étape 2 : textes d'amendement proposés

> **Accepté le 2026-11-11** (« Je valide ce bloc ») : AM-1 à AM-7 tels que
> rédigés, AM-8 sans objet. Inscrits par DOC-0 : AM-1 → [[D-482]], AM-2 →
> [[D-483]], AM-3 → [[D-484]], AM-4 → [[D-485]], AM-5 → [[D-486]], AM-6 →
> A5-R3 et [[D-481]] §1, AM-7 → [[D-487]]. Les décisions font foi ; le
> texte ci-dessous est celui qui a été proposé.

Aucun de ces textes n'est signé ni numéroté. Chacun attend l'acceptation mot
pour mot du responsable ; un numéro D-xxx ne lui sera donné qu'à ce moment, au
registre, par la PR qui le porte. Les citations des décisions viennent de
`docs/decisions/` au commit de ce dossier.

Chaque amendement distingue :

- **Traduit** : ce qui recopie une réponse écrite du responsable du
  2026-11-11 (questions de l'étape 1, `../2026-11-11-refonte-lien-etape1-carte/`
  §5, et leurs précisions) ;
- **Proposé** : le détail que l'assistant ajoute pour rendre la réponse
  exécutable, et qui reste à accepter.

Aucun amendement ne touche aux règles cliniques, aux gardes d'âge et de
session, aux sondes, aux routes ni aux droits d'accès.

---

## AM-1 — Rail patient : trois états, en mémoire de page

**Amende** [[D-447]] §1 (le bouton « Menu » revient quand le rail est
escamoté), §4 (repli et escamotage) et la liste « Ne touche pas » pour la
seule phrase sur le repli ; [[D-460]] §4 (« ni repli », « Le rail reste
toujours déplié »). **Ne change pas** : D-447 §1 sur la largeur, les pages et
la garde ; §2 et §3 ; « le rail n'écrit rien sur l'appareil (Q56) » ;
`stockageAppareil.ts` intact.

*Traduit* (réponse 2 (a), et sa précision : « seule l'interdiction
d'écriture reste intacte ; le repli et l'escamotage nécessitent toujours
l'amendement de D-447 §4 ») :

> **§4 — Comportement (amendé).** Le rail a trois états : déplié, réduit et
> escamoté. Réduit, il garde ses libellés, sur une largeur moindre ; il ne
> devient jamais un rail d'icônes. Escamoté, il disparaît de la page, du
> parcours clavier et de l'arbre d'accessibilité ; la colonne de contenu
> récupère sa place. L'état choisi vit dans la mémoire du layout : il survit
> aux navigations entre pages du portail, pas au rechargement, et rien n'est
> écrit sur l'appareil (Q56 tenue). Au chargement, le rail est déplié. Le
> reste du §4 est inchangé : le rail n'est pas un panneau, n'est pas fixé à
> l'écran, ne recouvre jamais le pied, et « Aller au contenu » reste le
> premier élément.

*Proposé* :

> **§4 bis — Commandes du rail.** Deux commandes, en pied du rail, nomment
> leur cible ; leurs textes sont au registre (`registre-textes.md`, T-21 à T-23). Quand le
> rail est escamoté, le bouton « Menu » de l'en-tête reparaît et le rouvre
> déplié : la page n'a toujours qu'une navigation « Mon espace » visible et
> un seul déclencheur ([[D-444]] §2). Si le focus était dans le rail au
> moment de l'escamoter, il passe à ce bouton. Le rail réduit garde ses
> cibles de 44 px, ses libellés passés à la ligne, jamais tronqués, en
> confort 112,5 % compris (§5).
>
> **§5 — Forme (complément).** Un troisième jeton, `rail-patient-compact`
> (13 rem), donne la largeur du rail réduit.

**Conséquence sur [[D-460]] §4** (*traduit*) : « ni repli » et « Le rail
reste toujours déplié (Q56 et Q63) » sont retirés ; « ni rail sombre, ni
bascule » reste (A5-R2 ; voir AM-6 pour la couleur du rail).

---

## AM-2 — Patient dès 1 024 px : le rail seul

**Amende** [[D-460]] §3 (onglets de l'en-tête) et [[D-447]] §2 (« Autres
espaces reste sur le hub à toute largeur », Q60). **Ne change pas** : la
barre basse sous 768 px ([[D-444]]), le bouton « Menu » de 768 à 1 023 px,
« Autres espaces » sous 1 024 px.

*Traduit* (réponse 3 (a), et sa précision : « Lorsque le rail est escamoté,
une commande "Menu" doit permettre de retrouver toutes les destinations
autorisées ») :

> **[[D-460]] §3 (amendé).** L'en-tête ne porte plus d'onglets. Dès
> 1 024 px, sur les pages du rail, le rail est la seule navigation « Mon
> espace » ; la barre basse reste sous 768 px.
>
> **[[D-447]] §2 (amendé, Q60).** Sur le hub, dès 1 024 px, quand le rail
> est servi, « Autres espaces » n'est pas rendu : il répétait la liste du
> rail. Rail escamoté, la liste complète se retrouve par le bouton « Menu »
> (AM-1, §4 bis). Sous 1 024 px, ou si la garde du rail refuse, « Autres
> espaces » reste sur le hub, inchangé.

*Proposé* : la frise du hub (`FriseEtapesNavigable`) reste ; elle montre les
étapes du parcours, pas les espaces. Le catalogue §5.3 gardait les onglets :
écart assumé, consigné au catalogue révisé.

---

## AM-3 — Praticien : les vues rapides sont retirées

**Amende** : aucune décision. Les vues rapides praticien
(`components/ui/VuesRapides.tsx`) viennent de la maquette Spirale, sans
D-xxx (étape 1, §2.1). Le texte ci-dessous est une décision d'écran neuve,
qui les retire.

*Traduit* (réponse 4 (b) : « Les retirer libère l'en-tête pour le contexte
du dossier et les actions utiles ») :

> Les vues rapides de l'en-tête praticien sont retirées, à toute largeur. Le
> rail global (déplié, réduit ou escamoté) et, au téléphone, la barre basse
> et la feuille « Plus » restent les seules navigations globales. L'en-tête
> porte le contexte du dossier ouvert et ses actions utiles ; il ne recopie
> aucune entrée du rail.

*Proposé* :

> Rail praticien escamoté, la commande de réouverture vit dans l'en-tête
> (cadrage §10). Sur une fiche, l'en-tête porte l'identité fictive ou
> réelle du dossier telle que la fiche l'affiche déjà, sans donnée
> supplémentaire. Le contenu exact de l'en-tête de fiche se dessine à
> l'étape 3 (prototypes).

---

## AM-4 — Praticien : une déclaration des destinations

**Amende** [[D-324]] §5 (« La feuille "Plus" du téléphone reprend l'ordre et
les libellés du menu du bureau ») et §7 (« ordre des quatorze entrées »).
**Ne change pas** : les groupes, l'ordre et les libellés de D-324 §1 à §6,
tant que la question Q-E2-1 (`README.md` §4) n'est pas tranchée.

*Traduit* (réponse 5 (a), et sa précision : « Conserver les tests des
destinations, des gardes et des états actifs : une source commune ne
garantit pas leur bon affichage ») :

> **[[D-324]] §5 (complément).** Les destinations praticien sont déclarées
> une fois : libellé, route, groupe, icône et règle d'activation. Le rail, le
> tiroir de 768 à 1 023 px, la barre basse et la feuille « Plus » en
> dérivent ; aucune couche ne recopie une entrée à la main.
>
> **[[D-324]] §7 (amendé).** Le menu compte quinze entrées depuis [[D-385]]
> (« Comptes du cabinet »). Les bancs vérifient, couche par couche, les
> destinations servies, leur ordre, l'entrée active sur chaque route (une
> fiche patient allume « Fiches » ou « Fiche-trajectoire ») et l'absence
> d'entrée sans lien (Documents, Règles, Positions d'expert).

*Proposé* : l'activation sur une fiche (`/dashboard/patients/<id>`) devient
une propriété de la déclaration (`prefixesActifs`), comme au correctif C4
(#1973), au lieu d'une règle par couche.

---

## AM-5 — Rail praticien : escamotable, libellé au toucher

**Amende** : aucune décision ne règle le repli praticien (étape 1, §4). A5-R1
et A5-R2 disent « rail nuit structurel » sans parler de repli. Texte neuf.

*Traduit* (mandat du 2026-11-10 : « les bandeaux de menus latéraux doivent
être aussi repliables ou escamotables » ; cadrage §10) :

> Le rail praticien a trois états : déplié, réduit en icônes, escamoté. Le
> choix entre déplié et réduit reste mémorisé sur l'appareil (clé
> `wn-rail-expanded`, inchangée) ; l'escamotage aussi, par rôle, sans
> donnée ni identifiant patient. Escamoté, une commande de réouverture
> reste dans l'en-tête.

*Proposé* :

> Les commandes « Masquer la navigation » et « Afficher la navigation »
> (registre T-12, T-13) s'ajoutent à « Réduire la navigation » et « Étendre
> la navigation », inchangées (`NavBar.tsx:110`).
> Réduit, chaque entrée garde son nom accessible ; son libellé paraît au
> survol, au focus clavier et pendant l'appui du doigt, et Échap le masque
> (artefact Lien, version 4 ; `qr:39`, `qr:245`). Le rail des sept phases et
> le panneau de contexte d'une fiche se replient chacun par sa commande
> (cadrage §10) ; leur forme se dessine à l'étape 3.

---

## AM-6 — Adoption de l'identité Lien / Empreinte

**Amende** A5-R1 et A5-R2 (`REGISTRE_FRONTIERES.md`, « Révision : direction
artistique "la Spirale" » et « canvas mid-tone "ardoise & sable" »). C'est
la décision qui manquait au premier audit (constat B6) : la palette et la
marque ont été choisies le 2026-11-10 en conversation, sans ligne au dépôt.

*Traduit* (cadrage v3, en tête : « Décision validée : palette chaleureuse et
logo Empreinte » ; mandat du 2026-11-10) :

> **A5-R3 — Révision : direction « Lien chaleureux — Empreinte ».** La
> structure A5 est conservée : deux interfaces claires, aucun sélecteur de
> thème, aucune bascule clair/sombre, le rôle fixe l'interface. Changent :
> la palette (crème `#F7F1E7`, ivoire `#FFFCF7`, encre `#233B42`, pétrole
> `#205B63`, sauge, argile, avoine), la marque (Empreinte, nom
> « Wellneuro »), le rail praticien (nuit pétrole `#142F36`) et la
> typographie (Sora praticien, Lora pour les titres patient et la marque,
> Instrument Sans pour le corps, IBM Plex Mono 400). Les couleurs des strates
> Corps, Ancrage et Esprit ne changent pas.

*Proposé* :

> Le rail patient prend le fond sauge (`rail-background`) au lieu de
> `bg-surface` ([[D-447]] §5) ; il reste clair. Le vert de succès devient
> `#166534` (6,3:1 sur le fond crème). Les jetons et leurs contrastes sont
> ceux de l'artefact « Wellneuro Lien — Empreinte », version 4. Le
> déploiement suit les lots du cadrage §18 : fondations, shell et
> navigation, écrans, vérification ; chaque lot est réversible.

---

## AM-7 — Praticien : quatre groupes (seulement si Q-E2-1 (a))

**Amende** [[D-324]] §1 (« Le menu compte trois groupes : La Spirale,
Bibliothèque, Réglages »), §3 (« Réglages ne garde que "Paramètres" ») et §4
(« L'atelier de validation suit, en fin de groupe »). **Ne change pas** :
les entrées, leurs libellés, leurs routes et leurs gardes ; « Confiance &
droits » reste avec le travail du jour (§3) ; §2, §5 et §6.

*Proposé* (Q-E2-1 n'est pas tranchée ; rien n'est traduit) :

> **[[D-324]] §1 (amendé).** Le menu compte quatre groupes : Travail,
> Bibliothèque, Ateliers, Cabinet. Travail reprend les entrées de La
> Spirale, sauf « Comptes du cabinet ».
>
> **[[D-324]] §3 (amendé).** « Confiance & droits » reste dans Travail,
> après « Correspondance ». Le groupe Cabinet porte « Comptes du cabinet »
> ([[D-385]]) puis « Paramètres ».
>
> **[[D-324]] §4 (complément).** L'atelier de validation (« Atelier
> corpus ») quitte la fin du groupe Bibliothèque pour le groupe Ateliers,
> qui accueillera aussi l'atelier des règles et les positions d'expert
> quand leur garde leur donnera une entrée. La Bibliothèque garde ses cinq
> rayons.

Les noms de groupe sont au registre (T-01 à T-04). Composition détaillée :
`catalogue-revise.md` §2.

---

## AM-8 — Praticien : menu complet au téléphone (seulement si Q-E2-2 (b))

**Amende** [[D-324]] §5 (« La feuille "Plus" du téléphone reprend l'ordre et
les libellés du menu du bureau »). **Ne change pas** : les trois boutons de
la barre basse (Le Fil, Fiches, Synthèses).

*Proposé* :

> **[[D-324]] §5 (amendé).** Au téléphone, la feuille « Plus » est
> remplacée par un menu complet, ouvert depuis un bouton de l'en-tête ; il
> porte toutes les destinations, par groupes, dans l'ordre et avec les
> libellés du menu du bureau. La barre basse garde ses trois boutons.

Avec Q-E2-2 (a), recommandée, AM-8 n'a pas d'objet : la feuille « Plus »
reçoit seulement les intertitres de groupe, ce que §5 permet déjà.

---

## Ce qui n'est pas amendé

- [[D-283]] §5 (aucune surface neuve à un mineur), [[D-288]] §1 (surface
  neuve sous drapeau), [[D-333]] §1 (aucun compteur ni pastille), [[D-442]]
  §2 à §7 (contenu et activation du menu « Mon espace »), [[D-444]] (barre
  basse sous 768 px), [[D-423]] §2 à §4 (liste et activation).
- Le questionnaire en cours reste sans rail, sans barre et sans onglets
  ([[D-447]] §1, Q59).
- Aucun texte de pause, de conduite à tenir, de consentement ni de droits.
