import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-700">Settings</h2>
        <p className="text-slate-400 mt-1">Coming in Phase 7</p>
      </div>
    </div>
  );
}
