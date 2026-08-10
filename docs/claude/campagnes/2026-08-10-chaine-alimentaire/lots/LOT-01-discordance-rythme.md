---
id: "LOT-01"
statut: "livré (2026-08-10)"
---

# LOT-01 — Discordance rythme déclaré vs observé

## Objet

L'objet clinique visé en remplacement du branchement direct agenda → besoin 3
(`alimentaire.ts:651-658`) : confronter `RYTHME_CHRONO` (déclaré, `Q_ALI_01`
forme 57 items) au rythme observé (agrégats d'agenda clôturés au LOT-00), et
restituer la concordance/discordance — au praticien d'abord.

## Contraintes

- `null` (jamais 0) sous la forme courte, où `MAX_RYTHME_CHRONO = 0` —
  prouvé dans les deux positions de `WN_ALI_01_SIIN57`.
- **Décision clinique préalable (D-xxx)** : définition de la discordance et
  forme de sa restitution — rien ne se code avant.
- Pas de double mesure du besoin 3 (le piège documenté
  `RYTHME_ALIMENTAIRE`/10 vs `RYTHME_CHRONO`/7).

## Dépend de

LOT-00 (l'observé n'existe au dossier qu'après clôture). La version chiffrée
attendra le LOT-02.

## Décision qui borne le lot

**D-040 (2026-08-10, décision utilisateur)** : la discordance rythme est un
**drapeau directionnel de sur-déclaration**, praticien-only, sur **trois axes**
(jeûne nocturne, protéines au matin, repas du soir léger). Un axe ne se lève
que si le patient **déclare favorable** ET l'agenda **observe défavorable** —
jamais l'inverse. Aucun score, aucun indice, aucun taux chiffré. **Pas de
réalimentation du besoin 3** : `RYTHME_CHRONO` déclaré en reste l'unique source
(le piège de la double mesure reste fermé). `null` jamais 0 : forme courte
(`MAX_RYTHME_CHRONO = 0`), agrégat observé absent, ou item déclaré manquant →
« non mesurable », jamais un drapeau ni un concordant.

## Preuves livrées (2026-08-10)

- **Fonction pure** `discordanceRythme` (`equilibre/discordanceRythme.ts`),
  déterministe, sans I/O ; banc exhaustif (`discordanceRythme.test.ts`) : chaque
  axe (drapeau levé, borne stricte concordante, déclaré défavorable, observé
  null, item déclaré absent), directionnel, agrégation, et le rappel textuel
  sans écart chiffré. Seuils : jeûne 600 min (de la **source**, barème
  `SIIN54 {min:10}`), protéines < 4 j/7, soir > 3 j/7 (arbitrages D-040).
- **Les deux positions de `WN_ALI_01_SIIN57`** (D-033) : drapeau éteint,
  `MAX_RYTHME_CHRONO = 0` et la lecture s'effondre en « non mesurable » pour
  toute entrée — le banc l'épingle. Les deux specs neufs sont inscrits à
  `test:court14` (garde `specs-drapeau-ali01.test.mjs` vert).
- **Surface praticien sans nouvelle API ni migration** : `FichePatientPanel`
  extrait le rythme déclaré de la dernière passation `Q_ALI_01` des `rawAnswers`
  déjà chargés (`/api/praticien/reponses` les porte) — via la fonction pure
  `rythmeDeclareDeReponses`, gardée par son propre banc (dernière passation
  prise, autres questionnaires ignorés, forme courte → `null`) — et le passe en
  prop **additive** au panneau agenda, qui ne rend QUE les axes en
  sur-déclaration, et **seulement sur un épisode clôturé** (D-040 : l'observé
  est celui de l'agenda clôturé, pas des agrégats partiels d'un `en_cours`).
  Bancs de rendu (`AgendaAlimentairePraticienPanel.test.tsx`) : lecture présente
  sur un axe sur-déclaré d'un clôturé, absente sur `en_cours` même couvert et
  sur-déclarant, absente si concordant / non couvert / prop absente, et **garde
  de frontière de campagne** (aucun score/indice/gramme/kcal dans le DOM rendu).
  Les trois seuils sont **figés par valeur littérale** au banc (une dérive
  clinique rougit).
- T1 vert ; Vitest complet vert dans les deux positions du drapeau. E2E
  injouables dans le conteneur distant — un parcours praticien (Q_ALI_01
  déclarant favorable + agenda observant défavorable) serait la preuve de bout
  en bout ; nommé comme réserve tant que le seed ne le porte pas. Le palier
  reste prouvé par le job `verify` de la PR.

## Hors périmètre — livré tel quel, réserves nommées

Aucun barème (LOT-02, gaté 21 jours), aucun taux chiffré, aucun seuil au-delà
des trois de D-040. **Pas de branchement au clinical-engine** : il est
fixture-only aujourd'hui et son `ClinicalSnapshot` ne porte pas les
`rawAnswers` — la discordance y sera un `DiscordanceFinding` naturel
(`practitioner_only`, `point_to_explore`) le jour où un producteur déterministe
existera. **Réserve E2E** : le parcours de bout en bout attend un seed qui
déclare favorable et observe défavorable.
