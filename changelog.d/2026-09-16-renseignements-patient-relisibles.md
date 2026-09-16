### Ce que le patient écrit à l'ouverture de son espace devient enfin lisible par son praticien (2026-09-16)

Le patient remplit une **fiche signalétique** puis une **anamnèse** — sept
sections, une quarantaine de questions — quand il entre dans son espace. Les
deux sont stockées en JSON sur `consultations` depuis toujours.

**AUCUNE SURFACE PRATICIEN NE LES LISAIT.** Recherche exhaustive dans `web/src` :
seule `lib/synthese/generation.ts` y touchait, pour fabriquer un texte. Trois
champs affleuraient dans le panneau d'objectif négocié — motif principal,
objectif prioritaire, contraintes. Le reste était écrit, conservé, et invisible.
Le praticien ne pouvait pas relire ce que son patient lui avait écrit.

**LA ROUTE EXISTAIT DÉJÀ, ET N'AVAIT AUCUN APPELANT.**
`GET /api/praticien/consultations` chargeait les lignes entières, journalisait
déjà l'accès au dossier — et jetait la fiche, l'anamnèse et le consentement au
mapping. Servir les trois a tenu en quelques lignes ; aucune route neuve.

**`null` ET `{}` NE DISENT PAS LA MÊME CHOSE**, et l'écran doit pouvoir les
distinguer : `null` = rien n'a jamais été déposé ; `{}` = un dépôt a eu lieu
dont la normalisation n'a rien retenu. Le normaliseur, appelé sur `null`, rend
précisément `{}` — d'où un test AVANT l'appel, et deux bancs qui le tiennent.

**LE TIROIR NE SUFFIT PAS, ET C'EST LE POINT.** Le détail vit dans un instrument
« Renseignements du patient » — dix sections ne s'empilent pas dans une zone
focale. Mais une **ligne d'état permanente** dit, sans rien ouvrir, ce qui
existe et depuis quand : sans elle, un dossier sans anamnèse se lirait exactement
comme un dossier dont personne n'a pensé à ouvrir le tiroir. Un dépôt partiel se
dit partiel — l'absence d'anamnèse est **écrite**, pas tue.

**CE PANNEAU AFFICHE, IL NE CALCULE RIEN** (`DC-19`, `DC-20`) : aucun décompte,
aucune synthèse, aucun rapprochement entre deux réponses. Un champ posé mais non
répondu est **dit** « non renseigné » plutôt que masqué — le praticien doit
distinguer « la question a été posée et le patient n'a pas répondu » de « la
question n'existe pas » (`DC-24`).

**LES LIBELLÉS VIENNENT DES DESCRIPTEURS, JAMAIS D'UNE COPIE.** Ceux de
l'anamnèse ne sont pas décoratifs : `orientationRulesV1.ts` les apparie
**verbatim**, et deux bancs l'exigent. Le panneau les lit ; il n'en écrit aucun.

**UN DÉFAUT ATTRAPÉ EN CHEMIN, ET IL DÉPASSAIT CE PANNEAU.** Une réponse 200
d'une forme autre que promise posait `undefined` dans l'état, et la ligne
d'état faisait tomber **le cockpit entier** — rail des sept phases compris. Le
type disait « tableau », le runtime disait autre chose, personne ne vérifiait.
La forme est désormais vérifiée, et une réponse qui ne tient pas sa promesse est
une **erreur**, jamais une absence de renseignements.

Le **consentement** de la consultation — sa valeur, sa version, sa date — devient
lisible au passage : il ne l'était sur aucune surface praticien.
