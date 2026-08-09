// Le seed ne peut plus déclarer une certification que le catalogue n'accorde pas.
//
// CE QUE CE BANC FERME (relevé en revue adversariale le 2026-08-09). Le LOT-04 a
// posé la clé `certification` sur 13 des 15 blocs du seed, en affirmant en
// commentaire que « les valeurs sont RECOPIÉES du catalogue servi, jamais
// choisies ». Rien ne le tenait. Si un `certification.status` passait demain à
// `ambigu`, le seed continuerait de déclarer `certifie`, la fiche du patient
// fictif afficherait « Scoring vérifié (Drive) », et `e2e/fiche-detail-reponses`
// resterait VERT — il assère ce que le seed dit, pas ce que le catalogue
// accorde. C'est la classe de défaut que ce lot existe pour empêcher, reproduite
// à l'intérieur du seed.
//
// L'ATTENDU N'EST PAS RECOPIÉ ICI : il est lu du catalogue à chaque exécution.
// Une liste d'identifiants figée dirait seulement ce qu'on croyait le jour où on
// l'a écrite.
//
// LES DEUX SENS, et le second n'est pas redondant : un bloc ne peut ni déclarer
// ce que le catalogue tait, ni taire ce que le catalogue déclare. Sans le
// second, poser la clé sur 3 blocs au lieu de 14 passerait — et la colonne
// « Qualité » retomberait sur « Historique » sans qu'aucun banc ne bouge. Le
// second sens porte UNE exemption, datée et dérivée (voir le cas), depuis que
// l'alignement D-038 a fait déclarer le catalogue pour `Q_SOM_07` aussi.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { motifNonInterpretable } from '@/lib/scoring/passationsNonInterpretables';
import { REPONSES_SOPHIE, REPONSES_JENNIFER, REPONSES_MICHEL } from './seedReponses';

const BLOCS = [...REPONSES_SOPHIE, ...REPONSES_JENNIFER, ...REPONSES_MICHEL];

/** Ce que le catalogue servi déclare pour un instrument, ou `null`. */
function certificationDuCatalogue(idQuestionnaire: string) {
  const def = QUESTIONNAIRE_CATALOGUE[idQuestionnaire as keyof typeof QUESTIONNAIRE_CATALOGUE] as
    | { scoring?: { certification?: { source?: string; status?: string } } }
    | undefined;
  return def?.scoring?.certification ?? null;
}

describe('seed : la certification recopie le catalogue, dans les deux sens', () => {
  it('aucun bloc ne déclare une certification que le catalogue n’accorde pas', () => {
    const menteurs = BLOCS.filter(bloc => {
      const declaree = (bloc.scoresJson as Record<string, unknown>).certification as
        | { source?: string; status?: string }
        | undefined;
      if (!declaree) return false;
      const duCatalogue = certificationDuCatalogue(bloc.idQuestionnaire);
      return (
        duCatalogue === null
        || duCatalogue.source !== declaree.source
        || duCatalogue.status !== declaree.status
      );
    }).map(bloc => bloc.idQuestionnaire);
    expect(menteurs).toEqual([]);
  });

  // UNE exemption, et elle n'est pas une liste : une passation non
  // interprétable À SA DATE (`motifNonInterpretable`, frontière fermée — le
  // prédicat même que la route applique avant la branche du badge) peut rester
  // nue. Une passation antérieure à la reconstruction de son instrument n'a pas
  // pu enregistrer une certification que le moteur ne posait pas encore : la
  // clé serait fausse au dossier, et la route la retirerait de toute façon
  // avant l'écran. Épingler ici une liste d'identifiants dirait seulement ce
  // qu'on croyait le jour où on l'a écrite — même motif que l'attendu lu du
  // catalogue plus haut.
  it('aucun bloc ne tait une certification que le catalogue déclare — sauf passation non interprétable à sa date', () => {
    const muets = BLOCS.filter(bloc => {
      const declaree = (bloc.scoresJson as Record<string, unknown>).certification;
      return (
        declaree === undefined
        && certificationDuCatalogue(bloc.idQuestionnaire) !== null
        && motifNonInterpretable(bloc.idQuestionnaire, bloc.dateReponse) === null
      );
    }).map(bloc => bloc.idQuestionnaire);
    expect(muets).toEqual([]);
  });

  // LE PLAFOND, assumé et nommé — il a changé de nature au lot D-038. Les deux
  // blocs nus l'étaient « parce que le catalogue ne déclare rien » ; depuis que
  // l'alignement a fait parler le catalogue, il ne reste QU'UN bloc nu, et pour
  // l'autre raison : la passation de `Q_SOM_07` (2026-06-15) est antérieure à
  // la reconstruction du MFI-20 (2026-07-31). L'effet à l'écran est couvert par
  // `e2e/fiche-detail-reponses` (« Non interprétable »).
  //
  // Le plafond est fixé par identifiant pour qu'étendre le seed reste une
  // décision, jamais un effet de bord ; il est doublé de la vérification
  // DÉRIVÉE (le motif non interprétable existe À LA DATE de la passation, et le
  // catalogue déclare bien — sans quoi l'exemption ne serait pas ce qui le
  // justifie), qui est ce qui le rend légitime.
  it('le seul bloc nu est la passation non interprétable, et l’exemption est sa seule justification', () => {
    const nus = BLOCS
      .filter(bloc => (bloc.scoresJson as Record<string, unknown>).certification === undefined);
    expect(nus.map(bloc => bloc.idQuestionnaire)).toEqual(['Q_SOM_07']);
    nus.forEach(bloc => {
      expect(motifNonInterpretable(bloc.idQuestionnaire, bloc.dateReponse)).not.toBeNull();
      expect(certificationDuCatalogue(bloc.idQuestionnaire)).not.toBeNull();
    });
  });

  // LE SEED DOIT ÊTRE CONSOMMÉ EN ENTIER. Les trois tableaux vivent dans un
  // module à part depuis que ce banc existe ; rien n'obligerait un futur
  // `seed.ts` à les importer tous les trois, et ce banc resterait vert en
  // testant des blocs que la base ne verrait jamais.
  it('les trois tableaux sont importés par le seed, et lui seul les écrit', () => {
    const seed = readFileSync(new URL('./seed.ts', import.meta.url), 'utf8');
    ['REPONSES_SOPHIE', 'REPONSES_JENNIFER', 'REPONSES_MICHEL'].forEach(nom => {
      expect(seed).toContain(nom);
    });
    expect(BLOCS).toHaveLength(15);
  });
});
