### Le cockpit reprend, amende ou écarte une proposition d'objectif (2026-08-25)

Alliance 6.0-B, LOT-03. Le praticien voit ce que Wellneuro peut citer, chaque
phrase avec sa provenance — mots du patient à l'anamnèse, restitution
d'instrument certifié, règle signée avec le SHA de son périmètre, montré en
entier. Il reprend une citation, l'amende de sa reformulation et de sa
priorité, ou l'écarte avec un motif. Derrière le drapeau `WN_OBJECTIF_PROPOSE`,
éteint.

**`enoncePatient` n'est jamais transmis, ni pour une révision ni pour une
reprise** : l'écran DÉSIGNE le fragment, le serveur le RECOPIE. Un fragment qui
n'est pas un verbatim d'anamnèse est refusé (`422`) — le libellé d'une règle
signée est une parole de la machine, le déposer là ferait dire au patient ce
qu'il n'a pas dit, avec l'apparence d'une citation. C'est ce qui rend
l'invariant de [[D-094]] opposable plutôt que promis.

**Reprendre écrit deux lignes dans une seule transaction** : l'objectif porte
le lien, la disposition porte le geste. Les séparer laisserait soit une reprise
sans objectif — un praticien ayant repris ce qui n'existe pas —, soit un
objectif se réclamant d'une proposition encore servie comme vivante. Une
proposition caduque ne se reprend plus (`409`), une proposition déjà tranchée
non plus.

**Le déclencheur d'assemblage a demandé un arbitrage.** Vérification faite :
`GET /cockpit` ne rend jamais `ready`, le `POST` qui produit la carte de
décision n'écrit rien, et la carte n'est persistée nulle part. Elle n'existe
donc que dans le navigateur, entre la confirmation d'épisode et le rechargement
suivant — c'est la raison d'être de la table `propositions_objectif`. La
section clinique enchaîne donc l'assemblage sur sa réponse `ready` ; son échec
ne fait jamais échouer la confirmation. La réponse porte désormais le SHA du
périmètre signé, à côté de la carte et jamais dedans, lu à travers
`tablePrioritesSignee()`.

**Deux défauts trouvés par les paliers, invisibles de `tsc`.** La garde de
fraîcheur de la matrice de consommation a refusé un import de la table signée
dans un composant `'use client'` — il aurait embarqué ses 667 lignes dans le
bundle du navigateur pour une seule chaîne. Puis T2 a fait échouer la
construction de production : le moteur de proposition mêlait un domaine pur et
un hachage `node:crypto`, si bien que le panneau tirait le second en ne voulant
du premier qu'une borne de longueur. Le découpage suit désormais la dépendance
réelle, et la pureté du domaine est un invariant asserté — le module n'importe
rien, et une garde le vérifie avant le build.

Écarté : afficher un compteur de propositions reprises ou écartées.
L'adhésion se constate, elle ne se compte pas.
