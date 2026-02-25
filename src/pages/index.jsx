import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 flex items-center justify-center p-4">
      <div className="text-center">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d170d1e58c53edb975b3db/b98b290c7_Capturedecran2025-10-02a111335.png" 
          alt="Whisper B. Logo" 
          className="w-16 h-16 mx-auto mb-4" 
        />
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Whisper B.</h1>
        <p className="text-slate-600 mb-6">Safari Lodge Availability</p>
        
        <Button
          className="bg-yellow-700 hover:bg-yellow-800"
          onClick={() => navigate(createPageUrl('Dashboard'))}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}