# Cadrage — La chaîne documentaire : un moteur, trois rendus, et un écran qui montre autre chose que ce qu'il envoie

> **Pourquoi ce fichier existe.** L'audit du 2026-09-17 a produit un plan en dix
> lots qui ne vivait que dans un artefact publié, hors dépôt. Une session qui
> reprenait sans cette URL n'avait aucun moyen de savoir ce qu'était « le lot H ».
> Ce cadrage met le plan dans le dépôt. Il ne crée **aucune campagne** : pas
> d'état machine, pas d'entrée en file d'attente, pas de lot actif. C'est une
> pièce de référence, pas un pilotage.

**Sources.** Audit de la chaîne documentaire, 2026-09-17 : 28 constats, tous
soumis à une contre-épreuve adverse, **21 tenus, 7 réfutés** — dont deux constats
de la première passe, réfutés par la seconde. Les deux artefacts publiés portent
le détail, les extraits de code et les réfutations :

- `https://claude.ai/code/artifact/f9e909f9-decd-4bf6-a8cd-60dcd861ced1` — l'audit
- `https://claude.ai/code/artifact/b78a18b5-a487-4438-bfdf-d6d19c489350` — le bilan de séance

## L'état réel — un moteur, trois rendus, et ce n'est pas un doublon

La question d'origine était : « synthèse IA, booklet, documents à composer —
ces fonctions font-elles doublon ? » Elles n'en font pas.

- **La synthèse IA est la matière** : un objet structuré, révisable, avec un
  cycle de vie (`Brouillon_IA` → `Validee_Praticien` → `Corrigee_Praticien` /
  `Rejetee`). C'est le seul endroit où le contenu se corrige.
- **Le booklet en est le rendu d'envoi** : figé à l'expédition, porteur de la
  note du praticien.
- **Les documents à composer sont un troisième rendu**, par le moteur C3, avec
  filtre de champs par destinataire.

Le rayon « Synthèse IA » n'est donc pas obsolète.

## Le constat central

Sur `/dashboard/documents`, l'onglet Patient affiche un **rendu C3** ; le bouton
d'envoi expédie le **booklet**. Les deux divergent : la note du praticien et deux
mentions réglementaires n'existent que dans l'un. **Le praticien atteste une
relecture sur un document qui n'est pas celui qui part.**

L'aperçu fidèle existe déjà — sur l'autre écran, celui qui n'est pas celui de la
composition.

## Ce que la contre-épreuve a RÉFUTÉ, et qu'il ne faut pas rouvrir

- **Le chemin vers le médecin n'existe effectivement pas** — ce qui est réfuté,
  c'est de le compter comme un DÉFAUT. Le périmètre est fermé délibérément
  ([[D-222]]). Ne pas lire cette ligne comme « un chemin existe » : il n'y en a
  pas, et il n'est pas prévu qu'il y en ait.
- **« L'écran Documents promet un envoi au médecin » — réfuté.** Il annonce une
  impression, trois fois.
- **« L'e-mail patient et Mon bilan sont à fusionner » — réfuté.** Ils sont déjà
  servis par la même source ; c'est le document composé qui n'a pas de chemin
  vers le patient, et il s'imprime.

## Les dix lots, dans cet ordre

Les trois premiers ferment la divergence et coûtent peu. Le septième est le seul
vrai manque de produit.

| | Lot | Coût estimé | État |
|---|---|---|---|
| **A** | L'aperçu patient devient celui qui part : charger l'onglet Patient par l'aperçu fidèle existant plutôt que par le rendu C3 | 1 fetch, ~30 lignes | ouvert |
| **B** | Le rendu porte les deux mentions réglementaires, depuis une donnée déjà présente ; ferme aussi le document patient biologie | ~20 lignes, 1 banc | ouvert |
| **C** | La garde de vocabulaire lit aussi la note du praticien, à l'envoi comme au renvoi | ~25 lignes, 2 bancs | ouvert |
| **D** | Un banc d'énumération sur la carte des chemins sortants : tout rendu hors carte doit rougir | 1 banc de structure | ouvert |
| **E** | Couvrir `SynthesePanel` avant d'y toucher — **préalable bloquant** | — | entamé |
| **F** | Archiver ce qui est parti et le sceller : narratif transmis + ancre, après avoir fermé la brèche de `valider` | 1 migration additive | ouvert |
| **G** | Une file de relecture exhaustive, inter-patients, sans plafond | 1 écran, 1 route | ouvert |
| **H** | Déverrouiller le sélecteur de patient | ~5 lignes, 1 banc | **fait** |
| **I** | Dater le sélecteur de synthèses, et lire les envois du dossier avant d'envoyer | ~15 lignes, 1 requête | ouvert |
| **J** | Les deux boutons manquants, et la carte du Fil qui perd son dossier | 4 fichiers | ouvert |

## Ce qui est déjà fait

**Lot H**, mergé le 2026-09-19 (`d171c487`). Arriver sur l'écran Synthèse avec un
dossier en URL verrouillait le sélecteur ; le dossier de l'URL s'applique
désormais une fois. Le correctif a fermé au passage une **course préexistante**
que le verrou rendait inatteignable : deux lectures de synthèses en vol pouvaient
se croiser et faire afficher les synthèses d'un dossier sous le nom d'un autre.

Il a aussi posé le **premier banc de `SynthesePanel`** — cinq assertions, cinq
mutations. C'est un acompte sur le lot E, pas son acquittement : le composant
fait 786 lignes et porte l'envoi forcé comme la confirmation au registre.

**Le lot G cesse d'être théorique.** La lecture de production du 2026-09-18 a
trouvé **trois synthèses validées que personne n'a jamais envoyées** — au dossier,
sans booklet expédié, et invisibles faute de liste inter-patients.

## Contraintes non négociables

1. **Le lot E précède tout regroupement** sous Correspondance. `SynthesePanel`
   porte l'envoi forcé et la confirmation au registre sans aucun test ; regrouper
   d'abord et couvrir ensuite est l'ordre exactement inverse de celui qui tient.
2. **Une signature clinique ne se pose jamais par l'outil.** Produire la surface
   de relecture AVANT de demander l'attestation.
3. **Aucune donnée clinique de patient ne sort du local** — ni en artefact, ni
   dans le dépôt. Identités fictives limitées à celles qu'autorise `AGENTS.md` § 2.

## Hors périmètre, nommé

- L'adressage médical : périmètre fermé par [[D-222]], et la contre-épreuve l'a
  confirmé contre le constat initial.
- La fusion de l'e-mail patient et de « Mon bilan » : réfutée ci-dessus.
- Le sort des neuf brouillons automatiques déjà produits : traité par [[D-226]]
  et son amendement, pas ici.

## Réserves

Les coûts annoncés sont des ordres de grandeur estimés à la lecture du code, pas
des engagements. Les mesures de production sont des agrégats lus en conteneur
détaché à une date donnée ; elles ne disent pas **pourquoi** un document n'a pas
été envoyé. Et l'ordre des lots est un ordre de dépendance et de risque, pas un
calendrier.
