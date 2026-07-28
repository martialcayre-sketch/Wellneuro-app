### Clinique

- **La suspension fermait le robinet ; le réservoir se ferme ici.** Le lot #406
  a cessé d'envoyer `Q_SOM_07` (l'instrument servi sous ce nom n'est pas le
  MFI-20), et a écrit noir sur blanc la limite qu'il laissait : « les passations
  déjà enregistrées continuent d'alimenter la fiche et la synthèse IA avec
  l'interprétation que ce même lot déclare invalide. Un praticien lira encore
  “Fatigue sévère” sur une somme sans inversion d'items. » C'est cette réserve
  qui est levée.
- **Mesuré en production avant d'écrire une ligne** (`execute_sql`, 2026-07-27) :
  **4 passations**, sur **3 patients**, **toutes** porteuses d'un score et d'une
  interprétation. Trois d'entre elles portent sur des patients non fictifs, et
  **3 synthèses IA** ont déjà été générées pour ces patients depuis la première
  passation — la conclusion invalide a donc déjà atteint le modèle au moins une
  fois, et toute régénération la lui reservait.
- **Les quatre lignes ne se contredisent pas seulement avec leur source, elles
  se contredisent entre elles.** Un total de **31** y est enregistré « Fatigue
  multidimensionnelle sévère » (forme héritée, clés `GF`/`AM`/`global`) quand un
  total de **33** est enregistré « Fatigue dans les limites normales » (bandes
  /80 actuelles). Deux formats coexistent, leurs lectures s'inversent à deux
  points d'écart, et rien à l'écran ne le signalait.
- **Un registre dédié, délibérément distinct de `IDS_SUSPENDUS`.**
  `web/src/lib/scoring/passationsNonInterpretables.ts` nomme les instruments
  dont le **résultat enregistré** ne peut pas être lu comme une mesure. C'est le
  même raisonnement qui a fait écarter `IDS_ASSIGNABLES` comme garde au lot
  précédent : deux ensembles voisins ne disent pas la même chose. `actif: false`
  est une décision d'**envoi** et peut tenir à tout autre motif — `Q_FIB_03`
  (ELFE) est inactif parce qu'il n'a jamais été déployé, non parce que ses
  résultats seraient faux. Un test échoue si quelqu'un « simplifie » le registre
  en le dérivant de `!actif`.
- **Le piège de la réactivation est transformé en échec de CI.** La table est
  indexée par instrument, pas par passation : reconstruire `Q_SOM_07` depuis sa
  source et le réactiver marquerait ses NOUVELLES passations à tort. Rien dans
  le code ne le rattraperait — sauf la garde, qui exige que tout instrument du
  registre soit `actif: false`. L'inclusion ne vaut que dans ce sens ; la
  réciproque est explicitement refusée.
- **Trois surfaces neutralisées, à la source et non à l'écran.** Une carte
  exhaustive des lectures de `QuestionnaireReponse` a été dressée avant de
  toucher au code ; trois d'entre elles restituaient réellement la conclusion :
  - `api/praticien/synthese` — le modèle ne reçoit plus **aucun chiffre** de la
    passation : ni total, ni sous-scores, ni bande, ni réponses brutes, ni la
    mini-synthèse (second canal par lequel l'orientation lui parvient, lot
    #389). Il reçoit à la place un champ `mesureNonInterpretable` portant le
    motif. La passation reste **nommée** : la faire disparaître laisserait
    croire qu'elle n'a pas été remplie.
  - `api/praticien/reponses` — fiche patient : `scorePrincipal`, `interpretation`
    et les bornes de sous-scores partent ; un motif arrive.
  - `api/praticien/inbox-questionnaires` — le Fil, écran où le praticien
    **découvre** la passation : même retrait.
- **Marquer n'est pas effacer, et la différence tient dans une liste blanche.**
  Des `scores_json`, seul `rawAnswers` subsiste. Liste blanche et non liste
  noire de clés interprétatives, parce que les formes de scoring varient et
  qu'une liste noire ne couvre que ce qu'on a pensé à y écrire : elle aurait
  couvert `interpretation`/`total` de la forme courante et laissé passer
  `global` de la forme héritée. Ce que le patient a répondu reste vrai — ce sont
  ses réponses à des items, pas la lecture qu'on en a faite ; les conserver est
  ce qui permettra de rescorer si l'instrument est reconstruit.
- **Consigne système `synthese-v5` → `v6`.** Retirer la donnée est ce qui
  protège ; la consigne explique le trou. Elle est nécessaire parce que le
  modèle reçoit encore le **titre**, et qu'« MFI-20 — Échelle multidimensionnelle
  de fatigue » suffit à faire écrire « la fatigue mesurée ». Le bump n'est pas
  cosmétique : sans lui, les synthèses rédigées avant et après ne se
  distingueraient pas. L'empreinte du prompt est verrouillée avec la version par
  `promptAlimentaire.guard.test.ts` — c'est le couple qui est gardé.
- **À l'écran, le retrait se dit.** Sans un mot, la passation s'afficherait en
  « — » partout, ce qui se lit comme un incident technique et non comme une
  décision clinique. La fiche porte le motif sous le titre et un badge « Non
  interprétable » ; le Fil remplace « Sans score principal » — qui serait faux,
  la passation en portait un — par « Interprétation retirée » et le motif.
- **Gardes falsifiées, pas seulement écrites.** Sept mutations, chacune défaisant
  une propriété : registre vidé (**8** échecs), `Q_SOM_07` réactivé (**1**, et
  c'est la garde d'inclusion qui tombe, vérifiée nommément), registre dérivé de
  `!actif` (**1**), liste blanche désarmée (**6**), et le retrait débranché dans
  chacune des trois routes (**3**, **1**, **1**). Référence et restauration
  complète à **0**. Le contrôle négatif — un instrument courant garde ses
  chiffres — est présent sur les trois routes : sans lui, vider
  inconditionnellement ferait passer tous les autres tests au vert.

- **Les synthèses antérieures au retrait sont qualifiées à la lecture.** Les 3
  synthèses des patients concernés sont **toutes validées** (2
  `Validee_Praticien`, 1 `Corrigee_Praticien`) — donc expédiables — et 2
  mentionnent explicitement « MFI ». Elles ne sont pas réécrites : elles portent
  désormais une mention, dans l'écran de synthèse **et sur la prévisualisation
  du booklet**, là où le praticien décide d'envoyer au patient. Elle informe,
  elle ne bloque pas ; régénérer produit un texte propre, et c'est un clic.
  Le critère est la **date**, pas la version de prompt : les versions en base
  sont `v1`, `synthese-v3`, `synthese-v4` et `synthese-praticien-v1`, cette
  dernière étant portée par les synthèses rédigées à la main avant comme après
  le lot. Deux conditions cumulées — dossier concerné **et** synthèse antérieure
  — pour que la mention s'efface d'elle-même dès la régénération, plutôt que de
  devenir un bandeau qu'on apprend à ne plus lire.
- **Le moteur clinique C1 distingue désormais trois états, et non deux.**
  `evaluability` gagne `not_interpretable`, à côté de `calculable` et
  `not_calculable`. Ce n'est pas un synonyme : `not_calculable` dit que les
  réponses brutes manquent, `not_interpretable` dit qu'elles sont là, complètes
  — 20 items sur 3 des 4 passations — mais que l'instrument servi ne correspond
  pas à sa source. Recycler la valeur voisine aurait fait afficher « la réponse
  ne contient pas de données brutes complètes et exploitables » sur une
  passation qui en porte vingt. `clinicalReview` émet un constat distinct, avec
  son propre `findingId` et le motif du registre.
- **Les deux derniers chemins par lesquels un instrument suspendu pouvait
  encore être servi sont fermés.** `PATCH /api/praticien/assignations`
  déverrouillait une réponse et rouvrait la saisie — le lot #406 l'avait nommé
  (« geste délibéré, mais non gardé ») sans le fermer ; il rend maintenant 409
  avant toute écriture. Et le portail patient ne propose plus un instrument
  suspendu encore à remplir, `POST /api/patient/submit` le refusant également
  pour qu'un appel direct ne contourne pas l'écran. La doctrine antérieure
  — « un envoi parti doit rester remplissable et scorable » — valait tant que le
  motif de suspension était organisationnel ; elle ne tient pas quand le motif
  est que l'instrument **ne mesure pas ce qu'il annonce**. Une assignation déjà
  `Complété` reste visible : elle n'est plus à remplir, et l'effacer retirerait
  au patient un questionnaire qu'il a bel et bien rempli. Impact mesuré : les
  3 assignations `Q_SOM_07` de production sont toutes `Complété` — le filtre
  ferme un chemin, il ne change aucun écran aujourd'hui.

### Ce que la revue adversariale a corrigé

Verdict **GO conditionnel**, deux conditions, toutes deux traitées :

- **La moitié « écran » n'était gardée par rien.** Prouvé par mutation : en
  supprimant les blocs d'explication et le badge, la suite restait
  **entièrement verte**. La ligne serait retombée sur « — / — / Historique »,
  rendant la passation invalide indiscernable d'un vieux questionnaire sans
  score. Quatre tests d'écran l'ancrent désormais, contrôles négatifs compris.
- **La réserve sur les synthèses déjà générées n'était pas écrite** — elle l'est,
  et la décision a été prise de les qualifier plutôt que de les laisser muettes.

Et quatre constats mineurs, tous corrigés : la consigne v6 ne tenait qu'à son
empreinte (le geste « bump + recopie du hash » suffisait à la supprimer sans
rougir — deux assertions de contenu et un test de couplage consigne↔charge utile
le ferment, et sa suppression fait maintenant tomber **3 tests**) ;
`scoresSansMesure` rendait `{ rawAnswers: null }` au lieu de `{}` ; l'assertion
d'anti-réciprocité dépendait d'un tiers muet, `Q_FIB_03` y est nommé ; et une
assertion tautologique sur `IDS_SUSPENDUS` — dérivé de `!actif` — donnait
l'illusion d'une double garde.

**Correction d'une affirmation trop large.** « Les réponses brutes du patient
restent » n'est vrai que pour 3 passations sur 4 : la ligne du 2026-06-15, de
forme héritée, ne porte même pas la clé `rawAnswers` (vérifié en production).
Celle-là n'est donc rescorable en aucun cas.

### Réserves connues, laissées telles quelles

- **Mon équilibre et l'orientation ne sont pas concernés**, vérifié :
  `Q_SOM_07` n'apparaît dans aucun `BESOIN_SOURCES` (donc aucune couverture,
  aucune fondation critique), et `ORIENTATION_RULES_V1` est une table vide.
- **Le CONTENU des synthèses déjà générées n'est pas réécrit** — seule une
  mention l'accompagne (voir plus haut). Les réécrire d'office supposerait une
  écriture en base sur des données patient, hors de l'arbitrage rendu ; c'est la
  régénération, à la main du praticien, qui produit un texte propre.
- **Un booklet DÉJÀ envoyé reste envoyé.** La mention protège la décision
  d'envoyer, pas celles qui l'ont précédée : rien ne rappelle un document parti.
- **`SyntheseIA.donneesEntree` conserve la trace non filtrée** des données
  d'entrée, y compris pour ces passations. C'est délibéré : c'est un journal
  d'audit de ce qui est **entré**, pas de ce qui a été **envoyé**.
- **`prisma/seed.ts` recrée toujours la passation** (score 31, « Fatigue
  multidimensionnelle sévère »). La ligne est conservée sciemment — elle
  reproduit l'état réel de la production, et c'est précisément le cas qu'on veut
  voir marqué à l'écran.
- **Aucune écriture en base**, aucune migration : le retrait est une décision de
  lecture. Un `git revert` suffit à revenir en arrière.
- **La date de mise en service est une constante** (`RETRAIT_EN_SERVICE_LE`). Si
  le déploiement glisse d'un jour, une synthèse fraîchement générée — donc saine
  — peut porter la mention une journée de trop. Faux positif assumé, levé par
  une régénération ; le faux négatif inverse laisserait partir au patient une
  conclusion tirée d'une mesure retirée.
