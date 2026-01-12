import { motion, AnimatePresence } from 'framer-motion';

type AnimationPhase = 'entering' | 'settled' | 'questioning' | 'pulsing' | 'connecting' | 'revealing' | 'holding' | 'exiting';

interface AnswerCrystallizeProps {
  answer: string;
  sourceCount: number;
  phase: AnimationPhase;
  reducedMotion: boolean;
}

export function AnswerCrystallize({
  answer,
  sourceCount,
  phase,
  reducedMotion,
}: AnswerCrystallizeProps) {
  const showAnswer = ['revealing', 'holding'].includes(phase);
  const isExiting = phase === 'exiting';

  // Split answer into words for staggered reveal
  const words = answer.split(' ');

  return (
    <AnimatePresence mode="wait">
      {showAnswer && !isExiting && (
        <motion.div
          key={answer}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-sm px-4"
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.3 } }}
          transition={{ duration: reducedMotion ? 0 : 0.3 }}
        >
          {/* Source badge */}
          <motion.div
            className="flex justify-center mb-2"
            initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{ duration: reducedMotion ? 0 : 0.25 }}
          >
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent text-[10px] md:text-xs font-medium rounded-full border border-accent/20">
              <svg
                className="w-2.5 h-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              From {sourceCount} documents
            </span>
          </motion.div>

          {/* Answer text with crystallize effect */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-border">
            <p className="text-xs md:text-sm text-foreground leading-relaxed text-center">
              {reducedMotion ? (
                answer
              ) : (
                words.map((word, i) => (
                  <motion.span
                    key={i}
                    className="inline-block mr-1"
                    initial={{ opacity: 0, filter: 'blur(6px)' }}
                    animate={{
                      opacity: 1,
                      filter: 'blur(0px)',
                    }}
                    transition={{
                      duration: 0.3,
                      delay: i * 0.025,
                      ease: 'easeOut',
                    }}
                  >
                    {word}
                  </motion.span>
                ))
              )}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
