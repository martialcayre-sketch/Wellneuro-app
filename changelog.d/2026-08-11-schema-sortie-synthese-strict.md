### Corrigé

- **Une synthèse IA hors format n'est plus servie dégradée.** La sortie du
  modèle était lue par une fonction qui ne rejetait rien : elle remplaçait un
  champ manquant par un texte de substitution, acceptait une chaîne vide comme
  un narratif, et castait la liste des axes prioritaires **sans jamais regarder
  son contenu** — un `niveau_priorite` inventé par le modèle arrivait donc
  jusqu'à l'écran praticien, avec une valeur que l'interface ne sait pas rendre.
  Les clés inconnues, elles, étaient jetées en silence : un champ `diagnostic`
  produit à tort disparaissait sans laisser de trace, au lieu d'alerter.
  La sortie est désormais lue par un **schéma fermé à énumérations contrôlées**
  (LOT-01 de la campagne chaîne T0, étape 4).

### Ajouté

- **Rejet puis UNE relance, jamais deux.** Une sortie non conforme est rejetée,
  et le modèle est relancé une fois en se voyant nommer les champs fautifs. Si
  la relance échoue à son tour, **rien n'est enregistré et rien n'est servi** :
  une synthèse absente est un état honnête, une synthèse dégradée ne l'est pas.
- **Les violations transmises sont structurelles, jamais du contenu.** Elles
  nomment un champ et ce qui manque, jamais ce que le modèle a écrit — elles
  partent au journal et dans la relance, et y recopier la prose exfiltrerait du
  contenu clinique vers les logs. Un banc l'éprouve.
- **Deux codes d'événement distincts** : rejet suivi d'une relance, et échec de
  la relance. Les confondre avec l'échec de génération masquerait le taux de
  non-conformité, qui est précisément ce qu'il faut mesurer avant de toucher au
  prompt.
- **Les métriques cumulent les deux appels.** Ne compter que le dernier ferait
  disparaître le coût d'une relance des tableaux de bord, au moment même où les
  rejets se multiplieraient.

### Inchangé — et délibérément

- **La lecture des synthèses déjà persistées reste tolérante.** Le bilan patient
  projette du JSONB écrit sous des schémas antérieurs : durcir cette lecture-là
  ferait échouer l'affichage de bilans existants pour un défaut qu'aucune
  relance ne peut plus corriger, la donnée étant écrite. Strict à l'entrée,
  tolérant à la relecture — et jamais l'inverse.
- **Le prompt système n'est pas touché.** La relance passe par un tour
  utilisateur, donc la garde d'empreinte reste valide et aucun bump de version
  de prompt n'est dû à cette étape.
