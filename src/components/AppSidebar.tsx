import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Building2,
  CreditCard,
  PiggyBank,
  FileText,
  Settings,
  LogOut,
  Menu,
  Users,
  DollarSign,
  TrendingDown,
  Wallet,
  BarChart3,
  UserCircle,
  Truck,
  UserCheck,
  RefreshCw,
  Activity,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ClientSelector } from "@/components/ClientSelector";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import logo from "@/assets/bull-finance-logo.png";

const menuItems = [
  { title: "Dashboard Consultor", url: "/dashboard-consultor", icon: UserCircle },
  { title: "Dashboard Executivo", url: "/executive-dashboard", icon: Activity },
  { title: "Dashboard Geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Dashboard Receitas", url: "/dashboard-receitas", icon: DollarSign },
  { title: "Dashboard Despesas", url: "/dashboard-despesas", icon: TrendingDown },
  { title: "Dashboard Bancário", url: "/dashboard-bancario", icon: Wallet },
  { title: "Dashboard DRE", url: "/dashboard-dre", icon: BarChart3 },
];

const dataMenuItems = [
  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Fornecedores", url: "/suppliers", icon: Truck },
  { title: "Clientes Finais", url: "/customers", icon: UserCheck },
  { title: "Contas", url: "/accounts", icon: Receipt },
  { title: "Fluxo de Caixa", url: "/cash-flow", icon: TrendingUp },
  { title: "Centros de Custo", url: "/cost-centers", icon: Building2 },
  { title: "Contas Bancárias", url: "/bank-accounts", icon: CreditCard },
  { title: "Conciliação Bancária", url: "/bank-reconciliation", icon: RefreshCw },
  { title: "Orçamentos", url: "/budgets", icon: PiggyBank },
];

export function AppSidebar() {
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar">
        <div className="flex items-center justify-between p-4 pb-6">
          <img src={logo} alt="Bull Finance" className="h-30 w-auto group-data-[collapsible=icon]:hidden" />
          <SidebarTrigger className="text-sidebar-foreground ml-auto">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
        </div>

        <ClientSelector />

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            <span className="group-data-[collapsible=icon]:hidden">Dashboards</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            <span className="group-data-[collapsible=icon]:hidden">Gestão de Dados</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/settings"
                    className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <Settings className="h-5 w-5 flex-shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Configurações</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
                  >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Sair</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
