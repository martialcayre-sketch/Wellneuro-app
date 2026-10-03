### Adressages sur signal d'alerte : la table de couverture (`D-257`, LOT-02) (2026-10-02)

Migration seule `adressages_signal_alerte_v1` : une table en ajout seul qui
enregistre, pour une lettre d'adressage consignée, les constats de sécurité
d'anamnèse qu'elle couvre et la consultation porteuse — ou la révocation d'une
telle couverture. La base refuse toute couverture qui ne viendrait pas d'une
lettre d'adressage sortante de ce dossier consignée dans la même transaction,
de la consultation porteuse du dossier, ou qui viserait un constat d'effet
indésirable ; une lettre ne couvre
qu'une fois, un adressage ne se révoque qu'une fois, avec un motif. UPDATE et
TRUNCATE refusés, RLS deny-all, effacement nommé du dossier étendu, table
déclarée en rubrique 5 du registre RGPD. Contrat négatif au CI (dix-sept
promesses, 48 mutants tués). **Aucun code n'écrit ni ne lit encore la table** :
l'écriture à la consignation de la lettre (LOT-03) n'arrive qu'après
l'application constatée par conteneur.
