import React from 'react';
import { useSession } from '../../context/SessionContext';
import Button from '../common/Button';

export default function HostSetupView() {
  const { session, updateConfig, setSessionMode, createSession, setView } = useSession();
  const { config } = session || {};
  const mode = session?.config?.mode;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createSession(config);
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b-[2.5px] border-ink bg-white">
        <button
          type="button"
          onClick={() => setView('landing')}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold text-ink hover:text-purple-deep cursor-pointer"
        >
          ← Back
        </button>
        <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep">
          Host · New session
        </div>
        <div className="w-14" />
      </header>

      {/* Body */}
      <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="text-center mb-8 animate-rise">
          <div className="font-mono text-xs uppercase tracking-wider font-bold text-purple-deep mb-2">
            Ask Leadership
          </div>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-ink leading-tight">
            Set the room up.
          </h2>
          <p className="font-body font-semibold text-muted-ink text-base sm:text-lg mt-3 max-w-lg mx-auto">
            A few details, then send the invite. Employees will only ever see their session avatar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border-[2.5px] border-ink rounded-3xl shadow-hard-lg p-6 sm:p-9 animate-rise">
          {/* Format Toggle */}
          <div className="mb-6">
            <label className="block font-mono text-xs tracking-wider uppercase text-muted-ink font-bold mb-2">
              Format
            </label>
            <div className="flex gap-2 bg-cream rounded-full p-1.5 border-2 border-ink">
              <button
                type="button"
                onClick={() => setSessionMode('virtual')}
                className={`flex-1 py-3 px-4 rounded-full font-bold text-sm font-body cursor-pointer transition-all ${
                  mode === 'virtual'
                    ? 'bg-brand-purple text-ink border-2 border-ink shadow-hard-sm'
                    : 'text-muted-ink hover:text-ink'
                }`}
              >
                Virtual
              </button>
              <button
                type="button"
                onClick={() => setSessionMode('physical')}
                className={`flex-1 py-3 px-4 rounded-full font-bold text-sm font-body cursor-pointer transition-all ${
                  mode === 'physical'
                    ? 'bg-brand-purple text-ink border-2 border-ink shadow-hard-sm'
                    : 'text-muted-ink hover:text-ink'
                }`}
              >
                Physical
              </button>
            </div>
          </div>

          {/* Row: Participants & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-mono text-xs tracking-wider uppercase text-muted-ink font-bold mb-2">
                Participants
              </label>
              <input
                type="number"
                min="2"
                value={config.participants}
                onChange={(e) => updateConfig({ participants: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-cream border-2 border-ink text-ink rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-purple-deep"
              />
            </div>
            <div>
              <label className="block font-mono text-xs tracking-wider uppercase text-muted-ink font-bold mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="10"
                value={config.duration}
                onChange={(e) => updateConfig({ duration: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-cream border-2 border-ink text-ink rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-purple-deep"
              />
            </div>
          </div>

          {/* Leaders */}
          <div className="mb-6">
            <label className="block font-mono text-xs tracking-wider uppercase text-muted-ink font-bold mb-2">
              Leadership participants
            </label>
            <input
              type="text"
              placeholder="e.g. Dara (VP Engineering), Wale (Head of People)"
              value={config.leaders}
              onChange={(e) => updateConfig({ leaders: e.target.value })}
              className="w-full bg-cream border-2 border-ink text-ink rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-purple-deep placeholder:text-muted-2"
            />
          </div>

          {/* Row: Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-mono text-xs tracking-wider uppercase text-muted-ink font-bold mb-2">
                Date
              </label>
              <input
                type="date"
                value={config.date}
                onChange={(e) => updateConfig({ date: e.target.value })}
                className="w-full bg-cream border-2 border-ink text-ink rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-purple-deep"
              />
            </div>
            <div>
              <label className="block font-mono text-xs tracking-wider uppercase text-muted-ink font-bold mb-2">
                Time
              </label>
              <input
                type="time"
                value={config.time}
                onChange={(e) => updateConfig({ time: e.target.value })}
                className="w-full bg-cream border-2 border-ink text-ink rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-purple-deep"
              />
            </div>
          </div>

          {/* Conditional: Meeting Link or Location */}
          {mode === 'virtual' ? (
            <div className="mb-8">
              <label className="block font-mono text-xs tracking-wider uppercase text-muted-ink font-bold mb-2">
                Meeting link
              </label>
              <input
                type="text"
                placeholder="Paste your video call link"
                value={config.meetingLink}
                onChange={(e) => updateConfig({ meetingLink: e.target.value })}
                className="w-full bg-cream border-2 border-ink text-ink rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-purple-deep placeholder:text-muted-2"
              />
            </div>
          ) : (
            <div className="mb-8">
              <label className="block font-mono text-xs tracking-wider uppercase text-muted-ink font-bold mb-2">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. The Commons, 4th floor"
                value={config.location}
                onChange={(e) => updateConfig({ location: e.target.value })}
                className="w-full bg-cream border-2 border-ink text-ink rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-purple-deep placeholder:text-muted-2"
              />
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth>
            Send invitations
          </Button>
        </form>
      </main>
    </div>
  );
}
