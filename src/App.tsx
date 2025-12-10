import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NewProduct from "./pages/NewProduct";
import Settings from "./pages/Settings";
import PaymentPage from "./pages/PaymentPage";
import ProductManage from "./pages/ProductManage";
import Members from "./pages/Members";
import LessonView from "./pages/LessonView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const RouteEvents = () => {
  const location = useLocation();
  useEffect(() => {
    initPixel();
    trackPixelEvent({ name: "PageView", time: Date.now(), sourceUrl: window.location.href });
    flushQueue();
  }, [location.pathname, location.search]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/new-product" element={<NewProduct />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/dashboard/product/:productId" element={<ProductManage />} />
          <Route path="/members" element={<Members />} />
          <Route path="/members/product/:productId/lesson/:lessonId" element={<LessonView />} />
          <Route path="/pay/:productId" element={<PaymentPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <RouteEvents />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
import { useEffect } from "react";
import { initPixel, trackPixelEvent, flushQueue } from "@/utils/fb";
