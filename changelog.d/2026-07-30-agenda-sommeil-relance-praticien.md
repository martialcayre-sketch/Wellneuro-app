### Ajouté

- **Agenda du sommeil — relance praticien** (drapeau `WN_AGENDA_RELANCE`, fermé par
  défaut) : un bouton « Relancer ce patient » sur les agendas relançables du panneau de
  suivi, qui envoie un e-mail au clic. **Aucun cron, aucune relance automatique** — la
  frontière du dépôt interdit l'envoi autonome, pas le geste praticien, et les deux
  migrations qui la posent opposent explicitement le cron au clic dans la même phrase.
  Le message ne porte **aucune donnée de santé** (ni l'instrument, ni « sommeil », ni le
  nombre de nuits : un corps unique couvre les trois états relançables), aucun compte à
  rebours et aucune formulation culpabilisante — il pointe la page d'accès habituelle.
  Deux protections distinctes : la contrainte `@@unique([sourceType, sourceId])` de
  `correspondances_patient` réservée **avant** l'envoi (un créneau par agenda et par
  jour, donc pas de doublon même sur double-clic ou instances concurrentes), et un
  plafond de cadence de 3 jours opposable **côté serveur**. Un échec SMTP libère le
  créneau du jour pour que le praticien puisse réessayer. Aucune migration.
