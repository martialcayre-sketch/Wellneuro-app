### Sécurité

- **E-mails patients — le motif de consultation n'y figure plus** (audit
  migration HDS, correctif immédiat n° 2). `sendPortailLinkEmail` n'insère
  plus « Motif de votre consultation : … » dans l'e-mail d'ouverture d'accès —
  une donnée de santé n'a pas sa place dans un canal non maîtrisé. Le motif
  reste en base (`consultations.motif`), visible du praticien. Test verrouillé
  drapeau G5 éteint comme actif.
