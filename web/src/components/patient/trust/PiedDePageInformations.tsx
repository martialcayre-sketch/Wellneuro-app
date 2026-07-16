'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

/** Lien permanent vers le centre « Informations, confidentialité et droits »
 * (TRUST LOT-02) — visible depuis toutes les pages du portail. */
export function PiedDePageInformations() {
  const params = useParams<{ token?: string }>();
  if (!params?.token) return null;
  return (
    <Link
      href={`/portail/${params.token}/informations`}
      className="text-primary hover:underline"
    >
      Confidentialité et droits
    </Link>
  );
}
