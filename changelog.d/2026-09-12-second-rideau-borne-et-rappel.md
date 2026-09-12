### Un questionnaire en retard cesse d'être un silence des deux côtés (2026-09-12)

L'invitation à remplir un questionnaire part **une fois**, à l'assignation.
Passé cette minute, rien ne redit au patient qu'un questionnaire l'attend — et
côté praticien, l'échéance dépassée ne produit qu'une carte au Fil. Le second
rideau garde pourtant le `T0` ([[D-158]]) : un questionnaire qui ne revient pas
immobilise la trajectoire entière, en silence, des deux côtés.

**Le rappel patient existe** — une route praticien qui renvoie le courrier sans
rien écrire dans le dossier. Elle ne crée ni assignation ni réponse : c'est ce
qui la distingue du contournement qui consiste à ré-assigner le même
questionnaire pour déclencher un e-mail, et à laisser deux assignations là où le
patient n'en attend qu'une.

**Il ne part pas n'importe quand, et le serveur en est juge** : pas sur un
questionnaire déjà revenu ou annulé, pas pendant la journée annoncée — relancer
avant le terme qu'on a donné revient à le retirer —, et pas deux fois dans la
même cadence que les relances d'agenda et d'objectif. Chaque refus se dit.

**Le gabarit ne nomme pas l'instrument.** Un rappel part seul, plusieurs jours
après l'invitation, et peut être lu par quelqu'un d'autre que le destinataire :
le titre d'un questionnaire révèle le domaine exploré. Seule l'échéance
l'accompagne — c'est elle qui rend le rappel actionnable. Treizième gabarit du
registre, et l'un des rares déclarés **conformes**.

**L'échéance devient obligatoire sur le second rideau** — et sur lui seul. Une
assignation postérieure à la première synthèse validée compose ce rideau ; avant
elle, le dossier se remplit au rythme de l'entrée, et lui imposer un terme au
premier jour serait une borne administrative sur un parcours qui commence.

**Deux drapeaux, tous deux ÉTEINTS, et ils ne se composent pas** :
`WN_RELANCE_QUESTIONNAIRE` ouvre le courrier, `WN_ECHEANCE_OBLIGATOIRE` refuse
une assignation sans date. Le second arrête un geste du **praticien** — il se
décide séparément du premier, qui n'ajoute qu'un courrier. Les deux allumages se
demandent.
