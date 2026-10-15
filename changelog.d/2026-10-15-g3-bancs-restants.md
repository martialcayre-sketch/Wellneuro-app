### Tests : deux courses de plus au banc de la file des lectures (D-282 §9, 2026-10-15)

Tests seuls, aucun code de production modifié. Le banc à deux sessions de la
file des lectures biologiques (`banc-file-extraction-deux-sessions.test.ts`)
joue les deux cas laissés par la revue du 2026-10-13 :

- **9 bis** : l'enregistrement des lignes d'une lecture tient déjà le dossier
  quand l'effacement réel part. Les deux aboutissent, sans interblocage : les
  lignes sont écrites, puis emportées avec le dossier.
- **10** : la désactivation d'un dossier contre une demande de lecture, dans
  les deux sens. Une désactivation en vol fait refuser la demande
  (`dossier_clos`) ; une demande en vol fait refuser la désactivation, et le
  dossier reste actif.
