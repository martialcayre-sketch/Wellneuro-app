### Le refus du patient cesse d'être un indicateur : il ferme le courrier, et le portail dit enfin le vrai (2026-09-17)

Deux amendements, aucune décision neuve : `D-222` §3 ferme ses trois réserves — et
une quatrième pièce qu'il n'avait pas vue —, `D-219` §3 est **renversé**.

**LA PROMESSE ÉTAIT CREUSE DEPUIS HUIT VERSIONS.** « Aucun partage avec un tiers
(par exemple votre médecin traitant) n'a lieu sans un choix explicite de votre
part » était écrite depuis la v1 du 2026-07-16 et reprise par composition dans les
sept versions suivantes. Le logiciel ne la tenait pas : un praticien pouvait
préparer un courrier et consigner un échange sur un dossier dont le patient avait
refusé le partage. `D-222` l'avait nommée sans la toucher, en écrivant que dégrader
une promesse patient « n'appartient pas à une session ».

**LE RESPONSABLE A PRIS LES DEUX BOUTS.** Le texte vient au logiciel **et** le
logiciel vient au texte. Une garde ferme désormais deux chemins — la génération du
courrier de biologie et la consignation à la main, dans les deux sens —, et le
texte publié nomme la seule exception qui subsiste.

**LE SILENCE FERME AUSSI**, et c'est la moitié de l'arbitrage : l'absence de choix
n'est pas un accord. Sa contrepartie est livrée avec : l'écran praticien dit
« consentement jamais exprimé » et donne le chemin pour le recueillir — un blocage
sans issue serait un mur.

**CE QUI RESTE OUVERT, ET QUI EST NOMMÉ AU PATIENT** : la lettre d'adressage sur
signal d'alerte. Fermer là serait fermer au moment précis où un signe repéré suspend
la décision clinique. Le discriminant est **la route, jamais le destinataire** —
`medecinLibelle` est du texte libre sur tous les chemins d'écriture, sans aucun
rattachement à `medecinTraitantNom`.

**QUATRE TEXTES PATIENT CHANGENT.** `donnees_confidentialite@v9` (accusé exigé),
`consentement_suivi@v3` (les consentements v2 restent valides), l'écran 3 de la
séquence « Avant de commencer » — dont la prose en dur portait la phrase fausse que
le bouton faisait **accuser réception** —, et l'effet du refus de « Mes choix ».

**DEUX DÉFAUTS TROUVÉS SANS LES CHERCHER.** La table des libellés de partage portait
la clé `accepte` quand le statut servi est `accorde` : un patient consentant
n'affichait **rien du tout**, ni ce libellé ni la ligne du silence. Et la formulation
des choix vivait en dur dans l'écran, sans version — c'est le trou de `D-222` §3, et
il est fermé par `trust_choice_events.formulation_version`, colonne nullable dont
l'écriture attend son drapeau.

**CE QUE LE RENVERSEMENT COÛTE, ET QUI EST ASSUMÉ** : un partage qui a lieu hors
application ne disparaît pas parce que le logiciel refuse de l'enregistrer — il
devient invisible au dossier **et** au registre RGPD. Le motif de 2026-07-22 n'était
pas faux ; il est payé, pas contourné.
