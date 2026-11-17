# Texte 2B neuf — l'accompagnement avant 18 ans, pour le jeune (D-537 §7)

- Date : 2026-11-17
- Statut : **validé par le responsable le 2026-11-17, mot pour mot**, en
  session (question `20261117-1346-c` de la liste commune), puis retouché sur
  deux phrases après la relecture du lot et revalidé mot pour mot (question
  `20261117-1919-c`) :
  - « Ils n'ont pas accès à cet espace » devient « Wellneuro ne leur ouvre
    pas d'accès à cet espace » : un parent qui aurait créé le dossier avec
    sa propre adresse lirait une phrase fausse ([[D-537]] §2 dit « aucun
    accès automatique ni permanent ») ;
  - « et rien ne te sera demandé ici » est retiré de la variante des moins
    de 15 ans : l'accusé « Avant de commencer » précède cet écran.

  Texte proposé par l'assistant (file C, lot `texte-2b-neuf`).
- Remplace le texte « 2B — Pour le jeune » validé le 2026-10-14
  (`docs/claude/propositions/2026-10-14-g11-textes-patient/README.md`), dont
  deux passages ne disaient plus la règle : « l'un de tes parents » (contraire
  à [[D-537]] §1) et « Ce n'est pas secret pour tes parents » (contraire à
  [[D-537]] §2).
- Servi par `web/src/lib/patient/texteMineurs.ts`, que le banc
  `texteMineurs.test.ts` compare à ce document, section par section.

## Règles suivies

1. Deux variantes. Seule la première section diffère : moins de 15 ans, aucun
   circuit d'admission ([[D-537]] §4) ; de 15 à 17 ans, le circuit à venir est
   annoncé sans être promis, avec l'accord des titulaires de l'autorité
   parentale (les deux, tant que l'« acte usuel » n'est pas qualifié, §1 et
   §9) et celui du jeune (H1), qu'il peut retirer (H3).
2. Il explique la pause et ce qui reste ouvert.
3. Il nomme l'IA, et dit que le masquage n'est pas une anonymisation.
4. Il ne promet ni une confidentialité absolue, ni un accès intégral des
   parents ; aucun accès parent au portail n'existe ([[D-537]] §2).
5. « Ton avis compte » et l'encart d'urgence (15, 112, 119) sont repris mot
   pour mot du texte du 2026-10-14. L'encart reste le seul servi au mineur
   dont le dossier est clos ([[D-341]] §5 ; [[D-537]] §8).
6. Le texte **tutoie** le jeune, comme le précédent.

---

### 2B — Pour le jeune, moins de 15 ans

**Avant 15 ans, l'accompagnement ne se fait pas ici**

Pour l'instant, cet espace n'accompagne pas les personnes de moins de 15 ans. Les questionnaires restent en pause. Tu peux en parler avec le praticien.

**Ton avis compte**

Le praticien t'explique ce qu'il propose, et tu peux poser toutes tes questions. Tu peux aussi dire ce que tu ne veux pas.

**Ce que tes parents peuvent savoir**

Tes parents peuvent demander des informations sur ton dossier. Le praticien examine chaque demande, en tenant compte de ton âge, de ta vie privée et de ton intérêt. Wellneuro ne leur ouvre pas d'accès à cet espace. Personne ne peut te promettre que tout restera secret, ni que tout leur sera montré.

**L'intelligence artificielle**

Pendant l'accompagnement, certains documents sont préparés avec l'aide d'un outil d'intelligence artificielle, à partir de tes réponses. Le praticien relit chaque document avant qu'il te parvienne. Même quand ton nom est masqué, ce qui reste parle de ta santé : masquer ne rend pas anonyme.

**En cas d'urgence**

Si tu te sens en danger ou très mal, n'attends pas de réponse ici : appelle le 15 ou le 112. Si quelque chose t'inquiète à la maison ou ailleurs, tu peux aussi appeler le 119 (Allô enfance en danger), gratuit, jour et nuit.

### 2B — Pour le jeune, de 15 à 17 ans

**Avant 18 ans, ton accompagnement attend encore**

Pour l'instant, l'accompagnement ne s'ouvre pas encore ici avant 18 ans, et les questionnaires restent en pause. Quand il s'ouvrira, il faudra l'accord des personnes qui exercent l'autorité parentale sur toi (le plus souvent tes deux parents), et le tien aussi. Tu pourras ensuite retirer ton accord quand tu veux.

**Ton avis compte**

Le praticien t'explique ce qu'il propose, et tu peux poser toutes tes questions. Tu peux aussi dire ce que tu ne veux pas.

**Ce que tes parents peuvent savoir**

Tes parents peuvent demander des informations sur ton dossier. Le praticien examine chaque demande, en tenant compte de ton âge, de ta vie privée et de ton intérêt. Wellneuro ne leur ouvre pas d'accès à cet espace. Personne ne peut te promettre que tout restera secret, ni que tout leur sera montré.

**L'intelligence artificielle**

Pendant l'accompagnement, certains documents sont préparés avec l'aide d'un outil d'intelligence artificielle, à partir de tes réponses. Le praticien relit chaque document avant qu'il te parvienne. Même quand ton nom est masqué, ce qui reste parle de ta santé : masquer ne rend pas anonyme.

**En cas d'urgence**

Si tu te sens en danger ou très mal, n'attends pas de réponse ici : appelle le 15 ou le 112. Si quelque chose t'inquiète à la maison ou ailleurs, tu peux aussi appeler le 119 (Allô enfance en danger), gratuit, jour et nuit.
