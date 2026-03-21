import { Metadata } from 'next';
import { getToolBySlug } from '@/lib/tools-data';

export function generateToolMetadata(slug: string): Metadata {
  const tool = getToolBySlug(slug);
  if (!tool) return {};

  return {
    title: `${tool.name} — Free Online Calculator | Scenarical`,
    description: tool.description,
    openGraph: {
      title: `${tool.name} — Free Online Calculator | Scenarical`,
      description: tool.description,
      type: 'website',
      siteName: 'Scenarical',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tool.name} — Free Online Calculator | Scenarical`,
      description: tool.description,
    },
  };
}

export function generateToolJsonLd(slug: string) {
  const tool = getToolBySlug(slug);
  if (!tool) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}
