### La discordance rythme déclaré vs observé, drapeau directionnel praticien (LOT-01, D-040)

Le rythme alimentaire **déclaré** (`RYTHME_CHRONO` de `Q_ALI_01`, items
SIIN53/54/55) se confronte désormais au rythme **observé** par l'agenda
clôturé au LOT-00. La forme est arrêtée par **D-040** : un drapeau
**directionnel de sur-déclaration**, praticien-only, sur trois axes — jeûne
nocturne, protéines au petit-déjeuner, repas du soir léger. Un axe ne se lève
que si le patient **déclare favorable** et l'agenda **observe défavorable** ;
un patient lucide sur son défaut n'est jamais signalé.

**Aucun score, aucun indice, aucun taux chiffré**, et **aucune réalimentation
du besoin 3** de Mon Équilibre : `RYTHME_CHRONO` déclaré en reste l'unique
source, le piège de la double mesure (`RYTHME_ALIMENTAIRE`/10 vs
`RYTHME_CHRONO`/7) reste fermé. La lecture est une aide praticien **à côté** du
besoin, jamais dedans.

**`null`, jamais 0.** Sous la forme courte de `Q_ALI_01` (`WN_ALI_01_SIIN57`
éteint) `MAX_RYTHME_CHRONO` vaut 0 : la lecture s'effondre en « non mesurable »
pour toute entrée. Par axe, un agrégat observé absent (couverture d'agenda
insuffisante) ou un item déclaré manquant rend cet axe « non mesurable », jamais
un drapeau ni un « concordant ». Les seuils : jeûne 600 min (de la **source**,
barème `SIIN54 {min:10}`), protéines < 4 j/7, soir > 3 j/7.

La lecture ne paraît que sur un agenda **clôturé** (D-040 confronte le déclaré
à l'observé de l'agenda clôturé, pas à des agrégats partiels d'un recueil en
cours) — comme la consolidation du LOT-00, c'est la clôture qui fait l'observé.

**Sans nouvelle API ni migration.** La fiche patient extrait le rythme déclaré
de la dernière passation `Q_ALI_01` des `rawAnswers` déjà chargés
(`/api/praticien/reponses`) — extraction confiée à une fonction pure gardée par
son propre banc — et le passe en prop additive au panneau agenda, qui ne rend
que les axes en sur-déclaration : rappel déclaré/observé, jamais un chiffre
d'écart, dans la frontière de campagne du panneau (aucun score/indice/gramme/
kcal). La fonction de discordance est pure et déterministe ; ses seuils sont
figés par valeur littérale (une dérive clinique rougit le banc) et ses deux
specs neufs, dont le verdict dépend de la forme servie, sont inscrits à
`test:court14` et joués dans les deux positions du drapeau (D-033).
