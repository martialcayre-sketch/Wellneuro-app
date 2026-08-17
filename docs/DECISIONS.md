# Registre des décisions Wellneuro

> Append-only. Ajouter une nouvelle décision en tête de la section active.

## Décisions actives

### D-068 — Le catalogue biologie niveau 1 entre en base : 47 analytes, 15 panels, 2 plages sourcées

- Date : 2026-08-17
- Statut : accepté (proposition du 2026-08-15 v5 validée par le praticien ;
  arbitrages restés ouverts tranchés en session — F.1 répétition sur les
  panels socle par choix explicite, blocs conservés tels quels, MADRS en
  comparaison, panel fatigue entier, F.3/F.4/F.5 sur l'option portée par le
  document) et implémenté en migration de données.
- Domaine : catalogue biologie, migration de données, schéma (une colonne)
- Contexte : `D-059` §2 exigeait une proposition validée ligne à ligne avant
  toute migration. La proposition v5 existe, ses 49 claims ont été relus en
  production (tous `VALIDE`, actifs, non superseded — 2026-08-16), et les
  textes des claims d'arbitrage ont été relus le 2026-08-17 (ferritine
  50-80 ng/mL verbatim ; vitamine D cible 45 sur `0239-004`, concordant
  `0154-054`).
- Décision :

**1. Composition SEULE.** 47 analytes (§A), 15 panels (§B/§C/§D — ceux que les
règles de PR-3 référencent), items de composition. Aucune indication en base :
les conditions vivent dans la table signée `indicationsBiologieV1.ts` (`D-059`).
Les panels « seconde intention » ne sont pas transcrits (compositions citant
des analytes hors §A). `source_provenance = 'saisie_praticien'`.

**2. Écarts nommés, jamais comblés.** L'apoprotéine (`0178-054`) et « les IgA
sécrétoires » (`0178-055` — le claim ne dit pas le site de prélèvement,
salivaire et fécales existant toutes deux) n'ont pas de code §A : lignes
omises. Le « < 10 ng/mL » de `0239-010` est un seuil de déficit profond avec
conduite associée, pas une borne de plage cible : non transcrit. **La plage
vitamine D n'a pas de plafond, et c'est un écart de corpus** : aucun claim ne
borne le haut (`0239-005`, 60 ng/mL, se déclare non consensuel — non
prescriptif en base) ; la ligne cite `WN-CL-0154-054`, le claim qui FONDE la
forme « > 45 » (revue, BL-1), et dit « zone souhaitée », jamais « rien n'est
trop haut ». Les quatre entrées « rapport/indice » restent des ANALYTES (leurs
opérandes ne sont pas tous au catalogue — les décomposer serait inventer) ;
leurs codes occupent l'espace `BIO_RATIO_*` que la table des ratios réserve —
l'intersection des deux espaces est désormais interdite par contrat
(`cb_catalogue_niveau_1_donnees.sql`, finding MA-2). Trois résolutions
générique → spécifique sont HÉRITÉES de la proposition validée (MI-7) :
« fer » (`0334-005`) → fer sérique, « magnésium » (`0388-008`) →
érythrocytaire, « acides gras » (`0282-018`) → érythrocytaires. Enfin le
panel fatigue porte 14 analytes, fidèles à l'énumération de `0361-009` — la
garde §B.7 de la proposition écrit « 13 », décompte faux d'une unité dans le
document validé (MI-6, signalé au praticien).

**3. La barrière `D-003` s'exécute À L'INSERTION.** Les deux plages
fonctionnelles sont des `INSERT … WHERE EXISTS (claim VALIDE et actif)` : en
CI (corpus vide) zéro ligne et le contrat reste vert par vacuité ; en
production les claims sont vérifiés présents (`v1.0`, relus le 2026-08-17).
Une plage qui ne s'insérerait pas est un écart à lire en vérification
post-release, jamais un oubli silencieux.

**4. La colonne `validation_medicale_requise`** (schéma + défaut `false`)
porte l'arbitrage F.6 : l'insulinémie seule à `true` — règle de sécurité
PRODUIT, posée explicitement, aucun claim ne la fonde et c'est dit. Le
vocabulaire d'unités est étendu de `µg/mL` (BIO_LBP), par la voie additive que
la migration d'origine prévoyait.

**5. Choix d'exploitation écrits (revue du 2026-08-17).** `statut_fiche`
reste `'importee'` : la vérification PAR FICHE (`verifiee` + signataire +
date) est un geste praticien ultérieur, distinct de la validation du catalogue
que cette décision porte — un lecteur filtrant `verifiee` voit un catalogue
vide, et c'est exact. Le pointeur `biology_catalog_versions_courantes` reste
VIDE pour `saisie_praticien` : ce mécanisme d'idempotence est construit pour
les imports versionnés d'une source amont (snapshot NABM) — un catalogue saisi
n'a pas de snapshot ; l'ancrage de version est cette décision et le contrat de
données (47/15/78/2). La barrière d'insertion reprend le prédicat EXACT du
contrat CI (`VALIDE` + `active`, sans `superseded_at` — lacune héritée du
contrat, consignée, MI-8). Les deux panels non indiqués PORTENT leur motif
(colonne `objectif`, verbatim `0242-007`/`0042-007`) : si PR-3 glisse, la
production ne montre pas deux coquilles vides (MA-4).

- Conséquences : `release-db` après merge (approbation humaine), vérification
  de la base de production en lecture MCP ensuite (47 analytes, 15 panels,
  78 items, 2 plages, insulinémie seule marquée — les sept lectures du bloc
  « risques » de la PR). PR-3 (règles + signature) peut référencer les
  `panelCode`.
- Écarté : transcrire les panels seconde intention avec des compositions
  amputées (misrepresentation des claims) ; poser les plages sans condition
  d'existence du claim (le CI aurait exigé une liste d'exceptions ou un corpus
  fixture) ; décomposer les ratios en opérandes absents du §A.

### D-067 — Les quatre tables cliniques passent au verrou à cinq termes, et les signatures dues sont reposées

- Date : 2026-08-16
- Statut : accepté (arbitrage praticien explicite en session — « toutes les
  signatures praticien, sans réserves ») et implémenté.
- Domaine : clinique, signatures des tables, verrous fail-closed
- Contexte : `D-063` a construit sur le verrou biologie le seul verrou à cinq
  termes du dépôt — booléen, date, forme ISO canonique, claims, concordance
  d'un `shaPerimetre` littéral avec le SHA recalculé du contenu — et a nommé
  l'écart : les quatre tables historiques (orientation, priorités, arrêt,
  contradictions) restaient à trois termes, sans détection de péremption. Par
  ailleurs `D-062` avait agrandi le périmètre haché des priorités APRÈS leur
  signature du 2026-08-15 : la re-signature était due. Enfin la réserve F5 de
  la revue du 2026-08-16 : la date d'orientation (`'2026-08-06'`) n'était pas
  ISO canonique et son verrou ne contrôlait pas la forme.
- Décision, trois gestes :

**1. `shaPerimetre` entre dans les quatre métadonnées**, en littéral figé
recopié depuis la constante calculée au moment de la relecture — jamais la
constante elle-même (comparaison tautologique, péremption invisible ; piège
documenté par le verrou biologie). Les quatre fonctions de validation passent
à cinq termes (`tablePrioritesSignee`, `tableSignee` ×2, `tableArretSignee`),
forme ISO canonique de la date comprise — une date mal formée FERME. Sur la
table d'ARRÊT, c'est le terme qui compte le plus : une règle d'extinction
retouchée après signature aurait éteint sous une signature qui ne l'a jamais
couverte.

**2. Les priorités sont RE-SIGNÉES au 2026-08-16** sur le périmètre agrandi
par `D-062` (procédure d'abstention comprise) — la dette de re-signature est
soldée. Le SHA du contenu n'a pas changé depuis `D-062` ; la date, si :
`validation.validatedAt` change, donc la fenêtre 409 `chaine_c1_divergente`
(constat M5) se rouvre pour toute carte préparée avant déploiement et soumise
après. Assumé et borné, comme les deux fois précédentes.

**3. La date d'orientation est portée à l'ISO canonique** (`'2026-08-06'` →
`'2026-08-06T00:00:00.000Z'`) : le JOUR attesté ne change pas, seule la forme
rejoint le standard que le verrou contrôle désormais (réserve F5 soldée).
L'arrêt et les contradictions gardent leur date du 2026-08-15 — leur contenu
n'a pas bougé, seul le `shaPerimetre` s'ajoute.

- Conséquences : la sentinelle de date de la revue M/F a rougi comme prévu et
  a désigné les deux copies à aligner (`DATE_SIGNATURE_LIVREE`,
  `DATE_SIGNATURE_SIMULEE`) ; la date simulée désalignée de
  `priorityRulesV1.test.ts` (dette n° 4 du handoff) est alignée au passage ;
  `FEATURE_FLAGS.md` suit, tenu par son garde. Les bancs en escalier prouvent
  chaque terme séparément, péremption comprise.
- Écarté : re-dater l'orientation au 2026-08-16 (le fait attesté est la
  relecture du 6 août — changer la date affirmerait une relecture qui n'a pas
  eu lieu) ; poser `shaPerimetre` sans re-signer les priorités (le littéral
  aurait figé un périmètre que la signature ne couvrait pas).

### D-066 — Cinq instruments cognitifs sont réactivés sur déclaration du praticien, et trois moteurs publient leurs comptes de complétude

- Date : 2026-08-16
- Statut : accepté (deux arbitrages praticien explicites en session, le second
  pris en connaissance des motifs réels de suspension, re-présentés avant le
  geste) et implémenté.
- Domaine : catalogue des questionnaires, droits, scoring (métadonnées de
  complétude), consigne de synthèse (bump v26)
- Contexte : sept des dix-sept instruments déclencheurs du catalogue biologie
  niveau 1 ne pouvaient pas allumer leur panel (audit du 2026-08-16, consigné
  dans `RESERVE-instruments-non-declenchables.md` de la proposition). Cinq
  étaient suspendus (`actif: false`, zéro passation en production) : les panels
  mémoire et neurodégénératif étaient morts en toutes formes. Deux moteurs ne
  publiaient aucun compte de complétude (HAD, IBS-SSS) : leurs branches de
  disjonction (`D-060` §2) étaient inertes à vie.
- Décision, en deux volets :

**1. Réactivation de `Q_GEO_03`, `Q_GEO_04`, `Q_GEO_05`, `Q_GEO_06` et
`Q_NEU_06`, sur déclaration du praticien-propriétaire que l'usage est couvert**
— patron EORTC du 2026-07-30 : la déclaration lève la suspension, jamais les
réserves, qui restent au registre (« © PAR, licence requise » pour le MMSE ;
identité IEDM sans ayant droit sollicitable pour le MMT). Les motifs réels de
la suspension ont été re-présentés au praticien avant le geste, et la décision
les porte explicitement :

- ces cinq instruments sont **de consultation** (administrés par le clinicien
  ou renseignés avec l'informant) — leur assignation est un geste praticien,
  jamais un envoi de routine, et le bandeau `administrationMode: 'clinicien'`
  reste ce qui le dit à l'écran ;
- le **risque de mesure du MMT demeure nommé** (auto-rempli hors surveillance,
  le test se corrige en remontant la page) — la décision le porte, elle ne le
  nie pas ; la trace vit dans `mmtReconstruit.guard.test.ts` ;
- les sentinelles qui épinglaient la fermeture sont **inversées, jamais
  supprimées** : `droitsAssignabilite.guard.test.ts` épingle la liste exacte
  des ouverts par décision (la prochaine ligne de `PASSATION_PRATICIEN` reste
  fermée sans décision), `bibliotheque.test.ts` épingle chaque instrument dans
  sa position. `Q_URO_02`, `Q_PED_02` et `Q_PED_03` restent fermés, hors
  périmètre.
- `listeBibliotheque()` fusionne désormais les deux sources : un instrument
  peut être de passation praticien ET assignable — sans la jointure, les cinq
  sortaient en double au sélecteur d'assignation.

**2. Les moteurs `had`, `sum_two_phases` et `francis` publient leurs comptes de
complétude** (`missing`/`repondus`, par axe pour HAD, à la racine pour les deux
autres) — extension de la campagne du 2026-08-04, mêmes clés, même contrat.
Sans eux, aucune branche de disjonction ne peut viser HAD-A, HAD-D, le test des
5 mots ou l'IBS-SSS (`D-060` §2, fail-closed). Effet de bord assumé et voulu :
sur un recueil partiel, la garde générale de complétude annule désormais la
mesure de ces porteurs là où elle ne lisait rien — c'est le comportement que
les autres moteurs ont déjà. La consigne de synthèse passe en v26 : **missing**
rejoint **items** et **repondus** dans la phrase qui sépare les comptes de
questions des points de score.

**3. L'invariant « geste praticien, jamais envoi de routine » est STRUCTUREL,
pas déclaratif** — ajouté après la revue `wn-reviewer` de la première
implémentation, qui a montré qu'il ne reposait que sur la vigilance d'écran
(pack par défaut ouvert aux cinq, bandeau affirmant « jamais envoyé au
portail » à côté d'un bouton d'envoi actif, sélecteur sans marque, consignes
praticien servies au patient, cinq mots du test de rappel écrits dans
l'énoncé) :

- les **packs refusent** tout instrument de `PASSATION_PRATICIEN` (409
  `questionnaire_consultation`, POST comme PATCH), et l'assignation du pack de
  base à l'onboarding l'écarte en ceinture — un pack est l'envoi de routine par
  définition, pack de base compris ;
- l'assignation DIRECTE reste ouverte : c'est elle, le geste praticien — et le
  sélecteur la marque (« passation en consultation ») ;
- le **portail patient** affiche à l'ouverture : « se remplit en consultation,
  avec votre praticien » — l'auto-remplissage à domicile reste techniquement
  possible (aucun logiciel ne force la présence), c'est le risque résiduel que
  la décision porte ;
- `Q_GEO_03` (AQ) et `Q_GEO_05` (QDRS) reçoivent `administrationMode:
  'clinicien'` qui leur manquait — informant-based, l'auto-remplissage
  répondrait à la place du proche (`DC-14`, `DC-28`) ;
- l'alerte Alzheimer du test des 5 mots exige un rappel différé COMPLET
  (`missing === 0`) — un rappel amputé ne peut qu'abaisser le total, le biais
  même qui fabriquait l'alerte (finding M1).

- Conséquences : les sept instruments de l'audit sont déclenchables ; les
  panels mémoire et neurodégénératif redeviennent écrivables en PR-3 ; le banc
  d'inertie des branches `ou` (réserve RV-1 de la revue de `D-060`) pourra
  exiger des comptes publiés sans liste d'exception.
- Écarté : maintenir la suspension en retenant les deux panels (proposé comme
  option recommandée — le praticien a préféré réactiver) ; réactiver sans
  re-présenter les motifs réels (les options initiales décrivaient le motif
  comme inconnu, un second arbitrage a été demandé quand il s'est avéré
  documenté) ; écrire les branches inertes avec liste d'exceptions au banc.

### D-065 — Le frein de `D-053` §5 devient structurel : pas d'extinction sans système de contradictions actif

- Date : 2026-08-16
- Statut : accepté (arbitrage praticien explicite entre deux options
  présentées) et implémenté.
- Domaine : clinique, moteur d'orientation, règles d'arrêt, contradictions
- Contexte : `D-064` a fermé la fenêtre par l'environnement — le drapeau des
  contradictions est posé en production — mais la configuration piège restait
  constructible : retirer ce drapeau, ou l'oublier dans un nouvel
  environnement, aurait réarmé silencieusement l'extinction sans frein. Un
  banc du dépôt gravait même ce comportement comme voulu (« hiérarchie des
  verrous » : contradictions éteintes, le dossier s'éteint quand même).
- Décision : `orientationService` ne passe les règles d'arrêt au moteur que si
  `tableArretExploitable()` — signature de la table d'arrêt ET
  `contradictionsActives()`. « Aucun constat » et « système de constats
  éteint » cessent d'être indiscernables (`DC-24`) ; une discordance déclarée
  ne peut plus être supprimée sans que le système capable de la constater
  tourne (`DC-30`). Les DEUX effets de la table (extinction, exclusion
  déjà-répondu) suivent le même prédicat : les scinder recréerait l'asymétrie
  de verrous payée par `D-064`. Le tampon d'audit `arret` suit aussi — une
  table qui n'a rien pu produire n'inscrit pas sa version.
- Option écartée : statu quo documenté par un banc — c'eût été graver dans un
  test la configuration que `D-064` venait de qualifier de `DC-30` à revers.
- Conséquence assumée : l'extinction et l'exclusion sont couplées au système
  de contradictions. Éteindre les contradictions éteint l'arrêt tout entier —
  fail-closed, aucun changement observable en production où les deux sont
  actifs.
- La dette de banc de `D-064` est soldée : « arrêt signé + contradictions
  inactives ⇒ rien ne s'éteint » est éprouvé sous ses deux visages (drapeau
  absent ; table non signée), plus le couplage de l'exclusion.

### D-064 — Le frein de `D-053` §5 était inopérant en production ; les contradictions sont activées pour le rendre réel

- Date : 2026-08-16
- Statut : accepté et exécuté — `WN_ENABLE_CONTRADICTIONS_NNPP2=1` posé sur le
  scope Production Vercel le 2026-08-16, sur instruction expresse du praticien.
  **Effet au prochain déploiement de production seulement.**
- Domaine : clinique, verrous de signature, contradictions, extinction
- Contexte : revue `wn-reviewer` a posteriori des trois PR cliniques de
  `D-061`/`D-062`/`D-063` (jamais revues avant merge, produites depuis un
  conteneur distant). Finding critique confirmé : la signature CONJOINTE des
  tables d'arrêt et de contradictions (`D-061`) ne produisait pas le frein
  qu'elle revendiquait. La borne « une contradiction ouverte interdit
  l'extinction » (`D-053` §5, `orientationEngine.ts`) ne mord que sur les
  constats effectivement produits, et `contradictionsActives()` exige le
  drapeau EN PLUS de la signature — quand `tableArretSignee()` ne teste que
  la signature, sous un `WN_ENABLE_ORIENTATION_NNPP2` déjà posé. Le drapeau
  des contradictions étant absent de tous les scopes Vercel, l'extinction
  tournait donc SANS FREIN en production depuis le 2026-08-15 : sur un
  dossier du recoupement `STOP-STR` × `C-STR`, une discordance déclarée
  était supprimée sans constat — `DC-30` pris à revers.
- Décision : poser le drapeau, pas dé-signer. Deux alternatives écartées :
  dé-signer `stopRulesV1` (retire une extinction voulue et déjà signée pour
  corriger un défaut qui n'est pas le sien) ; conditionner l'extinction à
  `contradictionsActives()` dans le code (change la sémantique du verrou —
  reste une piste de durcissement, non tranchée ici). Poser le drapeau
  rétablit l'état que `D-061` croyait avoir produit : constats servis à
  l'écran (câblage `D-050`) ET frein réel sur l'extinction.
- Conséquence assumée : le cockpit praticien affichera les constats de
  contradiction (`C-STR`, seule règle publiée) dès le prochain déploiement.
- Dette nommée : aucun banc ne joue « arrêt signé + contradictions
  inactives » — la configuration exacte qui a laissé ce trou invisible. Un
  garde reliant `docs/FEATURE_FLAGS.md` à l'état réel des `validationExterne`
  manque également (le document a menti trois jours sur deux tables).

### D-063 — Le verrou biologie devient réel, et il révèle que sa signature n'en était pas une

- Date : 2026-08-16
- Statut : accepté pour le code ; **la signature biologie reste à poser
  réellement**, et l'extension du patron aux quatre autres tables est proposée.
- Domaine : clinique, verrous de signature, biologie
- Contexte : `D-061` dette (b). `deriverStatutsBiologie` ne testait QUE
  `validationExterne` — ni date, ni claims, ni périmètre. C'était le plus
  faible des cinq verrous, et la table venait d'être signée VIDE : la fenêtre
  se refermait à la première règle ajoutée, qui serait entrée sous une
  signature acquise sans que rien ne la fasse rougir.

- Décision : trois points.

**1. Le verrou reprend le patron `tablePrioritesSignee`, et ajoute un terme.**
`signatureIndicationsValide()` exige les cinq : `validationExterne`, une date
ISO CANONIQUE non nulle, des `claimsSource` non vides, et — terme que les
quatre autres tables n'ont pas encore — la concordance de `shaPerimetre` avec
`INDICATIONS_BIOLOGIE_SHA256`. Ce dernier rend la PÉREMPTION DÉTECTABLE : dès
qu'une règle est ajoutée, le SHA change, la concordance tombe, le verrou se
ferme SEUL.

**2. Ce que le durcissement a révélé : la signature de `D-061` n'en était pas
une.** Elle portait `validationExterne: true` mais `dateValidation: null` et
`claimsSource: []`. Au standard des quatre autres tables, ce n'est pas une
signature — elle passait uniquement parce que son verrou ne regardait que le
booléen. L'assistant l'a posée ainsi sans relever l'asymétrie ; c'est une
erreur de sa part, corrigée ici en la rendant visible plutôt qu'en la taisant.

Conséquence : **le verrou est désormais FERMÉ.** État juste, et
**observablement inerte** — la table est vide, le moteur refusait déjà faute
de règle publiée. Seul le motif change, et il devient exact. Pour signer
réellement : poser la date, les claims du périmètre relu, et
`shaPerimetre = INDICATIONS_BIOLOGIE_SHA256`. Geste praticien.

**3. Le patron devrait remonter aux quatre autres tables (proposé).** Aucune
ne porte de `shaPerimetre` : leur péremption reste un commentaire. La plus
concernée est la table des priorités, dont `D-062` a agrandi le périmètre sans
que la signature du 2026-08-15 le couvre — exactement le cas que ce terme
détecterait. Non fait ici : cela fermerait des verrous ouverts, et renverser
ces décisions n'appartient pas à l'assistant.

- Mesuré : `npm run check` vert ; banc biologie 18 tests, les deux positions du
  verrou éprouvées. T2/T3 restent injouables dans le conteneur distant.
- Dettes ouvertes : (a) signature biologie réelle ; (b) re-signature priorités
  sur le périmètre de `D-062` ; (c) `shaPerimetre` aux quatre autres tables ;
  (d) revue `wn-reviewer` et T3 hors conteneur.

### D-062 — La procédure d'abstention entre dans le périmètre signé, et la re-signature devient due

- Date : 2026-08-16
- Statut : accepté pour la partie code ; **la re-signature praticien reste à
  poser**, et le durcissement du verrou est proposé, non tranché.
- Domaine : moteur clinique, périmètre signé, doctrine
- Contexte : `D-061` a signé la table des priorités en franchissant une dette
  écrite (`D-054`, revue du 2026-08-12) — le SHA ne couvrait pas la procédure
  d'abstention, si bien que la signature ouvrait un verdict `required` /
  `not_required` servi au praticien qu'aucune ligne signée ne décrivait
  (`DC-17`, `DC-26`). Les priorités étant la seule table SANS drapeau
  d'exploitation, le merge de `D-061` a rendu cette dette échue, non différée.

- Décision : trois points, dont un seul est exécuté.

**1. La procédure devient des DONNÉES SIGNÉES (fait).**
`ABSTENTION_PROCEDURE_V1` vit désormais dans `priorityRulesV1.ts` — cadre,
deux motifs de `required`, verdict par défaut, chacun avec son texte français
exact. `PRIORITY_RULES_SHA256` porte sur `{ regles, abstention }` et non plus
sur les seules règles. `evaluerAbstention` n'énonce plus rien : elle applique.
Ce qui reste dans `chaineC1.ts` est l'ordre d'évaluation et le câblage des
entrées — mécanique, non clinique. Comportement servi INCHANGÉ, textes
identiques au caractère près : 65 tests des trois bancs concernés passent.

**2. La provenance est DOCTRINALE, et la question des claims reste ouverte.**
Les deux motifs ne dérivent d'aucun claim du corpus : ils dérivent de la
constitution — `DC-12`/`DC-23` pour le signal de sécurité qui prime sans
ajouter de points, `DC-24`/`DC-25` pour la donnée absente qui n'est ni nulle
ni normale. Chaque motif cite sa doctrine, et un banc l'exige non vide.
`DC-26` demande qu'une règle vive « dans le registre » sans préciser lequel :
celui des décisions est ici retenu. **Question ouverte au praticien** : faut-il
en plus des claims `VALIDE` ? Ils n'existent pas et seraient à écrire.

**3. La re-signature est DUE, et le durcissement du verrou est PROPOSÉ.**
Le périmètre signé a grandi, donc le SHA a changé —
`4b51c649…7448042` → `cfd9b876…d511ab4`. `PRIORITY_RULES_METADATA` porte
toujours `dateValidation: '2026-08-15T00:00:00.000Z'`, posée sur l'ANCIEN
périmètre : la signature ne couvre plus ce qu'elle prétend couvrir. Mettre le
littéral du banc à jour ne vaut pas signature, le banc le dit lui-même.

*Proposé, délibérément non fait* : épingler le SHA du périmètre dans la
métadonnée (`shaPerimetre`) et l'ajouter aux termes de
`tablePrioritesSignee()`. La péremption deviendrait alors DÉTECTABLE au lieu
d'être un commentaire — le verrou se fermerait seul dès que le contenu bouge
sans re-signature. Ce n'est pas fait ici parce que cela **éteindrait les
priorités que le praticien vient d'allumer**, et renverser sa décision de la
veille sans qu'il l'ait demandé n'appartient pas à l'assistant. Le même patron
vaudrait pour le verrou biologie (`D-061` dette b).

- Non joué : T2 et T3 restent injouables dans le conteneur distant
  (installation Playwright en dur, CDN refusé par l'allowlist). `npm run check`
  vert, et les trois bancs couvrant l'abstention joués explicitement (65
  tests). Revue `wn-reviewer` non lancée.
- Dettes ouvertes : (a) re-signature praticien sur le nouveau périmètre ;
  (b) `shaPerimetre` dans le verrou, priorités et biologie ; (c) claims
  `VALIDE` pour les motifs d'abstention, si le praticien les juge nécessaires.

### D-061 — Les quatre tables restantes sont signées, dont deux en passage en force nommé

- Date : 2026-08-15
- Statut : accepté (arbitrage praticien explicite du 2026-08-15, après exposé
  des blocages)
- Domaine : clinique, signatures de tables, verrous fail-closed, bancs
- Contexte : demande praticien « signer toutes les tables ». La vérification
  préalable a établi trois choses que la demande ne pouvait pas anticiper.

  **`ORIENTATION_METADATA` était DÉJÀ signée** — `validationExterne: true`,
  `dateValidation: '2026-08-06'`, 23 claims. L'assistant avait affirmé le
  contraire deux fois le même jour (corps de la PR #685, §F.2 du catalogue
  biologie, tous deux mergés) : une lecture fautive attrapant la première
  occurrence du fichier au lieu de l'objet de métadonnées. Corrigé dans la
  même PR que cette décision. Conséquence : les trois zones du catalogue
  reprises de cette table (sommeil, stress, digestif) s'adossent à une table
  signée, non à un alignement provisoire.

  **La table des priorités porte une dette bloquante écrite** (« À LIRE AVANT
  DE SIGNER », [[D-054]], revue du 2026-08-12).

  **Le verrou biologie est le plus faible des cinq** : `deriverStatutsBiologie`
  ne teste que le booléen, là où les quatre autres exigent aussi date et
  claims.

- Décision : quatre signatures, portées au 2026-08-15 en ISO canonique.

**1. Arrêt et contradictions, signées CONJOINTEMENT.** L'ordre a un sens
clinique et n'est gardé par rien : signer la table d'arrêt seule ferait
tourner l'extinction sans le frein « une contradiction ouverte interdit
l'extinction » ([[D-053]] §5), aucun constat n'existant si les contradictions
sont inactives. Les signer ensemble ferme ce trou. Le drapeau
`WN_ENABLE_CONTRADICTIONS_NNPP2` reste un geste d'exploitation distinct.

**2. Priorités — PASSAGE EN FORCE, nommé comme tel, et SANS SECOND VERROU.**

*Fait vérifié après coup, qui aggrave ce point* : les priorités sont la SEULE
des cinq tables sans drapeau d'exploitation. L'orientation a
`WN_ENABLE_ORIENTATION_NNPP2`, les contradictions
`WN_ENABLE_CONTRADICTIONS_NNPP2`, la biologie `WN_CB_ENABLED` ;
`tablePrioritesSignee()` est le verrou unique du chemin priorités
([[D-054]] arbitrage 7 l'assume : « la chaîne C1 est déjà derrière
l'authentification praticien et la confirmation T0 »). Pour les quatre autres
tables, signer n'allume pas. **Pour celle-ci, si.** Le merge de la PR portant
cette décision met donc le verdict d'abstention en production immédiatement.
La dette (a) ci-dessous n'est pas différable : elle est due au merge. Le SHA ne couvre pas la
procédure d'abstention, qui vit dans `chaineC1.ts` : la signature ouvre un
verdict `required` / `not_required` servi au praticien et haché dans la carte
de décision, dont aucune ligne signée ne décrit la règle — ce que `DC-17` et
`DC-26` interdisent. La dette n'est PAS close. Le praticien a signé après que
le blocage lui a été exposé mot pour mot. **Dette ouverte et prioritaire.**

**3. Biologie — PASSAGE EN FORCE, table VIDE.** La signature n'atteste aucune
relecture de contenu puisqu'il n'y a pas de contenu. Mesuré au banc : elle est
**observablement inerte aujourd'hui** — le moteur refuse toujours de dériver,
mais sur la seconde garde (« aucune règle publiée et sourcée ») et non plus
sur le verrou de signature. Le risque n'est pas aujourd'hui, il est à la
première règle ajoutée : elle entrera sous signature acquise, sans SHA ni date
pour la faire rougir. **Dette ouverte : aligner le verrou biologie sur le
patron `tablePrioritesSignee` (date + SHA + claims).**

**4. Les sentinelles sont INVERSÉES, jamais supprimées.** Sept bancs
affirmaient la non-signature ; les supprimer aurait retiré le fil de
déclenchement. Ils affirment désormais la signature ET sa bonne forme (date
ISO canonique), de sorte qu'une dé-signature accidentelle ou une date
malformée reste attrapée. Deux positions du verrou restent éprouvées partout,
la position fermée étant désormais SIMULÉE.

**5. La machinerie de banc capturait l'état non signé en dur.**
`chaineC1Fixture.retablirTablePriorites()` remettait `false` au nom de
« l'état LIVRÉ » ; après signature, ce helper imposait l'ancien état au lieu
de restaurer le vrai, rendant l'isolation mensongère. Il capture désormais
l'état livré au chargement. Même correction dans `chaineC1.test.ts`.

- Conséquences mesurées : `npm run check` vert (41 fichiers de bancs). Le
  comportement de production CHANGE — l'abstention passe de `not_evaluated` à
  évaluée, les priorités et l'extinction deviennent productibles dès que leurs
  drapeaux d'exploitation sont posés. Signer n'allume pas : chaque table garde
  son ET avec un drapeau (`WN_ENABLE_ORIENTATION_NNPP2`,
  `WN_ENABLE_CONTRADICTIONS_NNPP2`, `WN_CB_ENABLED`).
- Non fait, et assumé comme tel : T2 et T3 sont injouables dans le conteneur
  distant — `wn-test-worktree.sh` installe les navigateurs Playwright en dur et
  le CDN est refusé par l'allowlist du proxy. Le segment E2E relève du CI
  ([[D-049]]), mais les contrats SQL et la certification scoring de T3 n'ont
  PAS été joués ici. La revue `wn-reviewer` prescrite pour une PR clinique n'a
  pas été lancée non plus.
- Dettes ouvertes : (a) procédure d'abstention à faire entrer dans le
  périmètre signé des priorités ; (b) verrou biologie à renforcer avant toute
  première règle ; (c) T3 et revue `wn-reviewer` à jouer hors de ce conteneur.

### D-060 — Le contrat de déclenchement apprend la disjonction, et un recueil incomplet ne l'allume jamais

- Date : 2026-08-15 · **implémentée et relue le 2026-08-16**
- Statut : accepté (arbitrage utilisateur du 2026-08-15). La sémantique de
  complétude n'est plus « proposée » : la revue `wn-reviewer` du 2026-08-16 a
  tenté de l'ouvrir et n'y est pas parvenue — garde de branche et garde
  statique du moteur d'arrêt sont le même prédicat, au même grain, et un
  plancher ne peut structurellement pas allumer une branche. Le §2 est donc
  **opposable**. Le §5 l'est depuis le même jour, mais il a fallu recâbler cinq
  gardes anti-dérive qui lisaient encore la racine (voir « Ce que la revue a
  trouvé », plus bas).
- Domaine : moteur clinique, contrat de déclenchement, garde de complétude,
  traçabilité
- Contexte : découvert en étendant le panel stress du catalogue biologie au
  BMS-10 (LOT-06). `OrientationDeclencheur` ne sait exprimer **aucune
  disjonction**, à deux niveaux : dans une règle les `declencheurs` sont en ET
  (`tousAtteints`), et deux règles publiées sur un même panel sont traitées
  par `statuts.ts` comme une discordance — le panel bascule
  `non_indique_actuellement` et est écarté (`DC-30`). Six panels du catalogue
  sont écrits « déclencheur X ou Y » et ne sont donc pas implémentables ;
  publier naïvement deux règles les **écarterait** au lieu de les élargir.

  Le manque n'est pas propre à la biologie et il a déjà coûté. La règle sur
  `Q_INF_03` d'`orientationRulesV1.ts` (correction du 2026-08-04) dérivait son
  seuil de la négation de `WN-CL-0136-004`, une conjonction de trois
  conditions dont la négation est une disjonction — « Lagrue ≤ 6 OU HAD ≥ 7 OU
  D ≥ 10 OU S ≥ 10 ». Faute de pouvoir l'écrire, la règle n'a pas été bloquée :
  elle a été **refondée sur un autre appui**, la bande d'entrée de la grille
  certifiée, le commentaire concluant que « le déclencheur ne peut donc pas se
  réclamer de cette négation ». Le manque ne produit pas des règles absentes
  mais des règles dont la provenance naturelle est remplacée par un repli, en
  silence — aucun banc ne le fait rougir.

- Décision : cinq points.

**1. La disjonction entre dans le contrat PARTAGÉ, pas dans un correctif
local (arbitrage utilisateur).** Une variante ne touchant que `statuts.ts` —
plusieurs règles sur un panel cessant d'être une discordance — a été chiffrée
et **écartée** : un fichier au lieu de cinq, mais un « ou » indisponible aux
tables d'orientation, de priorité, d'arrêt et de contradictions. Le motif du
rejet est le périmètre, non le coût : le besoin déborde la biologie, le
précédent `Q_INF_03` le montre.

**2. Un recueil incomplet n'allume jamais une branche (`DC-24`).** Une branche
ne compte que si **son** instrument est complètement recueilli ; la
disjonction est vraie si au moins une branche *complète* est vraie. Sans cette
règle, le OU transformerait la garde de complétude en passoire — il suffirait
d'une branche non recueillie pour la contourner. *Fail-closed* : dans le doute,
la branche ne compte pas.

**3. Aucune imbrication.** Un `ou` ne contient que des déclencheurs feuilles,
jamais un autre `ou`. Contrainte portée par le type quand c'est possible, par
un banc sinon. Motif : une algèbre booléenne complète dans une table de règles
cliniques serait illisible en revue, et la revue est le seul contrôle réel.

**4. La traçabilité ne remonte que la branche atteinte.** `evaluerDeclencheur`
retourne aujourd'hui `string | null` ; trois appelants
(`contradictionsEngine`, `chaineC1`, le moteur d'arrêt) ont besoin de savoir
**laquelle** des branches a été atteinte pour construire leurs sources et
leurs `responseId`. Le retour est donc élargi et tous les appelants repris.
Dupliquer la logique dans un helper parallèle est **exclu** : le commentaire
d'`evaluerDeclencheur` énonce déjà que « les réécrire ailleurs les aurait fait
diverger en silence ».

**5. L'interdit sur `signauxAlerte` survit à l'imbrication.** Un drapeau
d'anamnèse reste refusé comme déclencheur de signal d'alerte, qu'il soit posé
à la racine ou sous un `ou`. Un banc le vérifie explicitement sous
disjonction.

- Conséquences : deux PR. La première porte le type, l'évaluateur, les quatre
  consommateurs et les bancs — ils ne se séparent pas, TypeScript casse à la
  première. Palier T3 et revue `wn-reviewer` (Opus) exigés : on touche une
  garde de sécurité. La seconde reprend les six panels du catalogue biologie
  et la table d'indications. Bancs neufs : OU vrai si ≥ 1 branche complète
  vraie · faux si toutes fausses · faux si la seule branche vraie est sur
  recueil incomplet · un plancher n'allume jamais un OU · la traçabilité ne
  cite que la branche atteinte · pas d'imbrication · `signauxAlerte` refusé
  sous `ou`.
- Écarté : la variante `statuts.ts` seul (périmètre, voir point 1) ; un
  instrument unique par panel (perd le déclenchement quand le patient a passé
  l'autre questionnaire) ; tous les instruments en ET (exigerait que le
  patient les ait tous passés et tous positifs, contraire à l'intention
  clinique).
- Dette ouverte : aucune règle existante n'est réécrite par ce lot. La
  refondation de `Q_INF_03` reste en place ; savoir si elle doit reprendre
  l'appui de `WN-CL-0136-004` une fois la disjonction disponible est un
  arbitrage clinique distinct, à poser séparément.

**Ce que la revue du 2026-08-16 a trouvé, et ce qui en découle.**

**6. `{ou:[X]}` est plus restrictif que `X`, et c'est assumé.** La garde de
complétude par branche ferme deux chemins que la RACINE d'une règle
d'orientation laissait ouverts : un instrument qui ne publie aucun compte (le
Berlin, nommé par `D-053` §4) allume une feuille mais jamais une branche, et le
`bandePlancher` — construit précisément pour rattraper la sévérité sur un
recueil partiel — est inopérant sous `ou`. Conséquence pratique : élargir une
règle existante de `X` à `X ou Y` lui fait PERDRE le déclenchement par plancher
sur `X`.

Le point 2 justifiait le fail-closed par le sur-déclenchement ; l'effet
symétrique — un faux négatif sur les tables non extinctives (orientation,
priorités, biologie) — n'avait pas été nommé. Il l'est ici, et le choix ne
change pas : **fail-closed uniforme**, pas de régime gradué par table. Motif :
un `ou` dont la sémantique dépendrait de la table qui le porte serait
irrelisable en revue, et c'est la revue qui est le seul contrôle réel (même
raisonnement que le point 3 sur l'imbrication). Le coût est borné et visible —
il ne se paie qu'au moment où quelqu'un écrit un `ou`, jamais rétroactivement.
Conséquence opératoire : **on n'élargit pas une règle existante en `ou` sans
vérifier que ses instruments publient leurs comptes**.

**7. Les gardes anti-dérive lisent les FEUILLES, et c'est structurel.** Le
point 5 ne se tenait pas tout seul : cinq gardes filtraient encore sur le type
du déclencheur racine et sautaient un nœud `ou` en silence — dont deux de
sécurité patient (bandes favorables et libellés verbatim des règles d'arrêt).
Une règle d'arrêt écrite sous `ou` aurait pu éteindre une recommandation sur une
bande DÉFAVORABLE sans faire rougir le CI. Toutes sont recâblées sur
`feuillesDuDeclencheur`, et chacune est désormais éprouvée par une règle
fabriquée portant la faute sous une branche — la vérification empirique a été
faite en retirant l'aplatissement : les quatre contre-épreuves rougissent.

**8. Réserve nommée — `MATRICE_CONSOMMATION` sous-déclare la table
d'orientation.** Le compte passe de 7 à 5 surfaces indirectes. Aucune
consommation n'a disparu : `chaineC1.ts` n'a plus besoin d'importer
`OrientationDeclencheur` (les instruments lui sont fournis par
`evaluerPriorites`), ce qui rallonge d'un saut le chemin vers
`api/praticien/protocoles/route.ts` et `.../protocoles/versions/route.ts` et
les fait sortir du graphe borné par `PROFONDEUR_MAX = 3`. Le découplage est un
gain de code ; la perte de justesse de la matrice est réelle et n'a pas de
correctif local — relever la profondeur toucherait toutes les lignes du
document et relève d'un lot dédié.

### D-059 — La biologie devient opérante sans qu'une seule valeur n'entre en base, et le schéma précède le code

- Date : 2026-08-14
- Statut : accepté (deux arbitrages utilisateur du 2026-08-14, cadrage d'ouverture du LOT-06)
- Domaine : clinique, biologie, migrations, courrier médecin, révision de protocole
- Contexte : dernier lot de la campagne « Chaîne T0 opérationnelle ». Le
  squelette biologie existe et est **vide** en production (relu le
  2026-08-14 : `biology_nabm_actes` = 987 lignes de référentiel,
  0 analyte/panel/range, 0 correspondance médecin, aucune table d'arbitrage).
  Le LOT-05 fournit déjà `conditionnelle_biologie` et `waitFor` (aucun bump
  de contrat) ; la mécanique de révision (`supersedesDraftId`,
  `isApprovalStale`) existe en entier ; les drapeaux `isCbEnabled` /
  `isCbResultsEnabled` existent sans appelant. `BiologyPanel` ne porte
  **aucun champ de déclencheur** — et n'en portera pas : la campagne prescrit
  le patron orientation (table TS versionnée + claims + signature + SHA) pour
  la biologie, donc les conditions vivent dans une table signée, pas dans des
  colonnes de catalogue. La migration de schéma se réduit à
  `ArbitrageBiologique`.
- Décision : six arbitrages, les deux premiers tranchés par l'utilisateur.

**1. Le schéma précède le code (arbitrage utilisateur).** La migration de
schéma (`ArbitrageBiologique` + déclencheurs de panels) part en PR SEULE,
relue, puis `release-db` approuvé — **avant** que le moindre code qui s'en
sert ne soit mergé. Aucun code mergé ne référence jamais une table absente.
Coût assumé : deux allers-retours release-db avant tout écran visible.

**2. Le catalogue niveau 1 est proposé, puis validé ligne à ligne (arbitrage
utilisateur).** L'assistant rédige la proposition (socle, glucidique,
lipides, thyroïde, micronutrition, CRPus ; panels conditionnels cœliaque et
hormonal), chaque ligne adossée à un claim **VALIDE relu en production**
(`DC-01`, `DC-26`) — abstention sur ce qu'aucun claim ne fonde (`DC-25`),
jamais un remplissage. Le praticien valide ligne à ligne ; la migration de
DONNÉES ne part qu'après cette validation, en PR séparée.

**3. Sans catalogue publié, le moteur ne propose RIEN.** Même patron que les
quatre décisions précédentes (`D-055`→`D-058`) : le moteur de statuts est
fail-closed sur catalogue vide, avec un motif lisible en français — jamais
une proposition « au cas où » ni un statut déduit d'une table absente.

**4. L'arbitrage biologique ne porte JAMAIS de valeur.** Verdict à trois
états (`confirme | infirme | sans_objet`), note courte OBLIGATOIRE sur
`infirme`, auteur et horodatage posés côté serveur. Le verrou HDS reste
entier : aucune valeur d'analyse en base, contrat SQL négatif étendu.
Résoudre une intention `conditionnelle_biologie` sans arbitrage lié est
impossible.

**5. Les déclencheurs et exclusions de panels vivent dans une TABLE TS
SIGNÉE, au patron orientation** (`orientationRulesV1` : conditions typées sur
zones d'instruments et drapeaux d'anamnèse, claims épinglés par règle,
`validationExterne: false` à la livraison — signer est un geste praticien
séparé). Jamais d'expression libre, jamais une condition évaluée par le LLM
(`D-003`, `DC-26` : les règles cliniques vivent dans une table versionnée et
relue, pas dispersées dans des lignes de base). Le catalogue DB ne porte que
la COMPOSITION des panels (items, niveaux) ; la table signée dit QUAND un
panel est recommandé, conditionnel ou non indiqué. Écart à la fiche assumé et
motivé : elle plaçait `TriggerConditions` dans la migration de données — le
patron de campagne (« réutilisé partout ») et `DC-26` commandent la table
signée. Un déclencheur non rempli s'affiche `conditionnel` avec sa condition
— pas absent, pas refusé en silence.

**6. Le courrier médecin passe par le chokepoint existant.** Rendu via
`rendu.ts` (destinataire médecin), donc sous
`assertRenduMedecinNonPrescriptif` — pas de second chemin de rendu ;
consignation par `preparerCorrespondance` existant. Remise manuelle en V1,
aucun envoi automatique.

- Dettes nommées, non résolues ici : « aucune ligne de catalogue sans
  claim » n'est imposé par le schéma QUE sur `BiologyFunctionalRange` et
  `BiologyAnalyteLink` — pour les panels, la garantie viendra de la
  proposition validée et du contrat SQL, pas d'une contrainte NOT NULL
  (à réexaminer si le catalogue s'ouvre à d'autres auteurs) ; la saisie de
  valeurs biologiques reste hors périmètre (décision HDS préalable, backlog).
- Conséquences : au merge du lot, rien ne s'allume tant que la release de
  schéma n'est pas approuvée ET que le catalogue n'est pas peuplé — deux
  portes humaines distinctes, dans cet ordre.
- Référence : `docs/claude/campagnes/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/lots/LOT-06-biologie-revision.md`,
  `web/src/lib/biology-library/`, `web/prisma/checks/cb_biologie_*.sql`,
  `docs/claude/handoffs/2026-08-14-2255-lot06-ouverture-biologie.md`

### D-058 — Ce qu'un delta a le droit d'affirmer, et pourquoi « stable » ne se déduit pas d'un zéro

- Date : 2026-08-13
- Statut : accepté (décision utilisateur du 2026-08-13, arbitrage d'ouverture du LOT-07)
- Domaine : clinique, momentum longitudinal, restitution praticien
- Contexte : le LOT-07 doit donner au praticien un **momentum par domaine**
  (digestif, alimentaire, mouvement, sommeil, adaptation) au lieu du seul delta
  d'un scalaire agrégé, et rendre les jalons J21/J42/J90 confirmables depuis
  l'interface. Sa fiche laisse une question ouverte, et elle commande tout le
  reste : les **bandes de bruit par variable**, sous lesquelles un écart se lit
  « stable » plutôt qu'un mouvement. Aucune source du dépôt ne les fixe. Cette
  décision précède la première ligne de code (`DC-17`, `DC-18`).
- Fait relu dans le code avant d'écrire : `calculerDeltaMomentum`
  (`equilibre/momentum.ts:36`) rend déjà `tendance: 'stable'` — **mais
  uniquement sur un delta exactement nul**. Deux mesures qui tombent au
  centième près produisent « stable » ; un écart d'un centième produit
  « hausse ». Ce n'est pas un jugement de bruit, c'est une coïncidence
  arithmétique présentée comme un constat. Le mot est déjà là ; ce qui manque,
  c'est ce qui le fonderait.
- Décision : quatre arbitrages.

**1. Sans bande publiée, le momentum par domaine ne QUALIFIE pas.** Il rend le
delta factuel — la mesure existe, elle est réelle — et refuse de dire
« stable » comme « en mouvement », avec un motif lisible en français plutôt
qu'un silence. Publier une bande pour une variable est un **acte séparé**, de
la même famille que les trois signatures en attente. Le mécanisme est livré, la
permission ne s'ouvre pas d'elle-même : c'est la quatrième fois de la journée
(`D-055`, `D-056`, `D-057`), et c'est la même raison — un chiffre qui décide
d'une lecture clinique n'apparaît pas parce qu'il fallait bien en mettre un
(`DC-19`, `DC-20`).

Ce qui aurait été plus rapide et qui est refusé : reprendre le `> 0 / < 0 / = 0`
du scalaire. Il ne coûte rien à écrire et il rend un verdict sur tout écart,
si petit soit-il — donc il transforme le bruit de mesure en tendance clinique,
exactement sur l'écran où le praticien vient chercher si son protocole agit.

**2. Un domaine non re-mesuré n'a pas de momentum.** Ni zéro, ni « stable », ni
absence silencieuse : il est nommé non mesuré. Un J21 où seul le TFD a été
repassé rend un momentum digestif et rien d'autre — et surtout ne laisse pas
croire que le sommeil est resté stable parce que personne ne l'a mesuré
(`DC-24`). C'est la règle qui justifie à elle seule le passage du scalaire
agrégé aux domaines : un agrégat mélange ce qui a bougé et ce qui n'a pas été
regardé.

**3. Le momentum scalaire existant ne change pas.** Ses consommateurs actuels
le lisent avec sa sémantique actuelle, `'stable'` à delta nul compris ; le
modifier ferait dériver des restitutions déjà servies sans que le LOT-07 l'ait
demandé. Mais **cette sémantique ne s'étend pas** au momentum par domaine, et
la tautologie du zéro est **nommée ici comme dette** plutôt que reconduite en
silence : le jour où une bande sera publiée, c'est elle qui devra décider aussi
pour le scalaire.

**4. Aucune interprétation clinique automatique d'un delta.** Une tendance est
factuelle : « en baisse de 4 points » et jamais « amélioration significative ».
Le mot « significatif » appartient à un test statistique qu'aucun banc ne fait
tourner ici, et « amélioration » suppose une direction souhaitable qui dépend
de la variable (`DC-27` : association n'est pas causalité). La re-passation au
jalon reste une **proposition** dérivée des `mesures[]` du protocole, jamais un
envoi automatique — geste praticien, comme toute assignation.

- Dettes nommées, non résolues ici : la **tautologie du zéro** sur le scalaire
  (arbitrage 3) ; le **peuplement des fixtures E2E** du parcours nominal T0
  (dette du LOT-02 rattachée à ce lot) — les trois patients fictifs autorisés
  sont tous centraux, et en peupler un déplace `orientation-file-envoi`,
  `fiche-detail-reponses`, la capture pixel de `visual.spec.ts` et
  `seedCertification.guard.test.ts` ; le **multi-cycle T1/T2** et les **poids
  déclaratifs**, tous deux au backlog nommé.
- Conséquences : le praticien voit, dès le merge, des jalons confirmables et
  des deltas par domaine ; il ne verra « stable » sur aucun domaine tant
  qu'aucune bande n'aura été publiée. Aucun changement de `versionScore`,
  aucune grille touchée, aucun momentum entre cycles ni entre versions de score
  — les gardes existantes sont préservées.
- Référence : `docs/claude/campagnes/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/lots/LOT-07-jalons-momentum.md`,
  `web/src/lib/equilibre/momentum.ts`, `web/src/lib/fil/momentumJ21.ts`,
  `web/src/lib/protocol/trajectoire.ts`,
  `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md`

**Amendement du 2026-08-14** (revue `wn-reviewer` du LOT-07, avant merge — une
décision opposable ne se corrige pas dans un commentaire de module) :

- **Arbitrage 4, cible de la re-passation** : la cible ne se dérive **pas** des
  `mesures[]` du protocole — ce champ, tel que le LOT-05 l'a écrit, est du
  texte libre (« Agenda rempli au moins 14 jours sur 21 »), rien de mécanique
  ne s'en déduit sans deviner. Elle se dérive de `provenance.needIds` de la
  priorité **visée** (sélectionnée par le praticien quand elle existe, à défaut
  proposée par la carte), via la table signée `BESOIN_SOURCES`
  (`repassationCiblee.ts`) : aucune correspondance nouvelle n'est inventée
  (`DC-19`, `DC-26`). Le reste de l'arbitrage tient — proposition via la file
  d'envoi, jamais un envoi automatique.
- **Ancre des jalons, unique** : un jalon post-T0 se fenêtre sur le
  `confirmedAt` du T0 confirmé le plus récent — l'ancre de la trajectoire
  (LOT-08, A8-1). Le cockpit (`resoudreJalonDu`) et le serveur
  (`proposeRuntimeEpisode` via `ancreCycleCourant`) partagent bornes et
  tolérance à la milliseconde ; un banc de contrat inter-couches le tient. Le
  T0 initial reste ancré sur la première réponse du dossier — aucun cycle
  confirmé ne le précède.
- **Pas de garde de version intra-cycle** sur le momentum par besoin : les deux
  lectures d'une série sont toujours recalculées par le moteur courant, aucune
  soustraction inter-versions n'existe par construction. Une garde d'étiquette
  (versionScore figé vs constante) aurait affiché « non re-mesuré » sur des
  besoins re-mesurés — l'inverse de `DC-24` — pour tout cycle antérieur au bump
  v14/v15. La garde A8-3 reste inter-cycles (`resoudreComparaison`).
- **Dettes ajoutées** : `DC-41` (réserver l'axe tolérance — un momentum
  favorable ne se lit pas comme un succès de protocole) n'est ni livré ni
  gardé ; la sélection praticien d'une priorité (`selectedMainPriority`) n'a
  **aucun producteur** — la re-passation vise la priorité proposée tant qu'il
  n'existe pas, et reste inerte tant que la table des priorités n'est pas
  signée ; Q_SOM_09 (agenda du sommeil, 21 nuits) figure parmi les cibles
  proposables à J21 alors que sa mesure ne se rend qu'au voisinage du J42 —
  laissé à l'arbitrage praticien, rien ne part automatiquement.

### D-057 — Ce qu'une discordance a le droit de dire à la synthèse, et ce que « présente en tête » ne prouve pas

- Date : 2026-08-13
- Statut : accepté (décision utilisateur du 2026-08-13, trois arbitrages tranchés à l'ouverture du LOT-09)
- Domaine : clinique, moteur de contradictions, synthèse IA, garde de restitution
- Contexte : l'étape 5 du LOT-01 avait deux moitiés. Le câblage cockpit des
  contradictions est livré ([[D-050]]) ; **l'injection des vigilances dans la
  synthèse ne l'est pas**. Elle a été renvoyée le 2026-08-12 sans lot d'accueil,
  rattachée au LOT-05, puis ressortie le 2026-08-13 quand ce lot a été clos sur
  un diff d'une seule finalité. Le LOT-09 est cet accueil, et cette décision
  précède sa première ligne de code (`DC-17`, `DC-18`).
- Fait relu dans le dépôt le 2026-08-13, et il réduit le lot : **rien de
  clinique n'est à rédiger.** `ContradictionAffichee.description` est déjà « la
  formulation neutre produite par le déterministe, jamais reformulée ici » ;
  `constatsContradictionsPourDossier` produit les constats verrou compris (il a
  été extrait au LOT-08 pour `orientationService`) ; `fusionnerVigilance`
  fusionne déjà et sert les vigilances d'anamnèse ; et la route porte déjà les
  données — `reponsesAdministrables` a exactement la forme
  `LignePassationDossier`, `consultation.anamnese` est lue dans le même bloc.
  Aucune lecture base supplémentaire, aucun texte nouveau (`DC-19`).
- **Effet en production : nul au merge.** `contradictionsActives()` exige le
  drapeau **et** `tableSignee()`, et `CONTRADICTIONS_METADATA.validationExterne`
  vaut `false` — la table n'est pas signée. Troisième lot d'affilée sans effet
  servi, et le dire ici évite qu'on le découvre en cherchant un changement
  absent.
- Décision : trois arbitrages.

**1. Seuls les constats OUVERTS deviennent vigilance, au prédicat PARTAGÉ.**
Non pas « le même critère » recopié, mais `contradictionEstOuverte`, la
fonction unique qu'appelle aussi le moteur d'arrêt ([[D-053]] §5, [[D-055]]).
La première rédaction du lot le paraphrasait en `statut !== 'resolue'` et
omettait l'exclusion des convergences que le moteur applique : une règle
`CONVERGENCE` publiée aurait été servie au praticien sous l'intitulé
« discordance » tout en laissant l'extinction possible. Défaut trouvé en revue,
avant la signature de la table, et refermé à la racine — il n'y a plus qu'une
écriture du critère. Escalade praticien comprise dans « ouvert ». Deux motifs, et le second pèse plus que le premier. Un critère : deux
définitions d'« ouvert » dans le même dépôt divergeraient en silence, et le même
constat bloquerait l'extinction sans atteindre la synthèse, ou l'inverse. Une
raison clinique : un constat que le praticien a explicitement résolu, resservi à
chaque synthèse, apprend à survoler le bloc de vigilances — et une vigilance
qu'on apprend à survoler ne protège plus rien. Aucun plancher d'importance n'est
posé : [[D-048]] refuse déjà qu'`importance` serve à décoter un constat, et
aucune source ne fonde un tel seuil (`DC-19`, `DC-20`).

**2. La vigilance porte la description ET l'action suggérée, reprises telles
quelles.** `DC-30` énumère l'objet minimal d'une discordance — « sources,
description, importance, hypothèses, action suggérée, résolue ou non » — et
livrer le constat sans sa suite laisse le praticien devant une alerte sans
issue, tout en laissant le modèle libre de proposer la sienne : précisément ce
que l'injection déterministe existe pour empêcher. Les deux champs sont repris
**mot pour mot** ; ce moteur ne reformule pas ce qu'il transporte. Les
passations datées restent au cockpit, où elles s'ouvrent : les recopier dans le
bloc de vigilances l'alourdirait à chaque constat sans rien rendre de plus
vérifiable.

**3. La fusion garantit la PRÉSENCE, pas la FIDÉLITÉ — un garde mesure la
seconde.** `fusionnerVigilance` met la vigilance déterministe en tête et
l'empêche d'être supprimée. Elle n'empêche pas le modèle de la contredire trois
paragraphes plus bas, et le praticien lirait alors deux affirmations opposées
dont une seule est déterministe. Un contrôle reprend le patron d'adjacence de
[[D-055]] et **journalise** — jamais de censure, même régime que ses deux
prédécesseurs : l'objet actionnable vient de la route déterministe, donc une
prose infidèle ne déclenche rien. Ses contrôles négatifs comptent autant que ses
positifs : la revue adversariale du 2026-08-03 a déjà montré qu'un garde trop
large accuse la prose clinique ordinaire et noie son propre signal.

La première version l'a démontré une fois de plus, et pire : **son bruit était
corrélé à la fidélité**. « incohérent » contient « cohérent », « n'est pas
confirmé par » contient « confirmé par » — six phrases mesurées sur sept qui
restituaient CORRECTEMENT la discordance étaient accusées, et ces écarts sont
persistés en base comme fait d'audit. Deux corrections : le marqueur doit
ouvrir un mot, et il ne doit pas être nié. Le garde s'exclut en outre de sa
propre entrée, faute de quoi le déterministe finirait par s'accuser lui-même
dès qu'une règle citera ses instruments par identifiant.

Sa portée reste **étroite et il faut le dire** : le modèle ne reçoit pas la
discordance dans son prompt, il n'a donc guère de raison de citer des
identifiants d'instrument au voisinage d'une affirmation de concordance. Le
garde est un filet, pas le mécanisme principal — l'injecter dans la consigne
serait ce mécanisme, et c'est une dette nommée, pas ce lot.

**4. Une discordance ne sort pas du praticien.** Le constat déclare
`audience: 'praticien_seul'` ; converti en chaîne de `points_de_vigilance`, il
perdait cette audience et héritait du destinataire **médecin** du bloc
« vigilance » — donc du courrier au médecin traitant, un document SORTANT.
L'élargissement se faisait par effet de bord d'un field-filter existant, sans
qu'aucune décision ne l'ait dit. Il est refermé : le bloc d'une vigilance de
discordance ne porte que le destinataire praticien, et un banc symétrique de
celui du patient fige la porte. Les vigilances d'anamnèse, elles, gardent leur
régime — ce sont les propos du patient, pas un constat entre instruments.

- Dettes nommées, non résolues ici : **injecter la discordance dans la consigne
  de synthèse**, ce qui empêcherait le modèle de la contredire par ignorance et
  rendrait au garde son rôle de filet (bump de consigne, hors de ce lot) ;
  **l'écart dossier ↔ épisode** que [[D-050]]
  laisse ouvert — le moteur de contradictions évalue le **dossier entier** alors
  que `review` porte sur l'épisode T0, si bien qu'un constat peut reposer sur
  une passation laissée hors de l'épisode. Ce lot ne l'aggrave pas (il consomme
  la même source que le cockpit et le moteur d'arrêt, sans élargir sa portée) et
  ne le referme pas : le refermer suppose d'arbitrer ce qu'est le périmètre
  légitime d'une discordance, ce qu'aucune source du dépôt ne tranche.
- Conséquences : la synthèse praticien porte les discordances ouvertes dès que
  la table sera signée ; d'ici là, `contradictionsActives()` rend faux et rien
  n'est ajouté. La signature reste un acte praticien distinct, hors de ce lot.
- Référence : `docs/claude/campagnes/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/lots/LOT-09-vigilances-discordance.md`,
  `web/src/lib/clinical/contradictionsService.ts`,
  `web/src/app/api/praticien/synthese/route.ts`,
  `web/src/lib/clinical/verifierRestitutionOrientation.ts`,
  `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md`

### D-056 — Ce qu'une intention de complément exige avant la biologie, et pourquoi un catalogue vide doit refuser

- Date : 2026-08-13
- Statut : accepté (décision utilisateur du 2026-08-13, arbitrage de cadrage du LOT-05)
- Domaine : clinique, contrat de protocole, rayon compléments (C4), garde de restitution
- Contexte : le LOT-05 doit permettre une prescription-conseil de compléments
  fondée sur claims **avant** la biologie, marquée provisoire et résolue par
  l'arbitrage du LOT-06. La spec (Lot E, `sources/02-spec-lots-parcours-t0.md`)
  en pose quatre conditions cumulatives, dont trois interrogent le catalogue de
  décision C4. Cette décision précède la première ligne de code du lot
  (`DC-17`, `DC-18`).
- Fait relu en production le 2026-08-13 (`execute_sql`, lecture seule) : la
  couche **matière** du catalogue est peuplée — `supplement_ingredients` 3 444,
  `supplement_products` 140 148 — et la couche **décision** est *entièrement
  vide* : `clinical_rules` 0, `clinical_intent_tags` 0,
  `supplement_source_references` 0, `supplement_safety_alerts` 0,
  `ingredient_functional_thresholds` 0, `functional_categories` 0. Aucun seed
  ne les peuple. `clinical_rules` porte en outre des clés étrangères non nulles
  vers `clinical_intent_tags` et `supplement_source_references` : aucune règle
  ne peut naître avant que ces deux tables ne soient publiées.
- Lecture de ce fait avant d'écrire : la condition 1 (règle C4 validée) est
  **insatisfiable**, et les conditions négatives de la condition 2 (« aucune
  alerte active », « seuils fonctionnels respectés ») sont **vraies par
  vacuité** — elles passeraient parce que les tables sont vides, non parce que
  le complément est sûr (`DC-24` : une donnée absente n'est jamais zéro ni
  normale). C'est le quatrième exemplaire d'un motif déjà corrigé trois fois :
  le `VALID` tautologique ([[D-052]]), le `group_majority` muet ([[D-053]],
  [[D-055]]), et `[]` lu « aucun conflit » là où il faut lire « rien n'a été
  examiné » (#482, #489).
- Décision : six arbitrages, rendus ensemble.

**1. Le lot livre le moteur, pas la permission.** La règle de décision
« compléments avant biologie » est écrite, testée sur fixture et branchée ;
elle reste **structurellement incapable de produire une intention en
production** tant que le catalogue de décision n'est pas publié. Le lot ne
peuple pas ce catalogue : son hors-périmètre le dit déjà (« le lot consomme
l'atelier règles existant »), et le remplissage — tags d'intention, références
sources, seuils fonctionnels, alertes de sécurité — est un travail de contenu
clinique sourcé exigeant des claims certifiés et une validation praticien
(`DC-01`, `DC-02`, `DC-19`). Il relève d'un lot clinique distinct, nommé ici
comme dette et non résolu par du code. Un moteur juste qui ne peut rien dire
vaut mieux qu'un moteur qui dit oui faute d'avoir regardé.

**2. Les conditions négatives sont inversées en fail-closed.** L'absence
d'information ne vaut jamais autorisation. La condition 2 de la spec se lit
désormais en deux étages, distincts parce que les deux tables ne se lisent pas
de la même manière :

- **Alertes de sécurité** — garde au niveau du *catalogue*. Qu'un ingrédient ne
  porte aucune alerte est le cas normal et ne prouve rien à lui seul ; ce qui
  fait preuve, c'est que le catalogue d'alertes soit **publié**. Catalogue
  d'alertes non publié ⇒ refus, pour tout ingrédient, sans exception.
- **Seuils fonctionnels** — garde au niveau de l'*ingrédient*. Sans seuil actif
  publié sur l'ingrédient visé, « seuils respectés » n'est pas une conclusion
  mais une absence de vérification : la borne de dose cible portée par la règle
  n'est comparable à rien. Aucun seuil actif sur l'ingrédient ⇒ refus pour cet
  ingrédient.

Aucun de ces refus n'est silencieux : chacun rend un motif lisible en français,
distinct de « pas d'obstacle constaté » (`DC-34`, `DC-35`). Un refus faute de
catalogue n'est pas une contre-indication et ne se restitue jamais comme telle.

**3. La sentinelle existante est le point d'ancrage — on n'écrit pas une
seconde primitive.** `sentinelleADeQuoiConclure` (`sentinelle.ts:78`) énonce
déjà ce fait exact et existe pour lui : elle rend faux tant qu'aucune règle
validée n'atteint le moindre ingrédient. La règle de décision l'appelle ;
`evaluerSentinelle` conserve son fail-closed de flag (`WN_C4_ENABLED`), qui
reste un **second verrou indépendant** — même catalogue publié, le rayon reste
clos sur un environnement où le flag n'est pas ouvert. Correction documentaire
au passage, sans changement de logique : le commentaire de cette fonction
affirme que `clinical_intent_tags` « est peuplée » ; la production dit 0. Les
deux tables sont vides, et le commentaire est remis à l'état réel.

**4. Le déclencheur reste le tableau clinique, jamais un score seul.**
Condition 3 de la spec, inchangée et désormais gardée : besoin dégradé +
plainte + anamnèse. Un axe DNST ne déclenche aucune intention de complément,
seul ou combiné à un autre axe. Test négatif dédié sur tyrosine et mélatonine —
les deux cas où la tentation est la plus forte. `DC-27` (score ≠ diagnostic),
`DC-28` (un questionnaire isolé ne suffit pas à conclure).

**5. `conditionnelle_biologie` n'est pas une recommandation, et la restitution
doit le rendre impossible à lire ainsi.** Une intention en attente de bilan
n'apparaît ferme ni au praticien ni au patient ; le patient la lit « en attente
de confirmation par votre bilan », formulation non anxiogène. La garde de
restitution est étendue sur le patron de [[D-055]] (éteinte ≠ recommandée) :
le LLM ne peut nommer aucun complément absent des intentions déterministes, et
ne peut pas non plus promouvoir une intention conditionnelle en conseil ferme.
L'approbation de diffusion praticien reste requise, inchangée (`D-003`).

**6. Contrat versionné en V4, aucune migration.** Phases, statut
d'intervention et `waitFor` entrent dans le payload JSON versionné :
`c1-protocol-draft-v4`, à côté des V1 à V3 existantes. Aucune modification de
`schema.prisma`, aucune migration Prisma — le lot n'en a pas besoin, et la
règle de la campagne interdirait d'y faire voyager le code qui en dépend. La
garde `FORBIDDEN_SUPPLEMENT_FIELDS` (`protocolDraft.ts:17`) est étendue aux
nouveaux statuts : ni produit, ni forme, ni dose, ni marque en texte libre,
quel que soit le statut de l'intention.

- Dette nommée, non résolue par ce lot : (a) le **peuplement du catalogue de
  décision C4**, préalable réel à toute intention de complément en production —
  arbitrage 1 ; (b) `DC-39` (« une modification à la fois »), que la fiche de
  lot porte sans l'avoir au périmètre : distinguer les interventions
  compatibles simultanément de celles à tester séquentiellement est un
  arbitrage clinique par type d'intervention, à instruire depuis des sources,
  jamais à déduire (`DC-19`) — aucune ligne de code ne le devine, et ce lot ne
  le devine pas ; (c) l'injection des **vigilances** de synthèse, moitié non
  livrée de l'étape 5 du LOT-01, reprise ici sous la même garde LLM : une
  vigilance déterministe n'est pas censurable par une sortie de modèle.
- Conséquences : le LOT-05 est livrable et vérifiable sur fixture ; en
  production, la règle de décision refuse, avec motif, jusqu'à publication du
  catalogue. Aucune interprétation réellement servie aujourd'hui n'est déplacée
  par ces arbitrages — il n'y a aucune intention de complément en production à
  déplacer. Le LOT-06 (arbitrage biologique) reste le résolveur des intentions
  `conditionnelle_biologie` ; il hérite du même refus fail-closed tant que le
  catalogue est vide.
- Référence : `docs/claude/campagnes/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/lots/LOT-05-protocole-complements-claims.md`,
  `sources/02-spec-lots-parcours-t0.md` (Lot E),
  `web/src/lib/supplement-library/sentinelle.ts`,
  `web/src/lib/clinical-engine/types.ts`,
  `web/src/lib/clinical/verifierRestitutionOrientation.ts`,
  `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md`

### D-055 — Ce qu'un moteur muet doit publier pour qu'une extinction devienne possible, et ce qui l'interdit

- Date : 2026-08-13
- Statut : accepté (décision utilisateur du 2026-08-13, approbation du plan du LOT-08)
- Domaine : clinique, moteur de scoring (`group_majority`), règles d'arrêt, garde de restitution
- Contexte : le LOT-03 a livré STOP-STR inerte, et l'a écrit ([[D-053]],
  arbitrage 8) : son déclencheur porteur `Q_STR_01` passe par `group_majority`,
  qui ne publie aucun compte de recueil, et `totalSousScore` rend un total dès
  un item par groupe — trois réponses sur vingt et une produisaient la bande la
  plus favorable de la grille. La garde de complétude du moteur d'arrêt refuse
  donc d'éteindre, à raison. S'y ajoutent deux dettes nommées par [[D-053]] :
  le §5 (« une contradiction ouverte interdit l'extinction ») n'a aucun code,
  et le garde de restitution ne distingue pas une cible éteinte d'une cible
  recommandée. Le LOT-08 lève ces trois verrous ; cette décision précède sa
  première ligne de code (`DC-17`, `DC-18`).
- Fait relu en production le 2026-08-13 (`execute_sql`) : **une seule
  passation `Q_STR_01`**, sans `rawAnswers` — donc déjà inerte pour tout
  raisonnement recalculé (motif 1 de `scoresRecalculesPourRaisonnement`), et
  son instantané stocké n'est pas réécrit. Les arbitrages ci-dessous ne
  déplacent **aucune** interprétation réellement servie aujourd'hui.
- Décision : six arbitrages, rendus ensemble.

**1. `group_majority` publie `missing` et `repondus` à la racine, et rien
d'autre.** C'est la forme « moteurs à score global » que `comptesDuRecueil`
(`orientationEngine.ts`) sait déjà lire, celle de `sum`, `psqi` et `tfd`.
**Aucun champ nouveau n'atteint le prompt, donc aucun bump de consigne** — le
motif exact, corrigé en revue (M11) : la consigne ne décrit `items`/`repondus`
que sous les sous-scores, mais `sum` publie `missing`/`repondus` à la racine
depuis #561 et l'ensemble admis du banc de consigne les contient déjà. Les
comptes sont sommés depuis `totalSousScore` par groupe, jamais recopiés d'une
déclaration. Pas de comptes par groupe : aucun consommateur ne
les lit — un groupe entièrement vide rend déjà `total: null`, et le bloc
« groupe dominant » n'est atteint que sur un total global non nul, donc sur
trois groupes mesurés. Une note de recueil partiel dit le trou en français
(patron `tfd`), en s'ajoutant à la note existante de l'instrument sans
l'écraser.

**2. `total` ne change pas ; la bande tombe sur recueil partiel.** Le total
reste servi tel quel : c'est une mesure réelle, biaisée vers le bas, et
d'autres consommateurs le lisent — le partage exact de `tfd`. La bande
(`interpretation`, et avec elle `dominant` et `protocol`) n'est plus servie que
sur recueil complet (`missing === 0`) : une grille calibrée sur vingt et un
items ne se lit pas sur trois, et la bande fabriquée était la plus favorable,
affichée sur la fiche praticien — même classe que le PSQI et le TFD, fermée par
les mêmes précédents. Pas de `bandePlancher` pour `group_majority` : aucune
règle d'orientation publiée ne lit cette bande, et un plancher — garantie
basse — ne peut par construction jamais garantir la bande favorable qu'exige
une extinction ; ce serait du code mort qu'aucune mutation ne ferait rougir.

**3. La garde de complétude du moteur d'arrêt refuse « muet OU incomplet »,
explicitement.** Elle refusait un porteur sans comptes lisibles ; elle refuse
désormais aussi, dans la même garde, un porteur dont les comptes disent un
manquant. Le refus sur recueil partiel était déjà obtenu par ricochet — la
garde générale d'`extraireCible` retire la mesure, le déclencheur ne mord pas —
mais une extinction ne se refuse pas par ricochet : la borne se lit dans le
moteur d'arrêt lui-même. Fail-closed renforcé, jamais desserré ; aucune valeur
clinique n'entre.

**Et elle lit AU GRAIN DU DÉCLENCHEUR — fait découvert en écrivant le banc de
bout en bout, pas en relisant le code.** La garde lisait les comptes à la
RACINE du porteur pour tous les déclencheurs ; or les moteurs à sous-scores
(`subscore` — le DASS-21, deux des quatre déclencheurs de STOP-STR) ne
publient aucun compte racine, leur complétude vivant sur chaque axe
(`repondus`/`items`). Un déclencheur sur `Q_STR_04/S` échouait donc la garde
même sur une passation complète : publier les comptes de `Q_STR_01` n'aurait
fait que déplacer le verrou d'un instrument à l'autre, et la signature aurait
été un geste vide une seconde fois. La garde lit désormais l'axe visé quand le
déclencheur en vise un, la racine sinon, avec la résolution d'axe
d'`extraireCible` (l'id prime sur le libellé) ; axe introuvable ⇒ illisible ⇒
refus, jamais un repli sur la racine.

**4. « Contradiction ouverte » ([[D-053]] §5) : un constat du moteur de
contradictions dont `resolution.statut !== 'resolue'`, sur le DOSSIER entier.**
`ouverte` et `escaladee_praticien` bloquent toutes deux — une escalade est une
discordance que personne n'a tranchée, pas une discordance résolue. Le
périmètre est le dossier, pas l'axe : aucun vocabulaire d'axe n'existe sur ces
tables, et en inventer un serait une structure clinique nouvelle sans source ;
bloquer plus large ne peut que raréfier l'extinction, c'est le sens du
fail-closed ; et en V1, C-STR (seule contradiction publiée) et STOP-STR (seule
règle d'arrêt) portent le même axe — les deux lectures coïncident, l'arbitrage
se rouvre si des contradictions d'autres axes gênent un jour réellement.
L'écart [[D-050]] (le moteur de contradictions évalue le dossier là où `review`
porte sur l'épisode T0) est constaté, non refermé : l'orientation raisonne
elle-même sur les dernières passations du dossier. Le blocage n'existe que si
le système de contradictions est actif (`contradictionsActives()` : drapeau ET
table signée) — un système éteint ne produit aucun constat, donc rien
d'« ouvert » ; c'est la hiérarchie de verrous déjà en place, pas un verrou
nouveau. **Le sens unique est garanti par construction** : les constats ne sont
lus que pour interdire l'extinction, jamais pour la déclencher ni pour toucher
une recommandation (`DC-30`) — un banc compare les deux sorties. Précision de
revue (M8), figée par banc avant que les formes vides soient peuplées : une
`CONVERGENCE` non résolue ne bloque PAS — un accord de sources n'est pas une
contradiction ; seules `DISCORDANCE` et `CONFLIT_SOURCES` interdisent.

**5. Le garde de restitution distingue éteinte et recommandée, lexicalement,
et journalise.** Même régime que le garde existant : log `warn`, jamais de
censure — l'objet actionnable vient de la route déterministe, pas de la prose.
Le critère est décidable parce que le vocabulaire l'est : autour de chaque
citation d'une cible, une fenêtre de caractères normalisés (patron de
l'adjacence « pack ») est fouillée pour un petit vocabulaire fermé de marqueurs
d'extinction — famille « étein- », « extinction », « pas d'objet », « pas/plus
nécessaire », « plus lieu », et le libellé servi (`LIBELLE_EXTINCTION`). Ces
marqueurs sont ceux que la consigne v25 impose déjà au modèle (« dis qu'elle
n'est pas nécessaire en l'état, et reprends le motif d'arrêt ») : **aucun bump
de consigne**, et deux bancs les tirent des textes de production eux-mêmes —
reformuler `LIBELLE_EXTINCTION` ou le motif de STOP-STR sans réviser le
vocabulaire rougit. La fenêtre est ASYMÉTRIQUE, sur mesure et non sur
intuition : 200 en amont, 420 en aval — le motif de STOP-STR, que la consigne
fait citer après la cible, porte son unique marqueur à ~235 caractères
normalisés de sa tête, et une fenêtre symétrique de 200 accusait la
restitution la plus fidèle possible (trouvé par le banc dérivé du motif). Deux sens : une cible éteinte citée sans marqueur proche est un
écart (présentée comme courante) ; une cible recommandée vivante citée avec
marqueur proche est un écart (présentée comme éteinte). Les angles morts — une
paraphrase sans marqueur, deux cibles dans la même fenêtre — sont documentés en
tête de module, comme ceux du garde d'origine : un garde borné et honnête vaut
mieux qu'une garantie prétendue.

**6. Rien d'autre ne bouge.** Aucun seuil, bande ou valeur clinique nouveau
(`DC-19`, `DC-20`) ; aucune migration, rien de persisté ; la table d'arrêt
reste **non signée** — la production ne change pas au merge, et la signature
demeure l'acte praticien séparé que [[D-053]] décrit (étape 6 du lot,
confirmation distincte, après relecture du bloc « à connaître avant de
signer » de `stopRulesV1.ts`).

- Conséquence latérale, nommée puis COMPLÉTÉE en revue (B1) : « Mon équilibre »
  lit les comptes racine (`extraireValeurBrute`, `equilibre/score.ts`) et
  `Q_STR_01` y sert le **besoin 9** — une FONDATION CRITIQUE — en échelle
  inversée (`inverser: true`). Un recueil partiel y produisait une valeur
  biaisée bas, donc un bien-être surestimé après inversion ; il vaut désormais
  « non mesuré ». L'effet va dans les deux sens : un `Q_STR_01` partiel et déjà
  sévère (`total >= 28`, seule source répondue) effondrait le besoin 9 et
  plafonnait le score global à 50 — le rendre non mesuré lève ce plafond, et le
  score REMONTE. C'est un changement de définition du besoin :
  `VERSION_SCORE_EQUILIBRE` est bumpée **v12/v13 → v14/v15**, comme aux deux
  précédents de la même classe (PSQI/besoin 5 → v10/v11, TFD/besoin 4 →
  v12/v13), doctrine dans `constants.ts` et banc « le plafond de fondation
  critique tombe » dans `score.test.ts`. Stock de production nul (une
  passation, sans `rawAnswers`) — mais les deux précédents ont bumpé sur un
  stock aussi mince : c'est le FLUX que l'étiquette gouverne.
- Conséquences : `web/src/lib/questions.ts` (moteur `group_majority`),
  `web/src/lib/clinical/orientationEngine.ts` (garde d'arrêt, entrée
  `contradictions`), `web/src/lib/clinical/orientationService.ts` (câblage des
  constats), `web/src/lib/clinical/contradictionsService.ts` (helper partagé,
  même verrou), `web/src/lib/clinical/verifierRestitutionOrientation.ts` et
  `api/praticien/synthese/route.ts` (listes éteintes/recommandées). Bancs à
  chaque étage, dont le cas « trois items sur vingt et un » en vrai
  `calculateScore`.
- Alternatives écartées : des comptes par groupe (aucun lecteur, et le contrat
  du prompt exigerait de décrire des champs que personne ne consomme) ; retirer
  ou nuller `total` sur recueil partiel (le total partiel est une mesure réelle
  que d'autres consommateurs lisent — c'est la bande qui ment, pas le nombre) ;
  une `bandePlancher` pour `group_majority` (code mort pour une règle d'arrêt,
  cf. arbitrage 2) ; un blocage d'extinction par axe (vocabulaire d'axe
  inexistant, arbitrage 4) ; un bump de consigne pour imposer un marqueur
  canonique (la v25 induit déjà les marqueurs retenus ; bumper serait un acte
  visible sans gain de garde).
- Dettes reconduites, sans les redécouvrir : borne d'ancienneté de l'exclusion
  `dejaRepondu` (question ouverte de campagne, aucun chiffre fondé) ;
  complétude du moteur Berlin (`Q_SOM_03`), préalable à toute reprise de
  STOP-APN ; régénération des synthèses historiques ([[D-053]] §6, hors
  campagne) ; le garde de restitution reste journalisant, pas bloquant — en
  faire un rejet serait un arbitrage nouveau sur le coût d'un faux positif.

### D-054 — Ce qu'une priorité candidate a le droit d'affirmer, et qui recalcule la chaîne

- Date : 2026-08-12
- Statut : accepté (décision utilisateur du 2026-08-12)
- Domaine : clinique, chaîne C1, cockpit praticien, intégrité de persistance
- Contexte : après confirmation T0, le cockpit affiche « Décision suspendue :
  l'abstention clinique n'est pas encore évaluée » — indéfiniment. Aucune
  `ClinicalRuleRef` validée n'atteint jamais `buildClinicalReview`, si bien que
  l'abstention retombe systématiquement sur `not_evaluated`
  (`clinicalReview.ts`), que `buildDecisionCard` classe la décision `blocked`, et
  qu'aucune priorité candidate n'a jamais pu exister. En regard, la plainte que
  le patient déclare (`Q_MOD_03`) et l'objectif qu'il se donne
  (`patientContext.priorityGoal`) traversent toute la chaîne sans être affichés
  nulle part. Le LOT-04 rebranche cette chaîne. Neuf arbitrages, rendus avant la
  première ligne de code (`DC-17`, `DC-18`).
- Décision :

**1. Aucune porte praticien existante n'est affaiblie.** Les conditions T0
(`preconditionsT0.ts`) et les cinq gardes de `buildDecisionCard` — règle
candidate stérile, `origin` obligatoirement `engine`, rangs uniques, décision
bloquée par une abstention non levée ou un constat de sécurité, sélection
réservée au praticien — restent à l'octet. Une chaîne qui produit enfin quelque
chose est exactement le moment où l'on est tenté d'assouplir la porte qui la
gardait.

**2. Les claims d'un candidat sont portés par la RÈGLE, pas par le contrat C1.**
`DecisionPriorityCandidate` et `ClinicalFindingProvenance` ne sont PAS étendus :
ils entrent dans `decisionCard.inputHash`, donc dans `draft.inputHash`, donc dans
`versionId` — les élargir déplacerait toutes les empreintes pour un besoin que la
table sait déjà couvrir. La traçabilité vit dans `justificationClaims` de
`priorityRulesV1.ts` (patron orientation), et le
`ValidatedClinicalRuleRef.validation.sourceReference` reste une chaîne qui nomme
la table, sa version et son SHA.

**3. Un drapeau d'anamnèse et l'objectif prioritaire ne sont pas des mesures.**
Ils ne peuvent donc pas entrer dans `provenance`, dont `validateProvenance` reste
jetante et inchangée : cette fonction garantit qu'un constat ne cite que des
sources réellement présentes dans le `ClinicalSnapshot`. Ce que le patient
DÉCLARE s'exprime en `rationale` et en `limitations`, et s'affiche au cockpit —
jamais comme une provenance. Conséquence assumée : **la V1 de la table ne porte
aucun déclencheur de drapeau**, faute de bande publiée à citer.

**4. LOT-04 ne consomme pas les règles d'arrêt.** Aucun pont
`reglesEteintes` → priorité candidate. Motif : une extinction d'orientation dit
qu'une EXPLORATION n'a plus d'objet ; elle ne dit rien de ce qu'il faut
ENTREPRENDRE. Traduire l'une en l'autre serait exactement le genre d'inférence
que `DC-01` interdit. **Écart écrit plutôt que masqué** : le critère du lot
« stress au mieux mineur si C-STR ouvert » est donc tenu par construction — la
V1 ne porte aucune règle d'axe stress — et non par un mécanisme. Le banc le
vérifie et le dit.

**5. Le recalcul serveur vérifie la carte SOUMISE, pas ses seules empreintes.**
`POST /api/praticien/protocoles/versions` et `POST /api/praticien/protocoles`
acceptaient jusqu'ici la `DecisionCard` du corps de requête TELLE QUELLE : la
fixture du banc `versions/route.test.ts` était elle-même une carte forgée
(`inputHash: 'HASH_DEC'`) qui passait. Le contrôle se fait désormais **en deux
temps**, et le second ne suffit pas sans le premier :

1. **La carte est recoupée contre sa PROPRE empreinte.** `decisionCardId` est le
   seul champ exclu du hash (`decisionCard.ts`) : tout le reste doit se
   re-hacher à l'identique. Ce premier temps est posé AVANT la lecture du
   dossier — une carte qui ne se recoupe pas elle-même n'a pas à faire lire le
   patient.
2. **La chaîne est reconstruite DEPUIS LA BASE**, aux horodatages soumis (les
   identifiants sont exclus des empreintes, `createdAt` et `asOf` y entrent).
   Les trois `inputHash` sont comparés — nommés séparément pour dire QUEL
   maillon a bougé —, puis les deux JSON canoniques de la carte (hors
   `decisionCardId`). Cette dernière comparaison ferme les clés surnuméraires et
   rend le contrôle indépendant de ce que `buildProtocolDraft` lira ensuite : ce
   module garde la BASE, pas un consommateur.

**LE PREMIER TEMPS A ÉTÉ AJOUTÉ APRÈS LA REVUE DU 2026-08-12, ET LE TROU MÉRITE
D'ÊTRE NOMMÉ.** La première rédaction ne portait que le second : elle confrontait
le recalcul aux empreintes **déclarées par le client**, jamais au CONTENU de la
carte envoyée. Une carte dont l'abstention, les priorités candidates et les
limitations étaient entièrement réécrites, mais qui transportait les trois
empreintes honnêtes, passait donc les trois comparaisons — le serveur recalculait
bien, comparait bien, et comparait deux nombres que le fraudeur n'avait aucune
raison de toucher. Les deux bancs d'intrusion d'alors passaient au vert pour une
raison ANNEXE (la carte y était fabriquée table non signée puis soumise table
signée, si bien que le recalcul divergeait de toute façon) : ils ne disaient rien
du cas qui compte. Les deux bancs ajoutés depuis ont été vus ROUGIR quand le
recoupement est neutralisé.

Divergence ⇒ **409 `chaine_c1_divergente`**, code choisi pour rejoindre les 409
existants de la route (`version_stale`, `protocol_stale`), que le client traite
déjà en rechargeant. Aucune migration, aucune colonne, aucune persistance
nouvelle.

**Une seule chose que le serveur ne peut pas recalculer, et elle est nommée :
`selectedMainPriority`.** C'est un GESTE praticien, pas une dérivation. Le
recalcul la réinjecte telle quelle, et `buildDecisionCard` la re-valide
entièrement (`selectedBy: 'practitioner'`, candidat réellement classé, décision
non bloquée). **Conséquence pour le lot qui posera la sélection** : elle devra
transiter par une route serveur, jamais par un enrichissement de carte côté
client — tout autre champ ajouté au navigateur fera 409.

**6. Le helper de vérification garde les DEUX points de persistance.** Un
fail-closed écrit dans une seule des deux routes est un fail-closed qu'on peut
oublier de corriger dans l'autre — même motif que le double verrou
d'`orientationService`. Il vit dans
`web/src/lib/clinical-engine/verifierChaineC1.ts`, et la construction de la
chaîne elle-même est extraite dans `chaineC1.ts`, appelée par le cockpit ET par
le vérificateur : deux constructions divergentes rendraient 409 sur une carte
honnête.

**CE QUE CET ARBITRAGE NE COUVRE PAS, ET C'EST UNE DETTE PRÉEXISTANTE.** Sur
`POST /api/praticien/protocoles`, le `ProtocolDraft` arrive CONSTRUIT du
navigateur : la route en vérifie l'ancrage (`decisionCardId`,
`decisionCardInputHash`) et la structure des compléments, mais elle ne le
RE-DÉRIVE pas de la carte — `validateDecisionCard` n'y est pas rejouée, à la
différence de la route sœur qui, elle, reconstruit le protocole serveur par
`buildProtocolDraft`. **Le 409 garde donc la carte, pas le protocole.** Le lot ne
referme pas ce trou : il est antérieur, il appelle son propre arbitrage, et
l'écrire ici vaut mieux que laisser croire que ce point de persistance est
entièrement gardé. *Relevé en revue du 2026-08-12 (M4).*

**7. La table est livrée NON SIGNÉE — la production ne change pas au merge.**
Même discipline que `contradictionsV1` et `stopRulesV1` : écrire une table et la
signer sont deux gestes distincts, le second est un acte praticien.
`tablePrioritesSignee()` reprend la triple forme auto-portante de `tableSignee()`
— `validationExterne`, une date de validation, des claims sources non vides. Tant
qu'elle est fermée, aucune `ClinicalRuleRef` n'atteint la revue, l'abstention
reste `not_evaluated` et aucun candidat n'est produit : le comportement servi est
celui d'hier. **Pas de drapeau d'environnement propre** — la chaîne C1 est déjà
derrière l'authentification praticien et la confirmation T0 ; un second drapeau
donnerait l'illusion d'un second verrou là où il n'y a qu'un chemin (patron
[[D-053]], arbitrage 6).

**Deux effets NE sont PAS derrière ce verrou, et c'est voulu.** L'affichage de la
plainte dominante et de l'objectif prioritaire est la restitution d'une bande
déjà publiée par un instrument certifié et d'un texte déjà saisi : ce n'est pas
une sortie de règle. Le recalcul serveur (arbitrage 5) est un contrôle
d'intégrité, pas une conclusion clinique — le subordonner à une signature
clinique reviendrait à laisser une carte forgée passer tant que la table n'est
pas signée.

**8. Aucun seuil neuf n'entre dans le dépôt.** Les déclencheurs citent la bande
`>= 7` de `Q_MOD_03`, celle que la table d'orientation SIGNÉE cite déjà
(`R2-SOM-02`) et que `questions.ts` publie (1-3 « Intensité faible ou absente »,
4-6 « modérée », 7-8 « élevée », 9-10 « très élevée ») : `>= 7` vise les deux
bandes hautes et elles seules. Le départage de la plainte dominante — à valeur
égale, l'ordre de publication des sept domaines par le catalogue — est un choix
purement TECHNIQUE de stabilité d'affichage, identifié comme tel sur place
(`DC-19`, `DC-20`) : il ne hiérarchise aucune plainte cliniquement.

**9. `TABLE_EXIGE_PRESCRIPTIF = false` pour cette table.** Une priorité candidate
est une PROPOSITION hiérarchisée soumise au praticien, pas une prescription
d'intervention — à la différence d'une extinction, qui agit sur ce que le
praticien ne verra pas. Les onze claims épinglés sont descriptifs
(`prescriptif = false` en production, relu le 2026-08-12) : ils décrivent des
mécanismes — fonctions intestinales, dysfonction de barrière, insulino-résistance
— et ne recommandent aucune conduite. Exiger `prescriptif` d'eux serait une
erreur de catégorie ([[D-046]]), et aurait forcé à épingler un claim voisin qui
ne dit pas la règle (`DC-14`). Ce que la règle ajoute — « cet axe mérite d'être
regardé en premier » — viendra de la SIGNATURE praticien, jamais des claims.

**10. Une abstention REQUISE fait taire la table.** *Arbitrage rendu en revue du
2026-08-12 (M3), après avoir constaté que le producteur de candidats ne
consultait pas l'abstention.* Le cas n'est pas théorique : `Q_MOD_03` amputé d'un
SEUL domaine rend `total: null`, ce qui déclare le canal de plainte non mesurable
— donc l'abstention `required` —, et pourtant les six domaines répondus portaient
encore leurs valeurs et déclenchaient les règles. La carte servait alors une liste
hiérarchisée sous un bandeau de suspension : `buildDecisionCard` remettait bien la
priorité PROPOSÉE à `null` (la décision est `blocked`), mais gardait les candidats
classés. Données insuffisantes ⇒ on réduit la conclusion, on ne l'habille pas
(`DC-25`). Le producteur lit le statut NORMALISÉ de la revue, et non l'intention
locale — lire l'intention laisserait produire des candidats sous une abstention
que `buildClinicalReview` a ramenée à `not_evaluated`.

- Conséquences : `web/src/lib/clinical/priorityRulesV1.ts` (table, verrou,
  producteur), `web/src/lib/clinical-engine/chaineC1.ts` (construction unique),
  `verifierChaineC1.ts` (recalcul serveur), les deux routes de persistance, le
  cockpit et son écran. Onze paires de claims entrent au contrat de fraîcheur
  (`rag_claim_fraicheur_tables_signees_v1.sql` et son négatif) sous la table
  `priorites`.
- Frontière de ce que la signature couvrira : `PRIORITY_RULES_SHA256` porte sur
  `PRIORITY_RULES_V1` SEULE — déclencheurs, claims, libellés, motifs. Le
  producteur de candidats, le classement et la procédure d'abstention vivent dans
  `chaineC1.ts` et relèvent des bancs ordinaires, pas du périmètre signé. Dit ici
  parce que le contraire se supposerait.
- **Dette BLOQUANTE POUR LA SIGNATURE (M1)** : la procédure d'abstention étant
  hors du périmètre signé, signer `PRIORITY_RULES_METADATA` en l'état ouvrirait un
  verdict clinique — `required` / `not_required`, servi au praticien et haché dans
  la carte — qu'AUCUNE ligne signée ne décrit (`DC-17`, `DC-26`). Avant toute
  signature, cette procédure doit entrer dans le périmètre signé : dans la table,
  ou dans un document signable qu'elle référence. Le rappel vit aussi en
  commentaire au-dessus de `PRIORITY_RULES_METADATA` et de `evaluerAbstention`.
- Ce que la signature assumera par ailleurs (M5) : chacune des deux règles repose
  sur UN ITEM UNIQUE de `Q_MOD_03`, un auto-déclaré de 1 à 10 sans instrument
  spécifique à l'appui. `DC-28` (« un questionnaire isolé ne suffit pas à
  conclure ») est mitigé par ce que la règle PRODUIT — une proposition
  hiérarchisée, jamais une conclusion — et par les `limitations` que chaque
  candidat porte. Ce n'est pas une objection réfutée : c'est un arbitrage qui
  appartient au praticien qui signe.
- Dette nommée : aucun candidat n'est encore SÉLECTIONNABLE — la sélection
  praticien reste hors périmètre, et un protocole reste donc impossible même
  table signée. Aucune règle ne couvre les cinq autres domaines de plainte
  (fatigue, douleurs, sommeil, moral, mobilité) : elles sont écartées avec leur
  motif dans `PRIORITY_RULES_ECARTEES_V1`, faute de claim relu pour l'axe.
  Enfin, `POST /api/praticien/protocoles` ne re-dérive pas son `ProtocolDraft` de
  la carte (arbitrage 6, M4).

### D-053 — Ce qui a le droit d'éteindre une exploration, et ce qui n'en a que l'air

- Date : 2026-08-12
- Statut : accepté (décision utilisateur du 2026-08-12)
- Domaine : clinique, orientation, règles d'arrêt
- Contexte : les recommandations d'exploration restent allumées indéfiniment ;
  le moteur ne sait pas dire « information suffisante — pas d'exploration
  supplémentaire actuellement ». Le LOT-03 pose ce geste. Le cadrage a établi
  que **trois des quatre prédicats de la spécification ne sont pas écrivables**
  avec le vocabulaire et les grilles du dépôt, et que l'un d'eux contredit la
  table d'orientation signée. Cette décision précède la première ligne de code
  (`DC-17`, `DC-18`).
- Décision : sept arbitrages, rendus ensemble.

**1. Une extinction est un acte plus exigeant qu'une proposition.** Ce qui a le
droit de **déclencher** une exploration n'a pas pour autant le droit de la
**taire**. Une grille descriptive, un item auto-déclaré isolé, un indice non
validé psychométriquement et un instrument dont le moteur ne publie pas ses
comptes de complétude peuvent proposer ; aucun ne peut éteindre. Motif : une
proposition superflue coûte une passation, une extinction indue coûte une
exploration qui n'aura pas lieu, et le praticien ne voit pas ce qui ne s'affiche
pas (`DC-25`, `DC-28`).

**2. La V1 ne porte que STOP-STR, sur ses seules cibles stress — et c'est
`Q_STR_01` qui porte le claim, pas le DASS.** La rédaction initiale de cet
arbitrage écrivait la règle sur « DASS-21 et Cungi rassurants ». La lecture de
`rag_corpus_claims` en production le 2026-08-12 (8 224 claims `VALIDE` et actifs)
la corrige : **ni le DASS-21 ni le Cungi ne portent de claim d'extinction**, le
corpus n'en publie que les bandes. La seule échelle de stress dont le corpus
attache une **conduite** à la bande rassurante est le questionnaire SIIN
(`Q_STR_01`) — `WN-CL-0051-030` (« un score total inférieur à 4 correspond à un
niveau de stress rassurant **relevant de l'hygiène de vie** ») et
`WN-CL-0051-033`, prescriptif (« il est recommandé d'orienter vers les **conseils
de vie antistress** »). La bande voisine donne son sens à celle-ci :
`WN-CL-0051-031` réserve le « regard physiopathologique » à l'intervalle 5-14.
`questions.ts` sert exactement cette bande sur `Q_STR_01` (0-4, « Oriente vers
les conseils de vie antistress »).

`Q_STR_01` rassurant est donc la condition **porteuse** ; le DASS-21 (axes `A` et
`S` en bande `Normal`) et le Cungi (« Niveau de stress très bas ») restent des
conditions **additionnelles**, dont les bandes sont elles aussi publiées par le
corpus. Les exiger rend l'extinction plus rare : le sens du fail-closed. L'axe
`D` du DASS n'entre pas — c'est l'axe humeur, et l'arbitrage 3 y renonce.

**Trois règles sont éteintes, et le critère n'est pas l'axe : c'est ce qui les
déclenche.** `R2-STR-01`, `R2-STR-02` et `R2-STR-03` partent d'un **dépistage**
— l'axe `ADAPTATION_STRESS` de `Q_MOD_01`, un burn-out déclaré à l'anamnèse — et
demandent une mesure spécifique : les éteindre quand cette mesure revient
rassurante, c'est dire que la question posée a reçu sa réponse. `R-STR-01` et
`R-STR-02` **ne sont pas éteintes** : leur déclencheur est le PSS-10
(`Q_STR_02`) en zone défavorable, c'est-à-dire une **mesure**, sur l'instrument
que la table d'orientation appelle elle-même « le questionnaire habituel
d'intensité ». Les éteindre sans lire le PSS-10 aurait fait taire un résultat
défavorable parce que d'autres sont rassurants, et servi au praticien le motif
« les explorations de l'axe stress n'ont pas d'objet » devant un stress perçu en
zone danger. C'est l'objection de l'arbitrage 3, appliquée **à l'intérieur** de
l'axe (`DC-30`). *Relevé en revue adversariale du 2026-08-12, après une première
rédaction qui éteignait les cinq.*

Les explorations concernées sont donc celles que ces trois règles proposent —
PSS-10 `Q_STR_02`, DASS-21 `Q_STR_04`, Cungi `Q_STR_03`, BMS-10 `Q_STR_05`. Les
seuils ne sont pas écrits dans la table d'arrêt : ils **citent les bandes déjà
publiées** de chaque grille, comme le fait C-STR ([[D-042]]). Aucun nombre
nouveau n'entre dans le dépôt par ce lot (`DC-19`, `DC-20`) — une réserve près,
dite plutôt que lissée : le catalogue note que le seuil 4 de `Q_STR_01` n'est pas
explicitement couvert par la source et a été rattaché par harmonisation à la
bande basse, que la règle cite.

**L'extinction nomme des RÈGLES, jamais des cibles.** Une cible qu'une règle
d'un autre axe motive encore reste allumée : le Cungi est proposé par `R-SOM-01`
(axe sommeil), et une extinction par cible le ferait disparaître d'un axe qui n'a
rien demandé. C'est la même objection que celle qui fait renoncer au HAD.

**3. STOP-STR n'éteint pas le HAD.** Le HAD (`Q_NEU_11`) n'est proposé par
aucune règle de stress : il l'est par `R2-NEU-01` (plainte moral déclarée),
`R2-NEU-02` (antécédent psychiatrique), `R2-NEU-03`/`R2-NEU-04` (axes du DNST)
et `R-SOM-01` (PSQI défavorable). L'éteindre sur un DASS rassurant reviendrait à
**résoudre par suppression une discordance entre instruments d'axes
différents** — précisément ce que `DC-30` interdit, et l'inverse de ce que fait
C-STR, qui signale cette discordance au lieu de la trancher. *Arbitrage rendu
sans préférence exprimée par l'utilisateur ; il se rouvre sur une source
clinique qui fonderait l'extinction.*

**4. STOP-SOM et STOP-APN sont écartées de la V1, et leurs motifs entrent dans
la table.** Patron `CONTRADICTIONS_REGLES_ECARTEES_V1`, que [[D-042]] a rendu
livrable pour cette raison : une règle écartée reste lisible avec son motif,
plutôt que de disparaître dans un ticket.

- **STOP-SOM** — la spécification l'énonce sur « PSQI 5 », valeur à laquelle la
  table **signée** dit que `R-SOM-01` doit s'allumer, motif écrit à l'appui
  (`orientationRulesV1.ts:173-176` : la bande `info` du PSQI est prise
  au-dessus du seuil de 4 que l'instrument publie). L'écrire serait éteindre en
  V1 une règle signée le mois dernier sur la même valeur, sans re-signer la
  table. Sa seconde jambe, l'agenda `Q_SOM_09`, porte deux réserves : son
  indice /100 est une construction WellNeuro sans validation psychométrique ni
  cohorte de calibration, et [[D-052]] l'a déjà exclu du rideau T0 au motif
  qu'un recueil de 21 nuits ne conditionne pas une décision prise à J0 — la
  même objection vaut en miroir pour une extinction.
- **STOP-APN** — son prédicat « absence de symptômes » n'est pas exprimable :
  le vocabulaire de déclencheurs ne connaît que des tests positifs, et lire une
  liste vide comme « absent » heurte `DC-24`. Même motif que l'écartement de
  C-ALI en LOT-01. Défaut supplémentaire à refermer avant toute reprise : le
  moteur Berlin (`Q_SOM_03`) ne publie ni `missing` ni `repondus`, et sa garde
  par catégorie se contente d'un item mesuré — un Berlin à trois items sur neuf
  peut sortir « Risque faible ». Pour une règle d'orientation c'est un faux
  négatif ; pour une règle d'arrêt, ce serait une extinction fondée sur un
  instrument vide.

**5. Une contradiction ouverte interdirait l'extinction ; elle ne la déclenche
jamais.** Le fichier de lot autorisait les deux lectures. Une discordance se
signale (`DC-30`) : une règle d'arrêt qui éteindrait sur discordance la ferait
disparaître. **Cet arbitrage n'a AUCUN code, et c'est une dette, pas une
garantie** — ni le moteur ni le service ne consultent les contradictions. Dire
qu'il serait « inerte mais fail-closed » était faux dans ce sens-là : un frein
absent ne retient rien, il laisse passer. Ce que le lot livre à sa place est
plus étroit et réellement tenu : l'extinction ne peut pas naître d'une
discordance, puisque aucune contradiction n'est lue. La borne inverse — une
contradiction ouverte qui EMPÊCHE d'éteindre — reste à écrire, et elle
n'empêche rien aujourd'hui. *Reclassé après revue du 2026-08-12.*

**6. Une recommandation éteinte reste relisible dans la sortie courante ; rien
n'est persisté.** Elle garde ses motifs d'origine et porte en plus son motif
d'extinction — l'interdit « une extinction n'efface jamais l'historique » est
ainsi tenu par construction, sans table ni migration. Le rallumage est gratuit :
tout l'étage d'orientation est recalculé à chaque lecture, une passation
nouvelle devient mécaniquement la dernière, le déclencheur d'arrêt ne mord plus
et la recommandation revient. **Conséquence assumée** : les synthèses déjà
validées gardent leur instantané — la régénération des synthèses historiques est
hors périmètre de la campagne.

**7. `dejaRepondu` n'exclut que sur une passation exploitable, et le badge
survit à l'exclusion.** Aujourd'hui `dejaRepondu` vaut `true` sur une passation
dont le score a été annulé — le service annule le score sans retirer la ligne,
délibérément, pour préserver ce fait administratif. Le rendre excluant sans
garde ferait **disparaître la recommandation de refaire passer l'instrument que
le praticien vient d'invalider**, alors qu'invalider, c'est attendre une
re-passation. L'exclusion porte donc sur le seul cas où le recalcul rend une
mesure ; une passation `INVALID`, `SUPERSEDED`, non interprétable ou sans
réponses brutes n'exclut pas et laisse intact le signal « mesure à
replanifier ». Le badge « déjà renseigné » reste affiché dans tous les cas :
deux faits distincts en sortie, pas un booléen retourné. Une composition de pack
inconnue (`null`) n'exclut jamais — un `null` excluant serait un fail-open.

- Conséquences :
  - Nouvelle table `stopRulesV1.ts` sur le patron d'`orientationRulesV1.ts`,
    avec ses métadonnées, ses claims épinglés, sa constante de SHA **et** son
    littéral épinglé au banc — une constante seule, dont les deux membres
    bougent ensemble, est une signature décorative.
  - Le banc de fraîcheur des claims **découvre automatiquement** tout fichier
    de `web/src/lib/clinical/` portant un champ `claimsSource` : il rougit dès
    la création du fichier, avant toute signature. Il faut lui déclarer la
    table, trancher explicitement son exigence de `prescriptif` (une table qui
    **éteint** une prescription n'est ni la table d'orientation, qui prescrit,
    ni celle des contradictions, qui constate — arbitrage nouveau exigé par
    [[D-046]]), et étendre le contrat SQL de production avec ses fixtures.
  - La table d'orientation **n'est pas touchée** : l'étape SCOFF est différée
    hors du lot, donc aucun bump ni re-signature.
  - L'extinction est calculée dans le moteur, après l'absorption pack/membre et
    avant le tri, jamais dans une route ni dans un composant : les deux
    consommateurs — cockpit et synthèse — passent par le même service, et un
    fail-closed dupliqué est un fail-closed qu'on oublie de corriger dans l'une
    des deux copies.
  - Dire au modèle comment lire une extinction modifie le prompt système :
    bump `synthese-v25` et nouvelle empreinte gardée, sur le précédent v15/v16
    (le dépôt bumpe quand la couche déterministe change le **sens** de ce qui
    est transmis).
- Alternatives écartées : les trois stop rules comme spécifiées (exigerait
  d'ajouter la négation au vocabulaire de déclencheurs partagé par les trois
  moteurs — décision d'architecture, pas détail de table) ; une trace persistée
  et datée des extinctions et rallumages (nouvelle table, migration, PR séparée
  du code qui en dépend — la relisibilité dans la sortie courante suffit à
  l'interdit) ; `dejaRepondu` excluant sur toute passation existante, tel que le
  lot l'énonçait ; une fenêtre de fraîcheur bornant l'ancienneté d'une passation
  qui exclut — la borne serait un chiffre à fonder cliniquement, non disponible.
**8. Un instrument qui ne sait pas dire sa complétude ne peut pas éteindre.**
La garde générale retire la mesure d'un recueil qui se **déclare** incomplet ;
elle ne peut rien dire d'un moteur qui ne publie aucun compte. C'est le cas de
`group_majority`, celui de `Q_STR_01` — et `totalSousScore` rend un total dès un
item par groupe : trois réponses sur vingt et une produisent la bande la plus
favorable de la grille. Pour une règle d'orientation, ce silence est un faux
négatif ; pour une règle d'arrêt, ce serait l'extinction sur instrument vide qui
fait précisément écarter STOP-APN. Le moteur d'arrêt refuse donc d'éteindre sur
tout instrument dont la complétude n'est pas lisible.

**Conséquence, écrite ici plutôt que découverte le jour de la signature :
STOP-STR ne peut pas mordre en l'état.** Son déclencheur porteur est
précisément `Q_STR_01`. Faire publier ses comptes de recueil à `group_majority`
— comme `psqi` le fait depuis le lot de signature — est une modification du
moteur de scoring : elle appelle sa propre décision et son propre fragment, hors
de ce lot. **Signer la table d'arrêt ne suffira donc pas.**

- Dette nommée : aucune règle d'arrêt n'est gardée par un banc de production
  aujourd'hui ; l'existence réelle des `claimId` cités reste hors d'atteinte du
  CI, qui n'en vérifie que le format — les cinq paires ont été relues à la main
  sur la production le 2026-08-12 (toutes `VALIDE`, actives, non remplacées, en
  `v1.0`). Deux autres dettes, nommées par la revue : aucune borne d'ancienneté
  ne limite l'exclusion (une passation valide et mesurée de 2024 exclut sa cible
  — la fenêtre de fraîcheur reste écartée faute de chiffre fondé), et le garde de
  restitution de la synthèse ne distingue pas une cible citée comme recommandée
  d'une cible citée comme éteinte : sur ce point précis, c'est la consigne qui
  protège, non la donnée.

### D-052 — Les préconditions de confirmation T0 : ce qu'un T0 exige, et ce que « VALID » ne prouve pas

- Date : 2026-08-12
- Statut : accepté (décision utilisateur du 2026-08-12)
- Domaine : clinique, épisode d'évaluation T0, validité des passations
- Contexte : la confirmation d'un épisode T0 n'a aujourd'hui **aucune
  précondition**. Le panneau invite même explicitement à confirmer un dossier
  vide (« Aucune réponse disponible. Confirmez explicitement… »,
  `EpisodeConfirmationPanel.tsx`), et les deux points de persistance
  n'exigent que `status === 'confirmed'`. Or le T0 est **irrévocable** :
  l'identifiant d'épisode est déterministe (`runtime-episode-<patient>-<jalon>`)
  et les deux routes écrivent en `upsert(..., update: {})` — le premier T0 écrit
  est le seul, pour toujours. Ce lot pose la porte ; il ne la rouvre pas.
- Décision : quatre arbitrages, rendus ensemble.

**1. Le rideau T0 est une table clinique, pas une composition administrative.**
`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_ALI_01` — quatre identifiants **en dur**,
signés ici, découplés du pack de base. Le pack est une ligne en base éditable
depuis l'UI, et une divergence registre↔pack a déjà été journalisée le
2026-08-03 : dériver le rideau du pack ferait déplacer une règle clinique par un
geste administratif (`DC-26`). `Q_SOM_09` est **exclu du rideau bien qu'il soit
au pack de base seedé** : un agenda du sommeil sur 21 nuits ne peut pas
conditionner un point de décision qui se prend à J0. L'écran doit l'expliquer,
sans quoi l'exclusion se lira comme un oubli. `Q_ALI_01` est accepté **dans
l'une ou l'autre de ses formes** : la forme longue serait plus exigeante, mais
rendrait le T0 inconfirmable partout où `WN_ALI_01_SIIN57` est éteint — soit
partout aujourd'hui. Le repère, lui, continue de s'abstenir sur cet identifiant
([[D-051]]) ; une précondition qui constate une passation et un repère qui
désigne laquelle fait foi ne demandent pas la même certitude.

**2. « VALID » ne prouve rien, et c'est écrit plutôt que contourné.** La
migration du LOT-00 a posé `statut_validite TEXT NOT NULL DEFAULT 'VALID'` :
PostgreSQL a donc estampillé `VALID` **toutes** les lignes existantes.
Vérification en production le 2026-08-12 : 105 passations, **toutes `VALID`,
aucune autre valeur**, et la seule route capable d'écrire autre chose rend 503
tant que `WN_ENABLE_VALIDITE_PASSATIONS` est éteint. Une condition dure « la
passation est `VALID` » serait donc **tautologique** — un défaut de colonne
présenté comme un jugement clinique, exactement ce que `DC-24` interdit.
La condition dure retenue ne s'y appuie pas : une passation compte si elle
**existe**, si son statut **n'est pas exclu du raisonnement**
(`statutExcluDuRaisonnement`, indépendant du drapeau, prévu pour *désigner* et
non pour *filtrer*) et si le recalcul rend **une mesure** — c'est-à-dire un
score coté (`scored`, `total`), et pas seulement un objet non-`null`.

**Ce troisième terme a dû être écrit deux fois, et le dire évite de le
réécrire une troisième.** La première rédaction se contentait de
`scoresRecalculesPourRaisonnement(...) !== null`. Or `calculateScore` porte
depuis le 2026-07-29 une garde générale de passation vide qui rend, sur une
passation sans réponse lisible, `{ scored: false, total: null,
interpretation: null, raisonNonScore }` — un objet. **Quatre passations sans
une seule réponse satisfaisaient donc « rideau complet »**, et le T0 est
irrévocable (revue du 2026-08-12). Le cas n'est pas d'école : une passation
`Q_ALI_01` de la forme courte relue sous la définition SIIN ne partage aucun
identifiant d'item et tombe exactement là ([[D-051]]). La condition lit
désormais `scored` et `total`, les deux drapeaux que cette garde pose.

Ce terme est le seul qui refuse quelque chose en production : le statut est
tautologique, l'existence est triviale. Un T0 confirmé sur un questionnaire
présent mais non coté serait un T0 sans mesure.

**Ce que la condition ne dit PAS** : que chaque item est répondu. Un instrument
partiellement renseigné mais cotable passe — exiger la complétude item par item
serait un durcissement clinique qui n'a pas été arbitré ici. Le libellé affiché
dit donc « renseigné et cotable », pas « complet ».

**3. Le rideau s'évalue hors fenêtre.** `targetAt` d'un T0 vaut la date de la
**première passation du dossier**, quelle qu'elle soit. Un patient ayant
répondu à un questionnaire isolé six semaines avant son pack de base verrait
donc son rideau tomber hors de la fenêtre ±8 j et son T0 refusé **alors
qu'aucune donnée ne manque** — un refus qui ne protège de rien. La précondition
cherche la dernière passation de chaque instrument du rideau, sans contrainte
de date ; la fenêtre continue de gouverner la **composition** de l'épisode, qui
est un autre objet. `TOLERANCE_JOURS_JALON` et `JOURS_JALON` ne sont pas
touchés.

**4. La fraîcheur de la synthèse se juge sur le rideau et sur la validation.**
La synthèse doit être `Validee_Praticien` ou `Corrigee_Praticien` et sa
`dateValidation` postérieure à la dernière passation **du rideau**, pas du
dossier : une passation hors rideau, plus récente, ne périme pas une synthèse
qui n'avait pas à en tenir compte. `Corrigee_Praticien` **ne rafraîchit pas**
`dateValidation` — comportement existant, non modifié ici : une annotation
commente une synthèse, elle ne la re-valide pas.

- Conditions **souples** : contournables, avec motif obligatoire, tracées dans
  le payload d'épisode. `preconditionOverrides` porte la condition, le motif,
  l'auteur et l'horodatage, **posés par le serveur** à la confirmation.
  L'épisode transitant ensuite par le navigateur, les deux points de
  persistance les **recoupent champ par champ** contre la session : un
  contournement dont l'auteur n'est pas celui de la session, dont la date n'est
  pas une date, ou dont la condition n'est pas réellement en défaut, est refusé
  en 422. Ils vérifient plutôt qu'ils ne réécrivent — réécrire ferait diverger
  l'épisode de celui qui a été haché dans `snapshot.inputHash`.
- **La porte ne se désactive pas en déclarant un autre jalon.** Le jalon est
  dérivé du suffixe de `assessmentEpisodeId` quand il est dérivable, et le
  champ `milestone` du corps de requête ne fait foi qu'à défaut. Sans cela,
  déclarer `J21` sur l'identifiant du T0 ouvrait la porte — et l'écriture étant
  un `upsert(..., update: {})`, l'identifiant T0 du patient était squatté
  définitivement par une ligne de suivi.
- **La fraîcheur se juge sur la dernière synthèse VALIDÉE, pas sur la dernière
  ligne.** Chaque génération crée une ligne au statut `Brouillon_IA` :
  régénérer une synthèse pour la relire aurait bloqué le T0 d'un dossier qui en
  porte une validée, avec le message « Aucune synthèse validée par le
  praticien » — factuellement faux, et inexplicable au sens de `DC-34`.
- Écarté : **la condition souple « suggestions d'orientation ni renseignées ni
  écartées »**, retirée du lot. « Écartée » n'existe nulle part : les deux
  seules notions de rejet du dépôt (`FilCardRejection`,
  `PackProposition.declinee`) désignent autre chose, et la créer demanderait une
  persistance nouvelle donc une migration, que ce lot s'interdit. La livrer
  dégradée en « des suggestions restent non renseignées » aurait produit un
  avertissement **non acquittable**, donc affiché à chaque T0 — un avertissement
  qu'on ne peut pas éteindre est un avertissement qu'on apprend à ignorer.
- Assumé, et nommé plutôt que masqué : les deux conditions souples conservées
  (`AMBIGUOUS` sur le rideau, contradictions ouvertes) sont **muettes
  aujourd'hui** — la première parce qu'aucune passation ne peut porter
  `AMBIGUOUS` drapeau éteint, la seconde parce que `contradictionsActives()`
  est faux tant que la table n'est pas signée. Elles sont câblées et prouvées
  par bancs pour que le chemin existe le jour de l'allumage ; prétendre
  qu'elles protègent quelque chose en production serait faux.
- **Impact mesuré sur le parc avant merge**, parce qu'une porte qui fermerait
  tout serait une régression et non une garde : au 2026-08-12, sur 19 patients
  de production, **10 portent le rideau complet et une anamnèse validée avec
  motif, et 8 satisfont les trois conditions dures** (les 2 autres échouent sur
  la fraîcheur de la synthèse). La mesure porte sur la présence des passations,
  pas sur leur cotabilité — elle majore donc légèrement.
- Réserve nommée : cette décision **ne rend pas le T0 corrigible**. Elle durcit
  une porte à sens unique, et un T0 confirmé par contournement le reste. La
  correction ou ré-ouverture d'un T0 confirmé est hors périmètre du lot et reste
  sans lot d'accueil.
- Réversibilité : les conditions vivent dans un module pur
  (`preconditionsT0.ts`) et leurs refus sont trois appels dans les routes ; les
  retirer rétablit le comportement antérieur. Les bancs du module et les trois
  bancs de route le signaleraient.
- Référence : `web/src/lib/clinical-engine/preconditionsT0.ts`,
  `web/src/app/api/praticien/cockpit/route.ts`,
  `web/src/app/api/praticien/protocoles/route.ts`,
  `web/src/app/api/praticien/protocoles/versions/route.ts`,
  `docs/claude/campagnes/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/lots/LOT-02-preconditions-t0.md`,
  [[D-051]]

### D-051 — Le repère de passation courante s'abstient sur un identifiant qui a désigné plusieurs instruments

- Date : 2026-08-12
- Statut : accepté (décision utilisateur du 2026-08-12)
- Domaine : clinique, synthèse IA, catalogue de questionnaires
- Contexte : `Q_ALI_01` résout vers **deux questionnaires distincts** selon
  `WN_ALI_01_SIIN57` — le dépistage court à 14 items (total /42) ou l'Enquête
  alimentaire SIIN à 57 items (total /90) — sous un identifiant unique
  (`web/src/lib/questionnaires/alimentaire.ts`). Ce ne sont pas deux versions
  d'un même instrument : le banc de certification a comparé les libellés
  position par position et trouve des similarités de 0,00 à 0,33. Les 8
  passations en production portent la forme courte. Le repère
  `passationCourante`, livré à l'étape 6 du LOT-01, répond « laquelle fait foi »
  en groupant par `idQuestionnaire` : à l'allumage du drapeau, une passation sur
  90 aurait été présentée au modèle comme l'état actuel à la place d'une
  passation sur 42, et l'écart de total se serait lu comme une évolution
  clinique. **Le défaut est antérieur à ce lot et latent** ; c'est le repère qui
  l'aurait rendu actif.
- Décision : sur un identifiant listé comme ayant désigné plusieurs instruments,
  **aucune passation ne porte le repère dès qu'il en existe au moins deux
  EXPLOITABLES**, et chaque ligne concernée porte le motif de l'abstention
  (`formeInstrumentAmbigue`) — consigne `synthese-v24` à la date de cette
  décision, portée à `synthese-v25` le même jour par [[D-053]] (l'extinction
  d'orientation), sans que le fond de cette section change.
- **Marquer, pas taire** — et c'est le cœur de la décision. Retirer le repère
  sans rien dire aurait été lu par le modèle comme le cas « aucune passation
  exploitable » que la consigne décrit déjà : un motif faux à la place d'un
  motif vrai, c'est-à-dire une dimension mesurée présentée comme non mesurée.
  Le motif arrive donc comme une DONNÉE, au patron d'`ecarteeDuRaisonnement`
  ([[D-048]], contre-revue).
- **Seuil à deux passations, pas une.** Avec une seule, il n'y a rien à
  départager et le repère reste vrai ; s'en abstenir coûterait un repère juste.
- **Indépendant du drapeau, délibérément.** Le risque naît de la coexistence de
  passations des deux époques dans un même dossier — un état que le drapeau
  éteint n'exclut plus une fois qu'il a été allumé une fois.
- Écarté : **déduire la forme de chaque passation depuis ses identifiants
  d'items** (`AL1`…`AL14` pour la forme courte). Plus fin, mais cela ferait
  dépendre un repère clinique d'une heuristique sur des clés de réponses brutes ;
  tant qu'aucun dossier ne mélange les deux formes, la précision gagnée est nulle
  et le risque de se tromper, réel.
- Écarté : **abstention systématique sur `Q_ALI_01`**, passation unique comprise
  — voir le seuil ci-dessus.
- Écarté : **renvoyer le sujet à un lot dédié.** Le repère est livré par ce lot ;
  laisser sortir la capacité qui rend le défaut actif en le nommant seulement au
  handoff aurait été le publier en connaissance de cause.
- Réserve nommée : cette décision **ne répare pas** le fond — un identifiant qui
  désigne deux instruments reste une ambiguïté du catalogue. Elle empêche un
  raisonnement faux, elle ne rend pas les deux formes comparables. `DC-25` :
  données insuffisantes ⇒ réduire la conclusion, jamais l'inventer.
- Portée : le repère de la synthèse IA **seulement**. L'orientation et les
  contradictions passent par la même `derniereReponseParQuestionnaire` et ne
  sont pas corrigées ici. **Elles ne sont pas exposées pour autant, et le motif
  n'est pas celui qu'une première rédaction avait écrit** — `R2-ALI-01` est
  publiée et cible bien `Q_ALI_01` (`orientationRulesV1.ts`), l'affirmation
  inverse était fausse. Ce qui protège est une garde nommée, et elle nomme ce
  cas précis : le recalcul à la lecture passe par `calculateScore`, qui rend
  `scored: false, total: null, interpretation: null` dès qu'aucune réponse ne
  correspond aux items de la définition servie — « c'est le cas des 8 passations
  de la forme courte à 14 items (clés `AL1`–`AL14`), qui ne partagent aucun
  identifiant avec les 57 items » (`web/src/lib/questions.ts`). Une passation de
  la mauvaise époque ne peut donc pas déclencher `R2-ALI-01`, dont le
  déclencheur porte sur l'interprétation. La garde tient dans les deux sens.
- Ce que cette protection ne couvre pas, et qui reste ouvert : elle éteint la
  passation d'une autre forme, elle ne la distingue pas d'une passation
  simplement non cotable. Un moteur qui, demain, déclencherait sur autre chose
  que l'interprétation — un nombre de passations, une date — retrouverait le
  piège intact. Porté au handoff.
- Réversibilité : retirer l'entrée de `INSTRUMENTS_A_FORME_VARIABLE` suffit à
  rétablir le comportement antérieur, et **trois des cinq bancs** du bloc
  « identifiant qui a désigné plusieurs instruments » le signaleraient — mesuré,
  pas supposé : « aucun repère », « l'abstention est locale » et « l'abstention
  vient d'une constante ». Les deux autres (passation unique, paire dont l'une
  est écartée) passent aussi sans la garde : ce sont des témoins, pas des
  gardes. **Le couple version/empreinte ne le verrait pas non plus** — le texte
  de la consigne serait inchangé, et décrirait alors un champ que plus personne
  n'émet.
- Référence : `web/src/lib/questionnaires/alimentaire.ts`,
  `web/src/app/api/praticien/synthese/route.ts`,
  `web/src/app/api/praticien/synthese/passationCourante.test.ts`, [[D-048]]

### D-050 — L'injection cockpit des contradictions : un modèle d'affichage, et un câblage réel

- Date : 2026-08-12
- Statut : accepté (décision utilisateur du 2026-08-12). **Ferme la réserve
  « le câblage relève d'un lot suivant » de [[D-048]] et complète la conséquence
  de conversion de [[D-044]]**, le reste de ces deux entrées étant intact. En
  particulier, [[D-048]] écrivait que « la protection effective aujourd'hui
  reste l'absence d'appelant autant que le verrou » : ce n'est plus vrai, il ne
  reste que le double verrou — et il suffit, la table n'étant pas signée.
- Domaine : clinique, restitution praticien, architecture
- Contexte : [[D-044]] écrit « conséquence : l'injection cockpit convertit »
  **sans nommer de cible**, après avoir posé que le moteur ne réutilise pas
  `DiscordanceFinding` et pourquoi (`confidence: QualitativeConfidence`, que le
  garde de [[D-041]] interdit). La cible restait donc à choisir, et le choix
  n'était pas libre : `QualitativeConfidence` ne propose que `solide`,
  `probable`, `fragile`, `à_documenter` — **aucune valeur ne dit « non
  applicable »**. Toute cible héritant de `ClinicalFindingBase` obligerait à
  inventer un degré de certitude. Par ailleurs, [[D-048]] a livré la capacité
  d'affichage **sans site d'appel** : le critère de sortie du LOT-01 sur
  l'injection cockpit n'était pas tenu, et l'entrée le disait.
- Décision, premier volet : **la conversion a lieu vers un modèle d'AFFICHAGE**
  (`ContradictionAffichee`), qui ne porte aucun champ de certitude, de
  probabilité, de score ou de confiance. `DiscordanceFinding` reste en place,
  inchangé, et ce moteur ne l'emprunte pas. Cette entrée **complète [[D-044]]**
  — elle ne l'amende pas : [[D-044]] avait laissé la cible ouverte, elle est
  nommée ici. Une première rédaction de cette entrée prétendait le contraire et
  corrigeait une prescription que [[D-044]] n'a jamais portée.
- Décision, second volet : **le câblage est fait dans ce lot**. Une étape nommée
  « injection cockpit » qui ne livre aucun site d'appel livre un composant que
  personne n'appelle. `POST /api/praticien/cockpit` rend désormais les constats
  à côté de `review`, et `ClinicalRuntimeSection` les passe au panneau. **Le
  critère de sortie du LOT-01 sur le PANNEAU cockpit est donc tenu**, et la
  réserve ouverte par [[D-048]] sur ce point est refermée.
- **L'étape 5 avait deux volets, et le second reste ouvert.** La spec décrit
  « injection vigilances **et** cockpit » : les constats déterministes
  n'alimentent pas `vigilanceDeterministe` de la route de synthèse, qui ne vient
  toujours que de l'anamnèse. Dit ici plutôt que laissé croire — l'étape n'est
  pas close, sa moitié cockpit l'est.
- **Rien ne s'allume pour autant.** Le double verrou fail-closed est appliqué
  dans le service — drapeau `WN_ENABLE_CONTRADICTIONS_NNPP2` **et** signature
  clinique de la table —, et la table est livrée **non signée** : la liste est
  vide quel que soit le drapeau. Le verrou est franchi **avant toute lecture du
  dossier** ; un banc épingle qu'aucune requête ne part verrou fermé.
- **Le recalcul depuis `rawAnswers` est partagé, pas recopié.** L'en-tête de
  `contradictionsEngine.ts` en fait une obligation de l'appelant ; l'appelant
  réutilise `scoresRecalculesPourRaisonnement` d'`orientationService` plutôt que
  d'en dupliquer les cinq motifs de mise à `null`. Une fermeture clinique
  recopiée dans deux services est une fermeture qu'on peut oublier de corriger
  dans l'un des deux. La fonction a perdu « Orientation » de son nom à cette
  occasion — il désignait son seul consommateur d'alors, pas ce qu'elle fait.
- Écarté : **étendre `QualitativeConfidence` d'une valeur « non applicable »**.
  Cela aurait ouvert le champ de certitude à tous les producteurs existants de
  `DiscordanceFinding` pour le confort d'un seul consommateur, et fait dépendre
  un garde clinique de la discipline de chaque appelant.
- Écarté : **laisser la cible de conversion dans le seul fragment `changelog.d/`
  et un commentaire de code.** Le lecteur de [[D-044]] serait resté devant une
  conversion sans destination, au moment précis où il en cherche une ; le
  changelog est un journal, il ne se relit pas comme le registre.
- **Périmètre différent de `review`, nommé plutôt que supposé** :
  `snapshot`/`review` sont calculés sur les réponses **incluses dans l'épisode
  T0 confirmé**, alors que les contradictions sont évaluées sur le **dossier
  entier**. Un constat peut donc reposer sur une passation laissée hors de
  l'épisode ; ses passations sont datées à l'écran, ce qui rend l'écart lisible.
  Réduire le moteur au périmètre de l'épisode est un arbitrage clinique qui
  **n'a pas été rendu** — il est porté au handoff.
- **Une passation écartée ne peut pas fonder un constat, drapeau ou pas — et sa
  ligne reste.** Le motif de validité du recalcul partagé est gaté par
  `WN_ENABLE_VALIDITE_PASSATIONS`, éteint en production : l'appelant applique
  donc le prédicat sans drapeau `statutExcluDuRaisonnement` pour **nuller le
  score**, jamais pour retirer la ligne. Le geste est celui
  d'`orientationService`, et pour sa raison : retirer la ligne ferait de la
  passation ANTÉRIEURE « la dernière », c'est-à-dire un repli sur une mesure que
  le praticien n'a pas invalidée mais qu'il n'a pas non plus désignée. Un
  praticien qui invalide attend une re-passation ; l'instrument s'éteint, il ne
  recule pas dans le temps. Une première rédaction de ce lot filtrait, ce qui
  violait de surcroît le contrat écrit du prédicat (« à n'utiliser que pour
  DÉSIGNER, jamais pour FILTRER »).
- Écarté : **renvoyer le câblage au lot suivant.** Trois lignes de liaison ne
  justifient pas un lot, et un critère de sortie non tenu qui traverse une
  clôture devient un critère qu'on oublie.
- Réversibilité : le champ `contradictions` de la réponse cockpit et la liaison
  du composant ; le verrou reste fermé dans tous les cas.
- Référence : `web/src/lib/clinical/contradictionsService.ts`,
  `web/src/app/api/praticien/cockpit/route.ts`,
  `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx`, [[D-041]],
  [[D-044]], [[D-048]]

### D-049 — Le CI fait autorité sur le palier E2E tant que le blocage navigateur local dure

- Date : 2026-08-12
- Statut : accepté (décision utilisateur du 2026-08-12)
- Domaine : validation, gouvernance des PR
- Contexte : depuis le 2026-08-11, la séquence complète locale
  (`npm run test:worktree`) échoue à répétition sur **un seul test par run,
  jamais le même**, dans `web/e2e/visual.spec.ts`, projet iPhone 13 (WebKit)
  uniquement : `page.goto` expire à 120 s pendant que ses voisines immédiates
  restent sous la seconde. Six runs, quatre blocages. La trace Playwright donne
  `0-trace.network` **vide** — aucune requête HTTP n'est jamais partie, le
  serveur n'a jamais été sollicité. La cause est dans le processus navigateur,
  hors de ce dépôt, et n'est pas identifiée. Preuve d'attribution close le
  2026-08-12 : le blocage s'est reproduit sur une branche d'outillage ne
  contenant aucune ligne de code applicatif. Jamais observé en CI (Linux).
- Décision : tant que ce blocage dure, **le CI tient lieu de palier E2E** pour
  les PR de classe migration/scoring/clinique, là où `CLAUDE.md` exigeait T3
  local.
- **Périmètre exact — seul le segment E2E bascule.** T3 local reste exigé, et
  reste joué, pour les contrats SQL (`web/prisma/checks/`), la dérive
  schéma↔migrations, la certification scoring et la suite unitaire complète.
  Cette décision ne dispense d'aucun de ces contrôles.
- **Condition de sortie, nommée** : le blocage cesse d'être observé sur deux
  séquences complètes consécutives, **ou** une cause racine est identifiée.
  L'un ou l'autre referme cette décision et rétablit `CLAUDE.md` à l'identique.
- Ce que cette décision **ne fait pas** : elle n'autorise pas à rejouer une
  suite jusqu'au vert, ni à ajouter des `retries` à Playwright — un réessai
  transformerait ce blocage en succès silencieux et emporterait avec lui les
  vrais échecs intermittents.
- Garde-fou associé : `scripts/wn-diagnostic-e2e.mjs` classe automatiquement
  cet échec (« `page.goto` expiré, et AUCUNE requête HTTP émise ») et rappelle
  dans son message que la séquence **reste rouge**. Sans ce classement, un
  blocage navigateur se lit comme une régression du code en cours — c'est
  arrivé trois fois en deux jours.
- Écarté : **instruire la cause racine avant de décider** — la navigation
  n'atteint jamais le réseau, l'instruction sort donc du dépôt et entre dans
  WebKit/Playwright, pour un coût sans terme prévisible pendant que le LOT-01
  reste bloqué.
- Écarté : **monter Playwright 1.61.1 → 1.62.1** — rien ne relie ce blocage à
  un correctif amont ; monter sur une supposition ne se distingue pas d'un
  tirage au sort.
- Réversibilité : une ligne de `CLAUDE.md` et cette entrée.
- Référence : `scripts/wn-diagnostic-e2e.mjs`, PR #662,
  `docs/claude/handoffs/2026-08-12-0546-diagnostic-blocage-navigateur-e2e.md`

### D-048 — Les trois arbitrages cliniques du LOT-01 (importance de C-STR, fenêtre temporelle, cohabitation à l'écran)

- Date : 2026-08-12
- Statut : accepté (décision utilisateur du 2026-08-12)
- Domaine : clinique, moteur de contradictions, restitution praticien
- Contexte : [[D-046]] a livré la table de contradictions v1 avec une seule
  règle publiée, C-STR, et a laissé trois points que le code ne pouvait pas
  trancher. Les étapes 3 et 5 du LOT-01 en dépendaient. Ils sont rendus
  ensemble parce qu'ils se tiennent : les deux derniers portent tous deux sur
  ce que le praticien voit.
- **1. `importance` de C-STR reste `useful_not_urgent`, et sa justification est
  écrite.** La valeur était posée **nue** dans `contradictionsV1.ts` — aucun
  commentaire, absente de [[D-041]], [[D-042]] et [[D-046]], absente du dossier
  de règles candidates. Le défaut était l'absence de motif, pas la valeur : la
  règle prescrit elle-même « à clarifier en entretien », ce qui est actionnable
  sans être urgent.
  - Écarté : **`critical_for_decision`** — le libellé servi au praticien est
    « Critique pour décider » (`MissingDataPanel.tsx`), et C-STR ne bloque
    aucune décision : elle demande une clarification en entretien. `DC-23` ne
    *réserve* aucun niveau — rédaction corrigée après revue, elle disait le
    contraire — mais elle pose que les red flags restent prioritaires sans se
    compenser avec aucun score ; hisser au niveau le plus haut un constat qui
    n'est pas un signal de sécurité ([[D-046]]) brouillerait cette hiérarchie.
  - Écarté : **`optional`** — contredirait la clarification en entretien que la
    règle prescrit.
  - Conséquence : la valeur ne change pas, donc `CONTRADICTIONS_RULES_SHA256`
    non plus. Seul un commentaire s'ajoute.
  - Réserve nommée : `DC-33` confie la hiérarchisation praticien (priorité 1,
    2, 3) au **LOT-04**. Cette décision ne l'anticipe pas ; elle donne au champ
    la valeur juste, elle n'invente pas de classement.
- **2. Aucune fenêtre temporelle. Le constat porte l'écart.** Le constat est
  émis quel que soit l'écart entre les deux passations comparées, et il porte
  le nombre de jours qui les sépare — ce qui rend vérifiable la troisième
  hypothèse explicative de C-STR (« une passation du DASS-21 antérieure ou
  postérieure à l'épisode que l'axe d'adaptation reflète »).
  - Écarté : **un seuil au-delà duquel on n'émet plus** — aucune source
    publiée ne donne de durée de validité croisée entre `Q_MOD_01` et le
    DASS-21. `DC-19` nomme explicitement les « fenêtres temporelles » parmi les
    chiffres exigeant une provenance, et `DC-30` interdit de supprimer une
    discordance en silence : taire un constat parce qu'il est « vieux » est
    exactement ce qu'elle proscrit.
  - Écarté : **un seuil déclaré `technical` au sens de `DC-20`** — un seuil
    d'ingénierie qui éteint un constat clinique est la confusion même que
    `DC-19` et `DC-20` existent pour empêcher.
  - **Un fait à corriger au passage** : le comportement n'était pas seulement
    ouvert, il était figé par accident. `contradictionsEngine.test.ts:137-146`
    produit un constat entre deux passations distantes de **40 jours** (et non
    six semaines, comme deux handoffs l'ont écrit), mais ce banc documente la
    limite de la garde de complétude — l'écart de dates y est un effet de bord
    **non commenté**. Il est ramené au même jour, et un cas temporel délibéré
    est écrit à côté.
  - Garde : l'écart est un **fait sur les données**, jamais un degré de vérité.
    Le garde non négociable de [[D-041]] interdit tout champ de certitude, de
    probabilité, de score ou de confiance « sous quelque nom que ce soit » ; un
    banc épingle que l'écart n'est lu par aucun tri, aucun seuil, aucun
    branchement.
  - Absence : une source unique donne un écart **`null`**, jamais `0` —
    `DC-24`, une donnée absente n'est ni zéro ni normale.
- **3. Le constat affiche sa justification de recoupement avec `R2-STR-01`.**
  Le champ `recoupementJustifie` existe déjà dans la règle, gardé par un banc,
  et **n'est lu par personne**. Il devient ce que le praticien lit quand les
  deux sorties coexistent — ce que son propre commentaire exige déjà : « deux
  sorties simultanées à l'écran doivent être défendables ». Cette phrase est
  celle du commentaire de `contradictionsV1.ts`, **pas** de la constitution :
  `DC-37` (« un questionnaire redondant ne s'assigne pas ») y est au statut
  **proposition**, et cette décision ne la rend pas opposable — elle en applique
  l'esprit à une sortie d'écran, ce que `DC-37` ne couvre pas littéralement.
  - Rappel de ce qui était déjà tranché par [[D-042]] : la coexistence est
    **voulue**. `R2-STR-01` (règle d'orientation de premier tour,
    `ADAPTATION_STRESS <= 17`) propose une **mesure**, le PSS-10 ; C-STR nomme
    une **contradiction** entre deux mesures déjà faites. La population de
    C-STR est un sous-ensemble de celle de `R2-STR-01`.
  - Écarté : **fusionner les deux sorties en une seule entrée d'écran** — on
    perdrait soit l'instrument à administrer, soit le signal que les
    instruments existants se contredisent.
  - Écarté : **renvoyer le traitement d'écran au LOT-04** — le texte existe
    déjà dans la règle ; l'afficher ne demande aucun arbitrage de
    hiérarchisation et n'empiète donc pas sur `DC-33`.
- Ce que ces trois décisions **n'allument pas** : la table reste **non signée**
  (`validationExterne: false`). La CAPACITÉ d'affichage part derrière un double
  verrou — drapeau d'environnement **et** signature clinique —, au patron de
  `orientationActive()`. Rien de ce lot n'atteint un praticien.
- **Ce lot ne CÂBLE pas l'injection**, et la formulation initiale de cette
  entrée le laissait croire : aucun site d'appel ne passe de constats au
  panneau. Ce qui est livré est la capacité — moteur, verrou, conversion,
  composant — et sa protection effective aujourd'hui reste l'absence d'appelant
  autant que le verrou. Le câblage relève d'un lot suivant, et le critère de
  sortie correspondant du LOT-01 n'est donc **pas tenu** ; il est nommé ici
  plutôt que passé sous silence, au patron de [[D-044]] point 2.
- Réversibilité : un commentaire, deux champs, une conversion et un bloc
  d'affichage sans appelant. Aucun schéma de base.
- Référence : `web/src/lib/clinical/contradictionsV1.ts`,
  `web/src/lib/clinical/contradictionFinding.ts`,
  `web/src/lib/clinical/contradictionsEngine.ts`,
  `web/src/lib/clinical/orientationRulesV1.ts` (`R2-STR-01`), [[D-041]],
  [[D-042]], [[D-044]], [[D-046]]

### D-047 — Réponse écrite de Scalingo (2026-08-11) : (b) est levée, (a) était mal requalifiée par D-037 et reste ouverte

- Date : 2026-08-11
- Statut : accepté (décision du **responsable de traitement** du 2026-08-11)
- Domaine : architecture, hébergement et conformité (HDS, RGPD)
- Contexte : réponse écrite de Scalingo au ticket ouvert le 2026-08-09
  ([[D-037]]), reçue par courriel (Jennifer, Scalingo) le 2026-08-11,
  consignée dans `docs/DOSSIER_RGPD.md` §6.
- Décision : deux arbitrages sur les conditions dures de [[D-006]], relevées
  par [[D-037]], pris ensemble.
  1. **(b) périmètre HDS de la région — LEVÉE.** Scalingo confirme par écrit
     que les ressources créées avec `--hds-resource` en `osc-fr1`
     (application, add-on PostgreSQL, ses sauvegardes) sont couvertes par le
     certificat LNE n° 38436-2, pour les six activités du référentiel dont la
     5 (administration et exploitation) et la 6 (sauvegardes externalisées).
     C'est exactement la pièce que [[D-037]] attendait du ticket.
  2. **(a) DPA — la requalification de [[D-037]] était fausse ; la condition
     reste ouverte, autrement caractérisée.** [[D-037]] posait que l'accord de
     sous-traitance vivait dans les documents généraux acceptés à la
     souscription, et qu'« il n'y a donc pas d'e-signature à obtenir » — sous
     réserve explicite de confirmation du fournisseur, jamais obtenue avant ce
     jour. Scalingo répond l'inverse, sans ambiguïté : l'accord se compose du
     DPA et d'une **annexe HDS distincte**, et « l'acceptation des conditions
     générales seule ne suffit pas » à activer l'option HDS — l'annexe se
     signe séparément. (a) n'est donc pas seulement non accomplie comme le
     disait [[D-037]] : elle était **mal caractérisée**. Ce qui reste à faire
     n'est plus d'archiver une pièce déjà acceptée, mais d'**obtenir et signer
     l'annexe HDS**, puis d'archiver le DPA et cette annexe signée.
- Ce que cette décision **ne fait pas** : elle n'ouvre pas la migration des
  données réelles. L'ordre imposé de [[D-006]] tient intégralement — aucun
  patient réel sur Scalingo avant que (a) soit **effectivement** levée
  (signature et archivage faits, pas seulement caractérisés).
- État réel des deux conditions dures de [[D-006]] après cette décision :
  - **(a) DPA + annexe HDS — ouverte.** Action restante : obtenir l'annexe HDS
    auprès de Scalingo (ticket existant ou `support@scalingo.com`), la signer,
    puis archiver le DPA et l'annexe signée au dossier.
  - **(b) périmètre HDS `osc-fr1` — levée.**
  - Les réserves (3), (4), (5) de [[D-006]] — inchangées, cf. [[D-037]].
- Réversibilité : une décision de registre se révoque par une décision de
  registre.
- Référence : `docs/DOSSIER_RGPD.md` §6, courriel Scalingo (Jennifer) du
  2026-08-11, [[D-037]], [[D-006]].

### D-046 — Un constat n'est pas une prescription : `prescriptif` est exigé des claims de l'orientation, pas de ceux des contradictions

- Date : 2026-08-11
- Statut : accepté (décision utilisateur du 2026-08-11, LOT-01 de la campagne `2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie`)
- Domaine : clinique, corpus de claims, contrat de lecture sur la production
- Contexte : l'écriture de C-STR bute sur une contradiction entre deux décisions du même jour. Le claim qui fonde exactement la règle est `WN-CL-0238-002` — « les symptômes de stress […] ne présentent pas de corrélation avec la gravité de la charge allostatique » —, `VALIDE`, actif, non remplacé, dans le périmètre orientation, mais **`prescriptif = false`**. Or [[D-044]] exige `prescriptif = true` de toute paire épinglée : l'épingler rendrait rouge le contrat de fraîcheur et **bloquerait toute release**.
- **Décision : la propriété `prescriptif` n'est exigée que des claims épinglés par une table qui PRESCRIT.** Le contrat porte désormais, pour chaque paire, la table qui l'épingle : quatre propriétés pour `orientation`, trois pour `contradictions` (`statut = 'VALIDE'`, `active = true`, pas de `superseded_at`).
- Motif : les quatre propriétés de [[D-044]] sont le jeu que la relecture du 2026-08-06 avait contrôlé **sur la table d'orientation**, dont chaque règle *suggère une exploration* — une prescription. Une règle de contradiction ne prescrit rien : elle **constate** que deux instruments ne disent pas la même chose, et ce constat se fonde sur un fait descriptif. Exiger `prescriptif` d'un claim descriptif est une erreur de catégorie, importée d'une table qui n'a pas le même objet.
  - La distinction est celle que `DC-30` porte déjà : une discordance **se signale**, elle ne se moyenne ni ne se supprime. Signaler n'est pas prescrire.
- Options écartées :
  - **Épingler des claims prescriptifs adjacents** — `WN-CL-0323-028` (« il est important d'associer des questionnaires évaluant les 3 pathologies ») et `WN-CL-0236-012` (« le choix des questionnaires doit reposer sur […] la perception clinique »). La règle serait publiable et le contrat vert, mais aucun des deux ne dit que les symptômes ne corrèlent pas à la charge : la justification serait un rapprochement que la source ne porte pas, exactement ce que `DC-14` interdit. Écarté — un contrat vert obtenu en tordant une source est pire que pas de contrat.
  - **Différer C-STR** (règle en `brouillon`, `justificationClaims` vide). Honnête, mais le lot livrerait une table sans règle et le contrat de fraîcheur n'aurait rien de neuf à garder — les deux livrables se videraient l'un l'autre.
  - **Retirer `prescriptif` du contrat pour toutes les tables.** Plus simple, et strictement moins protecteur : la table d'orientation prescrit des explorations, et la relecture du 2026-08-06 a vérifié cette propriété-là sur ses 23 claims. La perdre pour résoudre le cas d'une autre table serait payer la simplicité avec la garantie existante.
- Conséquence : le contrat cesse d'être une liste de paires pour devenir une liste de paires **qualifiées par leur table**. Le banc de couverture refuse une table inconnue plutôt que de lui appliquer un jeu de propriétés par défaut — un troisième moteur devra faire l'objet de son propre arbitrage, pas d'un héritage silencieux.
- Réversibilité : une colonne du contrat SQL, une correspondance dans le banc de couverture. Aucun schéma de base, aucune migration.
- Référence : `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql`, `web/src/lib/clinical/claimsEpinglesFraicheur.guard.test.ts`, `web/src/lib/clinical/contradictionsV1.ts`, `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md` (`DC-14`, `DC-30`), [[D-041]], [[D-042]], [[D-044]]

### D-045 — Le moteur de propositions de parcours ouvre avec quatre règles, chacune sur un signal exact, et la dysphagie n'y devient pas une vigilance

- Date : 2026-08-11
- Statut : accepté (décision utilisateur du 2026-08-11, LOT-03 de la campagne `2026-08-10-chaine-alimentaire`)
- Domaine : clinique, moteur de règles, parcours alimentaires, anamnèse
- Décision : publier **quatre règles de parcours, et elles seules**, à l'ouverture du moteur de propositions de parcours. Chacune est adossée à des claims `VALIDE` du corpus et à un signal **déjà capté**, sans appariement inventé. Le dossier de règles candidates (`DOSSIER_REGLES_LOT-03.md`, PR #654) en listait huit au §4.A ; l'arbitrage n'en retient que quatre.
  1. **`R-PARC-ALI-01` — assiette de détoxication.** Claim `WN-CL-0287-009`, condition verbatim « lorsque le score global de l'enquête alimentaire SiiN détaillée est défavorable ». Déclencheur `Q_ALI_01` en zone `{type:'interpretation'}`, citant **au caractère près** les deux bandes défavorables de la forme SIIN57 (`questionnaires/alimentaire.ts:312-313`) : « Alimentation déséquilibrée, ne contribuant pas au maintien du capital santé » et « Alimentation très déséquilibrée et défavorable ». La bande `info` (51-70, « plutôt équilibrée, mais insuffisamment protectrice ») reste **dehors**, comme `R2-ALI-01` l'a tranché le 2026-08-04. **Aucun claim neuf** : c'est la **seconde branche** de `WN-CL-0287-009`, celle que `R2-ALI-01` a dû abandonner faute de cible parcours (`orientationRulesV1.ts:1082-1084` — l'assiette de détoxication « n'est PAS un questionnaire »).
  2. **`R-PARC-ALI-02` — éviction du gluten / régime méditerranéen adapté.** Claims `WN-CL-0072-031`, `WN-CL-0076-018`, condition verbatim « en cas d'intolérance au gluten ». Déclencheur : drapeau `intolerancesAlimentaires` contenant « Gluten » (`consultation/drapeauxAnamnese.ts:27`, énuméré `anamnese.ts:179-182`).
  3. **`R-PARC-ALI-03` — régime à faible teneur en histamine.** Claims `WN-CL-0250-001`, `WN-CL-0251-011`, condition verbatim « chez les sujets présentant des symptômes d'intolérance à l'histamine ». Déclencheur : `intolerancesAlimentaires` contenant « Histamine ».
  4. **`R-PARC-ALI-04` — alimentation mixée.** Claims `WN-CL-0389-024`, `WN-CL-0386-008`, `WN-CL-0387-016`, condition verbatim « en cas de troubles de la déglutition ». Déclencheur : drapeau `symptomesFonctionnels` contenant « Difficultés à avaler / troubles de la déglutition » (`drapeauxAnamnese.ts:28`, énuméré `anamnese.ts:110-119`).
- Conséquences et bornes — **non négociables** :
  - **Jamais d'auto-assignation.** Le moteur **propose** ; le praticien lit, valide ou amende. Invariant repris du moteur d'orientation, il n'est pas rediscutable pour cette cible-ci.
  - **Une dysphagie récente et inexpliquée reste un motif d'adressage.** `R-PARC-ALI-04` propose une **texture à côté** de cet avis — elle ne l'éteint pas, ne le retarde pas et ne le remplace pas. En conséquence, `symptomes_fonctionnels` **reste hors `extraireVigilanceDeterministe`** (`consultation/contexteClinique.ts:159`) : porter la dysphagie en vigilance déterministe serait une **décision propre**, avec sa formulation et son banc, et elle n'est pas prise ici. L'avertissement déjà posé en commentaire d'`anamnese.ts` (« une règle qui la lit ne doit jamais court-circuiter cette vigilance ») est ainsi tenu par construction, pas par vigilance de relecture.
  - **Fail-closed ; `null`, jamais `0`.** Signal absent, non capté ou hors énuméré ⇒ la règle est **muette**, jamais « pas de parcours indiqué » ni une proposition par défaut. Une anamnèse sans le champ n'est pas une anamnèse sans intolérance (`DC-24`).
  - **Les anamnèses antérieures à #655 restent muettes.** La capture structurée des intolérances et de la déglutition date de la PR #655 ; **aucun rattrapage rétroactif** n'est fait ni autorisé. Les dossiers plus anciens ne déclenchent rien, et cela n'est pas un défaut à corriger par dérivation.
  - **Le texte libre n'est jamais un déclencheur.** Le champ `allergies` « Allergies et intolérances connues » (`anamnese.ts:173`) remonte au praticien en contexte, **jamais** au moteur — pas de correspondance textuelle, pas d'extraction, pas d'inférence.
  - **Rien de la biologie.** Le groupe B du dossier (§4.B — CRP, HOMA, ferritine, 25-OH-D…) reste **hors de ce moteur** : ces conditions sont des valeurs biologiques, non déductibles d'un questionnaire ou de l'agenda. Elles appartiennent au versant biologie-révision.
  - **Aucun des 16 claims porte-seuil n'est mobilisé.** Les quatre règles retenues sont toutes sans borne chiffrée ; la garde `rag_claim_porte_seuil` n'a donc rien à arbitrer dans cette ouverture, et aucun dosage ni durée ne transite par le moteur.
  - **`WN_ALI_01_SIIN57` est respecté par construction.** Citer les **bandes verbatim** de la forme SIIN57 — et non une couleur — fait que `R-PARC-ALI-01` **cesse d'elle-même de mordre** en forme COURT14, dont les libellés sont d'autres phrases. Pas de garde à maintenir ailleurs ; c'est la leçon de `R2-ALI-01` (`orientationRulesV1.ts:1021-1043`) appliquée à l'identique.
- Options écartées :
  - **Publier tout le groupe A** (les 7 parcours du §4.A). Écarté : l'assiette **psychobiotique** (`WN-CL-0291-014`) dépend de l'axe A5 de densité végétale, dont la calibration est gatée par la **porte des 21 jours** ; l'assiette **sérotoninergique** (`WN-CL-0341-025`, `WN-CL-0245-014`) demande un **appariement instrument→parcours non tranché**. Ouvrir large aurait fait entrer deux règles dont le déclencheur serait proposé ici plutôt que porté par le claim.
  - **Déclencher sur un antécédent adjacent, façon `R2-GAS-02`** — « Digestif (SII…) » pour le gluten, « Allergies / atopie » pour l'histamine. Écarté au profit du **signal exact capté en #655** : un antécédent voisin n'est pas l'intolérance que le claim nomme, et le raccourci aurait fait mordre les règles sur une population que la source ne couvre pas (`DC-14`).
  - **Lire le texte libre** des allergies pour rattraper les dossiers anciens : écarté, c'est une extraction inventée depuis de la prose.
  - **Porter la dysphagie en vigilance dans le même geste** : écarté — deux objets distincts, deux décisions distinctes (voir bornes).
- Réversibilité : la table de règles est versionnée et `statut`-gardée (**`publiee` seulement**) ; repasser une règle en `brouillon` ou `suspendue` la neutralise sans migration. Le moteur entier part derrière un **drapeau éteint**, et l'objet « proposition de parcours » voyage en **migration séparée** du code. `git revert` suffit sur la table.
- Référence : `docs/claude/campagnes/2026-08-10-chaine-alimentaire/DOSSIER_REGLES_LOT-03.md` (§4.A, §5, §6), `docs/claude/campagnes/2026-08-10-chaine-alimentaire/lots/LOT-03-moteur-propositions-parcours.md`, PR #654 (dossier de règles), PR #655 (capture des signaux déclarés), `web/src/lib/questionnaires/alimentaire.ts:309-314` (bandes SIIN57), `web/src/lib/clinical/orientationRulesV1.ts:1021-1084` (`R2-ALI-01`, branche perdue), `web/src/lib/consultation/drapeauxAnamnese.ts:27-28`, `web/src/lib/consultation/anamnese.ts:110-119` et `:173-182`, `web/src/lib/consultation/contexteClinique.ts:159`, [[D-030]], [[D-031]], [[D-033]], [[D-034]], [[D-043]]

### D-044 — Trois conséquences de la revue de clôture du LOT-01

- Date : 2026-08-11
- Statut : accepté (décision utilisateur du 2026-08-11, après revue `wn-reviewer` du dossier doctrinal)
- Domaine : clinique, types du moteur d'interprétation, critères de campagne, CI
- Contexte : la revue de clôture a trouvé trois écarts que ni [[D-041]] ni [[D-042]] n'avaient vus. Aucun n'est un désaccord clinique ; les trois sont tranchés ici pour que la première ligne de TypeScript du lot ne parte pas sur un contrat faux.
- **1. Le moteur définit son propre objet ; il ne réutilise pas `DiscordanceFinding`.** Le garde non négociable de [[D-041]] (« aucun champ de certitude, de probabilité, de score ou de confiance, sous quelque nom que ce soit ») est **déjà violé** par le type que la spec désignait : `DiscordanceFinding` hérite de `ClinicalFindingBase`, qui porte `confidence: QualitativeConfidence` (`clinical-engine/types.ts:184-186`), et `clinicalReview.ts:107` le valide à l'exécution. Le banc exigé par D-041 aurait échoué le premier jour.
  - Le moteur du LOT-01 porte donc un type propre, à trois formes, **sans aucun champ de cette famille**. `DiscordanceFinding` reste en place, inchangé et non utilisé par ce moteur.
  - Écarté : **retirer `confidence` de `ClinicalFindingBase`** — c'est le bon geste à terme, mais le socle est partagé avec `MissingDataFinding`, `SafetyFinding` et `DecisionPriorityCandidate` : refactor d'un type clinique partagé, donc son propre `D-xxx` et son propre lot.
  - Écarté : **amender le garde de D-041** pour tolérer une qualification qualitative de la donnée. La nuance « `confidence` qualifie la donnée, pas la conclusion » est exactement la confusion que `DC-29` existe pour empêcher ; la laisser vivre dans le type l'aurait rendue indéfendable en revue.
  - Conséquence : l'injection cockpit convertit ; c'est le coût assumé de la coexistence de deux familles de constats voisines.
- **2. Les critères de sortie du LOT-01 sont réduits, et l'écart est nommé.** Le critère 2 du Lot B (`sources/02-spec-lots-parcours-t0.md:119-122`) exige que la sortie « porte les deux vigilances C-STR et C-SOM » ; [[D-042]] le rend inatteignable. La fiche revendique désormais les critères **3 et 4 intégralement**, le critère **1 en partie** (mélatonine non suggérée : tenu ; contradiction de sommeil produite : non tenu) et déclare le critère **2 non tenu**, motif D-042.
  - Écarté : **amender la spec** dans `sources/`. Ces documents sont l'original de la campagne ; les réécrire fait perdre la trace de ce qui avait été demandé. Un écart nommé dans la fiche est relisible, une spec retouchée ne l'est plus.
- **3. Le contrat de fraîcheur des claims part sur un déclencheur CI étendu.** `release-db` ne se déclenche automatiquement que sur un `push` vers `main` touchant `web/prisma/migrations/**` (`.github/workflows/release-db.yml:24-27`), et D-042 exclut toute migration : le contrat, tel que D-042 le décrivait, n'aurait jamais démarré seul. `paths` est donc étendu à `web/src/lib/clinical/**`, de sorte que toute modification d'une table signée rejoue les contrats de lecture sur la production.
  - **Cette modification ne voyage pas dans la PR documentaire** : elle élargit ce qui déclenche un accès à la base de production et appelle sa propre revue. Elle part avec le code du LOT-01.
  - Le précédent est nommé : [[D-015]] avait déjà promis un rejeu production pour `agenda_alimentaire_v1.sql` — il n'a jamais été câblé. Un déclencheur automatique évite de répéter la promesse.
  - Le banc contrôle la paire `(claim_id, version_claim)`, et **quatre** propriétés, non trois : `statut = 'VALIDE'`, `active = true`, absence de `superseded_at`, et `prescriptif = true` — c'est le jeu que la relecture du 2026-08-06 avait effectivement contrôlé (`orientationRulesV1.ts:1403-1408`). Une contrepartie négative accompagne le contrat, au patron de `packs_registre_coherence_v1_negatif.sql`.
- Réversibilité : un type neuf, un paragraphe de critères, quatre lignes de workflow. Aucun schéma de base.
- Référence : `web/src/lib/clinical-engine/types.ts:184-215`, `web/src/lib/clinical-engine/clinicalReview.ts:107`, `.github/workflows/release-db.yml:24-27`, `web/src/lib/clinical/orientationRulesV1.ts:1403-1408`, [[D-015]], [[D-018]], [[D-041]], [[D-042]]

### D-043 — L'extrait permanent de `CLAUDE.md` est opposable ; neuf règles basculent à « acté », la dette de bancs est nommée

- Date : 2026-08-11
- Statut : accepté (décision utilisateur du 2026-08-11)
- Domaine : gouvernance clinique, doctrine, contexte permanent des agents
- Contexte : l'extrait permanent ajouté à `CLAUDE.md` déclare « ces règles valent », alors que onze des `DC-nn` qu'il citait portaient le statut **proposition** — que `docs/claude/doctrine/README.md` définit comme « informe une revue, ne la tranche pas ». Le lot court-circuitait le mécanisme de statut qu'il venait de créer.
- **Décision : les règles de l'extrait sont opposables.** Neuf basculent à **acté** dans `CONSTITUTION_CLINIQUE.md` : `DC-12`, `DC-14`, `DC-17`, `DC-20`, `DC-23`, `DC-27`, `DC-30`, `DC-34`, `DC-35`.
- **Ce que « acté » signifie ici, et ce qu'il ne signifie pas.** Ces règles sont opposables **en revue et à tout agent** : une PR qui les enfreint est refusable en citant la règle. Elles ne sont **pas** pour autant tenues à l'exécution — aucune n'est encore gardée par un banc. Chaque statut le dit sur place (« **Banc dû** : la règle ne mord pas encore à l'exécution »), et c'est la dette que ce lot reconnaît plutôt que de la laisser invisible.
  - La distinction est nécessaire : l'acte d'intégration défini par l'audit (décision + banc + bascule du statut) vise les règles qui doivent mordre **dans le code**. Une règle de conduite peut lier une revue avant que son banc existe ; la confusion des deux aurait rendu l'extrait permanent inutilisable pendant des mois.
- **`DC-29`, `DC-54` et `DC-55` restent « proposition »** — [[D-041]] le réserve explicitement tant que le banc qui les fait mordre n'existe pas, et une décision de gouvernance ne défait pas une réserve clinique nommée. En conséquence, la puce « conflit non résolu ⇒ escalade praticien » de `CLAUDE.md` est requalifiée : elle est signalée comme non encore opposable, au lieu d'être présentée comme une règle qui vaut.
- Options écartées :
  - **Restreindre l'extrait aux règles déjà actées** : cohérent, mais il perdait ses règles les plus utiles au quotidien (`DC-27` association ≠ causalité, `DC-30` discordance, `DC-20` seuil clinique ≠ technique) — c'est-à-dire précisément celles qu'un agent enfreint sans s'en apercevoir.
  - **Retirer l'extrait de `CLAUDE.md`** : le contexte permanent restait court, mais plus rien ne rappelait la doctrine hors des chemins cliniques, où le rappel arrive trop tard.
- Réversibilité : neuf lignes de statut et une section de `CLAUDE.md`. Aucun code.
- Référence : `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md`, `docs/claude/doctrine/README.md`, `docs/claude/doctrine/AUDIT_DOCTRINE_CHAINE_T0.md` (« L'acte d'intégration lui-même »), `CLAUDE.md`, [[D-041]]

### D-042 — La table de discordances V1 part avec une seule règle, et un banc de fraîcheur garde les claims épinglés

- Date : 2026-08-11
- Statut : accepté (décision utilisateur du 2026-08-11, LOT-01 de la campagne `2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie`)
- Domaine : clinique, moteur de discordances, corpus de claims
- Contexte : la descente prédicat par prédicat des trois règles de la spec (`DOSSIER_REGLES_LOT-01.md`) a établi qu'elles ne sont pas dans le même état. Les trois arbitrages sont tranchés ensemble ici.
- **C-STR — retenue, seuil `≤ 8`.** Déclencheurs : `ADAPTATION_STRESS ≤ 8` (`Q_MOD_01`) **et** DASS-21 dans la bande « Normal » sur dépression (`D ≤ 4`) et stress (`S ≤ 7`). Aucun de ces trois chiffres n'est arbitré : `≤ 8` est exactement la bande « Adaptation perturbée » de l'axe (bandes 0-8 / 10-17 / 18-24, `orientationRulesV1.ts:676-682`), `D ≤ 4` et `S ≤ 7` sont les bandes publiées du DASS-21 (`questions.ts:157-159`). `DC-19` est tenue sans réserve.
  - **Le trou à 9 est laissé ouvert, délibérément.** Les bandes de l'axe ne couvrent pas la valeur 9. Étendre à `≤ 9` aurait fermé le trou au prix d'un point sans source. Le patient à 9 n'est pas laissé sans rien : `R2-STR-01` le couvre déjà (`≤ 17`) et lui propose le PSS-10 — il perd la vigilance de discordance, pas l'orientation.
  - **Recoupement assumé et à écrire dans la règle** : C-STR se déclenche sur un sous-ensemble de la population de `R2-STR-01`. Les deux sorties coexisteront à l'écran ; l'une propose une mesure, l'autre nomme une contradiction. `DC-37` exige que cette justification soit portée par la règle, pas supposée.
- **C-SOM — retirée de la V1, motif inscrit dans la table.** L'axe `ME` du DNST (`Q_INF_03`) est titré « Mélatonine — Rythme **et socialisation** » et porte **six items de sociabilité sur dix** (ME1, ME2, ME5, ME6, ME8, ME9), pesant jusqu'à 24 points sur 40. Comme la règle exige que le PSQI, l'Epworth et le Berlin soient **rassurants**, elle ne sélectionnerait pas une discordance de sommeil : elle sélectionnerait, **systématiquement et non au hasard**, des patients introvertis qui dorment bien. C'est le cas que `DC-09` et `DC-28` existent pour attraper.
  - Écarté : **créer maintenant** le sous-score de rythme (ME3/ME4/ME7/ME10, plafond 16). La règle mesurerait enfin ce qu'elle prétend mesurer, mais ce sous-score n'existe pas au catalogue — donc un `versionScore`, un `D-xxx` propre et un périmètre qui déborde un lot de garde-fou de synthèse. **Instruit séparément.**
  - Écarté : **maintenir C-SOM telle quelle**. La spec en fait une régression testée (section 57) ; le banc validerait alors un comportement faux.
- **C-ALI — reportée.** Le prédicat « restriction déclarée (drapeau anamnèse) » n'a **aucun support direct**. `DrapeauxAnamnese` porte **dix** clés à `367688ad` (`drapeauxAnamnese.ts:14-31`) : les huit d'origine, plus `intolerancesAlimentaires` et `symptomesFonctionnels` ajoutées par ce même commit. Deux candidats existent donc, et **aucun des deux n'est une restriction déclarée** : `variationPoids` est proche du sujet sans le couvrir ; `intolerancesAlimentaires` (`anamnese.ts:179-181` — Gluten, Histamine, Lactose) déclare une **cause supposée**, pas un comportement d'éviction — un patient peut se déclarer intolérant sans rien évincer, et évincer sans se déclarer intolérant. Substituer l'un ou l'autre serait l'extrapolation que `DC-14` interdit. La règle dépend d'une modification du recueil d'anamnèse, qui est un autre geste dans un autre lot.
  - **Correction d'une affirmation de la première rédaction** : le seuil `≥ 7` de la plainte surpoids **a** une provenance, contrairement à ce qui avait été écrit. `surpoids` est le sous-score `Q004` de `Q_MOD_03` (`mode-de-vie.ts:28`), dont la grille d'interprétation certifiée ouvre la bande « Intensité élevée » exactement à 7 (`mode-de-vie.ts:33-37`) ; la table d'orientation **signée** s'en sert déjà au même seuil pour `R2-NEU-01` (`orientationRulesV1.ts:775-786`). `DC-19` n'est pas en cause ici.
- **Conséquence : la table V1 porte UNE règle**, `validationExterne: false` à la livraison — écrire une règle et la signer restent deux gestes distincts (même discipline que `orientationRulesV1.ts`). Les quatre livrables d'architecture du lot — moteur, prompt v20, schéma de sortie strict, injection cockpit — sont **inchangés**. Une règle signée juste vaut mieux que trois dont deux produisent des vigilances fausses.
- **Banc de fraîcheur des claims épinglés — dans ce lot.** Le lot épingle de nouveaux `justificationClaims` au patron d'`orientationRulesV1`, dont l'audit a établi que le compilateur annoncé (`tools/corpus/orientation/`) n'a jamais existé. Sans banc, le lot duplique le trou dans une table neuve. Le banc vérifie que chaque claim cité **existe, est `VALIDE` et n'est pas `superseded`**, et couvre **les deux tables** d'un coup.
  - **Réserve de conception, non négociable** : la base CI est vide. Un banc écrit comme test CI serait **vacué** — exactement le piège nommé dans [[D-015]] et [[D-012]], où la partie du contrat qui protège le plus est celle que le CI ne joue pas. Il prend donc la forme d'un contrat rejoué **en lecture seule sur la production** (patron `web/prisma/checks/`), jamais celle d'un test unitaire vert sur une base sans claims.
- Réversibilité : une table de règles et un contrat de lecture ; aucun schéma de base, aucune migration.
- Référence : `docs/claude/campagnes/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/DOSSIER_REGLES_LOT-01.md`, `docs/claude/doctrine/AUDIT_DOCTRINE_CHAINE_T0.md` (§E), `web/src/lib/questions.ts` (bandes DASS-21 et DNST), `web/src/lib/clinical/orientationRulesV1.ts:676-682`, [[D-012]], [[D-015]], [[D-041]]

### D-041 — Discordance, convergence et conflit de sources sont un seul objet à trois formes

- Date : 2026-08-11
- Statut : accepté (décision utilisateur du 2026-08-11, LOT-01 de la campagne `2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie`)
- Domaine : clinique, architecture du moteur d'interprétation, synthèse IA
- Décision : le moteur du LOT-01 produit **un objet unique**, discriminé par une `forme` à trois valeurs, et non trois objets voisins :
  1. **`DISCORDANCE`** — deux instruments ou plus qui se contredisent sur un même axe (`DC-30`). Forme livrée par le LOT-01.
  2. **`CONVERGENCE`** — plusieurs sources indépendantes qui pointent le même axe (`DC-29`), graduée `SIGNAL` · `CONVERGENCE_FAIBLE` · `CONVERGENCE_MODEREE` · `CONVERGENCE_FORTE`.
  3. **`CONFLIT_SOURCES`** — deux claims ou sources du corpus qui ne disent pas la même chose (`DC-54`), avec issue d'escalade praticien (`DC-55`).
- Motif : les trois ont la même forme — des sources, une description, une importance, des hypothèses, une action suggérée, un état résolu ou non — et diffèrent seulement par la **matière** confrontée (instruments, faisceau, corpus). Trois objets auraient produit trois vocabulaires de vigilance sur le même écran et, à terme, trois moteurs.
- **Le garde-fou qui rend cette fusion acceptable — non négociable.** Réunir convergence et discordance dans un objet portant un champ d'importance invite à lire la convergence comme une certitude. `DC-29` l'interdit : **la convergence augmente la priorité, jamais la certitude**. En conséquence, l'objet ne porte **aucun champ de certitude, de probabilité, de score ou de confiance**, sous quelque nom que ce soit ; la graduation de la forme `CONVERGENCE` compte des **sources indépendantes**, elle ne mesure pas une vraisemblance. Un banc doit asserter l'absence d'un tel champ — sans quoi la fusion se retourne contre la doctrine qu'elle sert.
- Conséquences :
  - Le déterministe produit ces objets ; **le LLM les restitue et ne les crée jamais** ([[D-003]], `DC-02`). Aucune forme n'est supprimable par la sortie du modèle.
  - Les trois formes partagent le même canal d'injection — vigilances de synthèse et panneau du cockpit — donc un seul vocabulaire pour le praticien.
  - Seule la forme `DISCORDANCE` est peuplée par le LOT-01. Les deux autres sont **prévues par le type, vides à la livraison** : la structure évite le second moteur, elle n'anticipe aucune règle clinique.
  - L'escalade praticien de `CONFLIT_SOURCES` (`DC-55`) est une **issue** de la politique de résolution, pas son échec.
- Options écartées :
  - **Trois objets distincts** : plus lisibles pris un par un, mais deux vocabulaires de vigilance cohabitant à l'écran et un second moteur à écrire dès la première convergence.
  - **Un objet sans discriminant**, les trois cas se distinguant par leurs champs remplis : rend intestable l'absence d'un champ de certitude et laisse la forme se déduire, donc se tromper.
- Portée de cette décision dans l'intégration doctrinale : elle est le **premier des trois actes** exigés par `DC-18`. `DC-29` et `DC-54` restent au statut **proposition** dans `CONSTITUTION_CLINIQUE.md` tant que le banc qui les fait mordre n'existe pas ; elles ne basculent à **acté** qu'à ce moment.
- Réversibilité : un type et une table de règles, aucun schéma de base, aucune migration. `git revert` suffit.
- Référence : `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md` (`DC-29`, `DC-30`, `DC-54`, `DC-55`), `docs/claude/doctrine/AUDIT_DOCTRINE_CHAINE_T0.md` (véhicule V1), `docs/claude/campagnes/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/lots/LOT-01-gardefous-synthese-contradictions.md`, [[D-003]], [[D-011]]

### D-040 — La discordance rythme déclaré/observé est un drapeau directionnel de sur-déclaration, praticien-only, à trois axes

- Date : 2026-08-10
- Statut : accepté (décision utilisateur du 2026-08-10, LOT-01 de la campagne `2026-08-10-chaine-alimentaire`)
- Domaine : clinique, scoring, agenda alimentaire, Mon Équilibre
- Décision : confronter le **rythme alimentaire déclaré** — sous-score `RYTHME_CHRONO` de `Q_ALI_01` (items `SIIN52/53/54/55`, `web/src/lib/questionnaires/alimentaire.ts:303`) — au **rythme observé** par l'agenda alimentaire clôturé (agrégats `AGA_*`, `web/src/lib/agenda-alimentaire/cloture.ts`, D-039). La confrontation prend la forme d'un **drapeau DIRECTIONNEL de sur-déclaration** : il ne se lève que lorsque le patient **déclare favorable ET l'agenda observe défavorable** — jamais l'inverse (un patient lucide sur son défaut n'est pas signalé). Praticien-only, niveau de preuve D, point à explorer, jamais un diagnostic ([[D-034]]).
- Les trois axes et leurs seuils — **fixés par l'utilisateur, révisables à la clôture des 21 jours** :
  1. **Jeûne nocturne** — déclaré `SIIN54` « ≥ 10 h » ; observé `AGA_JEUNE_MEDIAN`. Drapeau si observé **< 600 min**. Ce seuil n'est **pas inventé** : c'est la borne de la source elle-même (10 h = 600 min), la même que le barème `SIIN54 {min:10}` (`alimentaire.ts:252`).
  2. **Protéines au matin** — déclaré `SIIN52/53` « chaque jour / régulièrement » (oui) ; observé `AGA_FREQ_PROTEINES_MATIN_SEM` (jours/7). Drapeau si observé **< 4 j/7** (rupture de majorité face à une déclaration de régularité).
  3. **Soir léger** — déclaré `SIIN55` « soir léger et digeste » (oui) ; observé `AGA_FREQ_SOIR_COPIEUX_SEM` (jours/7 où le soir fut le plus copieux). Drapeau si observé **> 3 j/7** (le soir fut le plus copieux la majorité des jours, contredisant « léger »).
- Ce que les seuils 2 et 3 sont, et ce qu'ils ne sont pas : des **arbitrages cliniques explicites**, sans distribution réelle pour les étalonner (le recueil est arrêté au premier jour). La porte des 21 jours interdit qu'un seuil soit **inventé par l'assistant** ; elle n'interdit pas au responsable de traitement d'en poser un, **nommé et daté**, à réviser quand le recueil le permettra. Le seuil 1, lui, n'est pas un arbitrage : il est porté par la source.
- Conséquences et bornes — non négociables :
  - **`null`, jamais 0.** Sous la forme courte de `Q_ALI_01` (`WN_ALI_01_SIIN57` éteint), `RYTHME_CHRONO` n'existe pas et `MAX_RYTHME_CHRONO = 0` (`equilibre/constants.ts:182`) : le déclaré est alors absent, la discordance rend **`null`** (non mesurable), jamais un drapeau ni un « concordant ». Idem si la couverture de l'agenda est insuffisante sur l'axe (dénominateur `AGA_*` nul). Prouvé dans les **deux positions** du drapeau ([[D-033]]).
  - **Aucune double mesure de Mon Équilibre.** La discordance **ne réalimente pas le besoin 3** : `RYTHME_CHRONO` déclaré y reste l'unique source (`equilibre/constants.ts:253`). C'est une lecture praticien à côté du besoin, pas un second porteur — le piège nommé `RYTHME_ALIMENTAIRE`/10 vs `RYTHME_CHRONO`/7 (`alimentaire.ts:645-658`) reste fermé.
  - **Directionnel seul.** Déclaré défavorable → pas de drapeau (rien à sur-déclarer). Déclaré favorable + observé favorable → « concordant », pas de drapeau. Seul le couple (déclaré favorable, observé défavorable) lève l'axe.
- Options écartées :
  - **Confrontation par axe qualitative** (concordant/discordant/non mesurable, sans drapeau directionnel) : plus complète mais moins actionnable ; l'utilisateur a préféré ne signaler que l'asymétrie qui appelle un entretien.
  - **Taux de concordance chiffré** (« 2 axes sur 3 ») : mesure dérivée exigeant un seuil d'alerte et une calibration — bute sur la porte des 21 jours et frôle la revendication psychométrique de [[D-034]].
  - **Attendre le recueil pour tout** (y compris l'axe jeûne) : écarté, l'axe jeûne étant seuil-libre par la source et livrable sans données.
- Réversibilité : les trois seuils sont des littéraux ; `git revert` suffit, et leur révision à la clôture des 21 jours est prévue par cette décision même.
- Référence : `docs/claude/campagnes/2026-08-10-chaine-alimentaire/lots/LOT-01-discordance-rythme.md`, `web/src/lib/questionnaires/alimentaire.ts` (RYTHME_CHRONO, SIIN52-55), `web/src/lib/agenda-alimentaire/cloture.ts` (agrégats AGA_*), `web/src/lib/equilibre/constants.ts` (besoin 3), [[D-033]], [[D-034]], [[D-039]]

### D-039 — La clôture de l'agenda alimentaire transmet tous les agrégats calculés — sans poids, sans seuil, sans sélection

- Date : 2026-08-10
- Statut : accepté (décision utilisateur du 2026-08-10, à l'ouverture de la campagne `2026-08-10-chaine-alimentaire`, LOT-00)
- Domaine : agenda alimentaire, forme du dossier patient
- Décision : **la clôture d'un recueil d'agenda alimentaire transmet au dossier la totalité des agrégats que le domaine calcule** (`AgregatsAgendaAli`, `web/src/lib/agenda-alimentaire/agregats.ts`), avec leurs dénominateurs de couverture, sous forme de pseudo-items dans le `rawAnswers` d'une `QuestionnaireReponse` standard `scored:false` — sur le gabarit du jumeau sommeil (`web/src/lib/agenda-sommeil/cloture.ts`). **Aucune sélection, aucun poids, aucun seuil** : transmettre n'est pas coter, et le tri clinique appartient au barème (LOT-02), qui ne s'écrira qu'après la porte des 21 jours, sur distribution réelle.
- Ce que la décision amende, et dans quelle limite : la position du catalogue (« un barème posé avant la première passation serait une donnée clinique inventée », `web/src/lib/questionnaires/alimentaire.ts`) reste entière — `Q_ALI_09` garde `scoring:{type:'journal'}` et ne rend aucun score. Ce qui change est strictement la **visibilité** : le recueil clôturé devient une réponse lisible par la fiche, la synthèse et tout lecteur du dossier, au lieu de rester enfermé dans sa table.
- Conséquences :
  - La liste des pseudo-items est **dérivée du domaine, jamais recopiée** : une clé d'agrégat ajoutée sans son pseudo-item doit rougir (garde du LOT-00). Une liste écrite à la main dirait ce qu'on croyait le jour où on l'a écrite.
  - La clôture est idempotente, vraie dans les deux positions de `WN_AGENDA_ALI` ([[D-033]]), et n'exige aucune migration.
  - Aucune revendication au-delà du descriptif : niveau de preuve D, longitudinal, jamais diagnostique ([[D-034]]).
- Options écartées :
  - **Le sous-ensemble resserré** (jeûne médian, fenêtre, régularité, couverture seuls) : plus lisible en synthèse, mais la sélection est déjà un jugement clinique — prématuré sans distribution réelle — et les agrégats écartés auraient exigé une nouvelle décision et une re-clôture pour entrer au dossier.
  - **Différer** : l'agenda restait invisible du dossier et de la synthèse IA, alors que le maillon manquant est précisément la visibilité, pas la mesure.
- Réversibilité : la clôture est du code sans migration, `git revert` suffit ; les réponses déjà écrites restent des lectures datées légitimes du recueil tel qu'il était.
- Référence : `docs/claude/campagnes/2026-08-10-chaine-alimentaire/CAMPAGNE.md`, `NOTE_CADRAGE.md` (même dossier), `web/src/lib/agenda-sommeil/cloture.ts`, [[D-033]], [[D-034]]

### D-038 — Le badge muet se remplit depuis le catalogue, aligné à la main — le registre ne pilote pas l'écran

- Date : 2026-08-09
- Statut : accepté (décision utilisateur du 2026-08-09, sur la liste produite par le garde du LOT-04 de la campagne `2026-08-08-dettes-ouvertes-5-0`, close le même jour)
- Domaine : UI praticien, vocabulaire clinique, et source d'autorité d'une affirmation clinique
- Numérotation : cette décision est celle que la campagne annonçait en `D-037` — numéro parti le 2026-08-09 à la décision HDS, une réservation n'existant pas ([[D-037]], « Numérotation »). Elle prend le suivant libre, comme écrit.
- Décision : **le catalogue de code reste la source d'autorité du badge, et il s'aligne à la main, instrument par instrument.** L'écran continue de lire `def.scoring.certification.status` ; le registre audité (`instrument_registry.json`) ne pilote pas l'écran. Un lot dédié déclare `certification` pour chacun des instruments que le registre certifie et que l'écran tait — **chaque déclaration est une relecture adossée au banc certify, jamais une copie du registre**. Les quatre instruments où l'écran affirme « ambigu » (`Q_SOM_02`, `Q_GAS_01`, `Q_FIB_02`, `Q_URO_01`) sont réexaminés un par un avant tout changement : le doute posé dans le catalogue a peut-être un motif que le barreau du registre ne porte pas.
- La liste de référence, mesurée le 2026-08-09 sur `main` (sortie de `check_questionnaire_certification.js`, après #632) : **22 instruments** que le registre déclare au moins `scoring_verifie` et dont le catalogue servi ne dit pas `certifie` — 4 « ambigu » ci-dessus, et 18 muets : `Q_NEU_06`, `Q_SOM_01`, `Q_SOM_03`, `Q_SOM_04`, `Q_SOM_07`, `Q_GAS_03`, `Q_CAR_01`, `Q_TAB_03`, `Q_TAB_04`, `Q_PED_02`, `Q_MOD_01`, `Q_MOD_02`, `Q_ALI_01`, `Q_ALI_02`, `Q_ALI_03`, `Q_GEO_03`, `Q_GEO_05`, `Q_GEO_06`. Le chiffre n'est pas un compteur à maintenir ici : la sortie du garde fait foi à chaque `npm run check`, et c'est elle qui mesurera l'avancement du lot.
- Conséquences :
  - **Le garde écran ↔ registre du LOT-04 garde son objet.** Deux sources restent confrontées : le sens menteur (un `certifie` d'écran au-dessus du barreau du registre) reste bloquant, l'inventaire du sens silencieux devient l'instrument de mesure de l'alignement — il décroît déclaration par déclaration, et ne peut décroître qu'honnêtement.
  - **Ce que chaque badge affirmera reste borné par [[D-034]]** : « Scoring vérifié » dit que le code reproduit fidèlement la règle enregistrée, rien de psychométrique. L'alignement ne fait dire à l'écran que ce que le banc certify prouve déjà.
  - **Cette décision n'exécute rien.** L'alignement est un lot à ouvrir, avec son propre palier (changement d'UI → T2, et revue de la famille `certification` du catalogue) ; les proses et libellés restent ceux de [[D-036]].
- Options écartées :
  - **Le registre pilote l'écran.** Une seule source, les 22 passent d'un coup — mais la nuance « ambigu » posée dans le catalogue pour quatre instruments serait écrasée sans réexamen, et le garde écran ↔ registre perdrait son objet le jour même où il vient d'être posé : plus deux sources à confronter, plus de dérive détectable.
  - **Le silence assumé.** Décider que le badge ne parle que si le catalogue déclare, sans lot d'alignement, laissait 18 instruments que le registre certifie muets au praticien et 4 affirmant « ambigu » contre le registre — la moitié silencieuse du tableau que [[D-036]] nommait déjà comme dette.
- Réversibilité : les déclarations du catalogue sont des littéraux de code, `git revert` suffit ; le garde, lui, refuserait une affirmation au-dessus du registre — c'est son objet.
- Référence : `docs/claude/campagnes/2026-08-08-dettes-ouvertes-5-0/CAMPAGNE.md`, `docs/claude/campagnes/2026-08-08-dettes-ouvertes-5-0/lots/LOT-04-garde-code-registre.md`, `scripts/check_questionnaire_certification.js` (sortie « écran ↔ registre »), [[D-034]], [[D-036]], [[D-037]]

### D-037 — [[D-006]] est confirmée, et la revue de la dette HDS quitte le 2026-10-21 pour la réponse de Scalingo

- Date : 2026-08-09
- Statut : accepté (décision du **responsable de traitement** du 2026-08-09)
- Domaine : architecture, hébergement et conformité (HDS, RGPD)
- Numérotation : la campagne active `2026-08-08-dettes-ouvertes-5-0` annonçait écrire sa décision produit sur le badge muet en `D-037`. **Une réservation de numéro n'existe pas** : `scripts/lib/decisions-numerotation.mjs` refuse tout trou dans la suite, et la première rédaction de cette décision — qui prenait `D-038` en laissant `D-037` vacant — a été rejetée par ce garde. Le numéro va à la décision qui s'écrit ; celle du badge prendra le suivant libre le jour où elle se prendra.
- Décision : trois arbitrages, pris ensemble.
  1. **[[D-006]] est confirmée.** La cible reste « Scalingo seul », Vercel/Supabase en filet de rollback court puis décommissionnés. Elle n'est ni suspendue ni révoquée — mais sa **réserve (1) est requalifiée dans sa nature** au point (a) ci-dessous : « e-signer le DPA » décrit une démarche qui n'existe pas chez ce fournisseur. Requalifiée, non levée.
  2. **La revue de la dette 8 quitte le 2026-10-21 pour la date de réponse de Scalingo** au ticket ouvert le 2026-08-09. Motif : attendre octobre n'apporte aucune information que ce ticket n'apporte pas, et le développement a besoin du périmètre fonctionnel complet pour continuer. **L'échéance de la dérogation, elle, ne bouge pas** — elle reste au 2026-10-21, et c'est l'échéance que porte la majorité des trous du dossier RGPD (tableau §14 ; quelques-uns en ont une autre, dont l'information des personnes, « au plus tôt », donc déjà échue). **Aucun compte n'est écrit ici** : ce lot documente précisément qu'un compteur figé dérive en silence, et il en a périmé trois en ajoutant une ligne à ce tableau.
  3. **L'orientation du 2026-07-22 cesse d'être présentée comme courante.** Elle reste un évènement daté et vrai — l'arbitrage qui découlait de l'instruction du 2026-07-21 — mais elle est **antérieure de six jours** à [[D-006]] et n'a jamais été consignée au registre. Les pièces qui la portaient au présent la datent désormais au passé.
- Ce que cette décision **ne fait pas** : elle n'ouvre pas la migration des données réelles. **L'ordre imposé de [[D-006]] tient intégralement** — aucun patient réel sur Scalingo avant (a) et (b) ci-dessous.
- État réel des deux conditions dures de [[D-006]], relevé le 2026-08-09 — **aucune des deux n'est levée** :
  - **(a) DPA — réserve REQUALIFIÉE, non levée.** Ce qui change est la **nature de la démarche**, pas son accomplissement : l'accord de sous-traitance vit dans les **documents généraux** de Scalingo, acceptés à la souscription — laquelle existe déjà (app `wellneuro-staging` et add-on PostgreSQL Business payant). Il n'y a donc **pas d'e-signature à obtenir**, et la rédaction « e-signature du DPA » de [[D-006]] décrivait une démarche qui n'existe pas chez ce fournisseur. Mais **la pièce n'est pas au dossier au 2026-08-09** : la copie horodatée de la version acceptée est demandée au ticket et n'a pas été reçue. Tant qu'elle manque, (a) reste une condition ouverte — une souscription inférée n'est pas une pièce produite.
  - **(b) périmètre HDS de la région — NON satisfaite, et le certificat ne la satisfait pas.** Le certificat LNE n° 38436-2 a été lu le 2026-08-09 : il ne nomme **aucune région**, ses sites couverts étant « 9 rue de la Krutenau, 67000 Strasbourg » et « sites virtuels / bureaux distants ». La confirmation que les ressources `--hds-resource` en `osc-fr1` tombent sous ce certificat relève des conditions de l'offre, et est demandée au ticket. Élément à charge côté plateforme : `apps-info` rend `HDS: true` sur l'app.
- Conséquences :
  - **La réserve de région change de nature.** `scalingo regions` ne rend qu'`osc-fr1` sur ce compte : `osc-secnum-fr1` **n'est pas accessible** et suppose une démarche d'accès préalable. L'arbitrage recommandé par l'audit du 2026-07-24 n'était donc pas un choix ouvert entre deux régions disponibles, mais une demande à formuler — ce que fait le ticket.
  - **Deux prémisses non établies sortent du chemin critique.** L'audit déduisait de l'annexe HDS un accès aux données de santé **réservé à un professionnel de santé porteur de carte CPS**, et en tirait que la pratique d'exploitation (lecture SQL depuis le poste, MCP, Prisma Studio) deviendrait une non-conformité contractuelle au jour de la bascule. L'activité de Wellneuro **n'est pas une activité réglementée** — précédent : Pronutriconsult, plateforme équivalente exploitée par des praticiens non médecins, sans CPS. Ce qui subsiste est une **politique d'accès écrite** (traçabilité, minimisation), due sous la dérogation actuelle comme après la bascule, et qui n'engendre aucun lot d'ingénierie.
  - **Le certificat était cité depuis le 2026-07-24, mais n'avait pas été lu.** Le numéro LNE 38436-2 et l'échéance du 2028-09-11 figuraient déjà dans [[D-006]], dans `AUDIT_MIGRATION_HDS.md` et dans `CHECKLIST_ACTIVATION_G_TRUST_04.md`. Ce que la lecture du 2026-08-09 ajoute, et qui manquait partout : la **condition d'isopérimètre au certificat ISO/IEC 27001 n° 38435** (sans lequel la pièce est incomplète pour un auditeur), la date de début de validité, la déclaration d'applicabilité, les sites couverts, le détail des six activités — et **l'absence de toute mention de région**. Le dossier RGPD porte désormais la pièce, non plus son seul numéro.
  - **Les activités 5 et 6 sont couvertes** (administration et exploitation ; sauvegardes externalisées). C'est ce qui rend conformes le PostgreSQL managé **et ses sauvegardes** — le motif exact pour lequel l'audit avait écarté Scaleway.
- Réserves — aucune n'est levée par cette décision, et **les cinq de [[D-006]] restent entières** :
  - **(a) et (b) sont toutes deux ouvertes.** (a) est requalifiée dans sa nature (archivage, non signature) sans être accomplie ; (b) attend la réponse écrite.
  - **La réserve (3) de [[D-006]] — confirmation DPO** sur « patients réels sur Scalingo en phase de test » — n'est ni levée ni traitée ici. Elle est rappelée explicitement parce qu'une première rédaction de cette décision réduisait l'ordre imposé à deux conditions et la faisait disparaître par omission. S'y ajoute une difficulté que le dossier RGPD nomme déjà : `docs/DOSSIER_RGPD.md` relève une **contradiction non tranchée sur l'existence d'un DPO** (G-TRUST-02 écrit « pas de DPO désigné », [[D-005]] écrit « confirmé par le DPO le 2026-07-27 »). Tant qu'elle tient, la réserve (3) n'est pas seulement non levée : on ne sait pas qui pourrait la lever.
  - Les réserves (4) et (5) de [[D-006]] — DPA des autres sous-traitants, AIPD, pentest ; conformité des consentements comme certification du responsable — sont inchangées.
  - **Les deux prémisses retirées le sont sur des bases inégales, et aucune n'a été confirmée par le fournisseur.** La CPS repose sur le statut de l'activité et un précédent de place, **pas** sur une lecture contradictoire des art. 9.4/10.3 de l'annexe HDS ni sur un avis de conseil. La forme du DPA repose sur l'existence de la souscription, **pas** sur une pièce. Le ticket du 2026-08-09 ne pose ni l'une ni l'autre de ces deux questions : les deux points sont donc **requalifiés sous réserve de confirmation du fournisseur ou d'un conseil qualifié**, à poser au prochain échange.
  - Les trous côté Wellneuro restent entiers, et **la plupart gardent le 2026-10-21 — pas tous ; le tableau §14 du dossier RGPD fait foi** : **information des personnes sur l'écart d'hébergement** (« au plus tôt », donc échue), **base légale non qualifiée**, durées de conservation, AIPD à qualifier, pentest, DPA des autres sous-traitants (« avant bascule Scalingo »).
  - La **stratégie de rollback** n'existe qu'en une subordonnée (« Vercel/Supabase gardés chauds »), sans critère de déclenchement, sans fenêtre, sans geste de retour. Aucun **GO/NO-GO de migration** n'existe : `GATES_GO_NO_GO.md` est une table de gates produit.
  - L'**état de schéma du staging n'est pas mesuré** depuis le 2026-07-24 : `apps-info`/`addons`/`ps` ne lisent pas les migrations, et `prisma migrate status` exige un conteneur `scalingo run` avec TTY.
  - La seconde app `wellneuro`, au statut `new`, n'est toujours pas instruite.
- Corrigé dans la foulée, donc **hors des réserves** : `Force HTTPS` était à `false` sur `wellneuro-staging` (relevé le 2026-08-09) ; **activé le même jour**, `apps-info` rend `true`.
- Options écartées :
  - **Suspendre [[D-006]] jusqu'au 2026-10-21.** C'était la lecture que le runbook du 2026-08-05 rendait vraisemblable. Écartée : elle fait payer deux mois d'attente pour une information que le ticket rend en quelques jours, et laisse le développement sans périmètre fonctionnel complet.
  - **Révoquer [[D-006]].** Aucun fait nouveau ne la contredit ; le certificat lu le 2026-08-09 la conforte au contraire sur les six activités.
  - **Attendre la réponse de Scalingo pour trancher.** Écartée : l'ordre imposé de [[D-006]] protège déjà les données réelles. Confirmer maintenant ne fait courir aucun risque et débloque tout le travail qui ne touche pas aux données.
- Réversibilité : une décision de registre se révoque par une décision de registre. Les corrections documentaires qui l'accompagnent sont des textes, `git revert` suffit.
- Référence : `docs/DOSSIER_RGPD.md`, `docs/claude/propositions/2026-07-24-audit-migration-hds/` (AUDIT, RUNBOOK, CHECKLIST_FINALISATION), certificat LNE n° 38436-2 (Drive, dossier « Scalingo »), [[D-006]], [[D-005]]

### D-036 — « Certifié » se renomme « Scoring vérifié » : le libellé porte la définition, pas une infobulle

- Date : 2026-08-08
- Statut : accepté (décision utilisateur du 2026-08-08, LOT-02 de la campagne `2026-08-08-dettes-ouvertes-5-0`)
- Domaine : UI praticien, et vocabulaire clinique
- Décision : deux arbitrages, pris ensemble.
  1. **Le libellé change, plutôt que de recevoir une infobulle ou un lien.** [[D-034]] laissait dû le geste d'UI : le mot « Certifié » s'affichait au praticien sans porter le sens qu'il définit. Trois options étaient ouvertes — infobulle, libellé plus long, lien vers la définition. **Le libellé est retenu** : il dit ce que la donnée dit, sans rien exiger du lecteur. Les deux autres ont un défaut de forme documenté ici même (voir Options écartées).
  2. **Toute la famille des libellés suit, pas seulement les trois badges verts.** Le périmètre cadré ne nommait que « Certifié », « Certifié Drive » et « Certifié manuel EORTC » — les trois `success`, ceux qui rassurent à tort. Mais **« Non certifié » se lit tout aussi bien comme « non validé psychométriquement »** : c'est le mot qui est ambigu, pas l'état vert. **Neuf libellés changent**, plus **trois proses en ligne** du rayon Questionnaires (`BibliothequePanel.tsx:369` et `:1215`, tous deux « jamais certifié automatiquement », et `:1405`, « Il reste non certifié ») — la quatrième prose, celle du tiroir des instruments du cabinet, est devenue la constante `TEXTE_INSTRUMENTS_CABINET` et se compte avec les littéraux d'écran, pas avec les proses. Le critère n'est pas la présence du mot mais la **cohérence de l'échelle** : « Drive ambigu » et « À vérifier » ne le portaient pas et ont changé quand même.
- Le coût, accepté et non tu : **le mot « Certifié » est employé à l'oral par le praticien**, et il reste dans `docs/claude/corpus/instrument_registry.json`, dans le type `StatutCertificationRuntime`, dans la valeur de donnée `'certifie'`, dans `scripts/check_questionnaire_certification.js` et dans le corpus. **L'écran et le dossier ne disent donc plus la même chose.** Aucune valeur de donnée n'a été renommée — le hors-périmètre du lot fige le registre, et renommer une donnée pour aligner un écran serait le mauvais sens de la dépendance. Cet écart est une **dette nommée**, pas un oubli.
- Conséquences :
  - **Les deux mappers deviennent un module, et ce n'est pas un rangement.** `badgeCertification` (`BibliothequePanel.tsx`) et `certificationBadge` (`FichePatientPanel.tsx`) étaient locaux et non exportés : **aucun banc ne pouvait asserter ce qu'ils rendaient**. Ils vivent désormais dans `web/src/lib/certification-libelles.ts`, avec les deux littéraux d'écran qui ne passaient par aucun mapper (badge et prose des instruments du cabinet) — hors du module, ils auraient échappé au garde.
  - **Le garde porte sur les valeurs rendues, jamais sur le source des composants.** `web/src/lib/certificationLibelles.guard.test.ts` refuse `/certifi/i` sur ce que le module produit. Un motif appliqué au source rougirait sur les identifiants légitimes du dossier (`libelleCertificationBibliotheque`, `CertificationLue`, `'certifie'`) et exigerait une exception : c'est exactement la forme qui a fait refuser la deuxième rédaction du garde D-034 — **une échappatoire creusée pour un cas légitime est réutilisable par le défaut**. Pas de `\b` non plus : en JavaScript `é` n'est pas `\w`, donc `\bcertifié\b` ne borne rien.
  - **Exhaustivité par le typage plutôt que par une liste.** Les attendus sont un `Record<StatutCertificationRuntime, …>` : ajouter une valeur à l'union sans écrire son libellé ne compile pas. Les libellés eux-mêmes sont **écrits à la main** — un attendu dérivé du module testé bougerait avec lui et ne prouverait rien.
  - **Un garde de libellé ne suffit pas : il faut un garde de RENDU, et il porte sur le texte ET sur la couleur.** Le module est épinglé, mais un composant peut calculer le bon libellé et en afficher un autre, ou coder `variant="success"` en dur — « Scoring non vérifié » passerait alors en vert sans qu'un test de texte ne bouge. `web/src/components/ui/Badge.tsx` expose donc `data-variant`, et les deux bancs de rendu (`BibliothequePanel.test.tsx`, `FichePatientPanel.test.tsx`) assèrent les deux. Le banc de la bibliothèque couvre **les six** états de `StatutCertificationRuntime`, servis ou non : un banc qui ne couvre que l'état du jour cesse de garder au prochain.
  - **Neuf mutations vérifiées, neuf rouges**, comptes pris sur une même base — les trois bancs du lot en une passe (101 tests). Quatre à l'écriture : libellé nu remis dans le module (6), motif cassé (10), ancien libellé réintroduit dans un composant (1), source de la règle scorée effacée (3). Cinq trouvées par deux passes de revue adversariale, dont **trois qui passaient vertes après le premier correctif** : sens de la prose cabinet inversé sans le mot interdit (1), libellé nu posé directement dans le badge du catalogue (9), `variant="success"` codé en dur — tous les états en vert (6), clause `statutCertification === 'certifie'` retirée du `||` (1 ; l'accord des deux champs dans la fixture avait cessé de l'exercer), badge masqué pour l'état `inconnu` (3 ; 21 instruments privés de badge).
  - **Un compte de rouges se mesure sur la base qu'on annonce.** Deux des chiffres ci-dessus avaient d'abord été relevés sur une sélection partielle de fichiers, et étaient donc trop bas — et une première rédaction de cette décision annonçait « quatre mutations » là où les autres pièces en portaient six. La leçon est du même ordre que celle du chiffre de passe E2E de ce lot, annoncé à 131 alors qu'il valait 130 : le compte venait d'une passe qui portait un banc de capture jetable.
  - **La source de la règle scorée reste nommée.** « Scoring vérifié (Drive) » et « Scoring vérifié (manuel EORTC) » diffèrent : le moteur EORTC suit le manuel officiel, les autres la grille Drive. Les fondre en un seul libellé aurait fait perdre à la fiche ce qui distingue les deux vérifications — et c'était déjà la raison d'être de la branche `manuel_eortc`, sans laquelle le badge retombait sur le libellé de défaut alors que le registre porte `scoring_verifie`.
- Réserves :
  - **Le seed omet une clé que le moteur produit — ce n'est pas une impossibilité de banc.** Une première rédaction de cette décision écrivait « aucun E2E ne PEUT témoigner des libellés de passation » : c'est faux, et la revue adversariale l'a démenti. Tous les moteurs propagent la métadonnée (`web/src/lib/questions.ts`, `certification: sc.certification || null`) et `api/patient/submit` persiste le résultat entier ; `web/e2e/portail-parcours.spec.ts` complète déjà une soumission réelle. Ce qui manque est **une assertion, pas une possibilité** : **le seed est aujourd'hui moins fidèle que le moteur** — 15 blocs `scoresJson` dans `web/prisma/seed.ts`, aucune clé `certification`. À ne pas adoucir pour autant : Sophie Nicola porte **cinq** passations seedées, dont **quatre** déclarent `certification:{source:'drive',status:'certifie'}` au catalogue ; la cinquième est le PSQI, l'un des muets ci-dessous. Même seed étendu, une passation sur cinq de la patiente de référence restera « Historique ».
  - **Le badge est muet pour 21 des 65 instruments, et la production ne fait pas mieux.** Mesuré le 2026-08-08 sur le catalogue résolu (`statutCertificationRuntime` sur `QUESTIONNAIRE_CATALOGUE`) : **38 `certifie`, 21 `inconnu`, 6 `ambigu`**. Les 21 ne déclarent aucune `certification` — `web/src/lib/questionnaires/sommeil.ts` et `gerontologie.ts` n'en contiennent aucune —, donc « Statut inconnu » à la bibliothèque et « Historique » sur la fiche, **en production comme en local**. Et le croisement avec le registre est le vrai chiffre : **18 des 21 portent `scoring_verifie`** (dont le PSQI, `Q_SOM_01`) ; les trois autres non — `Q_GEO_04` est `contenu_verrouille`, `Q_SOM_09` `droits_verifies`, `Q_ALI_09` `repere`. Citer le MMSE comme une divergence avec le registre était donc faux : pour lui, « Statut inconnu » en est l'écho fidèle. Le lot cadre le risque comme « le badge vert rassure à tort » ; l'autre moitié du tableau est qu'il **ne dit rien du tout** sur un tiers du catalogue, dont 18 instruments que le registre certifie. Dette nommée, sans lot.
  - **Le libellé emprunte le nom d'un barreau qu'il ne lit pas.** « Scoring vérifié » reproduit mot pour mot `scoring_verifie` de `instrument_registry.json`, alors qu'il est piloté par `def.scoring.certification.status`, écrit à la main dans le catalogue de code. **Aucun contrôle ne relie les deux** : `scripts/lib/verifier_registre_instruments.js` reçoit le catalogue et la bibliothèque comme du texte et ne compare jamais les deux champs. Avant ce lot, une divergence rendait un mot vague faux ; désormais elle rend une affirmation précise et vérifiable fausse. C'est le voisin naturel du garde anti-dérive du LOT-03, et une dette nommée à part.
  - **Le garde n'attrape pas un mot neuf.** Le contrôle de source qui refuse la réintroduction d'un ancien libellé porte sur une **liste fermée** de dix chaînes, **à la casse près** : `'Instrument certifié'` en minuscule lui échappe. Ce qui réduit ce trou est le rendu réellement asséré — `BibliothequePanel.test.tsx` (badge du catalogue dans ses quatre états, badge cabinet, prose du tiroir), `FichePatientPanel.test.tsx` (colonne « Qualité »), `e2e/dashboard-praticien.spec.ts` (parcours cabinet). Il est réduit, pas fermé.
- Options écartées :
  - **Infobulle native (`title` + `aria-label`) sur le badge.** Le patron existe dans le dépôt (`FicheComplementPanel.tsx:446`, `RechercheCorpusRayonPanel.tsx`), mais il est **hover-only** : au doigt, la définition n'est pas atteignable, et `.claude/rules/frontend-ui.md` demande de concevoir tactile avant les interactions de survol. `docs/claude/UX_WELLNEURO_3_0.md:88-90,565-569` va plus loin et pose la table de remplacement — « Tooltip uniquement au survol → bouton d'information cliquable », « Attribut `title` → popover, accordéon ou panneau de détail ». Il n'existe par ailleurs **aucun composant d'infobulle réutilisable** : seul `@radix-ui/react-dialog` est installé.
  - **Lien vers la définition.** Atteignable au doigt et au clavier, mais il fait quitter l'écran ou ouvrir une modale, là où la preuve attendue du lot demandait la définition « sans quitter l'écran ».
  - **Ne qualifier que les trois badges verts.** Aurait laissé « Non certifié » nu à côté de « Cabinet — scoring non vérifié » : une échelle incohérente, où le mot ambigu survit précisément là où il annonce une absence.
- Réversibilité : le renommage est un changement de littéraux dans un seul module ; `git revert` suffit. Ce qui ne revient pas tout seul, c'est le garde — il refuserait le retour des anciens libellés, et c'est son objet.
- Référence : `docs/claude/campagnes/2026-08-08-dettes-ouvertes-5-0/lots/LOT-02-badge-certifie-definition.md`, `docs/claude/corpus/README.md`, [[D-034]]

### D-035 — Le parcours patient legacy est retiré, sa redirection reste

- Date : 2026-08-08
- Statut : accepté (décision utilisateur du 2026-08-08, LOT-01 de la campagne `2026-08-08-dettes-ouvertes-5-0`)
- Domaine : parcours patient, dette 5 de la déclaration 5.0
- Décision : **supprimer `web/src/app/patient/` immédiatement**, plutôt que lui poser une date-cible de retrait comme le cadrage le prévoyait. La redirection 307 vers `/portail/connexion` est **conservée sans échéance**.
- Ce que cette décision renverse, et assume : le LOT-04 de la campagne close avait refusé la suppression **sans mesure d'usage préalable** (`next.config.mjs` invoquait « une nouvelle mesure d'usage »). Cette mesure n'a jamais existé, et la produire pour dater un retrait déjà acquis aurait coûté plus que le retrait. Le risque a été signalé avant exécution et la décision maintenue : le parcours était inatteignable depuis le 2026-08-05, plus aucun lien interne ne le visait, et les 406 lignes supprimées ne portaient aucune règle que le portail ne porte déjà.
- Conséquences :
  - **La conséquence d'une panne de redirection a changé** : avant, un patient tombait sur l'ancien parcours (dégradé mais fonctionnel) ; désormais, sur un 404. La redirection est donc devenue critique, et un banc E2E l'emprunte enfin (`web/e2e/parcours-legacy-redirection.spec.ts`) — elle n'en avait aucun.
  - **La redirection n'a pas de date de fin de vie**, et c'est une dette assumée, pas un oubli : elle sert des liens e-mail déjà partis chez des patients, dont on ne connaît pas la durée de vie réelle. La question « jusqu'à quand » reste ouverte dans `CAMPAGNE.md`.
  - `web/src/app/api/patient/assignations/route.ts` n'a plus d'appelant. Non retirée : le retrait d'une route d'API se décide séparément.
  - Trois gardes structurelles listaient `app/patient` parmi leurs racines : une a rougi, **deux se sont tues** (leur `readdirSync` avalait l'erreur). Les trois sont purgées, et `auth.roles.guard.test.ts` refuse désormais la résurrection du répertoire sans réinscription de sa racine.
- Réversibilité : `git revert` restaure la page. Ce qui ne revient pas tout seul, c'est l'entrée `app/patient` des gardes — d'où le test de non-résurrection.

### D-034 — La validation psychométrique n'entre pas au programme : Wellneuro repère et prépare, il ne mesure pas

- Date : 2026-08-08
- Statut : accepté (décision utilisateur du 2026-08-08, clôture de la dette 2 de la campagne `2026-08-05-cloture-des-dettes-wellneuro-5-0`)
- Domaine : clinique, corpus des questionnaires, et rédaction assistée
- Décision : **les instruments servis par Wellneuro sont des outils de repérage et de préparation de consultation, pas des mesures dont Wellneuro établit ou revendique la validité psychométrique.** L'établissement de cette validité — grades COSMIN adossés à des études de validation — **n'entre pas au programme**. Ce n'est pas un report : c'est un non assumé, qui ferme la dette 2 plutôt que de la laisser ouverte indéfiniment.
- Ce que « certifié » veut dire, et ne veut pas dire : dans `docs/claude/corpus/instrument_registry.json`, `statutCertification: scoring_verifie` signifie **le code reproduit fidèlement la règle enregistrée** — items servis conformes à la source, moteur de scoring vérifié par le banc `certify`. Cela ne dit **rien** de la qualité psychométrique de l'instrument, de sa validité de construit, de sa fidélité, ni de l'étalonnage de ses seuils sur une population. L'écart était déjà nommé (#560, « ce que “certifié” ne dit pas ») ; il est ici tranché au lieu d'être re-nommé.
- Conséquences :
  - **Le champ `cosmin` reste `inconnu` pour les 65 instruments, et c'est désormais un état stable, pas une lacune.** La raison est écrite une fois dans `docs/claude/corpus/README.md`. Le banc `scripts/lib/verifier_registre_instruments.js` continue d'interdire tout grade qui ne serait pas adossé à une étude concordante : il n'y a donc aucun chemin pour écrire un grade « au jugé ».
  - **La consigne système de synthèse ne revendique plus la validation.** Elle disait « organiser les résultats de questionnaires **validés** » — la seule surface du **runtime** à l'affirmer (le fichier `prompts/synthese_multi_questionnaires.md` portait la même phrase, mais n'est référencé par rien), et la plus lourde de conséquences puisqu'elle fabrique le texte clinique lu par le praticien puis remis au patient. Elle porte désormais l'énoncé exact — *WellNeuro n'a évalué la validité psychométrique d'aucun instrument qu'il sert et ne s'en réclame pas* — dans son cadre déontologique. `VERSION_PROMPT_SYNTHESE` passe à `synthese-v19` ; un garde de banc (`promptAlimentaire.guard.test.ts`) refuse le retour de la revendication **et** exige la présence du démenti — l'absence seule laisserait le modèle réinventer la formulation retirée.
  - **Ce que le produit dit au patient ne change pas**, parce qu'il ne l'a jamais revendiqué : `web/src/lib/trust/contenus/registre.ts` écrit déjà « cet accompagnement relève du bien-être et du suivi ; il n'établit pas de diagnostic médical ». La décision aligne l'interne sur l'externe, pas l'inverse.
  - **Réversibilité, et à quel prix.** Si un usage à venir l'exige — audit, publication, qualification en dispositif médical —, cette décision se rouvre par une campagne d'ingestion des études de validation. Le banc et le vocabulaire fermé `A|B|C|inconnu` sont déjà en place pour l'accueillir : rien n'est à défaire, seulement à ajouter.
  - **Ce que la décision ne dit PAS, et qu'une première rédaction disait à tort.** Elle ne nie pas la validité des instruments : le catalogue sert l'EORTC QLQ-C30, le PSQI, la HAD, l'Epworth — des échelles publiées et validées par ailleurs. Ce que WellNeuro déclare, c'est qu'**il ne l'a pas évaluée et ne s'en réclame pas**. La première version de la consigne système interdisait de « présenter ces questionnaires comme validés » : c'était un faux clinique, dans le texte même qui va au praticien puis au patient. Refusé en revue, corrigé avant merge. L'interdit porte sur **notre revendication**, jamais sur la nature de l'instrument.
  - **Ce qui reste interdit** : présenter un score comme une mesure validée, invoquer une norme ou un étalonnage de population que les données ne portent pas.
  - **Ce que cette décision laisse dû, et qu'elle ne prétend pas avoir fait** : les badges praticien affichent « Certifié » (`web/src/components/BibliothequePanel.tsx`, `FichePatientPanel.tsx`) **sans porter le sens défini ici**. Le mot circule donc encore sans sa définition à l'endroit où un praticien le lit. C'est un geste d'UI, hors du périmètre de cette décision ; il est nommé ici pour ne pas être perdu, et revient au lot de la dette 6 ou à un lot d'UI dédié.
- Référence : `docs/claude/campagnes/2026-08-05-cloture-des-dettes-wellneuro-5-0/DECLARATION_5_0.md` (dette 2), `docs/claude/corpus/README.md`, `web/src/lib/anthropic.ts`

### D-033 — « Suspendu » est un état de drapeau, pas une propriété de l'instrument

- Date : 2026-08-07
- Statut : accepté (décision utilisateur du 2026-08-07, LOT-00 de la campagne `2026-08-07-dettes-packs-residuelles`)
- Domaine : produit et clinique (packs de questionnaires, agenda alimentaire), et méthode documentaire
- Décision : deux arbitrages, pris ensemble.
  1. **Le geste de donnée est différé après le merge.** Retirer `Q_ALI_09` du pack de base « Base de consultation » par l'UI praticien ne se fait pas avant la PR du LOT-00, mais après son merge (décision utilisateur). Conséquence à ne pas adoucir : **le lot n'est pas livré** — seule sa moitié *code* l'est (bloc de retrait dans la modale d'édition, `web/src/components/PacksPanel.tsx:635-649` sur l'instantané `:69`, `:187` ; `suspendus` servis à part des actifs par `web/src/app/api/praticien/questionnaires/route.ts:32,48,68-72`) ; sa moitié *donnée* reste due, et **le risque d'auto-assignation court jusqu'à ce geste**.
  2. **Le titre du lot est réécrit, parce qu'il n'était vrai que dans une position du drapeau.** « `Q_ALI_09` soudé au pack de base — un geste nécessaire est impossible » décrit exactement le dépôt (drapeau éteint) et **rien** de la production. Le titre retenu nomme les deux moitiés : « Q_ALI_09 dans le pack de base — auto-assigné à l'onboarding drapeau allumé, irretirable drapeau éteint ».
- Conséquences :
  - **« Suspendu » est un état de drapeau, pas une propriété de l'instrument.** `Q_ALI_09` est déclaré `actif: isAgendaAlimentaireEnabled()` (`web/src/lib/questionnaires-catalog.ts:83`), fonction qui lit `process.env.WN_AGENDA_ALI` (`web/src/lib/agenda-alimentaire/featureFlag.ts:36-37`), et `IDS_SUSPENDUS` est **dérivé** de `!q.actif` (`web/src/lib/questionnaires-catalog.ts:518-520`). L'appartenance bascule donc avec le drapeau — **allumé en production depuis le 2026-08-05** (`docs/claude/campagnes/2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:227-231`, « le drapeau a été allumé et le pilote lancé » ; variable créée côté Vercel en Production ce jour-là), **éteint dans le dépôt**, donc en CI, en local et sur les bancs.
  - **Donc un diagnostic écrit sur `IDS_SUSPENDUS` n'a pas la même valeur de vérité en production et dans le dépôt** — et il s'inverse : drapeau éteint, `web/src/app/api/portail/valider/route.ts:144-152` **ampute** le pack en silence ; drapeau allumé, il **ne fait rien** et le pack part entier, agenda compris. **Un document qui ne dit pas dans quelle position il se lit est faux la moitié du temps.** Le fait qui commande le lot est celui de la colonne allumée : le prochain patient onboardé reçoit l'agenda **sans décision praticien**, exactement ce que [[D-025]] protège. Fait rassurant et daté, à ne pas prendre pour une fermeture : **0 assignation créée depuis le 2026-08-06 18:02** — le risque est **prospectif**, pas réalisé.
  - **La moitié *code* du lot, elle, est indépendante du drapeau** : le geste de retrait vaut pour tout instrument réellement suspendu, sans drapeau pour le rallumer. C'est pourquoi elle se livre séparément sans mentir sur ce qui reste dû.
- Réserves :
  - **Un prérequis de runbook vérifié à l'allumage n'est re-vérifié par rien ensuite.** Celui de `WN_AGENDA_ALI` — « aucun pack ne référence `Q_ALI_09` » (`docs/claude/campagnes/2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:44-53`, `SELECT nom, par_defaut, actif FROM packs WHERE 'Q_ALI_09' = ANY(qids);`, attendu 0 ligne) — **était satisfait le 2026-08-05** à l'allumage, et a été **cassé le lendemain** par une écriture sur le pack de base (`packs.updated_at` = 2026-08-06 18:02:38.913, dérive documentée en [[D-032]]), **sans aucune alerte**. Le runbook ne repasse pas par ses prérequis une fois exécuté.
  - **Aucun contrat SQL de `web/prisma/checks/` n'assère « aucun pack actif ne référence un qid de `IDS_SUSPENDUS` ».** C'est l'assertion qui aurait mordu le 2026-08-06 à 18:02 — la seule qui transforme un prérequis vérifié une fois en invariant tenu en continu. Elle **reste sans lot ouvert** ; cette décision ne l'ouvre pas. Note de conception : un tel contrat doit se lire **dans la position du drapeau de l'environnement où il tourne**, sinon il rougirait en CI (drapeau éteint) sur un état parfaitement sain en production.
  - La garde `IDS_SUSPENDUS` de `PATCH /api/praticien/packs` ne prévient pas cette dérive : elle ne juge que les qids **ajoutés** (`web/src/app/api/praticien/packs/route.ts:307`, diff calculé contre l'existant) — ce qui est le choix qui rend le retrait possible, et n'est donc pas à affaiblir.
- Référence : `docs/claude/campagnes/2026-08-07-dettes-packs-residuelles/lots/LOT-00-pack-base-instrument-suspendu.md`, `docs/claude/campagnes/2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md`, [[D-025]], [[D-032]]

### D-032 — Une campagne se clôt sur ce qui est prouvé, et les dettes sans lot sont nommées comme telles

- Date : 2026-08-07
- Statut : accepté (arbitrages utilisateur du 2026-08-07, clôture du LOT-04 de la campagne `2026-08-06-packs-personnalises`)
- Domaine : produit et méthode (clôture de campagne, packs de questionnaires)
- Décision : trois arbitrages, pris ensemble à la clôture.
  1. **Le parcours E2E manquant part en lot nommé, et l'énoncé de campagne est réécrit pour ne dire que ce qui est prouvé.** Le fait 2 du « Résultat observable » annonçait un état de l'application ; les preuves disponibles sont **unitaires seulement** (`OrientationPanel.test.tsx`, `api/praticien/file-envoi/route.test.ts`, `.../envoyer/route.test.ts`) et la couverture E2E du parcours orientation → file d'envoi → envoi → déduplication est **nulle** (`grep -rn orientation web/e2e/` ne rend rien ; `dashboard-praticien.spec.ts:60-88` ne vérifie que le titre de colonne, le commentaire `:86` acceptant l'état vide et `:87` portant l'assertion ; `OrientationPanel` est monté par `TrajectoirePanel.tsx:255` mais aucune assertion ne le touche, et le bouton `OrientationPanel.tsx:345` n'est jamais cliqué). La campagne clôt donc sur la couverture existante, et le manque devient le LOT-01 de `2026-08-07-dettes-packs-residuelles` — jamais une extension du lot de clôture, dont le « Hors périmètre » exclut tout nouveau développement.
  2. **Le fait 2 est restreint par écrit au panneau d'orientation.** Le formulaire « Assigner un pack à un patient » de `PacksPanel.tsx:483-513` (`POST /api/praticien/packs/assign`) **reste en place**, nommé comme survivance assumée : depuis le retrait, il ne peut plus proposer que « Base de consultation ». Un énoncé de campagne qui aurait dit « plus aucun bouton d'assignation » aurait été faux à l'échelle de l'application.
  3. **Seule la dette `Q_ALI_09` reçoit un lot** (LOT-00 de la campagne suivante) : elle est clinique et active en production — **deux portes seulement** ferment le retrait de cet instrument suspendu du pack de base, vérifiées ligne à ligne : `web/src/app/api/praticien/questionnaires/route.ts:35` (`.filter(q => q.actif)` — aucune case à cocher n'expose le qid au praticien) et `PacksPanel.tsx:309-310` puis `:215` (l'écran d'édition recharge l'état stocké en entier, donc le qid repart à chaque sauvegarde). Les deux autres maillons souvent cités n'en sont pas : `packs/route.ts:306-309` **n'est pas une porte** — la garde ne porte que sur les qids **ajoutés** et ne bloque aucun retrait, ce qui est précisément la raison pour laquelle le pack n'est pas verrouillé (commentaire `:298-301`) ; et `portail/valider/route.ts:144-152` est la **conséquence** — l'amputation silencieuse, journalisée à chaque onboarding —, pas une porte. Les cinq autres dettes sont **nommées sans lot d'accueil** — voir Réserves.
- Conséquences :
  - **Un chiffre d'énoncé se relit contre la base — et un chiffre qui bouge est une dérive, pas une péremption.** Le fait 4 annonçait « 5 qids, `Q_SOM_09` inclus » ; la lecture SQL du 2026-08-07 en donne **6** (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_SOM_09`, `Q_ALI_01`, `Q_ALI_09`), avec `pack_questionnaires` aligné à 6 lignes. La première rédaction de cette décision en concluait que « le chiffre était périmé » : **c'est faux, et la preuve dit le contraire**. Le LOT-00 avait mesuré 5 qids **en production le 2026-08-06** et certifié « 8/8 packs en MATCH exact », « 5 lignes, ordres 0..4 sans trou » (`2026-08-06-packs-personnalises/lots/LOT-00-cadrage.md:90-91,119-123`) ; `packs.updated_at` porte **2026-08-06 18:02:38.913** — cet horodatage ne borne que la **dernière** écriture sur la ligne, pas celle qui a ajouté le qid. Ce qui est prouvé, et rien de plus : `Q_ALI_09` est entré dans le pack de base **pendant la campagne**, **entre la mesure du LOT-00 (2026-08-06) et 18:02:38.913**, dernière écriture connue — donc après cette mesure et **avant** que le garde `IDS_SUSPENDUS` sur `PATCH` (LOT-03, #604, 2026-08-07) n'existe. La lecture consignée en [[D-025]] (« Lecture du 2026-08-05 : aucun des 8 packs ne le référence ») corrobore : la dérive est **postérieure au 2026-08-05**. **L'auteur du geste est indéterminé** : aucune colonne d'audit ne le porte, aucun document de campagne ne le mentionne. Le fait 4 est donc **partiellement vérifié — dérive survenue et non prévenue** : l'invariant « registre = legacy » tient (6 lignes pour 6 qids, relu le 2026-08-07), la **non-dérive** est démentie. C'est nommément la réserve de [[D-025]] (« Aucun garde n'empêche `Q_ALI_09` d'entrer dans un pack… ») et le **point 4 de [[D-030]]**, qui portait ce garde au LOT-03 précisément parce qu'aucun endpoint ne le vérifiait.
  - **Une garde qui rend un défaut impossible remplace le log qui l'aurait constaté — dans le périmètre de la garde, pas au-delà.** Le fait 3 promettait une journalisation de la perte de cible ; elle aurait été verte en test et muette à vie, `packId` ne survivant que dans l'union de type. Substituée par `orientationRulesV1.test.ts:463` — aucune entrée de la table, publiée ou non, ne cible un pack (justification : `lots/LOT-03-integration.md:21-28`). **Ce banc ne porte que sur `suggestion.packId`** : l'énoncé se lit « la perte de cible **par pack** est rendue impossible ». Les **deux points de fail-closed silencieux** nommés par [[D-030]] écartent, eux, des cibles **questionnaire**, et restent **non instrumentés** — `web/src/lib/clinical/orientationEngine.ts:627` (si `suggestion.questionnaireId && estAdministrable(…)` est faux, `cibles` reste vide et rien n'est journalisé) et `web/src/lib/clinical/orientationService.ts:262-264` (filtrage muet sur `estAdministrableParLaRoute`). Dette écrite, sans lot.
- Réserves :
  - **Cinq dettes sont nommées sans lot d'accueil, et c'est un choix, pas un oubli — mais le décompte annoncé d'abord (« trois ») était faux.** `2026-08-06-packs-personnalises/lots/LOT-03-integration.md:203-213` en datait **cinq** ; trois avaient disparu du diff de clôture. Rétablies, le compte passait à six ; il redescend à cinq, la dette « seed à 5 qids » étant **rattachée au périmètre du LOT-00** de `2026-08-07-dettes-packs-residuelles`. Les cinq : (a) `prisma/seed.ts` **ne répare pas un pack de base cassé** — `web/prisma/seed.ts:288-294`, `upsert({ where: { idPack }, update: {}, create: PACK_BASE })` sous `if (!parDefautExistant)`, no-op silencieux **suivi d'un message de succès faux** (« Pack par défaut créé »), alors que `web/src/app/api/praticien/packs/route.ts:92-94` note que sans `parDefaut: true` **et** `actif: true` tout onboarding rend 404 sans chemin de réparation par l'UI — miroir exact de la dette (c) ; (b) `resolvePackQuestionnaireIds` (`web/src/lib/consultation/packRegistry.ts:89-123`) ne lit jamais `questionnaire_packs.actif`, et le retrait vient d'**armer sa condition de déclenchement** (7 lignes sur 8 à `false`) — piège pour le jour d'une bascule du registre en source primaire ; (c) aucun chemin praticien ne réactive un pack — `PATCH { actif: true }` est accepté par la route, aucun écran ne l'envoie : `PacksPanel.tsx` porte **quatre** appels mutants sur `/api/praticien/packs`, le `POST` de création (`:177-181`), le `PATCH` d'édition (`:207-217`, dont le payload `:210-216`), le `DELETE` (`:238`) et le `PATCH { idPack, parDefaut }` (`:254-257`) — **aucun des quatre ne porte `actif`**, et c'est cela qui prouve qu'aucun écran ne réactive un pack. Le cinquième appel mutant du composant, `POST /api/praticien/packs/assign` (`:281`), vise **une autre route** — c'est le formulaire d'assignation nommé au point 2 ; (d) le commentaire de `web/prisma/schema.prisma:155-156` cite encore le pack en **capitales**, la casse même qui avait tué le repli de `resoudrePackBase` ; (e) la suture `suggestedPackSelection` est laissée inerte (`web/src/components/PatientsPanel.tsx:902`, prop `:1033`, consommateur `web/src/components/PacksPanel.tsx:80-106`). **Piège de lecture** : LOT-03 nommait « `seed.ts` ne répare pas un pack de base cassé », la première rédaction de la clôture nommait « `seed.ts:270` porte 5 qids » — **deux défauts distincts sous le même mot `seed`**, traiter le second ne traite pas le premier. Aucune des cinq n'a d'effet clinique observable aujourd'hui ; ouvrir un lot par dette latente rouvrirait la campagne qu'on clôt. Elles sont écrites dans `lots/LOT-04-validation.md` pour être retrouvées.
  - **Le LOT-00 de `2026-08-07-dettes-packs-residuelles` n'est pas seulement clinique : il débloque une campagne en cours.** `2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:44-53` fait de « **Aucun pack ne référence `Q_ALI_09`** » un **prérequis bloquant** de l'allumage de `WN_AGENDA_ALI` (`SELECT nom, par_defaut, actif FROM packs WHERE 'Q_ALI_09' = ANY(qids);`, attendu 0 ligne) : c'est **le seul chemin qui assignerait l'agenda sans clic praticien**, `assignPackToPatient` — appelé par l'onboarding portail — n'écartant que `IDS_SUSPENDUS`, et rien ne validant les `qids` d'un pack contre cette liste. La production rend aujourd'hui **1 ligne**, le pack de base. Le retrait de `Q_ALI_09` est donc **requis, pas à arbitrer** ; et tant que la ligne existe, allumer `WN_AGENDA_ALI` auto-assignerait l'agenda à chaque patient onboardé **sans décision praticien** — exactement ce que [[D-025]] protège.
  - La garde générale appelée par les réserves de [[D-031]] — un banc distinguant porte constitutive et voie d'entrée suffisante — **reste sans lot ouvert** ; cette décision ne l'ouvre pas.
- Référence : `docs/claude/campagnes/2026-08-06-packs-personnalises/lots/LOT-04-validation.md`, `docs/claude/campagnes/2026-08-07-dettes-packs-residuelles/CAMPAGNE.md`, [[D-030]], [[D-031]]

### D-031 — Une porte posée par une règle ne se contourne pas par une cible ajoutée ailleurs

- Date : 2026-08-07
- Statut : accepté (arbitrage praticien du LOT-02, campagne `2026-08-06-packs-personnalises`, PR #599 ; formalisé après le NO-GO de la passe adversariale `wn-reviewer` sur la première rédaction du re-ciblage)
- Domaine : produit et clinique (orientation)
- Décision : quand le critère d'une règle d'orientation est ce qui **rend l'instrument indiqué** — et non l'une de plusieurs voies d'entrée suffisantes vers lui —, ce critère est une **porte**, et l'instrument ne s'atteint pas ailleurs sans elle. Ajouter ce même instrument comme cible d'une **autre** règle, sans y reporter la porte, élargit l'indication en silence. Plusieurs règles peuvent en revanche atteindre légitimement un même instrument par des versants cliniques distincts, chacun se suffisant : `R2-SOM-01` (`SOMMEIL <= 14`) et `R2-SOM-02` (`Q_MOD_03/sommeil >= 7`) proposent toutes deux le PSQI, et le moteur les agrège en une recommandation à deux motifs. **Cette distinction est tenue à la relecture, par aucun mécanisme général** (voir Réserves).
- Le cas qui l'a produit : `R2-SOM-04` conditionne le dépistage d'apnées du sommeil (questionnaire de Berlin) à la conjonction d'un **antécédent respiratoire déclaré** et d'un **sommeil contextuel dégradé** (`Q_MOD_01/SOMMEIL <= 14`) — l'antécédent seul ne suffit pas, une apnée appareillée et équilibrée n'appelant pas de dépistage. Lors du re-ciblage des 6 règles à `packId` vers des suggestions `questionnaireId`, Berlin avait été proposé comme cible de `R2-SOM-05` — sur l'attente de sommeil déclarée **et** la mesure (`SOMMEIL <= 8`, plus strict que le `<= 14` de `R2-SOM-04`), mais **sans l'antécédent respiratoire**, la seule pièce manquante. **Aucune ligne de code n'était fausse** : les deux règles étaient valides prises séparément, et une revue de diff ne pouvait pas voir le défaut. La passe adversariale `wn-reviewer` a rendu NO-GO ; l'arbitrage praticien a retenu `R2-SOM-05 → PSQI + Horne`, Berlin retiré.
- Deux motifs de retrait, pas un : Berlin et Epworth ont d'abord été écartés de `R2-SOM-05` parce que **`WN-CL-0178-017` ne les nomme pas** — les proposer là les aurait fait reposer sur un claim qui ne les couvre pas. **Ce motif n'est tenu par aucun banc** : la correspondance entre un instrument proposé et ce que ses claims nomment n'est lisible que par un humain — réserve de [[D-018]], `rag_corpus_claims` vit en base, qu'aucun test unitaire n'ouvre. Ce que le sha épinglé de [[D-018]] garantit, c'est seulement qu'une table modifiée **rougit le CI** jusqu'à ce que quelqu'un ré-épingle le littéral ; que ce geste s'accompagne d'une relecture des claims et d'une nouvelle `dateValidation` est une procédure, pas un mécanisme — les deux littéraux sont épinglés séparément, et aucun banc ne les relie. Le contournement de porte s'ajoutait pour Berlin seul. **D-031 traite ce second motif** : la couverture par les claims ne dit rien des portes des règles voisines.
- Conséquences :
  - **Corollaire, du même ordre** : une composition de remplacement se choisit sur ce que **les claims de la règle** nomment, pas sur ce que **le pack remplacé** contenait. Reprendre le contenu d'un pack parce qu'il était là est un raisonnement d'inventaire, pas un raisonnement clinique.
  - **Le geste attendu** : avant d'ajouter une cible à une règle d'orientation, relire les portes des règles voisines qui nomment le même instrument. Si l'instrument est gardé quelque part, son arrivée ailleurs porte la même garde, ou ne se fait pas.
- Réserves :
  - **D-031 est un énoncé, pas une garde exécutable.** Hors le cas de Berlin, épinglé nommément par `orientationRulesV1.test.ts:875,912`, rien n'empêche mécaniquement d'ajouter une cible qui contourne une porte voisine : une mutation posant `Q_SOM_03` sur une règle qui ne s'allume pas sous les fixtures de ce banc — `R2-SOM-03` (rythme biologique) ou `R2-SOM-06` (fatigue) — n'est nommée par **aucun banc de contenu** : seuls rougissent le sha épinglé (`orientationRulesV1.test.ts:144`), qui rougit pour toute édition de la table sans rien dire de la porte, et le banc `:912` si la règle mutée s'allume sous ses fixtures. C'est le cas de `R2-SOM-01` et `R2-SOM-05`, attrapées nommément par l'égalité stricte de `orientationRulesV1.test.ts:918-919,922-923` ; `R2-SOM-03` et `R2-SOM-06` ne s'allument pas là, et aucun banc ne les nomme. **Aucun mécanisme ne signale au re-signataire qu'une porte vient d'être franchie.** Une garde **générale** — un banc distinguant porte constitutive et voie d'entrée suffisante, puis refusant la première sans sa condition — **reste à porter par un lot nommé, non encore ouvert** : le « Hors périmètre » du LOT-04 de cette campagne exclut « tout nouveau développement », un manque découvert là devenant « un lot nommé, pas une extension de ce lot ».
  - La distinction posée par cette décision **n'est pas testable en l'état** : la table ne marque nulle part, sur la règle elle-même, quel déclencheur est constitutif de l'indication. C'est cette marque, avant le banc, que le lot à ouvrir doit poser.
  - **Écart assumé à la pratique de [[D-028]]** : deux renvois inverses sont posés dans [[D-030]] et [[D-018]], datés et attribués à D-031, à la demande de l'utilisateur. La datation est le compromis — l'ajout se lit comme un ajout, jamais comme du texte d'origine.
- Référence : `docs/claude/campagnes/2026-08-06-packs-personnalises/lots/LOT-02-implementation.md`, `web/src/lib/clinical/orientationRulesV1.ts`, [[D-030]], [[D-018]]

### D-030 — Un seul pack actif : le geste d'envoi personnalisé remplace l'assignation figée

- Date : 2026-08-06
- Statut : accepté (arbitrages utilisateur du 2026-08-06, session de cadrage de la campagne `2026-08-06-packs-personnalises`, formalisés ici sur pièces d'inventaire — LOT-01 ; corrigé après revue adversariale `wn-reviewer`, NO-GO du 2026-08-06 sur la première rédaction — 32/34 citations exactes, correctifs appliqués ci-dessous)
- Domaine : produit et clinique (orientation), praticien
- Décision : trois arbitrages, plus un geste de garde porté au LOT-03.
  1. **Le second pack créé par le praticien, hors doctrine — « Florence 1 » (`PACK_b8sda7asd-h_B8x8061uORhc`) —, est désactivé, en plus des 5 packs de doctrine actifs.** « Base de consultation » (`PACK_-bG21yeIvVYRhrdlYuWIMnFz`, `par_defaut:true`), le premier pack praticien, **n'est jamais désactivée** : c'est elle qui reste seule active. Total : 6 packs désactivés (`PACK_SOCLE_INIT`, `PACK_SOMMEIL_CHRONO`, `PACK_STRESS_BURNOUT`, `PACK_DIGESTIF_INTESTIN`, `PACK_CARDIO_METABO`, « Florence 1 »). `PACK_HUMEUR_NEURO` était déjà inactif. Après retrait (LOT-03) : 1 pack actif sur 8, 7 en historique.
  2. **Le geste d'envoi depuis l'orientation est l'ajout à la file d'envoi** (`POST /api/praticien/file-envoi`, puis `POST /api/praticien/file-envoi/envoyer`), pas l'assignation directe d'un pack (`POST /api/praticien/packs/assign`). Le chemin de remplacement existe déjà et n'est pas construit par cette campagne : dédup, plafond 60 qids, un seul mail récapitulatif — même patron que `packs/assign` (commentaire `web/src/app/api/praticien/file-envoi/envoyer/route.ts:26`).
  3. **Cette campagne devient l'activité primaire** ; la reprise des dettes 5.0 (LOT-06/LOT-07) attend sa clôture.
  4. **Un garde `IDS_SUSPENDUS` sur `POST`/`PATCH /api/praticien/packs` est porté au LOT-03** (détail en Réserves) — aucun des deux endpoints ne le vérifie aujourd'hui.
- Ce que l'inventaire du LOT-01 établit, et qui fonde ces arbitrages : les 6 règles d'orientation à `packId` (`R2-SOM-05`, `R2-STR-02`, `R2-GAS-02`, `R2-ALI-01`, `R-STR-02`, `R-GAS-01` — `orientationRulesV1.ts`) ciblent 3 packs, tous les trois parmi les 5 packs de doctrine désactivés par le point 1 : elles perdent donc **toutes** leur seule cible, silencieusement, dès l'application du retrait. Aucun mécanisme de repli intra-règle n'existe (type `OrientationSuggestion`, union stricte, `orientationRulesV1.ts:118`) — composer des cibles `questionnaireId` de remplacement est un geste clinique du LOT-02, pas une correction de code, et il exige la re-signature D-018 (relire les claims, poser une nouvelle `dateValidation`, épingler un nouveau sha — le littéral `SHA_SIGNE_2026_08_04` d'`orientationRulesV1.test.ts:105` rougira sinon).
- Conséquences :
  - **`PackProposition` (`schema.prisma:1347`) reste un modèle vivant**, pas « sans objet » comme le texte initial du lot le supposait. Écrivain runtime confirmé : `api/portail/pack-reevaluation/route.ts:173` (`create`, statut `acceptee`/`declinee`, acteur `patient`), purgé par l'effacement RGPD (`lib/patient/effacement.ts:101`). **0 ligne en production au 2026-08-06** (lecture SQL `SELECT count(*) FROM pack_propositions`). Il survit au retrait puisque « Base de consultation » reste une cible valide de proposition.
  - **Toute modification des 6 règles à `packId` exige la re-signature D-018**, geste distinct du code du LOT-02 et tracé comme tel — pas un correctif silencieux du sha épinglé.
  - **La perte de cible d'une règle devra être journalisée** (LOT-03) : recherché explicitement dans `eventCodes.ts`, aucun code d'événement n'existe aujourd'hui pour ce cas — seuls les **5** codes `ASSIGNATION_PACK_*` (`web/src/lib/observability/eventCodes.ts:77-80,86` — payload invalide, résolution échouée, e-mail échoué, exception, instrument suspendu ; `ASSIGNATION_DEJA_ASSIGNE_ECARTE` à `:90` est un code voisin, sans le préfixe `PACK`) et `PACK_REGISTRE_REPLI_LEGACY` (`:124`, repli du registre relationnel) sont déclarés. Il y a en réalité **deux points de fail-closed silencieux** à instrumenter, pas un : le moteur (`orientationEngine.ts:571-587,621-632`) et le service, en sortie, inconditionnel (`orientationService.ts:260-269`).
  - **Les packs désactivés restent visibles en historique, sans réactivation possible par l'UI.** `GET /api/praticien/packs` (`route.ts:63-70`) ne filtre pas `actif` — les 7 packs retirés continuent d'apparaître, badge « Inactif », dans `PacksPanel.tsx`. `PATCH` accepte pourtant `actif` (`packs/route.ts:181`) : une réactivation reste possible par appel API direct, jamais par un geste UI. C'est une dette assumée, pas une régression du retrait — aucune UI de réactivation n'était demandée.
  - Cette classe de défaut — « aucun garde n'empêche un instrument suspendu d'entrer dans un pack », déjà nommée en [[D-025]] (réserve « Aucun garde n'empêche `Q_ALI_09` d'entrer dans un pack », et le constat contigu « aucun des 8 packs ne le référence » — cités par leur phrase, pas par un numéro de ligne : ce fichier s'append en tête et décale toute référence à chaque nouvelle décision) — **est réduite, pas fermée : le chemin de création reste ouvert.** Rien ne retire `POST /api/praticien/packs` (`packs/route.ts:86,102`), et `normaliserQids` (`:52-60`) ne consulte pas `IDS_SUSPENDUS` : un pack créé avec un instrument suspendu puis marqué `parDefaut` s'auto-assignerait à chaque onboarding, exactement le scénario que la réserve de [[D-025]] décrivait. D'où le point 4 de la décision.
- Réserves :
  - **La composition de remplacement des 6 règles n'est pas encore arbitrée cliniquement** — le LOT-01 propose des candidats tirés de la composition SQL réelle des 3 packs (voir la matrice de ce lot), mais le choix final, l'objectif rédigé et la re-signature restent un acte praticien du LOT-02.
  - **L'asymétrie du repli `pack-reevaluation`** (pack déjà rempli désactivé → repli sur `parDefaut` ; pack déjà rempli actif mais vide → aucune proposition, pas de repli — `packReevaluation.ts:47-49`) reste à trancher au LOT-03. Elle est qualifiée acceptable en l'état car le seul pack jamais écrit dans `consultations.id_pack_assigne` est le pack de base (15 lignes, lecture SQL du 2026-08-06), qui reste actif après retrait.
  - **Le repli par nom de `resoudrePackBase` (`valider/route.ts:24,28-31`) est mort, pas un filet.** `NOM_PACK_BASE = 'BASE DE CONSULTATION'` (majuscules) alors que le nom réel en base est « Base de consultation » ; l'égalité Prisma/PostgreSQL est sensible à la casse — ce repli ne peut jamais s'exécuter. Si le pack `parDefaut` disparaissait ou perdait sa marque, `resoudrePackBase` renverrait `null` et `portail/valider` échouerait, sans filet réel. **Aggravant : `PATCH /api/praticien/packs` (`packs/route.ts:182,191-193`) accepte `parDefaut` sur n'importe quel pack, actif ou non, sans aucune garde** — rien n'empêche de démarquer « Base de consultation » par erreur. Geste porté au LOT-03 (point 4 de la décision) : recherche insensible à la casse, ou garde interdisant de désactiver/démarquer le pack `parDefaut`.
  - **Le bloc « Packs suggérés » de `PatientsPanel.tsx`** (`packsRecommandes`, `questionnaires-functional.ts:78,209-268` → `api/praticien/questionnaires/registry/route.ts:8,25` et `api/praticien/questionnaires/route.ts:45` → `PatientsPanel.tsx:272,288,750,900-928`) n'a pas été retiré par ce lot documentaire : après le retrait effectif (LOT-03), ses boutons continueront de citer des packs désactivés et d'aboutir à un message d'échec — porte du parcours à fermer au LOT-03.
  - **Le sens de `dejaAssigne`/`dejaCouvert`/`dejaRepondu` change quand une cible pack devient N cibles questionnaires** (`orientationEngine.ts:655-665` : pour un pack, `dejaAssigne` est un `every` sur toute la composition ; pour un questionnaire, c'est l'item seul). Le panneau d'orientation passe alors de 1 ligne par règle à 5-8 lignes — arbitrage UX/clinique à trancher au LOT-02.
  - **L'absorption comme regroupement disparaît avec le retrait des cibles pack** (le report « via Q_GAS_01 : … », `orientationEngine.ts:769-772`) : `R2-GAS-01` et le remplacement de `R2-GAS-02` dédupliqueront alors en une seule ligne, là où l'un absorbait l'autre — acceptable, à valider au LOT-02.
  - **`packsTransmis` (`synthese/route.ts:97,361,414` ; prompt `anthropic.ts:326`) deviendra structurellement vide.** À vérifier au LOT-02 si un bloc vide se lit, côté modèle, « aucun pack recommandé » (correct) ou « bloc absent » (silence trompeur).
- Référence : `docs/claude/campagnes/2026-08-06-packs-personnalises/CAMPAGNE.md`, `docs/claude/campagnes/2026-08-06-packs-personnalises/lots/LOT-01-socle.md` (matrice d'inventaire, section « Résultats »), [[D-018]], [[D-025]] ; renvoi ajouté le 2026-08-07 par [[D-031]] : le re-ciblage des 6 règles **rendu nécessaire par ce retrait, et arbitré au LOT-02**, est borné par [[D-031]] — une cible ajoutée ne contourne pas la porte d'une règle voisine.

### D-029 — Un repli d'accès sans session se retire, il ne se patche pas, une fois la reprise prouvée

- Date : 2026-08-05
- Statut : accepté
- Domaine : sécurité et authentification patient
- Décision : les 6 routes `api/patient/*` qui acceptaient un accès sans cookie de session (repli email + `idAssignation`, hérité du parcours legacy `/patient/[idAssignation]`) n'acceptent plus que la session portail `wn_portail` — alignées sur `api/patient/protocole`, déjà écrite ainsi. Le repli avait un défaut vivant (ne relisait jamais `patients.actif`/`accessTokenRevoked` : un patient révoqué gardait un accès complet), mais **le corriger n'a pas été retenu comme réponse suffisante** : une fois `/patient/[idAssignation]` redirigé vers `/portail/connexion` ([[D-002]]), plus aucun appelant légitime n'atteint ces routes sans session — patcher le repli aurait laissé debout une surface d'attaque sans usage. Le retrait n'a été posé qu'**après** vérification empirique (logs d'exécution Vercel, hors dépôt) que la cible de reprise (`/portail/connexion` — lien magique, Google, jeton) fonctionne réellement en production : retirer un chemin d'accès sans prouver d'abord que son remplaçant marche aurait échangé un risque de sécurité contre un risque de disponibilité.
- Conséquences : règle générale pour tout futur retrait d'un chemin d'accès patient hérité — (1) mesurer l'usage réel, (2) prouver que le chemin de remplacement fonctionne en production, **puis seulement** (3) retirer plutôt que patcher un repli faible. Un correctif qui referme un trou de sécurité sans retirer la surface qui le portait n'est qu'une étape intermédiaire, pas une clôture. Le répertoire `web/src/app/patient/[idAssignation]/` reste dans le dépôt (page inatteignable, marquée datée) ; son retrait physique est un lot distinct, subordonné à la vérification que le portail couvre le consentement RGPD et la consultation de réponses verrouillées que la page legacy portait aussi.
- Référence : campagne `2026-08-05-cloture-des-dettes-wellneuro-5-0`, LOT-04 (`docs/claude/campagnes/2026-08-05-cloture-des-dettes-wellneuro-5-0/lots/LOT-04-validation.md`), `changelog.d/2026-08-05-parcours-patient-unique.md`, [[D-002]], [[D-028]]
### D-028 — Le drapeau atteint l'écran par un provider de page, jamais par la route qui refuse de le lire

- Date : 2026-08-05
- Statut : accepté (**ferme la réserve nommée « L'écran ne dit pas que le recueil est fermé » de [[D-027]]**, le reste étant intact). [[D-027]] n'est pas retouché — une décision est un enregistrement daté, et c'est à celle-ci de nommer ce qu'elle déplace, exactement comme [[D-027]] l'a fait pour [[D-025]].
- Domaine : exploitation (transport d'un drapeau jusqu'à une surface client). **Sans effet clinique** : l'instrument est non scoré, et rien ici ne conditionne un accès.
- Décision : le panneau praticien de l'agenda alimentaire **dit** la position de `WN_AGENDA_ALI` par une bannière — « Recueil fermé — le patient ne peut plus noter de journée. Les journées déjà notées restent lisibles ici. » — et la position lui parvient par un **provider de page** (`AgendaAliFeatureProvider`, monté dans `dashboard/patients/[idPatient]/page.tsx`, composant serveur), **jamais** par un champ ajouté à la réponse de `GET /api/praticien/agenda-alimentaire`.
- **Ce qui a été écarté, et pourquoi.** Un champ `recueilOuvert` dans la réponse de la route était la voie évidente. Elle oblige à appeler `isAgendaAlimentaireEnabled` **dans la route même dont le commentaire interpelle nommément le relecteur tenté de le faire** et exige « de repasser par une décision qui rouvre ce point ». *Rapporter* n'est pas *garder* — mais l'appel est le même, à une ligne près de devenir un `if` qui referme un lecteur append-only. Le provider rend le même service sans poser cette ligne : [[D-027]] tient tout entier, sans être rouvert.
- **Le motif n'est pas nouveau, il était déjà dans le fichier.** `C5FeatureProvider` (`components/patient-cockpit/C5FeatureProvider.tsx`, treize lignes) fait exactement cela pour `WN_C5_ENABLED`, deux lignes au-dessus du point de montage, et son consommateur profond `ClinicalRuntimeSection` lit `useC5Enabled()`. Réutiliser un motif présent coûtait moins qu'ouvrir une route gardée par un commentaire.
- Conséquences :
  - **Le contexte est à TROIS états, et son défaut est `null` — pas `false`.** Le réflexe fail-closed vient des *gardes* : refuser par défaut ne coûte qu'un accès, et c'est la bonne doctrine pour `isAgendaAlimentaireEnabled` lui-même. Ce contexte ne garde rien, il alimente un **énoncé** — « Recueil fermé, le patient ne peut plus noter de journée ». Le drapeau étant **allumé en production** ([[D-025]]), un défaut `false` serait la valeur fausse cent pour cent du temps : un provider oublié sur un futur point de montage afficherait en silence une affirmation fausse sur l'état d'un dossier. `null` signifie « position inconnue » et le panneau n'affirme alors rien — se taire quand on ne sait pas est le seul défaut qui ne ment jamais. Le rendu teste `=== false`, jamais `!drapeau`, qui aplatirait les trois états en deux.
  - **Le câblage réel est épinglé par un test**, plutôt que compensé par un défaut : `web/src/app/dashboard/patients/[idPatient]/page.test.tsx` vérifie que la page monte le provider et l'alimente depuis `isAgendaAlimentaireEnabled`, jamais depuis une constante. Vérifié par mutation — `enabled={true}` en dur fait passer le test au rouge.
  - **L'état vide du panneau n'est pas touché.** [[D-027]] l'a rendu descriptif exprès (« un écran ne doit pas proposer un geste impossible ») ; une bannière par-dessus « aucun agenda assigné » n'ajouterait rien. La bannière n'apparaît qu'avec au moins un épisode.
  - Aucune surface patient ne change, aucune garde d'accès n'est ajoutée ni retirée.
- Réserves :
  - **Rien ne mesure la position du drapeau côté dépôt** — réserve de [[D-025]] et [[D-027]], non levée. La bannière *dit* le drapeau, elle ne le *vérifie* pas : un drapeau mal positionné produit une bannière fausse, dans un sens comme dans l'autre.
  - **Un second point de montage du panneau devra penser au provider.** Il n'y en a qu'un aujourd'hui (`FichePatientPanel`). Le défaut `null` fait qu'un oubli produit un panneau **muet** sur l'état du recueil — l'état d'avant ce lot, pas une contre-vérité. C'est le moins mauvais des deux échecs, ce n'est pas une absence d'échec.
  - **L'argument explicite `isAgendaAlimentaireEnabled(process.env.WN_AGENDA_ALI)` au point de montage est décoratif**, et il ne faut pas croire le contraire. La fonction est déclarée `(value = process.env.WN_AGENDA_ALI)` : une faute de frappe sur le nom de la variable rend `undefined`, ce qui **déclenche le paramètre par défaut** — donc relit la bonne variable et produit le même verdict. Vérifié par mutation le 2026-08-05. Aucun test ne peut donc couvrir ce nom-là, et le même angle mort vaut pour `isC5Enabled(process.env.WN_C5_ENABLED)` deux lignes plus haut. Ce qui protège vraiment le nom de la variable est ailleurs : la position du drapeau se lit en production, jamais dans le dépôt — réserve ci-dessus.
- Référence : [../web/src/components/agenda-alimentaire/AgendaAliFeatureProvider.tsx](../web/src/components/agenda-alimentaire/AgendaAliFeatureProvider.tsx), [../web/src/app/dashboard/patients/[idPatient]/page.tsx](../web/src/app/dashboard/patients/%5BidPatient%5D/page.tsx), [claude/campagnes/2026-08-04-agenda-alimentaire/lots/LOT-08-le-recueil-dit-son-etat.md](claude/campagnes/2026-08-04-agenda-alimentaire/lots/LOT-08-le-recueil-dit-son-etat.md), [[D-015]], [[D-025]], [[D-027]]

### D-027 — Le drapeau ferme ce qui s'écrit, pas ce qui se relit : la lecture praticien de l'agenda n'est pas gardée

- Date : 2026-08-05
- Statut : accepté (arbitrage praticien en session — **amende la conséquence « l'extinction referme toutes les surfaces » de [[D-025]] et ferme sa réserve « aucun lecteur praticien des journées n'existe »**, le reste étant intact). [[D-025]] n'est pas retouché : une décision est un enregistrement daté, et c'est à celle-ci de nommer les deux points qu'elle déplace.
- Domaine : exploitation (portée du drapeau). **Sans effet clinique** : l'instrument est non scoré, et la lecture n'en produit aucun.
- Décision : **`WN_AGENDA_ALI` ne garde pas la route `GET /api/praticien/agenda-alimentaire` ni le panneau qu'elle alimente.** La conséquence de [[D-025]] se lit désormais : l'extinction referme toutes les surfaces **d'écriture et d'exposition patient** — bibliothèque praticien, sélecteur, route d'assignation, hub, saisie, `patient/submit`. Elle ne referme pas la **lecture au dossier**. Trois constats la fondent, et le troisième est celui qui décide.
  1. **L'extinction n'efface rien.** Le modèle est append-only ([[D-015]]), et [[D-025]] le consigne lui-même : « éteindre referme les assignations mais n'efface pas les journées notées ; un pilote lancé laisse une trace en base après extinction ». Une donnée qui survit à l'extinction et un lecteur qui ne lui survit pas forment un état où la donnée existe sans porte.
  2. **Le drapeau ne protège aucune isolation de données**, et [[D-025]] l'établit : il ne décide que de **quel déploiement affiche la surface**. Le retirer de la lecture ne retire donc aucune protection — il retire une coïncidence.
  3. **Le moment où ce lecteur compte le plus est exactement celui où le drapeau serait éteint.** Un recueil de 21 jours se calibre **après** sa clôture, et la clôture est précisément ce qui rend l'extinction souhaitable. Garder le lecteur derrière le drapeau reviendrait à fermer la porte le jour où l'on entre — et à renvoyer `LOT-06` vers `execute_sql`, c'est-à-dire vers la dette que ce lot ferme.
- **Ce que la lecture reste gardée par**, et qui est plus fort que le drapeau : une session praticien (`getServerSession`), puis `verifierAppartenancePatient` — appelée **avant la première lecture Prisma**, et qui écrit le journal d'accès dossier (G-TRUST-04). Le drapeau n'a jamais été un contrôle d'accès ; ces deux-là le sont, et ils sont nominatifs quand il est global.
- Conséquences :
  - La route répond drapeau éteint, et **un test le nomme** plutôt que de le laisser à l'absence de code : sans lui, un relecteur futur « corrigerait » l'absence de garde. La raison est aussi écrite en commentaire au-dessus de la route.
  - Aucune surface patient ne change. Le patient dont l'agenda est éteint ne voit rien de plus ; c'est le praticien, sur un dossier qui lui appartient, qui relit ce qui a déjà été saisi.
  - La réponse porte un compte `illisibles` distinct des journées actives — les lignes en quarantaine se comptent au dossier, elles ne se taisent pas.
- Réserves :
  - **L'écran ne dit pas que le recueil est fermé.** Le panneau ne lit pas la position du drapeau : un praticien peut donc relire un agenda que le patient ne peut plus alimenter, sans que rien ne l'indique. Faire dépendre le lecteur du drapeau qu'il refuse justement de lire a été écarté ; le dire par une bannière reste possible et n'est pas fait. Pour la même raison, l'état vide du panneau (aucun agenda assigné) a été rendu **descriptif**, sans impératif : drapeau éteint, `IDS_SUSPENDUS` retire `Q_ALI_09` à la fois de la bibliothèque et de la route d'assignation, si bien que le geste « Assignez l'instrument » que l'écran nommait auparavant n'existe alors nulle part — un écran ne doit pas proposer un geste impossible.
  - **Sous sept journées, `calculerAgregatsAli` rend `null`** (`MIN_JOURS_AGREGATS`). Le panneau l'affiche en toutes lettres — « couverture insuffisante — N/7 » — parce qu'une zone vide serait le même signal trompeur que [[D-025]] reproche à la bibliothèque. Le pilote en cours est dans ce cas, à une journée sur vingt et une.
  - **Rien ne mesure la position du drapeau côté dépôt**, réserve déjà portée par [[D-025]] et inchangée : cette décision ne la lève pas, elle la rend seulement moins coûteuse — un drapeau mal positionné ne rend plus la donnée illisible.
- Référence : [../web/src/app/api/praticien/agenda-alimentaire/route.ts](../web/src/app/api/praticien/agenda-alimentaire/route.ts), [../web/src/components/agenda-alimentaire/AgendaAlimentairePraticienPanel.tsx](../web/src/components/agenda-alimentaire/AgendaAlimentairePraticienPanel.tsx), [claude/campagnes/2026-08-04-agenda-alimentaire/lots/LOT-05-dossier-de-controle-et-lecteur-praticien.md](claude/campagnes/2026-08-04-agenda-alimentaire/lots/LOT-05-dossier-de-controle-et-lecteur-praticien.md), [[D-015]], [[D-022]], [[D-025]]

### D-026 — Ce que le patient lit est un instantané de l'envoi, pas le champ vivant

- Date : 2026-08-05
- Statut : accepté
- Domaine : produit et clinique
- Décision : la page « Mon bilan » du portail sert `booklet_envois.note_transmise`, figé au moment de l'envoi et nul sur toute ligne d'échec — **jamais** `syntheses_ia.notes_praticien`, qui reste modifiable après un envoi réussi. La visibilité se fonde sur un `BookletEnvoi` de statut `Envoye`, jamais sur le statut de la synthèse : un praticien valide souvent avant de décider s'il envoie.
- **L'absence de garde sur `annoter` est un choix, pas une dette.** Une garde symétrique de celle d'`effacer` — refuser dès qu'un envoi existe — paraissait la réponse évidente, et elle est fausse : le renvoi corrigé (`forceSend`, opération `Renvoi`) consiste **précisément** à corriger une note puis à la renvoyer. La garde aurait interdit le geste qu'elle prépare. C'est l'instantané qui ferme le défaut, et un renvoi en écrit un frais.
- **L'envoi accorde la visibilité, le rejet la retire.** Sans cette soupape, un praticien qui s'aperçoit après coup qu'il a transmis un bilan erroné n'aurait aucun recours : `effacer` est refusé dès qu'un envoi existe, et « Rejeter » resterait sans effet sur ce que le patient lit. Le seul moyen serait d'en envoyer un autre.
- **Une règle de visibilité s'écrit une fois.** `whereEnvoiVisible` (`lib/documents/bilanPatient.ts`) est l'unique définition, servie à la page comme au hub. Les deux avaient déjà divergé — le hub proposait « Consulter mon bilan » après un rejet, vers une page répondant « ne vous a pas encore transmis ». Même classe que les PR #546/#552 : une liste dérivée d'une carte partagée, jamais deux copies d'un prédicat.
- Conséquences :
  - **Un backfill s'appuie sur un invariant, pas sur un comptage.** La condition `updated_at <= date_envoi` ne recopie que les envois dont la synthèse n'a provablement pas bougé ; les autres restent nuls — un manque visible, jamais un texte présenté comme transmis alors qu'il ne l'a pas été. Une mesure prise à la relecture ne dit rien de l'état au déploiement, et l'action qui pourrait l'invalider est justement celle qu'on laisse ouverte.
  - **L'accès au document et l'avancement de la frise sont deux signaux.** Les servir depuis le même prédicat faisait reculer le parcours patient de « restitution disponible » à « votre praticien les prépare », contre l'invariant « jamais rétrograde » de `lib/trajectoire-partagee/contrat.ts`. L'envoi a eu lieu : l'historique le garde acquis, seul l'accès suit le rejet. `bilanConsultable` implique `bookletEnvoye`, jamais l'inverse. Après le rejet du dernier bilan, un envoi antérieur dont la synthèse reste valide **redevient visible** — il n'a jamais été repris au patient.
  - **Le narratif, lui, n'est pas snapshotté.** Il n'est figé que par le refus d'`enregistrer` sur toute synthèse qui n'est plus un brouillon — un invariant qui vit dans une **autre** route. Épinglé par un test depuis ce lot ; il ne l'était par rien avant.
  - **Un refus d'accès à un document clinique laisse une trace** (`logger.security` sur les deux refus), et le refus opposé à un compte révoqué rend `403` et non `401` : le client cessait d'afficher un motif et renvoyait vers le gate, qui refusait à son tour.
- Réserves :
  - **Sur un dossier clos, annoter reste possible et renvoyer ne l'est plus.** La note du dossier peut alors diverger définitivement de ce que le patient a reçu, sans moyen de réconcilier. Sans conséquence pour le patient — le portail sert l'instantané — mais c'est une question de tenue de dossier, et aucune des deux réponses envisagées ne la ferme.
  - **`booklet_envois` n'est plus un journal d'audit.** Elle porte désormais du texte clinique libre. L'effacement patient la couvre déjà (supprimée en premier, avant `syntheseIA`), mais toute règle de conservation qui la traiterait comme de la métadonnée est devenue fausse.
  - **Aucun code d'événement ne vise le bilan patient.** `PORTAIL_SESSION_EXCEPTION` est le moins faux des existants : un lecteur qui filtrerait cette famille y trouvera des échecs de lecture de bilan.

### D-025 — Le drapeau de l'agenda s'allume en Production, seul environnement où un recueil de 21 jours puisse vivre

- Date : 2026-08-05
- Statut : accepté (arbitrage praticien en session — **amende le point 2 de [[D-022]]**, dont le point 1 reste intact)
- Domaine : exploitation (position du drapeau). **Sans effet clinique** : l'instrument est non scoré.
- Décision : **`WN_AGENDA_ALI` est posé à `true` sur le scope Vercel Production, et sur lui seul.** La restriction « sur Development et Preview, **et sur elles seules** » du point 2 de [[D-022]] est levée, et retournée : c'est la **Preview** qui est désormais exclue. La portée est celle des **environnements Vercel** — le banc de test reste libre de forcer le drapeau, ce que `web/playwright.config.ts` fait déjà et doit continuer de faire. Trois constats la fondent.
  1. **La Preview est inatteignable par le praticien, et le Development ne peut pas porter le recueil.** Deux verrous indépendants ferment la Preview : `ssoProtection: all_except_custom_domains` place les URLs `*.vercel.app` derrière le SSO Vercel, seul le domaine personnalisé étant public ; et le callback OAuth envoyé par l'application est `https://app.wellneuro.fr/api/auth/callback/google` (`docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`), quand l'URL d'une preview change à chaque déploiement. Le Development, lui, **est** atteignable — `web/playwright.config.ts` y pose `WN_AGENDA_ALI: 'true'` et `e2e/portail-agenda-alimentaire.spec.ts` déroule assignation, hub, consentement et saisie sans passer par Google, la session praticien étant fabriquée par `e2e/helpers/auth.ts`. Mais un serveur local éphémère ne porte pas trois semaines de recueil. Le précédent maison tranchait déjà dans ce sens pour une autre variable : « poser la variable dans Vercel **Production seule** — jamais Preview, qui lit la base de production » (`campagnes/2026-07-19-idp-identite-patient-durable/ACTIVATION_RUNBOOK_G4.md`).
  2. **Le motif du report est éteint.** [[D-022]] justifiait la restriction par le fait qu'allumer rendrait `Q_ALI_09` assignable « sans qu'aucun écran ne le consomme ». `LOT-04` a livré cet écran le 2026-08-05 (PR #570). La prémisse est tombée avec le lot qui la levait — et le code l'avait anticipé : « le seul geste qui sépare la production de cet écran est un `true` posé au panneau Vercel — pas une revue de code » (`questionnaires/alimentaire.ts`).
  3. **Le drapeau ne protège aucune isolation de données, et [[D-022]] le consigne lui-même** : « les environnements non-production partagent la base de production, donc une assignation créée depuis une preview y atterrit ». Il ne décide donc que d'une chose — **quel déploiement affiche la surface**.
- **Ce qui n'est pas un fait nouveau** : la lecture de la base. `agenda_alimentaire_jours` compte 0 ligne et `assignations` 0 ligne pour `Q_ALI_09` (sur 113) au 2026-08-05 — chiffres **inchangés** depuis [[D-022]], qui les portait déjà tous les deux. Rien n'a bougé côté donnée ; ce qui change est la lecture du **blocage**, et lui seul. L'observation « 0 ligne dit une inaction et non une attente » porte sur `LOT-05`, pas sur [[D-022]], qui n'a jamais écrit le contraire.
- Conséquences :
  - **Aucun des trois patients de graine ne porte le recueil pilote**, et le croire était l'erreur de la première rédaction de cette décision. Le motif qui vaut pour les trois et ne dépend d'aucun état : leur adresse `@fictif.wellneuro.fr` n'existe pas, quand le lien d'entrée au portail part **par e-mail** et que l'interface ne l'affiche pas (`PatientsPanel.tsx` rend « Lien à usage unique envoyé » et jette le `lien` que la route renvoie). S'y ajoutent, propres à chacun, la mutation par les E2E (`preparerReprisePourTest` sur `PAT_SEED_02`, parcours sur `PAT_SEED_03`) et, au 2026-08-05, un `actif = false` sur `PAT_SEED_01` et `PAT_SEED_02` qui suffirait à faire refuser l'assignation — `accepteNouvelEnvoi` n'accepte qu'un dossier `en_suivi`, c'est-à-dire `actif` vrai **et** `suiviClotureLe` nul (`lib/patient/cycleDeVie.ts`). Cet état-là est daté : les E2E le retournent sans le restaurer. Le dossier de contrôle suit donc la règle déjà payée par le gate G4 : « la précaution qui compte n'est pas "un patient fictif", c'est **aucune boîte d'un tiers** » — une adresse relevant du praticien lui-même.
  - **Rien ne s'auto-assigne aujourd'hui, et cette phrase porte une date.** Le drapeau pilote le seul champ `actif` du catalogue (`featureFlag.ts` en est l'unique lecteur runtime), mais `assignPackToPatient` n'écarte que `IDS_SUSPENDUS` et part de l'onboarding portail — **donc sans clic praticien sur le questionnaire**. Un `Q_ALI_09` entré dans un pack serait assigné à tout onboarding, drapeau allumé. Lecture du 2026-08-05 : aucun des 8 packs ne le référence. **Au passage, la graine ne reflète plus ce qu'elle prétend refléter** : `web/prisma/seed.ts` déclare quatre identifiants sous le commentaire « reflète le pack `parDefaut` réel (contenu figé R2, 2026-07-10) », quand le pack de production — « Base de consultation » — en porte cinq, `Q_SOM_09` s'y étant ajouté depuis. Constat consigné, non corrigé : hors périmètre de ce lot.
  - **Aucune lecture clinique n'est exposée**, parce qu'il n'y en a aucune : `scoring.type = 'journal'` ne lit rien et rend `scored: false` — et `'journal'` figure dans `PORTE_SON_PROPRE_NON_SCORE`, si bien que la garde « aucune réponse correspondante » ne le préempte pas. Ni barème, ni indice, ni seuil : c'est l'objet de `LOT-05`, qui n'est pas écrit.
  - **Le geste reste en deux temps** : poser la variable **puis** redéployer, jamais l'un sans l'autre — `IDS_SUSPENDUS` est un `const` de module calculé à l'import ([[D-015]], [[D-022]]). La variable se crée **non sensible**, pour la même raison que `WN_G4_REDEMANDE_PATIENT` : une variable masquée n'est plus relisible, donc plus vérifiable après coup.
  - **L'extinction referme toutes les surfaces**, par conception et vérifié une à une : la barrière 5 de `agenda-alimentaire/portail.ts` est traversée par le GET **et** le POST de la route agenda ; le hub filtre deux fois ; bibliothèque et sélecteur passent par `actif` ; la route d'assignation par `IDS_SUSPENDUS` ; et `patient/submit` refuse `Q_ALI_09` nommément. Aucun cron ne s'exécute (`vercel.json` n'en déclare aucun), et la seule relance automatisable est bornée à l'agenda du **sommeil**.
  - La ligne « Hors périmètre » de la campagne — « toute activation de `WN_AGENDA_ALI` avant la fin de `LOT-04` » — est **satisfaite**, non levée.
- Réserves :
  - **L'interface ne dira pas « pilote » : elle dira « instrument cassé ».** Faute de bloc `certification` et de `sections`, la bibliothèque affichera `nbQuestions: 0`, `scoreMax: null` et **« Statut inconnu »** (`lib/bibliotheque.ts`, `BibliothequePanel.tsx`), et l'aperçu rendra un questionnaire vide. Ce n'est pas une absence de signal, c'est un **signal trompeur** — et rien ne distingue à l'écran un instrument de recueil d'un instrument défaillant. Non corrigé.
  - **Aucun garde n'empêche `Q_ALI_09` d'entrer dans un pack.** `POST` et `PUT /api/praticien/packs` ne valident pas les `qids` contre `IDS_SUSPENDUS` ; la vérification du prérequis est le seul filet, et elle est manuelle. C'est le chemin par lequel « rien ne s'auto-assigne » cesserait d'être vrai sans qu'aucune décision ne soit prise.
  - **Le recueil pilote hérite des six manques nommés au handoff de `LOT-04`** — et les deux que la première rédaction avait omis sont ceux qui pèsent le plus sur un pilote : `soumisLe` estime là où `supersedesJourId` trancherait (refus *fail-closed* opposé au patient **sans geste de sortie**), et **le hit-test tactile de `LigneDePrises` n'est prouvé nulle part**, jsdom ne calculant aucune géométrie et l'E2E passant par le clavier — sur des prises espacées de 15 minutes qui se recouvrent à l'écran. Les quatre autres : correction bornée à J et J-1, aucune vue praticien ni clôture patient, une borne qui ne ferme rien d'observable, `nbRenseignees` divergent. **La donnée que `LOT-05` aura à calibrer sera recueillie sous ces manques**, puisqu'ils ne peuvent se corriger qu'avant un recueil dont l'absence est justement ce qui bloque.
  - **Aucun lecteur praticien des journées n'existe.** Les seuls consommateurs de `agendaAlimentaireJour` sont le hub patient, la persistance et l'effacement RGPD : les 21 journées ne se relisent que par `execute_sql`. Le chemin de calibration de `LOT-05` est donc manuel, et c'est une dette de ce lot-ci, pas du suivant.
  - **Rien ne mesure l'allumage côté dépôt.** Aucun test ni garde CI ne constate la position de la variable ; la variable non sensible se relit au panneau Vercel, ce qui suffit à séparer « non posée » de « redéploiement non fait », mais aucun signal ne remonte au dépôt.
  - **Éteindre referme les assignations mais n'efface pas les journées notées**, le modèle étant append-only ([[D-015]]). Un pilote lancé laisse une trace en base après extinction ; c'est voulu, et cela doit être su avant de le lancer.
  - **Le contrôle SQL du recueil cesse d'être vacu.** Les assertions données de `web/prisma/checks/agenda_alimentaire_v1.sql` rendent 0 ligne **par vacuité** tant qu'aucune journée n'existe et ne prouvent alors rien ([[D-015]]). Le pilote est l'événement qui les rend exigibles : le runbook les rejoue, sans quoi ce recueil serait le premier à n'être vérifié par personne.
- Référence : [../web/src/lib/agenda-alimentaire/featureFlag.ts](../web/src/lib/agenda-alimentaire/featureFlag.ts), [../web/src/lib/agenda-alimentaire/portail.ts](../web/src/lib/agenda-alimentaire/portail.ts), [../web/src/lib/questionnaires-catalog.ts](../web/src/lib/questionnaires-catalog.ts), [../web/src/lib/questionnaires/alimentaire.ts](../web/src/lib/questionnaires/alimentaire.ts), [claude/campagnes/2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md](claude/campagnes/2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md), [[D-015]], [[D-022]], [[D-023]]

### D-024 — Un plancher allume une règle quand il ne reste plus une seule issue hors de sa zone

- Date : 2026-08-05
- Statut : accepté (fille de [[D-021]], ferme sa première réserve — et avec elle la seconde moitié de [[D-020]])
- Domaine : clinique et scoring
- Décision : sur un recueil **partiel**, une règle d'orientation de type `zone` s'allume sur le `bandePlancher` de [[D-021]] **si et seulement si toutes les bandes que le score final peut encore atteindre sont dans la zone visée** — `∀ r ∈ ranges, r.min ≥ plancher.min ⇒ r ∈ zone`. Quatre règles publiées entrent dans ce cas et **aucune autre** : `R-GAS-01`, `R-SOM-01`, `R-STR-01`, `R-STR-02`.
- Ce qui la fonde : [[D-021]] a rendu la sévérité déjà acquise **lisible** sans la rendre **agissable** — sa propre réserve le disait, « le vrai positif est raconté, pas agi ». Un plancher est une borne inférieure ; une règle demande « warning ou pire », c'est-à-dire un **prédicat**. La fermeture est ce qui convertit l'un en l'autre, et elle le fait sans jamais comparer deux couleurs entre elles : une zone qui ne couvre pas toute la fermeture reste éteinte **par inclusion échouée**, pas par une règle « ne pas viser vers le bas » qu'il aurait fallu écrire et maintenir.
- **Le plancher n'entre pas par la porte de la mesure.** `extraireCible` rend un **troisième champ**, `plancher` ; `valeur` et `interpretation` restent `null`, et les deux gardes de complétude (`recueilIncomplet` au niveau global **et** par axe) ne sont pas touchées. C'est ce qui rend l'immunité des règles `type:'comparaison'` **prouvée par construction** plutôt que vérifiée par relecture : `Q_MOD_01` est une échelle inversée testée en `<=`, où un plancher serait exactement le faux positif que la garde existe pour empêcher. Marquer `interpretation` d'un drapeau `garanti` aurait rendu le défaut **fail-open** — tout chemin qui lit une interprétation se serait remis à voir une bande.
- **La fermeture est dérivée de la grille, jamais d'un ordre de couleurs.** `couleursPossibles` / `labelsPossibles` sont calculés là où `ranges` se trouve déjà (`bandePlancher`), par `min` et non par index — plusieurs grilles sont rédigées en `min` décroissant, et déduire la sévérité des couleurs est faux sur quatre instruments (voir [[D-021]]). Aucune table `RANG_COULEUR` n'existe : c'est l'allowlist **dérivée du mapping** des PR #546/#552, appliquée au grain de la bande.
- Conséquences :
  - **Une fermeture incomplète n'est pas une fermeture.** Si une seule bande atteignable n'a pas de couleur exploitable — ou pas de `min` comparable —, la liste n'est **pas servie du tout** et la règle reste éteinte. Une première rédaction filtrait ces bandes *hors* de la liste, ce qui **rétrécissait** la fermeture et rendait l'inclusion plus facile : l'exact inverse du fail-closed revendiqué. Trouvé en revue adversariale, latent sur le catalogue actuel, et corrigé aux **deux** portes (couleur absente, `min` non numérique).
  - **Une zone `plage` n'est jamais garantie.** Un plancher borne par le bas ; une plage exige aussi une borne haute que les items sans réponse peuvent franchir. Aucune des quatre règles n'en utilise ; la branche `interpretation`, elle, est implémentée symétriquement, ce qui **épingle par un banc** l'extinction de `R2-ALI-01` (grille inversée, non éligible) au lieu de la laisser à l'absence de code.
  - **Le motif praticien dit les deux choses que le plancher est** : une garantie basse (« au moins »), et une garantie tirée d'un recueil incomplet — avec son **dénominateur**, « 23 items sans réponse **sur 31** ». Sans la mention, `R-STR-02` afficherait un pack burn-out justifié par un libellé qui commence par « Adaptation satisfaisante » — le libellé est préexistant, mais « au moins » le rend **plus** trompeur, pas moins. Sans le dénominateur, le praticien ne peut pas décider entre relancer le patient et proposer le pack : « 23 » et « 23 sur 31 » ne se lisent pas pareil.
  - **Aucune conduite ne sort par cette porte.** Un pack d'orientation est un pack d'**exploration**, rien n'est auto-assigné, et le `protocol` amputé par [[D-021]] est un autre objet. Une garde balaie la **vraie** table publiée et vérifie qu'aucun texte de conduite du catalogue n'apparaît dans les motifs.
- **Trois arbitrages rendus en session, et assumés comme tels** :
  1. **On allume dès le plancher le plus faible que la grille autorise** — `R-GAS-01` propose le pack digestif sur 8 items /31, `R-STR-02` sur 5 /10. Le motif : la sévérité est *acquise*, pas probable, et l'exploration est réversible. C'est un arbitrage clinique, pas un détail d'implémentation ; il se renverse en exigeant que la fermeture soit la bande la plus sévère.
  2. **La zone de `R-SOM-01` reste inchangée** — elle s'allume donc sur un plancher `info` (PSQI 5-10, ~8 items /18). La resserrer modifierait un **objet** de la table, donc son empreinte, donc exigerait une re-signature, et changerait aussi le comportement sur passation **complète**.
  3. **Avenant daté, pas re-signature.** `ORIENTATION_RULES_SHA256` est inchangé (`528004de…`) et il **doit** l'être : aucune donnée de règle n'a bougé. Ce qui a changé est le **moteur qui lit la table**, pas ce que le praticien a signé le 2026-08-04. L'en-tête de la table porte l'avenant daté, parce qu'il affirmait le contraire — « `R-SOM-01` ne peut plus s'allumer sur un instrument à moitié rempli » — et qu'un relecteur y lisait l'inverse du comportement.
- Réserves :
  - **L'audit ne distingue pas les deux comportements.** `orientationVersion` et `orientationSha256`, persistés avec chaque synthèse, couvrent désormais **deux comportements décisionnels pour les mêmes entrées** : une synthèse d'avant et une d'après ce lot sont indiscernables. Le corriger demande de versionner le **moteur** à côté de la table — autre lot.
  - **La divergence du même message change de sens au lieu de disparaître.** `api/praticien/synthese` concatène un bloc `scores` **gelé** à la soumission ([[D-019]]) et un bloc d'orientation **recalculé**. [[D-021]] décrivait « scores parle, orientation muette » ; désormais l'orientation peut proposer sur un plancher que le bloc gelé ne porte pas. La consigne de synthèse en couvre un sens (`synthese-v16`), pas l'autre.
  - **Un trou de grille atteignable ferait mentir la fermeture.** Le prédicat ignore un troisième état : un score atteignable qui ne décroche **aucune** bande. La règle s'allumerait alors sur le partiel et s'éteindrait une fois la passation complétée. `Q_NEU_02` est le seul éligible à trous (7 et 19), et ses items étant cotés `{0,2,4,6}` les totaux sont toujours pairs : les deux trous sont **inatteignables**, et aucune règle publiée ne le vise. À rouvrir le jour où une grille à trou atteignable devient éligible.
  - **La propriété ne visite pas tout le catalogue** : 17 instruments éligibles sur 23. Cinq sortent faute de bande intermédiaire, et `Q_STR_08` faute de sous-ensemble produisant un plancher chez le générateur — ce qui est une limite du **générateur**, levable, et non une propriété de l'instrument. Les deux portes de sortie sont désormais **déclarées** ; un instrument qui sortirait par une porte non déclarée fait rougir.
  - **L'angle mort d'axe de [[D-021]] subsiste** : huit réponses maximales concentrées sur un seul axe du TFD ne produisent aucun plancher de racine (`totalGlobalDepuisSousScores` rend `null`). Le chemin plancher par **sous-score** est en revanche vivant et couvert — il ne l'était par aucun test avant la revue. Quand le plancher est un plancher d'axe, le compte affiché est celui de **l'axe** (4 sur 8), pas de l'instrument (23 sur 31) — servir 23 sur une ligne préfixée `(C1)` dirait un axe six fois plus troué qu'il ne l'est. Réserve à connaître : le dénominateur d'axe vient d'`items`, qui **exclut les questions écartées par un conditionnel**. Deux patients peuvent donc lire « sur 8 » et « sur 6 » pour le même axe. C'est le nombre honnête — ce qui était applicable à ce patient-là — mais ce n'est pas une constante d'instrument, et un praticien qui compare deux dossiers pourrait le croire.
  - **« Aucun plancher ne transporte de conduite » est vrai de `protocol`, pas de `detail`.** [[D-021]] ampute `protocol` ; `detail` reste servi, et celui de la bande `warning` du PSS-10 se termine par « stratégies de gestion du stress conseillées », c'est-à-dire une quasi-conduite. Elle **n'atteint pas** le motif d'orientation — seuls `label`, `color` et les fermetures y sont lus, et une garde le vérifie sur la table publiée — mais elle voyage dans `scoresJson` jusqu'au prompt de synthèse. Comportement antérieur à ce lot ; le fermer changerait ce que `bandePlancher` sert à **tous** ses consommateurs, donc autre arbitrage.
  - **Portée mesurée et NULLE sur l'existant** — lecture `execute_sql` du 2026-08-05 : sur les trois instruments porteurs de ces quatre règles, **10 passations, aucune partielle**, aucun `bandePlancher` en base. Le lot est **prospectif** ; il ne réinterprète aucun dossier vivant.
  - **La classe reste ouverte** sur `sum_decimal`, `count_threshold`, `ecab` et `bms_average`, et sur le moteur `subscore` (écart délibéré de [[D-020]]) : aucune règle publiée ne les vise.
- Référence : [web/src/lib/clinical/orientationEngine.ts](web/src/lib/clinical/orientationEngine.ts), [web/src/lib/clinical/plancherOrientation.guard.test.ts](web/src/lib/clinical/plancherOrientation.guard.test.ts), [web/src/lib/clinical/orientationRulesV1.ts](web/src/lib/clinical/orientationRulesV1.ts), [web/src/lib/questions.ts](web/src/lib/questions.ts), [web/src/lib/anthropic.ts](web/src/lib/anthropic.ts), [[D-019]], [[D-020]], [[D-021]]

### D-023 — Une fenêtre s'ancre sur ce qui est enregistré, pas sur ce qui est relisible ; et un état terminal se dit avant tout geste à poser

- Date : 2026-08-05
- Statut : accepté (lot LOT-04 de l'agenda alimentaire — portail patient et surface de saisie)
- Domaine : clinique (fenêtre de recueil), autorisation et chemins d'écriture patient
- Décision : cinq arbitrages rendus ensemble, tous **rendus exigibles par l'arrivée de l'écran** — trois sur la fenêtre de recueil, deux sur l'ordre des refus.
  1. **L'ancre des 21 jours se calcule sur l'union des dates enregistrées — relues ou non.** `calculerFenetreAliDepuisDates` prend un troisième paramètre optionnel `{ datesIllisibles }` et ancre sur `min(dates ∪ datesIllisibles)`, filtré par `estDateValide`. La quarantaine porte sur le JSONB `reponses`, **jamais** sur la colonne `date_jour` : la date d'une ligne qu'on ne sait pas relire reste connue, sans requête supplémentaire. En face, l'union ne touche **ni** `renseignee` **ni** `nbRenseignees` — une journée en quarantaine n'est pas une journée relue, et la compter ferait franchir les seuils d'exploitabilité sur du vide. `EmplacementFenetreAli` gagne un drapeau `illisible`, **additif et non exclusif** de `renseignee` : le modèle étant append-only, une même date peut porter une tête de chaîne relue *et* une ligne illisible ; un enum aurait forcé un choix faux dans les deux sens.
  2. **Une quarantaine ne bloque une date que tant qu'une ligne illisible peut en être la vraie tête de chaîne.** [[D-015]] refusait toute écriture sur une date portant une ligne illisible. C'était trop large : quand la tête active est relue, on peut chaîner et constater le doublon — bloquer punissait le patient sans rien protéger. Mais l'ouvrir sur la seule présence d'une tête relue serait trop étroit, cette tête étant calculée sur le **sous-ensemble lisible** : si la vraie tête est la ligne en quarantaine et qu'une supplantée est relue, la correction se chaînerait sur une ligne déjà supplantée, et la date porterait **deux têtes concurrentes** le jour où la quarantaine se lève. La règle retenue tranche par `soumisLe` — le critère que `resolveJoursActifs` emploie déjà pour départager, de sorte que règle de blocage et règle de résolution parlent la même langue — et elle est **fail-closed** : égalité d'horodatage ou horodatage inexploitable bloquent. La ligne de journal d'intégrité et le compte `illisibles`, eux, continuent de porter sur l'ensemble **complet** : une ligne supplantée illisible reste un événement d'intégrité, qu'on bloque ou non.
  3. **La borne des 21 jours est une borne SUPÉRIEURE, et elle seule.** [[D-022]] la motive par « une 22ᵉ case n'existe jamais » : c'est la fin de fenêtre qui est en jeu. Une première rédaction bornait des deux côtés, avec un effet non voulu — agenda vide, le patient note aujourd'hui, l'ancre vaut J, et noter la veille devenait impossible : un jour de recueil perdu au démarrage, refusé par un message affirmant que le recueil couvrait déjà 21 jours alors qu'il en couvrait une. Une date antérieure à l'ancre **recule l'ancre** et est acceptée. **Ce recul n'est pas le glissement corrigé au point 1** : celui-là était silencieux, vers l'avant et subi ; celui-ci est explicite, vers l'arrière et voulu par le patient. Le nombre de dates distinctes reste borné par 21, `estDateSaisissable` ne laissant écrire qu'aujourd'hui ou la veille : l'ancre ne peut reculer que d'un jour, et seulement au démarrage.
  4. **La date limite se dit avant le consentement, sur le seul chemin d'écriture.** `authorizeAgendaAlimentairePortail` prend un troisième paramètre `{ verifierDateLimite: true }`, posé par le **seul POST**, qui insère un refus `410 expired` **entre** `suiviClotureLe` (410) et `consentement_absent` (403). Le contrôle qui vivait dans la route est **supprimé**, pas dupliqué. Le `GET` reste à deux arguments : un agenda périmé demeure **lisible**, le patient doit pouvoir relire ses 21 jours.
  5. **Une exemption ne vaut que si TOUTES les portes du parcours la connaissent — et c'est la première qui décide de ce que les suivantes verront jamais.** L'exemption `statutReponses = 'deverrouille'` a été ajoutée à `api/patient/consentement/route.ts`, où elle manquait. Cela n'a d'abord **rien rouvert** : `api/patient/questionnaire/route.ts` — la route que l'écran appelle en premier — refusait en `410` sans exempter `deverrouille`, si bien que le `ConsentScreen` n'était jamais rendu et que la route de consentement restait **inatteignable depuis l'interface**. Il y a quatre portes sur ce parcours (`patient/questionnaire`, `patient/consentement`, `patient/submit`, agenda) ; en aligner trois et laisser fermée celle qui s'ouvre d'abord revient à n'en aligner aucune. Les quatre le sont désormais. Corollaire posé pour la suite : **l'écran ne décide plus lui-même de l'expiration** — la route rend un verdict booléen calculé côté serveur, et les deux écrans porteurs du `ConsentScreen` le consomment.
- Conséquences : les trois réserves visées de [[D-015]] et [[D-022]] sont closes. **Le report de la première n'était plus tenable** : [[D-022]] la différait « faute d'un écran qui rendrait le glissement visible », et ce lot livre précisément cet écran — l'argument du report tombait avec lui. Le défaut cessait par ailleurs d'être cosmétique le jour où la borne des 21 jours s'appuyait sur l'ancre : une date que le serveur refusait la veille redevenait acceptable. Les tests qui gardent ces correctifs ont été **falsifiés avant d'être crus** — chacun retiré pour de bon, le rouge constaté, puis remis : l'union neutralisée fait tomber cinq tests dont celui de l'ancre, qui rend `201` là où il attend `409` ; le départage par `soumisLe` retiré en fait tomber trois. Un garde vert qui n'a pas mordu ne prouve rien. Sur le point 4, la suppression du contrôle de route n'est pas un rangement : deux porteurs de la même exemption devant rester d'accord, dont l'un devient inatteignable, c'est un test qui ne s'exécute plus et une dérive silencieuse à la première édition. **Deux élargissements sont assumés** : `expired` (410) précède désormais `locked` (409) — les deux sont vrais et terminaux, et c'est la règle générale de [[D-015]] point 4 ; et le garde d'écran qui refuse d'afficher le `ConsentScreen` quand le serveur juge le consentement impossible vaut pour **tous** les questionnaires et sur **les deux** écrans qui le portent, non pour le seul agenda — le défaut y est identique et le correctif le même. Un troisième constat, plus large que ce lot, est consigné sans être traité : **la règle « un refus qui nomme un geste doit nommer un geste possible » vaut aussi pour ce qu'on PROPOSE**, pas seulement pour ce qu'on refuse. Elle a rattrapé quatre promesses de ce lot — un `ConsentScreen` inutile, un CTA de clôture sans route, un badge de hub nommant le même geste, et un message de refus annonçant des corrections impossibles.
- Réserves :
  - **La correction resserre le recueil, et c'est son effet clinique le plus net.** Une quarantaine sur le premier jour offrait tacitement 21 jours de plus ; désormais elle occupe l'emplacement 1. Quand **aucune** ligne relue ne porte cette date, la journée est **définitivement perdue** — le POST la refuse (`409 agenda_illisible`), aucun chaînage n'est possible sur une ligne illisible, et **aucun geste de sortie n'existe** hors effacement RGPD du dossier entier. L'arbitrage est de préférer un recueil court et daté juste à un recueil long et mal daté.
  - **`soumisLe` estime là où `supersedesJourId` trancherait.** Ce dernier est lui aussi une colonne, lui aussi sélectionné, et lui aussi jeté dans le `catch` de `listJours`. Il donnerait une certitude — si la ligne en quarantaine déclare supplanter la tête relue, elle **est** la vraie tête ; si c'est l'inverse, il n'y a aucun doute à fermer. Le critère d'horodatage retenu est plus grossier **dans les deux sens**, et il surbloque à l'égalité (deux écritures dans la même milliseconde) comme sur un horodatage inexploitable. L'erreur est toujours dans le sens fermé, donc sans risque pour la donnée — mais c'est un refus opposé au patient sans geste de sortie. À affiner par le lot qui touchera `persistence.ts`.
  - **La correction reste bornée à J et J-1** par `estDateSaisissable`, hérité de L4a. Une journée fausse à J-5, dans la fenêtre et parfaitement lisible, n'est corrigible par aucun chemin. L'écran est cohérent avec le serveur — la frise n'offre aucun clic par journée — mais la capacité manque, et c'est le prochain manque visible du recueil.
  - **La borne ne ferme rien d'observable.** Passé `dateDebut + 20`, `statutReponses` reste `non_rempli` : le praticien voit une assignation ouverte que le serveur refuse d'alimenter, sans trace au dossier. Le seul signal est `metadata.motif = 'hors_fenetre_21j'` dans le journal. À reprendre par le lot qui livrera la clôture patient.
  - **L'ancre décide désormais d'un refus d'écriture, et non plus seulement d'un affichage.** La réserve de concurrence de [[D-015]] — deux premiers POST simultanés lisent tous deux un agenda vide, sans transaction ni index unique, ce dernier interdit par le modèle append-only — prend donc un effet nouveau. Fenêtre courte, cas du double-clic, non corrigé.
  - **`nbRenseignees` diverge entre le hub et la route agenda.** Le hub ne parse jamais le JSONB : il compte les dates en quarantaine, la route non. Écart **pré-existant**, que ce lot réduit en supprimant la divergence d'ancre, et qu'il ne peut pas fermer sans faire lire le JSONB au hub — ce qui est exclu. Pour la même raison, le champ servi au hub s'appelle `journeeDuJourEnregistree` et non « notée » : il mesure « une ligne existe pour aujourd'hui », lisible ou non.
  - **`cloturablePatient` s'ouvre plus tôt** qu'avant, l'ancre ne glissant plus. Sans conséquence tant que la clôture patient n'existe pas ; à reprendre au lot qui la livrera.
  - **L'impasse fermée sur le POST l'est à l'écran par un second geste, pas par le même.** La barrière n'est posée que par le chemin d'écriture ; c'est le garde d'affichage qui empêche de proposer un consentement impossible. Deux mécanismes pour une même règle, à tenir d'accord.
- Référence : [../web/src/lib/agenda-alimentaire/fenetre.ts](../web/src/lib/agenda-alimentaire/fenetre.ts), [../web/src/lib/agenda-alimentaire/portail.ts](../web/src/lib/agenda-alimentaire/portail.ts), [../web/src/app/api/portail/agenda-alimentaire/route.ts](../web/src/app/api/portail/agenda-alimentaire/route.ts), [../web/src/app/api/patient/consentement/route.ts](../web/src/app/api/patient/consentement/route.ts), [[D-015]], [[D-022]]

### D-022 — L'agenda alimentaire se borne par la date, et son drapeau ne s'allume qu'une fois la surface écrite

- Date : 2026-08-04
- Statut : accepté (arbitrages praticien en session, avant le lot L4b de l'agenda alimentaire)
- Domaine : clinique (fenêtre de recueil) et exploitation (position du drapeau)
- Décision : deux réserves de [[D-015]] tranchées ensemble, **avant** d'écrire la surface de saisie.
  1. **La borne des 21 jours se pose sur la date, pas sur l'état.** Le POST refuse toute `dateJour` hors de `[dateDebut, dateDebut + 20]`, où `dateDebut` est le **premier jour saisi** — l'ancre que la fenêtre d'affichage utilise déjà (`web/src/lib/agenda-alimentaire/fenetre.ts:2`). Une 22ᵉ case n'existe donc jamais, et l'écriture cesse de pouvoir déborder la fenêtre qu'elle alimente. Les **corrections** d'une journée déjà notée restent ouvertes tant que le recueil n'est pas clôturé. L'autre branche — fermer sur `cloturablePatient` — est écartée : ce booléen devient vrai dès `offset >= 20` (`fenetre.ts:76`), c'est-à-dire dès que la 21ᵉ case est **atteinte**, jamais qu'elle est **remplie**. Un patient qui note J21 puis veut corriger J19 y serait bloqué, et un recueil troué se fermerait sur ses trous.
  2. **`WN_AGENDA_ALI` sera posé à `true` sur Development et Preview, et sur elles seules — après l'écriture de la surface, pas avant.** Constat du 2026-08-04 : le drapeau ne figure dans **aucune** des 53 variables d'environnement du projet Vercel `wellneuro-app`, ni Development, ni Preview, ni Production ; le lecteur étant *fail-closed* (`value === 'true'`, `featureFlag.ts:36`), l'instrument est fermé partout et l'a toujours été. La production le confirme en sens inverse : `agenda_alimentaire_jours` compte **0 ligne et 0 assignation** (lecture `execute_sql` du 2026-08-04). L'**ordre** est la partie qui décide : `IDS_SUSPENDUS` étant dérivé du drapeau, l'allumer ouvre **aussi** la bibliothèque praticien — `Q_ALI_09` deviendrait assignable depuis des previews qui écrivent dans la base de **production**, sans qu'aucun écran ne le consomme.
- Conséquences : la borne est de **portée nulle sur l'existant** — il n'y a rien à rattraper, et c'est exactement la fenêtre où la poser coûte le moins. Elle vit dans le chemin d'écriture et **nulle part ailleurs** : aucune contrainte en base, que `web/prisma/checks/agenda_alimentaire_v1.sql` interdit délibérément (modèle append-only, [[D-015]]). Les deux réserves de [[D-015]] visées ici sont closes, la seconde dans le sens rassurant. **La position `true` en Preview a un prix assumé** : les environnements non-production partagent la base de production, donc une assignation créée depuis une preview y atterrit. C'est le régime déjà en vigueur pour `WN_C4_ENABLED` et `WN_ALI_01_SIIN57`, posés sur les trois environnements.
- Réserves :
  - **La borne se déplace avec l'ancre.** La réserve « la frise se ré-ancre en silence » de [[D-015]] cesse d'être cosmétique : si la journée la plus ancienne tombe en quarantaine, `min(dates)` glisse, `dateDebut + 20` glisse avec lui, et une date que le serveur refusait hier devient acceptable. La borne ne crée pas ce défaut — elle lui donne un effet sur l'**écriture** là où il n'en avait que sur l'affichage. À exercer explicitement en test ; non corrigé ici, faute d'un écran qui rendrait le glissement visible.
  - **Rien ne double la borne.** Aucune contrainte de base ne la vérifie, par conception. Un chemin d'écriture futur qui l'oublierait — vue praticien, import, reprise — écrirait une 22ᵉ journée sans que rien ne morde. Le seul garde est le test.
  - **`dateDebut` n'existe pas tant qu'aucune journée n'est notée.** Le premier POST d'un agenda vide pose l'ancre et passe toujours : la borne ne dit donc rien de la date de **départ** du recueil, seulement de son étendue. Un patient qui commence trois semaines après l'assignation obtient 21 jours pleins à compter de ce jour-là. Assumé — l'alternative, ancrer sur la date d'assignation, punirait le retard au démarrage en tronquant le recueil.
  - **Allumer le drapeau reste un geste en deux temps** : poser la variable **puis** redéployer, jamais l'un sans l'autre ([[D-015]]).
- Référence : [../web/src/lib/agenda-alimentaire/fenetre.ts](../web/src/lib/agenda-alimentaire/fenetre.ts), [../web/src/lib/agenda-alimentaire/featureFlag.ts](../web/src/lib/agenda-alimentaire/featureFlag.ts), [../web/src/app/api/portail/agenda-alimentaire/route.ts](../web/src/app/api/portail/agenda-alimentaire/route.ts), [[D-015]]
### D-021 — Une sévérité déjà acquise se sert comme PLANCHER, jamais comme mesure

- Date : 2026-08-05
- Statut : accepté (fille de [[D-014]], ferme *partiellement* la deuxième réserve de [[D-020]])
- Domaine : clinique et scoring
- Décision : sur un recueil **partiel**, quand les réponses déjà recueillies suffisent à elles seules à décrocher une bande **autre que la plus basse**, cette bande est servie dans un champ **distinct** — `bandePlancher` —, `interpretation` restant `null`. Elle se dit « **au moins** cette bande », et jamais autrement. Trois moteurs la servent : `sum`, `psqi`, `tfd` (à la racine **et** par axe).
- Ce qui la fonde : [[D-014]] justifiait le retrait des bandes par une asymétrie — « l'erreur est à sens unique : sous-classement, jamais sur-classement ». Si l'erreur ne peut aller que vers le bas, la bande d'un partiel est une **borne inférieure** de la bande finale. La retirer éteignait donc, avec le faux négatif visé, les vrais positifs **déjà acquis**. Cas chiffré : les items du TFD sont cotés 0 à 3 et sa bande B s'ouvre à 24 — **huit réponses au maximum suffisent**, et les vingt-trois restantes ne peuvent qu'ajouter.
- **Deux conditions, déclarées et jamais déduites.** L'éligibilité est portée par l'instrument (`scoring.severiteCroissante`), le défaut restant l'absence de plancher :
  1. **Monotonie** — répondre ne peut jamais faire baisser le total. Elle n'était **pas vraie** avant ce lot : sur le PSQI, `ITEMS_C2 = ['Q2','Q5a']` sous la frontière « au moins un item », si bien que `Q5a` seul renseigné faisait calculer `C2` avec un `Q2` absent, dont le défaut valait trente minutes (`lat = 1`) là où la vraie réponse à dix minutes rend `lat = 0`. Le défaut passe à `0`. C'était le **seul** défaut atteignable du moteur — les trois autres (`Q1`, `Q3`, `Q4`) ne le sont pas, `C4` exigeant ses trois items et le total tombant sans eux.
  2. **Sens de la grille** — la sévérité doit croître avec le score. **Quatre** instruments `sum` vont dans l'autre sens (`Q_TAB_01`, `Q_ALI_01`, `Q_ALI_02`, `Q_GEO_04`) : un plancher de *score* y serait un plafond de *sévérité*, c'est-à-dire le faux positif rassurant de [[D-014]] en pire. Le sens ne se lit ni dans l'ordre d'écriture des bandes ni dans leurs couleurs — plusieurs grilles sont rédigées en `min` décroissant. **21 instruments `sum` déclarés éligibles**, plus `Q_SOM_01` et `Q_GAS_01`.
- Conséquences :
  - **Un plancher ne transporte aucune conduite à tenir.** `separerConduite` — l'entonnoir unique par lequel passent les dix-sept moteurs — sort immédiatement quand `interpretation` vaut `null`, donc précisément sur le recueil partiel. Un `{...bande}` nu ouvrait une **seconde porte non filtrée** : cinq instruments éligibles (`Q_NEU_02`, `Q_GEO_03`, `Q_CAR_01`, `Q_SOM_04`, `Q_GEO_02`) déclarent un `protocol` sur leur bande la plus sévère, et « Orientation psychiatrique urgente » serait parti dans `scoresJson` sous une clé que rien ne rend. `protocol` est **retiré** du plancher, pas redirigé : servir une conduite sur un instrument incomplet est un autre arbitrage. Trouvé en revue adversariale ; invisible de `conduite.guard.test.ts`, qui ne saturait que des passations **complètes** — une garde qui ne visite jamais l'état où le défaut existe est verte pour une mauvaise raison. Elle visite désormais aussi un recueil partiel.
  - **La consigne de synthèse le décrit** (`synthese-v15`), dans une section de **niveau racine** : le champ est servi à la racine des 23 instruments, et une première rédaction l'avait posé dans la liste réservée aux `subScores`.
  - **Le champ est ABSENT quand il n'y a pas de plancher**, jamais servi à `null` — sans quoi il serait parti au modèle sur les vingt-six instruments `sum`.
- Réserves :
  - **`R-GAS-01` n'est PAS rallumée.** C'était l'intention écrite de la réserve de [[D-020]] ; ce lot sert le plancher mais **ne touche pas** `orientationEngine.ts`, qui écarte toujours sur `missing > 0`. La réserve n'est donc close qu'à moitié : le vrai positif est **raconté** (note, synthèse), pas **agi**. Conséquence à connaître : `api/praticien/synthese` peut concaténer dans le même message un bloc `scores` disant « au moins B » et un bloc d'orientation **muet** sur le même appareil. Lot à part, nommé pour ne pas passer pour un oubli.
  - **Aucune surface praticien dédiée.** Le plancher de racine atteint la fiche par la **note** (`text-xs`, sous le titre), pendant que la colonne « Interprétation » affiche `—`. Le plancher d'**axe** du TFD, lui, n'atteint que le modèle de synthèse : aucun composant ne le lit. L'IA en sait donc momentanément plus que la fiche déterministe. Arbitrage d'affichage à rendre, hors périmètre de ce lot.
  - **Portée mesurée et NULLE sur l'existant** — lecture `execute_sql` du 2026-08-05 : **aucune** des 100 passations en base n'est partielle, et les trois PSQI réels sont complets à 18/18 avec `Q2` renseigné. Le changement de défaut ne réinterprète donc rien, et le score étant gelé à la soumission ([[D-019]]), aucun dossier vivant ne gagne de plancher. Le lot est **prospectif**.
  - **La classe reste ouverte** sur `sum_decimal`, `count_threshold`, `ecab` et `bms_average`, inchangés depuis [[D-014]] : aucune règle publiée ne les vise.
  - **Ce que le plancher n'atteint pas** : `totalGlobalDepuisSousScores` rend `null` dès qu'un axe est entièrement vide, et un plancher se lit sur un nombre. Huit réponses maximales **concentrées sur un seul axe** du TFD ne produisent donc aucun plancher, alors qu'elles en fondent un. Le servir demanderait de calculer le plancher **sans** passer par le total global.
- Référence : [web/src/lib/questions.ts](web/src/lib/questions.ts), [web/src/lib/plancherGaranti.guard.test.ts](web/src/lib/plancherGaranti.guard.test.ts), [web/src/lib/monotonieMoteurs.guard.test.ts](web/src/lib/monotonieMoteurs.guard.test.ts), [web/src/lib/eligibilitePlancher.guard.test.ts](web/src/lib/eligibilitePlancher.guard.test.ts), [web/src/lib/anthropic.ts](web/src/lib/anthropic.ts), [[D-014]], [[D-019]], [[D-020]]

### D-020 — La bande d'un AXE se lit sur l'axe complet, et son retrait a un coût dans les deux sens

- Date : 2026-08-04
- Statut : accepté (arbitrage praticien en session, fille de [[D-014]])
- Domaine : clinique et scoring
- Décision : sur le moteur `tfd` (`Q_GAS_01`), un axe partiellement répondu **garde son total** et **perd sa bande**. [[D-014]] posait la frontière « tous les items » au grain de l'**instrument** ; elle vaut ici aussi au grain de l'**axe**, parce que les bandes d'axe du TFD sont calibrées sur l'axe complet (`C1` lit « Absence » de 0 à 7 sur ses huit items) et sont **affichées sur la fiche praticien**. Le moteur publie `missing`/`repondus` à la racine et `repondus`/`items` par axe.
- Conséquences : **écart délibéré au moteur `subscore`**, qui rend la complétude seulement *lisible* et conserve ses bandes d'axe. Le motif de l'écart est une propriété de la **grille du TFD**, et non une différence d'affichage entre moteurs — une première rédaction affirmait le contraire (« aucun instrument `subscore` ne publie de bande d'axe affichée »), et c'était faux : mesuré sur le catalogue résolu, `subscore` sert **8** instruments dont **4 publient des bandes d'axe** (`Q_STR_04`, `Q_INF_03`, `Q_URO_01`, `Q_MOD_01`), affichées par le **même composant et la même ligne** que celles du TFD (`FichePatientPanel.tsx`). Le motif réel est celui écrit dans `questions.ts` : les bandes d'axe du TFD sont **calibrées sur l'axe complet** — `C1` lit « Absence » de 0 à 7 sur ses huit items —, si bien qu'un axe partiel y décroche une étiquette que sa grille n'a jamais définie pour lui. Aligner `subscore` par réflexe serait un autre lot, et un autre arbitrage. Le TFD était le **dernier moteur de la classe atteignable par une règle d'orientation publiée** ; sa fermeture ne clôt pas la classe (voir Réserves).
- Réserves :
  - **L'effet sur « Mon équilibre » va dans les DEUX sens**, et une première rédaction du lot n'en écrivait qu'un — relevé en revue adversariale. `Q_GAS_01` alimente le besoin 4 en `inverser: true` (`max: 93`). Un TFD partiel et **bas** rendait une couverture faussement haute : la garde la fait BAISSER, c'est la correction. Mais au-delà de `total ≥ 62`, la couverture passe sous `SEUIL_EFFONDREMENT` (0,34) et le besoin 4 est une **fondation critique**, ce qui plafonne le score global à 50 ; le rendre non mesuré **lève ce plafond** et le score global REMONTE. Trente items sur trente-et-un, tous au maximum, sont dans ce cas.
  - **Le retrait de bande éteint aussi de vrais positifs.** `R-GAS-01` ne s'allume plus sur un TFD partiel dont le total atteint déjà la bande B (24), ce que huit réponses cotées 3 suffisent à produire. Or les items de `O_TFD` sont cotés 0 à 3 : un item non répondu ne peut qu'**ajouter**, donc la sévérité d'un partiel qui atteint B est **acquise, pas probable**. La règle demande « warning ou pire » — un prédicat que cette monotonie tranche —, mais le moteur lui passe une **étiquette de bande**, pas un prédicat. Le dépôt sait écrire cette asymétrie (`seuilMonotone`, `questions.ts`) ; l'appliquer aux bandes demanderait de servir un **plancher garanti** à côté de la bande, ce qui touche tous les moteurs à recueil partiel. **Lot à part, non fait ici, et nommé pour ne pas passer pour un oubli.**
  - **Portée mesurée et nulle sur l'existant** : la production ne porte que **2 passations `Q_GAS_01`, toutes deux complètes (31/31)** — lecture `execute_sql` du 2026-08-04. Aucun dossier vivant n'est dans l'une ou l'autre branche ci-dessus.
  - **La classe reste ouverte** sur `sum_decimal`, `count_threshold` et `ecab`, inchangés depuis [[D-014]]. Ce qui les distingue n'est pas d'être protégés : c'est qu'aucune règle publiée ne les vise.
  - Défaut voisin fermé au passage, trouvé par la même revue : `buildMiniSynthese` re-fabriquait la conclusion « Tous les axes explorés sont peu perturbés » dès qu'**une seule** rubrique portait une bande (`some` au lieu de `every`), généralisant donc sur les axes que la garde venait de refuser de lire.
- Référence : [web/src/lib/questions.ts](web/src/lib/questions.ts), [web/src/lib/tfdRecueilPartiel.guard.test.ts](web/src/lib/tfdRecueilPartiel.guard.test.ts), [web/src/lib/scoring/miniSynthese.ts](web/src/lib/scoring/miniSynthese.ts), [[D-014]], [[D-019]]

### D-019 — Une garde de scoring ne protège que l'avenir, tant que son consommateur relit un score gelé

- Date : 2026-08-04
- Statut : accepté (relevé en revue adversariale sur le lot de signature)
- Domaine : clinique, scoring et architecture
- Décision : le moteur d'orientation lit un score **recalculé depuis `rawAnswers`**, jamais le `scoresJson` stocké. Quatre motifs le ramènent à `null` — pas de `rawAnswers`, un `{error}` rendu par `calculateScore`, un instrument non administrable, ou une passation déclarée **non interprétable** par le registre. C'est le **score** qui tombe à `null`, jamais la ligne : « une réponse existe » est un fait administratif qui fonde `dejaRepondu`, « une réponse est cotable » un fait clinique qui fonde les déclencheurs, et les confondre faisait disparaître le badge « déjà renseigné » — pour un pack entier, une seule passation ancienne suffisait.
- Conséquences : `api/patient/submit` calcule le score **une fois** et le persiste. Toute garde de scoring ajoutée ensuite est donc invisible aux passations déjà enregistrées — la garde de recueil partiel du PSQI ne mordait que sur l'avenir, alors que trois documents du même lot affirmaient le trou fermé. C'est la classe de la PR #202 : aucune ligne fautive, un rattrapage absent. Le recalcul à la lecture ferme la **classe** et non le cas — toute garde future s'applique d'office au passé, sans backfill ni migration —, et aligne l'orientation sur « Mon équilibre », qui recalculait déjà. Deux consommateurs cliniques du même score qui ne lisaient pas la même chose étaient en soi un défaut.
- Réserves : mesuré en production le 2026-08-04 — **15 lignes sur 99** n'ont pas de `rawAnswers`, toutes d'une forme antérieure au moteur actuel (ni `type`, ni `total` racine, ni objet `interpretation`), donc **déjà inertes** pour l'orientation. Le comportement servi ne change pas ; ce qui change, c'est qu'il est voulu. Le coût est un recalcul par passation à chaque lecture (99 lignes au plus pour un patient). Les autres consommateurs du score stocké — fiche praticien, synthèse, PDF — **continuent de lire l'instantané** : cette décision ne porte que sur l'orientation. **Et les deux arrivent au modèle dans le même message** : `api/praticien/synthese` construit le bloc `scores` depuis `scoresJson` (gelé) puis appelle `evaluerOrientationPourPatient` (recalculé), et concatène les deux. Un PSQI partiel antérieur au déploiement y figurera donc avec sa bande périmée, à côté d'un bloc d'orientation muet sur le sommeil — ce qui se lit « le moteur n'a rien à dire » et non « cette passation n'est pas cotable ». Le mécanisme qui le dirait (`note`) vit dans le score recalculé, que la fiche ne lit pas. Divergence **assumée et bornée**, à lever le jour où le recalcul sera étendu.
- Référence : [web/src/lib/clinical/orientationService.ts](web/src/lib/clinical/orientationService.ts), [web/src/lib/clinical/orientationService.test.ts](web/src/lib/clinical/orientationService.test.ts), [[D-014]], [[D-016]]

### D-018 — Une signature porte sur un périmètre relu, pas sur un fichier

- Date : 2026-08-04
- Statut : accepté (signature de la table d'orientation, demandée explicitement en session)
- Domaine : clinique, gouvernance et orientation
- Décision : `ORIENTATION_METADATA.claimsSource` énumère **exactement** les claims cités par les règles — ni plus, ni moins —, et un banc pose l'égalité dans les deux sens. **Le `sha256` de la table signée est en outre épinglé sur un littéral** : toute édition d'une règle après signature rougit le CI, et la sortie de secours est de **re-signer** (relire les claims, poser une nouvelle date, puis épingler le nouveau sha) — jamais de mettre le sha à jour en silence. La signature elle-même reste un acte **praticien**, jamais posé d'initiative, et elle **n'allume rien** : `orientationActive()` est un ET avec `WN_ENABLE_ORIENTATION_NNPP2`, pour que l'acte clinique et l'acte d'exploitation aient deux responsables.
- Conséquences : sans ce banc, ajouter une règle citant un claim jamais relu laissait la table « signée » — la signature couvrant alors un périmètre qui n'existait plus, sans qu'aucune ligne de code ne le dise. Le défaut n'est pas hypothétique : la première rédaction de `claimsSource` en portait **24** au lieu de 23, `WN-CL-0178-016` n'apparaissant dans le fichier que dans un commentaire. Le banc l'a attrapé à sa première exécution, sur la liste de celui qui l'écrivait. La version fait partie de l'identité d'un claim : `v1.0` relu ne garantit rien sur `v2.0`, et le banc l'exige des deux côtés.
- Réserves : le banc prouve la **cohérence** entre la table et son périmètre signé, jamais que les claims **existent** — `rag_corpus_claims` vit en base, qu'aucun test unitaire n'ouvre. Un identifiant inventé, cité par une règle et repris dans `claimsSource`, passerait. La lecture `execute_sql` avant signature reste le maillon que l'automatisation ne couvre pas ; elle a été faite le 2026-08-04 sur les 23. Le banc d'égalité seul restait par ailleurs **vert sur trois mutations** relevées en revue — élargir une zone, changer un `packId`, ajouter une règle ne citant que des claims déjà signés : c'est le sha épinglé qui les attrape, et le banc de sha préexistant ne le pouvait pas, comparant `sha256(table)` à une constante définie exactement ainsi.
- Portée (ajoutée le 2026-08-07 par [[D-031]]) : une re-signature atteste qu'un périmètre a été **relu** ; elle n'atteste pas que l'**indication n'a pas été élargie**. Relire 23 claims et poser un nouveau sha ne dit rien des portes des règles voisines — c'est ce que couvre [[D-031]].
- Référence : [web/src/lib/clinical/orientationRulesV1.ts](web/src/lib/clinical/orientationRulesV1.ts), [web/src/lib/clinical/orientationRulesV1.test.ts](web/src/lib/clinical/orientationRulesV1.test.ts), [[D-003]], [[D-016]]
### D-017 — Un artefact partagé se découpe ou se fusionne tout seul ; un garde qui ne peut pas mordre ne garde rien

- Date : 2026-08-04
- Statut : accepté (lot outillage — créneaux partagés et chaîne de skills)
- Domaine : outillage, travail parallèle, gardes CI
- Décision : trois remèdes **différents** pour trois conflits qui se ressemblaient. `docs/claude/SESSION_LOG.md` prend `merge=union` — journal purement append-only, dont la résolution est toujours « garder les deux », donc git la fait seul. Les handoffs passent à **un fichier par lot** sous `docs/claude/handoffs/`, horodatés `AAAA-MM-JJ-HHMM-slug.md`, sur le patron de `changelog.d/` ; `HANDOFF_CURRENT.md` est supprimé et **aucun fichier « courant » n'est généré** — il recréerait le conflit qu'on supprime. `docs/DECISIONS.md` **reste** à créneau unique, mais sa numérotation devient gardée : doublon, trou et désordre bloquent. Et le garde de cross-invocation des skills passe **fail-closed** : toute référence à un skill non invocable est un constat, sauf marqueur `<!-- mention-seule: nom-du-skill -->` qui **nomme sa cible**.
- Conséquences : le coût mesuré qui a motivé le lot — pendant le seul lot précédent, `main` a bougé trois fois, produisant **deux collisions de numéro de décision** (huit renvois renumérotés chacune), **une PR entière** dont l'objet unique était de réparer le handoff après un merge, et **trois handoffs perdus ou déplacés**, aujourd'hui restaurés comme fragments. Le garde de cross-invocation existait, était bloquant en CI et **vert** pendant que **neuf** branchements étaient morts : il exigeait un verbe impératif dans les 90 caractères amont, or les branchements étaient des titres d'étape nominaux. Trois scripts bloquants en CI étaient absents de `npm run check`, et leurs sept bancs aussi — `scripts/parite-check-ci.test.mjs` dérive désormais la liste depuis `ci.yml` et échoue dès qu'une étape bloquante du CI manque à `check`.
- Réserves : `merge=union` n'est éprouvé **qu'en fusion locale** (merge et rebase) ; son honorabilité par un squash côté GitHub n'est pas établie. Le journal est append-only **par convention**, pas par contrainte — `/wn-compact-sessionlog` le réécrit, et une compaction concurrente d'un ajout ferait **ressusciter** silencieusement des entrées compactées ; l'avertissement est en tête de ce skill. Le garde `D-NNN` interdit les trous : un numéro ne se libère jamais, une décision retirée s'archive. Le marqueur nominatif croît de façon monotone (100 mentions déclarées aujourd'hui) et entre dans le contexte à chaque invocation de skill. Enfin, `docs/DECISIONS.md` **reste** le seul artefact partagé non découpé : sa collision est désormais visible et bloquante, pas impossible — c'est l'arbitrage assumé, le renommage de quatorze décisions citées depuis du code clinique n'ayant pas sa place dans un lot d'outillage.
- Note de lecture : les lignes « Référence » antérieures à ce lot qui pointent `docs/claude/HANDOFF_CURRENT.md` — dont celle de **D-010** — désignent désormais le fragment correspondant de `docs/claude/handoffs/`. Le registre étant append-only, elles ne sont pas retouchées.
- Référence : [../.gitattributes](../.gitattributes), [claude/handoffs/README.md](claude/handoffs/README.md), [../scripts/lib/skill-cross-invocation.mjs](../scripts/lib/skill-cross-invocation.mjs), [../scripts/lib/decisions-numerotation.mjs](../scripts/lib/decisions-numerotation.mjs), [../scripts/parite-check-ci.test.mjs](../scripts/parite-check-ci.test.mjs)

### D-016 — Une règle d'orientation ne se déclenche que sur une mesure complète, et sur la forme réellement servie

- Date : 2026-08-04
- Statut : accepté (arbitrages praticien en session, table d'orientation V2)
- Domaine : clinique, orientation et scoring
- Décision : un déclencheur de la table d'orientation ne mord que sur une **mesure complète** — le moteur refuse un axe dont `repondus < items`, et un score global dont le porteur déclare un recueil partiel. Et il doit être **solidaire de la forme servie** : quand un `idQuestionnaire` désigne deux instruments selon un drapeau, le déclencheur porte sur les **libellés de bande**, que les deux formes ne partagent pas, et non sur une couleur, qu'elles partagent.
- Conséquences : le moteur `subscore` calcule le total d'un axe **dès qu'un seul item est renseigné** ; un total partiel est donc biaisé **vers le bas**, et un déclencheur `<=` le lit comme une dégradation. Mesuré : trois items de `Q_MOD_01` répondus à leur **meilleure** valeur, puis abandon, produisaient **sept recommandations dont deux packs**, motivées par « Sommeil non réparateur » chez un patient qui venait de déclarer un excellent sommeil. Les sous-scores servent désormais `repondus` et `items` (et non `missing` : le décrire aurait imposé de bumper la consigne de synthèse, verrouillée par empreinte). Sur `Q_ALI_01`, dont la forme courte est servie partout où `WN_ALI_01_SIIN57` manque — CI, dev, preview —, le déclencheur porte sur les deux libellés de la forme SIIN57 : la règle cesse d'elle-même de mordre quand le drapeau est éteint, et reste solidaire du claim, qui parle de l'enquête « détaillée ».
- Réserves : le PSQI partiel n'était pas gardé — **fermé depuis, au lot de signature du 2026-08-04** : `psqi` publie `missing`/`repondus` sur ses 18 items cotés et retire sa bande sur recueil partiel. La réserve subsistante est `tfd` (`Q_GAS_01`, cible de `R-GAS-01`), qui ne publie aucun compte à la racine. Par ailleurs `items = repondus + missing` n'est exercé par aucun instrument du catalogue (aucun instrument `subscore` ne porte d'item conditionnel) : une régression y serait silencieuse.
- Référence : [web/src/lib/clinical/orientationEngine.ts](web/src/lib/clinical/orientationEngine.ts), [web/src/lib/clinical/orientationRulesV1.ts](web/src/lib/clinical/orientationRulesV1.ts), [web/src/lib/questions.ts](web/src/lib/questions.ts), [[D-014]]

### D-015 — Agenda alimentaire : la saisie patient exige un consentement enregistré, se ferme à la clôture de suivi, et le doublon se refuse au chemin d'écriture

- Date : 2026-08-04
- Statut : accepté (lot L4a de l'agenda alimentaire — accès portail serveur)
- Domaine : clinique, RGPD et architecture des chemins d'écriture patient
- Décision : trois arbitrages rendus ensemble sur la première surface serveur de `Q_ALI_09`.
  1. **La saisie exige `Assignation.consentement = 'donne'`, et `Patient.suiviClotureLe` la ferme.** Ce que ces deux gardes ferment RÉELLEMENT, en production, aujourd'hui :
     - **Le consentement jamais donné.** `Assignation.consentement` vaut `'non_donne'` par défaut (`schema.prisma:121`) ; il ne passe à `'donne'` que par `api/patient/consentement` (l'endpoint du `ConsentScreen`) ou par `consultation/assignBasePack.ts`. Une assignation créée depuis la bibliothèque praticien naît donc `'non_donne'`. Sa **seule** garde jusqu'ici était un **écran** — `portail/[token]/questionnaires/[idAssignation]/page.tsx:106` — qu'un appel direct à l'API contourne entièrement ; `api/patient/submit` ne vérifie ce champ **nulle part**. C'est **cela** que la nouvelle barrière ferme : 21 jours de donnée de santé qu'on pouvait ouvrir sans consentement enregistré.
     - **La clôture de suivi.** `Patient.suiviClotureLe` est bien écrit, par `api/praticien/patients/cycle-de-vie/route.ts:115`. Un dossier clôturé continuait de recevoir des saisies. **Aucune vue praticien de l'agenda _alimentaire_ n'existe à ce stade** — L4a n'ouvre qu'une route portail, et une version antérieure de cette décision en désignait une qui n'a jamais été écrite. Ce qui est vérifiable : la vue de suivi de l'agenda du **sommeil** (`api/praticien/agenda-sommeil/suivi/route.ts:48`) filtre `suiviClotureLe: null`, et la vue alimentaire à venir suivra la même règle. Les saisies recueillies après clôture seraient donc collectées sans destinataire.
     - **Ce qui n'est PAS fermé, parce que rien ne l'ouvre :** `Assignation.consentementRetraitDate` n'est écrit par **aucun** chemin du dépôt — ni route, ni script, ni seed (vérifié le 2026-08-04 : hors client Prisma généré, les seules occurrences sont le module d'autorisation de l'agenda alimentaire et ses tests). **Aucun patient ne peut retirer son consentement au niveau assignation** : le mécanisme n'existe pas. La barrière posée sur ce champ est une **pré-position défensive**, pour que la route qui l'écrira un jour trouve ce chemin d'écriture déjà fermé. Elle ne protège rien pour l'instant, et il ne faut pas la lire comme une garde active. Une version antérieure de cette décision affirmait qu'« un patient qui retire son consentement continue d'alimenter 21 jours de donnée de santé » : c'était faux, faute d'un mécanisme de retrait.
  2. **Un second envoi sur une date déjà notée est refusé (`409`)**, sauf s'il porte un `supersedesJourId` désignant la journée **active** de cette date. Le refus s'étend à l'écriture portant sur une date **dont une ligne est illisible** — et sur elle seule : une ligne en quarantaine est invisible de `resolveJoursActifs`, donc sa date passerait pour non notée et l'écriture créerait une seconde tête de chaîne. Il ne s'étend **pas** à l'agenda entier. Une version antérieure de cette décision le faisait, au motif qu'`illisibles` est un compte muet sur les dates touchées : c'était faux — `date_jour` est une **colonne**, la ligne fautive est en portée dans le `catch` de `listJours`, qui remonte désormais `datesIllisibles` à côté du compte. Le refus large fermait les vingt autres journées et jusqu'aux corrections légitimes, **sans aucun geste de sortie** (le seul `deleteMany` sur cette table est l'effacement RGPD du dossier entier, `lib/patient/effacement.ts`), pour éviter un dégât qui se réduit à **+1 sur `lignes − dates distinctes`** — une métrique de friction interne. Dans tous les cas, `illisibles > 0` ouvre une ligne de journal d'intégrité (`PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.LIGNE_ILLISIBLE`) — **sur la lecture comme sur l'écriture**, et non au seul POST : la quarantaine naît d'un rollback ou d'un conteneur v1 relisant une ligne v2, fenêtre où les lectures dépassent de loin les écritures, et un agenda encore consulté mais plus alimenté n'ouvrirait alors jamais d'incident. Aucune date en `metadata` (donnée de recueil) ; `dateVisee` est un booléen, renseigné au seul POST.
  3. **`modification_demandee` est refusé au même titre que `verrouille`**, aligné sur `api/patient/submit/route.ts`.
  4. **Les états terminaux passent avant les gestes à poser.** Dans `authorizeAgendaAlimentairePortail`, `Annulée` (`410`) et `suiviClotureLe` (`410`) précèdent les deux barrières de consentement (`403`). L'ordre inverse envoyait le patient vers un geste impossible — `api/patient/consentement/route.ts:65` refuse en `410` sur une annulée — ou, pire, vers un geste que cette route aurait **exécuté** : elle ne lit pas `suiviClotureLe` et aurait écrit le consentement sur un dossier clôturé, juste avant que la barrière suivante ne le referme. Règle générale à retenir : un refus qui **nomme un geste** au patient doit venir après tout refus d'état terminal.
- Conséquences : **l'asymétrie avec l'agenda du sommeil est assumée et nommée**, elle n'est pas un oubli. On ne recopie pas un défaut connu dans du code neuf ; et corriger le sommeil reviendrait à modifier un chemin d'écriture **en production**, hors du périmètre d'un lot qui n'ouvre qu'une route. **La dette reste ouverte sur deux chemins nommés** : `web/src/app/api/patient/submit/route.ts` et `web/src/app/api/portail/agenda-sommeil/route.ts` (via `web/src/lib/agenda-sommeil/portail.ts`) — aucun des deux ne lit `consentement`, ni `consentementRetraitDate`, ni `suiviClotureLe`. Un patient dont le consentement n'a jamais été enregistré peut donc encore écrire par ces deux portes. C'est consigné ici pour être repris, pas pour être oublié. Sur le point 2, le refus tient au chemin d'écriture **et nulle part ailleurs** : il n'existe volontairement **aucune contrainte unique** sur `(id_assignation, date_jour)`, puisque `count(lignes) − count(DISTINCT date_jour)` est le **taux de correction**, seule métrique de friction du lot lisible sans nouvelle migration (D-009, « collecter avant de calibrer »). Sans le `409`, un double-clic serait indiscernable d'une correction réelle et la métrique mentirait dans le sens rassurant. La base ne peut pas faire cette distinction, le chemin d'écriture le peut : c'est la bonne place. Sur le point 3, deux chemins d'écriture qui divergent sur le même statut d'assignation finissent par se contredire au dossier — un patient verrouillé d'un côté, ouvert de l'autre.
- Réserves :
  - **Le `409` rend le double-clic improbable, pas impossible.** Le contrôle est un `listJours` suivi d'un `saveJour`, **sans transaction ni contrainte unique** (délibérément absente, voir ci-dessus) : deux POST concurrents lisent tous deux un agenda vide sur cette date et écrivent tous deux une ligne non chaînée. La fenêtre est courte et le cas est un double-clic, non un adversaire ; mais la métrique `lignes − dates distinctes` compterait alors ce double-clic comme une correction, dans le sens rassurant. Corriger demanderait soit une transaction sérialisable, soit un index unique partiel — ce dernier étant précisément ce que le modèle append-only interdit. Non corrigé dans ce lot, consigné ici.
  - **Éteindre `WN_AGENDA_ALI` exige un redéploiement.** `IDS_SUSPENDUS` est un `const` de module, calculé à l'import : un conteneur serverless déjà chaud garde la valeur de son démarrage. Changer la variable d'environnement Vercel sans redéployer laisse la barrière ouverte sur les conteneurs en vol. Le geste opérationnel est « changer la variable **puis** redéployer », jamais l'un sans l'autre.
  - **Une impasse d'ordre subsiste, hors de portée de ce réordonnancement : date limite dépassée + consentement absent.** La barrière de consentement vit dans `authorizeAgendaAlimentairePortail`, donc **avant** le contrôle de `dateLimite`, qui est une barrière de la route (POST seulement). Sur une assignation périmée et sans consentement, le patient reçoit donc « donnez d'abord votre consentement » (`403`) alors que `api/patient/consentement/route.ts:55` refuse en `410 expired` — le même geste impossible que celui corrigé pour l'annulation. Pire : cette route de consentement **n'exempte pas** `statutReponses = 'deverrouille'`, contrairement à l'agenda ; un agenda délibérément rouvert par le praticien resterait donc fermé côté consentement. **Le report n'est pas motivé par un coût de correction** — une version antérieure de cette réserve affirmait qu'il faudrait déplacer le contrôle de `dateLimite` dans l'`authorize`, donc l'appliquer aussi au `GET` : c'est inexact. Un **paramètre d'option porté par le seul POST** — `authorizeAgendaAlimentairePortail(req, id, { verifierDateLimite: true })` — le corrigerait sans toucher au comportement de lecture. Ce qui motive le report, c'est que **le cas est inatteignable** : `WN_AGENDA_ALI` est éteint, et la barrière 5 (instrument suspendu, `409`) mord avant toutes les autres. Le correctif est bon marché et reste à faire ; à reprendre en L4b, en même temps que l'exemption `deverrouille` côté consentement. Cas voisin, plus bénin : consentement absent + `statutReponses = 'verrouille'` — le geste réussit (la route de consentement ne lit pas ce statut), mais l'agenda refuse ensuite en `409` ; geste inutile, pas impossible.
  - **La frise se ré-ancre en silence si la ligne en quarantaine est la plus ancienne.** `calculerFenetreAliDepuisDates` (`lib/agenda-alimentaire/fenetre.ts:59-60`) ancre les 21 emplacements sur `min(dates)` des journées **relues**. Si la première journée du recueil tombe en quarantaine, la fenêtre repart de la deuxième et les 21 emplacements **glissent** — les index affichés ne désignent plus les mêmes jours. `illisibles` remonte bien au GET, mais rien ne dit que c'est l'ancre qui a bougé, et un patient qui compare deux affichages verrait sa journée 1 changer de date sans explication. Non corrigé dans ce lot : il n'existe pas encore d'écran.
  - **Aucune borne serveur sur les 21 jours.** `estDateSaisissable` n'autorise qu'aujourd'hui ou la veille, mais **rien ne refuse une date au-delà de `dateDebut + 20`** : un recueil peut donc dépasser 21 journées si le patient continue de saisir. La fenêtre ne borne que l'affichage, pas l'écriture. **Question produit ouverte, à trancher avant L4b** : borner au POST (refus d'une 22ᵉ journée) ou à la clôture (le recueil se ferme quand `cloturablePatient` devient vrai) ? Les deux réponses sont défendables et n'ont pas les mêmes effets cliniques — la première tronque, la seconde exige un geste.
  - **Le `400` de domaine ne dit plus lequel des onze contrôles de `jour.ts` a mordu.** La trace d'erreur du chemin d'écriture masque le message pour empêcher un `PrismaClientValidationError` de citer `data.reponses` ; le prix est que les `TypeError` du domaine — dont **aucun** n'interpole une valeur du patient — perdent leur diagnostic. Un **code de domaine énuméré** (une constante par contrôle, levée avec l'exception) restituerait le motif sans rien exposer. Piste pour un lot ultérieur, pas un correctif de celui-ci.
  - L'absence d'unicité en base est désormais **assérée en sens inverse** par `web/prisma/checks/agenda_alimentaire_v1.sql` — ajouter un index unique sur `(id_assignation, date_jour)` ressemblerait à un durcissement et casserait le modèle append-only. Ce contrat garde aussi le `ON DELETE RESTRICT` des deux clés étrangères, sans lequel la suppression nommée de `web/src/lib/patient/effacement.ts` deviendrait du **code mort** en silence, et refuse toute colonne de gramme, kcal, score, indice ou quantité (frontière « journal alimentaire, pas carnet de pesée »), **ainsi que toute clé de premier niveau du JSONB `reponses`** portant les mêmes motifs — un agrégat rangé là n'exigerait aucune migration, c'est le chemin le moins coûteux donc le plus probable. Ses invariants de **données** — verrou de périmètre JSONB, version de contrat lue, chaînage `supersedes_jour_id` non pendant et ne franchissant ni patient, ni assignation, ni date — sont **vacués sur la base CI, qui est vide** : c'est le même piège que pour la barrière D-003, la partie du contrat qui protège le plus est celle que le CI ne joue pas. Ils sont à rejouer en lecture seule sur la production une fois des journées recueillies.
- Référence : [web/prisma/checks/agenda_alimentaire_v1.sql](web/prisma/checks/agenda_alimentaire_v1.sql), [web/src/app/api/portail/agenda-alimentaire/route.ts](web/src/app/api/portail/agenda-alimentaire/route.ts), [web/src/lib/agenda-alimentaire/portail.ts](web/src/lib/agenda-alimentaire/portail.ts), [web/src/lib/patient/effacement.ts](web/src/lib/patient/effacement.ts), [changelog.d/2026-08-04-agenda-alimentaire-l4a.md](changelog.d/2026-08-04-agenda-alimentaire-l4a.md)

### D-014 — Une bande d'interprétation ne se lit que sur l'instrument complet

- Date : 2026-08-04
- Statut : accepté (arbitrage praticien en session, suite du LOT-07)
- Domaine : clinique et scoring
- Décision : sur un recueil **partiel**, les moteurs de somme ne rendent plus de bande d'interprétation. Un item non répondu n'est pas compté `0` — il est **ignoré** —, si bien que le total sort plus bas qu'il ne devrait et décroche une bande calibrée sur la forme complète. **L'erreur est à sens unique : sous-classement, jamais sur-classement**, c'est-à-dire le faux négatif sur un dépistage. Le `total` reste servi, accompagné de `missing` et `repondus` ; ce qui tombe est la **lecture**, pas la mesure. `bms_average` rend en plus `average: null` : sa moyenne divisait par des items que personne n'avait posés, et diviser par `repondus` aurait remplacé un nombre faux par un nombre inventé — la grille du BMS-10 n'a jamais été calibrée sur une moyenne partielle.
- Conséquences : frontière **plus stricte** que celle des sous-scores voisins, qui tiennent un axe pour mesuré dès qu'un item est renseigné. Assumé : un sous-score **détaille** un total resté vérifiable à côté, une bande **affirme**. La règle vaut aussi un étage plus bas, dans `web/src/lib/equilibre/score.ts`, où le total **est** la lecture — il y est divisé par le `max` de la forme complète, et sur une source `inverser: true` l'erreur devient rassurante : un `Q_STR_03` tronqué rendait « besoin bien couvert ». Une source à recueil partiel n'entre donc plus dans la couverture ; un besoin dont toutes les sources sont partielles ressort **non mesuré**, jamais `0`.
- Réserves : **la classe n'est pas fermée.** Trois moteurs servis portent encore le même défaut et n'ont pas été touchés — `sum_decimal` (`Q_GEO_05`, QDRS, où un recueil partiel décroche « Normal » sur une **gradation de démence**), `count_threshold` (`Q_INF_05`, qui calcule `missing` puis l'ignore) et `ecab` (`Q_NEU_08`, dépendance aux benzodiazépines). Portée du présent changement mesurée et **nulle sur l'existant** : les 21 réponses `sum` de production portent toutes exactement le nombre d'items attendu (lecture `execute_sql` du 2026-08-04). Mais le trou n'était **pas** théorique : côté serveur, la complétude n'est exigée que pour `def.cabinet`, et aucun instrument servi par `sum` n'est de cabinet — un POST partiel authentifié était accepté.
- Référence : [web/src/lib/questions.ts](web/src/lib/questions.ts), [web/src/lib/equilibre/score.ts](web/src/lib/equilibre/score.ts), [docs/gouvernance-questionnaires-scoring.md](docs/gouvernance-questionnaires-scoring.md)

### D-013 — Une étiquette de certification ne vaut que ce que vaut la pièce qui la fonde

- Date : 2026-08-04
- Statut : accepté (clôture du LOT-07 de la campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`)
- Domaine : corpus des questionnaires, gouvernance clinique
- Décision : un statut du registre des instruments ne se pose que sur une pièce qui **certifie l'objet réellement servi**, et un garde de statut vérifie la **teneur** de cette pièce, jamais sa seule présence. Trois applications, toutes exécutables : `statutBibliographique: reference_identifiee` exige un identifiant (DOI ou PMID) qui certifie la forme servie, et non un simple champ d'identification non vide ; `cosmin` autre qu'`inconnu` exige une ligne concordante de `measurement_evidence.json` sur le même `questionnaireId` **et** le même grade ; le barreau `statutCertification: psychometrie_revue` exige une preuve **graduée** — au moins une étude dont `conclusionCosmin !== 'inconnu'` — et un `cosmin` posé sur l'entrée.
- Conséquences : sur 65 entrées, **43 portent `reference_identifiee` et 2 seulement un identifiant** — l'écart est la mesure exacte de ce que l'étiquette ne dit pas, et il est désormais écrit dans `docs/gouvernance-questionnaires-scoring.md`. Une entrée sans identifiant reste `a_completer` et porte un `motifBibliographique` d'au moins 40 caractères disant ce qui a été cherché ; le même champ est **interdit** sur les autres statuts, un constat survivant à une promotion contredisant son voisin. `Q_ALI_03` est le contre-exemple de référence : sa publication d'origine a été retrouvée et n'est délibérément pas portée en `references`, parce que la publication décrit 8 questions et que le dépôt en sert 23 sous un instrument qu'il déclare débaptisé.
- Réserves : le garde générique du registre continue d'accepter `reference_identifiee` sur un seul champ non vide — seuil bas assumé pour les 43 entrées héritées, que ce lot n'a pas rouvertes. La règle du présent D-013 vaut pour toute **nouvelle** promotion, et c'est la revue qui la tient, pas le garde. Par ailleurs `a_completer` recouvre depuis ce lot deux situations qu'aucune requête ne sépare — « rien n'existe » et « trouvé mais non indexé » —, distinction qui ne vit que dans le motif.
- Référence : [scripts/lib/verifier_registre_instruments.js](scripts/lib/verifier_registre_instruments.js), [docs/gouvernance-questionnaires-scoring.md](docs/gouvernance-questionnaires-scoring.md), [docs/claude/corpus/instrument_registry.json](docs/claude/corpus/instrument_registry.json)

### D-012 — La barrière D-003 se garde au point de passage, pas chez ses lecteurs

- Date : 2026-08-03
- Statut : accepté (clôture du LOT-01 de la campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`) — le contrat qui matérialise cette décision a été mergé par la **PR #553** le 2026-08-03 (`cd7c1b9b`) : la décision et sa mise en œuvre sont toutes deux sur `main`.
- Domaine : architecture, corpus et sécurité clinique
- Décision : la fermeture de la barrière D-003 — aucun claim non signé ne remonte vers une restitution — est **éprouvée sur `public.match_wellneuro_rag_claims`**, seule voie de restitution du corpus, par le contrat `web/prisma/checks/rag_claim_barriere_d003_v1.sql`. Elle n'est **pas** obtenue en imposant un filtre `statut` à chaque module qui lit `rag_corpus_claims`. Le contrat assère aussi ce qui empêche de **contourner** la fonction : `EXECUTE` refusé à `anon` et `authenticated`, RLS active sur les deux tables.
- Conséquences : quatre modules (`revue.ts`, `recherche.ts`, `questionnaire.ts`, `evaluation.ts`) lisent la table sans filtrer `statut`, et **ce n'est pas un défaut** — ce sont l'établi de validation, qui doit voir un claim non signé pour le présenter au praticien. Ils sont documentés comme tels dans `docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md`, pas gardés par du code. En contrepartie, **toute nouvelle voie de restitution doit passer par la fonction** : un `SELECT` direct sur la table depuis une surface de consultation échapperait au garde, qui ne le verrait pas. C'est le prix de ce dessin, et il est assumé — un garde au point de passage tient quel que soit le nombre de lecteurs, une allowlist se périme au premier module ajouté.
- Réserves : le refus d'`EXECUTE` n'est assérable que si les rôles PostgREST existent — la clause est donc **vide sur la base éphémère du CI et mordante en production**. C'est le piège déjà rencontré avec `REVOKE FROM PUBLIC` : la partie du contrat qui protège le plus est celle que le CI ne joue pas. Deux des cinq conditions de la fonction (`patient_identifiable = false`, `compartment = 'ACTIF'`) ne sont pas falsifiables par fixture — tenues par des `CHECK` de table — et sont assérées structurellement dans `pg_constraint`.
- Référence : [web/prisma/checks/rag_claim_barriere_d003_v1.sql](web/prisma/checks/rag_claim_barriere_d003_v1.sql), [.github/workflows/ci.yml](.github/workflows/ci.yml), [docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md](docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md), PR #553

### D-011 — Écart de restitution de l'IA : on journalise, on ne censure pas

- Date : 2026-08-03
- Statut : accepté (clôture du LOT-06 de la même campagne)
- Domaine : clinique et IA (prolonge **D-003**, ne le contredit pas)
- Décision : quand un détecteur constate un écart entre la synthèse **rédigée par l'IA** et le matériel déterministe qui lui a été transmis — un pack ou un questionnaire cité sans avoir été fourni —, l'écart est **consigné** dans les métadonnées de la synthèse, au dossier. La synthèse n'est ni supprimée, ni tronquée, ni masquée au praticien. Le détecteur est un instrument de mesure, pas une censure.
- Conséquences : le praticien voit la synthèse **et** l'écart, et tranche. Le garde ne s'exécute que si le bloc d'orientation a réellement été injecté (`orientationInjectee`) : sans injection, il n'y a pas de matériel de référence, donc pas d'écart mesurable — seulement une accusation possible. L'allowlist est dérivée des **trois** sources réellement transmises, dont les questionnaires que la consigne système cite elle-même : reprocher au modèle d'avoir repris ce qu'on lui a donné revient à l'accuser d'avoir inventé ce qu'il a lu.
- Réserves : ce dessin est né d'un défaut mesuré, pas d'un principe. Pendant le LOT-06, le détecteur tournait avec une allowlist vide sur le seul chemin de production et comparait la prose à 16 titres de packs, dont quatre sont des tournures cliniques françaises ordinaires (« digestif et intestin-cerveau », « stress chronique et burnout ») : **une synthèse fidèle a été accusée, et l'accusation persistée au dossier**. Un détecteur qui peut se tromper ne doit pas avoir le pouvoir de supprimer. S'il gagne un jour ce pouvoir, ce sera par une décision distincte, pas par dérive.
- Référence : [web/src/lib/clinical/verifierRestitutionOrientation.ts](web/src/lib/clinical/verifierRestitutionOrientation.ts), [web/src/app/api/praticien/synthese/route.ts](web/src/app/api/praticien/synthese/route.ts), PR #550
### D-010 — Agenda alimentaire : l'écart déclaré/observé est un objet clinique séparé, pas une source du besoin 3

- Date : 2026-08-04
- Statut : accepté (arbitrage praticien, lots L1-bis et L3 de l'agenda alimentaire)
- Domaine : clinique, Mon Équilibre
- Décision : l'agenda alimentaire `Q_ALI_09` **n'alimente pas** le besoin 3 « Rythme alimentaire », déjà sourcé par le sous-score `RYTHME_CHRONO` de `Q_ALI_01`. Ce que l'instrument doit produire est l'**écart** entre le rythme DÉCLARÉ (questionnaire) et le rythme OBSERVÉ (21 jours), comme objet distinct — trois profils, dont « déclare bon / observe mauvais », où l'action clinique porte sur la perception et non sur le rythme.
- Conséquences : `BESOIN_SOURCES` et `VERSION_SCORE_EQUILIBRE` restent intouchés, et `sourceMonEquilibre` vaut `false` au registre des instruments. Y brancher l'agenda ferait deux mesures d'un même thème — l'agenda serait le **troisième** porteur du mot « rythme », après `RYTHME_ALIMENTAIRE` /10 (affichage) et `RYTHME_CHRONO` /7 (besoin), homonymie dont `lib/anthropic.ts` documente déjà le piège d'addition. L'objet d'écart **dépend de la forme servie** : sous la forme courte à 14 items, `MAX_RYTHME_CHRONO` vaut 0, aucun rythme n'est déclaré, et l'écart devra rendre `null` — jamais 0, qui se lirait « pas d'écart ».
- Référence : [docs/claude/HANDOFF_CURRENT.md](docs/claude/HANDOFF_CURRENT.md), [web/src/lib/equilibre/constants.ts](web/src/lib/equilibre/constants.ts), [web/src/lib/agenda-alimentaire/types.ts](web/src/lib/agenda-alimentaire/types.ts), [web/src/lib/anthropic.ts](web/src/lib/anthropic.ts)

### D-009 — Recueil longitudinal : collecter avant de calibrer, et l'abstention est un état clinique de plein droit

- Date : 2026-08-04
- Statut : accepté (arbitrage praticien, lots L1-bis et L3)
- Domaine : clinique, méthode de mesure
- Décision : sur un instrument de recueil, **aucun barème n'est arrêté avant d'avoir observé des données réelles** — un barème posé avant la première passation est une donnée clinique inventée. Et une question de recueil offre **trois états**, pas deux : observé vrai, observé faux, et `null` — « je ne sais pas » —, distinct de la clé absente qui reste la non-réponse.
- Conséquences : l'ordre des lots est collecte → calibrage, jamais l'inverse ; un instrument peut donc être livré `scored: false` et le rester. L'abstention doit entrer au contrat **avant la première ligne en base** : après, elle coûte une version de contrat, une double lecture et une fenêtre de recueil incomparable à elle-même. Corollaire technique à ne pas manquer — `null !== undefined` est vrai en JavaScript : relâcher un booléen **réveille tous les prédicats qui comptent les valeurs connues**, et un seul laissé en `!== undefined` compte l'abstention comme connue puis la lit comme un « non ». Le test de connaissance s'écrit `typeof … === 'boolean'`, uniformément ; la différence de contrat entre champs vit dans le type et le validateur, jamais dans les prédicats.
- Référence : [changelog.d/2026-08-04-agenda-alimentaire-l3-persistance.md](changelog.d/2026-08-04-agenda-alimentaire-l3-persistance.md), [web/src/lib/agenda-alimentaire/types.ts](web/src/lib/agenda-alimentaire/types.ts), [web/src/lib/agenda-alimentaire/agregats.ts](web/src/lib/agenda-alimentaire/agregats.ts)

### D-008 — Contrat V3 des compléments : validation structurelle au runtime, à la persistence et à la relecture

- Date : 2026-08-03
- Statut : accepté (lot C4, session de consolidation)
- Domaine : architecture, protocoles et rayon compléments
- Décision : le contrat V3 des références catalogue de compléments est désormais validé de bout en bout sur la construction du draft, la persistence côté API praticien et la relecture depuis PostgreSQL. Un payload V3 mal formé est refusé explicitement ; les versions V1/V2 restent inchangées, et le chemin C5 ne se mélange pas au contrat V3.
- Conséquences : la contrainte structurelle est désormais appliquée au point d’entrée d’écriture et au point de reconstitution des protocoles, ce qui évite qu’un draft invalide soit persisté ou réhydrater sans rejet. La gouvernance du rayon compléments reste fail-closed tant qu’aucune activation métier n’est décidée.
- Référence : [docs/claude/campagnes/2026-08-02-rayon-complements-alimentaires/HANDOFF.md](docs/claude/campagnes/2026-08-02-rayon-complements-alimentaires/HANDOFF.md), [web/src/lib/clinical-engine/protocolDraft.ts](web/src/lib/clinical-engine/protocolDraft.ts), [web/src/app/api/praticien/protocoles/route.ts](web/src/app/api/praticien/protocoles/route.ts), [web/src/lib/protocol/fromPrisma.ts](web/src/lib/protocol/fromPrisma.ts)

### D-007 — Orientation adaptative : A-009 amendé, seule la perfusion reste hors moteur

- Date : 2026-08-01 (amendement) — 2026-08-02 (consignation)
- Statut : accepté (arbitrage du praticien-propriétaire, rendu en session)
- Domaine : clinique et corpus (frontière du moteur d'orientation)
- Décision : la décision **A-009** du manifeste plaçait quatre domaines hors moteur — perfusion, sevrages médicamenteux, psychotropes, maladie d'Alzheimer. Pour l'**orientation adaptative** (axe 3 de la campagne `2026-07-25-certification-corpus-questionnaires`, question *f* du cadrage), ce périmètre est **amendé** : seule la **perfusion** reste exclue. Les sevrages médicamenteux, les psychotropes et Alzheimer sont **réintégrés** dans le drafting des claims d'orientation. Motif : ces domaines relèvent de l'exercice courant du cabinet et leur exclusion en bloc privait le moteur de sources que le praticien mobilise en consultation ; la perfusion, elle, désigne un acte que WellNeuro n'a pas vocation à orienter.
- Conséquences : **la voie lente est inchangée** — chaque claim reste soumis à la validation praticien individuelle avant d'exister pour le moteur (barrière **D-003**) ; l'amendement élargit ce qui est *proposé* à la validation, jamais ce qui la contourne. **La quarantaine sanitaire reste un garde-fou, mais elle n'est plus un blocage absolu pour l'orientation** : les sources prescriptives du périmètre sont réintégrées par la levée actée le 2026-08-02 ; les sources non prescriptives restent exclues. Cette distinction est matérialisée dans `tools/corpus/claims/lib/filtre-orientation.mjs` et éprouvée par deux bancs. Matérialisation en base : migration `20260801200000_rag_claim_usage_orientation` (marquage `metadata.usage = 'orientation'`, prescriptifs réintégrés, perfusion épargnée — vérifié en production le 2026-08-02).
- Réserves : le périmètre est **figé dans une liste** au 2026-08-02 ; sa dérive est surveillée par `tools/corpus/claims/lib/perimetre-orientation.test.mjs`, qui échoue dès que le registre s'en écarte — les sources entrant en quarantaine après coup restent exclues si elles ne sont pas prescriptives.
- Référence : `docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/README.md` (§5, question *f*), PR #518 et #519

### D-006 — Migration HDS : bascule tout-Scalingo, données réelles dès la phase de test, découplée du calendrier juridique

- Date : 2026-07-28
- Statut : accepté (décision du **responsable de traitement**), **sous les réserves listées ci-dessous**
- Domaine : architecture, hébergement et conformité (HDS, RGPD)
- Décision : la migration vers **Scalingo** (hébergeur certifié HDS 2.0 — certificat LNE n° 38436‑2, valable 11/09/2028 ; infrastructure sous‑traitante Outscale, certifiée HDS) s'applique **aux patients réels dès la phase de test**, sans attendre la finalisation du volet juridique. **Cette décision lève explicitement le gate documenté « F (juridique) conditionne le GO données réelles »** (`CHECKLIST_FINALISATION.md` §F) : les items AIPD, DPA des sous‑traitants et pentest, qui conditionnaient ce GO, deviennent des **réserves à lever en parallèle** — arbitrage que le responsable de traitement est en droit de rendre, consigné comme tel ici. Base invoquée par le responsable : **consentements patients déjà recueillis** et **information RGPD** (conservation des données, droit d'accès, de consultation, de révocation) **déjà actée** sur l'implantation Vercel actuelle. Cohérence : les données réelles sont **déjà** hébergées sur Vercel/Supabase **non‑HDS** sous la dérogation en vigueur (échéance 2026‑10‑21, qui couvre l'implantation **Vercel** actuelle) ; les déplacer vers Scalingo **améliore** la posture — mais **seulement une fois l'annexe HDS en vigueur et le périmètre HDS de la région cible confirmé** (voir Conséquences). Corollaire : **pas de double‑implantation permanente** — Vercel/Supabase gardés chauds comme **filet de rollback court**, puis décommissionnés avec **preuve d'effacement écrite** (registre RGPD). Cible : **Scalingo seul**.
- Conséquences : **ordre imposé** — l'app prod HDS ne reçoit des données réelles **qu'après** (a) e‑signature du **DPA Scalingo** (l'annexe HDS s'y attache — volet hébergeur de F) **et** (b) confirmation que la **région cible porte le périmètre HDS**. Migrer du réel avant (a) créerait un intervalle couvert **ni** par la dérogation (qui vise Vercel) **ni** par un contrat HDS signé. **Note région :** `osc-fr1` est **conforme HDS** selon Scalingo, mais l'audit recommandait la région **plus stricte** `osc-secnum-fr1` (Outscale **SecNumCloud**, souveraine) ; `osc-fr1 --hds-resource` reste **HDS mais non SecNumCloud** — à confirmer acceptable par le responsable. Les patients réels ne doivent atterrir que sur l'**app prod HDS** dûment provisionnée (`--hds-resource`, `DB_SSL_CA`, secrets prod, contrôles d'accès de niveau prod), **pas** sur un staging au sens lâche. Aucun garde runtime n'empêche les données réelles : le passage au réel est la **migration de données du bloc D** (dump Supabase → restore Scalingo), acte ops du responsable, **subordonné à l'ordre ci‑dessus**. **Réserves :** (1) **e‑signer le DPA Scalingo** — *avant toute donnée réelle* ; (2) **confirmer le périmètre HDS de la région** cible — *avant toute donnée réelle* ; (3) **confirmation DPO recommandée** sur « patients réels sur Scalingo en phase de test » — plus lourd que le RLS (D‑005) ; (4) DPA des **autres sous‑traitants** (Anthropic, SMTP, Google, Sentry), **AIPD**, **pentest léger** (item F) ; (5) la conformité des **consentements/information** est une **certification du responsable**, non vérifiée indépendamment ici. Le gate dur `WN_CB_RESULTS_ENABLED` (résultats biologiques réels) **reste distinct** et ne s'ouvre qu'après attestation HDS effective.
- Référence : `docs/claude/propositions/2026-07-24-audit-migration-hds/` (AUDIT, RUNBOOK §4/§5, CHECKLIST_FINALISATION F/D/E), `docs/DECISIONS.md` D‑005 (RLS), `docs/FEATURE_FLAGS.md`

### D-005 — RLS (exig. 3 HDS) : le deny-all documenté comme contrôle suffisant (posture A)

- Date : 2026-07-27
- Statut : accepté — **confirmé par le DPO le 2026-07-27** (posture A : deny-all base + gardes applicatifs satisfait l'exigence 3)
- Domaine : sécurité et conformité (HDS, exigence 3 — cloisonnement d'accès aux données)
- Confirmation : le DPO a confirmé le 2026-07-27 que la posture A (deny-all base + gardes applicatifs) satisfait l'exigence 3 pour une application mono-domaine sans API de données ouverte ; confirmation relayée par le responsable (à archiver par écrit au dossier d'audit). La **posture B** reste le repli si un audit ultérieur exige une isolation au niveau base indépendante du code.
- Décision : le socle **deny-all** déjà en place — RLS activée sans policy et sans `FORCE` sur 71 tables `public` (migration `20260707123710_enable_rls_security`, état prod vérifié le 2026-07-27 : 0 policy, 0 `FORCE`, app connectée en `postgres` = propriétaire) — **plus** les gardes applicatifs (portail résolu par `session.idPatient` sur cookie signé depuis #397, session praticien Google restreinte `@wellneuro.fr`) couvrent l'exigence 3. La **posture B** (`FORCE` + policies par principal, isolation ligne à ligne au niveau base) n'est **pas retenue à ce stade** : disproportionnée pour une application mono-domaine sans API de données ouverte ni multi-tenant à cloisonner en base, et à fort risque de régression silencieuse.
- Conséquences : **aucun code base**. La justification tient au fait que le vecteur réellement adressé par la RLS Supabase — l'API de données managée (PostgREST, rôles `anon`/`service`) — est neutralisé par le deny-all, tandis que l'isolation ligne à ligne reste **applicative** et déterministe. Garde-fous : ne pas connecter l'app sous un rôle propriétaire différent sans revoir cette décision ; ne pas créer de policy partielle **sans** `FORCE` (sans effet sur le rôle propriétaire, elle donnerait une fausse impression de couverture). Si l'audit exige une isolation base indépendante du code, basculer vers la **posture B** — chantier sous 🚪 go explicite + fenêtre dédiée, à démarrer tôt vu l'échéance de dérogation (2026-10-21).
- Référence : `docs/claude/propositions/2026-07-24-audit-migration-hds/ADDENDUM_RLS_EXIG3.md`, `docs/claude/propositions/2026-07-24-audit-migration-hds/NOTE_DPO_RLS_EXIG3.md`, `CHECKLIST_FINALISATION.md` (section C)

### D-004 — Corpus scientifique 5.0 : pgvector en production, Apps Script transitoire

- Date : 2026-07-21
- Statut : accepté
- Domaine : architecture et corpus
- Décision : le corpus scientifique (supports SIIN validés) est indexé dans PostgreSQL/pgvector (`rag_corpus_chunks`, PR #196) selon un modèle à deux couches — verbatim source immuable + claims validés praticien. Les gates G0 (droits, verdict utilisateur du 2026-07-21) et G5 (migration pgvector) sont ouverts ; détail au `docs/claude/REGISTRE_FRONTIERES.md` (A9).
- Conséquences : le pipeline Apps Script corpus v1.5 est un **appelant transitoire** de la production — il ingère le stock (lots 000-013 puis extraction croisée Sonnet 5 + GPT-5.4) et s'éteint à l'ouverture de l'Atelier corpus (`dashboard/corpus`). D-001 reste entière : aucune dépendance Sheets dans les routes applicatives ; l'ingestion passe exclusivement par `/api/internal/rag/ingest` sous secret partagé. Aucune sortie RAG n'atteint un patient sans validation praticien (D-003).
- Référence : `docs/claude/REGISTRE_FRONTIERES.md` (A9), `docs/RAG_PGVECTOR_PRODUCTION.md`, `docs/claude/propositions/2026-07-21-corpus-wellneuro-5-0/`

### D-003 — Séparation déterministe et narration IA

- Date : 2026-06-15
- Statut : accepté
- Domaine : clinique et IA
- Décision : les règles de sécurité, de scoring et de priorisation doivent rester déterministes et testables
- Conséquences : le LLM peut traduire et synthétiser, mais ne décide pas seul. Vigilances critiques codées en dur, non déléguées au LLM.
- Référence : `docs/claude/REGLES_CRITIQUES.md`

### D-002 — Portail permanent est le flux patient principal

- Date : 2026-07-03
- Statut : accepté
- Domaine : produit
- Décision : `/portail/[token]` est le parcours patient principal et unifié
- Conséquences : `/patient/[idAssignation]` reste un flux de compatibilité legacy, non augmenté de nouvelles fonctionnalités
- Référence : `docs/PROJECT_STATE.md`

### D-001 — PostgreSQL est l'unique base runtime

- Date : 2026-07-07
- Statut : accepté
- Domaine : architecture
- Décision : toutes les données runtime sont lues et écrites via Prisma dans PostgreSQL/Supabase
- Conséquences : Google Sheets ne doit pas être réintroduit dans les routes applicatives
- Référence : `docs/PROJECT_STATE.md`

## Décisions archivées

> Les décisions anciennes sont versionnées dans les entrées `SESSION_LOG.md` (voir `docs/archive/sessions/`).
