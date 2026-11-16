### J2-base : NF-7, le drapeau de la déclaration « question sur le suicide » est retiré (H59, D-528, 2026-11-16)

Lot de la file A, sans migration et sans release-db. Il fait ce que la
réponse 20261111-0029-a prévoyait : une fois le CHECK « valide ⇒ déclaré »
posé, le drapeau `WN_ENABLE_DECLARATION_SUICIDE_CAB` se retire. Le drapeau
était allumé en production depuis le 2026-11-15 : ce qu'elle sert ne change
pas.

- Publier un instrument du cabinet exige toujours la déclaration. Sans elle,
  la publication est refusée avec un motif lisible (400), avant toute
  écriture.
- Modifier les questions d'un instrument efface toujours sa déclaration. La
  ligne est verrouillée, et les envois sont recomptés sous ce verrou. Une
  déclaration périmée ne peut plus suivre des questions nouvelles.
- L'envoi copie toujours la déclaration et la désignation. La règle de
  sécurité `SAF-QUEST-02`, la carte du Fil, la lettre, le message au
  patient, le courriel et l'encart d'urgence lisent cette copie, sans
  condition de drapeau. Leur signature et leurs textes ne changent pas.
- Le geste « Déclarer » et le motif « Déclaration requise avant un nouvel
  envoi » sont retirés : un instrument publié est toujours déclaré, et la
  base le garantit.
- Il n'y a plus d'extinction par variable d'environnement. Une extinction
  passe par un lot de code déployé (D-528, qui amende D-522 §3-§4 et D-515
  §6).
