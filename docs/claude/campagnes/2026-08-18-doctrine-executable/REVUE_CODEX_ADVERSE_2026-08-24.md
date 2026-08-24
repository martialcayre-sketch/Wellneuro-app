# Contre-revue Codex — doctrine exécutable

## Objet et périmètre

Revue adverse réalisée le 2026-08-24 sur l'état du dépôt au commit
`7793a4ac`, avec la plage de comparaison `16d93c57~1..7793a4ac`.

La mission n'était pas une revue ouverte des quelque 9 450 lignes de la plage,
mais la falsification de treize affirmations absolues : A1 à A6 sur le cœur
clinique, B1 à B4 sur les bancs de doctrine et le score, D1 à D3 sur les
surfaces patient. Un seul contre-exemple complet suffisait à réfuter une
affirmation.

Étaient explicitement hors périmètre : les arbitrages cliniques eux-mêmes,
les fichiers Alliance 6.0-B désignés dans le prompt, le déploiement, les
migrations et `release-db`. Aucun fichier de ces périmètres n'a donné lieu à
un constat.

## Méthode et seuil de preuve

Chaque affirmation reçoit l'un des verdicts suivants :

- `RÉFUTÉE` : contre-exemple tracé de bout en bout ou mutation réellement
  exécutée qui casse la propriété tout en laissant son banc vert ;
- `RÉSISTE` : aucun contre-exemple recevable trouvé ;
- `NON VÉRIFIABLE` : un élément nécessaire à la preuve manquait.

Une trouvaille est `CONFIRMÉE` quand le chemin complet a été lu ou exécuté.
Elle serait `PLAUSIBLE` si un maillon restait supposé, ce maillon devant alors
être nommé.

La première restitution de la revue a été écartée : elle qualifiait de
confirmées des mutations qui n'avaient pas été exécutées et confondait, pour
les verrous à sens inverse, permissivité du runtime et absence de contrepoids.
La reprise documentée ici repart du SHA demandé, exécute les mutations dans
une copie jetable et ne conserve que les constats qui franchissent le seuil de
preuve ci-dessus.

## Verdicts

| Affirmation | Verdict | Motif |
|---|---|---|
| A1 — tous les verrous de signature sont fail-closed | `RÉSISTE` | Aucun verrou ouvrant avant validation ou servant un résultat dégradé imprévu n'a été établi. |
| A2 — un red flag retire toujours le candidat | `RÉSISTE` | Aucun second chemin permettant une sélection sous signal bloquant n'a été confirmé. |
| A3 — `contradictionEstOuverte` est le prédicat unique | `RÉSISTE` | Aucun appelant redéfinissant l'ouverture n'a été trouvé. |
| A4 — les deux verrous à sens inverse ont leur contrepoids | `RÉSISTE` | Verrou fermé, l'inhibition disparaît comme prévu, mais une règle `candidate` alimente la limitation praticien ; ce comportement est bancé. |
| A5 — un morceau scindé ne perd jamais son marqueur | `RÉFUTÉE` | Un mot unique très long garde son marqueur mais produit un morceau hors plafond. |
| A6 — aucune fixture ne contient d'identité réelle | `RÉSISTE` | Aucune identité, adresse ou référence ressemblant à un dossier réel n'a été trouvée dans la fixture ou les messages de commit examinés. |
| B1 — le garde attrape tout seuil littéral non motivé de `src/lib` | `RÉFUTÉE` | Une borne ajoutée par `Math.min` laisse les neuf tests verts. |
| B2 — tout affichage de l'indice porte sa nature, aucune tendance ne commande une valence | `RÉFUTÉE` | Un second affichage via alias laisse les douze tests verts. |
| B3 — tout changement de score force un bump | `RÉFUTÉE` | Une modification de formule sans bump laisse les trois tests verts. |
| B4 — `scinderSousPlafond` ne coupe aucun mot et ne dépasse jamais le plafond | `RÉFUTÉE` | Le cas exécuté avec un mot de 600 caractères rend un morceau hors plafond. |
| D1 — toute surface patient est déclarée et réellement lue | `RÉFUTÉE` | Une surface montée dans le portail est absente de `SURFACES_PATIENT`. |
| D2 — aucune valence clinique ne s'attache à la variation | `RÉSISTE` | Aucune couleur, icône, formulation ou hiérarchie donnant une valence à la variation n'a été confirmée. |
| D3 — total et variation ne s'affichent que sur deux surfaces | `RÉFUTÉE` | Des surfaces praticien supplémentaires affichent le total ou sa variation. |

Résultat : sept affirmations réfutées, six qui résistent, aucune non
vérifiable au niveau du verdict. Les limites de couverture restent nommées en
fin de rapport.

## Trouvailles confirmées

### F1 — A5/B4 : un mot unique produit un morceau hors plafond

Référence : `web/src/lib/clinical/vigilanceLongueur.ts:43`.

Chemin concret : `scinderSousPlafond('x'.repeat(600), 'R')` produit un seul
mot. Le candidat dépasse `LONGUEUR_MAX_POINT`. Comme `courant` est vide, rien
n'est poussé ligne 49 ; la ligne 50 affecte directement
`` `${suite}${morceau}` `` sans vérifier sa longueur.

Résultat faux : le morceau rendu dépasse le plafond annoncé par la fonction.
Le marqueur est conservé et le mot n'est pas coupé, mais l'une des deux
propriétés absolues est fausse.

Preuve exécutée dans la copie jetable :

```ts
const morceaux = scinderSousPlafond('x'.repeat(600), 'R');
expect(morceaux.some(
  morceau => morceau.length > LONGUEUR_MAX_POINT,
)).toBe(true);
```

Le cas passe. Les bancs existants restent verts parce qu'ils ne jouent pas ce
texte pathologique.

### F2 — B3 : le registre de version ne couvre pas la formule du score

Références : `web/src/lib/equilibre/bumpVersionScore.guard.test.ts:44` et
`web/src/lib/equilibre/score.ts:240`.

Le garde n'épingle que `SEUIL_EFFONDREMENT` et
`PLAFOND_FONDATION_CRITIQUE`. La formule principale, les pondérations, le
regroupement des sources et la composition des fondations critiques ne sont
pas inscrits dans ce registre.

Mutation exécutée : remplacement du multiplicateur `100` par `99`, sans bump
de `VERSION_SCORE_EQUILIBRE`. Toutes les valeurs non nulles du score global
changent ; le banc reste vert, trois tests sur trois.

### F3 — B1 : une borne dans `Math.min` échappe au garde des seuils

Référence : `web/src/lib/doctrine/seuilsLitterauxMotives.guard.test.ts:119`.

L'expression régulière `COMPARAISON` ne reconnaît que les littéraux placés à
droite de `<`, `>`, `<=` ou `>=`. Elle ne voit pas une borne passée à
`Math.min`, `Math.max`, `slice`, un ternaire, un `switch` ou une constante
intermédiaire.

Mutation exécutée : plafonnement de toute couverture à `0.95` par
`Math.min(0.95, ...)` dans `score.ts:119`. Une borne de score non motivée est
introduite dans `src/lib` ; le banc reste vert, neuf tests sur neuf.

### F4 — B2 : un second affichage via alias échappe à l'extracteur

Référence : `web/src/lib/equilibre/natureIndiceGlobal.guard.test.ts:86`.

L'extracteur suit uniquement les balises ou interpolations contenant
textuellement `indiceGlobal`. Sa sentinelle de fichiers exige seulement que
les deux fichiers connus conservent au moins une occurrence détectée.

Mutation exécutée : l'affichage conforme de `FichePatientPanel` est conservé,
puis un second affichage est ajouté via
`const total = objetsCliniques.indiceGlobal`. Ce nombre est rendu sans
`MENTION_NATURE_INDICE_GLOBAL` ; le banc reste vert, douze tests sur douze.

Une contre-épreuve a aussi été jouée : remplacer l'unique affichage détecté
par un alias fait bien rougir la sentinelle de fichiers. Le défaut est donc
précis : un affichage supplémentaire indétectable coexistant avec la
sentinelle conforme.

### F5 — D1 : une surface patient montée n'est pas déclarée

Références : `web/src/lib/gamification-patient.guard.test.ts:34`,
`web/src/app/portail/[token]/questionnaires/page.tsx:301` et
`web/src/components/patient-companion/PatientCompanionHome.tsx:126`.

`PatientCompanionHome` est monté dans le portail patient, mais son dossier
`components/patient-companion` est absent de `SURFACES_PATIENT`. Le composant
rend notamment « Bravo pour le chemin parcouru », alors que `bravo` appartient
explicitement au vocabulaire interdit par le garde.

Résultat faux : le texte est servi au patient sans être lu par le garde. La
non-vacuité par entrée protège les entrées déclarées ; elle ne peut signaler
une surface entièrement omise. Le banc reste vert, cinq tests sur cinq.

Ce défaut existe dans l'arbre final examiné ; la revue ne l'attribue pas à une
régression introduite par la plage de campagne.

### F6 — D3 : le total ou sa variation ont d'autres surfaces

Références :
`web/src/components/patient-cockpit/TrajectoirePanel.tsx:400` et
`web/src/components/patient-cockpit/J21DecisionPanel.tsx:48`.

`TrajectoirePanel` affiche `indice {jalon.valeur}`, puis la tendance et l'écart
de l'indice. `J21DecisionPanel` affiche aussi la variation sous le libellé
« Score Mon équilibre ».

Résultat faux : le total ou sa variation existent au-delà de
`FichePatientPanel` et `MonEquilibreAccueil`, les deux fichiers épinglés par le
garde. Ces affichages transitent sous `jalon.valeur`, `cycle.momentum` ou
`resume.score`, donc l'extracteur de B2 ne les voit pas.

Comme F5, ce constat porte sur l'état final : il ne prétend pas que ces
surfaces ont été introduites dans la plage examinée.

## Mutations restées vertes

### B1 — borne hors comparaison

```diff
diff --git a/web/src/lib/equilibre/score.ts b/web/src/lib/equilibre/score.ts
@@
-  return clamp01(source.inverser ? 1 - ratio : ratio);
+  return Math.min(0.95, clamp01(source.inverser ? 1 - ratio : ratio));
```

Résultat : un fichier de test passé, neuf tests passés.

### B2 — second affichage sous alias

```diff
diff --git a/web/src/components/FichePatientPanel.tsx b/web/src/components/FichePatientPanel.tsx
@@
       <ObjetGauge
         label="Indice global"
         value={objetsCliniques.indiceGlobal}
         mention={MENTION_NATURE_INDICE_GLOBAL}
       />
+      {(() => {
+        const total = objetsCliniques.indiceGlobal;
+        return <p>Total : {total}</p>;
+      })()}
```

Résultat : un fichier de test passé, douze tests passés.

### B3 — formule modifiée sans bump

```diff
diff --git a/web/src/lib/equilibre/score.ts b/web/src/lib/equilibre/score.ts
@@
-            100
+            99
```

Résultat : un fichier de test passé, trois tests passés.

Toutes les mutations ont été appliquées séparément dans une copie jetable du
commit. Le worktree de référence est resté intact.

## Vérifications exécutées

État initial des quatre bancs ciblés : quatre fichiers passés, 29 tests passés.

Suite demandée pour la passe 2, après restauration des mutations : treize
fichiers passés, 155 tests passés et 16 ignorés.

Les gardes de gamification et des deux producteurs de sécurité ont aussi été
joués ensemble : trois fichiers passés, 39 tests passés.

La lecture des bancs de sécurité a corrigé le verdict initial sur A4 : la règle
`candidate` et la limitation praticien constituent bien le contrepoids prévu ;
la disparition de l'inhibition à verrou fermé n'est pas, seule, une réfutation.

## Portée et limites

- A2 n'a pas été éprouvée par un parcours E2E complet de toutes les routes de
  sélection et de persistance.
- A6 couvre les fichiers et messages de commit accessibles dans la plage, sans
  source externe permettant de qualifier un identifiant opaque.
- L'état CI et les fils de revue GitHub n'ont pas été contrôlés : la plage
  regroupe plusieurs PR et aucune PR unique n'était désignée comme objet.
- Les fichiers explicitement exclus par le prompt n'ont pas été examinés.
- Les constats F5 et F6 décrivent l'arbre final au SHA demandé ; ils ne sont pas
  attribués à un commit particulier de la campagne.
- Cette revue documente les contre-exemples ; elle ne prescrit ni correctif ni
  nouvel arbitrage clinique.
