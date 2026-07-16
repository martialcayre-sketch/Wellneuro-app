# Audit authentification, partages et notifications — TRUST LOT-06

> Audit documentaire du 2026-07-16 (aucun changement d'authentification —
> frontière du cadrage : la refonte magic link/passkeys est la campagne IDP).

## Modèle d'accès patient actuel (constaté)

- **Invitation** : lien portail `/portail/[token]` envoyé par email
  (`sendAssignmentEmail`), token non prédictible porté par
  `Patient.accessToken`.
- **Second facteur** : confirmation de l'email pré-enregistré
  (`POST /api/portail/session`) → cookie de session signé (`wn_portail`,
  `signPatientSession`, secret `NEXTAUTH_SECRET`).
- **Liaison session ↔ token** : `resolvePortailPatientFromSession` vérifie
  patient actif, token non révoqué, correspondance idPatient/email/token.
  Les routes TRUST utilisent cette même chaîne (jamais d'email en query).
- **Révocation** : `accessTokenRevoked` coupe l'accès (vérifié à chaque
  résolution). Pas d'expiration automatique du token ; pas d'historique de
  connexions.

## Menaces documentées (V1)

| Menace | État | Mitigation actuelle | Reste à faire (IDP) |
|---|---|---|---|
| Lien transféré à un tiers | partielle | second facteur email ; le lien seul ne suffit pas | expiration, magic link à usage court |
| Email compromis | non couverte | — | second facteur réel (passkey) |
| Appareil partagé/perdu | partielle | brouillons locaux avec TTL ; signalement « appareil perdu » (TRUST) → révocation manuelle praticien | déconnexion à distance, sessions listées |
| Connexion non reconnue | détection par le patient | signalement TRUST `connexion_non_reconnue` + file praticien | journal de connexions consultable |
| Ré-accès après révocation | couverte | `accessTokenRevoked` vérifié à chaque requête | — |
| Multi-praticien | sans objet (mono-praticien) | OAuth restreint `@wellneuro.fr` | isolation par praticien avant toute ouverture (G-TRUST-04) |

## Notifications externes (décision 13)

| Email | Contenu | Verdict |
|---|---|---|
| Assignation questionnaire | titre d'instrument + lien | générique, titre toléré (consigné en dette) |
| Accusé de réception | générique | conforme |
| Notification signalement TRUST (nouveau) | générique, zéro détail | conforme par construction |
| Booklet | **contenu de santé complet en HTML** | exception assumée, chaîne validation+relecture verrouillée ; alternative « consultation dans le portail » au handoff IDP/C3 |

## Exigences minimales transmises à la campagne IDP

1. Magic link email + passkeys (WebAuthn), sans mot de passe.
2. Sessions listées et révocables par le patient ; déconnexion à distance.
3. Journal de connexions consultable (alimente `connexion_non_reconnue`).
4. Expiration/rotation du lien d'invitation.
5. Délégations aidants/représentants (`DelegatedAccessGrant` du contrat
   TRUST) — chaque action conserve l'identité réelle de l'auteur.
6. Booklet consultable dans le portail (l'email devient une notification
   générique) — avec C3.
7. Décommission mesurée du flux legacy `/patient/[idAssignation]`.
