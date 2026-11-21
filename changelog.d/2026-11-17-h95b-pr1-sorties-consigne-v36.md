### Synthèse : consigne v36, schéma v4, sorties par liste de champs et contrôle de contamination (H95 part B, PR 1 de 2, D-513, 2026-11-17)

Lot de la file B (`h95-b-code`). Première des deux PR du lot de code de
D-513 (découpe tranchée le 2026-11-17, question `20261117-0900-b`). Aucune
migration, rien sous `web/src/lib/clinical/` : aucune `release-db`. **Aucun
résultat de biologie ne part encore au modèle** : le constructeur du bloc et
son drapeau viennent avec la PR 2.

- **Consigne `synthese-v36`** (D-513 §3 et §4) : une section « Résultats de
  biologie » après celle des besoins, et trois retouches de la consigne
  existante, au caractère près du texte validé (le banc
  `promptBiologie.guard.test.ts` compare la section au texte de la décision).
  Sans bloc, la consigne dit de ne pas parler de biologie. Bump assumé et
  déclaré : une synthèse rédigée sous v35 ne recevait aucune biologie.
- **Schéma `synthese-json-v4`** (§6) : deux champs exigés,
  `resume_biologie_praticien` et `points_de_vigilance_biologie`, vides sans
  restitution. Le contrat de sortie annoncé au modèle les décrit ; texte
  validé mot pour mot le 2026-11-17 (question `20261117-0901-b`). Le cockpit
  les affiche, en lecture seule, sous « Biologie — réservé au praticien ».
- **Sorties par liste de champs autorisés** (§5, §7) : document au médecin
  (aperçu, impression, donc téléchargement au portail), export du dossier
  (versions complète et IA externe, projection AVANT le masquage) et appel
  de priorité. Aucune ne nomme les deux champs biologiques.
- **Contrôle de contamination** (§5) : une valeur du bloc suivie de son
  unité, ou le texte d'un intervalle du bloc, relevé dans l'un des six champs
  ordinaires (`limites` compris) rend la synthèse suspecte. Sa validation et
  ses sorties sont refusées, motif affiché au praticien, ligne de journal
  `SYNTHESE_IA.BIOLOGIE_HORS_CHAMPS` (synthèse, champ, code, jamais le
  texte). Une trace qui porte un bloc sous un schéma antérieur à v4 est
  bloquée. Sans bloc dans la trace, rien n'est jamais bloqué : c'est l'état
  de toutes les synthèses tant que la PR 2 n'est pas livrée et son drapeau
  posé.
- **`limites` éditable** dans l'éditeur existant, pour un brouillon IA.
- **Consigne de priorité `priorite-v2`** (§7) : une règle ajoutée, validée mot
  pour mot le 2026-11-17 ; aucune reprise de biologie.
