const stats = [
  { value: "10+", label: "Hours saved per week on email & task triage" },
  { value: "10x", label: "Average ROI reported by teams using our AI agents" },
  { value: "85%", label: "Faster turnaround on manual, repetitive processes" },
  { value: "24/7", label: "Agent coverage with no added headcount" },
];

const PlansSavingsSection = () => {
  return (
    <section className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Time Saved Is <span className="text-[#CD7F32]">Money Saved</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Every plan includes AI agents and digitized workflows that take
            repetitive, manual work off your team&apos;s plate. Fewer hours spent
            on follow-ups, data entry, and scheduling means lower labor cost per
            customer served — the savings show up directly in your bottom line.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border-2 border-gray-200 p-6 text-center"
            >
              <div className="text-4xl font-bold text-[#CD7F32] mb-2">
                {stat.value}
              </div>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          Built by engineers who&apos;ve delivered automation and digital
          systems for enterprise teams —{" "}
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#CD7F32] hover:underline"
          >
            see the portfolio
          </a>
          .
        </p>
      </div>
    </section>
  );
};

export default PlansSavingsSection;
