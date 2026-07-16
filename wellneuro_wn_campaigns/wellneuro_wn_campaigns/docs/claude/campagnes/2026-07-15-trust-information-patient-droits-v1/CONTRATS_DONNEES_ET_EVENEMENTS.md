# Contrats de données et événements — TRUST V1

> Spécification conceptuelle. Aucun modèle Prisma, aucune migration et aucune
> API ne sont autorisés sans lot dédié et confirmation distincte.

## 1. Documents d’information

```ts
type InformationDocumentType =
  | 'care_framework'
  | 'medical_safety'
  | 'privacy'
  | 'ai_transparency'
  | 'patient_rights'
  | 'digital_relationship'
  | 'economic_transparency'
  | 'adverse_effects'
  | 'incident_response';

type InformationAudience =
  | 'patient'
  | 'minor'
  | 'legal_representative'
  | 'caregiver'
  | 'practitioner';

type InformationDocument = {
  id: string;
  key: string;
  type: InformationDocumentType;
  audience: InformationAudience;
  locale: string;
  jurisdiction: string;
  owner: string;
  createdAt: string;
};
```

## 2. Versions

```ts
type InformationChangeLevel =
  | 'editorial'
  | 'clarification'
  | 'material_information'
  | 'new_optional_purpose'
  | 'security_event';

type InformationDocumentVersion = {
  id: string;
  documentId: string;
  version: string;
  title: string;
  summary: string;
  contentHtml: string;
  contentText: string;
  contentHash: string;
  changeLevel: InformationChangeLevel;
  changeSummary: string;
  status: 'draft' | 'reviewed' | 'approved' | 'published' | 'superseded' | 'archived';
  effectiveAt: string | null;
  publishedAt: string | null;
  supersedesVersionId: string | null;
  requiresAcknowledgement: boolean;
  requiresNewChoice: boolean;
  approvedByActorId: string | null;
  sourceReferences: Array<{
    label: string;
    url: string;
    checkedAt: string;
  }>;
};
```

## 3. Accusé de lecture

```ts
type AcknowledgementType =
  | 'displayed'
  | 'opened'
  | 'acknowledged'
  | 'explained_with_assistance';

type PatientAcknowledgement = {
  id: string;
  patientId: string;
  careRelationshipId: string | null;
  documentVersionId: string;
  type: AcknowledgementType;
  displayedAt: string | null;
  acknowledgedAt: string | null;
  actorId: string;
  actorRole: 'patient' | 'representative' | 'caregiver';
  channel: 'portal' | 'in_person' | 'paper' | 'email_link';
  locale: string;
  evidenceVersion: 1;
};
```

Ne pas collecter des données techniques excessives pour « prouver » la lecture.
L’identité authentifiée, la version, l’action, la date et le canal constituent
le noyau minimal.

## 4. Événements de choix

```ts
type ChoicePurpose =
  | 'share_with_treating_physician'
  | 'delegate_to_caregiver'
  | 'nonessential_notifications'
  | 'secondary_reuse'
  | 'research'
  | 'other';

type ChoiceStatus =
  | 'granted'
  | 'refused'
  | 'withdrawn'
  | 'expired'
  | 'superseded';

type PatientChoiceEvent = {
  id: string;
  patientId: string;
  careRelationshipId: string | null;
  purpose: ChoicePurpose;
  status: ChoiceStatus;
  scope: Record<string, unknown>;
  documentVersionId: string;
  recordedAt: string;
  effectiveAt: string;
  expiresAt: string | null;
  actorId: string;
  actorRole: 'patient' | 'representative';
  collectionMethod: 'portal' | 'in_person' | 'paper';
  supersedesEventId: string | null;
};
```

Les événements sont append-only. Le retrait n’écrase pas l’accord précédent.

## 5. Délégation

```ts
type DelegatedAccessGrant = {
  id: string;
  patientId: string;
  delegateIdentityId: string;
  delegateRole: 'caregiver' | 'parent' | 'legal_representative' | 'trusted_person';
  scopes: Array<
    | 'view_information'
    | 'view_documents'
    | 'answer_questionnaires'
    | 'view_protocol'
    | 'manage_choices'
  >;
  startsAt: string;
  endsAt: string | null;
  status: 'pending' | 'active' | 'revoked' | 'expired';
  grantedByActorId: string;
  revokedAt: string | null;
  reason: string | null;
};
```

Chaque action réalisée sous délégation conserve l’identité réelle de l’auteur.

## 6. Provenance et validation

```ts
type PatientFacingProvenance =
  | 'patient_declared'
  | 'deterministic_calculation'
  | 'orientation_indicator'
  | 'functional_hypothesis'
  | 'ai_assisted'
  | 'practitioner_validated'
  | 'laboratory_document'
  | 'medical_information_reported';

type ContentValidation = {
  status: 'draft' | 'reviewed' | 'validated' | 'published' | 'superseded';
  validatedByActorId: string | null;
  validatedAt: string | null;
  publishedAt: string | null;
};

type ContentProvenance = {
  sources: PatientFacingProvenance[];
  sourceObjectIds: string[];
  generatedByModel: string | null;
  promptVersion: string | null;
  generatedAt: string | null;
  validation: ContentValidation;
};
```

## 7. Signalement d’effet indésirable

```ts
type AdverseEffectReport = {
  id: string;
  patientId: string;
  careEpisodeId: string | null;
  productLabel: string;
  productReferenceId: string | null;
  startedAt: string | null;
  doseAsReported: string | null;
  symptomStartedAt: string | null;
  symptomsAsReported: string;
  concomitantProductsAsReported: string | null;
  actionTakenAsReported: 'none' | 'reduced' | 'stopped' | 'unknown';
  perceivedSeverity: 'mild' | 'moderate' | 'severe' | 'unsure';
  immediateSafetyAnswer: 'emergency_advised' | 'medical_contact_advised' | 'routine_review';
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByActorId: string | null;
  externalReportingStatus: 'not_assessed' | 'not_required' | 'to_report' | 'reported';
};
```

Wellneuro enregistre un signalement et une réponse organisationnelle. Il ne
déduit pas automatiquement une causalité.

## 8. Signal de sécurité

```ts
type SafetySignalLevel =
  | 'immediate_external_action'
  | 'prompt_medical_contact'
  | 'practitioner_review'
  | 'routine';

type SafetySignalEvent = {
  id: string;
  patientId: string;
  sourceType: 'questionnaire' | 'checkin' | 'adverse_effect_report' | 'manual';
  sourceObjectId: string;
  ruleId: string;
  ruleVersion: string;
  level: SafetySignalLevel;
  patientMessageVersion: string;
  createdAt: string;
  practitionerNotificationStatus: 'not_required' | 'queued' | 'sent' | 'failed';
  acknowledgedByPractitionerAt: string | null;
  resolution: string | null;
};
```

Les règles et textes sont séparés du code applicatif et versionnés.

## 9. Incident de confidentialité

```ts
type PrivacyIncidentReport = {
  id: string;
  patientId: string | null;
  reporterActorId: string;
  category:
    | 'unrecognized_login'
    | 'wrong_recipient'
    | 'wrong_document'
    | 'lost_device'
    | 'unauthorized_access'
    | 'incorrect_sharing'
    | 'other';
  description: string;
  reportedAt: string;
  status: 'received' | 'triaged' | 'investigating' | 'resolved' | 'closed';
  severity: 'unknown' | 'low' | 'medium' | 'high';
  assignedToActorId: string | null;
  responseDueAt: string | null;
  regulatoryAssessment: 'not_started' | 'not_notifiable' | 'possible' | 'notified';
};
```

## 10. Demande d’exercice des droits

```ts
type RightsRequestType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'restriction'
  | 'objection'
  | 'portability'
  | 'withdraw_choice'
  | 'information';

type RightsRequest = {
  id: string;
  patientId: string;
  type: RightsRequestType;
  submittedAt: string;
  identityVerificationStatus: 'pending' | 'verified' | 'failed';
  status: 'received' | 'in_review' | 'need_information' | 'fulfilled' | 'refused';
  dueAt: string | null;
  decisionReason: string | null;
  completedAt: string | null;
};
```

Les droits réellement applicables dépendent du traitement et de sa base légale.
L’interface ne doit pas promettre un droit absolu sans contexte.

## 11. Cycle de vie du compte

```ts
type PatientAccountStatus =
  | 'invited'
  | 'identity_verified'
  | 'active'
  | 'suspended'
  | 'closed'
  | 'archived';

type PatientAccountLifecycleEvent = {
  id: string;
  patientId: string;
  fromStatus: PatientAccountStatus | null;
  toStatus: PatientAccountStatus;
  reason: string;
  actorId: string;
  createdAt: string;
};
```

## 12. Notifications

```ts
type CommunicationEvent = {
  id: string;
  patientId: string;
  templateKey: string;
  templateVersion: string;
  channel: 'email' | 'sms' | 'push' | 'portal';
  sensitivity: 'generic' | 'restricted';
  relatedObjectType: string;
  relatedObjectId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'opened';
  createdAt: string;
  sentAt: string | null;
  failureCode: string | null;
};
```

Règle : `email`, `sms` et `push` utilisent uniquement des modèles `generic`.

## 13. Événements métier publics

```ts
type TrustEvent =
  | { type: 'information.version_published'; versionId: string }
  | { type: 'information.presented'; acknowledgementId: string }
  | { type: 'information.acknowledged'; acknowledgementId: string }
  | { type: 'patient_choice.recorded'; choiceEventId: string }
  | { type: 'patient_choice.withdrawn'; choiceEventId: string }
  | { type: 'rights_request.submitted'; requestId: string }
  | { type: 'delegated_access.granted'; grantId: string }
  | { type: 'delegated_access.revoked'; grantId: string }
  | { type: 'safety_signal.created'; signalId: string }
  | { type: 'adverse_effect.reported'; reportId: string }
  | { type: 'privacy_incident.reported'; incidentId: string }
  | { type: 'patient_account.status_changed'; lifecycleEventId: string };
```

## 14. API — principes

- routes patient dédiées ;
- routes praticien dédiées ;
- DTO patient explicitement construits ;
- contrôle de propriété centralisé ;
- idempotency key sur mutations sensibles ;
- transaction sur enregistrement + événement ;
- réponse neutre en cas de ressource non autorisée ;
- aucun champ interne exposé par sérialisation implicite ;
- journal d’audit séparé des événements visibles.

## 15. Idempotence

Actions nécessitant une clé d’idempotence :

- accusé de lecture final ;
- accord/retrait ;
- signalement d’effet indésirable ;
- demande de droit ;
- délégation ;
- partage ponctuel ;
- signalement de confidentialité.

## 16. Handoff C3

C3 possède les documents personnalisés construits depuis les sources cliniques.

TRUST possède les documents normatifs et d’information qui encadrent la
relation.

Un document C3 peut référencer une version TRUST, mais ne la copie pas.

## 17. Handoff C2

C2 peut publier dans la timeline patient :

- protocole publié ;
- check-in ouvert ;
- ajustement publié.

TRUST publie :

- information majeure mise à jour ;
- choix modifié ;
- demande de droit reçue ;
- incident signalé.

Les événements techniques restent invisibles.
