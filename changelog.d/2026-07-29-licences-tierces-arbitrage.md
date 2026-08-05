### Instruments sous licence tierce — cinq fermés à l'assignation

Arbitrage praticien du 2026-07-29 sur les huit instruments dont les droits ne sont
pas dégagés. **Cinq sont fermés** : `Q_PED_02` et `Q_PED_03` (Conners, © MHS),
`Q_GEO_04` (MMSE/GRECO, © PAR), `Q_CAN_01` et `Q_CAN_02` (EORTC). **Trois sont laissés
hors suspension** : `Q_SOM_02` (Epworth), `Q_INF_04` (HIT-6), `Q_NEU_11` (HAD).

**Le coût opérationnel est nul, et c'est mesuré en base de production** : les cinq
fermés ne portent **ni assignation ni réponse** — zéro ligne dans `assignations`,
zéro dans `questionnaire_reponses`. Aucun pack, aucun brouillon d'envoi ne les
référence. Les trois réponses existantes portent sur `Q_SOM_02`, `Q_INF_04` et
`Q_NEU_11`, tous laissés hors suspension, et la seule assignation (`Q_SOM_02`) est
au statut « Complété ». Aucune assignation ouverte n'est donc coupée — le cas où un
patient aurait trouvé son portail vide sans explication ne se présente pas.

- **Mécanisme choisi : `actif: false` au catalogue + `statutCertification:
  suspendu` au registre.** Il était déjà câblé — `IDS_SUSPENDUS` alimente les
  trois chemins d'assignation — et déjà gardé : le vérificateur du CI exige depuis
  #448 la cohérence dans les **deux** sens (`actif: false` ⇒ état terminal,
  terminal ⇒ pas actif). Aucun code neuf, donc aucune garde neuve à se tromper.
  L'alternative — câbler `licence_requise` sur les trois routes — demandait du
  code et sa propre preuve, pour le même effet.
- **Fermeture, pas effacement.** Les définitions restent, les passations
  enregistrées restent lisibles et scorables, la réactivation ne demande qu'une
  ligne dans chaque fichier.

**Un instrument que le mécanisme ne pouvait pas atteindre, et qui était dans la
pire des positions.** `Q_GEO_04` (MMSE) n'avait **aucune entrée** dans
`QUESTIONNAIRES_CATALOG` : il ne figurait qu'en `PASSATION_PRATICIEN`, une liste
d'**affichage** que les routes d'assignation ne consultent pas. Il n'était donc
pas proposé à l'écran — mais un appel direct à `api/praticien/assignations`
l'acceptait, cette route n'exigeant qu'une définition une fois passé le filtre
`IDS_SUSPENDUS`. « Invisible et assignable » est exactement la combinaison contre
laquelle `questionnaires-catalog.ts` met en garde depuis la suspension du MFI-20,
et sans entrée au catalogue, `actif: false` ne l'atteignait pas. Il reçoit donc
une entrée — **pour être suspendu, pas pour être offert**, le rayon ne montrant
jamais une entrée inactive.

Et il sort **en plus** de `PASSATION_PRATICIEN`, pour une raison distincte : cette
ligne portait l'aperçu de sa grille, donc l'usage en consultation. Fermer la seule
assignation en continuant d'afficher les 30 items laisserait l'usage licencié se
poursuivre sur papier. Les deux gestes sont indépendants, et il fallait les deux.

**Une justification fausse, corrigée en revue.** La première rédaction expliquait
ce retrait par un doublon d'affichage à éviter. Il n'y en avait aucun :
`listeBibliotheque` filtre les entrées inactives, le MMSE ne serait apparu qu'une
fois. Le geste tenait, sa raison était fausse — et mon propre test l'avait montré
en rendant zéro occurrence là où j'en attendais une. Je l'ai aligné sur le
résultat au lieu d'interroger la prémisse. Une raison fausse ne garde rien : elle
se retire sans que rien ne rougisse.

**Conséquences assumées, verrouillées par des tests nommés :**

- **La cancérologie est suspendue en entier.** `Q_CAN_01` et `Q_CAN_02` sont les
  seuls instruments du domaine. Un test le dit, et rougira le jour où un troisième
  arrivera sans que la question de sa licence ait été posée.
- **Le praticien perd l'accès à la grille du MMSE.** C'est l'objet de la
  fermeture, pas son effet de bord — mais le dossier de démarches recommande de
  trancher l'usage du MMSE (test administré par un clinicien, trois alternatives
  au catalogue) avant d'engager la dépense de licence : la question reste posée,
  et le retrait est réversible en une ligne.
- **Les trois instruments laissés assignables le restent** — une garde propre les
  couvre, sans quoi un élargissement silencieux de la suspension passerait pour la
  décision prise.

**Quatre démarches engagées auprès des ayants droit**, dossier d'instruction en
`docs/claude/propositions/2026-07-29-certification-montee/demarches-ayants-droit.md` :
EORTC (un **enregistrement**, pas une licence payante — la plus légère des
quatre), M. W. Johns pour l'Epworth (« licence requise pour certains usages » :
lesquels ? la réponse peut être « l'usage clinique individuel est libre »), PAR
pour le MMSE, QualityMetric pour le HIT-6. Trois portent sur un instrument fermé,
une sur un instrument encore servi : fermer et instruire sont deux gestes
indépendants.

**Ce qui n'est PAS couvert, et le point à surveiller — `Q_NEU_11` (HAD).** Trois
faits, dont deux ont été trouvés en revue adversariale et contredisent la première
rédaction de ce fragment.

1. Il est le seul des huit à rester hors suspension **sans qu'aucune démarche soit
   engagée**. Mention au registre : « GL Assessment (copyright déclaré, à
   vérifier) », sans DOI ni PMID, contenu jamais audité (1 divergence critique).
   Position tenable, non documentée. Ses trois candidats de remplacement
   (`Q_NEU_01`, `Q_NEU_02`, `Q_STR_04`) sont **tous `a_verifier`** : substituer
   rendrait la position moins visible, pas meilleure.
2. **Il n'est servable par aucun chemin d'interface.** La première rédaction
   écrivait « servi via l'alias `Q_STR_07` » : c'est faux. `Q_STR_07` figure bien
   au catalogue, mais **sans définition de scoring** — il n'entre donc pas dans
   `IDS_ASSIGNABLES`, la bibliothèque le badge « alias historique » et la route
   d'assignation le refuse en 404. La réponse enregistrée est d'ailleurs sur
   `Q_NEU_11`, pas sur `Q_STR_07` : elle reste lisible et rescorable.
3. **Il est exactement dans la position que ce lot ferme sur `Q_GEO_04`** :
   définition présente, aucune entrée de rayon, donc invisible à l'écran et
   accepté par un appel direct. Un test neuf recense cette classe et la fixe à
   `['Q_NEU_11', 'Q_NEU_12']` : un troisième membre fera rougir le CI.

Fermer `Q_NEU_11` ou lui donner une entrée de rayon sont deux décisions
opposées — la première le retire, la seconde le rend réellement servable et
gardable. Aucune n'est prise ici : l'arbitrage portait sur cinq instruments, et
étendre une décision de droits sans qu'elle ait été demandée serait exactement le
geste que ce dossier s'interdit.

**Quatre défauts nommés, non traités**, relevés par la même revue et tous
antérieurs à ce lot — qui en élargit la surface sans les créer :

- `api/praticien/file-envoi/envoyer` écarte bien un suspendu, mais **sans le
  journaliser ni le dire à l'écran**, contrairement à ses deux jumeaux
  (`packs/assign` et `portail/valider` émettent chacun un événement). Un
  brouillon contenant un suspendu part amputé, en silence.
- `api/praticien/bibliotheque/apercu` ne consulte pas `IDS_SUSPENDUS` : le
  verbatim d'un instrument fermé pour motif de droits reste servi à tout
  praticien authentifié.
- `api/praticien/packs` accepte encore de créer un pack contenant un suspendu ;
  c'est l'assignation qui l'écarte ensuite.
- Le commentaire historique parle de « trois chemins d'assignation » : il y en a
  **six** points d'écriture ou de ré-ouverture. Tous sont gardés — le compte est
  faux, pas la couverture.

Aucun instrument ne monte d'un barreau de certification : `droits_verifies` exige
une réponse écrite au dossier **et** une date de vérification, que le vérificateur
du CI contrôle toutes les deux.
