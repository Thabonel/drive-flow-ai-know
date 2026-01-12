import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

type AnimationPhase = 'entering' | 'settled' | 'questioning' | 'pulsing' | 'connecting' | 'revealing' | 'holding' | 'exiting';

interface QuestionPulseProps {
  question: string;
  phase: AnimationPhase;
  reducedMotion: boolean;
}

export function QuestionPulse({
  question,
  phase,
  reducedMotion,
}: QuestionPulseProps) {
  const [displayedText, setDisplayedText] = useState('');

  const showQuestion = ['questioning', 'pulsing', 'connecting', 'revealing', 'holding'].includes(phase);
  const showPulse = phase === 'pulsing';
  const isTyping = phase === 'questioning';
  const isExiting = phase === 'exiting';

  // Typing effect
  useEffect(() => {
    if (reducedMotion || !isTyping) {
      if (showQuestion) {
        setDisplayedText(question);
      }
      return;
    }

    setDisplayedText('');
    let index = 0;
    const interval = setInterval(() => {
      if (index < question.length) {
        setDisplayedText(question.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [phase, question, reducedMotion, isTyping, showQuestion]);

  // Reset text when question changes
  useEffect(() => {
    if (phase === 'entering') {
      setDisplayedText('');
    }
  }, [question, phase]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '15%' }}>
      {/* Pulse rings */}
      <AnimatePresence>
        {showPulse && !reducedMotion && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border-2 border-primary/30"
                initial={{ width: 20, height: 20, opacity: 0.5 }}
                animate={{
                  width: [20, 180, 260],
                  height: [20, 180, 260],
                  opacity: [0.5, 0.25, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.15,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Question text */}
      <AnimatePresence mode="wait">
        {showQuestion && !isExiting && (
          <motion.div
            key={question}
            className="relative z-10 px-5 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-border max-w-[280px] md:max-w-xs"
            initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9, y: 10 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
              y: -10,
              transition: { duration: 0.3 },
            }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
          >
            <p className="text-sm md:text-base text-primary font-medium text-center leading-snug">
              {displayedText}
              {isTyping && !reducedMotion && (
                <motion.span
                  className="inline-block w-0.5 h-4 bg-primary ml-0.5"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
