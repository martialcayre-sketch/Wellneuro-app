### t41 : la re-passation ciblée atteignable au jalon dû (LOT-07, D-058, D-338 §3, 2026-10-24)

- Le défaut (relevé par CodeRabbit sur #1655, routé vers t41 le 2026-10-23) :
  au jalon dû, l'écran demande la proposition du jalon, la route cockpit rend
  `proposal_required` et `decisionCard` est nul. La re-passation ciblée ne
  recevait ni les `needIds` du candidat visé (depuis LOT-07) ni les besoins
  visés d'une priorité posée (t39) : elle était inatteignable là où elle sert.
- `web/src/app/api/praticien/cockpit/route.ts` : sur un jalon de MESURE, en
  lecture présente, la réponse `proposal_required` joint `repassationAncre`
  (`needIds`, `besoinsVises`), tirés de la carte REJOUÉE de l'épisode
  confirmé de l'ancre du cycle courant — même chemin que l'écran de l'ancre :
  proposition de l'ancre, épisode persisté, `lireSelectionPriorite` et le
  repli `construireChaineC1Tolerante` (une sélection devenue inapplicable est
  écartée, la cible retombe sur la priorité proposée). La proposition doit
  désigner la ligne même de `ancreCourante`. Tout échec rend l'absence du
  champ, jamais une erreur de la proposition. Le rejeu est factorisé
  (`episodePersisteRejouable`, `rejouerChaine`) entre la carte du jalon et
  cette cible : deux rejeux divergeraient sur la sélection servie. Les ancres
  sont lues une seule fois pour la proposition du jalon et pour la cible
  (revue `wn-reviewer`, P2).
- Limite nommée par la revue (P1, héritée du rejeu D-118, pas une
  régression) : l'ancre d'un cycle rouvert (`T1`, `T2`…) se date sur la
  réponse la plus récente ; une passation postérieure à sa confirmation la
  rend non rejouable, à l'écran de l'ancre comme pour la cible, qui manque
  alors comme avant t41. Un banc la fige ; le défaut se traite dans le rejeu.
- `web/src/lib/protocol/repassationCiblee.ts` : `besoinsDeRepassation`, la
  dérivation unique (candidat sélectionné, à défaut proposé ; besoins visés
  d'une priorité posée), lue par l'écran et par la route.
- `ClinicalRuntimeSection.tsx` : sans carte et sur `proposal_required`, la
  re-passation lit `repassationAncre` ; sinon la carte affichée, comme avant.
  Ni la hiérarchie des assiettes, ni la sélection, ni le protocole ne lisent
  ce champ.
- Rien de clinique de plus : aucune règle, aucun seuil, aucun besoin nouveau ;
  la correspondance besoin → questionnaires reste `BESOIN_SOURCES`. Aucune
  migration.
