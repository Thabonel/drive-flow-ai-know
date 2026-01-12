import { motion } from 'framer-motion';
import { FileText, FileSpreadsheet, File } from 'lucide-react';

export type DocumentIcon = 'pdf' | 'doc' | 'xls' | 'txt';

export interface DocumentData {
  title: string;
  icon: DocumentIcon;
}

export interface Position {
  x: number;
  y: number;
}

type EntryDirection = 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type AnimationPhase = 'entering' | 'settled' | 'questioning' | 'pulsing' | 'connecting' | 'revealing' | 'holding' | 'exiting';

interface DocumentCardProps {
  document: DocumentData;
  index: number;
  position: Position;
  entryDirection: EntryDirection;
  isHighlighted: boolean;
  phase: AnimationPhase;
  reducedMotion: boolean;
}

const getEntryOffset = (direction: EntryDirection): Position => {
  const distance = 200;
  switch (direction) {
    case 'top': return { x: 0, y: -distance };
    case 'bottom': return { x: 0, y: distance };
    case 'left': return { x: -distance, y: 0 };
    case 'right': return { x: distance, y: 0 };
    case 'top-left': return { x: -distance * 0.7, y: -distance * 0.7 };
    case 'top-right': return { x: distance * 0.7, y: -distance * 0.7 };
    case 'bottom-left': return { x: -distance * 0.7, y: distance * 0.7 };
    case 'bottom-right': return { x: distance * 0.7, y: distance * 0.7 };
  }
};

const IconComponent = ({ icon }: { icon: DocumentIcon }) => {
  const className = "w-6 h-6";
  switch (icon) {
    case 'pdf':
      return <FileText className={`${className} text-red-500`} />;
    case 'doc':
      return <FileText className={`${className} text-blue-500`} />;
    case 'xls':
      return <FileSpreadsheet className={`${className} text-green-500`} />;
    default:
      return <File className={`${className} text-gray-500`} />;
  }
};

export function DocumentCard({
  document,
  index,
  position,
  entryDirection,
  isHighlighted,
  phase,
  reducedMotion,
}: DocumentCardProps) {
  const entryOffset = getEntryOffset(entryDirection);
  const isEntering = phase === 'entering';
  const isExiting = phase === 'exiting';
  const isSettledOrLater = ['settled', 'questioning', 'pulsing', 'connecting', 'revealing', 'holding'].includes(phase);

  return (
    <motion.div
      className="absolute"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
      initial={reducedMotion ? { opacity: 1, x: 0, y: 0, scale: 1 } : { opacity: 0, x: entryOffset.x, y: entryOffset.y, scale: 0.8 }}
      animate={{
        opacity: isExiting ? 0 : 1,
        x: isExiting ? entryOffset.x * 0.5 : 0,
        y: isExiting ? entryOffset.y * 0.5 : 0,
        scale: isExiting ? 0.8 : 1,
      }}
      exit={{
        opacity: 0,
        x: entryOffset.x * 0.5,
        y: entryOffset.y * 0.5,
        scale: 0.8,
        transition: { duration: 0.4, delay: index * 0.08 },
      }}
      transition={{
        duration: reducedMotion ? 0 : 0.6,
        delay: reducedMotion ? 0 : index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {/* Card with subtle float animation */}
      <motion.div
        className={`
          relative w-[70px] h-[85px] md:w-[80px] md:h-[95px]
          bg-white rounded-xl
          shadow-lg
          flex flex-col items-center justify-center gap-1.5
          border-2 transition-colors duration-300
          ${isHighlighted ? 'border-accent shadow-accent/30' : 'border-border'}
        `}
        animate={
          !reducedMotion && isSettledOrLater && !isExiting
            ? {
                y: [0, -3, 0, 3, 0],
              }
            : {}
        }
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.4,
        }}
      >
        {/* Glow effect when highlighted */}
        {isHighlighted && !isExiting && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-accent/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        <IconComponent icon={document.icon} />
        <span className="text-[9px] md:text-[10px] text-center px-1 text-muted-foreground font-medium leading-tight">
          {document.title.length > 14 ? document.title.slice(0, 12) + '...' : document.title}
        </span>
      </motion.div>
    </motion.div>
  );
}
