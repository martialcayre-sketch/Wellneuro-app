'use client';

import { useEffect, useRef, useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { BOUTON_CAPTURE_REPAS, LIGNE_CAPTURE_REPAS } from './textesCaptureRepas';

// La photo du repas ([[D-437]], lettre an) — une AIDE-MÉMOIRE pendant la
// saisie d'une journée d'agenda, jamais une saisie en soi : rien de ce qui est
// photographié n'entre dans la journée enregistrée (§1).
//
// ── LE MÉCANISME TIENT LA PROMESSE DU TEXTE (§6) ───────────────────────────
// « Ne s'enregistre pas dans vos photos » n'est vrai que parce que la prise
// passe par le flux de la caméra DANS LA PAGE (`getUserMedia`), puis une seule
// image est peinte sur une toile gardée en mémoire. Jamais de champ de fichier
// avec `capture`, qui confie la prise à l'appareil photo du système — lequel,
// selon le téléphone, l'enregistre dans la galerie. Un banc de source refuse
// ce champ dans tout le dossier de l'agenda.
//
// ── LA PHOTO NE QUITTE JAMAIS LA TOILE (§3) ────────────────────────────────
// Aucune conversion en données, en fichier ou en URL d'objet, aucun appel
// réseau, aucune écriture dans le stockage du navigateur : ce module n'en
// contient aucun, et un banc de source le vérifie mot par mot.
//
// ── SUPPRIMÉE À L'ENREGISTREMENT ET À L'ABANDON (§3) ───────────────────────
// La toile est vidée et réduite à zéro, et le flux arrêté :
//  - au démontage — journée enregistrée (l'écran se recharge et quitte la
//    saisie), retour à la frise, changement de date (le parent monte ce
//    composant sous la `key` de la date) ;
//  - à `pagehide` — page quittée, y compris quand le navigateur la garde en
//    cache d'historique : revenue par « Précédent », elle ne montre plus rien.
// Un refus d'enregistrement laisse la photo : la journée n'est pas enregistrée.
//
// ── AUCUN REPLI (§6) ───────────────────────────────────────────────────────
// Navigateur sans `getUserMedia`, permission déjà refusée, ou refus au moment
// de l'ouverture : le bouton et sa ligne disparaissent, sans aucun message —
// [[D-437]] §5 n'accepte que deux textes.
//
// ── LE DOSSIER MAJEUR SE DÉCIDE AU SERVEUR (§4) ────────────────────────────
// Ce composant n'est monté que si la lecture de l'agenda (route GET du portail)
// rend `captureRepas: true` (drapeaux ouverts ET dossier majeur). Il ne lit aucun
// drapeau ni aucune date de naissance lui-même.

type Etat = 'repos' | 'visee' | 'photo';

function cameraDisponibleDansLeNavigateur(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices !== undefined &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

export function CaptureRepas() {
  const [disponible, setDisponible] = useState(false);
  const [etat, setEtat] = useState<Etat>('repos');
  const [ouverture, setOuverture] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Le nœud de la toile est gardé par un rappel qui IGNORE `null` : au
  // démontage, React peut détacher les refs avant le nettoyage des effets, et
  // la toile ne pourrait plus être vidée.
  const toileRef = useRef<HTMLCanvasElement | null>(null);
  const fluxRef = useRef<MediaStream | null>(null);
  const monteRef = useRef(true);
  // Numéro de la dernière ouverture de caméra demandée ; `pagehide` l'avance.
  const ouvertureRef = useRef(0);

  function arreterFlux() {
    fluxRef.current?.getTracks().forEach((piste) => piste.stop());
    fluxRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function effacerPhoto() {
    const toile = toileRef.current;
    if (!toile) return;
    toile.getContext('2d')?.clearRect(0, 0, toile.width, toile.height);
    // Réduire la toile à zéro libère son image, au lieu de seulement la cacher.
    toile.width = 0;
    toile.height = 0;
  }

  // Disponibilité : sans `getUserMedia`, ou permission déjà refusée, le
  // bouton n'est jamais proposé. Une interrogation de permission que le
  // navigateur ne sait pas faire n'est pas un refus : le refus, s'il vient,
  // viendra à l'ouverture.
  useEffect(() => {
    if (!cameraDisponibleDansLeNavigateur()) return;
    let annule = false;
    const permissions = navigator.permissions;
    if (permissions === undefined || typeof permissions.query !== 'function') {
      setDisponible(true);
      return;
    }
    permissions.query({ name: 'camera' as PermissionName }).then(
      (statut) => {
        if (!annule && statut.state !== 'denied') setDisponible(true);
      },
      () => {
        if (!annule) setDisponible(true);
      },
    );
    return () => {
      annule = true;
    };
  }, []);

  // Suppression à l'abandon : page quittée (`pagehide`) et démontage.
  useEffect(() => {
    monteRef.current = true;
    const toutEffacer = () => {
      // Une ouverture en attente de permission est périmée : si elle aboutit
      // après que la page a été quittée, la caméra ne s'allume pas.
      ouvertureRef.current += 1;
      arreterFlux();
      effacerPhoto();
      setEtat('repos');
    };
    window.addEventListener('pagehide', toutEffacer);
    return () => {
      monteRef.current = false;
      window.removeEventListener('pagehide', toutEffacer);
      arreterFlux();
      effacerPhoto();
    };
  }, []);

  // Le flux s'attache à la vidéo une fois celle-ci rendue.
  useEffect(() => {
    const video = videoRef.current;
    if (etat !== 'visee' || !video || !fluxRef.current) return;
    video.srcObject = fluxRef.current;
    void video.play()?.catch(() => {});
  }, [etat]);

  async function ouvrirCamera() {
    setOuverture(true);
    effacerPhoto();
    const ticket = ++ouvertureRef.current;
    try {
      const flux = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      // Démonté, ou page quittée (`pagehide`) pendant l'attente : la réponse
      // arrive trop tard, ses pistes sont arrêtées aussitôt.
      if (!monteRef.current || ticket !== ouvertureRef.current) {
        flux.getTracks().forEach((piste) => piste.stop());
        return;
      }
      fluxRef.current = flux;
      setEtat('visee');
    } catch {
      // Refus du patient ou caméra absente : aucun repli, aucun message.
      arreterFlux();
      if (monteRef.current) {
        setEtat('repos');
        setDisponible(false);
      }
    } finally {
      if (monteRef.current) setOuverture(false);
    }
  }

  function prendrePhoto() {
    const video = videoRef.current;
    const toile = toileRef.current;
    if (!video || !toile || video.videoWidth === 0 || video.videoHeight === 0) return;
    toile.width = video.videoWidth;
    toile.height = video.videoHeight;
    toile.getContext('2d')?.drawImage(video, 0, 0, toile.width, toile.height);
    arreterFlux();
    setEtat('photo');
  }

  if (!disponible) return null;

  return (
    <div className="mb-4 space-y-2">
      {etat === 'visee' && (
        <video
          ref={videoRef}
          aria-hidden="true"
          autoPlay
          muted
          playsInline
          data-testid="capture-repas-visee"
          className="w-full rounded-xl bg-black"
        />
      )}
      <canvas
        ref={(noeud) => {
          if (noeud) toileRef.current = noeud;
        }}
        aria-hidden="true"
        hidden={etat !== 'photo'}
        data-testid="capture-repas-photo"
        className="h-auto w-full rounded-xl"
      />
      <PatientButton
        variant="ghost"
        disabled={ouverture}
        onClick={() => {
          if (etat === 'visee') prendrePhoto();
          else void ouvrirCamera();
        }}
      >
        {BOUTON_CAPTURE_REPAS}
      </PatientButton>
      <p className="text-xs text-muted-foreground">{LIGNE_CAPTURE_REPAS}</p>
    </div>
  );
}
