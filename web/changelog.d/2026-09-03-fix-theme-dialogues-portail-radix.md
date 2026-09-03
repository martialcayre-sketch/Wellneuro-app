## 2026-09-03 — fix(cockpit) : les confirmations de fin de parcours retrouvent le thème praticien

`DossierConfirmDialog` (effacement, clôture, révocation…) et
`AnnulationAssignationDialog` rendaient aux couleurs du portail patient :
Radix portale leur contenu vers `document.body`, hors du conteneur
`[data-theme="praticien"]` posé par `dashboard/layout.tsx`, et les tokens de
`globals.css` retombent alors sur le défaut patient. C'étaient les deux
derniers dialogues Radix du cockpit sans le correctif déjà appliqué partout
ailleurs (`NavBar`, `PatientsPanel`, `PanneauSuperpose`…) : `data-theme`
re-posé sur `Dialog.Overlay` et `Dialog.Content`. Banc de régression ajouté
sur le dialogue d'effacement, sur le modèle de celui de `PanneauSuperpose`.
