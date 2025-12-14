import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import PlansPage from "./pages/PlansPage";
import SubscriptionCheckoutPage from "./pages/SubscriptionCheckoutPage";
import AppPage from "./pages/AppPage";
import NewPitchPage from "./pages/NewPitchPage";
import PanelPage from "./pages/PanelPage";
import DealPage from "./pages/DealPage";
import SuccessPage from "./pages/SuccessPage";
import SubscriptionSuccessPage from "./pages/SubscriptionSuccessPage";
import CheckoutReturnPage from "./pages/CheckoutReturnPage";
import HistoryPage from "./pages/HistoryPage";
import BillingPage from "./pages/BillingPage";
import PricingPage from "./pages/PricingPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/subscription-checkout" element={<SubscriptionCheckoutPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
          <Route path="/checkout/return" element={<CheckoutReturnPage />} />
          
          {/* Protected routes (require active subscription) */}
          <Route path="/app" element={<AppPage />} />
          <Route path="/new" element={<NewPitchPage />} />
          <Route path="/panel/:panelId" element={<PanelPage />} />
          <Route path="/deal/:dealId" element={<DealPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
