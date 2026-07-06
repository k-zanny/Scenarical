import { Metadata } from 'next';
import CalculateurValeurBacklinksClient from './CalculateurValeurBacklinksClient';

export const metadata: Metadata = {
  title: 'Calculateur de Valeur de Backlinks — Estimateur Gratuit de Qualite de Liens | Scenarical',
  description: 'Calculez la valeur reelle de chaque backlink selon l\'autorite du domaine, la pertinence, le placement et le trafic referent. Determinez le prix juste pour vos opportunites de netlinking.',
  alternates: {
    canonical: 'https://scenarical.com/fr/outils/calculateur-valeur-backlinks',
    languages: {
      'en': 'https://scenarical.com/tools/backlink-value-calculator',
      'fr': 'https://scenarical.com/fr/outils/calculateur-valeur-backlinks',
      'x-default': 'https://scenarical.com/tools/backlink-value-calculator',
    },
  },
  openGraph: {
    title: 'Calculateur de Valeur de Backlinks — Estimateur Gratuit | Scenarical',
    description: 'Calculez la valeur reelle de chaque backlink. Determinez le prix juste pour vos opportunites de netlinking.',
    type: 'website',
    siteName: 'Scenarical',
    locale: 'fr_FR',
  },
};

export default function CalculateurValeurBacklinksPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Calculateur de Valeur de Backlinks',
    description: 'Calculez la valeur reelle de chaque backlink selon l\'autorite du domaine, la pertinence thematique, le placement du lien et le trafic referent.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: 'fr',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CalculateurValeurBacklinksClient />
    </>
  );
}
