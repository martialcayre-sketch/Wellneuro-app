---
id: "LOT-08"
titre: "accuser-les-lectures"
statut: "livré — #1061 fusionnée ; table constatée au conteneur, 2 accusés le 2026-09-13"
dépend_de: "LOT-07 (le fil du jour)"
---

# LOT-08 — Ce que le patient a déjà lu

## But

Le fil du jour doit porter les **lectures** — un nouveau bilan, une nouvelle
synthèse — et elles doivent **disparaître une fois lues**. Arbitrage du
responsable, 2026-09-12. Ce lot livre **la migration seule** (`D-087`) : la
table, son modèle, son contrat SQL, son effacement, sa déclaration au registre.
Le code qui la consomme est un lot distinct, et il ne peut pas venir avant que
l'application de la migration soit **constatée par conteneur**.

## Pourquoi le repère existant ne pouvait pas le faire

`portail_journal_reperes` porte **un seul instant par dossier** — `id_patient`
est la clé primaire, et c'est ce qui rend un décompte d'assiduité impossible. Il
répond à « jusqu'où ce patient a vu », jamais à « a-t-il ouvert CELUI-CI ».

La piste sans migration avait été posée devant le responsable avec son coût :
lister du plus ancien au plus récent et avancer le repère à la date ouverte —
**lire le plus récent d'abord aurait fait disparaître les précédents**, sans que
le patient l'ait demandé ni su. Un document remis qui s'efface tout seul est
exactement ce qu'un dossier de santé ne doit pas faire. Migration demandée.

## Ce qui est écrit, et pourquoi si peu

```sql
("id_patient", "espece", "id_objet")  -- clé primaire, CHECK sur l'espèce
```

**Trois colonnes, aucune date.** Le fil ne consulte que l'EXISTENCE de la ligne.
Un `lu_le` n'aurait rien servi et aurait servi à autre chose ; son absence rend
« quand ce patient a-t-il ouvert son bilan » structurellement sans réponse.

**Pas de colonne de version**, parce que l'identifiant l'est déjà — et c'est
VÉRIFIÉ, non supposé : `syntheses_comprehension` ne connaît que `create`, une
republication est une ligne neuve portant `supersedes_synthese_id` ; chaque
envoi de bilan est une ligne. Une version remplacée porte donc un autre
`id_objet`, la lecture ancienne ne l'acquitte pas, la tâche reparaît.

**L'espèce est fermée** par un `CHECK`. Ce qui compte comme une lecture est un
arbitrage : sans la contrainte, une surface pourrait y inscrire « connexion », et
la table deviendrait le journal de présence que la campagne s'interdit.

## CE QUE CETTE TABLE NE PROMET PAS, et il faut le lire

**Le repère rendait un décompte impossible. Celle-ci ne le rend pas.** Plusieurs
lignes par dossier : `count(*)` répond. Prétendre le contraire serait faux, et
le contrat SQL éprouve explicitement ce cas positif pour qu'aucun lecteur ne
croie la table mono-ligne comme sa voisine.

Ce qui borne le risque :

1. le compte est **borné par ce que le cabinet a REMIS** — il ne dit rien des
   connexions, ni de leur fréquence, ni de leur durée ;
2. **aucun instant n'est conservé** ;
3. elle alimente **l'écran du patient, et lui seul** — tenu par
   `portailLecturesPatient.guard.test.ts`, qui refuse toute référence depuis
   `api/praticien/` ou `patient-cockpit/`. **C'est une garde de dépôt, pas une
   contrainte de base** : elle protège la relecture, pas les données.

## La prémisse fragile, et sa garde

Si une publication se faisait un jour **en place** (`publiee_le` réécrit sur la
même ligne), cette table **mentirait en silence** : elle ferait disparaître du
fil un texte que le patient n'a jamais lu. Aucun test de la table ne peut voir
ça — le défaut serait dans l'autre modèle.

`syntheseComprehension` était déjà gardé par `matiereComprehension.guard.test.ts`,
pour ses propres raisons ; **`bookletEnvoi` ne l'était pas**. Les deux le sont
maintenant ici, au motif de cette migration — si l'autre garde était un jour
relâchée pour un motif de compréhension, la prémisse tomberait sans que personne
ne fasse le lien.

**Les trois gardes ont été éprouvées par sonde, et les trois mordent.** Un banc
qui passe sans avoir jamais mordu ne prouve rien.

## Une conséquence à trancher, pas ici

Avec un accusé par document, `portail_journal_reperes` n'a plus de consommateur
— le journal rétrospectif partant, il devient **orphelin**. Il n'est PAS
supprimé : détruire une table se demande. À poser au responsable une fois le
reste en place.

## Preuve

- T1 vert, `prisma validate` vert.
- T3 (palier exigé d'une PR migration) — verdict au commit.
- Le contrat SQL éprouve **huit promesses**, dont deux qu'aucune autre n'a :
  l'absence d'horodatage **vérifiée sur le TYPE** (et non sur des noms devinés,
  pour garder l'interdit et non la forme), et l'acceptation de plusieurs accusés
  par dossier.
