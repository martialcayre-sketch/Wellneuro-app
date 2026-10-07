---
id: "LOT-01"
titre: "Déblocage de la saisie d'une nuit — interface pure"
statut: "en_cours (2026-10-07)"
dépend_de: "—"
---

# LOT-01 — Déblocage de la saisie d'une nuit

## But

Supprimer le blocage silencieux en fin de formulaire et les ambiguïtés de
libellé qui ne demandent aucun arbitrage clinique ; rendre les refus serveur
comptables.

## Résultat observable

- Le bouton « C'est noté ✓ » reste actif ; un envoi incomplet nomme ce qui
  manque (« Il reste à renseigner : … »), entoure les questions concernées et
  ramène le focus sur la première. La liste raccourcit à chaque geste.
- La consigne du cadran dit qu'un appui confirme un repère.
- « Confirmer ces horaires : 🌑 hh:mm → 🌅 hh:mm » confirme en un geste les deux
  seules ancres suggérées, **et seulement si elles viennent des nuits du
  patient** (jamais sur les défauts 23:00 / 07:00). Rien d'autre n'est repris.
- L'ordre des repères est vérifié avant l'envoi par la fonction de validation
  du serveur (`ensureNuitReponses`, mode écriture) ; le refus s'affiche sous le
  bouton. Le refus serveur aussi, dans la vue de saisie.
- Libellés : « Vite » → « En moins de 15 min » (même classe `lt15`) ; coucher et
  lever posés « par rapport à votre coucher / réveil » → « Au même moment /
  Plus tard » (sans seuil) ; ancres de qualité et de forme écrites (mots de
  l'aria, inchangés) ; portée de l'aide pour dormir affichée (« Médicament,
  mélatonine ou plante », celle de l'aria) ; « Noter la nuit d'hier » au lieu de
  « Corriger ».
- La route portail du sommeil journalise ses refus (codes `AGENDA_SOMMEIL_*`),
  sans réponse de santé.

## Ce qui ne change pas

Contrat `agenda-sommeil-v3`, classes et bornes, réponses obligatoires,
validation serveur, fenêtre J / J-1, agrégats, barème. Aucune migration.

## Écarté de ce lot

- Repères non croisables sur le cadran : la validation avant envoi suffit à
  rendre le refus visible ; le bornage modulo 1440 du glissement est reporté au
  remplacement du cadran (LOT-03).
- Minutes visibles sur les classes de réveil : arbitrage en attente.
