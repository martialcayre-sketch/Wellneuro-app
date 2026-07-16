---
id: "LOT-07-validation-accessibilite-handoff"
titre: "Validation, accessibilité et handoff"
statut: "terminé"
dépend_de: ["LOT-01", "LOT-02", "LOT-03", "LOT-04", "LOT-05", "LOT-06"]
---

# LOT-07 — Validation, accessibilité et handoff

## But

Émettre un verdict borné, fermer la campagne proprement et rendre les contrats
opposables aux campagnes futures.

## Validations

- sécurité ;
- juridique/DPO ;
- clinique ;
- accessibilité ;
- UX ;
- tests ;
- notifications ;
- IA ;
- cycle de vie ;
- documentation.

## Panel humain

- patient ;
- patient âgé ;
- personne anxieuse ;
- difficulté de lecture ;
- aidant ;
- praticien ;
- référent protection des données.

## Livrables

- `VALIDATION_FINALE_TRUST.md`
- `DETTE_TRUST.md`
- `HANDOFF_CAMPAGNES.md`
- `RUNBOOK_INCIDENTS.md`
- `CHECKLIST_INFORMATION_PATIENT.md`
- captures et résultats.

## Handoffs

- HC-F : composants et tokens ;
- QX : notices contextuelles ;
- C1 : provenance et validation ;
- C2 : timeline et cycle ;
- C3 : documents personnalisés ;
- auth : sessions/délégations ;
- C4 : effets indésirables compléments.

## Commandes minimales

```bash
bash scripts/check_no_secrets.sh
node scripts/wn-campaign-audit.mjs
cd web
npm run type-check
npm run lint
npm run test
npm run test:e2e
```

## Done

- [ ] Toutes les validations exécutées sont consignées.
- [ ] Les validations non exécutées sont signalées.
- [ ] Aucun GO données réelles sans gates.
- [ ] Dettes propriétaires/dates.
- [ ] Handoffs acceptés.
- [ ] Registre et programme mis à jour.
- [ ] Verdict explicite.
