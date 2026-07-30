### Certification — déclaration de droits sur huit instruments, et trois montées

- **Huit instruments sortent de `licence_requise`** (Epworth, HAD, HIT-6, Conners
  enseignant et parent, MMSE GRECO, EORTC QLQ-C30 et QLQ-BR23) par **décision du
  praticien-propriétaire du 2026-07-30**, prise en connaissance des réserves et
  contre l'avis consigné de l'assistant. La réserve nommant l'ayant droit **n'est
  pas effacée** : elle est conservée verbatim sous la déclaration, derrière le
  marqueur `RÉSERVE CONSERVÉE`. Déclarer n'est pas obtenir, et le registre doit
  continuer à dire les deux.
- **Trois instruments montent à `scoring_verifie`** — Q_NEU_11, Q_SOM_02 et
  Q_INF_04, tous à zéro divergence critique **confirmée par les deux lectures** du
  banc. Total : **50 sur 64**. Pour HAD, la ligne de synthèse d'une lecture isolée
  conclut l'inverse ; le registre dit désormais d'où vient le zéro et sur quoi la
  montée s'appuie.
- **Q_SOM_09 n'est PAS monté, et c'est la correction la plus importante du lot.**
  Il l'avait été, sur un verdict qui ne mesure rien : les deux lectures du banc
  rendent zéro item et zéro seuil — le « 0 divergence critique » disait qu'aucune
  source n'avait été lue, pas que le servi lui correspondait. Une revendication
  d'originalité (« aucune œuvre tierce n'est reproduite… vérifié le 2026-07-30 »)
  avait été écrite dans la foulée, sans pièce, et contredite par le seul artefact
  au dossier — WN-SRC-0420, un document SIIN que la lecture C identifie. Elle est
  retirée, la source rattachée, et l'instrument redescendu à `droits_verifies`.
  Un banc qui se tait n'est pas un banc qui approuve.
- **Verdicts re-datés au 2026-07-30 pour ces trois instruments seulement**, après
  un passage `certify --recomparer` **hors ligne** (aucun appel de modèle) : le
  verdict d'un instrument dont le scoring a changé depuis ne vaut rien, et Q_SOM_02
  avait été modifié le jour même, *après* le verdict qu'il portait. **Réserve : 47
  verdicts restent datés du 2026-07-29**, dont celui du QDRS (`Q_GEO_05`) dont la
  grille entière a été réécrite le 2026-07-30. Le rejeu est fait et gratuit ; la
  garde qui relierait la date d'un verdict à la dernière modification de son
  scoring reste à écrire, et elle est nommée dans les réserves de la campagne.
- **La garde `droitsAssignabilite` s'est vue AJOUTER un prédicat, pas remplacer le
  sien.** Première rédaction : elle lisait le marqueur de réserve à la place de
  `droits.statut`, ce qui la faisait cesser de surveiller sa valeur canonique —
  la prochaine instruction concluant « licence requise » aurait repris le gabarit
  de la veille, sans le marqueur, et l'instrument serait devenu assignable en
  silence. La revue adversariale l'a attrapé. Elle lit désormais **`licence_requise`
  ou `restreint` OU le marqueur**, et sa population de huit est **épinglée** plutôt
  que comptée : le marqueur vit dans du texte libre qu'une réécriture peut emporter.
  Deux preuves par mutation : rouvrir le MMSE, et reposer un `licence_requise` sans
  marqueur, la font rougir chacune.

**Ce qui n'est PAS couvert** : les cinq instruments dont les droits sont déclarés
mais qui restent suspendus (Conners ×2, MMSE, EORTC ×2) ne sont pas rouverts ici ;
aucune valeur servie ne change dans ce lot.
