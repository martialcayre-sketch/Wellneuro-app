---
id: "LOT-03"
titre: "Rendus par destinataire et impression HTML"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Rendus par destinataire et impression

> Compilé le 2026-07-18 depuis `../CAMPAGNE.md` (décisions actées : adaptation au
> destinataire, vocabulaire réglementaire strict, badge « validé par votre
> praticien »). **UI + rendu. Aucune migration. PDF différé.**

## But

Produire, à partir d'un même document composite, les **rendus adaptés par
destinataire** — patient / médecin traitant / praticien — sous garde de frontière
de données et de vocabulaire réglementaire, avec **impression HTML**.

## Résultat observable

Un document validé se décline en trois rendus : le patient voit un document clair
badgé « validé par votre praticien », sans donnée interne ; le médecin voit un
rendu en langage d'**« explorations à discuter »** (jamais prescriptif) ; le
praticien voit le rendu complet sourcé. Chaque rendu s'imprime en HTML propre.

## Périmètre

- **Filtre par destinataire** appliqué au document LOT-01/02 : le rendu patient
  applique la règle `PrévisualisationPatient` (aucune donnée interne praticien) ;
  le rendu médecin **adapte** cette règle (contexte professionnel, mais
  vocabulaire non prescriptif : « explorations à discuter »).
- **Vocabulaire réglementaire strict** dans tous les rendus ; **badge « validé
  par votre praticien »** sur tout document patient.
- **Deux régimes jamais mélangés** : statique validé (affichable sans IA) vs
  généré IA (validé praticien obligatoire) — hérité du contrat LOT-01.
- **Impression HTML** : étendre le patron `buildBookletHTML` (CSS inline,
  `escapeHtml`) à un rendu paramétré par destinataire. **PDF natif différé.**
- **Envoi** : réutiliser l'infra existante (nodemailer / lien portail) ; aucun
  nouveau canal recréé.

## Hors périmètre

- **PDF natif** (différé), **signature électronique** (différée).
- **Authentification médecin** et **fil bidirectionnel médecin** (voir risque
  « discordance 5.0 ») : hors V1 tant que non arbitré.
- Persistance (sauf gate (b) LOT-00).

## Fichiers probables

- `web/src/lib/documents/**` (filtres par destinataire, dérivés du contrat LOT-01)
- `web/src/app/api/praticien/booklet/route.ts` (patron `buildBookletHTML` étendu)
- `web/src/components/patient-cockpit/**` (sélecteur de destinataire, aperçu)
- Infra email existante (nodemailer / lien portail), réutilisée sans recréation

## Interdits

- **Interface 100 % en français** ; aucun secret ; données patient fictives seulement.
- Rendu médecin : **jamais de terminologie prescriptive** ; « explorations à
  discuter » uniquement.
- Rendu patient : aucune donnée interne praticien ; badge « validé par votre
  praticien » obligatoire.
- Aucune migration Prisma/SQL ni écriture Supabase sans confirmation distincte.

## Étapes

- [ ] Filtres de rendu patient / médecin / praticien (frontière de données).
- [ ] Garde de vocabulaire (médecin : « explorations à discuter »).
- [ ] Badge patient « validé par votre praticien ».
- [ ] Impression HTML paramétrée par destinataire (`buildBookletHTML` étendu).
- [ ] Réemploi de l'envoi existant ; tests par destinataire.

## Tests

- `cd web && npm run type-check` ; `bash scripts/check_no_secrets.sh`
- Vitest : rendu patient sans champ interne ; rendu médecin sans terme
  prescriptif ; badge présent sur tout rendu patient ; régime IA non validé jamais
  diffusé.
- Smoke praticien + vérification mobile/tablette.

## Critères de done

- [ ] Trois rendus distincts, frontière de données tenue par destinataire.
- [ ] Vocabulaire réglementaire respecté (médecin non prescriptif).
- [ ] Impression HTML par destinataire ; PDF explicitement différé.
- [ ] Aucune migration.

## Risques / points de vigilance

- **Discordance 5.0 (à arbitrer avant exécution)** : le programme recadre le volet
  médecin en **« fil de correspondance »** (réponse du médecin dans le fil, **sans
  pièces jointes biologiques = sans HDS**). Ce lot livre le **rendu sortant**
  médecin ; le **fil bidirectionnel** (réception d'une réponse médecin) est une
  extension à cadrer séparément — ne pas l'improviser ici.
- Ne pas élargir la frontière de données en adaptant au médecin.

## Résultats

À compléter à la clôture.
