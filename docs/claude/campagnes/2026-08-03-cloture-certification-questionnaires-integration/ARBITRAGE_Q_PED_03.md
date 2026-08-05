# Arbitrage Q_PED_03 — maintien de la suspension

Date d'arbitrage : 2026-08-03.

## Décision

`Q_PED_03` reste `suspendu`.

Le lot ne rouvre ni le questionnaire, ni son aperçu praticien, ni son scoring
comme certification promue. Il formalise que la somme brute `/324` reste un
comportement interne hérité, non suffisant pour une réactivation clinique.

## Ce qui est établi

- Le servi porte **108 items scorés** et une somme brute stable `/324`.
- Le banc a bien tourné le 2026-08-01 ; la fermeture ne vient donc plus d'un
  échec d'outillage.
- La route d'assignation est fermée (`actif: false`).
- L'aperçu praticien refuse déjà l'instrument comme `suspendu` et hors
  consultation.

## Ce qui bloque la réouverture

- La source distingue **4 dimensions**, dont **2 échelles de validité**
  (`Positive Impression`, `Negative Impression`), quand le servi n'en calcule
  aucune.
- Aucun seuil ni aucune bande d'interprétation de la source n'est servi.
- L'arbitrage praticien du 2026-08-01 exclut explicitement une réouverture sur
  simple somme brute.

## Conséquence

- La somme brute reste disponible comme comportement interne stable, afin de ne
  pas casser le catalogue ni le banc de non-régression.
- Elle n'est plus promue comme `certifie` dans le scoring servi.
- Le produit continue de traiter `Q_PED_03` comme instrument suspendu, fermé à
  l'assignation et absent des surfaces d'usage.

## Condition de sortie future

La réouverture exigera un scoring dimensionnel complet aligné sur la source,
avec ses échelles de validité et une reprise de l'échelle de certification à
`repere`.
