### Synthèse — une association ne se restitue jamais en preuve (`DC-09`, `D-097`)

- **Le prompt de synthèse porte l'interdit `DC-09`**, dans son cadre
  déontologique : « **Une association n'est pas une preuve.** […] Ne l'écris
  jamais sous la forme "X prouve Y", "X explique Y", "X démontre Y" ni
  "X atteste Y" ». C'était le dernier des quatre garde-fous que l'audit du
  2026-08-11 désignait comme les plus exposés à n'avoir **aucun ancrage** — ni
  clause de prompt, ni marqueur de sortie. Le déterministe, lui, tenait déjà
  (`ContradictionFinding.description` impose la formulation neutre).
- **La clause dit aussi ce qui reste attendu**, et ce n'est pas de
  l'ornement : le même prompt exige ailleurs « restituer et **expliquer** » la
  recommandation déterministe. Un interdit brut sur le verbe *expliquer*
  aurait renversé cette consigne. La clause sépare **expliciter un motif
  donné** de **poser qu'un élément en explique un autre**.
- **`confirme` et `signe` sont volontairement hors de la liste** : le prompt
  emploie déjà « à confirmer par l'entretien » et « signale-le », et un
  interdit sur ces deux mots se lirait comme une contradiction de consignes
  voisines. Aucun lexique clinique n'est créé — la clause interdit une forme
  de phrase, elle n'établit rien.
- **Le banc garde la formule ET sa position**
  (`promptAssociationPreuve.guard.test.ts`). Le prompt contient une clause de
  primauté : la section « Recommandation d'exploration déterministe » prime
  sur toute consigne relative aux explorations mais « ne relève aucune des
  interdictions posées plus haut ». Une clause descendue sous cette section
  perdrait sa préséance **sans qu'un mot ait bougé** — le test d'ordre tient ce
  bout-là. Vue rouge constatée deux fois : clause retirée (4 tests rouges),
  clause déplacée (le seul test de position rouge, texte intact).
- **Le second point de passage est examiné et écarté, avec son motif écrit
  dans le fichier** (`verifierRestitutionOrientation.ts`). Ce détecteur ne juge
  que contre un **vocabulaire fermé** ; le glissement probatoire n'en a pas, et
  l'y forcer demanderait une fenêtre d'adjacence et un traitement de la
  négation — un arbitrage chiffré neuf, que la constitution interdit
  d'inventer. Le régime de `D-011` — journaliser, ne pas censurer — n'est pas
  touché.
- **Version de prompt : `synthese-v28` → `synthese-v29`, déclarée.** Une
  synthèse rédigée sous v28 a pu écrire « X explique Y » là où la donnée ne
  portait qu'un lien possible : les deux versions ne se comparent pas sur ce
  point.
- **Limite assumée** : le banc épingle la consigne, jamais la sortie du
  modèle. Il ne prouve pas que le modèle obéit ; il prouve qu'on ne lui a pas
  retiré l'interdit en silence.
- `DC-09` bascule de *Proposition* à **acté**. Les quatre règles les plus
  exposées de l'audit sont désormais toutes ancrées ; `DC-36` reste la seule
  règle sans preuve, sans banc et sans véhicule.
