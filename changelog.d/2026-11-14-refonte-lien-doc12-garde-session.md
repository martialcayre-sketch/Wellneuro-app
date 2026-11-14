### Refonte Lien, DOC-12 : garde serveur du dossier de la page, T-51 et numéros d'urgence sous le refus sur U40, sans code (2026-11-14)

Le responsable tranche le préalable de Q2a et Q3a de PAT-6 et son cadrage,
en retenant l'option recommandée de chaque question : Q8 a, Q9 a, Q10 a,
Q11 a.

- D-481 : complément DOC-12.
  - Les cinq routes d'écriture du portail refuseront en 409, sans rien
    écrire ni notifier, un segment de page qui n'est pas l'`idPatient` de la
    session. Les refus 401 et 403 sont inchangés.
  - Une page ouverte sous un autre segment renverra à l'entrée, sans texte.
  - Un signalement refusé sur U40 n'est ni orienté ni transmis.
  - Réception : tests de route, E2E de changement de compte, revue de
    sécurité.
- D-488 : amendement DOC-12.
  - T-51 « Rien n’a été envoyé : cette page a été ouverte sous un autre
    compte. Rechargez-la pour continuer. », sous le geste refusé.
  - Sur U40 seul, la mention de sécurité existante, inchangée, sous T-51.
- Registre des textes (§2.10 et récapitulatif) et `plan-patient.md` (PAT-6)
  raccordés.

Aucun code, route, drapeau, schéma ni règle clinique ou d'orientation
modifié. Le lot `garde-portail-dossier-session` applique ces choix avant
Q2a et Q3a.
