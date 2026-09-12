'use client';

import { useEffect, useRef } from 'react';
import type { EspeceLecture, LectureAttendue } from '@/lib/portail/lecturesAttendues';

/*
 * CONSIGNE QU'UN DOCUMENT A ÉTÉ OUVERT. Ne rend rien.
 *
 * Posé sur l'écran du bilan et sur celui de la synthèse. À l'ouverture, il
 * demande au serveur QUELLE lecture est attendue pour cette espèce, puis
 * l'acquitte. La tâche correspondante quitte alors le fil du jour.
 *
 * ── POURQUOI IL DEMANDE L'IDENTIFIANT AU LIEU DE LE DÉDUIRE DE L'ÉCRAN ─────
 *
 * Parce que l'écran ne le connaît pas de la même façon que le serveur.
 * `api/portail/bilan` ne transporte même pas l'identifiant de l'envoi ; et le
 * faire remonter jusqu'ici obligerait à le traverser dans trois composants,
 * pour finir par renvoyer au serveur une valeur qu'il aurait lui-même émise.
 *
 * En le demandant, l'identifiant vient de LA MÊME RÈGLE que celle qui a fait
 * apparaître la tâche : `whereEnvoiVisible`, `syntheseServieAuPatient`. Il ne
 * peut pas désigner un document que le fil n'annonçait pas.
 *
 * ── CE QUI ARRIVE SI LE DOCUMENT CHANGE ENTRE LES DEUX APPELS ──────────────
 *
 * Le POST est REFUSÉ (404) et rien n'est écrit : le serveur revérifie que
 * l'identifiant est bien celui qu'il sert (`D-164`). La tâche reste au fil.
 * C'est le bon sens de l'erreur — mieux vaut redemander une lecture faite que
 * d'effacer une lecture qui n'a pas eu lieu.
 *
 * ── UN ENVOI PAR MONTAGE, ET LE GARDE-FOU N'EST PAS DÉCORATIF ──────────────
 *
 * `React.StrictMode` monte deux fois en développement, et l'écriture partirait
 * en double sans `envoye`. Le doublon serait inoffensif — la clé primaire porte
 * le triplet, le serveur le lit « déjà consigné » — mais une requête inutile
 * sur une surface patient reste une requête inutile.
 *
 * ── AUCUNE INTERFACE, AUCUN MESSAGE ────────────────────────────────────────
 *
 * Ni confirmation, ni erreur visible. Le patient n'a rien demandé : il a ouvert
 * un document. Lui annoncer « lecture enregistrée » transformerait une lecture
 * en formalité, et lui annoncer un échec l'inquiéterait sur un geste dont il
 * ignore l'existence. Un échec laisse simplement la tâche au fil, ce qui est
 * exactement ce qu'un échec doit produire.
 */
export function ConsignerLecturePortail({ espece }: { espece: EspeceLecture }) {
  const envoye = useRef(false);

  useEffect(() => {
    if (envoye.current) return;
    envoye.current = true;

    void (async () => {
      /*
       * DEUX `try` PLUTÔT QU'UN, ET CE N'EST PAS DU STYLE.
       *
       * Un seul `catch` autour de tout avalait la panne réseau — ce qu'on veut
       * — ET n'importe quelle erreur de programmation entre les deux appels —
       * ce qu'on ne veut pas. Un garde-fou retiré par mégarde ne faisait alors
       * rougir AUCUN banc : la page rendait toujours rien, et aucune requête ne
       * partait. Constaté par mutation, et corrigé ici.
       *
       * Chaque `try` ne couvre plus que son propre appel réseau. Ce qui est
       * entre les deux n'est protégé par rien, et c'est voulu : une faute de
       * logique doit se voir.
       */
      let lectures: LectureAttendue[];
      try {
        const res = await fetch('/api/portail/lectures');
        if (!res.ok) return;
        const data = (await res.json()) as { ok?: boolean; lectures?: LectureAttendue[] };
        if (data.ok !== true || !Array.isArray(data.lectures)) return;
        lectures = data.lectures;
      } catch {
        // Silence délibéré : la tâche reste au fil, et le patient lit son
        // document sans être averti de quoi que ce soit.
        return;
      }

      // Rien d'attendu = déjà lu, ou rien de remis. Dans les deux cas il n'y a
      // pas de geste à consigner, et on n'en invente pas un.
      const attendue = lectures.find(l => l.espece === espece);
      if (!attendue) return;

      // L'identifiant est lu AVANT le `try`, délibérément : ce qui est lu à
      // l'intérieur serait avalé par le `catch` du réseau. Un champ manquant
      // doit échouer bruyamment, pas passer pour une coupure de connexion.
      const { idObjet } = attendue;

      try {
        await fetch('/api/portail/lectures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ espece, idObjet }),
        });
      } catch {
        // Même silence : un échec d'écriture laisse la tâche au fil, ce qui est
        // exactement ce qu'un échec doit produire.
      }
    })();
  }, [espece]);

  return null;
}
