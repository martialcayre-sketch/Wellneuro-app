---
id: "LOT-00-audit-frontieres-gates"
titre: "Audit de l’état réel, frontières et gates"
statut: "à_faire — non démarré"
dépend_de: []
---

# LOT-00 — Audit de l’état réel, frontières et gates

## But

Revalider l’audit relation praticien–patient contre le commit courant, fixer les
frontières TRUST et produire un verdict de démarrage.

## Entrées

- `docs/RELATION_PRATICIEN_PATIENT_SOURCE.md`
- registre de frontières ;
- schéma Prisma ;
- routes patient/praticien ;
- auth patient ;
- consentement existant ;
- portail ;
- emails ;
- synthèse IA ;
- documents/booklets ;
- tests E2E.

## Questions obligatoires

1. Quel est le point d’entrée patient réellement actif ?
2. Quelle information est déjà présentée ?
3. Où le consentement est-il stocké ?
4. Une version de texte est-elle persistée ?
5. Quels sous-traitants interviennent réellement ?
6. Quels contenus sont envoyés par email ?
7. Les données sont-elles isolées par praticien ?
8. Quelle validation humaine est persistée ?
9. Quels écrans portent déjà des mentions IA ?
10. Quels parcours legacy doivent être décommissionnés ?

## Livrables

- `AUDIT_ETAT_REEL_TRUST.md`
- `MATRICE_FRONTIERES_TRUST.md`
- `GATES_GO_NO_GO.md`
- inventaire des textes existants ;
- carte des flux de données ;
- liste des risques P0/P1/P2.

## Interdits

- ne pas modifier le code ;
- ne pas créer de migration ;
- ne pas déclarer une conformité ;
- ne pas reprendre un constat historique sans vérification ;
- ne pas utiliser de données réelles.

## Done

- [ ] Commit audité documenté.
- [ ] Chaque constat porte une preuve.
- [ ] Les frontières avec HC-F/QX/C1/C2/C3/auth sont fixées.
- [ ] Les rôles et inconnues sont listés.
- [ ] Les gates sont explicites.
- [ ] Verdict GO documentation / NO-GO activation émis.
