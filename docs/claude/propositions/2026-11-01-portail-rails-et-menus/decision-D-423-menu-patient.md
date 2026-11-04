# Texte de décision — D-423 « Menu patient » (brouillon L0)

> Brouillon rédigé dans le lot L0 de l'audit « rails et menus »
> (`README.md`, chapitres 11, 14 et 15). Numéro réservé le 2026-11-02 par
> `node scripts/wn-reserver-decision.mjs` (`refs/tags/reserve/D-423`, [[D-370]]
> §1). Le texte n'entre pas dans `docs/DECISIONS.md` dans ce lot : il voyage
> avec L2, qui l'insère à son rang, comme [[D-324]]. Il a été relu et accepté
> mot pour mot par le responsable le 2026-11-03, avant tout code.

### D-423 — Menu patient : les espaces du hub se rangent en quatre groupes nommés, sans retirer d'accès ; la frise des six étapes devient navigable vers des cibles existantes seulement

- Date : 2026-11-02
- Statut : accepté mot pour mot par le responsable le 2026-11-03 ; entre au
  registre avec L2. Arbitrages du responsable du 2026-11-01
  (Q1 à Q3, Q27 à Q30, chapitre 14 de l'audit) et du 2026-11-02 (Q4 à Q26,
  Q31 à Q34, chapitre 15), sur questions à options fermées ; Q19, Q34 et les
  cibles des étapes 4 et 5 revues le même jour après relecture de la PR.
  Textes patient acceptés mot pour mot le 2026-11-02 (§3, §8) ; apostrophe
  typographique de « Ce que j’ai reçu » arbitrée le 2026-11-04 (Q35,
  chapitre 16).
- Domaine : portail patient, hub `web/src/app/portail/[token]/questionnaires/page.tsx`
  (bloc « Autres espaces », compteur, « Mon accompagnement »), retour de
  `informations/page.tsx`, frise `PatientJourneyProgress` sur le hub,
  `FORMULATIONS_PATIENT`. Lots L2 (regroupement) et L2b (frise navigable) de
  l'audit `docs/claude/propositions/2026-11-01-portail-rails-et-menus/`.
- **Complète** [[D-175]] et [[D-172]] (le fil du jour garde l'étape) ;
  **verse** l'arbitrage du responsable du 2026-09-12 (LOT-05 de la campagne
  « vie du portail patient », hors D-xxx jusqu'ici) au §5. **Applique**
  [[D-288]] §1 (§7), [[D-333]] §1 (§6), [[D-360]] §2 (§2), [[D-357]] §2 (§2),
  [[D-293]] (§6), [[D-276]] §1 tel que [[D-365]] §2 le lit (§6), [[D-315]] et
  [[D-349]] §2 (§3), D7 et D11 de la campagne SP-CONV (§8).
- **Ne touche pas** :
  - A6-R1 (REGISTRE_FRONTIERES) et `.claude/rules/frontend-ui.md:36-40` :
    aucun amendement ; le menu du hub et la frise navigable restent dans
    « une étape à la fois » ; un amendement ne viendrait qu'avec le bouton
    « Menu » et le tiroir (L3), par sa propre décision ;
  - le rail et le shell praticien (`SidebarRail`, `NavBar`,
    `MobileBottomNav`) ; le gel de D/49 ;
  - `[token]/page.tsx`, l'écran « Merci ! » et `/api/portail/session` ;
  - les routes, les sondes, les drapeaux existants, les gabarits d'e-mail ;
  - la barre basse (L4) et le rail latéral (L5) ;
  - la base : aucune migration.
- Contexte : la ligne « Autres espaces » du hub porte jusqu'à douze liens de
  même poids (treize emplacements au code), plus haute que « Mon parcours »
  pour un patient qui a reçu bilan, fiches et courriers (PLAN §8, D/30). Le
  responsable a demandé une organisation « comme l'espace praticien » ; il a
  retenu l'organisation seule (groupes nommés, ordre, un seul élément actif,
  liste déclarée une fois), sans l'apparence ni les compteurs, et une frise
  des étapes navigable à côté du menu (Q1 à Q3).

**§1 — Périmètre.** Le premier lot regroupe les liens existants dans le hub
(organisation A, L2). La frise des étapes devient navigable ensuite (L2b). Le
bouton « Menu » et le tiroir (organisation B, L3) restent ouverts et se
décident après constat de l'écran de L2 ; le rail latéral (C) n'est pas
engagé ; la barre basse (L4) n'est pas dans cette décision.

**§2 — Groupes, ordre, rang.** Sous `<nav aria-label="Autres espaces">`, nom
conservé, l'ancre « Mon parcours » puis quatre groupes, dans cet ordre, les
entrées dans l'ordre écrit :
1. « Au jour le jour » : « Ouvrir mes rendez-vous de suivi », « Ouvrir Mon
   carnet alimentaire » ; les deux sans condition, chaque page disant
   elle-même ce qui manque ;
2. « Ce que j’ai reçu » : « Consulter mon bilan » (`bilanConsultable`) ; « Ma
   bibliothèque » ou, à défaut, « Fiches remises par mon praticien », jamais
   les deux ([[D-360]] §2) ; « Courrier pour votre médecin » ; « Courrier à
   remettre à votre médecin » ; « Pour votre médecin » ;
3. « Ce que je transmets » : « Ma fiche de renseignements » ; « Transmettre un
   compte rendu d’analyses » ; « Déposer un document » ;
4. « Avec mon praticien » : « Ouvrir mon dossier à deux voix » ; « Ouvrir mes
   échanges », en dernier.

Chaque entrée garde sa condition et sa sonde, fermées par défaut ; aucune
n'en reçoit de nouvelle. Un groupe sans entrée ouverte n'a pas d'étiquette et
ne s'affiche pas ([[D-357]] §2 par analogie). Aucun groupe n'est replié. Les
entrées sont des liens de liste, cible de 44 px au moins en `rem`, et non
plus des boutons de 48 px. Aucun compteur, aucune icône obligatoire, aucun
repli mémorisé, aucun jeton `--rail-*`.

**§3 — Libellés.** Acceptés mot pour mot le 2026-11-02, l'apostrophe
typographique de « Ce que j’ai reçu » arbitrée le 2026-11-04 (Q35, chapitre 16
de l'audit) :
- noms de groupes : « Au jour le jour », « Ce que j’ai reçu », « Ce que je
  transmets », « Avec mon praticien » ;
- libellés d'entrée : inchangés, tels que servis au 2026-11-02 ;
- retour de `/informations` : « ← Mon parcours », même cible (le hub) ; le
  retour de `/conditions` reste « ← Mon espace », vers l'accueil de
  l'espace ;
- « Mon accompagnement » : titre inchangé ; le bloc s'affiche déplié d'office
  quand un protocole est servi, replié sinon. Il n'ajoute pas de second repli
  autour de celui de [[D-315]] : le titre, la raison et « Ce qu'on
  travaille » se lisent sans clic, une pause déplie le détail d'office, et
  l'encart de conduite se lit avant tout clic ([[D-349]] §2). Aucune icône,
  aucun texte lu ajouté, aucun changement de couleur.

**§4 — Activation.** Un seul élément porte `aria-current="page"` par
chemin, choisi sur le segment qui suit `/portail/{token}/` :
`/questionnaires`, `/questionnaires/[idAssignation]` et `/protocole`
allument « Mon parcours » ; `/fiches` et `/fiches/[idRemise]` allument
l'entrée servie, bibliothèque ou fiches ; `/ce-qui-compte` et
`/comprehension` allument « Ouvrir mon dossier à deux voix » ;
`/informations` et `/conditions` n'allument rien. La connexion,
`lien/indisponible` et les écrans de `[token]/page.tsx` n'ont pas de menu.
La visibilité d'une entrée n'est jamais une autorisation : les refus restent
portés par les routes.

**§5 — Ce qui reste au fil et hors menu.** L'arbitrage du responsable du
2026-09-12 est versé ici : ce qui vit dans un autre écran n'a pas de porte
séparée, et une invitation appartient au fil du jour, pas à une navigation
permanente. « Dire ce qui compte pour moi », « Ce que le praticien a
compris » et le protocole n'ont pas d'entrée propre : les deux premiers
vivent dans le dossier à deux voix, le protocole dans « Mon accompagnement ».
Restent au fil, comme tâches qui paraissent quand elles sont dues et s'en
vont quand elles sont faites : agendas, rendez-vous de suivi dû, lectures
(bilan, fiches, courriers, compréhension), invitation « Dire ce qui compte
pour moi », questionnaires. La proposition de réévaluation devient une tâche
du fil, dans un lot à part, après L2 ; son texte s'accepte alors. Restent hors
menu, sans porte nouvelle : informations, conditions, et « Signaler un
problème » (pied de page et page informations, dette du plan).

**§6 — Ce qui ne change pas.** Aucun accès n'est retiré : chaque emplacement
servi au 2026-11-02 retrouve une place ([[D-276]] §1, que [[D-365]] §2 lit
comme couvrant le portail). Aucune route n'est créée ni retirée. Aucun
chiffre n'entre au portail ([[D-333]] §1) ; le compteur « N questionnaires à
compléter · ≈ N min » du hub, qu'aucune famille d'exceptions n'admet, est
retiré, la liste « À compléter » restant. Les numéros d'urgence restent au
pied de toutes les pages ([[D-293]]). Les murs d'entrée (« Avant de
commencer », date de naissance) précèdent toujours le hub.

**§7 — Exécution.** Un regroupement de liens existants n'est pas une surface
neuve au sens de [[D-288]] §1 : L2 se livre sans drapeau, son retour arrière
est un revert, il porte aussi le retrait du compteur (§6), l'allègement des
liens (§2) et le dépli de « Mon accompagnement » (§3). La frise navigable
(L2b) et le bouton « Menu » (L3) changent visiblement l'écran : chacun est une
surface neuve, livrée derrière un drapeau serveur éteint, inscrite dans
`docs/FEATURE_FLAGS.md`, et prend une place dans la file C. Avant L2, un
constat à l'écran sur dossier de test majeur, mineur et clos mesure la
hauteur réelle et l'écart entre emplacements et liens servis (L1). Le
composant patient est séparé des composants praticien.

**§8 — Frise des étapes (L2b).** Sur le hub, la frise devient
`<nav aria-label="Étapes de votre parcours">`, distincte de « Autres
espaces » ; un seul `aria-current="step"` ; cibles de 44 px au moins en
`rem` ; libellés inchangés, sans rang ni numéro (Q33 : un rang visible
attendrait une précision de [[D-333]]). Une étape passée s'ouvre en relecture
quand une cible existante la relit, l'étape à venir est annoncée et fermée, ce qui reste dans « une étape à la
fois » : revenir à une étape franchie n'est pas empiler. Une étape sans cible
existante n'est pas cliquable ; aucune route n'est créée.

| Étape | Passée | Courante | À venir |
|---|---|---|---|
| 1 Consentement | non cliquable : aucune page ne relit le consentement au suivi | sans objet sur le hub | sans objet |
| 2 Informations | non cliquable : aucune page ne relit la fiche signalétique | sans objet sur le hub | sans objet |
| 3 Situation | non cliquable : aucune surface patient ne relit l'anamnèse | sans objet sur le hub | sans objet |
| 4 Questionnaires | la liste des questionnaires du hub (section) ; si elle n'est pas rendue, « Mon parcours » | la liste des questionnaires du hub (section) ; si elle n'est pas rendue, « Mon parcours » | sans objet |
| 5 Analyse du praticien | non cliquable | texte selon l'état (ci-dessous) | fermée |
| 6 Restitution | sans objet | le bilan quand `bilanConsultable` le sert, sinon non cliquable ; jamais de texte d'attente | fermée |

`/conditions` et `/informations` restent des pages du pied de page, hors
menu : la frise n'y mène pas.

Texte de l'étape 5 courante, selon l'état dérivé (D7, D11 : la phrase suit
l'état, jamais au-delà) :
- `analyse_en_cours` : texte d'attente accepté mot pour mot le 2026-11-02,
  « Votre praticien prépare votre restitution à partir des éléments
  transmis. Vous la retrouverez ici dès qu’elle sera prête. » Il ne porte ni
  chiffre ni délai promis ;
- `elements_transmis` : la phrase déjà servie de `FORMULATIONS_PATIENT`,
  « Vos éléments ont été transmis. » ; aucun texte neuf.

Le texte neuf s'écrit dans `formulations.ts` et entre dans les valeurs que
parcourt `TOUTES` dans `formulations.guard.test.ts` (D7) : un texte exporté
à côté sans y être ajouté échapperait à la garde.

Les écrans d'entrée de `[token]/page.tsx` gardent leur frise comme repère,
non navigable.
