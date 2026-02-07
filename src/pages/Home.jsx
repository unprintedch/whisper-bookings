import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Calendar, Building2, Users, BarChart3 } from "lucide-react";

export default function HomePage() {
  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Logo */}
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" 
          alt="Whisper B. Logo" 
          className="w-24 h-24 mx-auto mb-8" 
        />

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Whisper B.
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-300 mb-12">
          Système de gestion de réservations pour lodges de safari
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <Calendar className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Calendrier</h3>
            <p className="text-slate-300 text-sm">Vue d'ensemble des réservations</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <Building2 className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Chambres</h3>
            <p className="text-slate-300 text-sm">Gestion de l'inventaire</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <Users className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Clients</h3>
            <p className="text-slate-300 text-sm">Base de données clients</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <BarChart3 className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Rapports</h3>
            <p className="text-slate-300 text-sm">Statistiques et exports</p>
          </div>
        </div>

        {/* CTA */}
        <Button 
          onClick={handleLogin}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-6 text-lg font-semibold rounded-xl shadow-2xl"
        >
          Connexion
        </Button>
      </div>
    </div>
  );
}