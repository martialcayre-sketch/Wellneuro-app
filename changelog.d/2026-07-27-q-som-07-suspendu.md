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
- **L'amputation d'un pack est tracée.** Écarter un qid en silence rend le trou
  indétectable : le praticien lit « 5 questionnaires assignés » sans savoir
  lequel manque, et sur le chemin de l'onboarding portail il n'y a même pas de
  praticien pour lire ce compte. Un `logger.warn` nomme donc les instruments
  écartés, dans `packs/assign` et dans `api/portail/valider`. La trace est
  posée **par les routes**, pas par `assignBasePack` : `LogPayload` exige un
  contexte de requête, et fabriquer un faux contexte pour contenter le type
  reviendrait à mentir dans le journal. La bibliothèque expose `qidsSuspendus()`
  et laisse tracer celui qui sait. Le code d'événement est le sien —
  `ASSIGNATION.PACK.INSTRUMENT_SUSPENDU`, et non `RESOLUTION_FAILED` réutilisé :
  la résolution a *réussi*, la requête rend 200, et `eventCodes.ts` écrit deux
  fois la règle inverse (« deux sémantiques, deux codes, sinon c'est
  inalertable »). Sous un code commun, un envoi nominal et un échec dur
  devenaient indiscernables — et un pack entièrement suspendu émettait deux fois
  le même code dans une seule requête.
- **Le pack affiche ce qui partira, pas ce qu'il contient.** `PacksPanel` tirait
  ses titres de `/api/praticien/questionnaires`, qui filtre `actif` : le pack de
  production concerné affichait donc « Q_SOM_07 » en identifiant brut au milieu
  de titres lisibles, et annonçait un compte incluant l'instrument jamais
  envoyé. Le compte porte désormais sur les seuls qids envoyables (liste et
  sélecteur d'assignation), et les autres sortent sur une ligne « Non envoyé —
  suspendu ou inconnu ». L'écran ne distingue pas suspendu d'inconnu, et n'a pas
  à le faire : la conséquence est la même, la route les écarte tous les deux.
- **Effet collatéral assumé sur `Q_FIB_03`.** L'ELFE est `actif: false` depuis
  la création du catalogue mais possède une définition de scoring : **avant ce
  diff, les trois chemins l'assignaient** par appel direct. Il devient refusé.
  C'est bien la sémantique voulue, et l'impact mesuré est nul — il n'est dans
  **aucun** pack, ne porte aucune assignation ni réponse en production, et est
  absent de tous les écrans. Mais c'est une capacité retirée, et elle est ici
  nommée plutôt que passée sous silence.
- **Il existe un quatrième chemin d'assignation**, `api/praticien/file-envoi/
  envoyer` — déjà étanche, puisqu'il passe par `IDS_ASSIGNABLES`, qui filtre
  `actif`. Rien à corriger, mais à savoir : « les trois chemins » ci-dessus
  désigne ceux qui ne l'étaient pas.
- **Limites connues, laissées telles quelles.**
  - Une assignation déjà envoyée et non remplie resterait remplissable : le
    portail patient ne filtre pas sur `actif`. Le cas est **vide** — les 3
    assignations de `Q_SOM_07` sont `Complété` / `verrouillé` (la 4ᵉ réponse
    n'a pas d'assignation : c'est la ligne de seed du 2026-06-15).
  - `PATCH /api/praticien/assignations` déverrouille une réponse complétée et
    rouvre la saisie : un praticien peut donc re-servir un instrument suspendu.
    Geste délibéré, mais non gardé.
  - Créer un pack n'interdit pas d'y placer un instrument suspendu ; il sera
    écarté à l'envoi.
  - **La suspension ferme le robinet, pas le réservoir** : les passations déjà
    enregistrées continuent d'alimenter la fiche et la synthèse IA avec
    l'interprétation que ce même lot déclare invalide. Un praticien lira encore
    « Fatigue sévère » sur une somme sans inversion d'items. C'est le prix de
    l'arbitrage « marquer et laisser en place » ; le marquage relève de la
    reconstruction.
  - Et le réservoir n'est pas seulement laissé plein, il est **rerempli** :
    `prisma/seed.ts` recrée `REP_J02_SOM07` (score 31, « Fatigue
    multidimensionnelle sévère ») à chaque `db seed` et à chaque
    réinitialisation E2E. La ligne est conservée sciemment — elle reproduit
    l'état réel de la production, où 3 passations verrouillées portent la même
    lecture, et c'est précisément le cas qu'on veut voir s'afficher. La retirer
    ferait diverger la démo du réel et toucherait des empreintes visuelles,
    pour un gain nul.

  Fermer ces trous toucherait le parcours patient de tous les instruments, ou la
  surface de restitution : lots distincts.
- La description affichée annonce toujours « 5 dimensions » là où le scoring en
  sert 2. Elle n'est plus visible (l'entrée quitte la bibliothèque) et sera
  corrigée à la réactivation, avec la grille reconstruite depuis la source.
