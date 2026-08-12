### Décidé

- **Les trois arbitrages cliniques laissés ouverts par la table de
  contradictions sont rendus** (`D-048`), et le palier de test E2E change
  temporairement d'autorité (`D-049`). Le LOT-01 était à l'arrêt sur ces quatre
  points depuis le 2026-08-11.

### Ajouté

- **La valeur `importance` de la règle C-STR porte enfin son motif.** Elle
  était restée **nue** dans la table : aucun commentaire, absente de `D-041`,
  `D-042`, `D-046` et du dossier de règles candidates. Le défaut était
  l'absence de justification, pas la valeur — `useful_not_urgent` est
  confirmée, et le fichier dit maintenant pourquoi les deux autres valeurs sont
  écartées : `critical_for_decision` parce que le libellé praticien est
  « Critique pour décider » et qu'un constat ne bloque aucune décision — et
  parce que hisser au plus haut un signal non sécuritaire brouillerait la
  hiérarchie que `DC-23` protège ; `optional` parce que la règle prescrit
  elle-même une clarification en entretien.

### Inchangé — et c'est le point

- **`CONTRADICTIONS_RULES_SHA256` ne bouge pas.** Seul un commentaire s'ajoute ;
  aucune valeur de la table n'est touchée, donc l'empreinte des règles signées
  reste identique. Une justification qui aurait déplacé l'empreinte aurait été
  une modification clinique déguisée en documentation.

### Décidé — ce qui ne sera pas fait

- **Aucune fenêtre temporelle** entre les deux passations comparées. Aucune
  source ne donne de durée de validité croisée entre `Q_MOD_01` et le DASS-21 ;
  `DC-19` nomme explicitement les « fenêtres temporelles » parmi les chiffres
  exigeant une provenance, et `DC-30` interdit de taire une discordance parce
  qu'elle serait ancienne. Le constat portera l'écart au lieu de s'en servir
  pour se taire.
- **Aucune fusion des sorties C-STR et `R2-STR-01` à l'écran.** L'une propose
  une mesure (le PSS-10), l'autre nomme une contradiction entre deux mesures
  déjà faites ; supprimer l'une ferait perdre l'un des deux signaux.
- **Aucun `retries` Playwright, aucune montée de version sur supposition**
  (`D-049`). Un réessai transformerait le blocage navigateur en succès
  silencieux et emporterait avec lui les vrais échecs intermittents.
