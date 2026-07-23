### SP-CONV LOT-05 — Jardin : « Mon carnet alimentaire », équilibre qualitatif, cibles 44 px (2026-07-23)

Réouverture d'A7 actée (décision utilisateur du 2026-07-22, amendement daté
du registre sur place, proposition d'adaptation dédiée) : « Ma spirale
alimentaire » devient **« Mon carnet alimentaire »** — le mot Spirale est
réservé à la trajectoire globale du parcours ; seul le nom de surface
change, les trois régimes et politiques A7 sont intacts. « Mon équilibre »
achève la doctrine « construction, jamais dégradation » : la frise en
barres proportionnelles (score masqué mais dessiné) devient des repères
temporels identiques ; « En baisse depuis votre dernier bilan » devient
« Des repères ont évolué — votre praticien les regarde avec vous » ;
« Vos priorités » (tri automatique) devient « Points à explorer avec votre
praticien ». Accessibilité : fermeture de l'aperçu patient 36 → 44 px,
variante `danger-text` de PatientButton dotée d'une hauteur minimale,
boutons Retour de Mon équilibre à 44 px. Les brouillons de questionnaires
expirent désormais à 30 jours (aligné wizard ; un brouillon sans date
prouvée n'est jamais détruit). `MetricsSection` (démontée par V14, code
mort) est supprimée avec son test.
