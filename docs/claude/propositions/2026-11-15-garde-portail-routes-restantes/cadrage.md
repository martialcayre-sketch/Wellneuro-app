# Cadrage — garde du dossier de la page sur les routes d'écriture restantes du portail

Lot `garde-portail-routes-restantes` (carnet, file D, ordre 53). Il répond à la
question `20261114-1951-d`, option a : même garde (en-tête, 409, T-51), avec
une liste confirmée route par route. Il suit le patron de #2125 ([[D-481]] et
[[D-488]], DOC-12).

Cette note est un document de cadrage. Elle prépare l'extension DOC-14 :
complément de [[D-481]] et amendement de [[D-488]]. Elle ne modifie aucun code
et passe avant lui. Chemins sous `web/src/`, lus sur `origin/main@9e7f9620`.

## 1. Inventaire des routes d'écriture

Toutes les routes `POST` sous `app/api/portail/` et `app/api/patient/` ont été
relues.

### Routes retenues : la garde s'y ajoute

Ces onze routes prennent le dossier dans la seule session, sans identifiant
cible.

| Route | Écrit |
|---|---|
| `portail/consentement` | consentement au suivi (entrée) |
| `portail/fiche` | fiche signalétique et motif |
| `portail/valider` | anamnèse, validation de l'entrée, premières assignations |
| `portail/date-naissance` | date de naissance |
| `portail/protocole/checkin` | point de suivi du protocole |
| `portail/ce-qui-compte` | une entrée « ce qui compte » |
| `portail/pack-reevaluation` | réponse à une proposition de réévaluation |
| `portail/ja/observations` | instantané d'observation alimentaire |
| `portail/lectures` | lecture datée d'un document remis ([[D-297]]) |
| `portail/trust/lecture` | trace de présentation, accusé de lecture |
| `portail/document-medecin/telechargement` | ligne du journal de téléchargement ([[D-307]] §3) |

La dernière route **ne figurait pas** dans la question. Elle écrit une ligne de
journal sous le dossier de la session, et elle renvoie le document de ce
dossier.

### Routes écartées : protégées autrement, ou sans donnée de dossier

| Route | Motif |
|---|---|
| `patient/consentement` | refuse en 403 une assignation qui n'est pas celle de la session (`isSessionAuthorizedForAssignment`), comme `patient/submit` |
| `portail/agenda-alimentaire`, `agenda-sommeil`, `agenda-sommeil/cloture` | assignation cible contrôlée contre la session ; sinon 404 |
| `portail/comprehension`, `portail/dossier` | protégés par leur identifiant cible (constat de la question) |
| `patient/submit` | 403 hors de l'assignation de la session (constat de la question) |
| `portail/session`, `portail/deconnexion` | aucune donnée de dossier |
| `portail/lien/demande` | sans session : demande de lien par adresse |

`patient/consentement` figurait dans la question (« consentement portail et
patient »). La confirmation route par route l'écarte.

Les cinq routes de DOC-12 restent comme elles sont.

## 2. Emplacement de T-51 par écran

T-51 ne change pas : « Rien n’a été envoyé : cette page a été ouverte sous un
autre compte. Rechargez-la pour continuer. »

Règle de DOC-12, Q10 a : T-51 paraît sous le geste refusé, sans nommer l'autre
compte. Après un refus, rien n'est relu et la saisie reste. Une relecture
rendrait les données de l'autre compte.

### Écrans à geste visible

T-51 prend la place du message d'erreur existant, sous le geste. Il ne s'ajoute
aucun autre texte. Aucune mention de sécurité ne s'y ajoute : U40 reste le seul
écran où elle suit T-51.

| Écran | Composant | Geste | Message d'erreur aujourd'hui |
|---|---|---|---|
| U03 Avant de commencer | `patient/trust/AvantDeCommencer` | dernier écran, validation des accusés | `data.error` sous le bouton |
| U04 Date de naissance (et ses reprises dans U33, U34) | `patient/DateNaissanceEcran` | « Enregistrer » | `data.error` |
| U06 Consentements d'entrée | `app/portail/[token]/page.tsx`, `ConsentScreen` | « Continuer » | `data.error` |
| U07 Fiche initiale | idem, `FicheForm` | dernier envoi de la fiche | `data.error` |
| U08 Parler de votre situation | idem, `AnamneseForm` | envoi de l'anamnèse | `data.error` |
| U20 Mon point de suivi | `patient-companion/ProtocolCheckinForm` | envoi du point | `data.error` |
| U22 Mon observation alimentaire | `food-observation/PatientFoodObservationPanel` | « Transmettre » | `json.error` |
| U23 Ce qui compte pour moi | `patient-companion/CeQuiCompteForm` | « Déposer » | `data.error` ; le texte est gardé |
| U30 Pour votre médecin | `patient/document-medecin/PourVotreMedecinLecture` | « Télécharger » | `data.error` |
| U34 Comptes rendus, accusé `usage_ia` ou conditions | `patient/biologie/TransmissionCompteRendu` | accusé de lecture | **texte fixe** : T-51 le remplace sur ce seul refus |
| U38 Conditions d'utilisation | `patient/trust/ConditionsUtilisation` | accusé | **texte fixe** : T-51 le remplace sur ce seul refus |
| U41 Invitation à une réévaluation | `patient/PropositionPackReevaluation` | accepter ou décliner | **texte fixe**, sauf la cadence : T-51 le remplace sur ce seul refus |

Sur les neuf écrans qui affichent déjà le texte de la route, T-51 paraît sans
code d'affichage neuf : il suffit que la page envoie l'en-tête. Sur U34, U38 et
U41, la page reconnaît le refus (`estRefusAutreDossier`) et affiche T-51 à la
place du texte fixe.

### Écritures sans geste : refus silencieux

Ces trois écritures partent seules, sans geste du patient. Elles sont déjà
silencieuses en cas d'échec, par décision. Le refus de la garde reste muet.

| Écriture | Composant | Silence existant |
|---|---|---|
| trace de présentation (`type: 'presente'`) | `AvantDeCommencer`, au premier écran | `.catch(() => undefined)` |
| lecture datée d'un document remis | `patient/ConsignerLecturePortail`, sur U26, U29, U31, U32 et la lecture des fiches | [[D-297]] §4, « silence délibéré » |
| lecture datée du protocole | `patient-companion/PatientCompanionHome`, au dépliage | idem ; `lectureConsignee` reste faux |

Le refus n'écrit rien. Ainsi aucune lecture n'est datée dans le dossier d'un
autre. C'est justement le cas que la garde ferme : la page ouverte pour un
patient lirait la liste de l'autre (GET), puis daterait sa lecture.

## 3. Mécanisme (inchangé depuis #2125)

- Côté route : `refusAutreDossier(req, idPatient)` (`lib/trust/portailAuth.ts`),
  appelé juste après l'authentification. Il passe avant tout le reste :
  lecture du corps, cadence, garde d'âge, clôture, écriture.
  - Les 401 et 403 passent avant lui, sans changement.
  - Certaines routes lisent leur corps avant la garde : `fiche`, `valider`,
    `lectures`, `trust/lecture` et `protocole/checkin`. Ce corps reste lu
    avant, comme aujourd'hui, et un corps invalide garde son 400. Rien de ce
    qui précède la garde n'écrit.
- Côté page : `enTeteDossierPage(segment)` (`lib/portail/dossierPage.ts`).
  - Le segment vient de la prop `token` quand elle existe, sinon de
    `useParams`, comme dans `DeclarationsPatient`.
  - Un segment absent est refusé : la page servie avant le déploiement affiche
    T-51 et se recharge.

## 4. Réception

- Bancs de route : 409 sans écriture sur chaque route retenue, segment égal
  accepté, 401 et 403 inchangés.
- Bancs de composant :
  - l'en-tête part ;
  - T-51 paraît sur U34, U38 et U41 ;
  - la saisie reste sur U23.
- E2E : sur les fixtures seulement, un changement de compte dans le même
  navigateur, puis un envoi refusé sur un écran du lot sans rien écrire. Les
  E2E qui appellent ces routes sans en-tête sont repris.
- Revues : `/security-review` et `wn-reviewer`.

Aucune migration, aucun drapeau, aucun schéma. Aucune règle clinique,
d'orientation, de consentement ou de conservation ne change. La garde ajoute un
refus, elle n'en retire aucun.

## 5. Tranché par le responsable (2026-11-15)

1. Emplacements du §2 : acceptés tels quels (`20261115-1110-d`).
2. U30 et `document-medecin/telechargement` : inclus, avec T-51
   (`20261115-1111-d`).

Inscrit dans [[D-481]] (complément DOC-14) et [[D-488]] (amendement DOC-14).
