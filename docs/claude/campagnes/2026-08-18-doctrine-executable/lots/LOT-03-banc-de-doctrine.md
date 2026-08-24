---
id: "LOT-03"
statut: "terminé"
dépend_de: "— (sans dépendance ; se joue pendant l'attente release-db du LOT-02)"
---

# LOT-03 — V5 : le banc de doctrine (`DC-58`)

> **Livré le 2026-08-24 — `D-105`.** La mesure a retourné le lot : `DC-58` n'a
> **aucun sujet** dans le dépôt, et la méthode que cette fiche prescrivait
> (« la même valeur existe ailleurs ») est **vacue** — presque tout entier court
> trouve un répondant par hasard. Le banc a donc été posé sur le versant
> décidable de la phrase de `DC-58` — un littéral à droite d'un opérateur de
> comparaison —, ce qui le fait relever de `DC-19`/`DC-20`. Deux littéraux
> fautifs ont été trouvés et **nommés sans qu'aucune valeur change**. Détail
> chiffré : `../LOT-03-MESURE.md` (à la racine de la campagne — l'audit tient
> tout fichier de `lots/` pour une fiche de lot).

## But

À la fin de ce lot, une valeur cliniquement signifiante qui n'existerait que
dans un test **est détectée**. `DC-58` pose que le test dérive de la règle,
jamais l'inverse ; aujourd'hui rien ne le vérifie, et un cut-off inventé dans
un fichier `*.test.ts` puis recopié dans le moteur passerait sans trace.

Outillage pur : aucune décision clinique, aucune dépendance, aucun risque de
production. C'est le lot qui occupe l'attente `release-db` du LOT-02.

## Périmètre

Un banc — ou un script joué par un banc — qui, sur les fichiers de test du
dépôt :

1. **Repère les valeurs porteuses de sens clinique** — bornes, cut-offs,
   poids, doses, durées, nombres minimaux de jours, bandes — écrites en
   littéral dans un test.
2. **Vérifie qu'elles ont une provenance ailleurs** : la même valeur existe
   dans une table de règles signée, un registre, une constante motivée sur
   place, ou un claim épinglé.
3. **Rougit** sur une valeur qui n'existe que dans le test.

La difficulté n'est pas technique, elle est de **définition** : distinguer un
`expect(score).toBe(14)` qui dérive d'une bande publiée d'un `14` que
personne n'a jamais décidé. Deux garde-fous contre le bruit :

- **Partir des sources, pas des tests.** L'ensemble des valeurs cliniques du
  dépôt est fini et localisé (tables signées, `equilibre/constants.ts`,
  `questions.ts`, registres) ; un littéral de test qui n'y figure pas est le
  candidat, et le sens de la recherche évite d'avoir à qualifier chaque
  nombre.
- **Une liste d'exemptions nommée et motivée**, jamais une liste de motifs
  d'exclusion muette : une exemption sans motif est un trou qui se referme
  tout seul avec le temps.

Le patron est celui de `claimsEpinglesFraicheur.guard.test.ts` : découverte
automatique, pas de liste d'imports codée en dur — sinon le fichier neuf passe
sous le radar, ce qui est exactement le défaut que le banc existe pour
empêcher.

## Fichiers probables

- `web/src/lib/doctrine/valeursCliniquesDeTest.guard.test.ts` (ou
  `scripts/` + un banc qui l'appelle — à trancher au lot)
- Éventuellement une étape `package.json` / CI si le banc ne relève pas de
  Vitest.
- `changelog.d/`

## Interdits

- **Ne pas armer un garde sans sujet.** Si la descente ne trouve **aucune**
  valeur orpheline, le banc ne se pose pas tel quel : un banc vert en
  permanence sans sujet ne prouve rien. Dans ce cas, le lot livre la mesure et
  le dit — c'est une information, pas un échec.
- Aucune modification d'un test existant pour le faire passer : une valeur
  orpheline trouvée se **nomme**, elle ne se maquille pas. Sa correction est
  un autre acte, avec sa décision si elle est clinique.
- Aucun seuil, aucune valeur clinique introduits par ce lot.
- Pas de liste d'exclusions sans motif écrit.

## Dépendances

Aucune. Ne dépend pas du LOT-02 et ne le bloque pas.

## Étapes

1. Inventorier les sources de vérité clinique du dépôt (tables signées,
   constantes motivées, registres, claims épinglés).
2. Descendre les fichiers de test ; produire la liste des littéraux
   cliniquement signifiants sans provenance.
3. **Rapporter la mesure avant d'écrire le banc** : c'est elle qui dit si le
   garde a un sujet.
4. Écrire le banc avec découverte automatique et exemptions motivées.
5. Le voir rouge : injecter une valeur orpheline dans un test jetable.
6. Fragment `changelog.d/`.

## Tests

- Le banc lui-même, vu rouge sur une valeur orpheline injectée puis retirée.
- T2 complet — le banc balaie des fichiers de test, il doit rester rapide et
  ne pas dépendre de l'ordre d'exécution.

## Critères de done

- [ ] Mesure rapportée : combien de valeurs orphelines, lesquelles, où.
- [ ] Banc posé **si et seulement si** le sujet existe ; sinon la mesure est
      la livraison, et le lot le dit sans armer un garde vide.
- [ ] Découverte automatique, aucune liste d'imports codée en dur.
- [ ] Exemptions nommées et motivées, ou aucune.
- [ ] Banc vu rouge sous injection ; joué en T2.
- [ ] `DC-58` basculé avec sa décision, ou son statut précisé si le banc n'a
      pas de sujet.
