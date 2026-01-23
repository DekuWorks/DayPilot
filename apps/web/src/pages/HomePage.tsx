import { Link } from 'react-router-dom';
import { Button } from '@daypilot/ui';

export function HomePage() {
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
        {/* Mobile menu button */}
        <button className="md:hidden p-2 text-[#2B3448]" aria-label="Menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>

      {/* Hero Section */}
      <section className="container-width section-padding py-16 md:py-24 lg:py-32 text-center">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#2B3448] leading-tight">
            Pilot Your Day with{' '}
            <span className="gradient-text">AI</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#4f4f4f] max-w-3xl mx-auto leading-relaxed px-4">
            Connect your calendars, let AI plan your day, and pilot your schedule with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2 md:pt-4 px-4">
            <Link to="/signup" className="w-full sm:w-auto inline-block">
              <Button size="lg" className="w-full sm:w-auto min-w-[180px]">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/features" className="w-full sm:w-auto inline-block">
              <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-[180px]">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="container-width section-padding py-16 md:py-24 lg:py-32">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2B3448] mb-3 md:mb-4">
            Everything you need to manage your time
          </h2>
          <p className="text-base md:text-lg text-[#4f4f4f] max-w-2xl mx-auto px-4">
            Powerful features designed to help you take control of your schedule
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[
            {
              icon: '🤖',
              title: 'AI-Powered Planning',
              description: 'Let AI analyze your schedule and suggest optimal times for tasks and meetings.',
            },
            {
              icon: '📅',
              title: 'Multi-Calendar Sync',
              description: 'Connect Google Calendar, Outlook, and Apple Calendar in one place.',
            },
            {
              icon: '🔗',
              title: 'Booking Links',
              description: 'Share your availability with clients and let them book time directly.',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="glass-effect rounded-2xl p-6 md:p-8 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-4xl md:text-5xl mb-4 md:mb-6">{feature.icon}</div>
              <h3 className="text-lg md:text-xl font-semibold text-[#2B3448] mb-2 md:mb-3">{feature.title}</h3>
              <p className="text-sm md:text-base text-[#4f4f4f] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container-width section-padding py-16 md:py-24 lg:py-32 text-center">
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 glass-effect rounded-3xl p-8 md:p-12 lg:p-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#2B3448]">
            Ready to take control of your schedule?
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-[#4f4f4f]">
            Join thousands of professionals who use DayPilot to manage their time better.
          </p>
          <Link to="/signup" className="inline-block">
            <Button size="lg">Get Started Free</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
