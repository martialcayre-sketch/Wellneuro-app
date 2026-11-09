### Questionnaires : la liste déroulante et le champ numérique portent le texte de la question (2026-11-08)

Audit d'interface du 2026-11-07 (constat n° 3, WCAG 4.1.2 et 1.3.1). Dans `QuestionField`, la légende nomme le groupe, pas le champ qu'il contient : le `select` et le champ numérique n'avaient aucun nom accessible propre, et un lecteur d'écran pouvait les annoncer sans la question.

Correctif : la légende reçoit un identifiant unique par `useId`, et ces deux champs s'y relient par `aria-labelledby`. Un test, rouge sans le correctif, vérifie leur nom, y compris quand deux questions sont rendues ensemble.

Démontré dans le code, sans occurrence observée (`D-125`).
