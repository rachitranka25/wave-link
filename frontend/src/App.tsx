import { useState } from "react";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  BarChart3,
  Map as MapIcon,
  Menu,
  Network,
  RefreshCw,
  Shield,
  Waves,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import HomeTab from "./components/HomeTab";
import ReportTab from "./components/ReportTab";
import MapTab from "./components/MapTab";
import AnalyticsTab from "./components/AnalyticsTab";
import MeshTab from "./components/MeshTab";
import AboutTab from "./components/AboutTab";
import ErrorBoundary from "./components/ErrorBoundary";
import { OfflineProvider, useOffline } from "./context/OfflineContext";

export type Tab = "home" | "report" | "map" | "analytics" | "mesh" | "about";

const TABS: { id: Tab; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: "home", label: "Home", icon: Waves },
  { id: "report", label: "Report Hazard", icon: AlertTriangle },
  { id: "map", label: "Live Map", icon: MapIcon },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "mesh", label: "Mesh Network", icon: Network },
  { id: "about", label: "About", icon: Shield },
];

function OfflineToggle() {
  const { isOffline, toggleOffline, queuedReports, queuedMessages, syncNow, syncing, syncError } =
    useOffline();
  const queuedCount = queuedReports.length + queuedMessages.length;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleOffline}
        title="Simulate this device losing internet — reports/messages will queue locally and sync via the real mesh protocol once you go back online. Real phone-to-phone radio relay would need a native app; this demonstrates the sync protocol only."
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
          isOffline
            ? "bg-red-900/50 text-red-300 border border-red-700"
            : "bg-blue-900/40 text-gray-300 border border-blue-700 hover:border-cyan-400"
        }`}
      >
        {isOffline ? <WifiOff size={16} /> : <Wifi size={16} />}
        <span className="hidden sm:inline">
          {isOffline ? "Offline (simulated)" : "Online"}
        </span>
        {queuedCount > 0 && (
          <span className="px-1.5 py-0.5 bg-yellow-500 text-yellow-950 rounded-full text-xs font-bold">
            {queuedCount}
          </span>
        )}
      </button>
      {!isOffline && queuedCount > 0 && (
        <button
          onClick={() => void syncNow()}
          disabled={syncing}
          title="Flush the offline queue through the real mesh sync protocol"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-all disabled:opacity-60"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          <span className="hidden sm:inline">
            {syncing ? "Syncing…" : "Sync Now"}
          </span>
        </button>
      )}
      {syncError && (
        <span className="text-red-300 text-xs hidden md:inline">{syncError}</span>
      )}
    </div>
  );
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NavLink = ({ tab }: { tab: (typeof TABS)[number] }) => {
    const Icon = tab.icon;
    return (
      <button
        onClick={() => {
          setActiveTab(tab.id);
          setMobileMenuOpen(false);
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          activeTab === tab.id
            ? "bg-blue-600 text-white"
            : "text-gray-300 hover:bg-blue-900/50"
        }`}
      >
        <Icon size={20} />
        <span>{tab.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-900">
      <header className="bg-blue-950/80 backdrop-blur-md border-b border-blue-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Waves className="text-cyan-400" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-white">Wave-Link</h1>
                <p className="text-xs text-cyan-300">
                  Ocean Hazard Intelligence Platform
                </p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              {TABS.map((tab) => (
                <NavLink key={tab.id} tab={tab} />
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <OfflineToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-white"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav className="lg:hidden mt-4 flex flex-col gap-2 pb-4">
              {TABS.map((tab) => (
                <NavLink key={tab.id} tab={tab} />
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "home" && <HomeTab onNavigate={setActiveTab} />}
        {activeTab === "report" && <ReportTab />}
        {activeTab === "map" && <MapTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "mesh" && <MeshTab />}
        {activeTab === "about" && <AboutTab />}
      </main>

      <footer className="bg-blue-950/80 border-t border-blue-800 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Waves className="text-cyan-400" size={28} />
                <span className="text-xl font-bold text-white">
                  Wave-Link
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                Protecting coastal communities through crowdsourced
                intelligence, AI-powered analytics, and resilient mesh
                reporting.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>INCOIS</li>
                <li>Ministry of Earth Sciences</li>
                <li>NOAA</li>
                <li>UNDRR</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Team Catalyst</h4>
              <p className="text-gray-400 text-sm">
                Built for TEKATHON 4.0 - 2025, Smart India Hackathon 2025 —
                Problem Statement SIH25039.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <OfflineProvider>
        <AppShell />
      </OfflineProvider>
    </ErrorBoundary>
  );
}
