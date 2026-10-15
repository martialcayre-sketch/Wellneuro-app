### CC-8 : l'espèce `protocole` entre dans les lectures du portail — migration seule (D-315)

- Migration `20261016080000_portail_lectures_protocole_v1` : le CHECK de
  `portail_lectures_patient` admet `protocole`, en une seule instruction ; la
  nouvelle liste contient l'ancienne. Aucune colonne, aucune date, aucune
  ligne écrite.
- Contrat `portail_lectures_protocole_v1_negatif.sql` au CI : une lecture par
  diffusion, doublon refusé ; les quatre espèces d'avant acceptées ;
  « accueil », « connexion », la casse et un suffixe refusés ; contrainte
  validée sur l'existant (pas `NOT VALID`).
- `schema.prisma` : commentaires du modèle `PortailLecturePatient` seuls.
- Le code qui écrit l'espèce (détail replié à l'accueil, écrivain,
  vérification serveur) part dans une seconde PR, après la release-db
  constatée ; il se sert avec ACT-1.
