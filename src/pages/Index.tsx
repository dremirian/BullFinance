import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logo from "@/assets/bull-finance-logo.png";
import { TrendingUp, Shield, BarChart3, Zap } from "lucide-react";
import { Footer } from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-forest-green">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-forest">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center space-y-8">
          <img src={logo} alt="Bull Finance" className="h-32 w-auto animate-fade-in" />
          
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold text-gold animate-fade-in">
              Bull Finance
            </h1>
            <p className="text-xl md:text-2xl text-emerald/90 animate-fade-in">
              Sistema Completo de Gestão Financeira
            </p>
            <p className="text-lg text-white/80 max-w-2xl mx-auto animate-fade-in">
              Tenha controle total das suas finanças com nossa plataforma completa para contas a pagar/receber, 
              fluxo de caixa, orçamentos e relatórios financeiros.
            </p>
          </div>

          <div className="flex gap-4 animate-fade-in">
            <Button
              size="lg"
              className="bg-gold text-forest-green hover:bg-gold/90 font-semibold text-lg px-8"
              onClick={() => navigate("/auth")}
            >
              Começar Agora
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gold text-gold hover:bg-gold/10 font-semibold text-lg px-8"
              onClick={() => navigate("/auth")}
            >
              Entrar
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 w-full max-w-5xl">
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-gold/20 hover:border-gold/40 transition-colors">
              <TrendingUp className="h-12 w-12 text-gold mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-gold mb-2">Fluxo de Caixa</h3>
              <p className="text-white/70 text-sm">
                Monitoramento e projeções de fluxo de caixa em tempo real
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-emerald/20 hover:border-emerald/40 transition-colors">
              <Shield className="h-12 w-12 text-emerald mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-emerald mb-2">Seguro</h3>
              <p className="text-white/70 text-sm">
                Segurança bancária com controle de acesso por função
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-gold/20 hover:border-gold/40 transition-colors">
              <BarChart3 className="h-12 w-12 text-gold mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-gold mb-2">Relatórios</h3>
              <p className="text-white/70 text-sm">
                Relatórios financeiros completos e análises detalhadas
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-emerald/20 hover:border-emerald/40 transition-colors">
              <Zap className="h-12 w-12 text-emerald mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-emerald mb-2">Automação</h3>
              <p className="text-white/70 text-sm">
                Automatize lançamentos recorrentes e notificações
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
