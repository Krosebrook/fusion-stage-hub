import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Approvals from "./pages/Approvals";
import Jobs from "./pages/Jobs";
import Stores from "./pages/Stores";
import Plugins from "./pages/Plugins";
import Products from "./pages/Products";
import Publishing from "./pages/Publishing";
import Settings from "./pages/Settings";
import Audit from "./pages/Audit";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="/products" element={<Products />} />
          <Route path="/publishing" element={<Publishing />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
