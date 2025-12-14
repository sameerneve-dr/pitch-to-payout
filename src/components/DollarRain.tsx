import { useEffect, useState } from 'react';

interface DollarProps {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

export default function DollarRain({ active }: { active: boolean }) {
  const [dollars, setDollars] = useState<DollarProps[]>([]);

  useEffect(() => {
    if (active) {
      const newDollars: DollarProps[] = [];
      for (let i = 0; i < 50; i++) {
        newDollars.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 2,
          duration: 2 + Math.random() * 3,
          size: 20 + Math.random() * 30,
        });
      }
      setDollars(newDollars);
    } else {
      setDollars([]);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {dollars.map((dollar) => (
        <div
          key={dollar.id}
          className="absolute animate-fall text-primary"
          style={{
            left: `${dollar.left}%`,
            animationDelay: `${dollar.delay}s`,
            animationDuration: `${dollar.duration}s`,
            fontSize: `${dollar.size}px`,
            top: '-50px',
          }}
        >
          💵
        </div>
      ))}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
}
