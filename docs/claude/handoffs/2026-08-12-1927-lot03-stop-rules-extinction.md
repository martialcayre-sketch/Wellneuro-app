# LOT-03 — les règles d'arrêt, et ce que le corpus a démenti

- **Branche** : `lot-03-stop-rules-extinction`, vivante, non mergée. Partie de
  `b65ffe1e`, `origin/main` contenu.
- **Campagne** : chaîne T0 opérationnelle — LOT-03. Dépend du LOT-01 (clos), pas
  du LOT-02 : ouvrable indépendamment.
- **Décision** : `D-053`, écrite avant la première ligne de code (`DC-17`), puis
  amendée deux fois — par la lecture du corpus, puis par la revue.

## Ce que le lot livre

Une table de règles d'arrêt versionnée (`stopRulesV1.ts`), **livrée non
signée**, et le moteur qui l'applique : une recommandation d'exploration peut
être **éteinte avec motif**, au cockpit comme dans la synthèse, sans perdre ses
motifs d'origine. `dejaRepondu` devient excluant. Un verrou unique commande les
deux effets : **la production ne bouge pas au merge**. Consigne `synthese-v25`.
Aucune migration.

## Ce que le corpus a démenti — à ne pas redécouvrir

La spécification écrivait STOP-STR sur « DASS + Cungi rassurants ». Lecture de
`rag_corpus_claims` en production le 2026-08-12 : **ni le DASS-21 ni le Cungi ne
portent de claim d'extinction** — le corpus n'en publie que les bandes. La seule
échelle de stress dont le corpus attache une **conduite** à la bande basse est
le questionnaire SIIN `Q_STR_01` (`WN-CL-0051-033`, prescriptif : « orienter
vers les conseils de vie antistress » ; `WN-CL-0051-030` la qualifie de
rassurante ; `WN-CL-0051-031` réserve le « regard physiopathologique » à
l'intervalle supérieur). C'est lui qui porte le claim ; DASS et Cungi
resserrent. Les cinq paires épinglées ont été relues : toutes `VALIDE`, actives,
non remplacées, `v1.0`.

## La leçon exécutable de ce lot

**Sur ce dépôt, un objet de score n'est pas une mesure.** Le LOT-02 l'avait payé
sur `calculateScore` (`{scored:false,total:null}` sur une passation vide) ; le
LOT-03 l'a reposé à l'identique sur `scores != null`. Tout prédicat qui décide
d'un affichage clinique doit lire une **valeur** ou une **bande**, jamais la
nullité de l'objet.

**Et un moteur de scoring qui ne publie pas ses comptes ne peut rien garder.**
`group_majority` (`Q_STR_01`) ne sert ni `missing`, ni `repondus`, ni `items`,
et `totalSousScore` rend un total dès un item par groupe : trois réponses sur
vingt et une produisent sa bande la plus favorable. La garde générale du moteur
ne mord que sur un recueil qui se **déclare** incomplet — elle est aveugle au
silence.

## Ce que la revue a refermé

`wn-reviewer` a rendu NO-GO sur quatre défauts, tous réels, tous corrigés :
exploitabilité confondue avec l'existence d'un objet ; extinction possible sur
un `Q_STR_01` quasi vide ; `R-STR-01`/`R-STR-02`, déclenchées par un PSS-10
**défavorable**, éteintes sans que le PSS-10 soit lu (discordance supprimée,
`DC-30`) ; et un composant client important une **valeur** de `lib/clinical`,
qui aurait embarqué `crypto` et l'instantané du corpus dans le bundle
navigateur — invisible aux trois paliers, désormais fermé par un banc.

## Ce qui reste ouvert

- **STOP-STR ne peut pas mordre en l'état** : son déclencheur porteur est
  `Q_STR_01`, et la garde de complétude le refuse. Faire publier ses comptes à
  `group_majority` est une modification du moteur de scoring — décision et
  fragment propres. **Signer la table ne suffira pas.**
- `D-053` §5 est une **dette, pas une garantie** : « une contradiction ouverte
  interdit l'extinction » n'a aucun code.
- **Aucune borne d'ancienneté** ne limite l'exclusion : une passation valide et
  mesurée de 2024 exclut sa cible. La fenêtre de fraîcheur reste écartée faute
  de chiffre fondé.
- Le **garde de restitution** de la synthèse ne distingue pas une cible citée
  comme recommandée d'une cible citée comme éteinte : sur ce point, c'est la
  consigne qui protège, non la donnée.
- **SCOFF (`Q_NEU_04`)**, **STOP-SOM** et **STOP-APN** restent dehors, avec leurs
  motifs inscrits dans la table plutôt que dans un ticket.
- **Bookkeeping en attente de la PR #666** (clôture LOT-02 / ouverture LOT-03,
  ouverte, CI vert, non mergée) : le statut `terminé` du LOT-03 et `.wn/state.json`
  se posent après son merge, pour ne pas produire de conflit sur les mêmes lignes.
