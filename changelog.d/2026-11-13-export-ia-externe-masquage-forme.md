### Export pseudonymisé : e-mails, téléphones et NIR de tiers masqués, suspension des envois dite, version au journal (revue de sécurité du 2026-11-12, lot du 2026-11-13)

Lot de correction décidé par le responsable sur la revue de sécurité de l'export « Pour une IA externe
(pseudonymisée) » ([[D-252]]) : P0-1, P1-1 et P2-1, sans décision nouvelle. Aucune migration, aucun changement
clinique. P1-2 (identifiant du dossier) et P1-3 (âge, dates, lieux, profession) attendent un arbitrage.

- P1-1 : les textes libres de l’export pseudonymisé masquent, par leur forme et quel que soit leur titulaire, les
  formes courantes des adresses e-mail, des numéros de téléphone français (séparateurs mêlés et groupements
  irréguliers compris) et des NIR (13 ou 15 chiffres, 2A et 2B compris, clé non
  vérifiée). Jusqu'ici, seules les valeurs du dossier lui-même l'étaient : le contact d'un proche ou un NIR saisi en
  texte libre passaient en clair. Une date suivie d'une heure n'est pas prise pour un numéro. Le corpus du masqueur
  reçoit les cas correspondants, dans les deux sens. Le préambule du PDF le dit.
- P0-1 : la suspension des envois à ChatGPT ([[D-449]] §3) est dite dans le tiroir d'export et dans le préambule
  du PDF : « suspendu depuis le 5 novembre 2026 ». Le texte la dit, il ne la tient pas ; l'export reste
  téléchargeable dans ses deux versions.
- P2-1 : le journal des accès (G-TRUST-04) écrit la version exportée dans son gabarit de route
  (`/api/praticien/export-dossier?version=ia-externe` ou `?version=complete`) : un export complet se retrouve.
- Contre-revue Codex : une date n'excuse plus un numéro que si elle est valide (mois de 01 à 12) et suivie d'une heure
  valide ; « 06 98 2024 32 » passait en clair. Une date à année sur deux chiffres suivie d'une heure, indiscernable
  d'un numéro, reste masquée.
- Registre RGPD : le risque « NIR en texte libre non masqué » est levé ; la sortie de l'export est précisée.
