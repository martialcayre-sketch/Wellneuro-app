---
id: "LOT-02"
titre: "« Certifié » à l'écran sans la définition de D-034"
statut: "livré (2026-08-08) — libellés renommés « Scoring vérifié », garde mutation-testé"
dépend_de: "aucun"
---

# LOT-02 — « Certifié » à l'écran sans la définition de D-034

## But

**Faire voyager la définition de D-034 jusqu'à l'écran où le mot s'affiche.**
Aujourd'hui elle est écrite dans `docs/DECISIONS.md` (D-034) et
`docs/claude/corpus/README.md`, et elle a été portée dans la seule surface du
**runtime** qui revendiquait la validation — la consigne système de synthèse,
`synthese-v18` → `synthese-v19`, avec un garde de banc. **Elle n'est nulle part
dans l'UI praticien.**

Les badges concernés, vérifiés au cadrage du 2026-08-08 :

- `web/src/components/BibliothequePanel.tsx:33-34` → **« Certifié »**, variante
  `success`, sur toute entrée de bibliothèque dont `statutCertification` vaut
  `certifie` ;
- `web/src/components/FichePatientPanel.tsx:137-147` → **« Certifié Drive »** et
  **« Certifié manuel EORTC »**, sur la fiche patient.

Ce que le mot veut dire, d'après D-034 : *le code reproduit fidèlement la règle
enregistrée* — items conformes à la source, moteur vérifié par le banc `certify`.
Ce qu'il **ne** dit pas : rien de la qualité psychométrique, de la validité de
construit, de la fidélité, ni de l'étalonnage des seuils. Un praticien qui lit
« Certifié » en vert sur une fiche patient n'a, à l'écran, aucun moyen de faire
cette différence.

## Ce qui a été décidé, et qui a élargi le périmètre

**Arbitrage du 2026-08-08, deux réponses à la question ouverte ci-dessous**
(consigné en `D-036`) :

1. **Le libellé change** — « Scoring vérifié » —, plutôt qu'une infobulle ou un
   lien. Une infobulle native est hover-only, et `UX_WELLNEURO_3_0.md:88-90` la
   remplace explicitement par un bouton d'information ; aucun composant
   d'infobulle réutilisable n'existe (seul `@radix-ui/react-dialog` est
   installé). Un lien fait quitter l'écran, ce que la preuve attendue interdit.
2. **Toute la famille des libellés**, pas les trois badges verts seuls : « Non
   certifié » se lit tout aussi bien comme « non validé psychométriquement ».
   C'est le mot qui est ambigu, pas l'état vert.

Le coût est réel et assumé : « Certifié » est employé à l'oral, et il reste dans
le registre, dans le type `StatutCertificationRuntime` et dans le corpus. **Rien
de la donnée n'a été renommé** — l'écart écran/dossier est nommé dans `D-036`.

## Ce qui est fait

- `web/src/lib/certification-libelles.ts` — les deux mappers, jusqu'ici **locaux
  et non exportés** dans leurs composants : aucun banc ne pouvait asserter ce
  qu'ils rendaient. S'y ajoutent les deux littéraux d'écran qui ne passaient par
  aucun mapper (badge et prose des instruments du cabinet) ; hors du module, ils
  auraient échappé au garde.
- Neuf libellés renommés : `Certifié` → `Scoring vérifié`, `Certification
  ambiguë` → `Scoring ambigu`, `Certification à vérifier` / `À vérifier` →
  `Scoring à vérifier`, `Non certifié` → `Scoring non vérifié`, `Certifié Drive`
  → `Scoring vérifié (Drive)`, `Drive ambigu` → `Scoring ambigu (Drive)`,
  `Certifié manuel EORTC` → `Scoring vérifié (manuel EORTC)`, `Cabinet — non
  certifié` → `Cabinet — scoring non vérifié`. `Non scoré`, `Statut inconnu` et
  `Historique` ne portaient pas le mot et n'ont pas bougé.
- **Trois proses trouvées à l'exécution et absentes du cadrage** :
  `BibliothequePanel.tsx:369` (description du tiroir d'édition), `:1215`
  (pied de l'éditeur) et `:1405` (pied de la relecture) employaient le même mot
  trois lignes sous un badge renommé. Les laisser aurait rendu l'échelle
  incohérente à l'écran.
- `web/src/lib/certificationLibelles.guard.test.ts` — table écrite à la main,
  exhaustivité **par le typage** (`Record<StatutCertificationRuntime, …>` ne
  compile pas si un état s'ajoute sans attendu), attendus **épinglés au mot près**
  pour les deux constantes, refus de `/certifi/i` sur les valeurs rendues,
  auto-test du motif sur les dix anciens libellés.
- Deux bancs de **rendu** : `BibliothequePanel.test.tsx` (créé — badge du
  catalogue dans ses quatre états, badge cabinet, prose du tiroir) et
  `FichePatientPanel.test.tsx` (colonne « Qualité » avec son contrôle négatif).
  Plus le sélecteur E2E du badge cabinet (`e2e/dashboard-praticien.spec.ts`).

## Ce que la relecture d'écran et la revue adversariale ont appris

**Le seed omet une clé que le moteur produit.** La colonne « Qualité » ne rend un
badge que si `scores_json` porte une `certification` ; les **15** blocs `scoresJson`
de `web/prisma/seed.ts` n'en portent aucune, alors que les moteurs la propagent
(`questions.ts`, `certification: sc.certification || null`) et que
`api/patient/submit` persiste le résultat entier. Une première rédaction de ce lot
en concluait « aucun E2E ne PEUT témoigner » : **c'est faux** — il manque une
assertion, pas une possibilité. Étendre le seed et poser l'assertion : geste
séparé, non fait ici, mais nommé comme un manque. Et il ne suffira pas seul :
Sophie Nicola porte **cinq** passations, dont **quatre** déclarent `certification`
au catalogue — la cinquième est le PSQI, l'un des muets ci-dessous.

**Le badge est muet pour 21 des 65 instruments, production comprise.** Mesuré le
2026-08-08 sur le catalogue résolu (`statutCertificationRuntime` appliqué à
`QUESTIONNAIRE_CATALOGUE`) : **38 `certifie`, 21 `inconnu`, 6 `ambigu`**. Les 21
ne déclarent aucune `certification` — `questionnaires/sommeil.ts` et
`gerontologie.ts` n'en contiennent pas une —, donc « Statut inconnu » à la
bibliothèque et « Historique » sur la fiche, **en production comme en local**.
Croisés au registre : **18 des 21 portent `scoring_verifie`**, dont le PSQI
(`Q_SOM_01`) ; les trois autres non — `Q_GEO_04` est `contenu_verrouille`,
`Q_SOM_09` `droits_verifies`, `Q_ALI_09` `repere`. Citer le MMSE comme une
divergence avec le registre était **faux** : pour lui, « Statut inconnu » en est
l'écho fidèle. Le lot traite le badge qui rassure à tort ; celui qui ne dit rien
reste, sur 18 instruments que le registre certifie.

**Le libellé emprunte le nom d'un barreau qu'il ne lit pas.** « Scoring vérifié »
reproduit `scoring_verifie` de `instrument_registry.json` mais lit
`def.scoring.certification.status` du catalogue de code, et
`scripts/lib/verifier_registre_instruments.js` ne compare jamais les deux. Avant
ce lot, une divergence rendait un mot vague faux ; désormais elle rend une
affirmation vérifiable fausse.

**Et le garde ne ferme pas tout** : son contrôle de source refuse la
réintroduction d'un **ancien** libellé, liste fermée et à la casse près —
`'Instrument certifié'` en minuscule lui échappe. Ce sont les deux bancs de rendu
qui réduisent ce trou, pas lui.

## Hors périmètre

- Toute modification du registre `instrument_registry.json`, du champ `cosmin`,
  ou du banc `verifier_registre_instruments.js` — D-034 les fige.
- Le texte patient : `web/src/lib/trust/contenus/registre.ts` ne revendique
  **déjà** rien (« cet accompagnement relève du bien-être et du suivi ; il
  n'établit pas de diagnostic médical »). D-034 aligne l'interne sur l'externe,
  pas l'inverse.
- Réécrire les commentaires `// Certifié v2 — …` de `web/src/lib/questions.ts` :
  ils datent une conformité de source, ils ne s'affichent pas.

## Preuve attendue

- Un praticien voyant le badge peut atteindre la définition **sans quitter
  l'écran** (infobulle, libellé, ou lien court).
- Un banc assère la présence de la qualification **et** refuse le retour du mot
  nu — un garde qui n'assère que la présence est satisfait par l'inversion exacte
  du défaut.
- Textes en français ; T2 avant commit (changement UI).

## Question tranchée à l'ouverture

~~Infobulle, libellé plus long (« Scoring vérifié »), ou lien vers la
définition ?~~ **Tranchée le 2026-08-08 : le libellé, sur toute la famille**
(`D-036`). Le coût d'usage oral est accepté ; il est écrit dans la décision
plutôt que passé sous silence.

## Validation

- T1 vert (296 bancs d'outillage, type-check, lint, anti-secrets).
- **T2 vert après les DEUX tours de correctifs de revue** — 130 tests Playwright
  passés, 2 ignorés (Chromium + WebKit), dont `dashboard-praticien.spec.ts:94` qui
  emprunte le badge cabinet renommé, plus **4 204 tests Vitest sur 372 fichiers**
  (+14 tests, +1 fichier : le banc `BibliothequePanel`).
  Le chiffre de 131 qu'une première rédaction annonçait venait des passes
  portant le spec de **capture jetable** ; sur le code livré, c'est 130.
- **Neuf mutations, neuf rouges** — quatre trouvées à l'écriture, **cinq par deux
  passes de revue adversariale, dont trois qui passaient encore vertes après le
  premier correctif**. Comptes pris sur une **même base**, les trois bancs du lot
  en une passe (101 tests) : libellé nu remis dans le module **6**, motif cassé
  **10**, ancien libellé réintroduit dans un composant **1**, source de la règle
  scorée effacée **3**, sens de la prose cabinet inversé sans le mot interdit
  **1**, libellé nu posé directement dans le badge du catalogue **9**,
  `variant="success"` codé en dur (tous les états en vert) **6**, clause
  `statutCertification === 'certifie'` retirée du `||` **1**, badge masqué pour
  l'état `inconnu` **3**.
  Deux de ces comptes avaient d'abord été relevés sur une sélection partielle de
  fichiers, et étaient donc trop bas — **un compte de rouges se mesure sur la même
  base que celle qu'on annonce**.
- Écran réel relu sur les deux surfaces (capture Playwright jetable, supprimée) :
  badges et prose du cabinet corrects et sans débordement ; c'est cette
  relecture qui a montré que la colonne « Qualité » ne sert que « Historique »
  sur données seedées.
