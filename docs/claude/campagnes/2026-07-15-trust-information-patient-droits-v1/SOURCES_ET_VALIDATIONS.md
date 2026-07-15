# Sources et validations — TRUST V1

## 1. Statut

Ce dossier est une spécification produit et architecturale. Il ne constitue ni :

- un avis juridique ;
- une qualification de dispositif médical ;
- une validation HDS ;
- une AIPD ;
- une procédure clinique ;
- une certification de sécurité.

Les textes destinés au patient doivent être validés avant production.

## 2. Sources internes

- `docs/RELATION_PRATICIEN_PATIENT_SOURCE.md`
- `docs/claude/REGISTRE_FRONTIERES.md`
- `docs/claude/campagnes/PROGRAMME_WELLNEURO_3_0.md`
- campagne HC-F ;
- campagne QX ;
- campagne C1 ;
- campagne C2 ;
- campagne C3 ;
- documentation sécurité/RGPD existante ;
- méthode du bilan de neuronutrition fournie par le praticien.

## 3. Sources officielles externes à vérifier

### Information et transparence

- CNIL — information des personnes et transparence :
  https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence

### Consentement

- CNIL — recueil du consentement :
  https://www.cnil.fr/fr/les-bases-legales/consentement

### IA et santé

- CNIL — IA et santé :
  https://www.cnil.fr/fr/ia-et-sante-developper-et-evaluer-des-systemes-ia-conformes
- Guide HAS-CNIL, février 2026 :
  https://www.cnil.fr/sites/default/files/2026-03/guide_has_cnil_recommandations_ia.pdf

### Règlement européen IA

- Commission européenne — AI Act :
  https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai

### Sécurité

- CNIL — cloud :
  https://www.cnil.fr/fr/securite-cloud-informatique-en-nuage
- CNIL — accès au dossier patient :
  https://www.cnil.fr/fr/donnees-de-sante-la-cnil-rappelle-les-mesures-de-securite-et-de-confidentialite-pour-lacces-au
- CNIL — violations de données :
  https://www.cnil.fr/fr/violations-de-donnees-personnelles-les-regles-suivre

### Urgences

- Service-Public :
  https://www.service-public.fr/particuliers/vosdroits/F33954

### Nutrivigilance

- Anses :
  https://www.anses.fr/fr/content/tout-savoir-sur-le-dispositif-de-nutrivigilance

## 4. Validation externe attendue

### Juridique / DPO

- rôles ;
- bases légales ;
- information ;
- droits ;
- mineurs ;
- conservation ;
- transferts ;
- sous-traitants ;
- consentements ;
- incidents.

### Sécurité / hébergement

- HDS ;
- isolation ;
- authentification ;
- sessions ;
- chiffrement ;
- journalisation ;
- sauvegarde ;
- incident ;
- continuité.

### Clinique

- messages de sécurité ;
- règles ;
- niveaux d’escalade ;
- délais ;
- effets indésirables ;
- rôle des professionnels ;
- vocabulaire patient.

### UX / accessibilité

- compréhension ;
- anxiété ;
- fatigue cognitive ;
- mobile ;
- handicap ;
- langage simplifié ;
- aidants.

## 5. Registre de vérification

Chaque source externe doit conserver :

```yaml
source:
  title: ""
  url: ""
  authority: ""
  checked_at: ""
  checked_by: ""
  applies_to: []
  next_review_at: ""
```

## 6. Règle de maintenance

Toute évolution d’un texte patient doit indiquer :

- raison ;
- source ;
- niveau de changement ;
- version ;
- validateur ;
- date ;
- besoin ou non d’une nouvelle prise de connaissance.
