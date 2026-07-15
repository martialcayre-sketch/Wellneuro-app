---
id: "LOT-06-auth-partages-notifications"
titre: "Authentification, délégations, partages et notifications"
statut: "à_faire — non démarré"
dépend_de: ["LOT-00"]
---

# LOT-06 — Authentification, délégations, partages et notifications

## But

Vérifier que le cadre d’information repose sur une architecture d’accès
cohérente et que les partages ne fuient pas de données sensibles.

## Périmètre

- invitation ;
- expiration ;
- session ;
- révocation ;
- historique de connexion ;
- partage médecin ;
- aidants ;
- notification générique ;
- lien sécurisé ;
- legacy.

## Frontière

La refonte complète magic link/passkeys peut rester une campagne auth dédiée.
TRUST définit les exigences minimales et les gates.

## Étapes

1. Audit token + email.
2. Tests multi-praticien.
3. Politique de sessions.
4. Révocation.
5. Délégations.
6. Partage ponctuel.
7. Templates de notification.
8. Mesure du legacy.

## Interdits

- lien permanent non révocable ;
- données sensibles en email/SMS ;
- aidant utilisant le compte patient ;
- révocation annulée par renvoi ;
- accès indirect par identifiant ;
- modification auth majeure sans campagne dédiée.

## Done

- [ ] Menaces documentées.
- [ ] Isolation testée.
- [ ] Révocation testée.
- [ ] Notifications génériques.
- [ ] Délégations explicites.
- [ ] Handoff auth produit.
