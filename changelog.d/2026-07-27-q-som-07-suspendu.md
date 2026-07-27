### Clinique

- **Le questionnaire `Q_SOM_07` cesse d'être envoyé : l'instrument servi sous le
  nom « MFI-20 » n'est pas le MFI-20.** Confrontation au PDF source du cabinet
  (2026-07-27) : l'échelle d'accord 1→5 de la source est servie en fréquence
  0→4 ; aucune des 10 inversions d'items n'est appliquée ; les 5 sous-échelles
  publiées sont servies en 2 sections ; et 3 bandes d'interprétation sur /80 y
  figurent alors que la source écrit, en toutes lettres, qu'il n'existe pas de
  barème. Les libellés ne se recoupent qu'à moitié. Ce n'est donc pas un défaut
  de scoring à corriger, mais un **autre instrument** portant le même nom.
- **`actif` devient une garde de route, pas seulement d'écran.** C'est le cœur
  du lot, et il a fallu une revue adversariale pour le voir : `actif: false`
  seul ne retirait le questionnaire que du sélecteur praticien, de
  `IDS_ASSIGNABLES` et de `listeBibliotheque()`. Les **trois chemins
  d'assignation** l'ignoraient — `api/praticien/assignations` (dont un
  commentaire annonçait la dette, neuf lignes sous la règle « le refus est ici,
  dans la route, et non dans l'écran — sinon un appel direct le contourne »),
  `api/praticien/packs/assign`, et `consultation/assignBasePack` appelé par
  l'onboarding portail, donc **sans clic praticien**. Ce n'était pas théorique :
  un pack actif de production contient `Q_SOM_07`. Un clic l'envoyait encore.
  La route unitaire rend désormais **409 `questionnaire_suspendu`** avant toute
  écriture et tout envoi ; les deux chemins de pack écartent l'instrument comme
  ils écartent déjà un identifiant inconnu — le pack part amputé plutôt que
  d'échouer en bloc, parce que rien ne retire le qid de `packs.qids`.
- **La garde porte sur l'ensemble des suspendus, pas sur le complément
  « assignables ».** `IDS_ASSIGNABLES` exclut aussi les alias historiques et les
  passations praticien : s'en servir aurait refusé des questionnaires qui
  passent aujourd'hui. Refuser exactement ce qui est suspendu ne change le
  comportement d'aucun autre instrument.
- **Les 4 passations déjà enregistrées restent intactes et lisibles**, et ce
  n'est pas un effet de bord : c'est la propriété qui rend la suspension
  acceptable. Vérifié à la ligne — les deux routes de lecture
  (`api/praticien/reponses`, `api/portail/assignations`) interrogent la base sur
  le patient, jamais sur le catalogue ; `calculateScore` ne consulte pas `actif`.
  **Aucune de ces passations n'est recalculable** — les réponses existent, mais
  portent sur d'autres items et sur une autre échelle. Rien n'est réécrit.
- **Un banc verrouille la décision, et plus seulement le mécanisme.** La
  première version de ce banc était **verte avant le changement** : `Q_FIB_03`,
  déjà suspendu, satisfaisait à lui seul les trois invariants, si bien que
  réactiver `Q_SOM_07` n'aurait rien fait échouer. Un invariant générique et une
  assertion nommée ne s'excluent pas — il faut les deux. S'y ajoutent un test
  par chemin d'assignation et un contrôle négatif (« il existe au moins un
  suspendu »), sans lequel les invariants passeraient au vert sur un ensemble
  vide. La moitié « lecture » s'appuie désormais sur `calculateScore` lui-même,
  qui rend `{ error }` sur un id absent, plutôt que sur la simple présence d'une
  clé — une purge des inactifs du catalogue de scoring la ferait donc échouer.
  Falsifié par quatre mutations : retrait de la garde dans chacun des trois
  chemins (1, 1 et 2 échecs), et réactivation de `Q_SOM_07` — **5 échecs, contre
  0 pour la version précédente du banc**.
- **Rien n'est écrit en base.** La colonne `questionnaires.actif` existe, mais
  elle n'a qu'un écrivain — le backfill manuel `backfill:pack-registry:apply`,
  qui recopie la valeur depuis ce catalogue — et **aucun lecteur** : son unique
  lecteur applicatif (`consultation/packRegistry.ts`) ne sélectionne pas ce
  champ. C'est un miroir aval, pas une seconde source de vérité ; le catalogue
  TypeScript reste le seul point de décision. Aucune migration. Le qid reste
  dans `packs.qids` du pack concerné : il est écarté à l'envoi, pas supprimé —
  ce qui le rendra de nouveau disponible à la réactivation, sans rien réécrire.
- **Limites connues, laissées telles quelles.** Une assignation déjà envoyée et
  non remplie resterait remplissable : le portail patient ne filtre pas sur
  `actif`. Le cas est vide aujourd'hui — les 3 assignations de `Q_SOM_07` en
  production sont `Complété` / `verrouillé`. De même, la création d'un pack
  n'interdit pas d'y placer un instrument suspendu ; il sera simplement écarté à
  l'envoi. Fermer ces deux trous toucherait le parcours patient de tous les
  instruments : lot distinct.
- La description affichée annonce toujours « 5 dimensions » là où le scoring en
  sert 2. Elle n'est plus visible (l'entrée quitte la bibliothèque) et sera
  corrigée à la réactivation, avec la grille reconstruite depuis la source.
