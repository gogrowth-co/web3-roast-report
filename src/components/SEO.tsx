
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImageUrl?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
}

const SEO: React.FC<SEOProps> = ({
  title = 'Web3 ROAST - AI Analysis for Web3 Projects',
  description = 'Get brutally honest feedback on your Web3 project landing page. Our AI analysis identifies UX issues, conversion blockers, and trust factors.',
  canonicalUrl,
  ogImageUrl = 'https://web3roast.com/og-image.png',
  ogType = 'website',
  noIndex = false
}) => {
  // Build full title with brand name
  const fullTitle = title.includes('Web3 ROAST') ? title : `${title} | Web3 ROAST`;
  
  // Get the absolute URL for OG image
  const absoluteOgImageUrl = ogImageUrl.startsWith('http') 
    ? ogImageUrl 
    : `${window.location.origin}${ogImageUrl.startsWith('/') ? '' : '/'}${ogImageUrl}`;
  
  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteOgImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteOgImageUrl} />
      
      {/* No index if specified */}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
};

export default SEO;
