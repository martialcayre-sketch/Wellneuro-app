# Brouillon — information des personnes sur l'hébergement (v2)

> **PROPOSITION À VALIDER PAR LE RESPONSABLE DE TRAITEMENT.** Ce fichier est
> un brouillon de campagne, pas un document publié. Sa publication — v2 de
> `DONNEES_CONFIDENTIALITE_V1` (`web/src/lib/trust/contenus/registre.ts` :
> document versionné, haché, à acquittements tracés) et décision d'un
> re-acquittement — est un **geste TRUST distinct**, hors du LOT-03.
>
> Écrit le 2026-08-19 au titre du LOT-03 de la campagne HDS. Motif : `D-078`
> a changé la nature de l'écart d'hébergement, et l'information délivrée
> jusqu'ici — orale, en consultation, sur une période dont le point de départ
> n'est pas établi (rubrique 11 du dossier) — décrit un état antérieur.

## Ce que ce texte doit couvrir — et pourquoi chaque point y est

| Point | Source | Pourquoi il ne peut pas être omis |
|---|---|---|
| Hébergement actuel non certifié HDS | `DOSSIER_RGPD.md` §12 ; annuaire ANS, 2026-07-21 | C'est l'écart lui-même — l'objet de l'information. |
| Écart assumé, borné, daté ; revue au 2026-10-21 | décision du responsable 2026-07-21 ; `D-078` §5 | Une information sans terme laisse croire à un état permanent. |
| Migration HDS engagée vers Scalingo | `D-006`, `D-078` | L'état a changé depuis l'information orale initiale. |
| Fenêtre de moindre couverture | `D-078` §3 | Le point le plus délicat : le taire rendrait l'information incomplète sur ce qui a précisément empiré. |
| Sentry, non déclaré à ce jour | `DOSSIER_RGPD.md` §14, ligne rubrique 6 | Trou nommé du dossier ; ce support est l'endroit naturel pour le combler. **La ligne du tableau ne se ferme qu'à la publication**, et le paragraphe ne se publie qu'après la réserve 2 — le déclarer mal serait pire que ne pas le déclarer. |

## Texte proposé (français, à valider)

> **Où sont hébergées vos données**
>
> Vos données sont aujourd'hui hébergées chez Vercel (application) et
> Supabase (base de données), dans l'Union européenne. **Ni l'un ni l'autre
> n'est un hébergeur certifié « données de santé » (HDS)** au sens de la
> réglementation française.
>
> Votre praticien en a fait le constat le 21 juillet 2026 et a décidé, en le
> consignant, de poursuivre l'accompagnement dans cette configuration
> pendant une phase de test **bornée au 21 octobre 2026**. Ce n'est pas une
> mise en conformité : c'est un écart, assumé et daté, qui sera réexaminé à
> cette date.
>
> **Ce qui est en cours, et ce que cela implique pendant un temps.** Une
> migration vers un hébergeur certifié HDS (Scalingo, France) est engagée.
> Le contrat spécifique à l'hébergement de santé **n'est pas encore signé**,
> et votre praticien a choisi d'engager la migration sans l'attendre, en
> connaissance de ce que cela emporte : **pendant cette période, vos données
> ne sont couvertes ni par le cadre posé le 21 juillet 2026 — qui visait
> l'hébergement précédent — ni par le contrat d'hébergement de santé. Sur ce
> point précis, et pour cette période seulement, la situation est moins
> protégée qu'avant la migration.** Elle prend fin à la signature du contrat.
>
> **Ce que cela ne change pas.** L'hébergement de l'application et de la base
> de données reste situé dans l'Union européenne ; vos droits d'accès, de
> rectification et d'effacement s'exercent comme indiqué ci-dessous ; et vous
> pouvez à tout moment demander l'arrêt de l'utilisation de l'outil dans
> votre suivi, sans conséquence sur votre accompagnement. (L'assistance par
> intelligence artificielle utilisée pour préparer les synthèses relève d'un
> prestataire hors Union européenne : voir la section correspondante.)
>
> **Un outil de suivi technique.** Nous utilisons Sentry pour être alertés
> des erreurs techniques de l'application. Il est configuré pour ne pas
> recevoir vos réponses aux questionnaires : le contenu des requêtes, les
> en-têtes et les cookies sont supprimés avant envoi.

## Réserves du rédacteur — à lever par le responsable

1. **Aucune qualification juridique n'est écrite ici** : ni base légale, ni
   mécanisme de transfert, ni durée de conservation — ce sont des trous
   ouverts du dossier, portés par un conseil qualifié (`DOSSIER_RGPD.md`
   §14). Le texte ci-dessus ne les comble pas et ne doit pas être lu comme
   les comblant.
2. **Sentry — l'absolu « jamais » a été retiré, et voici pourquoi.** La
   configuration (`web/sentry.server.config.ts`, et ses jumelles client et
   edge) pose `sendDefaultPii: false` et supprime corps de requête, en-têtes
   et cookies : c'est ce que le texte affirme, et c'est vérifiable. Mais
   **rien ne nettoie les messages d'exception, les breadcrumbs ni les
   contextes** — une erreur de validation peut, en principe, porter un
   fragment de réponse. Écrire « jamais » serait donc un absolu que le code
   ne garantit pas. **Reste à faire avant publication** : décider s'il faut
   nettoyer ces canaux (lot technique distinct), et **vérifier la résidence
   UE de Sentry** — trou ouvert au `DOSSIER_RGPD.md` §14. Déclarer Sentry
   sans dire où il est n'est pas faux, mais c'est incomplet.
3. **Le re-acquittement est une décision, pas une évidence** : publier une v2
   d'un document déjà acquitté peut exiger un nouvel acquittement des
   personnes. Cette question appartient au lot TRUST qui publiera.
4. **Forme de la délivrance** : ce texte est prévu pour le support écrit de
   l'application. L'information orale en consultation reste utile, mais elle
   ne laisse pas de trace par personne — c'est le manque nommé à la
   rubrique 11.
