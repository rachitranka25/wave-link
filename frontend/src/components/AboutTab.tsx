import { Globe, Network, Radio, Shield, Users } from "lucide-react";

export default function AboutTab() {
  return (
    <div className="space-y-6">
      <div className="bg-blue-900/40 backdrop-blur-sm border border-blue-700 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-cyan-400" size={40} />
          <h2 className="text-3xl font-bold text-white">About Wave-Link</h2>
        </div>

        <div className="space-y-6 text-gray-300">
          <div>
            <h3 className="text-xl font-bold text-white mb-3">
              Problem Statement
            </h3>
            <p className="leading-relaxed">
              India's vast coastline is vulnerable to ocean hazards such as
              tsunamis, storm surges, high waves, coastal currents, and
              abnormal sea behavior. While agencies like INCOIS provide
              early warnings based on satellite data, sensors, and
              numerical models, real-time field reporting from citizens and
              local communities is often unavailable — especially when a
              storm knocks out cell towers right when reporting matters
              most.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-3">
              Our Solution
            </h3>
            <p className="leading-relaxed mb-4">
              Wave-Link combines crowdsourced reporting, AI-powered
              analysis, and an offline mesh relay network to keep hazard
              intelligence flowing even when the internet doesn't:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>
                  Real-time hazard reporting by citizens and coastal
                  communities
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>
                  Automatic sentiment, entity, and severity analysis on
                  every report submitted
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>
                  Offline peer-to-peer mesh relay so reports still reach the
                  platform when towers are down
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>
                  Interactive live map and analytics for authorities and
                  communities
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-cyan-900/30 border border-cyan-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-3">
              Key Features
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Users className="text-cyan-400 mt-1" size={20} />
                <div>
                  <p className="font-semibold text-white">Crowdsourcing</p>
                  <p className="text-sm text-gray-300">
                    Community-driven reporting
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Radio className="text-cyan-400 mt-1" size={20} />
                <div>
                  <p className="font-semibold text-white">AI Analysis</p>
                  <p className="text-sm text-gray-300">
                    Sentiment, entities & severity
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Network className="text-cyan-400 mt-1" size={20} />
                <div>
                  <p className="font-semibold text-white">Mesh Relay</p>
                  <p className="text-sm text-gray-300">
                    Works when connectivity doesn't
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="text-cyan-400 mt-1" size={20} />
                <div>
                  <p className="font-semibold text-white">Open Mapping</p>
                  <p className="text-sm text-gray-300">
                    Live coastline hazard visualization
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
