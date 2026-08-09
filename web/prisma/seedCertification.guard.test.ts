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
// second, poser la clé sur 3 blocs au lieu de 13 passerait — et la colonne
// « Qualité » retomberait sur « Historique » sans qu'aucun banc ne bouge.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
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

  it('aucun bloc ne tait une certification que le catalogue déclare', () => {
    const muets = BLOCS.filter(bloc => {
      const declaree = (bloc.scoresJson as Record<string, unknown>).certification;
      return declaree === undefined && certificationDuCatalogue(bloc.idQuestionnaire) !== null;
    }).map(bloc => bloc.idQuestionnaire);
    expect(muets).toEqual([]);
  });

  // LE PLAFOND, assumé et nommé. Les deux blocs sont nus pour LA MÊME raison —
  // le catalogue ne déclare rien pour l'un comme pour l'autre — et c'est ce que
  // ce cas assère. Ce qui diffère est l'EFFET À L'ÉCRAN, et il ne se teste pas
  // ici : `Q_SOM_01` affiche « Historique », `Q_SOM_07` « Non interprétable »,
  // sa passation étant antérieure à la reconstruction du MFI-20. Les deux sont
  // couverts par `e2e/fiche-detail-reponses`. (Une première rédaction de ce
  // commentaire disait « deux raisons différentes », ce que l'assertion
  // dessous dément — relevé en revue le 2026-08-09.)
  //
  // Le plafond est fixé par identifiant pour qu'étendre le seed reste une
  // décision, jamais un effet de bord ; il est doublé de la vérification
  // DÉRIVÉE (`toBeNull`), qui est ce qui le rend légitime. L'ordre, lui, ne
  // porte aucun sens : on compare des ensembles, sans quoi réordonner deux
  // blocs — geste sans effet — rendrait ce banc rouge.
  it('les deux blocs nus le sont parce que le catalogue ne déclare rien', () => {
    const nus = BLOCS
      .filter(bloc => (bloc.scoresJson as Record<string, unknown>).certification === undefined)
      .map(bloc => bloc.idQuestionnaire);
    expect([...nus].sort()).toEqual(['Q_SOM_01', 'Q_SOM_07']);
    nus.forEach(id => expect(certificationDuCatalogue(id)).toBeNull());
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
