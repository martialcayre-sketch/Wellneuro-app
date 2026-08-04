### Reliquat de certification — trois axes distincts posés dans la gouvernance (2026-08-04)

`scoring_verifie` disait « le calcul est conforme » ; rien ne disait ce qu'il ne
disait pas. `docs/gouvernance-questionnaires-scoring.md` gagne une section « Ce
que la certification ne dit pas » : le scoring vérifié n'est pas un jugement sur
l'instrument, la validité psychométrique (`cosmin`) n'a jamais été évaluée, et
la complétude bibliographique en est un troisième axe, séparé des deux
premiers.

- **2 entrées passent à `reference_identifiee`** dans
  `docs/claude/corpus/instrument_registry.json` (`Q_SOM_06`, `Q_PED_01`) :
  auteurs, année et forme publiée corrigés, `references.doi` et/ou
  `references.pmid` renseignés depuis une notice ouverte le 2026-08-04. Ce sont
  désormais les **deux seules** entrées du registre à porter un identifiant
  vérifiable.
- **`Q_ALI_03` reste `a_completer`, publication retrouvée comprise.** La méthode
  Monnier publiée (2001, PMID 11431607) a bien été identifiée, et elle n'est
  délibérément PAS portée en `references` : elle décrit une enquête en 8
  questions quand le servi en compte 23, avec trois écarts à la source décidés
  le 2026-07-31, et `web/src/lib/questionnaires/alimentaire.ts` déclare
  l'instrument débaptisé — « il n'est plus "selon Monnier" ». Attacher
  l'identifiant aurait fait certifier par un PMID une forme qu'il ne certifie
  pas, exactement ce qui avait déjà été refusé pour `Q_TAB_03`. Le lien vit
  dans `motifBibliographique` : documentaire, pas certifiant.
- **10 entrées gagnent un `motifBibliographique`** (`Q_STR_03`, `Q_NEU_03`,
  `Q_NEU_12`, `Q_SOM_09`, `Q_FIB_03`, `Q_TAB_01`, `Q_TAB_03`, `Q_URO_02`,
  `Q_ALI_03`, `Q_ALI_09`) : le constat de recherche du 2026-08-04, y compris quand il
  conclut qu'aucune publication d'origine n'existe et n'existera jamais
  (`Q_SOM_09`, `Q_ALI_09`, instruments créés localement). `Q_TAB_01` voit en
  plus sa liste d'auteurs corrigée (H.-J. Aubin en premier auteur, pas Lagrue).
- **3 lignes amorcées dans `docs/claude/corpus/measurement_evidence.json`**,
  toutes sur `Q_PED_01`, depuis Caci H. et al. (L'Encéphale, 2005) : cohérence
  interne, structure interne, fidélité — aucune ne porte d'appréciation
  COSMIN.
- **Le garde `scripts/lib/verifier_registre_instruments.js` rend ces invariants
  exécutables**, en trois erreurs bloquantes plutôt qu'en avertissements : un
  `a_completer` doit porter un `motifBibliographique` d'au moins 40 caractères
  — le seuil de `droits.detail` et de `verdictScoring.reserve.motif`, une
  phrase et non un gabarit — car sans lui rien ne distingue « cherché, rien
  trouvé » de « jamais cherché » ; un motif ne peut PAS survivre à la
  promotion de son entrée, une entrée `reference_identifiee` qui conserve
  « aucune publication trouvée » contredisant le champ d'à côté sans que
  personne ne la relise ; et un `cosmin` autre qu'`inconnu` exige au moins une
  ligne de `measurement_evidence.json` portant le même `questionnaireId` ET le
  même `conclusionCosmin`, un grade ne se posant pas sur une déclaration.
  Aucun des trois ne mord sur une entrée réelle aujourd'hui : les 10
  `a_completer` portent leur motif et `cosmin` vaut `inconnu` partout.
- **Le barreau `psychometrie_revue` exige désormais une preuve CONCLUANTE**, et
  c'est ce lot qui avait ouvert le trou. Le barreau se contentait d'un test de
  PRÉSENCE (`idsAvecPreuve.has(id)`) : gratuit tant que `measurement_evidence.json`
  était vide, il devenait franchissable dès les trois lignes écrites ici — toutes
  `conclusionCosmin: "inconnu"`, dont une qui dit « coefficient non rapporté dans
  la notice consultée ». Une PR ultérieure aurait posé `psychometrie_revue` sur
  `Q_PED_01` avec un CI vert. Il faut maintenant au moins une ligne au dossier qui
  conclue A, B ou C, **et** un `cosmin` d'entrée autre qu'`inconnu` — « psychométrie
  revue » ne peut pas coexister avec « qualité psychométrique inconnue ». Trois cas
  de banc, un par branche.
- **`measurement_evidence.json` n'est plus classé « docs » par le CI**
  (`.github/workflows/ci.yml`). Une PR ne touchant que lui obtenait `docs_only`,
  donc un `verify` vert sans qu'aucune des deux étapes qui le lisent ne s'exécute.
  Depuis qu'il commande un barreau de certification, il fait autorité au même
  titre que `instrument_registry.json`, qui avait été reclassé pour cette raison
  exacte le 2026-07-29.
- **Le compteur de `check_questionnaire_certification.js` distingue ce qui peut
  fermer de ce qui ne fermera jamais** : « 10 à compléter dont 2 sans publication
  d'origine possible ». `Q_SOM_09` et `Q_ALI_09` sont des instruments créés par
  WellNeuro — aucune publication à retrouver. Le sous-compte est **dérivé** de
  `versionServie.statutContenu === 'cree_localement'`, jamais d'une liste en dur :
  un compteur qui ne peut pas atteindre zéro cesse d'être lu.
- **Le banc a été éprouvé par mutation, et il avait un trou — des deux côtés.**
  Quatre mutations appliquées une à une au vérificateur : retrait du contrôle,
  seuil affaibli en `> 0`, double égalité COSMIN réduite au seul
  `questionnaireId` — trois rouges. La quatrième, le **déplacement** du contrôle
  hors de la boucle sur les entrées (appliqué à `instruments[0]` seul), laissait
  le banc **vert** : tous les cas n'instanciaient qu'une entrée, et l'ancrage sur
  le registre réel lit le fichier sans jamais appeler le vérificateur. Le cas à
  deux entrées d'abord écrit plaçait la faute en seconde — donc **dernière** —
  position : la mutation symétrique (`instruments[instruments.length - 1]`)
  repassait vert, mesuré. La faute est désormais **encadrée**, une entrée saine
  avant et une après. C'est la leçon du 2026-08-03 — éprouver un garde sur le
  seul retrait de sa ligne ne prouve rien.
- **Deux ancrages sur le réel** ajoutés au banc : `measurement_evidence.json` est
  épinglé à 3 lignes dont aucune ne conclut autre chose qu'`inconnu` (y écrire une
  ligne graduée ouvre un barreau, ce n'est plus une addition documentaire) ; et
  les chiffres de `docs/gouvernance-questionnaires-scoring.md` sont **parsés du
  markdown** puis recalculés depuis le registre et le fichier de preuves — un
  compteur faux dans un document dont la thèse est « ne vous fiez pas aux
  étiquettes » serait le défaut le plus embarrassant du lot.
- **Trois écarts cliniques découverts pendant la recherche, non résolus par ce
  lot : ils appellent un arbitrage du praticien.** Ils ne sont aujourd'hui
  lisibles que par qui relit les `motifBibliographique`, d'où leur mention ici.
  (1) **`Q_STR_03`** — la source publiée décrit 11 items cotés 1-6 (étendue
  11-66) ; le dépôt sert 11 items cotés 0-5 (`maxTotal: 55`) avec cinq bandes
  d'interprétation, et l'instrument alimente Mon Équilibre. L'écart d'échelle
  n'est pas tranché. (2) **`Q_FIB_03`** — si l'item servi est bien l'examen des
  18 points sensibles, sa source publiée est le critère ACR 1990, pas l'ELFE.
  (3) **`Q_NEU_03`** — la notice de l'éditeur date le manuel de 1998, le registre
  déclare 1992. Aucun des trois n'est corrigé ici : changer une bande, un barème
  ou une année déclarée est une décision clinique.
- `statutCertification`, `cosmin`, les réserves, les seuils, les bandes
  d'interprétation et toute règle de scoring restent inchangés : aucun statut de
  certification n'est promu par ce lot.
