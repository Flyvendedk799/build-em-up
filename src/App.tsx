import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Placeholder from "./pages/Placeholder.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/webshop" element={<Placeholder active="shop" eyebrow="Webshop" title="Frø, planter, jord og smarte værktøjer." description="Et nøje udvalgt sortiment fra danske leverandører — alt sammen testet i dansk klima." />} />
          <Route path="/havemaaler" element={<Placeholder active="sizer" eyebrow="Havemåler" title="Tegn din have. Få en plæneklipper-anbefaling." description="Indtast din adresse og tegn dine bede og plæner direkte på satellitkortet." />} />
          <Route path="/vanding" element={<Placeholder active="water" eyebrow="Vandingsplan" title="Vanding der følger vejret." description="Lav timere for hvert bed. AI'en justerer efter regn og planternes behov." />} />
          <Route path="/ai" element={<Placeholder active="ai" eyebrow="Plantepleje AI" title="Spørg om alt. Den kender din have." description="Få råd om beskæring, gødning, sygdomme og daglig pleje." />} />
          <Route path="/konto" element={<Placeholder active="account" eyebrow="Min konto" title="Din have, dine ordrer." description="Samlet overblik over alt du har gang i." />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
