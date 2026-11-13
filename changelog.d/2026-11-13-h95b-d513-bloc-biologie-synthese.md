### H95 part B — D-513 : la synthèse IA recevra les résultats de biologie, sans interprétation ajoutée (2026-11-13)

Décision acceptée, sans code : un bloc déterministe transmettra au modèle
chaque résultat de biologie du dossier, par analyte et en série, avec
l'intervalle imprimé attribué au laboratoire, le laboratoire et le contexte
de prélèvement tel que recueilli. Ni marquage, ni plage fonctionnelle, ni
seuil Wellneuro, ni position face à l'intervalle. La restitution biologique
ira dans deux champs dédiés (`resume_biologie_praticien`,
`points_de_vigilance_biologie`, schéma `synthese-json-v4`), réservés au
cockpit praticien et exclus, par liste blanche, du document au médecin, du
téléchargement au portail, des deux exports et de l'appel de priorité. Un
contrôle de contamination bloque une synthèse dont un champ ordinaire
recopie une forme biologique. Le texte patient ne dira que la réception d'un
bilan daté. Consigne `synthese-v35` ; amende D-266 §4 (R5) et D-331 §6. Le
flux vers l'IA sera déclaré au dossier RGPD, dans « Vos données
personnelles » et dans les conditions d'utilisation avant son ouverture.
Le lot de code passera par `release-db` (constructeur sous
`web/src/lib/clinical/`), sans migration.
