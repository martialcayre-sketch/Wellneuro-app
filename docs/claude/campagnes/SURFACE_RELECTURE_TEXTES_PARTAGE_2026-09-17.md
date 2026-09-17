# Surface de relecture — les quatre textes patient du partage médecin

*Écrite le 2026-09-17, en exécution des arbitrages rendus en session sur les
réserves de `D-222` §3. **Ce document ne publie rien.** Il présente côte à côte
ce que le patient lisait, ce qu'il lira, et ce qui a été écarté.*

## LE FAIT QUI DOIT ÊTRE SU AVANT DE RELIRE

La phrase corrigée n'est pas seulement inexacte : elle était **publiée dans
quatre endroits, dont deux que `D-222` n'avait pas vus** — le texte du
consentement lui-même, et la prose en dur de l'écran qui fait *accuser
réception*. Un patient a donc pu reconnaître par écrit une phrase fausse.

Et le remplacement ne vient pas seul : une **garde** ferme désormais ce que la
phrase prétendait fermer. Les textes ci-dessous décrivent un comportement réel,
pas une intention.

---

## 1. `donnees_confidentialite@v9` — « Qui peut accéder à vos données ? »

**Avant** (v1 → v8, écrite le 2026-07-16, reprise par composition sept fois) :

> Aucun partage avec un tiers (par exemple votre médecin traitant) n'a lieu sans
> un choix explicite de votre part.

**Après** (deux paragraphes, séparés pour que l'exception ne se cache pas dans
une subordonnée) :

> L'application n'envoie rien à un tiers : elle ne dispose d'aucun canal vers un
> médecin. Tout document transmis à un médecin l'est par votre praticien, par ses
> propres moyens, et sous sa responsabilité professionnelle.
>
> Votre choix est enregistré et lui est présenté dans votre dossier : il
> l'engage. Il peut toutefois exister une situation où votre sécurité lui impose
> d'écrire à un médecin malgré votre refus — lorsqu'un signe repéré dans votre
> suivi l'exige. Il vous en informe alors.

**Accusé exigé.** Deuxième version de confidentialité à le faire après la v8, et
pour un motif inverse : la v8 déclarait des données **nouvelles**, la v9 corrige
ce que le patient **croyait** que son refus produisait.

## 2. `donnees_confidentialite@v9` — le paragraphe de la veille

**Avant** (v8, publiée le 2026-09-16 — un jour après que la lettre d'adressage
l'eut rendue fausse) :

> Noter le nom de votre médecin traitant ne veut pas dire lui écrire. Rien ne lui
> est adressé sans un choix explicite de votre part, comme le rappelle « Qui peut
> accéder à vos données ? ».

**Après** :

> Noter le nom de votre médecin traitant ne veut pas dire lui écrire.
> L'application ne lui adresse rien elle-même ; ce que votre praticien choisit de
> lui transmettre relève de sa pratique, et « Qui peut accéder à vos données ? »
> dit dans quelles conditions.

## 3. `consentement_suivi@v3` — « Ce à quoi vous consentez »

**La pièce que `D-222` §3 n'avait pas vue**, et la plus engageante des quatre :
c'est le texte présenté **au moment du consentement**.

**Avant** :

> Vos données sont réservées à votre praticien et aux prestataires techniques qui
> font fonctionner l'application. Elles ne sont ni vendues, ni partagées avec un
> tiers sans un choix explicite de votre part.

**Après** :

> Vos données sont réservées à votre praticien et aux prestataires techniques qui
> font fonctionner l'application. Elles ne sont jamais vendues. L'application ne
> les partage avec aucun tiers : si un document doit parvenir à un médecin, c'est
> votre praticien qui le transmet, par ses propres moyens et sous sa
> responsabilité. Votre choix lui est présenté et l'engage ; il peut s'en écarter
> lorsque votre sécurité l'exige, et il vous en informe alors.

**Les consentements v2 restent valides** — arbitrage explicite, même régime que
celui écrit dans la v2 pour les consentements v1. **Pas d'accusé propre** : la
séquence ne présente pas ce document, et en exiger un ferait boucler le patient
sur quatre écrans (`avantDeCommencer.ts` porte le piège en toutes lettres). Le
fait étant le même, il est reconnu une fois, sur l'écran 3.

## 4. L'écran 3 de « Avant de commencer » — la prose qu'on fait signer

**Avant** : l'écran affirmait la phrase de la v8 — « Rien ne lui est adressé sans
un choix explicite de votre part » — et le bouton final faisait **accuser
réception** de cette affirmation.

**Après**, paragraphe ajouté sous celui des renseignements administratifs :

> L'application n'envoie rien à un médecin : si un document doit lui parvenir,
> c'est votre praticien qui le transmet, et votre choix l'engage. Une seule
> situation s'en écarte — lorsqu'un signe repéré dans votre suivi impose d'écrire
> à un médecin pour votre sécurité ; votre praticien vous en informe alors.

## 5. « Mes choix » — l'effet du refus

**Avant** :

> Aucun document ne sera partagé. Votre accompagnement continue normalement.

**Après** :

> Votre praticien ne pourra pas préparer de courrier pour votre médecin depuis
> Wellneuro, ni y consigner un échange. Une seule situation s'en écarte :
> lorsqu'un signe repéré dans votre suivi impose d'écrire à un médecin pour votre
> sécurité — il vous en informe alors. Votre accompagnement continue normalement.

**CE TEXTE A CHANGÉ DEUX FOIS DANS LA JOURNÉE, et la relecture doit le savoir.**
La première rédaction, validée en session, décrivait une **retenue déontologique**
(« votre praticien en est informé et s'y tient »). L'arbitrage de la portée —
rendu ensuite — a créé une **garde logicielle** : le texte ci-dessus dit ce que le
logiciel fait, et non ce que le praticien s'engage à faire. Garder la première
rédaction aurait sous-décrit la garde.

---

## Ce qui a été écarté, et pourquoi

- **Taire l'exception** pour garder une phrase forte : elle re-promettrait une
  garde absolue que la lettre d'adressage contredit. C'est exactement le défaut
  que ce lot ferme.
- **Un quatrième écran d'accusé** pour `consentement_suivi` : le module de la
  séquence en nomme le piège — une porte qui exige un accusé que la séquence
  n'enregistre pas fait boucler le patient sans fin.
- **Re-recueillir les consentements** : ce qui change est l'exactitude d'une
  phrase sur ce que le produit garantit, pas l'objet du consentement.
- **Discriminer par destinataire** (bloquer vers le médecin traitant, laisser
  passer vers un autre médecin) : aucun champ ne le porte. `medecinLibelle` est du
  texte libre sur tous les chemins d'écriture, sans rattachement à
  `medecinTraitantNom`. Le discriminant retenu est **la route**.

## Ce que cette surface ne couvre pas

La **qualification juridique** du traitement, qui appartient au responsable
(`D-222` §2), et l'opportunité d'informer les patients déjà consentants
autrement que par l'accusé de la v9.
