### Cockpit — la phrase de reprise cesse d'attribuer au praticien une priorité qu'il n'a pas choisie (2026-09-14)

**Une phrase fausse, vérifiée avant d'être corrigée (`D-184`).** Sous un objectif repris
d'une proposition citée, le cockpit praticien affichait : « Repris d'une proposition
citée — la reformulation **et la priorité** ci-dessus sont les vôtres. » Elle s'armait
sur le seul `sourcePropositionId`. Or les deux marques sont indépendantes :
`constaterProvenance` pose `prioriteSource: 'proposition_ia'` quand la priorité
enregistrée est celle de l'appel mot pour mot (`D-167` §6), et les deux colonnes peuvent
être renseignées ensemble. Dans ce cas, la phrase affirmait au praticien qu'il avait
choisi une priorité que le modèle avait écrite.

**Le destinataire aggrave, il n'atténue pas.** Le panneau vit dans `FichePatientPanel`,
le cockpit **praticien** : c'est à l'auteur qu'on affirmait à tort ce qu'il avait écrit.
`DC-16` pose qu'une production du modèle ne partage jamais le statut de ce que le
praticien a posé.

**La colonne était écrite et servie à personne.** `SELECTION_OBJECTIF` ne demandait pas
`priorite_source` : l'écran n'avait aucun moyen de savoir. Pas une erreur de rédaction,
un maillon manquant — la forme que `DC-01` traite comme invalidante.

**Ce qui entre au contrat exposé, et ce qui n'y entre pas.** `prioriteSource` est une
marque de provenance : `'proposition_ia'` ou `null`, jamais un degré, jamais un rang.
Son voisin de base `priorite_source_rang` **reste dehors** — c'est un ordre de tirage,
donc exactement ce qu'un écran pourrait transformer en classement (`DC-19`/`DC-20`). Une
assertion négative le tient, à côté de celle qui exige la présence. Le banc
`objectifNegocie.guard.test.ts` épingle l'ensemble des clés exposées et a **rougi à la
compilation** : c'est lui qui a fait de cet ajout une décision plutôt qu'un geste.

**Les trois littéraux de provenance sont désormais nommés une fois.** `'ce_qui_compte'`,
`'synthese_ia'` et `'proposition_ia'` vivaient en dur dans `provenanceVerifiee.ts`, qui
importe `@/lib/prisma` — un composant client ne peut pas l'importer sans traîner le
client de base dans le paquet du navigateur. Un module pur `marquesProvenance.ts` les
porte, et les deux côtés le lisent.

**Une mutation survivante a payé le second banc.** Le banc du panneau simule `fetch` : la
mutation qui fait servir `null` par la route l'a laissé vert. Un banc de route tient donc
la moitié de chaîne qu'il ne peut pas voir, et la mutation rejouée le rouge. Trois
mutations au total, trois tuées — dont une par le compilateur, la sélection Prisma.

**Ce que ce lot ne fait pas.** Il ne compte rien : le panneau porte déjà « aucun compteur,
aucun taux : l'adhésion se constate, elle ne se compte pas », et servir la marque ne
l'entame pas. Et il ne réécrit aucun objectif existant — leurs marques restent telles
quelles, c'est leur affichage qui cesse de mentir.
