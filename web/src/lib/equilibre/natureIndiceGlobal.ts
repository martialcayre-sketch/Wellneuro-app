// LA NATURE DU TOTAL DE « MON ÉQUILIBRE », DITE UNE FOIS — [[D-106]], `DC-22`.
//
// `DC-22` pose que la question précède le calcul : *existe-t-il une
// interprétation clinique du total ?* Le LOT-07 de « Doctrine exécutable » l'a
// posée au praticien avec sa mesure, et l'arbitrage du 2026-08-24 est :
// **NON — le total n'a pas d'interprétation clinique, et il le dit.**
//
// Il n'est donc pas retiré. Il reste un REPÈRE DE SUIVI, identifié comme tel
// (`DC-20` : un chiffre purement technique doit être identifié comme tel). Ce
// que l'arbitrage interdit n'est pas de l'afficher — c'est de le laisser passer
// pour ce qu'il n'est pas.
//
// CE QUE LA MESURE AVAIT ÉTABLI, et qui a rendu l'arbitrage décidable :
//   — AUCUN CONSOMMATEUR NE LE LIT. La formulation demande de la précision, et
//     une première rédaction se l'était épargnée : `GLOBAL_BALANCE` n'est PAS
//     un simple code de vocabulaire — `clinicalSnapshot.ts:209` l'émet comme un
//     `ClinicalObjectFinding` PORTANT LA VALEUR MESURÉE, qui entre donc dans le
//     snapshot figé et dans son empreinte. Ce qui est vrai, et qui suffit :
//     **rien ne le consomme**. Tous les producteurs de constats émettent
//     `clinicalObjectCodes: []` (`chaineC1.ts:506`, `clinicalReview.ts`,
//     `safetyFindings.ts`), et les consommateurs ne lisent que
//     `balanceAssessment.needs`. Seule exception, et elle ne lit pas la valeur :
//     `clinicalSnapshot.ts:273,277` teste la NULLITÉ de `scoreGlobal` pour
//     peupler `availableDomains` / `missingDomains`. Le total ne déclenche rien.
//   — LE PATIENT NE VOIT PAS LE NOMBRE (`showValue={false}`) ; le praticien,
//     lui, le voit.
//   — MAIS SA VARIATION EST UN SIGNAL PRÉSENTÉ AUX DEUX. C'est le point qui
//     obligeait à trancher : si le total n'a pas de sens clinique, la variation
//     de ce total n'en a pas non plus — et c'est ELLE, pas lui, que le patient
//     lisait.
//
// CE MODULE N'IMPORTE RIEN, et c'est une propriété : il est atteint par des
// composants `'use client'` des deux surfaces. Un import de valeur depuis un
// module qui tire `node:crypto` embarquerait le moteur dans le bundle — le
// défaut que `bundleClient.guard.test.ts` ferme pour `lib/clinical`.

/**
 * La mention servie AU PRATICIEN partout où le NOMBRE est affiché.
 *
 * Le patient ne la reçoit pas, et ce n'est pas un oubli : il ne voit aucun
 * chiffre — sa jauge est servie `showValue={false}`. Lui servir « pas un score
 * clinique » l'obligerait à démentir un score qu'il n'a jamais lu. Ce qu'il
 * reçoit, lui, ce sont les libellés ci-dessous, qui nomment l'objet.
 */
export const MENTION_NATURE_INDICE_GLOBAL = 'Repère de suivi, pas un score clinique';

/**
 * Les trois libellés de tendance servis AU PATIENT.
 *
 * CE QU'ILS CORRIGENT, et c'est UN SEUL des trois : le libellé de hausse disait
 * « **En progression** depuis votre dernier bilan ». « Progression » affirme une
 * amélioration — c'est-à-dire exactement l'interprétation CLINIQUE que
 * l'arbitrage vient de refuser au total. Il devient « en hausse », le même
 * vocabulaire neutre que les surfaces praticien emploient déjà
 * (`TrajectoirePanel`, `J21DecisionPanel`), et il nomme l'objet qui varie.
 *
 * L'ASYMÉTRIE DES TROIS EST DÉLIBÉRÉE ET ANTÉRIEURE — à conserver, pas à
 * corriger. La doctrine « construction, jamais dégradation » (SP-CONV LOT-05,
 * `D7`, gardée par `gamification-patient.guard.test.ts`) veut qu'une évolution
 * défavorable ne soit **jamais annoncée comme une chute** : la baisse garde donc
 * sa formulation d'origine, qui ne nomme pas la direction et tend la main au
 * praticien. Symétriser les trois « pour la cohérence » aurait cassé une règle
 * en croyant en servir une autre.
 *
 * LE NOM SERVI AU PATIENT EST CELUI QU'IL VOIT. « Votre indice "Mon équilibre" »
 * et non « votre repère de suivi » : la première rédaction employait un terme
 * qui n'est défini nulle part côté patient, et — pire — le même mot désignait
 * DEUX objets dans le même widget (« votre repère de suivi » = le total,
 * « des repères ont évolué » = les besoins). La jauge est étiquetée « Mon
 * équilibre » à l'écran ; le libellé s'y adosse.
 *
 * CE MODULE EST HORS DE `components/patient`, et c'est un risque qui a failli
 * passer : le garde de gamification ne balaie que des chemins déclarés. Sortir
 * un texte patient de `components/patient` sans l'inscrire dans
 * `SURFACES_PATIENT` le mettrait hors de portée du garde. L'entrée a été
 * ajoutée — et il a fallu d'abord RÉPARER le garde, qui rendait `[]` sur tout
 * chemin de fichier (`readdirSync` lève `ENOTDIR`) : les entrées de fichier y
 * étaient des no-op, `rappelPortail.ts` compris.
 */
export const TENDANCE_INDICE_GLOBAL_PATIENT: Record<'hausse' | 'stable' | 'baisse', string> = {
  hausse: 'Votre indice « Mon équilibre » est en hausse depuis votre dernier bilan',
  stable: 'Votre indice « Mon équilibre » est stable depuis votre dernier bilan',
  baisse:
    'Des repères ont évolué depuis votre dernier bilan — votre praticien les regarde avec vous',
};
