### Dossier d'arbitrage — les 42 instruments dont les droits ne sont pas instruits

Suite de l'arbitrage des huit instruments sous licence tierce (#460, mergée le
même jour). Ce dossier ne change aucune ligne de code applicatif et ne décide de
rien : il rend vérifiable ce sur quoi le praticien décidera, pour les 42 entrées
`a_verifier` du registre.

**Le fait central** : `a_verifier` ne veut pas dire « douteux », il veut dire
**personne n'a instruit**. Aucune des 42 ne porte de `proprietaireDroits`, aucune
ne porte de `dateVerification` — le champ que le vérificateur du CI exige, avec un
statut dégagé, pour franchir `droits_verifies`. Cinq entrées portent une mention
antérieure (PSQI, PSS-10, DASS-21, AUDIT, QDRS) : **les cinq se terminent par « à
vérifier », aucune des cinq permissions n'est adossée à la source extraite, et les
cinq vont dans le sens permissif** — pour `Q_GEO_05`, la source confirme
l'attribution mais pas la permission. Une affirmation invérifiable qui rassure coûte plus cher
qu'une qui inquiète : c'est elle qui dispense d'instruire.

**Trois groupes construits sur ce que la source extraite documente**, nommés en
clair et non A/B/C — le registre porte déjà deux axes A/B/C sans rapport (COSMIN
et les niveaux de preuve WellNeuro), et il interdit nommément de les confondre.
L'ordre dans lequel ils apparaissent n'est pas un ordre de priorité, précisément
pour ne pas rejouer la faute relevée en revue sur #448 : classer selon qu'une
ligne de copyright a été extraite ou non accorde le statut le plus permissif aux
instruments les moins documentés.

- **« source nommante » — elle nomme une origine : 14.** Perrot & Bouhassira, Burckhardt,
  Tinetti, Sabbagh, Galvin, Dubois, Beck/Freston, Terman & Williams, Karasek &
  Theorell, Lagrue & Légeron, Gilliard, Maslach-Pines, l'université de Bristol, le
  Dr Caci.
- **« pied de page seul » — celui du SIIN, et rien d'autre : 16.** Il dit qui a
  **reproduit** l'instrument dans un support de formation, pas qui le **détient** ;
  c'est le registre qui l'écrit, dans le `droits.detail` de 15 de ces 16.
- **« source muette » — aucune mention, d'aucune sorte : 12.** Le groupe le **moins informé**,
  ce qui ne le rend ni plus ni moins libre.

**L'usage réel, mesuré en base de production** : **2 assignations ouvertes**
(`Q_GAS_03` Bristol, `Q_GAS_02` Francis), **14 instruments portant des réponses**,
**26 sans aucun usage** — dont un, `Q_FIB_03`, déjà fermé. 2 + 14 + 26 = 42.

**L'attente à calibrer, plus basse qu'il n'y paraît.** Dégager les droits fait
franchir **un seul barreau**. Les 42 sont toutes en `statutContenu: a_auditer`, et
**15 portent au moins une divergence critique au banc**. Projection : droits
dégagés sur les 42, **au plus 27** pourraient viser `scoring_verifie`. Sur les 64
instruments du registre, **45** sont au deuxième barreau ou en deçà et **52** n'ont
pas franchi `droits_verifies`.

**Un banc neuf, et c'est la partie qui servira le plus.** Un dossier d'arbitrage
est de la prose : rien ne relie ses chiffres au registre dont ils sortent.
`scripts/dossier_droits_42.test.mjs` les recompte tous et exige que le texte porte
exactement ces nombres — le registre bouge, le banc rougit, le dossier doit suivre
au lieu de vieillir en silence à côté de la donnée qu'il commente.

Il est branché au CI **sans le garde `docs_only`**, délibérément : il protège un
document, et une PR purement documentaire est exactement celle où il doit mordre.
L'y soumettre en ferait un garde qui saute quand il servirait. Il entre aussi dans
`npm run check` — la leçon LOT-01b, « un palier qui ne couvre pas ce que le CI
vérifie ne protège de rien », et elle mordait ici avec ironie puisque le premier
public de ce banc est l'auteur d'une PR documentaire, celui qui ne lance que T1.

Le banc **fige un instantané, et c'est voulu** : le dossier est daté. Le jour où
le praticien tranche, le registre bougera et le banc rougira. Son en-tête écrit la
procédure de retrait — archiver le dossier avec sa date, retirer le banc **et** son
étape de CI dans la même PR que la décision, le dire au changelog. Rafistoler un
dossier d'arbitrage périmé pour faire passer le CI serait pire que ne pas en
avoir.

**Six chiffres faux dans la première rédaction, trouvés en revue adversariale,
tous corrigés** — le banc en a attrapé un septième à sa première exécution, et une
contre-revue trois affirmations neuves fabriquées par la correction elle-même :

- « 16 instruments dépendent de la déclaration du praticien » : **35** portent la
  déclaration du 2026-07-29 et sa réserve, **7** relèvent de celle du 2026-07-26 et
  ont été rétrogradées de `permission_obtenue` le jour même. 35 + 7 = 42 :
  **aucune n'échappe à l'une ou à l'autre**, et il y a **deux** déclarations
  vivantes de périmètres différents, non une.
- « ces 16 sont en `reference_identifiee` » : **11** le sont, **5** sont en
  `a_completer`. Et surtout, `statutBibliographique` ne porte **pas** la
  distinction « reproduit / détient » — il mesure une complétude bibliographique.
  L'argument tient, son adossement au registre était faux.
- « le PSQI appartient à l'université de Pittsburgh ; le Fagerström, l'AUDIT,
  l'IPSS, le Zarit de même » : affirmations de titularité que le registre ne porte
  pour **aucun** des 42. Retirées — elles contredisaient la promesse d'ouverture du
  document.
- « 54 sur 64 bloqués au deuxième barreau » : aucune lecture du registre ne donne
  54. C'était 64 − 10, soit le **cinquième** barreau présenté comme le deuxième.
- « 28 demandent une recherche d'ayant droit » : le registre nomme des auteurs sur
  **38** des 42. La vraie distinction n'est pas « nommé / anonyme » mais **« nommé
  par la source » (opposable) contre « nommé de mémoire » (à confirmer)**, ce que
  le registre précise lui-même.
- « les cinq d'hier », « le MMSE fermé hier » : #460 a été mergée le **2026-07-29
  à 14 h**, le jour même.
- **Attrapé par le banc, pas par la revue** : « 39 des 42 ont des auteurs
  renseignés » — c'est **38**. `Q_NEU_12` est nommé par sa **source** et pas par le
  **registre** : les deux champs ne se recouvrent pas, et compter l'un pour l'autre
  se trompe dans les deux sens.

**Trois affirmations neuves, fabriquées par la correction, retirées en
contre-revue** — le motif « chaque correction fabrique la suivante » s'est rejoué
une sixième fois aujourd'hui, à intensité moindre :

- « `Q_NEU_01` était monté à `scoring_verifie` » : **jamais**. Les onze révisions
  committées du registre le donnent `repere` puis `source_obtenue`. Il l'aurait
  franchi sans la rétrogradation du même lot — un conditionnel durci en fait
  accompli.
- « les cinq mentions sont introuvables dans la source » : vrai de quatre. La
  source de `Q_GEO_05` **confirme l'attribution** (Galvin 2015) ; seule la
  permission manque. Le dossier se contredisait à deux pages d'intervalle,
  puisqu'il classe `Q_GEO_05` parmi ceux que leur source nomme.
- « `Q_NEU_12` porte deux ayants droit » : **au moins trois** — l'IDTAS, le
  Prime-MD de sa partie 1, et le *Seasonal Pattern Assessment Questionnaire* de
  ses parties 2 et 3 (Rosenthal, Bradt & Wehr, NIMH). Sur l'instrument que le
  dossier met deux fois en vedette, et sur la grandeur qui décide du coût
  d'instruction.

**`droits.md` corrigé dans le même lot** : le document frère (#448) écrivait
« 43 » et « 32 / 11 » là où le registre porte 42 et 30 / 12. Il décrivait
fidèlement l'état d'avant l'édition du registre par sa propre PR — le parent du
commit de merge portait bien 43 (32 / 11). Deux documents voisins et
contradictoires, dont un seul gardé, sont la configuration qui produit la revue
suivante.

**Trois questions rendues au praticien** : le périmètre des deux déclarations
(couvrent-elles les instruments tiers reproduits dans les supports SIIN ? les 42 en
dépendent, et la déclaration du 2026-07-26 est-elle encore vivante ?) ; le seuil
d'action (tout fermer met le PSQI et le DASS-21 hors service ; « fermer ce qui
n'est pas utilisé » vaut 25 instruments encore ouverts, à coût nul) ; et le statut
d'un auteur nommé de mémoire, qui fait basculer le volume de 14 à 38.

Aucun statut de registre modifié. Les rapports du banc de certification restent
hors du dépôt : ils citent le verbatim des sources.
