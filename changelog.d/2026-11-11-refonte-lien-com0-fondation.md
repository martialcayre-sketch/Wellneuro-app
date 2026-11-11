### Refonte Lien, COM-0 : fondation Empreinte, jetons des deux thèmes (A5-R3, D-481, 2026-11-11)

Lot 1 du cadrage v3 §18. C'est le premier lot de code de la refonte. Il raccorde aux jetons du produit la palette, les polices, la marque et les icônes de l'artefact « Wellneuro Lien — Empreinte », version 4. Aucune migration, aucun drapeau, aucun texte nouveau, aucune route.

- **Jetons.** `globals.css` reçoit la palette brute `--lien-*`. Les deux thèmes partagent désormais :
  - le canvas crème, les surfaces ivoire et l'encre ;
  - le pétrole en primaire et en focus ;
  - l'argile en accent décoratif ;
  - le succès assombri en `#166534`.
- **Menu latéral.** Il change selon le rôle :
  - patient : sauge claire, avec la forme réduite à libellés `rail-patient-compact` (13 rem) ;
  - praticien : nuit pétrole, en aplat uni.
- **Nouveaux jetons.** `accent-ink`, `control-border`, `voice-patient`, `voice-practitioner`, les durées et la courbe `ease-lien`, ainsi que les utilitaires Tailwind qui les servent (`text-accent-ink`, `border-control-border`, `bg-voice-*`, `w-nav-rail-compact`, `duration-*`, `ease-lien`, `font-marque`).
- **Palettes Spirale.** Elles restent définies : les écrans qui les citent par leur nom migrent dans leurs lots.
- **Polices.** Lora est chargée par `next/font` pour les titres patient et le nom de la marque. Le corps patient passe en Instrument Sans. Bricolage Grotesque et Albert Sans ne sont plus chargées : aucun écran ne les citait.
- **Marque.** Nouveau composant `EmpreinteMarque` : un symbole en ligne coloré par les jetons, avec un petit format sous 32 px et le nom « Wellneuro » en Lora. Les fichiers du kit v2.0.0 sont copiés sous `web/public/wellneuro-lien/` :
  - les marques, les ornements, les motifs et les fonds, tous sans texte incorporé ;
  - la provenance et la licence Lucide ;
  - le favicon au petit format.
- **Icônes.** Le trait Lucide de 1,75 px est exporté sous le nom `TRAIT_ICONE`. `PanneauSuperpose` l'adopte ; son surtitre passe en `text-accent-ink`.
- **Barre basse.** Sous 768 px, `html` réserve `scroll-padding-bottom: 5rem`. Un élément amené à l'écran ne finit plus sous la barre basse fixe. Le défaut a été vu par l'E2E `lecture-datee-reflow` (iPhone 13), une fois la hauteur de la page modifiée par les nouvelles polices.
- **Contraste.** Aucun libellé ne reste sur l'argile :
  - les boutons sélectionnés de `DossierDeuxVoixView` et de `ObjectifNegociePanel` passent en `bg-primary text-primary-foreground` ;
  - le lien d'accent de `SynthesePanel` passe en `text-accent-ink`.
- **X07.** La page absente reçoit la marque, un filet `control-border` sur le lien secondaire et une carte `shadow-card`. L'erreur globale, qui s'affiche sans les variables CSS, prend les valeurs Lien en clair.
