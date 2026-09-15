# Handoff — 2026-09-16 — La contre-revue adverse, et les quatre défauts qu'elle a sortis

Lot **non prévu au cadrage**, né de la revue elle-même — comme le LOT-12 de « Doctrine
exécutable » en son temps.

## Ce qui a été fait, et pourquoi avant la clôture

Vingt-six affirmations portantes de la campagne « 5. Actions » ont été soumises à
**réfutation** par quatre relecteurs indépendants, en lecture seule, avec pour consigne de
conclure « réfuté » faute de preuve. Patron `D-108` : *la revue a été lancée avant la
clôture, et c'est ce qui a payé* — un lot de clôture ne change aucun code, il **grave**.

**Six réfutées, trois vraies seulement bornées, dix-sept confirmées.** Le taux est celui
de `D-108` (7 sur 13).

## Les quatre défauts réels, tous vivants en production

1. **Le refus de registre était invisible sur le chemin de révision.** L'alerte et son
   bouton vivent dans le constructeur, masqué hors de la sous-vue « protocole » ; le geste
   part de « biologie ». Le praticien cliquait, rien ne se passait. **Défaut du booklet à
   l'identique**, que `D-189` §4 déclarait non négociable.
2. **`POST /api/praticien/protocoles`** : aucun appelant, authentifiée, sans drapeau,
   acceptant un protocole entier fabriqué par le client avec son propre `inputHash`, hors
   garde de registre. **Retirée.**
3. **`adviceSheetRef`** : texte libre accepté du client, projeté jusqu'au navigateur du
   patient, hors garde, rendu par aucun écran. **Fermé à l'écriture.**
4. **Le carnet affirmait « Aucun protocole diffusé »** sur un protocole diffusé mais
   inservable. Corrigé ; et le miroir juge désormais les **deux** causes de refus par la
   même fonction que le portail (`vuePatientOuRefus`).

## Ce qui a été laissé, sur arbitrage

Le compte transitoire de la suggestion de charge : une action pas encore typée est écartée
du comptage, donc l'écran peut afficher « Deux actions engagées » sur un brouillon qui en
porte trois. État transitoire, corrigé à la frappe suivante. **Arbitré, non subi.**

## La leçon de méthode, et elle n'est pas mince

**Toutes les réfutations portaient sur des phrases écrites par l'outil, pas sur du code
cassé.** « `purpose` ne traverse plus en texte libre » décrivait le *plan d'origine* alors
qu'un arbitrage l'avait déplacé ; « `adviceSheetRef` est mort de bout en bout » confondait
**non alimenté** et **fermé**. Une prose fausse au dossier devient la référence de la
session suivante. C'est ce que la revue achète, et ça vaut son prix.

## Vérifications

T1 vert, T3 vert. Deux mutations vues ROUGES avant tout vert, restaurées depuis une copie.

## État de la campagne

Huit lots livrés + LOT-08. **Le créneau primaire reste vide par décision** : rien ne
s'ouvre avant que l'usage soit mesuré en production (`D-112`, appliqué). La requête de
comptages est écrite et vérifiée contre `schema.prisma` ; elle attend une **session hors
mode auto** — le classifieur refuse la forme de la commande, pas son contenu.

Reste aussi dû, et arbitré : remettre d'aplomb les trois campagnes de juillet encore
`en_cours` (IDP2 clôturable, JA avec un LOT-05 réellement inachevé, C4 jamais commencée).
