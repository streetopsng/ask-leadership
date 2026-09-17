import React from 'react';
import { useSession } from '../../context/SessionContext';
import Button from '../common/Button';
import Waveform from '../common/Waveform';
import { Pill, TagPill } from '../common/Pill';
import DoodleField from '../common/DoodleField';
import { MicIcon, SparkleIcon } from '../../constants/icons';

const SCATTER_ITEMS = [
  { text: 'PSYCHOLOGICAL SAFETY', pos: 'top-[14%] left-[8%] -rotate-6', color: 'text-muted-ink' },
  { text: 'VOICE', pos: 'top-[22%] left-[82%] rotate-4', color: 'text-purple-deep text-sm font-black' },
  { text: 'ASK ME ANYTHING', pos: 'top-[68%] left-[6%] rotate-3', color: 'text-muted-ink' },
  { text: 'BE HEARD', pos: 'top-[80%] left-[80%] -rotate-3', color: 'text-sage-deep font-black' },
  { text: 'SPEAK UP', pos: 'top-[10%] left-[42%] -rotate-2', color: 'text-muted-ink' },
  { text: "WE'RE LISTENING", pos: 'top-[50%] left-[2%] rotate-2', color: 'text-sage-deep font-black' },
  { text: 'OPEN CONVERSATION', pos: 'top-[88%] left-[40%] -rotate-1', color: 'text-muted-ink text-[11px]' },
  { text: 'TRANSPARENCY', pos: 'top-[6%] left-[70%] rotate-6', color: 'text-muted-ink text-[11px]' },
  { text: 'TOGETHER', pos: 'top-[40%] left-[90%] -rotate-4', color: 'text-purple-deep font-black' },
  { text: 'ASK · LISTEN · ANSWER', pos: 'top-[58%] left-[70%] rotate-2', color: 'text-muted-ink text-[11px]' },
];

export default function LandingView() {
  const { setView, setDemoRole, joinSession } = useSession();

  const handleHostClick = () => {
    setDemoRole('host');
    setView('hostSetup');
  };

  const handlePreviewEmployee = () => {
    setDemoRole('employee');
    joinSession('DEMO-001');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden flex flex-col justify-between bg-cream">
      {/* Top Navigation */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto w-full gap-3 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-full border-[2.5px] border-ink bg-brand-purple flex items-center justify-center shrink-0 shadow-hard-sm">
            <MicIcon className="w-4 sm:w-5 h-4 sm:h-5 text-ink" />
          </div>
          <div>
            <div className="font-display font-bold text-base sm:text-lg leading-tight tracking-tight text-ink">
              GummyGum
            </div>
            <div className="font-mono text-[9px] sm:text-[10px] tracking-widest uppercase text-muted-ink font-semibold">
              Team Engagement
            </div>
          </div>
        </div>

        <Pill className="text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2">
          <Waveform count={4} variant="gold" />
          <span className="hidden sm:inline">Live experience</span>
          <span className="sm:hidden">Live</span>
        </Pill>
      </header>

      {/* Hero Field */}
      <main className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10 min-h-[500px]">
        {/* Glow Radial */}
        <div className="absolute w-[340px] sm:w-[540px] md:w-[720px] h-[340px] sm:h-[540px] md:h-[720px] rounded-full bg-[radial-gradient(circle,rgba(124,77,190,0.16)_0%,rgba(124,77,190,0)_62%)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        {/* Doodles */}
        <DoodleField />

        {/* Floating Scatter Badges */}
        <div className="absolute inset-0 pointer-events-none hidden md:block overflow-hidden">
          {SCATTER_ITEMS.map((item, i) => (
            <span
              key={i}
              className={`absolute font-mono text-xs font-bold uppercase tracking-wider whitespace-nowrap animate-drift select-none ${item.pos} ${item.color}`}
            >
              {item.text}
            </span>
          ))}
        </div>

        {/* Hero Core Card */}
        <div className="relative z-10 text-center max-w-2xl mx-auto animate-rise my-auto">
          <div className="inline-flex items-center gap-2 mb-4 bg-white border-2 border-ink px-3.5 sm:px-4 py-1.5 rounded-full shadow-hard-sm font-mono text-[11px] sm:text-xs uppercase tracking-widest text-purple-deep font-bold">
            <MicIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-purple-deep" />
            <span>Anonymous by design</span>
          </div>

          <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[0.92] text-ink uppercase break-words">
            Ask <span className="block text-brand-purple">Leadership</span>
          </h1>

          <p className="font-body font-semibold text-sm sm:text-base md:text-lg text-muted-ink max-w-md sm:max-w-lg mx-auto mt-4 mb-7 leading-relaxed">
            The questions you've been waiting to ask — put to the people who can actually answer them, live.
          </p>

          <div className="flex items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
            <Button variant="primary" onClick={handleHostClick} className="w-full sm:w-auto">
              Set up a session
            </Button>
          </div>
        </div>
      </main>

      {/* Landing Footer Cards */}
      <div className="relative z-10 flex items-stretch justify-center gap-5 px-6 py-6 sm:pb-8 flex-wrap">
        <div className="bg-white border-[2.5px] border-ink rounded-2xl shadow-hard-md p-5 sm:p-6.5 max-w-[400px] w-full text-left flex flex-col gap-2.5">
          <TagPill variant="purple" className="self-start">
            <SparkleIcon className="w-3.5 h-3.5 text-purple-deep" />
            <span>For hosts</span>
          </TagPill>
          <h3 className="font-display font-bold text-lg sm:text-xl text-ink">
            Run a session
          </h3>
          <p className="font-body font-semibold text-xs sm:text-sm text-muted-ink leading-relaxed">
            Set up the room and GummyGum sends the invites — employees tap theirs and land straight in the lobby, no sign-up required.
          </p>
          <div className="mt-1">
            <Button variant="dark" size="sm" onClick={handleHostClick}>
              Host experience →
            </Button>
          </div>
        </div>
      </div>

      {/* Demo Strip Prototype Preview */}
      <div className="demo-strip mx-4 sm:mx-auto">
        <span className="demo-tag">Prototype preview</span>
        <p>
          This screen is what the host sees inside GummyGum — employees never land here in real life, they open their invite email and go straight to the room.
        </p>
        <button
          type="button"
          onClick={handlePreviewEmployee}
          className="btn-demo"
        >
          Preview the employee experience →
        </button>
      </div>
    </div>
  );
}
