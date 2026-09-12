### Un questionnaire jamais rempli, échu, n'avait plus aucun geste — nulle part

Le portail refuse la saisie dès que la date limite est passée, et n'en exempte
que trois statuts — dont `deverrouille`. Le geste qui pose ce statut existe
depuis longtemps (`PATCH /api/praticien/assignations`), et son commentaire dit
même pourquoi : « une assignation délibérément rouverte après la date limite
doit redevenir remplissable, sinon le geste praticien ne produit rien ».

**Mais l'écran ne l'offrait qu'aux demandes de correction.** La liste qui porte
le bouton « Débloquer » est alimentée par `statutReponses=modification_demandee`.
Un questionnaire simplement JAMAIS REMPLI dont l'échéance est passée n'entre
dans aucune liste : le patient trouve porte close, le praticien ne voit rien, et
aucun bouton n'existe pour le rouvrir. Trouvé le 2026-09-12 en cherchant la
suite d'un autre correctif ; **un dossier de production est dans ce cas**.

La fiche lit désormais une seconde liste — les assignations non remplies dont
l'échéance est dépassée — et leur offre le même bouton. Bloc SÉPARÉ, jamais
fondu avec celui des corrections : le geste est le même, l'histoire ne l'est
pas. Là le patient a DEMANDÉ qu'on rouvre ; ici il n'a rien demandé. Un bloc
commun ferait chercher un commentaire patient qui n'existe pas.

**Le filtre est en base, pas dans l'écran** — troisième fois que cette route le
fait, et pour la troisième fois la même raison : filtrer en mémoire une liste
déjà tronquée à 40 lignes ne cache pas des lignes en trop, il en cache en moins,
sans le dire. `date_limite` étant une colonne texte `AAAA-MM-JJ` où l'ordre
lexicographique est l'ordre chronologique, « échue » s'écrit `< aujourd'hui` ;
le `not: null` n'est pas décoratif, la règle du portail étant explicite — pas
d'échéance, jamais expirée.

**Et l'échéance ne se recalcule JAMAIS côté client.** `isDeadlineExpired`
construit une date sans fuseau : évaluée dans un navigateur, elle se lit à
l'heure du navigateur, et à Paris l'été le client déclarait l'expiration deux
heures avant le serveur. La date part au client pour être AFFICHÉE, rien de
plus ; c'est le serveur qui juge, et `assignationsMeta.echeanceDepassee` le lui
dit. Si cet écho manque — serveur antérieur au paramètre —, l'écran n'affiche
RIEN et le signale : sans lui, la réponse porte toutes les assignations non
remplies du dossier, et « Débloquer » rouvrirait des questionnaires dont
l'échéance court encore.

Les deux expressions de « l'échéance est dépassée » — celle en mémoire du
portail, celle en base de l'écran praticien — ne sont dérivées l'une de l'autre
par rien. `patient-access.guard.test.ts` les confronte sur des dates encadrantes
à six heures de la journée, bascules de mois et année bissextile comprises : si
elles divergent d'un jour, le praticien voit une ligne que le patient peut
encore remplir, ou ne voit pas celle qui est bloquée.

Deux mutations jouées, deux mutants tués — dont un qui a d'abord SURVÉCU : le
stub du serveur sans écho n'échoait aucune clé, si bien que le contrôle passait
par le mauvais chemin. Le stub écho désormais tout sauf `echeanceDepassee`, et
la vérification est seule à décider.
