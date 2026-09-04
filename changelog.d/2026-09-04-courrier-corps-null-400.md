### Corrigé

- **Courrier biologie : un corps JSON `null` est un 400, plus un 500
  pré-auth.** Le POST `/api/praticien/biologie/proposition/courrier` parsait
  le corps puis accédait à `body.idPatient` sans vérifier que le JSON était un
  objet : `null`, un nombre ou un tableau — du JSON parfaitement valide —
  levaient avant toute session, et le `try` englobant rendait un 500
  fabricable par n'importe quel client anonyme. La garde de forme de la route
  document-patient (le jumeau, PR #848) est reprise à l'identique, banc
  miroir inclus. Relevé par la contre-revue Codex de l'état des lieux du
  rayon biologie (2026-09-04).
