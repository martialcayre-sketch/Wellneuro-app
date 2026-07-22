---
id: "LOT-04"
titre: "Parcours patient synchronisé — les étapes 5-6 vivent enfin"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-04 — Parcours patient synchronisé — les étapes 5-6 vivent enfin

## But

Les étapes « Analyse du praticien » et « Restitution » du parcours patient
ne restent plus indéfiniment « à venir »
(`PatientJourneyProgress.tsx:5-7` : « faute de signal serveur fiable ») :
le contrat LOT-01 fournit ce signal à partir de données déjà servies au
portail. Le patient et le praticien décrivent enfin le même moment.

## Résultat observable

- Quand la consultation est en analyse, l'étape 5 est « en cours » ; quand
  le protocole est diffusé ou le booklet envoyé, les étapes avancent —
  formulations D7 (« Vos éléments ont été transmis » / « Votre praticien
  les prépare » / « Votre restitution est disponible »), jamais de délai
  promis, jamais de score.
- Les lecteurs d'écran annoncent les étapes **terminées** en plus de
  l'étape courante (aujourd'hui seule l'étape courante est annoncée).
- L'action recommandée du hub questionnaires n'apparaît plus en double :
  elle sort du groupe « À compléter »
  (`app/portail/[token]/questionnaires/page.tsx:196-215`).
- Le commentaire de contrat de `PatientJourneyProgress.tsx` est mis à jour
  (HC-F LOT-04 amendé par SP-CONV, daté).
- Aucune nouvelle catégorie de donnée n'atteint le portail : uniquement des
  statuts dérivés de payloads que le portail sert déjà (`session`,
  `protocole`) — **les quatre statuts D7 sont autorisés (D11, tranché au
  cadrage)** ; le périmètre de la dérogation G-TRUST-04 est inchangé.

## Périmètre

`web/src/components/patient/PatientJourneyProgress.tsx` et ses deux écrans
d'appel (`app/portail/[token]/page.tsx`,
`app/portail/[token]/questionnaires/page.tsx`) ; consommation du contrat
LOT-01 côté portail ; « Mon parcours » (`MonParcoursAccueil`) reflète le
même état. E2E portail dans le même commit.

## Hors périmètre

Le flux legacy `/patient/[idAssignation]` (décision D-002 : non augmenté ;
sa fin appartient à la suite d'IDP2) ; toute exposition de scores,
discordances ou données praticien ; les notifications (hors programme) ;
le contenu de la restitution elle-même.

## Fichiers probables

- `web/src/components/patient/PatientJourneyProgress.tsx`
- `web/src/components/patient/MonParcoursAccueil.tsx`
- `web/src/app/portail/[token]/page.tsx`
- `web/src/app/portail/[token]/questionnaires/page.tsx`
- `web/src/lib/trajectoire-partagee/` (import)
- `web/e2e/` (parcours portail)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.
- Jamais de score, compte à rebours ou culpabilisation (garde
  `gamification-patient.guard.test.ts`).

## Étapes

- [ ] Vérifier les hypothèses (les états dérivables couvrent-ils les 4
      transitions visées ? sinon, réduire honnêtement — statut
      « indéterminé » plutôt qu'inventé).
- [ ] Brancher le contrat, formulations D7 (les quatre statuts, D11), a11y
      des étapes terminées.
- [ ] Dédoublonner l'action recommandée.
- [ ] T1, T2, E2E ; relire le diff.

## Tests

Vitest : mapping contrat → étapes (dont « jamais rétrograde » : une étape
terminée ne redevient pas à venir) ; garde vocabulaire ; E2E portail :
Sophie Nicola voit l'étape 5 « en cours » après transmission ; a11y :
annonce des étapes terminées.

## Critères de done

Les cinq résultats observables constatés ; zéro nouvelle donnée exposée ;
`verify` vert.

## Résultats

À compléter à la clôture.
