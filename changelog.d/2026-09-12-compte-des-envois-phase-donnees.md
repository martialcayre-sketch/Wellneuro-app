### Fiche-trajectoire — « 9 reçus » dit enfin sur combien, et ce qui bloque l'ancre

La phase « Données fiables » annonçait le nombre de passations reçues et rien
d'autre. Neuf sur quoi ? Un dossier à qui il manquait un questionnaire du
**rideau T0** — donc dont l'ancre était inconfirmable — se lisait exactement
comme un dossier complet. Constaté sur un dossier réel le 2026-09-12 : neuf
passations reçues, six envois en attente, et parmi eux le seul qui empêchait de
confirmer le T0.

La zone focale de la phase porte désormais, **sous** la ligne des passations
reçues et sans se fondre avec elle :

- `N rendus sur M` — les annulées hors du dénominateur, dites à part. `Annulée`
  est le geste par lequel le praticien dit « je ne l'attends plus », et c'est
  déjà ce qu'en fait `evaluerSecondRideau` : un compte qui les garderait
  afficherait une attente que personne n'attend.
- **ce qui bloque, au singulier** : l'envoi du rideau T0 jamais rendu est nommé
  avec sa date de pose puis son ancienneté (« en attente depuis le 08/09
  (4 j) »). La date d'abord parce qu'elle est servie, donc exacte ; le nombre de
  jours ensuite parce qu'il est calculé à l'horloge du navigateur — repère de
  tri, jamais verdict, comme `dateLimite` que cet écran n'a jamais rejoué.
- **l'inverse se dit aussi** : rideau complet, les envois qui restent
  n'empêchent pas de confirmer l'ancre. Sans cette phrase, le praticien suppose
  un blocage et attend pour rien.

Deux nombres, deux sources, **aucun ratio fabriqué** : `/api/praticien/reponses`
compte des passations, `/api/praticien/patients` des assignations. Une passation
peut exister sans assignation, et une assignation rendue en porter deux — les
diviser l'une par l'autre aurait été faux les deux fois.

Le compte administratif reste **séparé du clinique** : « 6 en attente » dit
qu'un envoi n'est pas revenu, « Données manquantes » (panneau juste en dessous)
qu'une revue clinique reste à préparer. Les fondre ferait passer un retard
d'envoi pour un manque clinique (`DC-24`).

Une **liste tronquée ne produit aucun compte** : la route plafonne à 40 lignes,
et un compte tiré d'une liste plafonnée serait faux vers le bas — le défaut que
les trois filtres serveur de cette route ont déjà corrigé trois fois. L'écran le
dit et propose la relecture, comme il le fait pour une lecture en échec : un
compte inconnu n'est jamais rendu comme nul.

Côté code, la composition des deux rideaux (`RIDEAU_T0`, `HORS_RIDEAU_MOTIVE`)
est **déplacée dans un module feuille** `clinical-engine/rideauT0.ts`, que
`preconditionsT0.ts` ré-exporte : un composant client a besoin de la liste, et
`preconditionsT0.ts` tire Prisma par `orientationService`. Même patron que
`clinical/stopRulesLibelles.ts`. La table clinique de `D-052` reste unique et
ses lecteurs existants n'ont pas bougé ; le contournement de `lib/fil/cartes.ts`
(taille passée en paramètre) reste correct et n'est pas touché.
