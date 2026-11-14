### Export PDF du dossier : les résultats de biologie validés et lus (D-519, 2026-11-14)

- **Nouvelle section 5 « Résultats de biologie »**, dans les deux versions de
  l'export. Elle reprend les mesures qui font foi, avec la même élection que
  la fiche du praticien : les fils annulés en sortent, une mesure corrigée y
  figure dans sa dernière version.
- **Lecture exigée.** Une mesure issue d'un import n'y entre que si la
  lecture de l'import est consignée (D-268). Les saisies du praticien y
  entrent toujours. Les mesures écartées faute de lecture sont comptées dans
  une phrase d'alerte.
- **Des faits, aucune interprétation.** Chaque mesure donne la valeur,
  l'unité, la date du prélèvement, l'intervalle imprimé par le laboratoire
  (ou la raison de son absence) et le laboratoire (celui de l'import
  d'origine pour une mesure corrigée). Elle ne donne ni le
  marquage, ni une plage WellNeuro (DC-47), ni une qualification.
- **Version « IA externe ».** Le nom du laboratoire est retiré et les dates
  passent en jours relatifs (D-512). L'intervalle et l'unité sont masqués
  comme tout texte libre. Dans l'intervalle, en plus, les noms des
  laboratoires du dossier sont masqués et les dates en chiffres retirées. Les dates de biologie ne déplacent pas J0.
- **Panneau d'export** : la description et l'aide de la version « IA
  externe » annoncent la biologie, et le retrait du laboratoire.
- **Préambule** : le contenu annonce la section 5. La liste « Non inclus »
  nomme ce qui reste dehors : comptes rendus, commentaires du laboratoire,
  circonstances des prélèvements, résultats non lus.
- **Dossier RGPD** : la sortie est déclarée en rubrique 6, avec l'écart
  d'information du patient, daté et choisi par le responsable (D-519 §6).
- Aucune migration, aucun drapeau, aucune règle clinique ni aucun seuil.
