# 2026-08-05 — LOT-03 : fermer sum_decimal, count_threshold, ecab

Campagne `2026-08-05-cloture-des-dettes-wellneuro-5-0`, lot LOT-03.
Branche `worktree-lot-03-sum-decimal-count-threshold-ecab`. Statut : **code
prêt, PR à ouvrir**.

## Où en est le lot

#566 (PSQI) et #567 (TFD) avaient déjà fermé une classe de défaut : une bande
d'interprétation clinique produite sur un recueil patient incomplet (`D-014` :
« une bande ne se lit que sur l'instrument complet »). Trois moteurs restaient
ouverts : `count_threshold` (`Q_INF_05`), `ecab` (`Q_NEU_08`), `sum_decimal`
(`Q_GEO_05`/QDRS) — tous trois dans `web/src/lib/questions.ts`.

**Le fichier de lot rédigé contenait deux erreurs de fait**, trouvées en
cadrage (`Agent(wn-reviewer)`, opus) avant tout code :

1. Il visait `web/src/lib/instruments.ts` — un homonyme, sans calcul de bande
   (validation de type pour les instruments cabinet uniquement). Les trois
   moteurs sont dans `web/src/lib/questions.ts`.
2. « Aligner sur #566/#567 » visait un diff périmé d'une version : `#568` a
   ajouté un mécanisme distinct par-dessus, le « plancher garanti »
   (déclaration `severiteCroissante` par instrument). Les deux mécanismes sont
   indépendants dans le code de référence (`sum`, `questions.ts:~2005-2007`) :
   la garde de base (`recueilIncomplet` → `interp: null`) suffit entièrement au
   **résultat observable exigé par ce lot** ; le plancher est une amélioration
   distincte qui aurait exigé un arbitrage clinique (le sens de chaque grille)
   — laissé hors périmètre, conforme à l'interdit « pas de modification de
   bande sans demande explicite ». Gabarit répliqué : `bms_average`
   (`questions.ts:~2470`), pas `sum`.

## Ce qui a été fait

Trois blocs dans `web/src/lib/questions.ts` (`count_threshold`, `ecab`,
`sum_decimal`) : ajout de compteurs `missing`/`repondus` dans chaque boucle
existante (calcul du total/count inchangé ligne à ligne), gate de
l'interprétation sur `recueilIncomplet = missing > 0 || repondus === 0`, note
explicative ajoutée. Cas `EC10` (ecab, item inversé) traité explicitement :
absent → n'ajoute rien, compte `missing` ; `= 0` (« Faux ») → ajoute 1, compte
`repondus`.

Trois nouveaux bancs de garde (gabarit `psqiRecueilPartiel.guard.test.ts`) :
`qInf05RecueilPartiel.guard.test.ts`, `ecabRecueilPartiel.guard.test.ts`,
`qdrsRecueilPartiel.guard.test.ts`. Fragment changelog
`changelog.d/2026-08-05-trois-moteurs-recueil-partiel.md`.

## Constat de production

`execute_sql` (lecture seule, 2026-08-05) : une seule réponse en base sur les
trois instruments — `Q_INF_05`, recueil **complet** (11/11 items, `missing:
0`). Aucune réponse pour `Q_GEO_05` ni `Q_NEU_08`. **Le défaut était théorique,
pas encore réalisé** chez un patient.

## Validations

Passe de mutation jouée **deux fois indépendamment** : une fois pendant
l'exécution, une seconde fois par la revue adversariale qui a refusé de croire
le rapport et a refait le geste elle-même (retrait de la garde, confirmation du
rouge, restauration, confirmation du vert) — piège rencontré et documenté par
la revue : une mutation par `String.replace` naïve sur le motif de garde ecab
touche la mauvaise occurrence et laisse le banc vert (faux négatif) si on ne
vérifie pas quelle ligne a réellement changé. T1 vert. T3 (`test:worktree`
complet, CI complète) vert : 364 fichiers / 3945 tests, dont la certification
scoring des 63 questionnaires. Revue `Agent(wn-reviewer)`, opus : **GO**.

## Ce qui reste ouvert — délibérément non fait ici

Trois points mineurs relevés en revue, non corrigés (changements minimaux,
aucun n'affecte le résultat clinique) :
- Commentaires devenus faux dans `src/lib/clinical/orientationEngine.ts:213-214`
  et `src/lib/clinical/orientationRulesV1.ts:229-231` — ils déclarent ces trois
  moteurs « encore ouverts » à la classe de défaut. Ils publient désormais
  `missing`/`repondus`, donc `comptesDuRecueil` (`orientationEngine.ts:239-257`)
  les couvre déjà sans rien de spécifique.
- Les trois boucles n'appliquent pas `evalConditionnel`, contrairement à
  `sumItems()` (`questions.ts:1544-1546`) : latent, aucun conditionnel sur ces
  instruments aujourd'hui, mais un futur item conditionnel non déclenché
  compterait à tort comme `missing`.
- `noteRecueil` dupliqué texte-pour-texte dans les trois blocs (et dans
  `bms_average`/`sum`) : un texte clinique partagé qui divergera avec le temps
  si l'un des messages est retouché sans les autres.
- **Non vérifié** : l'UI praticien affiche-t-elle le champ `note` pour ces
  trois instruments ? C'est un mécanisme pré-existant, partagé avec PSQI/TFD/
  `bms_average` — si la note n'était déjà pas rendue avant ce lot, ce n'est pas
  une régression de LOT-03, mais ça vaut une vérification séparée.

## Réconciliation `CAMPAGNE.md` — même patron que LOT-02→LOT-03

Volontairement **non faite ici**. Geste post-merge séparé, depuis `main` :

```bash
node scripts/wn-campaign.mjs activate LOT-04
node scripts/wn-cycle.mjs --appliquer
```

**Piège reconfirmé pendant ce lot** : `node scripts/wn-campaign.mjs sync`
résout sa racine par `process.cwd()`, pas par l'emplacement du script. Lancé
depuis `web/`, il écrit un `web/docs/claude/campagnes/ACTIVE_CAMPAIGN.md`
fantôme au lieu du vrai fichier — sans erreur, sans avertissement. **Toujours
lancer les scripts `wn-*.mjs` depuis la racine du dépôt**, jamais depuis `web/`.
Repéré et nettoyé pendant la clôture de LOT-02 (`rm -rf web/docs` avant
commit) ; non corrigé dans le script lui-même (même défaut que
`wn-etat-reel.mjs`, fermé en LOT-01 — celui-ci ne l'est pas).

## Après le merge

1. `node scripts/wn-campaign.mjs activate LOT-04` **depuis la racine du dépôt**
   (jamais `web/`).
2. `node scripts/wn-cycle.mjs --appliquer` depuis `main`.
3. Prochain lot : LOT-04 — un seul parcours patient.
