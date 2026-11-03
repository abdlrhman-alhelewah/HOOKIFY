import { Sparkles } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] bg-white/[0.02] border border-white/5 rounded-3xl p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-lg shadow-purple-500/5">
        <Sparkles className="w-8 h-8 text-purple-400 opacity-80" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">{title}</h2>
      <p className="text-slate-400 max-w-md">
        This feature is currently under active development. We're working hard to bring it to you soon. Stay tuned!
      </p>
    </div>
  );
}
