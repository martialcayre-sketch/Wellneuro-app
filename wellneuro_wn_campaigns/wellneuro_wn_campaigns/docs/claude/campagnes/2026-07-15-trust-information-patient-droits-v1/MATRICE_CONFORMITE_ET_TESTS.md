# Matrice de conformité et tests — TRUST V1

> Cette matrice est un outil de conception et de validation. Elle ne constitue
> pas un avis juridique ni une certification.

## 1. Matrice fonctionnelle

| Exigence | Patient | Praticien | Données | Test |
|---|---|---|---|---|
| Information courte au premier accès | 4 écrans | état visible | acknowledgement | E2E |
| Accès permanent | menu + footer | version actuelle | document/version | E2E |
| Séparation lecture/choix | libellés distincts | historique | événements distincts | unit + E2E |
| Versionnement | historique | comparaison | hash + supersedes | unit |
| Retrait | action autonome | tâche si besoin | append-only | E2E |
| Transparence IA | badge + détail | modèle/prompt | provenance | snapshot |
| Validation humaine | badge réel | action explicite | validator/date | unit + E2E |
| Signal sécurité | consigne | file prioritaire | SafetySignalEvent | E2E |
| Effet indésirable | formulaire | revue | report | E2E |
| Incident confidentialité | formulaire | file | incident | E2E |
| Notification générique | message neutre | état livraison | CommunicationEvent | integration |
| Aidant/représentant | périmètre visible | acteur réel | grant | security |
| Cycle de vie | statut compte | actions | lifecycle events | unit |
| Accessibilité | AA/clavier/audio | — | locale | axe/manual |

## 2. Matrice des gates

| Gate | Condition | Preuve | Verdict |
|---|---|---|---|
| État réel | audit revalidé | rapport LOT-00 | bloquant |
| Juridique | textes et bases validés | note externe | bloquant |
| HDS/sécurité | architecture approuvée | audit + décision | bloquant données réelles |
| Auth | sessions/révocation/isolation | tests | bloquant |
| Clinique | règles sécurité approuvées | registre versions | bloquant alertes |
| IA | fournisseur et flux connus | registre IA | bloquant |
| Accessibilité | tests automatisés + humains | rapport | bloquant selon sévérité |
| Exploitabilité | incidents, support, rollback | runbook | bloquant |

## 3. Tests unitaires

### Versionnement

- création v1 ;
- publication ;
- v2 supersède v1 ;
- hash différent ;
- version publiée immuable ;
- changement éditorial sans nouvelle confirmation ;
- changement substantiel avec nouvelle confirmation.

### Choix

- accord ;
- refus ;
- retrait ;
- expiration ;
- événement précédent conservé ;
- finalités séparées ;
- aucun précochage.

### Provenance

- combinaison de sources ;
- validation absente ;
- validation présente ;
- génération IA ;
- calcul déterministe ;
- projection patient.

### Événements

- ordre ;
- idempotence ;
- double clic ;
- retry ;
- concurrence ;
- audit acteur.

## 4. Tests d’intégration

- publication d’une version puis présentation au patient ;
- accusé de lecture et visibilité praticien ;
- retrait d’une autorisation ;
- partage ponctuel ;
- signal d’effet indésirable ;
- notification échouée ;
- demande de droit ;
- révocation d’un aidant ;
- suspension de compte ;
- reprise après panne.

## 5. Tests E2E patient

### Parcours initial

```text
invitation → vérification → 4 écrans →
prise de connaissance → choix facultatifs →
onboarding
```

Vérifier :

- retour arrière ;
- reprise ;
- mobile ;
- zoom ;
- clavier ;
- absence de dark pattern ;
- bouton final ;
- lien vers détail ;
- version enregistrée.

### Centre permanent

- accès depuis toutes les pages ;
- lecture ;
- versions ;
- choix ;
- retrait ;
- signalement ;
- export ;
- contact.

### Notices contextuelles

- questionnaire ;
- partage ;
- IA ;
- examen non remboursé ;
- effet indésirable ;
- retrait.

## 6. Tests E2E praticien

- carte information/droits ;
- demande reçue ;
- effet indésirable ;
- incident ;
- signal sécurité ;
- validation IA ;
- erreur de livraison ;
- délégation ;
- clôture compte ;
- historique.

## 7. Tests de frontière patient-safe

Snapshots garantissant l’absence de :

- notes internes ;
- prompt système ;
- chaîne de raisonnement ;
- seuils internes ;
- données d’un autre patient ;
- email d’un tiers ;
- identifiants techniques ;
- statut non publié ;
- brouillon ;
- commentaire praticien privé.

## 8. Tests d’autorisation

Scénarios :

- patient A / patient B ;
- praticien A / praticien B ;
- aidant actif / révoqué ;
- représentant limité ;
- token expiré ;
- compte suspendu ;
- document supersédé ;
- accès par identifiant deviné ;
- route legacy ;
- session concurrente.

## 9. Tests de notification

- contenu générique ;
- absence de santé dans l’objet ;
- lien sécurisé ;
- expiration ;
- retry ;
- pas de doublon ;
- échec visible ;
- mauvais destinataire simulé ;
- révocation.

## 10. Tests de sécurité clinique

- consigne immédiate disponible hors ligne ;
- serveur indisponible ;
- règle désactivée ;
- version de message ;
- notification praticien échouée ;
- accusé ;
- absence de promesse ;
- numéros localisés ;
- texte libre non trié par IA.

## 11. Tests IA

- contenu non validé invisible ;
- rejet ;
- édition ;
- publication ;
- version du prompt ;
- changement de modèle ;
- données minimisées ;
- fuite inter-patient ;
- information patient exacte ;
- contestation ;
- retrait du fournisseur.

## 12. Accessibilité

Automatique :

- axe ;
- contrastes ;
- labels ;
- titres ;
- ordre DOM ;
- focus ;
- cibles.

Manuel :

- clavier ;
- lecteur d’écran ;
- zoom 200 % ;
- mobile ;
- reduced motion ;
- fatigue cognitive ;
- version simplifiée ;
- personne en stress.

## 13. Tests de compréhension

Panel minimal :

- patient sans connaissance technique ;
- patient âgé ;
- personne avec difficulté de lecture ;
- proche aidant ;
- patient très anxieux ;
- professionnel.

Questions :

- urgence ;
- surveillance ;
- rôle IA ;
- score ;
- partage ;
- retrait ;
- provenance ;
- incident.

## 14. Tests économiques et conflits d’intérêts

- coût visible avant action ;
- remboursement non affirmé sans source ;
- liberté de fournisseur ;
- lien économique déclaré ;
- absence de bouton trompeur ;
- alternative visible.

## 15. Observabilité

Indicateurs non cliniques :

- taux d’ouverture ;
- taux de compréhension assistée ;
- taux de retraits ;
- demandes de droits ;
- incidents ;
- erreurs de livraison ;
- délais de traitement ;
- validations IA ;
- rejets IA ;
- signalements d’effet indésirable.

Ne pas transformer ces indicateurs en score patient.

## 16. Critères GO

### GO documentation

- contenu complet ;
- sources ;
- responsabilités ;
- versions ;
- campagnes raccordées.

### GO prototype

- données fictives ;
- aucune persistance réelle ;
- tests UX ;
- accessibilité.

### GO technique limité

- modèles et API validés ;
- sécurité ;
- auth ;
- tests ;
- rollback.

### GO données réelles

Exige en plus :

- cadre juridique ;
- hébergement ;
- contrats ;
- AIPD si applicable ;
- support ;
- incidents ;
- gouvernance ;
- formation ;
- validation finale documentée.

## 17. Verdict final attendu

```text
GO
GO avec dettes
NO-GO borné
```

Le verdict liste :

- périmètre ;
- preuves ;
- dettes ;
- risques ;
- propriétaire ;
- date de révision.
