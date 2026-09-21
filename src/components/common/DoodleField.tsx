import { SparkleIcon, ChatIcon, HeartIcon, PeopleIcon, DiceIcon } from '../../constants/icons';

const DOODLES = [
  { className: 'top-[8%] left-[20%] -rotate-12 w-9 h-9', Icon: SparkleIcon },
  { className: 'top-[16%] left-[62%] rotate-10 w-7 h-7', Icon: ChatIcon },
  { className: 'top-[32%] left-[12%] rotate-8 w-7 h-7', Icon: HeartIcon },
  { className: 'top-[28%] left-[88%] -rotate-6 w-8 h-8', Icon: PeopleIcon },
  { className: 'top-[62%] left-[90%] rotate-12 w-8 h-8', Icon: DiceIcon },
  { className: 'top-[70%] left-[18%] -rotate-10 w-7 h-7', Icon: SparkleIcon },
  { className: 'top-[85%] left-[55%] rotate-6 w-6 h-6', Icon: ChatIcon },
  { className: 'top-[48%] left-[50%] -rotate-4 w-6 h-6', Icon: HeartIcon },
];

export default function DoodleField() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
      {DOODLES.map((d, i) => {
        const { Icon, className } = d;
        return (
          <span key={i} className={`absolute opacity-20 text-ink ${className}`}>
            <Icon className="w-full h-full" />
          </span>
        );
      })}
    </div>
  );
}