### J2-base : NF-7 lot 3, un instrument du cabinet non déclaré ne part plus, geste « Déclarer », envoi sous verrou (H59, 2026-11-12)

Sans migration, file A, sur demande explicite du responsable. Tout reste
derrière `WN_ENABLE_DECLARATION_SUICIDE_CAB`, éteint : drapeau éteint, la
bibliothèque, la file et l'envoi restent ceux d'aujourd'hui, et les bancs le
tiennent. Aucune D-xxx : D-303, amendée par D-493, et les arbitrages du
2026-11-12 (P2-1, P2-3, P2-4) font foi.

- **Non déclaré, non envoyable (P2-1).** Drapeau allumé, un instrument publié
  sans déclaration reste visible mais ne s'ajoute plus à la file. Dans un
  brouillon, il apparaît « Indisponible ». L'écran affiche « Déclaration
  requise avant un nouvel envoi ».
- **Geste « Déclarer ».** Il recueille la déclaration d'un instrument déjà
  publié, sans toucher à ses questions ni à son statut. La validation est
  celle de la publication. Sans migration ni reprise en base ; seule la
  déclaration est enregistrée par l'application.
- **Envoi sous verrou (P2-3).** L'éligibilité et la déclaration copiée sur
  l'assignation se lisent sous un verrou de ligne tenu jusqu'au commit. Une
  publication, une modification ou une désactivation concurrente attend la
  fin de l'envoi. Un instrument devenu inéligible est écarté avec sa trace.
  Une modification des questions recompte les envois en cours sous son propre
  verrou : un envoi ne peut plus se glisser entre le comptage et l'écriture.
  Une modification du seul titre, du domaine ou de la description ne
  réécrit plus les questions ni la grille : elle ne peut plus réinstaller un
  contenu remplacé entre-temps (passe Codex).
- **Message de « Relire la grille » (P2-4).** Quand un questionnaire déclaré
  « oui » ne propose aucune réponse au choix, le texte validé par le
  responsable s'affiche. Il rappelle que la déclaration décrit le contenu réel
  du questionnaire, et que répondre « Non » pour publier laisserait le patient
  sans encart d'urgence. « Déclarer » en affiche une variante qui parle
  d'envoi, validée le même jour.
