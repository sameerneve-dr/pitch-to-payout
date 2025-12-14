import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NewPitchPage from "./pages/NewPitchPage";
import PanelPage from "./pages/PanelPage";
import DealPage from "./pages/DealPage";
import SuccessPage from "./pages/SuccessPage";
import HistoryPage from "./pages/HistoryPage";
import BillingPage from "./pages/BillingPage";
import PricingPage from "./pages/PricingPage";
import BillingSuccessPage from "./pages/BillingSuccessPage";
import BillingCancelPage from "./pages/BillingCancelPage";
import SeedPage from "./pages/SeedPage";
import DemoPage from "./pages/DemoPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/new" element={<NewPitchPage />} />
          <Route path="/panel/:panelId" element={<PanelPage />} />
          <Route path="/deal/:dealId" element={<DealPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/billing/success" element={<BillingSuccessPage />} />
          <Route path="/billing/cancel" element={<BillingCancelPage />} />
          <Route path="/seed" element={<SeedPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
