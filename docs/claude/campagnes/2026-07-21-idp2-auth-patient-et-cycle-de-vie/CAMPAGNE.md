---
id: "2026-07-21-idp2-auth-patient-et-cycle-de-vie"
titre: "IDP2 — Compte patient et cycle de vie du dossier"
statut: "en_cours"
créée_le: "2026-07-21"
mise_à_jour: "2026-07-21"
lot_courant: "LOT-01"
---

# IDP2 — Compte patient et cycle de vie du dossier

> Cadrage ouvert le 2026-07-21, sur décision de l'utilisateur. **Aucun code
> écrit à ce stade.** Ce document consigne les décisions prises, ce qu'elles
> impliquent, ce qui reste ouvert, et une esquisse de lots. Il ne spécifie pas.

## Pourquoi cette campagne

Deux besoins distincts sont apparus le même jour, et ils se répondent.

**Le premier est un constat de revue.** L'application **promet au patient**, en
production, qu'il peut demander « l'accès à ses données, leur rectification,
**leur effacement**, la limitation ou l'opposition » (`lib/trust/contenus/registre.ts:167`).
Le canal de demande existe (`POST /api/portail/trust/signalement`, type
`effacement`, enregistré dans `trust_rights_requests`). **Rien ne l'exécute.**
Le seul bouton nommé « suppression » — `DELETE /api/praticien/patients` — écrit
`{ actif: false }` (`route.ts:414`) et rien d'autre : c'est un retrait
d'activité, pas un effacement. Le dossier reste entier, e-mail compris, et
quatorze relations y pendent, dont certaines en `onDelete: Restrict`.

Un droit annoncé et non exécutable est un engagement en défaut. C'est d'autant
plus sensible que la dérogation d'hébergement du 2026-07-21
(`campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`)
s'appuie en partie sur la liberté des participants — laquelle suppose de
pouvoir partir.

**Le second est une décision produit.** Remplacer l'accès par jeton porteur par
un **compte patient**. Ce qu'il ferme, au-delà du confort :

- le **jeton permanent stocké en clair** (`patients.access_token`) disparaît, et
  avec lui la question de sa péremption, ouverte depuis le 2026-07-20 ;
- le **secret dans l'URL** disparaît — aujourd'hui l'espace patient s'ouvre sur
  `/portail/[token]`, donc le secret transite par un chemin, un historique de
  navigateur, un en-tête `Referer` ;
- l'**exigence 2** de G-TRUST-04 (contrôle d'accès centralisé) passe de partielle
  à réelle : un compte, pas un lien porteur ;
- l'**exigence 4** (sessions et révocations) cesse de dépendre d'une coexistence
  transitoire ;
- plus aucun secret d'authentification ne transite par e-mail, canal non
  maîtrisé.

## Décisions actées (2026-07-21)

| # | Décision | Motif |
|---|---|---|
| D1 | **Google + lien magique.** Pas d'autre fournisseur d'identité | Le lien magique ne demande qu'une adresse e-mail : personne n'est exclu. Un fournisseur supplémentaire n'ajoute pas de couverture, seulement un sous-traitant |
| D2 | **Facebook écarté** | Utiliser Facebook Login apprendrait à Meta que la personne utilise une application de neuronutrition — une donnée de santé par déduction, transmise à une entreprise de ciblage publicitaire. Aucune couverture gagnée en échange |
| D3 | **Clôture de suivi et effacement coexistent**, comme deux états distincts | Ce ne sont pas deux intensités de la même chose. L'une conserve, l'autre détruit |
| D4 | **Clôture de suivi** : accès en lecture conservé, **aucune assignation de questionnaire, aucun envoi de document** | Un dossier clos n'est pas un dossier actif au ralenti |
| D5 | Ces refus sont **portés par les routes**, pas par l'écran | Le dépôt a déjà connu le cas : `POST /api/praticien/consultations` levait une révocation d'accès et déclenchait un e-mail sans garde (#181). Une interdiction qui ne vit que dans l'UI se contourne par un appel direct |
| D6 | **Résidu après effacement** : année de naissance, prénom, **trois premières lettres du nom** | Permet à l'historique clinique agrégé de ne pas s'effondrer sans conserver de quoi identifier |
| D7 | Le résidu **ne s'applique qu'à l'effacement** | Aucune transformation des dossiers actifs, aucune migration destructive sur les 17 dossiers existants |
| D8 | **Un menu unique** remplace les cinq boutons d'accès du panneau praticien | Le panneau est déjà chargé. Les deux nouvelles actions doivent l'alléger, pas l'alourdir |

### D8 — la forme retenue

```
┌────────────────────────────────────────────┐
│ Michel Dogné   michel.dogne@…    ● Actif   │
│                     [ Gérer le dossier ▾ ] │
└────────────────────────────────────────────┘
        ┌─ Accès au portail ──────────────┐
        │  ↻  Renvoyer le lien            │
        │  ⧉  Copier le lien              │
        │  ⏱  Lien à usage unique (24 h)  │
        │  ⊘  Révoquer l'accès            │
        ├─ Fin de parcours ───────────────┤
        │  ⏸  Clôturer le suivi           │
        │  ✕  Effacer définitivement      │
        └─────────────────────────────────┘
```

Les actions de fin de parcours sont dans le même menu, **séparées
visuellement** : on ne les rencontre pas par accident, on sait où les trouver.

**Confirmation asymétrique**, parce que les conséquences le sont :

- **Clôture de suivi** — réversible. Une confirmation simple, qui énonce ce qui
  s'arrête et ce qui reste.
- **Effacement** — irréversible. Confirmation renforcée : elle **nomme le
  patient concerné**, **liste ce qui est détruit**, **liste ce qui subsiste** (le
  résidu de D6), et demande un geste délibéré qu'un clic distrait ne produit pas.

Accessibilité : le menu est un composant clavier complet (ouverture, parcours,
échappement), cibles ≥ 44×44 px, aucune action signalée par la seule couleur —
invariants du registre, non négociables ici.

## Questions ouvertes — à trancher avant le lot concerné

1. **L'e-mail dans le résidu.** Question posée le 2026-07-21, **restée sans
   réponse**. Le supprimer rend l'effacement réel mais définitif : la personne
   qui revient repart d'un dossier neuf, et rien ne dit qu'elle était déjà
   passée. Le remplacer par une empreinte permet de reconnaître une
   réinscription, mais un résidu permettant encore de tester « telle adresse
   était-elle en base ? » se défend mal comme un effacement. **Bloquant pour le
   lot effacement.**
2. **Obligation de conservation.** Le RGPD (art. 17.3) permet de refuser un
   effacement lorsqu'une obligation légale de conservation s'applique. Elle vaut
   pour un dossier de soin ; Wellneuro se positionne en bien-être et suivi.
   **Question pour un conseil qualifié, pas pour l'assistant.**
3. **Sort des 13 accès portail ouverts** à la bascule vers le compte. Personne
   ne doit se retrouver dehors — même exigence de coexistence que pour G4.
4. **Google devient sous-traitant sur les patients**, et non plus sur le seul
   praticien. À porter à la liste du registre (`GATES_GO_NO_GO.md:9`) et à
   mettre en regard de l'objectif de réduction d'exposition.

## Risque de conception identifié

**Deux surfaces d'authentification dans le même NextAuth** : l'une restreinte à
`@wellneuro.fr` (praticien, `lib/auth.ts:26-33`), l'autre ouverte (patient). Une
erreur de configuration ferait entrer un patient dans le tableau de bord
praticien.

Cela se maîtrise, et se décide dès le départ : séparation stricte du rôle dans
le jeton, et **un test qui échoue** si un compte hors `@wellneuro.fr` atteint
`/dashboard`. À écrire avant la première ligne d'authentification patient, pas
après.

## Ce que la campagne ne possède pas

- Le contenu de l'espace patient (SP-SPI).
- L'authentification praticien, qui ne bouge pas.
- L'hébergement et la question HDS — sujet distinct, instruit le 2026-07-21,
  qu'aucun lot d'ici ne règle.
- La suppression du lien magique : il **devient** le second chemin
  d'authentification, il ne disparaît pas.

## Esquisse de lots

Ordre proposé, du plus contraint au plus large. Chaque lot est livrable et
réversible seul.

- **LOT-01 — Cycle de vie du dossier.** Clôture de suivi et effacement réel,
  refus portés par les routes, menu regroupé, confirmations asymétriques.
  Dépend de la question ouverte 1. C'est le lot qui met le produit en accord
  avec ce qu'il promet déjà.
- **LOT-02 — Compte patient, second chemin.** Le lien magique devient un moyen
  de connexion à un compte, plus un porteur d'accès. Aucune suppression du
  chemin existant.
- **LOT-03 — Google comme premier chemin**, avec la séparation stricte des rôles
  et son test de non-régression.
- **LOT-04 — Retrait du jeton permanent**, une fois les 13 accès migrés et
  seulement alors. Migration destructive sur `patients.access_token` : décision
  distincte, confirmation explicite.

## Vérification attendue

T1 après chaque édition ; T2 avant tout commit d'UI ; **T3 complet** pour tout
lot portant migration. Tests spécifiques attendus : refus serveur sur dossier
clos (assignation et envoi de document), effacement laissant exactement le
résidu de D6 et rien d'autre, et un compte hors domaine praticien refusé au
tableau de bord.

## Raccordement

- Campagne précédente : `2026-07-19-idp-identite-patient-durable` (G4, livré et
  activé le 2026-07-21).
- Gate : `2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`,
  exigences 2 et 4.
- Invariants : `docs/claude/REGISTRE_FRONTIERES.md` §1.

> L'enregistrement de cette campagne dans `.wn/state.json` et
> `ACTIVE_CAMPAIGN.md` est **volontairement laissé à la session de gouvernance**,
> qui a réaligné l'état machine le 2026-07-21 (#185).
