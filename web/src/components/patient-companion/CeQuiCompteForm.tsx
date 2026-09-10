'use client';

import { useCallback, useEffect, useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientField, patientInputClassName } from '@/components/patient/ui/PatientField';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { LONGUEUR_MAX_CE_QUI_COMPTE } from '@/lib/patient/ceQuiCompte';

// Dépôt patient de « ce qui compte pour moi aujourd'hui » (Alliance 6.0-A,
// LOT-03). Un champ libre, une date facultative, un bouton.
//
// La soumission passe par la SESSION PORTAIL (cookie implicite) — aucun
// identifiant patient côté client, aucun jeton dans le corps : la route lit
// l'identité de la session et ignore ce que le corps pourrait porter. Même
// convention que `ProtocolCheckinForm`.
//
// Rien n'est noté, compté, catégorisé ni résumé : l'écran n'affiche aucun
// retour sur le CONTENU, seulement l'accusé du dépôt. Le compteur de
// caractères ne fait pas exception — il mesure une longueur de frappe, pas ce
// qui est dit, et n'existe que pour rendre la borne de la route visible AVANT
// l'envoi plutôt qu'après un refus.
//
// Aucune correction, aucune suppression : la table n'a pas de chaînage, une
// entrée déposée se conserve. On n'ajoute donc ici ni bouton « modifier », ni
// bouton « supprimer ».

/**
 * L'état de la fenêtre côté écran (`D-166`).
 *
 * `chargement` et `inconnue` sont DEUX états, pas un : le premier n'affiche
 * rien de définitif, le second a renoncé à savoir et OUVRE le champ. Un échec
 * de lecture ne doit jamais fermer la parole — c'est la même règle que la
 * route applique de son côté, et elle doit tenir des deux.
 */
type EtatFenetreEcran =
  | { etat: 'chargement' }
  | { etat: 'ouverte' }
  | { etat: 'inconnue' }
  | { etat: 'fermee'; depuis: string };

/** Date lisible par un patient : « 10 septembre 2026 ». */
function dateLisible(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function CeQuiCompteForm() {
  const [texte, setTexte] = useState('');
  const [saisiLe, setSaisiLe] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [depose, setDepose] = useState(false);
  const [fenetre, setFenetre] = useState<EtatFenetreEcran>({ etat: 'chargement' });

  /**
   * LA FENÊTRE SE LIT AVANT D'OFFRIR UN CHAMP. Laisser le patient rédiger pour
   * lui refuser à l'envoi serait la pire façon de lui apprendre la règle : il
   * aurait écrit, et il perdrait le geste.
   */
  const lireFenetre = useCallback(async () => {
    try {
      const res = await fetch('/api/portail/ce-qui-compte');
      const data = (await res.json()) as {
        ok?: boolean;
        fenetre?: { ouverte?: boolean; fermeeDepuis?: string };
      };
      if (!res.ok || !data.ok || data.fenetre === undefined) {
        setFenetre({ etat: 'inconnue' });
        return;
      }
      setFenetre(
        data.fenetre.ouverte === false && typeof data.fenetre.fermeeDepuis === 'string'
          ? { etat: 'fermee', depuis: data.fenetre.fermeeDepuis }
          : { etat: 'ouverte' },
      );
    } catch {
      setFenetre({ etat: 'inconnue' });
    }
  }, []);

  useEffect(() => {
    void lireFenetre();
  }, [lireFenetre]);

  // Le dépassement s'AFFICHE, il ne bloque pas : le bouton reste actif, la
  // requête part, et c'est la route qui refuse avec son message. Désactiver
  // l'envoi ici priverait le patient de la seule explication existante.
  const tropLong = texte.length > LONGUEUR_MAX_CE_QUI_COMPTE;

  const soumettre = useCallback(async () => {
    setEnvoi(true);
    setErreur('');
    setDepose(false);
    try {
      const res = await fetch('/api/portail/ce-qui-compte', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Le corps ne porte QUE la parole et sa date déclarée. Pas
        // d'identifiant : la session le dit, et la route ne lirait pas
        // celui-ci de toute façon.
        body: JSON.stringify({ texte, saisiLe: saisiLe || null }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (res.ok && data.ok) {
        // Le dépôt est acquis : le champ peut repartir vide.
        setTexte('');
        setSaisiLe('');
        setDepose(true);
      } else {
        // LE CHAMP N'EST PAS VIDÉ SUR ERREUR, et c'est délibéré : la session
        // du portail dure 12 h (`lib/patient-session.ts`), un 401 peut donc
        // tomber sur un texte tout juste rédigé. Ce n'est pas une suite de
        // clics à refaire, c'est une parole — l'effacer serait la perdre.
        setErreur(data.error ?? 'Votre dépôt n’a pas pu être enregistré.');
      }
    } catch {
      setErreur('Erreur réseau. Réessayez — votre texte est conservé ici.');
    } finally {
      setEnvoi(false);
    }
  }, [texte, saisiLe]);

  // APRÈS LE DÉPÔT, L'ACCUSÉ PREND TOUTE LA PLACE — et il dit maintenant deux
  // choses : que c'est enregistré, et quand on pourra écrire de nouveau. Il
  // passe AVANT l'état de fenêtre pour que le remerciement ne soit pas remplacé
  // dans la seconde par un écran de fermeture : le patient vient d'écrire, il
  // doit lire qu'il a été entendu, pas qu'une porte se referme.
  if (depose) {
    return (
      <PatientCard className="space-y-5">
        <PatientPageHeader
          title="Ce qui compte pour moi aujourd’hui"
          subtitle="C’est conservé tel quel. Personne ne le note ni ne le résume."
        />
        <PatientInlineMessage tone="success">C’est enregistré. Merci de l’avoir écrit.</PatientInlineMessage>
        <p className="text-sm text-muted-foreground">
          Vous pourrez en écrire un nouveau à la prochaine étape de votre suivi. D’ici là, si quelque chose change et
          que cela vous semble important, dites-le à votre praticien lors de votre prochain échange.
        </p>
      </PatientCard>
    );
  }

  // TANT QU'ON NE SAIT PAS, ON N'AFFIRME RIEN — ni le champ, ni la fermeture.
  // Ouvrir le champ puis le retirer une demi-seconde plus tard ferait
  // disparaître sous les doigts du patient ce qu'il a commencé à écrire.
  if (fenetre.etat === 'chargement') {
    return (
      <PatientCard className="space-y-5">
        <PatientPageHeader title="Ce qui compte pour moi aujourd’hui" subtitle="Un instant…" />
      </PatientCard>
    );
  }

  // FERMÉE — le fait, puis ce qui reste possible. Aucune date de réouverture
  // n'est promise : elle dépend d'une confirmation que le praticien n'a pas
  // encore posée, et l'inventer serait mentir. Aucun compte à rebours, aucun
  // décompte de dépôts, et le texte déposé n'est pas réaffiché.
  if (fenetre.etat === 'fermee') {
    const depuis = dateLisible(fenetre.depuis);
    return (
      <PatientCard className="space-y-5">
        <PatientPageHeader
          title="Ce qui compte pour moi aujourd’hui"
          subtitle="C’est conservé tel quel. Personne ne le note ni ne le résume."
        />
        <PatientInlineMessage tone="info">
          {depuis
            ? `Vous avez écrit ce qui compte pour vous le ${depuis}.`
            : 'Vous avez déjà écrit ce qui compte pour vous.'}
        </PatientInlineMessage>
        <p className="text-sm text-muted-foreground">
          Vous pourrez en écrire un nouveau à la prochaine étape de votre suivi. D’ici là, ce que vous avez écrit
          reste ce qui compte — si quelque chose change, dites-le à votre praticien lors de votre prochain échange.
        </p>
      </PatientCard>
    );
  }

  return (
    <PatientCard
      as="form"
      onSubmit={(e) => {
        e.preventDefault();
        void soumettre();
      }}
      className="space-y-5"
    >
      <PatientPageHeader
        title="Ce qui compte pour moi aujourd’hui"
        subtitle="Écrivez ce que vous souhaitez que votre praticien sache. Personne ne le note ni ne le résume : c’est conservé tel quel."
      />

      <PatientField label="Ce que je veux dire" requis>
        {/* AUCUN `maxLength` SUR CE CHAMP, ET C'EST LE POINT.
            `maxLength` fait couper le navigateur SILENCIEUSEMENT : un collage
            de 6 000 caractères devient 4 000 sans message, sans que le patient
            sache qu'il manque un morceau. C'est exactement l'altération de
            donnée que `lib/patient/ceQuiCompte.ts` désigne en contre-patron —
            simplement déplacée du serveur vers le client, où elle est plus
            difficile à voir. La borne est opposée par la route, en REFUS 400,
            avec un message que le patient lit et un texte qui reste à l'écran.
            Le compteur ci-dessous informe ; il n'ampute pas. Ne pas rétablir
            l'attribut « pour aider l'utilisateur » : il aide en effaçant. */}
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={7}
          placeholder="Ce qui compte pour moi en ce moment…"
          aria-label="Ce que je veux dire"
          aria-describedby="ce-qui-compte-compteur"
          className={patientInputClassName}
        />
        <p
          id="ce-qui-compte-compteur"
          className={`mt-1 text-xs ${tropLong ? 'text-status-warning' : 'text-muted-foreground'}`}
        >
          {texte.length} / {LONGUEUR_MAX_CE_QUI_COMPTE} caractères
          {tropLong && ' — au-delà de la limite : raccourcissez avant d’envoyer.'}
        </p>
      </PatientField>

      <PatientField
        label="Date à laquelle cela vous concerne"
        suffixe="facultatif — laissez vide si vous préférez"
      >
        <input
          type="date"
          value={saisiLe}
          onChange={(e) => setSaisiLe(e.target.value)}
          aria-label="Date à laquelle cela vous concerne"
          className={patientInputClassName}
        />
      </PatientField>

      {/* L'accusé de dépôt n'est plus ici : depuis `D-166` il remplace le
          formulaire entier, parce qu'il porte désormais aussi la cadence. Le
          garder ici en plus l'aurait rendu inatteignable. */}
      {erreur && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}

      <PatientButton
        type="submit"
        variant="primary"
        disabled={texte.trim().length === 0}
        loading={envoi}
        loadingLabel="Envoi…"
        className="w-full"
      >
        Envoyer
      </PatientButton>
    </PatientCard>
  );
}
