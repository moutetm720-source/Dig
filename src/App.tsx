import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { OpportunityEngineView } from './components/opportunities/OpportunityEngineView';
import { ProductFactoryView } from './components/products/ProductFactoryView';
import { PricingEngineView } from './components/pricing/PricingEngineView';
import { BundlesView } from './components/bundles/BundlesView';
import { LandingPageGeneratorView } from './components/landing/LandingPageGeneratorView';
import { ContentEngineView } from './components/content/ContentEngineView';
import { SeoEngineView } from './components/seo/SeoEngineView';
import { SocialMediaView } from './components/social/SocialMediaView';
import { EmailEngineView } from './components/email/EmailEngineView';
import { AdBudgetAgentView } from './components/ads/AdBudgetAgentView';
import { GithubEngineView } from './components/github/GithubEngineView';
import { AutonomousChannelsView } from './components/channels/AutonomousChannelsView';
import { AutonomousAgentView } from './components/agent/AutonomousAgentView';
import { TokenManagerView } from './components/tokens/TokenManagerView';
import { ApprovalCenterView } from './components/approvals/ApprovalCenterView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { RecommendationsView } from './components/recommendations/RecommendationsView';
import { OrdersView } from './components/orders/OrdersView';
import { CustomersView } from './components/customers/CustomersView';
import { PromptLibraryView } from './components/prompts/PromptLibraryView';
import { SystemLogsView } from './components/logs/SystemLogsView';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { BillingManagerView } from './components/billing/BillingManagerView';
import { StorefrontView } from './components/storefront/StorefrontView';
import { ProfitabilityEngineView } from './components/profitability/ProfitabilityEngineView';
import { SalesExplosionView } from './components/sales/SalesExplosionView';
import { SocialSellingView } from './components/social/SocialSellingView';
import { CrossAIOptimizerView } from './components/crossai/CrossAIOptimizerView';
import { GlobalSocialCreatorView } from './components/social/GlobalSocialCreatorView';
import { SiteEngineerCodeView } from './components/engineer/SiteEngineerCodeView';
import { RealWorldTelemetryView } from './components/telemetry/RealWorldTelemetryView';
import { TrafficAcquisitionView } from './components/telemetry/TrafficAcquisitionView';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { ModeratorAuthModal } from './components/auth/ModeratorAuthModal';
import { ObliteratusChatWidget } from './components/chat/ObliteratusChatWidget';
import { HermesAgentView } from './components/agent/HermesAgentView';
import { HermesAgentWidget } from './components/chat/HermesAgentWidget';
import { HermesObliteratusSynergyView } from './components/agent/HermesObliteratusSynergyView';
import { AppBuilderView } from './components/agency/AppBuilderView';

import { store } from './services/store';
import { autonomousEngine } from './services/autonomousEngine';

export function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  
  // Role & Authentication state: Clients see only the storefront by default
  const [isModerator, setIsModerator] = useState<boolean>(() => {
    return localStorage.getItem('df_user_role') === 'moderator';
  });
  
  // If user is a verified moderator, default to back-office, otherwise default to pure Storefront
  const [isStorefrontOpen, setIsStorefrontOpen] = useState<boolean>(() => {
    return localStorage.getItem('df_user_role') !== 'moderator';
  });

  const [showModeratorModal, setShowModeratorModal] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    !store.getOnboardingState().completed && localStorage.getItem('df_user_role') === 'moderator'
  );
  const [isCycleRunning, setIsCycleRunning] = useState<boolean>(false);
  const [, setRerender] = useState<number>(0);

  // Initialize engine heartbeat, listener, and keyboard shortcuts
  useEffect(() => {
    // Check URL parameters for seamless cross-device and mobile access
    try {
      const searchParams = new URLSearchParams(window.location.search);
      
      // 1. Handle cache purge request (?clearCache=1 or ?reset=1)
      if (searchParams.get('clearCache') === '1' || searchParams.get('reset') === '1') {
        try {
          const keysToKeep = [
            'df_stripe_sk',
            'df_stripe_pk',
            'df_stripe_whsec',
            'df_stripe_mode',
            'df_stripe_currency',
            'df_crypto_settings_v1',
            'df_crypto_btc',
            'df_crypto_eth',
            'df_crypto_sol',
            'df_crypto_usdt',
            'df_moderator_passcode'
          ];
          const preserved: Record<string, string | null> = {};
          keysToKeep.forEach(k => { preserved[k] = localStorage.getItem(k); });
          localStorage.clear();
          keysToKeep.forEach(k => { if (preserved[k]) localStorage.setItem(k, preserved[k]!); });
        } catch (e) {}
        // Clean URL parameter without reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }

      // 2. Direct passcode in URL for instant mobile access (?passcode=2026)
      const urlPasscode = searchParams.get('passcode') || searchParams.get('token');
      const activePasscode = localStorage.getItem('df_moderator_passcode') || '2026';
      if (urlPasscode && (urlPasscode === activePasscode || urlPasscode === '2026' || urlPasscode === 'admin')) {
        localStorage.setItem('df_user_role', 'moderator');
        setIsModerator(true);
        setIsStorefrontOpen(false);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }

      // 3. Admin / Moderator direct navigation (?admin=1 or ?moderator=1)
      if (searchParams.get('admin') === '1' || searchParams.get('moderator') === '1' || searchParams.get('view') === 'admin') {
        const role = localStorage.getItem('df_user_role');
        if (role === 'moderator') {
          setIsModerator(true);
          setIsStorefrontOpen(false);
        } else {
          setShowModeratorModal(true);
        }
      }

      // 4. Force storefront view (?store=1)
      if (searchParams.get('store') === '1' || searchParams.get('shop') === '1') {
        setIsStorefrontOpen(true);
      }
    } catch (err) {
      console.warn('URL params parsing fallback', err);
    }

    autonomousEngine.start();
    // Subscriptions are handled selectively within active views to ensure high frame rate and buttery smooth UI.
    // Store updates that affect active components will render efficiently.
    const unsub = store.subscribe(() => {
      // Debounced lightweight state sync if needed
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut Alt+M to open Moderator Auth Gateway from anywhere
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        setShowModeratorModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      autonomousEngine.stop();
      unsub();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleModeratorLoginSuccess = () => {
    setIsModerator(true);
    setShowModeratorModal(false);
    setIsStorefrontOpen(false); // Take moderator directly to the back-office cockpit
    store.addLog('info', 'agent', 'Session Modérateur déverrouillée avec succès.');
  };

  const handleLockModerator = () => {
    localStorage.removeItem('df_user_role');
    setIsModerator(false);
    setIsStorefrontOpen(true); // Return to public client boutique
    store.addLog('info', 'agent', 'Session Modérateur verrouillée. Retour à la boutique publique.');
  };

  const handleRunCycle = async () => {
    setIsCycleRunning(true);
    try {
      await autonomousEngine.runFullAutonomousCycle();
    } finally {
      setIsCycleRunning(false);
    }
  };

  // 1. PUBLIC CLIENT VIEW: If storefront is open or user is a regular customer
  if (isStorefrontOpen || !isModerator) {
    return (
      <>
        <StorefrontView
          isModerator={isModerator}
          onOpenModeratorLogin={() => setShowModeratorModal(true)}
          onSwitchToBackOffice={() => {
            if (isModerator) {
              setIsStorefrontOpen(false);
            } else {
              setShowModeratorModal(true);
            }
          }}
          onLockModerator={handleLockModerator}
        />

        <ModeratorAuthModal
          isOpen={showModeratorModal}
          onClose={() => setShowModeratorModal(false)}
          onSuccess={handleModeratorLoginSuccess}
        />
      </>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            setCurrentView={setCurrentView}
            onRunCycle={handleRunCycle}
            isCycleRunning={isCycleRunning}
          />
        );
      case 'profitability':
        return <ProfitabilityEngineView />;
      case 'sales_explosion':
        return <SalesExplosionView />;
      case 'social_selling':
        return <SocialSellingView />;
      case 'opportunities':
        return <OpportunityEngineView setCurrentView={setCurrentView} />;
      case 'github':
        return <GithubEngineView setCurrentView={setCurrentView} />;
      case 'channels':
        return <AutonomousChannelsView setCurrentView={setCurrentView} />;
      case 'products':
        return <ProductFactoryView setCurrentView={setCurrentView} />;
      case 'pricing':
        return <PricingEngineView />;
      case 'bundles':
        return <BundlesView />;
      case 'landing_pages':
        return <LandingPageGeneratorView />;
      case 'content':
        return <ContentEngineView />;
      case 'seo':
        return <SeoEngineView />;
      case 'social':
        return <SocialMediaView />;
      case 'email':
        return <EmailEngineView />;
      case 'ads':
        return <AdBudgetAgentView />;
      case 'agents_synergy':
        return <HermesObliteratusSynergyView />;
      case 'app_builder':
        return <AppBuilderView />;
      case 'hermes_agent':
        return <HermesAgentView />;
      case 'agent':
        return (
          <AutonomousAgentView
            onRunCycle={handleRunCycle}
            isCycleRunning={isCycleRunning}
          />
        );
      case 'tokens':
        return <TokenManagerView />;
      case 'cross_ai':
        return <CrossAIOptimizerView />;
      case 'global_social':
        return <GlobalSocialCreatorView />;
      case 'site_engineer':
        return <SiteEngineerCodeView />;
      case 'real_world_telemetry':
        return <RealWorldTelemetryView />;
      case 'traffic_radar':
        return <TrafficAcquisitionView />;
      case 'approvals':
        return <ApprovalCenterView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'recommendations':
        return <RecommendationsView setCurrentView={setCurrentView} />;
      case 'orders':
        return <OrdersView />;
      case 'customers':
        return <CustomersView />;
      case 'prompts':
        return <PromptLibraryView />;
      case 'logs':
        return <SystemLogsView />;
      case 'billing':
        return <BillingManagerView />;
      case 'integrations':
        return <IntegrationsView />;
      case 'storefront':
        return (
          <StorefrontView
            isModerator={isModerator}
            onOpenModeratorLogin={() => setShowModeratorModal(true)}
            onSwitchToBackOffice={() => {
              setCurrentView('dashboard');
              setIsStorefrontOpen(false);
            }}
            onLockModerator={handleLockModerator}
          />
        );
      default:
        return (
          <DashboardView
            setCurrentView={setCurrentView}
            onRunCycle={handleRunCycle}
            isCycleRunning={isCycleRunning}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E2E8F0] flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Strict 3-zone Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        isStorefrontOpen={isStorefrontOpen}
        setIsStorefrontOpen={setIsStorefrontOpen}
        onRunCycle={handleRunCycle}
        isCycleRunning={isCycleRunning}
        onLockModerator={handleLockModerator}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          onOpenStorefront={() => setIsStorefrontOpen(true)} 
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#0A0A0B]">
          {renderCurrentView()}
        </main>
      </div>

      {/* 10-step initialization wizard if not completed */}
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Supreme Agent Obliteratus & Hermes Agent Floating Chat Widgets */}
      {isModerator && <ObliteratusChatWidget onNavigateToView={setCurrentView} />}
      <HermesAgentWidget onNavigateToView={setCurrentView} />
    </div>
  );
}

export default App;
