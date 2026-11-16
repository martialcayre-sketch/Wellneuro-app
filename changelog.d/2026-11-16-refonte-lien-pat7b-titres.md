### Refonte Lien, PAT-7b : titres du portail patient — un `h1` par page, titre présent dans tous les états (2026-11-16)

Premier lot de correction issu du constat de PAT-7 en partie
(`pat7-constat-partiel.md` §3.3), sur le choix du responsable du
2026-11-16 (« 7b et 7c d'abord »). Aucun texte neuf : chaque titre est celui
que la page portait déjà.

- « Pour votre médecin », « Courrier pour votre médecin » et « Courrier à
  remettre à votre médecin » (U30 à U32) : le titre de la page, en `h1`,
  s'affiche aussi pendant le chargement, en cas d'erreur et quand aucun
  document n'est remis. Il n'apparaissait qu'avec un document.
- Questionnaire (U11, U12) : « Avant de commencer » passe en `h2`, sous le
  titre du questionnaire, seul `h1` de la page.
- Hub : « Votre accompagnement » passe en `h2`, sous « Mon parcours », dans
  tous ses états. Les deux titres rétrogradés prennent la taille d'un `h2`
  du portail (18 px au lieu de 24).

Aucune route, garde, drapeau, schéma ni règle clinique modifiés ; aucun texte
de consentement, de droits ni de sécurité modifié ; aucun décor avant COM-1.
