## 2026-08-22 — feat(praticien): l'objectif négocié — ce qui est demandé, compris, priorisé, et ce qui est assumé non traité (Alliance 6.0-A, LOT-02)

Le praticien pose dans le dossier un objectif négocié : l'énoncé du patient, sa
reformulation, la priorité retenue, et ce qui est assumé « non traité pour
l'instant » — daté et motivé. La surface vit au rail du cockpit, phase
« Compréhension », **hors du runtime clinique** : elle reste visible sans
épisode confirmé.

Aucune migration, aucune colonne — les tables existent depuis le LOT-01, et la
liste blanche du contrat SQL refuserait tout ajout.

**Append-only par référence** : reformuler, reprioriser ou assumer un « non
traité » crée une **nouvelle ligne** qui référence la précédente. La route ne
porte ni `PATCH` ni `DELETE` — il n'existe pas de verbe pour écraser. La
trajectoire complète reste lisible, et quand plusieurs têtes de chaîne
coexistent, elles sont **toutes** affichées : départager en silence ferait
disparaître une reformulation sans erreur (`DC-30`). L'énoncé du patient est
recopié depuis la ligne supplantée après vérification qu'elle appartient au
même dossier — jamais repris du corps de la requête, ce qui permettrait de
faire dire au patient, révision après révision, autre chose que ce qu'il a dit.

Le matériau d'ancrage de l'anamnèse (motif principal, objectif prioritaire,
attentes) s'affiche **à côté** de la saisie et ne la pré-remplit jamais : une
phrase dite à l'anamnèse n'est pas une phrase dite en négociation. Trois
absences distinctes portent trois libellés distincts (`DC-24`). La plainte
dominante Q_MOD_03 n'est pas reprise : elle n'est produite que par la
confirmation d'épisode, et la recalculer aurait été toucher au moteur.

La **ratification est lue, jamais écrite** — c'est un geste du patient, il
appartient au LOT-06 ; une ratification absente s'affiche « pas encore proposé
au patient », jamais « non ratifié ».

Six gardes structurelles, chacune **vue rouge par une mutation réelle** avant
d'être déclarée verte : clés de l'objet exposé épinglées au type-check, aucune
propriété de mesure ordonnée, la priorité qui ne s'ordonne pas (elle reste un
libellé libre — l'ordonner en ferait un rang, `DC-19`/`DC-20`), la date
d'écriture jamais transmise, aucun `update`/`delete` hors l'effacement RGPD
nommé, et aucun moteur clinique importé (`DC-31`/`DC-32`).
