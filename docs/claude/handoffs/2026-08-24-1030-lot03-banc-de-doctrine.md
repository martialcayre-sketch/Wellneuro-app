# LOT-03 — `DC-58` n'a pas de sujet, sa méthode ne tient pas, le banc change de versant

- Date : 2026-08-24
- Campagne : `2026-08-18-doctrine-executable`, LOT-03 (V5 — le banc de doctrine)
- Décision : `D-105`
- Branche : `doctrine/lot03-banc-de-doctrine`

## Ce qui a été mesuré avant d'écrire quoi que ce soit

La fiche exigeait la mesure avant le banc (« c'est elle qui dit si le garde a un
sujet »). **Elle a dit non deux fois** : pas de sujet, et pas de méthode.

Descente sur **476 fichiers de test**, **595 fichiers source**, **283 fichiers
de `src/lib`**.

**1. Zéro valeur orpheline.** 128 candidats au lexique clinique étroit, 25 sans
provenance, tous légitimes après qualification une par une : **19** lignes de
fixture d'une colonne Prisma (`doseCibleBasse/Haute`, `seuilDoseBasse/Haute`,
`doseParDjr` — les vraies valeurs vivent en base, curées) ; **4** codes HTTP 400
attrapés dans des titres de test (`it('création avec une bande : 400, …')`) ;
**2** sorties calculées.

**2. Et surtout, la méthode prescrite est vacue.** Vérifier qu'une valeur de
test « existe ailleurs » ne prouve rien : avec **633 valeurs distinctes** au
dénominateur, presque tout entier court trouve un répondant **par hasard**.
`poids = 1` était « couvert » par le chiffre 1 d'`indicationsBiologieV1.ts` ;
`doseCibleBasse = 4000` par `LONGUEUR_MAX_CE_QUI_COMPTE`, une longueur de texte.
Une seconde formulation (un test qui réécrit la valeur d'une constante déclarée
au lieu de l'importer) échoue pareil : un `3` n'importe où dans un test du même
dossier suffit. **Le banc aurait été vert en permanence et vert pour la mauvaise
raison** — ce que les interdits de la fiche refusent explicitement.

Détail chiffré : `docs/claude/campagnes/2026-08-18-doctrine-executable/LOT-03-MESURE.md`.

## Ce que le lot livre

**Le banc regarde des POSITIONS, plus des valeurs.** Un littéral à droite d'un
opérateur de comparaison **est** un seuil, sans qu'on ait à deviner si le nombre
est clinique — c'est le versant décidable de la phrase de `DC-58`.

`web/src/lib/doctrine/seuilsLitterauxMotives.guard.test.ts` (9 cas, 430 ms) :
balayage automatique de tout `src/lib`, neutralisation des chaînes, commentaires
et **expressions régulières**, puis exigence que toute comparaison à littéral non
trivial hors catalogue soit **nommée dans une constante motivée** ou **inscrite
avec son motif écrit**. Une comparaison inconnue rougit plutôt que d'être
devinée — patron de `D-046`.

Trois gardes d'anti-vacuité, parce que ce banc est surtout dangereux quand il se
tait : le balayage doit voir > 200 fichiers et > 30 comparaisons ; le prédicat de
catalogue doit reconnaître le catalogue **et lui seul** ; le neutraliseur est
éprouvé aux deux bouts (il efface ce qui n'est pas du code, et **rien de plus** —
une regex portant une apostrophe ouvrait sinon une fausse chaîne qui avalait le
code suivant, panne parfaitement silencieuse). Une **exemption morte** fait
rougir : sinon la liste pourrit et exempte un jour un code arbitré pour un autre.

**Deux littéraux nommés, aucune valeur changée**, même défaut aux deux — un
repère unique écrit plusieurs fois, dont une seule écriture nommée :

- `equilibre/discordanceRythme.ts` confrontait le déclaré à un `10` nu pendant
  que l'observé lisait `SEUIL_JEUNE_MIN`. C'est **un seul repère** (SIIN54 se
  répond en heures, l'agenda s'observe en minutes, le barème n'en déclare qu'un :
  `{id:'SIIN54',points:2,seuil:{min:10}}`). Porter `SEUIL_JEUNE_MIN` à 11 h
  laissait le déclaré comparer à 10 — la discordance aurait alors confronté deux
  repères différents **en silence**, et le drapeau de sur-déclaration se serait
  levé ou tu sans raison lisible. `SEUIL_JEUNE_DECLARE_H = SEUIL_JEUNE_MIN / 60`.
- « trois actions maximum » était écrite **six fois dans trois fichiers** — le
  refus du moteur, le second refus de l'aperçu patient, deux gardes de saisie, un
  bouton désactivé, un libellé « /3 ». `MAX_ACTIONS_PROTOCOLE_21J` vit dans
  `clinical-engine/types.ts`, **seul foyer possible** : ce fichier n'importe que
  des types, donc un composant client peut l'importer en valeur sans embarquer
  `node:crypto` (le défaut que `bundleClient.guard.test.ts` ferme pour
  `lib/clinical`).

Provenance des deux **établie, pas inventée** : le repère de jeûne est déclaré au
catalogue ; « trois actions maximum » vient de
`docs/RELATION_PRATICIEN_PATIENT_SOURCE.md` — borne de **charge** de la relation,
sans claim ni intervalle, et qui n'a pas à en avoir.

## Ce que ce banc NE garde pas — limite nommée, pas oubli

Il garde **`DC-19`/`DC-20` plus que `DC-58`**, et son en-tête le dit : un banc
dont on croit qu'il garde autre chose que ce qu'il garde est pire qu'absent.

Le **catalogue est exempté par forme** — un cut-off écrit dans le catalogue est
chez lui, c'est lui la source déclarée, et `ranges.ts` interdit déjà de
ré-encoder ses bornes ailleurs. Les **33** seuils de `questions.ts` (PSQI,
Horne-Östberg, Karasek…) restent gardés par la certification de scoring et par
`DC-17`/`DC-18`.

## Le banc vu rouge — quatre fois

1. **Fichier neuf** portant un seuil orphelin (`ferritine < 30`) — la découverte
   automatique le nomme `fichier:ligne — expression`.
2. **Exemption morte** injectée dans la liste.
3. Correction 1 défaite (retour de `declare.SIIN54 >= 10`) — deux cas rougissent.
4. Correction 2 défaite (retour de `actions.length > 3`) — deux cas rougissent.

## Validation

- **T1 vert** (code 0, audit de campagnes et anti-secrets compris).
- **T2 : segment Vitest entièrement vert** — 455 fichiers, 5 770 tests, 1 skip,
  **0 échec**, sur les deux exécutions.
- **T2 : segment E2E rouge, démontré étranger au lot.** Le harnais classe seul :
  « navigation expirée, AUCUNE requête de page émise ». Rejoué une fois, **le
  test en échec a changé** — `portail-parcours.spec.ts` puis
  `trajectoires.spec.ts`, toujours sur le projet **iPhone 13 (WebKit)**. La
  navigation n'est jamais sortie du navigateur : ni l'application, ni Prisma, ni
  le diff ne peuvent l'expliquer. Signature macOS connue, jamais observée en CI.
  Le segment E2E relève du CI tant que `D-049` tient.

## Ouvert

- **`source.axes_prioritaires.length > 3`** (`synthese-praticien.ts`) —
  troisième borne « au maximum 3 » du dépôt, après les actions de protocole et
  les cartes de fil. Elle valide un brouillon de sortie LLM et **rien n'indique
  d'où vient le 3**. Exemptée **en étant inscrite comme dette** dans le banc :
  l'arbitrage appartient au praticien.
- **`DC-58` reste une proposition** — instruite, sans contre-exemple dans le
  dépôt, sans méthode fondée par égalité de valeurs. La rouvrir suppose un fait
  neuf, pas une seconde tentative de la même mécanisation.
- **`.wn/state.json`** porte encore `active_lot: LOT-06` : le lot suivant est un
  arbitrage, pas un geste de clôture. Restent `LOT-07`, `LOT-08` et `LOT-10`.
- Rappel hérité : la release de `3f99ccd6` (signature `D-104`) attend toujours
  son approbation — sans elle la signature n'atteint pas la production.
