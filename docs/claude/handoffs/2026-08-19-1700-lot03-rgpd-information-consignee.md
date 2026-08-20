# 2026-08-19 17:00 — LOT-03 : information consignée, dossier RGPD à l'état réel

## Ce qui a changé

- **`docs/DOSSIER_RGPD.md` rubrique 11** — le TROU majeur est **partiellement**
  comblé : forme (orale, en consultation) et contenu consignés sur déclaration
  du responsable (session du 2026-08-19), **seule source**. Restent ouverts et
  nommés : date de délivrance (l'ancrage « souscription HDS » n'est pas tenu
  pour établi par le dépôt), modalité de retrait, trace écrite par
  participant, périmètre des personnes.
- **Tableau §14** — trois lignes bougent, deux sont ajoutées : rubrique 11
  (consignée ; renouvellement **indexé sur la bascule**, pas sur le
  2026-10-21), DPA (« avant bascule » → « dès réception, avant tout
  décommissionnement »), et **piste d'audit** dont l'échéance « premier
  dossier ouvert » était échue sans mention. Toutes les autres restent
  ouvertes avec leur porteur ; **rien de conseil qualifié n'a été rédigé**.
- **§6 et §12** annotés `D-078` sans rien effacer (ordre suspendu, signature
  toujours due, fenêtre de moindre couverture, revue au 2026-10-21).
- **`CHECKLIST_FINALISATION.md` §F** — acte de levée coché avec sa nuance
  (écart assumé ≠ conformité) ; arbitrage fournisseur rendu mais case
  **ouverte** : c'est la signature qui la ferme.
- **Brouillon de support v2** (`sources/brouillon-information-hebergement-v2.md`)
  — préparé, **jamais publié**.
- LOT-03 → terminé ; deux cases du « Done de campagne » cochées sur preuve.

## À savoir pour la suite

- **La publication du support v2 est un lot TRUST distinct** :
  `DONNEES_CONFIDENTIALITE_V1` est versionné, haché et acquitté
  (`web/src/lib/trust/contenus/registre.ts`) — publier une v2 pose la question
  du re-acquittement, qui n'est pas tranchée.
- **Réserve du brouillon à lever avant publication** : l'absolu « jamais »
  sur Sentry a été retiré — la configuration supprime corps, en-têtes et
  cookies, mais **ne nettoie ni les messages d'exception ni les
  breadcrumbs** ; nettoyer ces canaux est un lot technique distinct, et la
  résidence UE de Sentry reste un trou ouvert du §14.
- **`web/src/lib/trust/gouvernance.ts` n'est montré à personne** : ses deux
  exports (`GOUVERNANCE_TRUST`, `NUMEROS_URGENCE_FR`) n'ont **aucun
  consommateur** dans `web/src` ni `web/e2e` — vérifié au dépôt. Ce que le
  patient voit est une **copie indépendante** du même contenu, portée par
  `contenus/registre.ts` (document `DONNEES_CONFIDENTIALITE_V1`, servi par
  les pages du portail). Les deux ne sont tenues synchrones par rien : éditer
  `gouvernance.ts` en croyant changer ce que le patient lit ne change rien.
  **Dette nommée, sans lot** (voir aussi les rubriques 1 et 6 du dossier,
  corrigées ici).
- Reste au responsable, côté LOT-01 : la référence du canal de la demande
  d'annexe (2026-08-12) et la signature dès réception.

## Dettes d'outillage nommées par la revue, sans lot d'accueil

- **Aucun contrôle automatisé du §14** : la vérification « aucune échéance
  passée sans mention » se fait à l'œil — et elle a manqué la ligne de la
  piste d'audit. Un contrôle qui compare les échéances datées au jour, et
  signale les non datées (« au plus tôt », « premier dossier ouvert »,
  « avant bascule »), fermerait la classe entière.
- **Aucun déclencheur de relecture à la bascule** : §11 (« décrit un état
  antérieur »), §12 (« non exécutée ») et la ligne DPA deviennent faux le
  jour J ; rien dans le LOT-02 n'oblige à revenir ici.

## Vérifié

- Anti-secrets vert ; aucun fichier de code au diff. T1 joué, mais **sans
  portée** sur un diff 100 % documentaire — ne pas le présenter comme une
  garantie.
- Revue `Agent(wn-reviewer)` avant la PR : GO sous conditions, six bloquants,
  tous refermés.
