import { marketingFeatures } from "@/lib/marketing-features";

export function FeatureGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {marketingFeatures.map((feature) => (
        <div
          key={feature.title}
          className="glass-effect rounded-2xl p-6 md:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <div className="text-4xl md:text-5xl mb-4" aria-hidden>
            {feature.icon}
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] mb-2 md:mb-3">
            {feature.title}
          </h3>
          <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
}
