### fix(inbox): réinitialise l'état retrait au changement de patient et à la fermeture du détail (2026-08-11)

L'état local `retrait` (motif + erreur) n'était jamais remis à zéro lorsque le
praticien changeait de patient ou fermait la dialog de détail. Un motif ou une
erreur "fantôme" pouvait donc réapparaître au ré-affichage. L'état est maintenant
réinitialisé dans `ouvrirDetail`, à la fermeture via `onOpenChange`, et après la
confirmation de lecture réussie.
