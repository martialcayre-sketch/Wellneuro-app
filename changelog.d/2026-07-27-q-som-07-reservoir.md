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

### Réserves connues, laissées telles quelles

- **Le snapshot clinique C1 compte encore `Q_SOM_07` parmi les réponses
  « calculables »** (`lib/clinical-engine/clinicalSnapshot.ts`). C'est vrai de
  ses `rawAnswers`, et cette voie ne produit ni score ni interprétation pour cet
  instrument. Le basculer en `not_calculable` **introduirait une affirmation
  fausse** : `clinicalReview` en tire le motif « la réponse ne contient pas de
  données brutes complètes et exploitables », alors qu'elles le sont. Le faire
  proprement demande un motif distinct dans le type `evaluability` — un lot à
  part, dans un moteur qui porte ses propres invariants.
- **Mon équilibre et l'orientation ne sont pas concernés**, vérifié :
  `Q_SOM_07` n'apparaît dans aucun `BESOIN_SOURCES` (donc aucune couverture,
  aucune fondation critique), et `ORIENTATION_RULES_V1` est une table vide.
- **`SyntheseIA.donneesEntree` conserve la trace non filtrée** des données
  d'entrée, y compris pour ces passations. C'est délibéré : c'est un journal
  d'audit de ce qui est **entré**, pas de ce qui a été **envoyé**. Les synthèses
  déjà générées ne sont pas réécrites.
- **`prisma/seed.ts` recrée toujours la passation** (score 31, « Fatigue
  multidimensionnelle sévère »). La ligne est conservée sciemment — elle
  reproduit l'état réel de la production, et c'est précisément le cas qu'on veut
  voir marqué à l'écran.
- **Aucune écriture en base**, aucune migration : le retrait est une décision de
  lecture. Un `git revert` suffit à revenir en arrière.
