'use client';

import BacklinkCalculatorCore, { BacklinkLocaleTexts } from '@/components/BacklinkCalculatorCore';
import affiliateData from '@/data/affiliate-links.json';
import { formatCurrency } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';

const frTexts: BacklinkLocaleTexts = {
  locale: 'fr',
  pageTitle: 'Calculateur de Valeur de Backlinks',
  pageSubtitle: 'Estimez la valeur reelle de chaque backlink selon l\'autorite du domaine, la pertinence thematique, le placement du lien et le trafic referent. Determinez un prix juste pour vos opportunites de netlinking et comparez la qualite des liens entre plusieurs scenarios.',
  scenarioLabel: 'Scenario',
  addScenario: 'Ajouter Scenario',
  reset: 'Reinitialiser',
  referringDomainDA: 'Autorite du Domaine Referent',
  establishedSiteAvg: 'Moy. site etabli',
  daChips: [
    { label: 'Faible 15', value: 15 },
    { label: 'Moyen 40', value: 40 },
    { label: 'Fort 70', value: 70 },
    { label: 'Elite 90', value: 90 },
  ],
  linkRelevance: 'Pertinence du Lien (0-100)',
  relevanceChips: [
    { label: 'Hors sujet 10', value: 10 },
    { label: 'Connexe 50', value: 50 },
    { label: 'Pertinent 75', value: 75 },
    { label: 'Exact 100', value: 100 },
  ],
  doFollowLabel: 'Lien DoFollow',
  doFollowChips: [
    { label: 'NoFollow', value: 0 },
    { label: 'DoFollow', value: 1 },
  ],
  showAdvanced: 'Afficher les parametres avances',
  hideAdvanced: 'Masquer les parametres avances',
  monthlyReferralTraffic: 'Trafic Referent Mensuel',
  trafficChips: [
    { label: 'Faible 20', value: 20 },
    { label: 'Moyen 100', value: 100 },
    { label: 'Eleve 500', value: 500 },
    { label: 'Premium 2K', value: 2000 },
  ],
  avgTrafficValueLabel: 'Valeur Moyenne par Visite',
  avgTrafficValueBenchmark: 'Valeur moy. visite organique',
  linkPlacementLabel: 'Qualite du Placement du Lien',
  placementChips: [
    { label: 'Pied de page 10', value: 10 },
    { label: 'Sidebar 30', value: 30 },
    { label: 'Dans le contenu 100', value: 100 },
  ],
  qualityScoreTitle: 'Score de Qualite',
  qualityLabels: { premium: 'Lien premium', aboveAvg: 'Au-dessus de la moyenne', belowAvg: 'En dessous de la moyenne', low: 'Qualite faible' },
  monthlyValueTitle: 'Valeur Mensuelle',
  referralLabel: 'referent',
  seoLabel: 'SEO',
  fairPriceTitle: 'Prix Juste a Payer',
  basedOnAnnual: 'Base sur la valeur annuelle de',
  chartTitle: 'Repartition : Trafic Referent vs SEO',
  chartLabelReferral: 'Valeur du Trafic Referent',
  chartLabelSEO: 'Valeur de l\'Autorite SEO',
  benchmarkGaugeLabel: 'Score de Qualite vs Backlink Moyen',
  benchmarkGaugeCTA: 'Trouvez des opportunites de backlinks de qualite',
  reverseTitle: 'Valeur Cible — Comment justifier votre budget de netlinking',
  reverseInputLabel: 'Budget de Prix Juste Cible',
  reversePaths: {
    targetDA: 'Cibler des Sites a DA Plus Eleve',
    targetTraffic: 'Rechercher des Pages a Fort Trafic',
    improveRelevance: 'Ameliorer la Pertinence du Lien',
  },
  reverseDescriptions: {
    daPrefix: 'Recherchez des liens de domaines',
    daSuffix: '+',
    trafficPrefix: 'Ciblez des pages envoyant',
    trafficSuffix: 'visites referentes/mois',
    relevance: 'Privilegiez les liens editoriaux dans le contenu, thematiquement pertinents',
  },
  reverseSmallest: 'Plus petit changement necessaire',
  reverseClose: 'Fermer le mode inverse',
  changeLabel: 'Variation',
  riskLabels: {
    referringDomainDA: 'Autorite du Domaine',
    linkRelevance: 'Pertinence du Lien',
    isDoFollow: 'Statut DoFollow',
    referralTraffic: 'Trafic Referent',
    avgTrafficValue: 'Valeur du Trafic',
    linkPlacement: 'Placement du Lien',
  },
  riskResultLabel: 'valeur mensuelle',
  actionTitles: {
    danger: (score) => `Score de qualite de ${score} — backlink de faible valeur. Evitez de surpayer.`,
    warning: (score) => `Score de qualite de ${score} — en dessous de la moyenne. Negociez un prix inferieur.`,
    good: (score) => `Score de qualite de ${score} — une opportunite de backlink solide a saisir.`,
    excellent: (score) => `Score de qualite de ${score} — backlink premium. Ce lien a une tres forte valeur.`,
  },
  actionItems: {
    danger: (semrushUrl) => [
      {
        icon: '🚫',
        text: 'Ne payez pas pour ce lien. Les backlinks de faible qualite peuvent nuire a votre classement et gaspiller votre budget.',
        affiliateText: 'Analysez vos backlinks avec Semrush → Essai gratuit',
        affiliateUrl: semrushUrl,
      },
      { icon: '🔍', text: 'Cherchez des liens provenant de domaines plus pertinents et a plus forte autorite dans votre thematique.' },
      { icon: '📝', text: 'Investissez dans la creation de contenus attractifs qui generent des liens de qualite naturellement.' },
    ],
    warning: (fairPrice, semrushUrl) => [
      { icon: '💰', text: `Le prix juste est de ${fairPrice} — ne payez pas plus pour ce lien.` },
      {
        icon: '🔗',
        text: 'Demandez un placement dans le contenu editorial et un attribut dofollow pour maximiser la valeur du lien.',
        affiliateText: 'Analysez les backlinks concurrents avec Semrush → Essai gratuit',
        affiliateUrl: semrushUrl,
      },
      { icon: '📊', text: 'Comparez cette opportunite avec d\'autres prospects de liens — privilegiez les options de meilleure qualite.', link: '/tools/da-impact-calculator' },
    ],
    good: (fairPrice, semrushUrl) => [
      { icon: '✅', text: `Un prix juste de ${fairPrice} represente une bonne valeur. Lancez votre prospection.` },
      {
        icon: '📈',
        text: 'Negociez un placement contextuel dans le contenu pour maximiser le transfert de valeur SEO.',
        affiliateText: 'Suivez la croissance de vos backlinks avec Semrush → Essai gratuit',
        affiliateUrl: semrushUrl,
      },
      { icon: '🔄', text: 'Construisez une relation avec ce site pour de futures opportunites de liens et partenariats de contenu.', link: '/tools/seo-roi-calculator' },
    ],
    excellent: (fairPrice, semrushUrl) => [
      {
        icon: '🏆',
        text: `Valeur estimee jusqu'a ${fairPrice}. Ce lien renforcera significativement votre autorite.`,
        affiliateText: 'Surveillez votre profil de liens avec Semrush → Essai gratuit',
        affiliateUrl: semrushUrl,
      },
      { icon: '🤝', text: 'Priorisez l\'acquisition de ce lien — les liens de forte autorite et pertinents sont rares et extremement impactants.' },
      { icon: '📧', text: 'Investissez dans une prospection personnalisee et offrez une valeur reelle pour augmenter vos chances d\'obtenir ce lien.' },
    ],
  },
  seoContent: (
    <div className="mt-12 max-w-3xl">
      <h2 className="text-2xl font-semibold text-foreground mb-4">Comprendre la Valeur d&apos;un Backlink</h2>
      <div className="space-y-4 text-sm text-label leading-relaxed">
        <p>
          Les backlinks restent l&apos;un des facteurs de classement les plus puissants en SEO. Pourtant, tous les liens entrants ne se valent pas. Un seul lien provenant d&apos;un site a forte autorite et thematiquement pertinent peut avoir plus d&apos;impact que des centaines de liens issus d&apos;annuaires de faible qualite ou de domaines sans rapport avec votre activite. Comprendre la valeur reelle d&apos;un backlink — avant d&apos;investir du temps ou de l&apos;argent pour l&apos;obtenir — est essentiel pour construire une strategie de netlinking efficace et rentable.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Comment Calculer la Valeur d&apos;un Backlink</h3>
        <p>
          Le calcul de la valeur d&apos;un backlink repose sur une combinaison de facteurs quantitatifs et qualitatifs. Notre calculateur prend en compte six variables cles pour estimer precisement ce que vaut un lien : l&apos;autorite du domaine referent (DA), la pertinence thematique, le statut dofollow/nofollow, le volume de trafic referent, la valeur moyenne par visite et la qualite du placement.
        </p>
        <p>
          La formule attribue un poids de 40 % a l&apos;autorite du domaine, 30 % a la pertinence thematique, 15 % au statut follow et 15 % au placement du lien. Cette ponderation reflete le consensus des experts SEO sur l&apos;importance relative de chaque facteur. Le score de qualite obtenu est ensuite combine avec la valeur du trafic referent pour produire une estimation de la valeur mensuelle totale du lien.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Qu&apos;est-ce qui Determine la Qualite d&apos;un Backlink ?</h3>
        <p>
          Quatre facteurs principaux determinent la qualite et la valeur d&apos;un backlink. Premierement, l&apos;autorite du domaine referent — plus le DA est eleve, plus le lien transmet de « jus SEO » a votre page. Un lien provenant d&apos;un site comme Le Monde ou un media de reference dans votre secteur aura un impact bien superieur a celui d&apos;un petit blog inconnu.
        </p>
        <p>
          Deuxiemement, la pertinence thematique. Google accorde plus de poids aux liens provenant de sites dont le contenu est en rapport direct avec votre thematique. Un site de cuisine qui fait un lien vers un autre site culinaire transmettra davantage de valeur qu&apos;un lien provenant d&apos;un site de finance.
        </p>
        <p>
          Troisiemement, l&apos;attribut follow. Les liens dofollow transmettent la totalite de l&apos;equite de lien, tandis que les liens nofollow n&apos;en transmettent qu&apos;environ 30 % — Google traite le nofollow comme un « indice » plutot qu&apos;une directive stricte. Quatriemement, le placement du lien : un lien editorial integre naturellement dans le corps du texte a beaucoup plus de valeur qu&apos;un lien en sidebar, en footer ou dans une page d&apos;annuaire.
        </p>
        <p>
          Pour analyser les profils de backlinks de vos concurrents les mieux positionnes, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">la base de donnees de backlinks de Semrush couvre plus de 43 000 milliards de liens</a>.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Prix d&apos;un Backlink : Combien Faut-il Payer ?</h3>
        <p>
          Le prix d&apos;un backlink varie enormement selon la qualite du site referent. En moyenne, le cout d&apos;un backlink de qualite se situe autour de {formatCurrency(benchmarks.seo.avg_backlink_cost)}, mais les fourchettes sont larges. Un article invite sur un blog a faible DA peut couter entre 50 et 150 $, tandis qu&apos;un lien editorial sur un site a fort DA (70+) peut atteindre 500 a 2 000 $ ou plus.
        </p>
        <p>
          Notre calculateur recommande de ne jamais payer plus que l&apos;equivalent de 6 mois de la valeur mensuelle estimee du lien. C&apos;est un critere conservateur qui garantit un retour sur investissement positif. Si un backlink genere 100 $ de valeur mensuelle (en combinant trafic referent et valeur SEO), son prix juste se situe aux alentours de 600 $.
        </p>
        <p>
          Attention aux offres trop attractives : un backlink a 20 $ provient presque certainement d&apos;un reseau de sites (PBN) ou d&apos;un annuaire spam. Ces liens peuvent non seulement etre inutiles, mais aussi entrainer des penalites de Google. Investissez dans la qualite plutot que dans la quantite.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Construire un Profil de Liens de Haute Valeur</h3>
        <p>
          Les strategies de netlinking les plus efficaces se concentrent sur l&apos;acquisition naturelle de liens plutot que sur l&apos;achat. Creez du contenu veritablement utile — etudes originales, guides complets, outils interactifs et analyses basees sur des donnees — que d&apos;autres sites voudront naturellement referencer et citer. Le content marketing reste le levier le plus puissant pour attirer des backlinks de qualite sur le long terme.
        </p>
        <p>
          Completez cette approche par une prospection ciblee aupres de sites pertinents ou votre contenu apporte une reelle valeur ajoutee a leur audience. La qualite prime toujours sur la quantite en matiere de netlinking : 10 liens provenant de sites pertinents a DA 50+ surpasseront 100 liens de sources de faible qualite.
        </p>
        <p>
          Pour une analyse complete de vos backlinks et la recherche de liens concurrents, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">essayez les outils de netlinking de Semrush pour identifier et prioriser les meilleures opportunites</a>.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Erreurs Courantes dans l&apos;Evaluation des Backlinks</h3>
        <p>
          L&apos;une des erreurs les plus frequentes est de se focaliser uniquement sur le DA du site referent sans considerer la pertinence thematique. Un lien DA 80 provenant d&apos;un site totalement hors sujet aura moins d&apos;impact qu&apos;un lien DA 40 d&apos;un site parfaitement pertinent dans votre niche. De meme, beaucoup de professionnels sous-estiment l&apos;importance du placement : un lien dans un footer repete sur toutes les pages du site n&apos;a quasiment aucune valeur comparee a un lien editorial unique dans un article de fond.
        </p>
        <p>
          Une autre erreur classique consiste a ignorer le trafic referent reel. Un backlink n&apos;est pas uniquement un signal pour Google : c&apos;est aussi une source potentielle de visiteurs qualifies. Un lien qui genere 500 visites par mois depuis un site pertinent a une valeur directe considerable, independamment de son impact SEO. Notre calculateur integre cette double dimension — valeur SEO et valeur de trafic referent — pour vous donner une estimation realiste et complete.
        </p>
      </div>
    </div>
  ),
  faqs: [
    {
      question: 'Combien vaut un backlink ?',
      answer: 'La valeur d\'un backlink depend de plusieurs facteurs : l\'autorite du domaine referent (DA), la pertinence thematique par rapport a votre site, le statut dofollow/nofollow, le placement dans le contenu et le volume de trafic referent. Un backlink de haute qualite (DA 60+, thematiquement pertinent, dofollow, dans le contenu editorial) peut valoir entre 200 et 2 000 $ par an en termes de valeur SEO et de trafic. Notre calculateur estime precisement cette valeur en combinant six metriques cles.',
    },
    {
      question: 'Comment calculer la valeur d\'un lien ?',
      answer: 'Pour calculer la valeur d\'un lien, il faut evaluer sa contribution en termes de SEO (transfert d\'autorite) et de trafic referent (visiteurs directs). Notre formule attribue 40 % du score a l\'autorite du domaine, 30 % a la pertinence, 15 % au statut follow et 15 % au placement. La valeur mensuelle combine ensuite le score de qualite (multiplie par un coefficient de valeur SEO) avec la valeur du trafic referent. Le prix juste correspond a 6 mois de cette valeur mensuelle.',
    },
    {
      question: 'Quel est le prix moyen d\'un backlink en France ?',
      answer: 'En France, le prix d\'un backlink de qualite se situe generalement entre 100 et 800 euros pour un article invite, et peut depasser 1 500 euros pour un lien editorial sur un site media a fort DA. Les plateformes de netlinking comme Getfluence, Rocketlinks ou Soumettre.fr proposent des tarifs tres variables. L\'essentiel est de comparer le prix demande avec la valeur reelle du lien — utilisez notre calculateur pour verifier que le retour sur investissement est positif avant d\'acheter.',
    },
    {
      question: 'Les liens nofollow ont-ils une valeur SEO ?',
      answer: 'Oui, mais nettement moindre que les liens dofollow. Depuis 2019, Google considere le nofollow comme un « indice » plutot qu\'une directive, ce qui signifie qu\'une partie de l\'equite de lien peut quand meme etre transmise. Les liens nofollow apportent aussi du trafic referent, de la notoriete de marque et contribuent a un profil de liens naturel. Notre calculateur pondere les liens nofollow a 30 % de la valeur SEO d\'un lien dofollow, conformement au consensus du secteur.',
    },
    {
      question: 'Comment evaluer la qualite d\'un backlink a grande echelle ?',
      answer: 'Pour auditer vos backlinks a grande echelle, combinez plusieurs metriques : autorite du domaine referent, pertinence thematique, placement du lien (editorial vs sidebar vs footer), statut follow et trafic referent reel. Des outils comme Semrush et Ahrefs fournissent des bases de donnees de backlinks qui permettent d\'analyser des milliers de liens simultanement. Concentrez-vous sur la qualite plutot que la quantite — un lien d\'un site DA 70 pertinent vaut davantage que 50 liens d\'annuaires bas de gamme.',
    },
    {
      question: 'Quelle est la difference entre un lien dofollow et nofollow ?',
      answer: 'Un lien dofollow transmet la totalite de son « jus SEO » (equite de lien) a la page ciblee, signalant a Google que le site referent approuve et recommande votre contenu. Un lien nofollow indique aux moteurs de recherche de ne pas suivre le lien pour le classement. Cependant, Google traite desormais le nofollow comme un indice, pas une regle absolue. En pratique, privilegiez les liens dofollow pour maximiser l\'impact SEO, mais ne negligez pas les nofollow qui apportent du trafic referent et de la credibilite.',
    },
    {
      question: 'Comment obtenir des backlinks de qualite gratuitement ?',
      answer: 'Les meilleures strategies gratuites incluent : creer du contenu exceptionnel (etudes de cas, infographies, outils gratuits) qui attire naturellement des liens ; publier des articles invites sur des blogs pertinents ; participer activement a des forums et communautes de votre secteur ; proposer vos donnees ou expertises aux journalistes via des plateformes comme HARO ; et tisser des partenariats avec des sites complementaires. Le guest blogging reste l\'une des methodes les plus efficaces quand il est fait sur des sites de qualite, avec un contenu original et pertinent.',
    },
    {
      question: 'Un backlink peut-il nuire a mon classement Google ?',
      answer: 'Oui. Les backlinks provenant de sites spam, de reseaux de blogs prives (PBN), de fermes de liens ou de sites penalises par Google peuvent avoir un impact negatif sur votre classement. Google Penguin identifie les profils de liens non naturels et peut penaliser les sites qui en abusent. Si vous decouvrez des backlinks toxiques pointant vers votre site, utilisez l\'outil de desaveu de Google (Disavow Tool) pour les neutraliser. C\'est pourquoi il est crucial d\'evaluer la qualite de chaque lien avant de l\'acquérir — notre calculateur vous aide a identifier les liens a eviter.',
    },
  ],
  languageSwitcher: { label: 'English', href: '/tools/backlink-value-calculator' },
};

export default function CalculateurValeurBacklinksClient() {
  return <BacklinkCalculatorCore t={frTexts} />;
}
