---
id: "LOT-01"
statut: "terminé (2026-08-23 — D-095 ; descente des 58 règles en éventail, deux bascules retenues sur trois preuves (DC-29, DC-33 par régularisation), trois « Banc dû » périmés retirés, neuf règles orphelines nommées ; aucun code modifié)"
dépend_de: "—"
---

> **Amendé le 2026-08-23 à l'exécution.** Le cadrage annonçait la bascule de
> `DC-17` et `DC-30` : c'était inexact, les deux étaient **déjà actées**
> — ce qui était faux dans leur ligne était la réserve « **Banc dû** », leurs
> bancs existant désormais. Une seule bascule proposition → acté a résisté au
> filtre des trois preuves (`DC-29`) ; `DC-33` a été proposée, **rejetée**
> faute de décision, puis basculée **par régularisation** sur arbitrage du
> responsable. Deux marqueurs ont été créés (**Décision due**, **écrite, non
> armée**) pour éviter quatre précédents contradictoires dans le même
> document. Les quatre règles non armées ont été traitées ici plutôt qu'au
> LOT-08 : leur vérification devient une relecture, pas une découverte.

# LOT-01 — L'état atteint : requalifier l'audit, basculer ce qui est déjà acquis

## But

À la fin de ce lot, `CONSTITUTION_CLINIQUE.md` et
`AUDIT_DOCTRINE_CHAINE_T0.md` disent **ce que le dépôt tient réellement au
2026-08-23**, et rien de plus. Aucun code n'est modifié. C'est le lot qui rend
les sept suivants mesurables : tant que le document et le code divergent,
« refermer une règle » n'a pas de critère.

Trois retards sont connus au cadrage et se soldent ici ; le lot en cherche
d'autres, il ne se limite pas à cette liste.

## Périmètre

1. **Re-vérifier les 58 lignes** du tableau de l'audit contre le dépôt, une
   par une, comme l'audit d'origine l'avait fait — code, pas documentation.
2. **Basculer les statuts dont les trois preuves existent**, en citant la
   décision qui les porte. Candidats identifiés au cadrage :
   - `DC-17` — le hook porte `demandeClinique` depuis le Socle LOT-02
     ([[D-083]]) : six tables signées et deux fichiers de constantes au niveau
     « demande ». La constitution dit encore « **Banc dû** ».
   - `DC-30` — `contradictionsEngine.ts` + `contradictionFinding.guard.test.ts`
     ([[D-041]], [[D-044]]) : la discordance est détectée par le déterministe,
     imposée à la restitution, et l'objet porte exactement les six éléments
     minimaux de la règle. La constitution dit encore « **Banc dû** ».
   - `DC-29` — les quatre niveaux sont **typés** (`GraduationConvergence`) et
     gardés contre tout champ de certitude, mais **aucun producteur** ne les
     émet. Le statut juste n'est ni « proposition » ni « acté » : le lot pose
     la formulation exacte et renvoie l'arbitrage au LOT-06.
3. **Fermer §D et §E comme véhicules** dans l'audit : §D est clos (Socle
   LOT-02) ; §E a son banc de fraîcheur avec découverte automatique des tables
   signées ([[D-042]], [[D-046]]) — le mode de défaillance est fermé, le
   compilateur reste absent, donc `DC-26` reste **partiel** et le dit.
4. **Requalifier V1 et V4** dans l'audit, avec la mesure qui le justifie :
   V1 à moitié livré (structure oui, producteurs non), V4 périmé (ses deux
   fiches d'accueil sont livrées, la campagne T0 est terminée 10/10).
5. **Consigner la mesure de production** du cadrage — 8 224 claims tous
   `VALIDE`, `metadata` sans axe doctrinal, `typologie_lecture` fermée sur
   quatre valeurs sans rapport avec `A-E` — qui tranche la question laissée
   ouverte au §A.
6. **Écrire la portée de `DC-14`** (arbitrage du responsable, 2026-08-23) :
   la règle gouverne l'**extrapolation d'un claim**, elle ne commande pas le
   défaut d'une colonne. Une population générale **déclarée** n'est pas un
   silence — le dépôt en fait déjà la démonstration signée avec
   `BiologyFunctionalRange.population NOT NULL DEFAULT 'adulte_tout_venant'`
   et son `CHECK` fermé (`D-068`/`D-069`). Le modèle retenu pour la campagne
   est **général déclaré + exclusions déclarées**, porté par l'intervention
   (95 entrées) et non par le claim (8 224).
   C'est une **précision de portée, pas un renversement** : le texte de
   `DC-14` n'est pas modifié, sa lecture est écrite. Si la descente montre que
   le texte ne supporte pas cette lecture, le lot s'arrête et le dit — amender
   une règle de la constitution est un acte distinct.
7. Une décision `D-xxx` unique portant la requalification **et** cette portée,
   avec son fragment `changelog.d/`.

## Fichiers probables

- `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md`
- `docs/claude/doctrine/AUDIT_DOCTRINE_CHAINE_T0.md`
- `docs/DECISIONS.md` (une entrée)
- `changelog.d/2026-xx-xx-doctrine-etat-atteint.md`

## Interdits

- **Aucune modification de code, de banc, de table de règles ou de seuil.**
  Un lot qui « en profite » pour corriger une ligne de moteur mélange le
  constat et l'acte.
- **Ne basculer aucun statut sans ses trois preuves.** Une règle dont le banc
  n'existe pas reste « proposition », même si le code la respecte en pratique
  — c'est précisément la distinction que `D-043` a introduite.
- Ne pas renuméroter, fusionner ni supprimer une règle `DC-nn` : la
  numérotation est citée par des bancs, des commentaires de code et des
  décisions.
- Ne pas réécrire l'audit du 2026-08-11 en le datant d'aujourd'hui :
  l'amendement s'ajoute et se date, le constat d'origine reste lisible.

## Dépendances

Aucune en amont. En aval : tous les lots citent les statuts établis ici.

## Étapes

1. Descente des 58 lignes contre le dépôt ; noter chaque écart avec sa mesure
   (fichier, ligne, ou requête).
2. Rédiger les bascules avec leur référence `D-xxx` d'origine.
3. Amender l'audit : §D clos, §E requalifié, V1 et V4 requalifiés, §A tranché.
4. Décision `D-xxx` + fragment `changelog.d/`.
5. T1, puis T2 (aucun code touché, mais les bancs citent la doctrine).

## Tests

- T2 — des bancs lisent la doctrine (`claimsEpinglesFraicheur`,
  `verifier_registre_interventions`) ; une renumérotation accidentelle les
  ferait rougir, et c'est le filet de ce lot.
- Relecture : chaque bascule cite une décision **existante**, jamais une
  décision à venir.

## Critères de done

- [ ] Les 58 lignes re-vérifiées, chaque écart mesuré contre le code.
- [ ] `DC-17` et `DC-30` basculés avec leur référence ; `DC-29` formulé
      exactement (typé, sans producteur) et renvoyé au LOT-06.
- [ ] §D clos, §E requalifié, V1 et V4 requalifiés, §A tranché dans l'audit.
- [ ] Portée de `DC-14` écrite (extrapolation, pas défaut de colonne) — ou le
      lot s'arrête en disant que le texte ne la supporte pas.
- [ ] Une décision `D-xxx` + un fragment `changelog.d/`.
- [ ] Aucun fichier de code modifié.
