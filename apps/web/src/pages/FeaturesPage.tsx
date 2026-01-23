import { Link } from 'react-router-dom';
import { Button } from '@daypilot/ui';

const features = [
  {
    icon: '🤖',
    title: 'AI-Powered Scheduling',
    description: 'Let AI analyze your calendar and suggest optimal times for meetings and tasks based on your preferences and energy levels.',
  },
  {
    icon: '📅',
    title: 'Multi-Calendar Management',
    description: 'Connect and sync calendars from Google, Outlook, Apple, and more. View all your events in one unified calendar.',
  },
  {
    icon: '🔗',
    title: 'Booking Links',
    description: 'Create shareable booking links that let clients book time directly on your calendar. Set availability rules and blackout dates.',
  },
  {
    icon: '🔄',
    title: 'Recurring Events',
    description: 'Create recurring meetings and events with full RRULE support. Manage series and exceptions easily.',
  },
  {
    icon: '🌍',
    title: 'Timezone Support',
    description: 'Work across timezones with confidence. Freeze your timezone when traveling to keep events in your home timezone.',
  },
  {
    icon: '👥',
    title: 'Team Collaboration',
    description: 'Create organizations, add team members, and manage shared calendars for your team or franchise.',
  },
  {
    icon: '📍',
    title: 'Multi-Location Support',
    description: 'Manage calendars for multiple locations. Perfect for franchises, multi-site businesses, and remote teams.',
  },
  {
    icon: '⚡',
    title: 'Quick Actions',
    description: 'Use natural language to create events. Just type "Lunch with John tomorrow at 1pm" and DayPilot handles the rest.',
  },
  {
    icon: '🎯',
    title: 'Smart Suggestions',
    description: 'Get AI-powered suggestions for optimizing your schedule, finding focus time, and avoiding conflicts.',
  },
];

export function FeaturesPage() {
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
            Everything You Need to{' '}
            <span className="gradient-text">Manage Your Time</span>
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-[#4f4f4f] leading-relaxed px-4">
            DayPilot combines powerful calendar management with AI to help you take control of your schedule.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container-width section-padding pb-16 md:pb-24 lg:pb-32">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-effect rounded-2xl p-6 md:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-[#2B3448] mb-2 md:mb-3">{feature.title}</h3>
              <p className="text-sm md:text-base text-[#4f4f4f] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-width section-padding pb-16 md:pb-24 lg:pb-32 text-center">
        <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2B3448]">
            Ready to get started?
          </h2>
          <p className="text-base md:text-lg text-[#4f4f4f]">
            Start your free trial today. No credit card required.
          </p>
          <Link to="/signup" className="inline-block">
            <Button size="lg">Start Free Trial</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
