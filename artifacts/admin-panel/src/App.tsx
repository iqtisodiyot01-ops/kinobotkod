import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/dashboard";
import Movies from "@/pages/movies";
import MovieForm from "@/pages/movie-form";
import Users from "@/pages/users";
import Broadcast from "@/pages/broadcast";
import Categories from "@/pages/categories";
import BotSettings from "@/pages/bot-settings";
import BotCommands from "@/pages/bot-commands";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/movies/new" component={MovieForm} />
        <Route path="/movies/:id" component={MovieForm} />
        <Route path="/movies" component={Movies} />
        <Route path="/users" component={Users} />
        <Route path="/broadcast" component={Broadcast} />
        <Route path="/categories" component={Categories} />
        <Route path="/bot-settings" component={BotSettings} />
        <Route path="/bot-commands" component={BotCommands} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
