# Arbitrages des questions ouvertes 5.0 — « la Spirale »

> Session du 2026-07-15. Ce document clôt les cinq questions laissées
> ouvertes par `BRAINSTORM_SPIRALE.md` (§ Questions pour la prochaine
> revue). Chaque question est développée (options, arguments, risques),
> puis tranchée — décisions utilisateur recueillies le 2026-07-15.
> Les décisions sont actées au registre (`REGISTRE_FRONTIERES.md`, A6)
> et engagent le programme `campagnes/PROGRAMME_WELLNEURO_5_0.md`.

## 1. Time-travel : lecture seule ou annotation rétrospective ?

**La question.** Quand le praticien recharge la fiche telle qu'elle était à
une date passée, peut-il y écrire quelque chose ?

**Options envisagées.**

| Option | Pour | Contre |
|---|---|---|
| Lecture seule stricte | Aucun risque d'altération rétroactive ; modèle de données minimal ; la plus simple à livrer | La relecture est le moment où les idées viennent — les perdre force un aller-retour artificiel vers le présent |
| Note de relecture | Capture l'insight au moment où il naît ; trace clinique utile (« en relisant le T0, je remarque… ») | Exige une règle d'affichage stricte pour ne jamais contaminer le passé ; un objet de données de plus |
| Écriture libre dans le passé | — | Écarté d'office : falsification potentielle du dossier, inacceptable cliniquement et réglementairement |

**Décision (utilisateur, 2026-07-15) : note de relecture autorisée.**

**Règles d'implémentation qui en découlent (non négociables) :**
- La note est **toujours horodatée au présent** (date de rédaction), jamais à
  la date consultée. Elle porte une référence à la date/l'épisode consulté.
- Elle est **visuellement et structurellement séparée** des données de
  l'époque : jamais mêlée au snapshot, affichée dans un calque « relecture »
  distinct, dans la teinte d'accent avec étiquette explicite.
- Le snapshot historique reste **immuable** (hash canonique C1 inchangé) :
  la note vit dans un objet à part (`RelectureNote`, à modéliser en C2A —
  patient, épisode/date visée, texte, auteur, date de rédaction).
- Conséquence de lot : SP-TT dépend de C2A pour la persistance de la note.

## 2. Cabinet apprenant : à partir de quel n afficher le repère ?

**La question.** Le « repère du cabinet » (médiane de momentum sur les
épisodes clos du cabinet) est masqué sous un seuil — lequel ?

**Analyse.** Un cabinet individuel accumule lentement les épisodes clos. Un
seuil trop haut (n ≥ 10) rendrait la fonction invisible pendant des mois ; un
seuil trop bas (n ≥ 3) afficherait une « médiane » qui n'en est pas une.
Le garde-fou structurel existe déjà : `n=` est **toujours affiché** à côté du
repère, et le mot est « repère », jamais « prédiction ». La transparence de
l'effectif compense la fragilité statistique des petits n.

**Décision (recommandation Claude, paramètre ajustable) : n ≥ 5 épisodes
clos.** Constante applicative unique (`SEUIL_REPERE_CABINET = 5`), documentée,
modifiable sans refonte. En dessous : le repère est masqué et l'interface
affiche « repère disponible à partir de 5 suivis complets » (jamais un repère
grisé qui laisserait deviner une valeur).

## 3. Écoute ambiante : qui recueille le consentement, sous quelle forme ?

**La question.** Le copilote de consultation en périmètre maximal inclut
l'écoute ambiante (transcription de séance). Sous quelle forme le
consentement est-il recueilli ?

**Options envisagées.**

| Option | Pour | Contre |
|---|---|---|
| Case en début de séance seule | Léger, dans le flux | Fragile juridiquement (pas d'information préalable documentée) ; consentement « à chaud » discutable |
| Document signé seul | Information complète et tracée | Un consentement générique signé une fois ne couvre pas la réalité de chaque séance (le patient doit pouvoir refuser ce jour-là) |
| **Double niveau** | Information préalable complète (document) + maîtrise séance par séance (activation visible, suspension à tout moment) | Deux objets à gérer — c'est le prix de la solidité |
| Différer tout le volet | Zéro risque | Renonce à un axe validé du concept copilote |

**Décision (utilisateur, 2026-07-15) : double niveau.**
1. **Document d'information signé une fois**, versé au dossier patient :
   finalité (notes structurées de séance), non-conservation de l'audio,
   droit d'accès à la transcription, droit de retrait à tout moment.
2. **Activation explicite à chaque séance**, visible en permanence dans
   l'interface (état de consentement de séance daté), suspension immédiate
   possible par le patient ou le praticien.

**Le gate réglementaire préalable demeure inchangé et bloquant** : cadre
CNIL/RGPD à instruire et valider **avant toute ligne de code** du volet
écoute (campagne SP-AMB, dernière du programme). La décision ci-dessus fixe
la cible produit, pas le calendrier.

## 4. Le Fil du jour : remplace-t-il l'accueil, ou s'y superpose-t-il ?

**La question.** L'accueil praticien actuel (`/dashboard`) est une page de
métriques. Le Fil du jour la remplace-t-il, s'affiche-t-il selon l'heure, ou
vit-il à côté ?

**Options envisagées.**

| Option | Pour | Contre |
|---|---|---|
| **Le Fil devient l'accueil** | La 5.0 visible dès la connexion ; une seule page d'atterrissage ; les métriques survivent en carte | Changement d'habitude pour l'utilisateur |
| Superposition selon l'heure | Contextuel | Imprévisible — on ne sait jamais sur quoi on atterrit ; contraire au principe « rassurant = prévisibilité » |
| Deux vues côte à côte | Zéro risque | La 5.0 reste invisible par défaut — exactement le problème constaté après A5-R1 |

**Décision (utilisateur, 2026-07-15) : le Fil devient l'accueil.**
`/dashboard` s'ouvre sur le Fil du jour ; les métriques actuelles deviennent
une carte du Fil (« le cabinet en un coup d'œil », réutilise
`MetricsSection`). Principe conservé : chaque carte du Fil dit « pourquoi
maintenant » et propose une action explicite — proposition, jamais capture.

## 5. Reprise patient : pack de réévaluation automatique ?

**La question.** Quand un patient revient après une longue interruption,
faut-il proposer un pack de réévaluation ?

**Options envisagées.**

| Option | Pour | Contre |
|---|---|---|
| Aucune automatisation | Simple | Le praticien recompose de mémoire le pack du T0 — la comparabilité inter-épisodes en souffre |
| Proposé, jamais auto-assigné | Un clic, maîtrise praticien | Le pack proposé reste à composer |
| **Proposé + pré-composé** | Le pack reprend les instruments du dernier épisode (même instrument, même version = comparabilité, cf. piste 5 « mémoire longitudinale ») ; toujours un clic praticien pour assigner | Exige la mémoire des épisodes (C2A) |

**Décision (utilisateur, 2026-07-15) : proposé + pré-composé.**
La reprise génère une carte dans le Fil (« [Patient] revient après N mois —
pack de réévaluation prêt, reprenant les instruments du dernier épisode.
Assigner ? »). **Jamais auto-assigné** : l'assignation reste un clic praticien
explicite. Version dégradée avant C2A (SP-FIL LOT-01) : simple signal de
reprise sans pack pré-composé.

## Récapitulatif des conséquences sur les lots

| Décision | Campagne(s) impactée(s) |
|---|---|
| Note de relecture | SP-TT (UI + règle d'affichage) ; C2A (modèle `RelectureNote`) |
| Seuil n ≥ 5 | SP-CAB (constante + état vide explicite) |
| Consentement double niveau | SP-AMB (document + état de séance) ; gate réglementaire préalable inchangé |
| Fil = accueil | SP-FIL (remplace `/dashboard`, métriques en carte, e2e adapté) |
| Reprise pré-composée | SP-SPI + Fil (carte reprise) ; version dégradée sans pack dans SP-FIL LOT-01 |
