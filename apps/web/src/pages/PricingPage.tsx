import { Link } from 'react-router-dom';
import { Button } from '@daypilot/ui';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for individuals getting started',
    features: [
      'Personal calendar',
      'Basic event management',
      'Recurring events',
      '1 booking link',
      'AI suggestions',
    ],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: 'per month',
    description: 'For professionals who need more',
    features: [
      'Everything in Free',
      'Unlimited booking links',
      'Calendar sync (Google, Outlook, Apple)',
      'Advanced AI scheduling',
      'Priority support',
      'Custom branding',
    ],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$29',
    period: 'per month',
    description: 'For teams and small businesses',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Shared calendars',
      'Organization management',
      'Multi-location support',
      'Admin controls',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      'Everything in Team',
      'Unlimited users',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
      'Custom training',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

export function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="section-padding py-4 md:py-6 flex justify-between items-center sticky top-0 z-50 glass-effect border-b border-white/20">
        <Link to="/" className="text-xl md:text-2xl font-bold gradient-text hover:opacity-80 transition-opacity">
          DayPilot
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link 
            to="/features" 
            className="text-[#2B3448] hover:text-[#4FB3B3] font-medium transition-colors text-sm md:text-base"
          >
            Features
          </Link>
          <Link 
            to="/pricing" 
            className="text-[#2B3448] hover:text-[#4FB3B3] font-medium transition-colors text-sm md:text-base"
          >
            Pricing
          </Link>
          <Link 
            to="/login" 
            className="text-[#2B3448] hover:text-[#4FB3B3] font-medium transition-colors text-sm md:text-base"
          >
            Sign In
          </Link>
          <Link to="/signup" className="inline-block">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
        <button className="md:hidden p-2 text-[#2B3448]" aria-label="Menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>

      {/* Header */}
      <section className="container-width section-padding py-16 md:py-24 lg:py-32 text-center">
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#2B3448] leading-tight px-4">
            Simple, Transparent{' '}
            <span className="gradient-text">Pricing</span>
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-[#4f4f4f] leading-relaxed px-4">
            Choose the plan that works for you. All plans include a free trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container-width section-padding pb-16 md:pb-24 lg:pb-32">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`glass-effect rounded-2xl p-6 md:p-8 flex flex-col ${
                plan.highlight
                  ? 'border-2 border-[#4FB3B3] shadow-xl scale-105 md:scale-110 relative'
                  : 'border border-white/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-[#EFBF4D] to-[#4FB3B3] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                    POPULAR
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-bold text-[#2B3448] mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-3xl md:text-4xl font-bold text-[#2B3448]">{plan.price}</span>
                  {plan.period && (
                    <span className="text-[#4f4f4f] ml-2 text-base md:text-lg">/{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-[#4f4f4f] mb-6">{plan.description}</p>
                <ul className="space-y-2.5 md:space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <span className="text-[#4FB3B3] mr-2 mt-0.5 font-bold">✓</span>
                      <span className="text-sm md:text-base text-[#4f4f4f] leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/signup" className="block mt-auto">
                <Button
                  variant={plan.highlight ? 'primary' : 'outline'}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ or Additional Info */}
      <section className="container-width section-padding pb-16 md:pb-24 lg:pb-32 text-center">
        <div className="max-w-2xl mx-auto space-y-3 md:space-y-4 px-4">
          <p className="text-base md:text-lg text-[#4f4f4f]">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <p className="text-sm text-[#4f4f4f]">
            Questions?{' '}
            <Link to="/" className="text-[#4FB3B3] hover:underline font-medium">
              Contact us
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
