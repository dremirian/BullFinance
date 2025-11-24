import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientProvider } from "@/contexts/ClientContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DashboardReceitas from "./pages/DashboardReceitas";
import DashboardDespesas from "./pages/DashboardDespesas";
import DashboardBancario from "./pages/DashboardBancario";
import DashboardDRE from "./pages/DashboardDRE";
import DashboardConsultor from "./pages/DashboardConsultor";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import Accounts from "./pages/Accounts";
import CashFlow from "./pages/CashFlow";
import CostCenters from "./pages/CostCenters";
import BankAccounts from "./pages/BankAccounts";
import BankReconciliation from "./pages/BankReconciliation";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import Budgets from "./pages/Budgets";
import Reports from "./pages/Reports";
import Clients from "./pages/Clients";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BullAIChat } from "@/components/BullAIChat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ClientProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-consultor"
              element={
                <ProtectedRoute>
                  <DashboardConsultor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-receitas"
              element={
                <ProtectedRoute>
                  <DashboardReceitas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-despesas"
              element={
                <ProtectedRoute>
                  <DashboardDespesas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-bancario"
              element={
                <ProtectedRoute>
                  <DashboardBancario />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-dre"
              element={
                <ProtectedRoute>
                  <DashboardDRE />
                </ProtectedRoute>
              }
            />
            <Route
              path="/executive-dashboard"
              element={
                <ProtectedRoute>
                  <ExecutiveDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <Accounts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash-flow"
              element={
                <ProtectedRoute>
                  <CashFlow />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cost-centers"
              element={
                <ProtectedRoute>
                  <CostCenters />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bank-accounts"
              element={
                <ProtectedRoute>
                  <BankAccounts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bank-reconciliation"
              element={
                <ProtectedRoute>
                  <BankReconciliation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <Suppliers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/budgets"
              element={
                <ProtectedRoute>
                  <Budgets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BullAIChat />
          </ClientProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
