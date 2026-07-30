### Certification — déclaration de droits sur huit instruments, et quatre montées

- **Huit instruments sortent de `licence_requise`** (Epworth, HAD, HIT-6, Conners
  enseignant et parent, MMSE GRECO, EORTC QLQ-C30 et QLQ-BR23) par **décision du
  praticien-propriétaire du 2026-07-30**, prise en connaissance des réserves et
  contre l'avis consigné de l'assistant. La réserve nommant l'ayant droit **n'est
  pas effacée** : elle est conservée verbatim sous la déclaration, derrière le
  marqueur `RÉSERVE CONSERVÉE`. Déclarer n'est pas obtenir, et le registre doit
  continuer à dire les deux.
- **Quatre instruments montent à `scoring_verifie`** — Q_SOM_09 (agenda de sommeil
  WellNeuro : il ne manquait qu'une date de vérification des droits), Q_NEU_11,
  Q_SOM_02 et Q_INF_04, tous à zéro divergence critique. Total : **51 sur 64**.
- **Verdicts re-datés au 2026-07-30** par un passage `certify --recomparer` **hors
  ligne** (aucun appel de modèle) : le verdict d'un instrument dont le scoring a
  changé depuis ne vaut rien, et Q_SOM_02 avait justement été modifié la veille du
  verdict qu'il portait.
- **La garde `droitsAssignabilite` a changé de prédicat, pas de fonction.** Elle
  lisait `droits.statut === 'licence_requise'` ; la déclaration en bloc vidait sa
  population et l'aurait laissée verte en ayant cessé de regarder. C'est son propre
  test d'anti-vacuité qui l'a signalé. Elle lit désormais la **réserve conservée**,
  ce qui garde exactement la même classe d'instruments — ceux dont le droit d'usage
  surmonte une réserve non levée. Preuve par mutation : rouvrir le MMSE le fait
  rougir avec « EXPOSÉS SANS DÉCISION : Q_GEO_04 ».

**Ce qui n'est PAS couvert** : les cinq instruments dont les droits sont déclarés
mais qui restent suspendus (Conners ×2, MMSE, EORTC ×2) ne sont pas rouverts ici ;
aucune valeur servie ne change dans ce lot.
