### La synthèse se demande à la fermeture d'un rideau, deux fois par dossier (2026-09-12)

Le Fil rappelait « synthèse à générer » à chaque questionnaire lu sans synthèse
depuis. Sur un dossier qui rend ses questionnaires en plusieurs vagues, la même
demande revenait vague après vague — **49 synthèses pour 16 dossiers en
production, jusqu'à sept sur un seul**. Le geste n'est pourtant pertinent qu'à
deux moments : quand la matière est complète.

**Les deux moments étaient déjà nommés par le domaine**, et le déclencheur n'en
invente aucun : les quatre instruments du rideau `T0` renseignés ([[D-052]]),
puis tout ce qui a été assigné depuis la première synthèse validée rendu
([[D-158]]).

**Ce n'est pas « le pack de base ».** Le pack est une ligne éditable depuis
l'UI — en dériver une règle clinique la ferait déplacer par un geste
administratif. Et `Q_SOM_09` est au pack sans être au rideau : un agenda du
sommeil sur 21 nuits ferait attendre trois semaines une synthèse que le rideau
permet le jour même.

**Il ne franchit que la première des trois portes.** Ce qui est produit est un
`Brouillon_IA` : la validation et l'envoi restent deux gestes du praticien, et ce
sont eux qui atteignent le patient.

**Deux générations par dossier, au maximum.** L'origine s'inscrit dans la trace
d'entrée (`auto_rideau_premier`, `auto_rideau_second`) et ferme le rideau
correspondant. Conséquence assumée : **un brouillon rejeté ne se régénère pas** —
un rejet est une décision, pas une panne.

**Déclenché après la réponse du patient, jamais pendant.** Une génération dure
des dizaines de secondes ; la faire attendre à qui vient de valider son
questionnaire transformerait un service rendu en écran bloqué. Aucun conteneur
neuf n'est nécessaire, et aucun balayage périodique ne repasse sur des dossiers
que rien n'a changés.

**La carte du Fil reste.** 19 dossiers portent des passations, 12 seulement ont
le rideau complet : sept ne déclencheraient jamais rien, et la supprimer les
rendrait invisibles partout — ce qu'elle avait été créée pour empêcher.

Doctrine [[D-174]]. Drapeau `WN_SYNTHESE_PAR_RIDEAU`, **éteint** : son allumage
se demande, avec la mise à jour du registre des traitements.
