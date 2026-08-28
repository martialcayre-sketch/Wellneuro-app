### L'épisode confirmé au cockpit se persiste à la confirmation, et le GET le rejoue (`D-118`)

Retour d'usage du premier dossier réel servi de bout en bout : le praticien
confirme `T0` au matin, recharge la page, et le rail affiche « Décision : en
attente », « Actions : à ouvrir » — **comme si l'acte n'avait pas eu lieu**. La
confirmation vivait en mémoire du navigateur ; la persistance voyageait avec le
protocole (`D-054`), et tant qu'aucun protocole n'était enregistré, l'acte ne
survivait pas à la session d'écran.

**Le POST cockpit devient le troisième point de persistance.** L'épisode
confirmé s'écrit à la confirmation — même `upsert` idempotent, même
`toEpisodeCreateInput`, même résolution d'identité de cycle (gate G2) que les
deux points du protocole, et la garde `refusAncreNonRecevable` y compris son
refus « ancre déjà posée sous un autre épisode » (contre-revue `N1.1`). Les deux
points du protocole **demeurent** : leur upsert trouve la ligne déjà posée et ne
réécrit rien. `refusPreconditionsPersistance` reste sans objet au cockpit — elle
vérifie des contournements qui ont transité par le navigateur, or ce POST les
construit côté serveur.

**Le GET sait rejouer.** Un épisode persisté dont le blob se recoupe
(`payloadHash`) et dont le **socle** — identifiant, jalon, fenêtre, candidats —
est canoniquement identique à la proposition recalculée est rejoué en `ready` :
même horodatage (celui de la confirmation), donc **mêmes empreintes et mêmes
identifiants d'enveloppe** — versions, diffusion et check-ins retrouvent leur
fil, prouvé par banc à l'empreinte près. Un dossier qui a bougé retombe sur la
proposition, le flux « les réponses ont changé » d'aujourd'hui. La lecture
datée (`asOf`) ne rejoue jamais : le passé se recompose, il ne se sanctionne
pas.

**Le rejeu n'est pas une confirmation.** Il porte un marqueur `rejoue` : une
carte rejouée ne verrouille pas le jalon affiché (le `J21` devenu dû reprend la
main sur un `T0` rejoué), et n'assemble aucune proposition d'objectif —
assembler à chaque relecture ferait d'un affichage un acte.

**Le rail des phases lit désormais la base.** « Épisode confirmé » dérive
aussi de la trajectoire (une ligne d'épisode ⇒ un cycle) et plus du seul écran :
« Décision : renseignée » survit au rechargement, même quand l'écran montre la
proposition d'un autre jalon.

**Le non-journal du POST change de justification, pas de comportement** : « ce
POST n'écrit rien » est mort ; ce qui s'applique est la dispense d'écriture de
`GD-1`, la même que les deux points du protocole.

Chaque garde neuve est prouvée par mutation : la distinction frais/rejoué et la
dérivation base du rail ont chacune leur banc qui rougit sans elles. **Aucune
modification clinique** (`DC-17`/`DC-18`) : aucun seuil, dose ni borne — c'est
le **moment de persistance** d'un acte déjà défini qui change, et sa
visibilité.
