# Cadrage — ce que le protocole 21 jours dit au patient, et qui a le droit de l'écrire

- Date de l'arbitrage : 2026-09-14. **Date d'écriture : 2026-09-15.**
- Objet : la frontière patient du protocole, et la garde qui manque sur ce chemin
- Statut : **enregistré au registre sous `D-189`** dans la même PR que ce cadrage.
  Le numéro se reprend au merge s'il a été pris entre-temps — il l'a été deux fois
  dans la même soirée.
- Lot : LOT-00 de la campagne `2026-09-14-protocole-assiste`. Gate le LOT-04.

Ce fichier suit le patron de `CADRAGE_SOURCES_CITABLES_2026-09-09.md`, qui a tenu
le même raisonnement pour l'objectif négocié cinq jours plus tôt et a produit
[[D-160]].

---

## Le fait qui oblige à écrire cette décision

`purpose` — la « raison d'être » du protocole — est **du texte libre non gardé**.
Le navigateur l'écrit, la route le persiste tel quel (`purpose: submission.purpose ?? ''`),
le seul contrôle est « non vide » (`nonEmpty`), et il **part au patient** : le
portail le sert, `PatientCompanionHome` le rend en sous-titre de l'écran d'accueil.

Or `web/src/lib/documents/vocabulaire.ts` porte, en tête, une carte des chemins de
texte sortants, et énonce d'elle-même la règle qui la justifie :

> un chemin de texte sortant absent d'ici est un chemin **sans garde**, et **il n'a
> pas le droit d'exister**. C'est le gate des campagnes 6.0.

**Le protocole n'y figure pas.** Ce n'est donc pas une amélioration qu'on propose :
c'est une infraction en cours qu'on referme.

## Pourquoi la citation et la garde ne se séparent pas

[[D-160]] §4 l'a déjà écrit, pour l'objectif négocié, et le motif est le même ici :

> La garde manquante se pose EN MÊME TEMPS. […] Sans cela, **la citation devient le
> chemin sûr et la frappe le chemin sale** : on aurait déplacé le défaut au lieu de
> le fermer.

Ouvrir une voie de citation propre sans garder la saisie libre revient à créer deux
chemins de qualité inégale vers le même champ patient. Les deux entrent ensemble ou
aucun n'entre.

## Le régime de la garde : refus CONFIRMABLE, et la leçon du booklet

[[D-090]] a posé que **le régime suit le geste, pas le texte** : un refus
confirmable n'a de sens que s'il existe un humain pour trancher **au moment où il se
produit**. Ici il y en a un — le praticien enregistre sa version, il est devant
l'écran. Le régime est donc celui de la publication d'une synthèse : `409`
`REGISTRE_ANXIOGENE`, nommant le terme **tel qu'il est écrit**, et levable par un
second geste explicite.

**Et la leçon qui coûte le plus cher est celle du booklet.** Sa garde était
confirmable « depuis toujours » — et **aucun des deux écrans n'envoyait
`confirmerRegistre`**. Un bilan validé le 16 août n'est jamais parti ; trois
tentatives à 18 h 09, 18 h 10, 18 h 11 sur un dossier réel, et le journal affichait
« Échec d'envoi ». Une garde confirmable **sans commande d'écran est une garde
bloquante déguisée**. Le bouton part donc dans le même lot que la garde, et le lot
n'est pas « done » sans lui.

## Ce qui est citable, et ce qui ne l'est pas

Le garant n'est pas la commodité : c'est **la provenance de ce qu'on prête au
patient**. Deux entrées passent ce test, et deux seulement.

**Le libellé d'axe signé.** Il vit dans `PRIORITY_RULES_V1`, couvert par
`PRIORITY_RULES_SHA256`, et il est **court par construction** (« Axe sommeil et
rythme circadien »). Mieux : il n'a **pas besoin d'être désigné par l'écran**.
`protocol_drafts.selected_priority_id` est persisté, et `resoudreRegleSignee`
(`lib/praticien/sourceSigneeVerifiee.ts`, l'adaptateur borné ouvert par [[D-115]])
recopie le libellé depuis le registre, fail-closed : registre non signé ⇒ 503,
règle non publiée ⇒ **pas de libellé, jamais de texte fabriqué**. Le serveur le
dérive seul.

**La tête de l'objectif négocié actif** — `priorite` et `reformulationPraticien`.
Matériau déjà lu par le patient, et sous accord : [[D-161]] §10 en fait la condition
même du passage à la décision. Elle se cite **par identifiant**, le serveur recopie,
et la provenance se **constate** en comparant les textes — patron de
`lib/objectif/provenanceVerifiee.ts` : `citeExactement` sur un `trim()` seul, jamais
de repli d'espaces ni de casse, et `catch { return {} }` — une provenance non
constatable n'est pas posée, l'enregistrement ne lève pas. C'est ce mécanisme unique
qui fait aussi **tomber la marque au premier caractère réécrit** ([[D-167]] §6).

**Jamais citables, et ce n'est pas une prudence de forme.**

- Le **motif praticien de sélection** (`DecisionPrioritySelection.rationale`) : 2 000
  caractères écrits face au rang, destinés à se relire six semaines plus tard. Le
  schéma dit lui-même que « c'est ce qu'une version de protocole citera » — et rien
  ne le cite aujourd'hui. Cette décision tranche **dans l'autre sens** : il s'affiche
  au praticien, il ne part pas au patient.
- Le **rationale du moteur**, qui embarque sa mécanique en clair : « Déclencheur
  atteint — score 8 ≥ 7 ». Les fixtures de test le nomment déjà « Raisonnement
  interne confidentiel » ; c'est un banc, pas une convention.

**Aucune source pour le critère J21.** Il s'écrit avec le patient. Un axe n'est pas
un critère, et une priorité n'est pas un engagement à trois semaines.

## Ce que cette décision NE TRANCHE PAS, et pourquoi

**La forme de la vue patient reste ouverte.** Le cadrage du 2026-09-14 avait retenu
« brancher le contrat `PatientProtocolView` qui existe déjà ». La vérification faite
depuis **invalide la prémisse sur laquelle cette option a été présentée** :
`buildPatientProtocolView` exige une **`DecisionCard`**, et il n'existe **aucune
table `decision_cards`** — la carte n'est reconstruite que sur la route du cockpit
praticien, par `construireChaineC1Tolerante`. La route du portail le dit d'ailleurs
elle-même, c'est la raison écrite du `priorityLabel` « différé » : « issu de la
DecisionCard NON persistée ».

Trois voies s'ouvrent, et le choix a des conséquences cliniques :

1. **Recomposer la carte sur le chemin patient.** Fait tourner le moteur clinique
   sur la route du portail — et `buildPatientProtocolView` vérifie
   `protocolDraft.decisionCardInputHash === decisionCard.inputHash`, qui **dérive dès
   que le dossier bouge**. Sur un cycle de 21 jours, c'est le cas normal : la vue
   lèverait au lieu de servir.
2. **Persister la carte.** Une migration — que cette campagne s'est interdite, et
   qui relève de [[D-087]].
3. **Ne pas brancher le contrat** : étendre la projection existante aux trois
   actions et y ajouter le libellé d'axe **re-dérivé au serveur** (§ ci-dessus), qui
   ne demande aucune carte.

Ce point revient au responsable. Il ne bloque ni la liste de sources citables, ni la
garde de registre : la vue patient décide **ce qui est servi**, cette décision décide
**qui a le droit de l'écrire**.

---

## Texte de décision, à placer en tête de `docs/DECISIONS.md`

### D-189 — Ce que le protocole 21 jours dit au patient : deux sources citables, et la garde qui manquait sur ce chemin

- Date de l'arbitrage : 2026-09-14. **Date d'écriture au registre : 2026-09-15.**
- Statut : accepté — arbitrages du responsable rendus en séance le 2026-09-14
  (questions 3 et 5 des douze qui cadrent la campagne).
- Domaine : doctrine produit et frontière patient — protocole 21 jours, campagne
  « 5. Actions — le protocole assisté », LOT-00.
- Amende : rien. Elle **applique** le patron de [[D-094]] §1 et de [[D-160]] à un
  troisième champ, et inscrit un chemin de plus à la carte de `vocabulaire.ts`.

**LE CONSTAT, ET IL EST UNE INFRACTION EN COURS.** `purpose` — la raison d'être du
protocole — est du **texte libre non gardé** : le navigateur l'écrit, la route le
persiste tel quel (`purpose: submission.purpose ?? ''`), le seul contrôle est « non
vide », et il **part au patient**, rendu en sous-titre de son écran d'accueil. Or la
carte des chemins sortants de `web/src/lib/documents/vocabulaire.ts` énonce sa
propre règle : « un chemin de texte sortant absent d'ici est un chemin **sans
garde**, et **il n'a pas le droit d'exister**. C'est le gate des campagnes 6.0. » Le
protocole n'y figurait pas.

**Décision :**

1. **Une liste FERMÉE de sources citables dans `purpose`, à deux entrées.**
   - **Le libellé d'axe signé** (`PRIORITY_RULES_V1`, couvert par
     `PRIORITY_RULES_SHA256`). Il ne se désigne même pas :
     `protocol_drafts.selected_priority_id` est persisté, et le serveur recopie le
     libellé par `resoudreRegleSignee` — l'adaptateur borné de [[D-115]] —, en
     fail-closed : registre non signé ⇒ 503, règle non publiée ⇒ **pas de libellé,
     jamais de texte fabriqué**.
   - **La tête de l'objectif négocié ACTIF** (`priorite`, `reformulationPraticien`),
     citée **par identifiant**, recopiée au serveur. Matériau déjà lu par le patient
     et sous accord — [[D-161]] §10 en fait la condition du passage à la décision.
   La provenance est **portée par la version** et se **constate** en comparant les
   textes, patron de `provenanceVerifiee.ts` : `citeExactement` sur un `trim()` seul,
   jamais de repli d'espaces ni de casse, et une provenance non constatable n'est pas
   posée plutôt que de faire lever l'enregistrement. C'est ce mécanisme unique — et
   non un second — qui fait **tomber la marque au premier caractère réécrit**
   ([[D-167]] §6).

2. **Ce qui ne se cite JAMAIS dans un champ servi au patient**, et ce n'est pas une
   prudence de forme : le **motif praticien de sélection**
   (`DecisionPrioritySelection.rationale`, 2 000 caractères écrits face au rang) et
   le **rationale du moteur**, qui embarque sa mécanique en clair (« Déclencheur
   atteint — score 8 ≥ 7 »). Ils s'affichent au praticien ; ils ne partent pas.
   Le schéma disait de `rationale` que « c'est ce qu'une version de protocole
   citera » : **cette décision tranche dans l'autre sens**, et l'écrit.

3. **Aucune source pour le critère J21.** Il s'écrit avec le patient. Un axe n'est
   pas un critère, et une priorité n'est pas un engagement à trois semaines.

4. **La garde de registre anxiogène se pose EN MÊME TEMPS**, et le chemin entre à la
   carte de `vocabulaire.ts` dans la PR qui le crée, comme cette carte l'exige.
   - **Portée** : tout champ qu'une route patient sert — `purpose`,
     `followUpCriterion`, et par action `title` et `minimalPlan`.
   - **Régime** : **refus confirmable** (`409 REGISTRE_ANXIOGENE`, le terme nommé
     **tel qu'il est écrit**), levable par un **second geste explicite** du
     praticien. [[D-090]] : le régime suit le geste, et il y a ici un humain devant
     l'écran au moment où le refus se produit.
   - **Jeton** : la confirmation ne vaut que pour CE texte (`texteSha256` préfixé
     par domaine, patron du document patient biologie) — sinon une confirmation
     donnée une fois couvrirait une réécriture ultérieure.
   - **ET LA COMMANDE D'ÉCRAN PART DANS LE MÊME LOT.** La garde du booklet était
     confirmable « depuis toujours » et **aucun écran n'envoyait
     `confirmerRegistre`** : un bilan validé le 16 août n'est jamais parti, trois
     tentatives à 18 h 09, 18 h 10 et 18 h 11 sur un dossier réel, et le journal
     affichait « Échec d'envoi ». **Une garde confirmable sans bouton est une garde
     bloquante déguisée.**

5. **Clause de fermeture.** Toute extension de cette liste est une décision `D-xxx`
   nouvelle, pas un champ de plus.

**CE QUE CETTE DÉCISION N'AUTORISE PAS** : faire rédiger `purpose` par un modèle ;
recopier un texte reçu du navigateur sous l'étiquette d'une source (l'écran envoie
un identifiant, et rien d'autre — [[D-115]] a été écrite pour exactement ce défaut) ;
citer une source absente de la liste ; ni lever la garde autrement que par le geste
explicite du praticien, tracé.

**CE QUE CETTE DÉCISION NE TRANCHE PAS, et il faut le dire plutôt que le supposer.**
La **forme de la vue patient** reste ouverte. Le cadrage du 2026-09-14 avait retenu
« brancher le contrat `PatientProtocolView` qui existe déjà » — la vérification faite
depuis **invalide la prémisse sur laquelle cette option a été présentée** :
`buildPatientProtocolView` exige une `DecisionCard`, et il n'existe **aucune table
`decision_cards`** ; la carte n'est reconstruite que sur la route du cockpit
praticien. La route du portail le disait déjà, c'est la raison écrite de son
`priorityLabel` « différé » : « issu de la DecisionCard NON persistée ». Trois voies
restent, et elles ne se valent pas — recomposer la carte sur le chemin patient (le
contrôle `decisionCardInputHash` dérive dès que le dossier bouge, donc la vue
lèverait au lieu de servir) ; persister la carte (une migration, [[D-087]]) ; ou ne
pas brancher le contrat et étendre la projection existante avec le libellé d'axe
re-dérivé au serveur, qui ne demande aucune carte. **Arbitrage du responsable.**
Cette décision ne s'en trouve pas suspendue : la vue patient décide **ce qui est
servi**, celle-ci décide **qui a le droit de l'écrire**.

- Conséquences : fragment
  `changelog.d/2026-09-15-frontiere-patient-du-protocole.md` ; ligne ajoutée à la
  carte de `vocabulaire.ts` **dans la PR du chemin** (LOT-04), avec sa garde, son
  régime et son banc de débranchement. Aucune migration, aucun drapeau neuf.
