'use client';

import BacklinkCalculatorCore, { BacklinkLocaleTexts } from '@/components/BacklinkCalculatorCore';
import affiliateData from '@/data/affiliate-links.json';
import { formatCurrency } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';

const enTexts: BacklinkLocaleTexts = {
  locale: 'en',
  pageTitle: 'Backlink Value Calculator',
  pageSubtitle: 'Calculate the true value of any backlink based on domain authority, relevance, link placement, and referral traffic. Determine fair pricing for link-building opportunities and compare link quality across scenarios.',
  scenarioLabel: 'Scenario',
  addScenario: 'Add Scenario',
  reset: 'Reset',
  referringDomainDA: 'Referring Domain Authority',
  establishedSiteAvg: 'Established site avg',
  daChips: [
    { label: 'Low 15', value: 15 },
    { label: 'Med 40', value: 40 },
    { label: 'High 70', value: 70 },
    { label: 'Elite 90', value: 90 },
  ],
  linkRelevance: 'Link Relevance (0-100)',
  relevanceChips: [
    { label: 'Off-topic 10', value: 10 },
    { label: 'Related 50', value: 50 },
    { label: 'Relevant 75', value: 75 },
    { label: 'Exact match 100', value: 100 },
  ],
  doFollowLabel: 'DoFollow Link',
  doFollowChips: [
    { label: 'NoFollow', value: 0 },
    { label: 'DoFollow', value: 1 },
  ],
  showAdvanced: 'Show Advanced Inputs',
  hideAdvanced: 'Hide Advanced Inputs',
  monthlyReferralTraffic: 'Monthly Referral Traffic',
  trafficChips: [
    { label: 'Low 20', value: 20 },
    { label: 'Med 100', value: 100 },
    { label: 'High 500', value: 500 },
    { label: 'Premium 2K', value: 2000 },
  ],
  avgTrafficValueLabel: 'Avg Traffic Value per Visit',
  avgTrafficValueBenchmark: 'Avg organic visit value',
  linkPlacementLabel: 'Link Placement Quality',
  placementChips: [
    { label: 'Footer 10', value: 10 },
    { label: 'Sidebar 30', value: 30 },
    { label: 'In-content 100', value: 100 },
  ],
  qualityScoreTitle: 'Quality Score',
  qualityLabels: { premium: 'Premium link', aboveAvg: 'Above average', belowAvg: 'Below average', low: 'Low quality' },
  monthlyValueTitle: 'Monthly Value',
  referralLabel: 'referral',
  seoLabel: 'SEO',
  fairPriceTitle: 'Fair Price to Pay',
  basedOnAnnual: 'Based on annual value',
  chartTitle: 'Value Breakdown: Referral vs SEO',
  chartLabelReferral: 'Referral Traffic Value',
  chartLabelSEO: 'SEO Authority Value',
  benchmarkGaugeLabel: 'Quality Score vs Average Backlink',
  benchmarkGaugeCTA: 'Find high-quality backlink opportunities',
  reverseTitle: 'Target Value — How to justify your link budget',
  reverseInputLabel: 'Target Fair Price Budget',
  reversePaths: {
    targetDA: 'Target Higher DA Sites',
    targetTraffic: 'Seek Higher Traffic Pages',
    improveRelevance: 'Improve Link Relevance',
  },
  reverseDescriptions: {
    daPrefix: 'Seek links from',
    daSuffix: 'domains',
    trafficPrefix: 'Target pages sending',
    trafficSuffix: 'referral visits/mo',
    relevance: 'Focus on topically relevant, in-content editorial links',
  },
  reverseSmallest: 'Smallest change needed',
  reverseClose: 'Close reverse mode',
  changeLabel: 'Change',
  riskLabels: {
    referringDomainDA: 'Domain Authority',
    linkRelevance: 'Link Relevance',
    isDoFollow: 'DoFollow Status',
    referralTraffic: 'Referral Traffic',
    avgTrafficValue: 'Traffic Value',
    linkPlacement: 'Link Placement',
  },
  riskResultLabel: 'monthly value',
  actionTitles: {
    danger: (score) => `Quality score of ${score} — this is a low-value backlink. Avoid overpaying.`,
    warning: (score) => `Quality score of ${score} — below average. Negotiate a lower price.`,
    good: (score) => `Quality score of ${score} — a solid backlink opportunity worth pursuing.`,
    excellent: (score) => `Quality score of ${score} — premium backlink. This link is highly valuable.`,
  },
  actionItems: {
    danger: (semrushUrl) => [
      {
        icon: '🚫',
        text: 'Do not pay for this link. Low-quality backlinks can hurt your rankings and waste budget.',
        affiliateText: 'Find quality link opportunities with Semrush → Try Free',
        affiliateUrl: semrushUrl,
      },
      { icon: '🔍', text: 'Look for links from more relevant, higher-authority domains in your niche.' },
      { icon: '📝', text: 'Invest in creating linkable content assets that attract high-quality links naturally.' },
    ],
    warning: (fairPrice, semrushUrl) => [
      { icon: '💰', text: `Fair price is ${fairPrice} — do not pay more than this for this link.` },
      {
        icon: '🔗',
        text: 'Request in-content placement and dofollow status to maximize the link\'s value.',
        affiliateText: 'Analyze competitor backlinks with Semrush → Try Free',
        affiliateUrl: semrushUrl,
      },
      { icon: '📊', text: 'Compare this opportunity against other link prospects — prioritize higher-quality options.', link: '/tools/da-impact-calculator' },
    ],
    good: (fairPrice, semrushUrl) => [
      { icon: '✅', text: `Fair price of ${fairPrice} represents good value. Proceed with outreach.` },
      {
        icon: '📈',
        text: 'Negotiate for contextual, in-content placement to maximize SEO value transfer.',
        affiliateText: 'Track your backlink growth with Semrush → Try Free',
        affiliateUrl: semrushUrl,
      },
      { icon: '🔄', text: 'Build a relationship with this site for future link opportunities and content partnerships.', link: '/tools/seo-roi-calculator' },
    ],
    excellent: (fairPrice, semrushUrl) => [
      {
        icon: '🏆',
        text: `Worth up to ${fairPrice}. This link will meaningfully boost your authority.`,
        affiliateText: 'Monitor your link profile with Semrush → Try Free',
        affiliateUrl: semrushUrl,
      },
      { icon: '🤝', text: 'Prioritize this link acquisition — high-DA relevant links are rare and extremely impactful.' },
      { icon: '📧', text: 'Invest in personalized outreach and offer genuine value to increase your chances of earning this link.' },
    ],
  },
  seoContent: (
    <div className="mt-12 max-w-3xl">
      <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Backlink Value</h2>
      <div className="space-y-4 text-sm text-label leading-relaxed">
        <p>
          Backlinks remain one of the most powerful ranking factors in SEO. But not all backlinks
          are created equal. A single link from a high-authority, topically relevant site can be
          worth more than hundreds of links from low-quality directories or unrelated domains.
          Understanding the true value of a backlink — before you invest time or money acquiring
          it — is critical to building an efficient, effective link-building strategy.
        </p>
        <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">What Determines Backlink Quality</h3>
        <p>
          Four primary factors determine a backlink&apos;s quality and value. First, the domain
          authority of the referring site — higher DA means more link equity passed to your page.
          Second, topical relevance — a link from a site in your niche carries more weight than
          one from an unrelated domain. Third, the follow status — dofollow links pass full link
          equity while nofollow links pass approximately 30% (Google treats nofollow as a hint).
          Fourth, link placement — links within editorial content are valued far more than sidebar
          or footer links. To analyze the backlink profiles of top-ranking competitors in your space, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush&apos;s backlink analytics database covers over 43 trillion links</a>.
        </p>
        <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How to Calculate Fair Pricing</h3>
        <p>
          The fair price for a backlink should be based on the value it delivers, not arbitrary
          pricing. This calculator estimates both the direct referral traffic value and the
          indirect SEO authority value, then recommends paying approximately 6 months of the
          link&apos;s total monthly value. The average cost of a quality backlink is around
          {formatCurrency(benchmarks.seo.avg_backlink_cost)}, but prices vary enormously — from
          $50 for a low-DA guest post to $2,000+ for a premium editorial placement on a top-tier
          publication.
        </p>
        <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Building a High-Value Link Profile</h3>
        <p>
          The most effective link-building strategies focus on earning links rather than buying
          them. Create genuinely useful content — original research, comprehensive guides,
          interactive tools, and data-driven studies — that people naturally want to reference
          and link to. Supplement this with targeted outreach to relevant sites where your content
          adds genuine value to their audience. Quality always trumps quantity in link building:
          10 links from relevant DA 50+ sites will outperform 100 links from low-quality sources.
          For comprehensive backlink analysis and competitor link research, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s link building tools to find and prioritize the best opportunities</a>.
        </p>
      </div>
    </div>
  ),
  faqs: [
    {
      question: 'What makes a backlink valuable?',
      answer: 'A valuable backlink comes from a high-authority, topically relevant domain; is placed within editorial content (not sidebars or footers); uses a dofollow attribute; and drives real referral traffic. The most valuable backlinks are earned naturally — when other sites link to your content because it is genuinely useful, unique, or newsworthy. Domain authority of the linking site, relevance to your niche, and link placement are the three biggest factors in backlink value.',
    },
    {
      question: 'How much should I pay for a backlink?',
      answer: 'A fair price for a backlink depends on the linking domain\'s authority, relevance, traffic, and placement. The industry average cost is around $350, but quality editorial links from high-DA sites can cost $500-$2,000+. As a rule of thumb, you should pay no more than 6 months of the link\'s estimated monthly value. This calculator helps you determine the fair price based on the specific attributes of each link opportunity.',
    },
    {
      question: 'Do nofollow links have any SEO value?',
      answer: 'Yes, but significantly less than dofollow links. Google treats nofollow as a "hint" rather than a directive, meaning some link equity may still pass. Nofollow links also drive referral traffic, build brand awareness, and create a natural-looking link profile. This calculator weights nofollow links at 30% of the SEO value of dofollow links, which aligns with industry consensus on their relative impact.',
    },
    {
      question: 'How do I evaluate backlink quality at scale?',
      answer: 'Use a combination of metrics: domain authority of the linking site, topical relevance to your niche, link placement (in-content vs. sidebar vs. footer), follow status, and actual referral traffic. Tools like Semrush and Ahrefs provide backlink databases that let you audit links at scale. Focus on quality over quantity — one link from a DA 70 relevant site is worth more than 50 links from low-quality directories.',
    },
  ],
  languageSwitcher: { label: 'Francais', href: '/fr/outils/calculateur-valeur-backlinks' },
};

export default function BacklinkValueCalculatorClient() {
  return <BacklinkCalculatorCore t={enTexts} />;
}
