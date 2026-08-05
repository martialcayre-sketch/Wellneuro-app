### Ajouté — Agenda alimentaire `Q_ALI_09` assignable, sans score (lot L1-bis)

L'agenda alimentaire existait depuis le 2026-07-30 comme **domaine pur sans aucun
appelant** : `web/src/lib/agenda-alimentaire/` portait 1 624 lignes et 72 tests
qu'aucune route, page ou composant n'importait. Ce lot le rend assignable, et
rien d'autre — pas de table, pas de route, pas de saisie.

`Q_ALI_09` entre au catalogue avec `sections: []` et un scoring `journal`
(`scored: false`), derrière le drapeau `WN_AGENDA_ALI`, **éteint par défaut**.

**Aucun barème, et ce n'est pas un oubli.** Aucune journée n'a jamais été
recueillie dans ce dépôt. Les cinq axes envisagés, leurs poids et la borne des
18 h supposent une distribution réelle qui n'existe pas : un barème posé avant la
première passation serait une donnée clinique inventée. L'ordre retenu est donc
collecte puis calibrage. Les pseudo-items `AGD_*` du patron sommeil ne sont pas
repris pour la même raison — ils figeraient la liste d'agrégats d'un scorer non
écrit.

**Il n'alimente pas le besoin 3, et c'est une décision.** Le besoin 3 « Rythme
alimentaire » est déjà sourcé par le sous-score `RYTHME_CHRONO` de `Q_ALI_01`. Y
ajouter l'agenda ferait deux mesures d'un même thème — le piège que
`lib/anthropic.ts` documente déjà pour `RYTHME_ALIMENTAIRE` /10 contre
`RYTHME_CHRONO` /7, dont l'agenda serait le **troisième** porteur. `BESOIN_SOURCES`
et `VERSION_SCORE_EQUILIBRE` sont donc inchangés, et `sourceMonEquilibre` vaut
`false` au registre.

La valeur visée est ailleurs : dans l'**écart** entre le rythme déclaré
(`Q_ALI_01`) et le rythme observé (21 jours). Un patient qui déclare un bon rythme
et en observe un mauvais est un profil distinct des deux profils concordants —
l'action y porte sur la perception, pas sur le rythme. Cet objet reste à écrire,
et il **dépend de la forme servie** : sous la forme courte à 14 items,
`MAX_RYTHME_CHRONO` vaut 0 et il n'existe aucun rythme déclaré à comparer.
L'écart devra alors rendre `null`, jamais 0 — qui se lirait « pas d'écart ».

#### Le drapeau ferme deux surfaces, et laisse un angle mort nommé

`WN_AGENDA_ALI` pilote le champ `actif` de l'entrée de catalogue. `IDS_SUSPENDUS`
en étant **dérivé**, éteindre le drapeau ferme d'un seul geste la route
d'assignation et la bibliothèque praticien. « Invisible et assignable » est la
pire des combinaisons, et c'est celle qu'un retrait de l'écran seul produit.

Les deux autres mécanismes ont été écartés sur mesure, pas au jugé : un ternaire
à l'export laisse `undefined` dans le catalogue et
`check_questionnaire_certification.js` lève ; une exclusion conditionnelle du
tableau fait rougir `verifier_registre_instruments` dans l'une des deux positions,
puisqu'il exige l'entrée de registre et l'entrée de catalogue ensemble.

**La contrepartie est déclarée.** `extraireIdsSuspendus` parse le *texte source*
du catalogue à la recherche du littéral `actif: false` : un appel de fonction lui
est invisible. `Q_ALI_09` n'entre donc dans `idsSuspendus` dans aucune des deux
positions, et la règle « retiré de la production ⟹ `statutCertification`
terminal » ne s'y applique jamais. Ce n'est pas un échec CI, c'est un silence.
D'où `agendaAlimentaireDrapeau.guard.test.ts`, qui épingle les deux positions —
et qui a été vérifié par mutation : remplacer l'appel par `actif: true` le fait
tomber (2 échecs).

Le drapeau **n'est pas** un drapeau de forme : contrairement à
`WN_ALI_01_SIIN57`, il n'y a pas de forme B. Ne pas l'ajouter à `DRAPEAUX_DE_FORME`
du banc `certify`.

#### La route `submit` est fermée dès maintenant

Avec `sections: []`, une soumission par l'écran générique passerait
`statutReponses` à `verrouille` sur un agenda à zéro journée — un recueil
mort-né, et irrécupérable puisque le verrouillage est ce qui clôt la fenêtre de
saisie. `api/patient/submit` refuse donc `Q_ALI_09` en 409, comme il refuse déjà
`Q_SOM_09`, pour un motif voisin mais distinct.

#### Deux gardes existants ajustés, aucun contourné

- `promptAlimentaire.guard.test.ts` itère sur tous les `Q_ALI*` du catalogue et
  exigeait un balayage aux bornes. Le cas « zéro item » est traité **dans** le
  `it.each`, avec une exigence de remplacement (`scored:false`, aucun total,
  aucune quantité au modèle) — sortir l'identifiant de la liste aurait été la
  « trappe » que le fichier frère nomme explicitement.
- `promptSousScores.guard.test.ts` : `Q_ALI_09` déclaré dans
  `REMPLISSAGE_NON_REPRESENTATIF` (la liste est comparée par égalité stricte).
- `questionnaires-source-unique.test.ts` : compte épinglé 37 → 38, indépendant de
  la position du drapeau.

#### Ce que la revue adversariale a corrigé

Trois défauts, dont un bloquant, trouvés par une passe `wn-reviewer` sur le
commit initial :

- **Les droits ne sont pas dégagés, et ne le seront pas par une formule.**
  L'entrée de registre portait `droits.statut: "libre"` avec la mention
  « construction WellNeuro sans source tierce », quatre lignes au-dessus de
  « aucun rapprochement n'a été instruit ». Les deux ne peuvent pas être vraies
  ensemble. C'est mot pour mot la revendication retirée de `Q_SOM_09` le
  2026-07-30. Ce n'était pas inerte : `libre` appartient à `DROITS_DEGAGES` et
  pré-autorisait une montée à `droits_verifies` sans qu'aucune source ait jamais
  été instruite. Passé à **`a_verifier`**, revendication retirée, absence de
  pièce déclarée comme telle. Une recherche dans `source_registry.json`
  (507 sources) n'a remonté aucun support de type agenda alimentaire — c'est une
  absence de pièce, pas une preuve d'originalité.
- **Le garde de drapeau ne testait pas l'état de production.** Il simulait la
  variable absente par une chaîne vide. Une implémentation
  `value === undefined ? true : value === 'true'` — patron « ouvert sauf mention
  contraire » — serait donc restée verte tout en ouvrant l'instrument sur
  Vercel, où la variable n'existe pas. Corrigé par `stubEnv(nom, undefined)`, et
  vérifié : cette mutation précise rougit maintenant, elle passait avant.
- **Les textes patient décrivaient une surface inexistante** (« vos saisies
  restent visibles sous forme d'une frise ; elles sont transmises à votre
  praticien »). Ni frise ni transmission ne sont livrées, et le seul geste qui
  sépare la production de cet écran est un `true` posé au panneau Vercel, pas
  une revue de code. Textes ramenés à ce qui existe.

**Conséquence à tenir** : allumer `WN_AGENDA_ALI` exige la livraison préalable
de la surface de saisie (lots L3 et L4). Drapeau allumé aujourd'hui, un patient
recevrait une assignation dont l'écran générique n'affiche aucune question.

Trois points mineurs corrigés au passage : le refus 409 était justifié par un
« irrécupérable » faux (un déverrouillage praticien existe, et il fonctionne
précisément drapeau allumé — la vraie raison est qu'une soumission générique
créerait une passation fabriquée à `rawAnswers: {}`) ; le docstring durcissait
l'interdit de frontière en « aucun aliment identifié » là où le contrat écrit
« au-delà des présences ci-dessus » ; et `types.ts` annonçait des composites
« servis à Mon équilibre » que la décision ci-dessus exclut.

**Un point mineur laissé ouvert, et signalé plutôt que corrigé** :
`normaliserQids` (`api/praticien/packs/route.ts`) filtre sur le catalogue de
scoring et non sur `IDS_SUSPENDUS`. Un `POST` direct portant `Q_ALI_09` entre
donc dans un pack, drapeau éteint — comme il le fait déjà pour tout instrument
`actif: false` (`Q_GEO_04`, `Q_URO_02`…). Le défaut est antérieur à ce lot, qui
ne fait qu'ajouter un identifiant à une porte déjà ouverte ; le corriger
changerait le comportement de tous les instruments suspendus, hors périmètre
ici. Aucune donnée patient exposée : l'écran des packs filtre sur `actif`, et
chaque assignation du pack journalise le retrait de l'instrument suspendu.

#### Validations

`npm run check` vert dans les **deux** positions de `WN_AGENDA_ALI` (3 457 tests,
70 contrôles anti-secrets), et `WN_AGENDA_ALI=true npm run test:siin57` vert —
la combinaison agenda allumé + SIIN 57 allumé, c'est-à-dire l'état de production
une fois le drapeau posé. `scoring-check` vert dans les deux positions du SIIN.

#### Ce que ce lot ne fait pas

Aucune migration, aucune table, aucune route, aucune surface patient ou
praticien, aucun scorer, aucun branchement à Mon Équilibre. L'instrument est
assignable et fermé : allumer `WN_AGENDA_ALI` avant la livraison de la chaîne de
collecte ouvrirait un instrument que personne ne peut remplir.
