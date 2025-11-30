import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title = "SpendFlow - Free Privacy-First Personal Finance & Budget Tracker",
  description = "Free personal finance app with complete privacy. Create virtual cards, track expenses manually, manage budgets, and achieve savings goals - no bank connections required.",
  keywords = "free personal finance app, privacy finance tracker, manual expense tracker, virtual cards, budget management, savings goals, no bank connection, private money management",
  image = "https://spedflowapp.web.app/assets/assets/hero.8ee57dbdcfd159794617d4cde94fd912.jpg",
  url = "https://spedflowapp.web.app/",
  type = "website",
  noIndex = false,
}) => {
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta
        name="robots"
        content={noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}
      />
      <link rel="canonical" href={url} />

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1024" />
      <meta property="og:image:height" content="500" />
      <meta property="og:image:alt" content="SpendFlow Dashboard - Personal Finance Management" />
      <meta property="og:site_name" content="SpendFlow" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content="SpendFlow Dashboard - Personal Finance Management" />
      <meta name="twitter:creator" content="@SpendFlowApp" />
      <meta name="twitter:site" content="@SpendFlowApp" />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "SpendFlow",
          "alternateName": "SpendFlow App",
          "description": description,
          "url": url,
          "applicationCategory": "FinanceApplication",
          "operatingSystem": "Web, iOS, Android",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "author": {
            "@type": "Organization",
            "name": "SpendFlow",
            "url": "https://spedflowapp.web.app/"
          },
          "publisher": {
            "@type": "Organization",
            "name": "SpendFlow",
            "logo": {
              "@type": "ImageObject",
              "url": "https://spedflowapp.web.app/assets/assets/logo.d4d3b569ed3be311c26a39b741dd41df.png"
            }
          },
          "screenshot": image,
          "featureList": [
            "Virtual Card Management",
            "Manual Expense Tracking",
            "Budget Management", 
            "Savings Goals",
            "Direct Debit Tracking",
            "Financial Charts & Analytics",
            "Multi-Currency Support",
            "Privacy-First Design"
          ],
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "1250"
          }
        })}
      </script>
    </Helmet>
  );
};

export default SEO;
