import { useRef, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DocumentCard, type Position } from './DocumentCard';
import { ConnectionLines } from './ConnectionLines';
import { QuestionPulse } from './QuestionPulse';
import { AnswerCrystallize } from './AnswerCrystallize';
import { useReducedMotion } from './useReducedMotion';

// 10 different question scenarios with unique documents
const QUESTION_SCENARIOS = [
  {
    question: "What did I quote for the Wilson project?",
    answer: "You quoted $4,500 for the Wilson rebrand - includes logo, brand guide, and 2 revision rounds.",
    documents: [
      { title: 'Client Proposal.pdf', icon: 'pdf' as const },
      { title: 'Project Brief.docx', icon: 'doc' as const },
      { title: 'Invoice History.xlsx', icon: 'xls' as const },
    ],
    activeConnections: [0, 2],
  },
  {
    question: "When is the Thompson deadline?",
    answer: "Thompson project is due March 15th - final deliverables include website mockups and brand assets.",
    documents: [
      { title: 'Thompson Contract.pdf', icon: 'pdf' as const },
      { title: 'Project Timeline.xlsx', icon: 'xls' as const },
      { title: 'Meeting Notes.docx', icon: 'doc' as const },
    ],
    activeConnections: [0, 1],
  },
  {
    question: "What's my monthly revenue this quarter?",
    answer: "Q1 revenue is $28,400 across 12 clients - up 23% from last quarter.",
    documents: [
      { title: 'Invoice History.xlsx', icon: 'xls' as const },
      { title: 'Tax Records.pdf', icon: 'pdf' as const },
      { title: 'Client List.xlsx', icon: 'xls' as const },
    ],
    activeConnections: [0, 2],
  },
  {
    question: "What services did I offer Martinez?",
    answer: "Martinez package included: social media audit, content strategy, and 3-month management at $2,200/month.",
    documents: [
      { title: 'Martinez Proposal.pdf', icon: 'pdf' as const },
      { title: 'Service Packages.docx', icon: 'doc' as const },
      { title: 'Email Thread.txt', icon: 'txt' as const },
    ],
    activeConnections: [0, 1],
  },
  {
    question: "How many hours on the Chen project?",
    answer: "Chen project total: 47.5 hours over 6 weeks. Billable rate was $85/hour for $4,037.50.",
    documents: [
      { title: 'Time Tracking.xlsx', icon: 'xls' as const },
      { title: 'Chen Invoice.pdf', icon: 'pdf' as const },
      { title: 'Project Log.docx', icon: 'doc' as const },
    ],
    activeConnections: [0, 1, 2],
  },
  {
    question: "What's in my standard contract?",
    answer: "Standard contract includes: 50% deposit, 2 revision rounds, 14-day payment terms, and IP transfer on final payment.",
    documents: [
      { title: 'Contract Template.pdf', icon: 'pdf' as const },
      { title: 'Legal Notes.docx', icon: 'doc' as const },
      { title: 'Terms Guide.pdf', icon: 'pdf' as const },
    ],
    activeConnections: [0, 2],
  },
  {
    question: "Who referred the Garcia client?",
    answer: "Garcia was referred by Sarah Chen in October - you offered Chen a 10% referral bonus.",
    documents: [
      { title: 'Referral Tracker.xlsx', icon: 'xls' as const },
      { title: 'Garcia Onboard.docx', icon: 'doc' as const },
      { title: 'Email Archive.txt', icon: 'txt' as const },
    ],
    activeConnections: [0, 2],
  },
  {
    question: "What's my pricing for logo design?",
    answer: "Logo packages: Basic $800 (2 concepts), Standard $1,500 (4 concepts + brand guide), Premium $3,000 (full identity).",
    documents: [
      { title: 'Price List.xlsx', icon: 'xls' as const },
      { title: 'Service Menu.pdf', icon: 'pdf' as const },
      { title: 'Past Quotes.docx', icon: 'doc' as const },
    ],
    activeConnections: [0, 1],
  },
  {
    question: "Any outstanding invoices?",
    answer: "3 unpaid invoices: Davis Co ($1,200, 15 days overdue), Lee LLC ($850, 7 days), Park Inc ($2,100, due tomorrow).",
    documents: [
      { title: 'AR Report.xlsx', icon: 'xls' as const },
      { title: 'Invoice Log.pdf', icon: 'pdf' as const },
      { title: 'Payment Terms.docx', icon: 'doc' as const },
    ],
    activeConnections: [0, 1],
  },
  {
    question: "What feedback did Kim give?",
    answer: "Kim loved the color palette but requested bolder typography. They approved the final logo on Feb 12th.",
    documents: [
      { title: 'Kim Feedback.docx', icon: 'doc' as const },
      { title: 'Revision Notes.txt', icon: 'txt' as const },
      { title: 'Approval Email.pdf', icon: 'pdf' as const },
    ],
    activeConnections: [0, 1, 2],
  },
];

// Entry directions for documents
const ENTRY_DIRECTIONS: Array<'top' | 'top-left' | 'top-right' | 'left' | 'right'> = [
  'top',
  'top-left',
  'top-right',
];

type AnimationPhase = 'entering' | 'settled' | 'questioning' | 'pulsing' | 'connecting' | 'revealing' | 'holding' | 'exiting';

interface DocumentFlowHeroProps {
  className?: string;
}

export function DocumentFlowHero({ className = '' }: DocumentFlowHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 500 });
  const [isMobile, setIsMobile] = useState(false);
  const [currentScenario, setCurrentScenario] = useState(0);
  const [phase, setPhase] = useState<AnimationPhase>('entering');

  const reducedMotion = useReducedMotion();

  // Track container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
        setIsMobile(window.innerWidth < 768);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Animation sequence with question cycling
  useEffect(() => {
    if (reducedMotion) {
      setPhase('holding');
      return;
    }

    const phases: { phase: AnimationPhase; duration: number }[] = [
      { phase: 'entering', duration: 1200 },
      { phase: 'settled', duration: 600 },
      { phase: 'questioning', duration: 1500 },
      { phase: 'pulsing', duration: 800 },
      { phase: 'connecting', duration: 800 },
      { phase: 'revealing', duration: 2000 },
      { phase: 'holding', duration: 1500 },
      { phase: 'exiting', duration: 800 },
    ];

    let phaseIndex = 0;
    let timeout: NodeJS.Timeout;

    const runPhase = () => {
      const currentPhase = phases[phaseIndex];
      setPhase(currentPhase.phase);

      timeout = setTimeout(() => {
        phaseIndex++;
        if (phaseIndex >= phases.length) {
          // Move to next scenario and restart
          phaseIndex = 0;
          setCurrentScenario(prev => (prev + 1) % QUESTION_SCENARIOS.length);
        }
        runPhase();
      }, currentPhase.duration);
    };

    runPhase();

    return () => clearTimeout(timeout);
  }, [reducedMotion, currentScenario]);

  const scenario = QUESTION_SCENARIOS[currentScenario];

  // Calculate document positions - arc at top half only
  const centerPoint: Position = {
    x: containerSize.width / 2,
    y: containerSize.height * 0.4, // Move center up
  };

  const radius = isMobile ? 90 : 140;
  const documents = scenario.documents;

  // Position documents in an arc at the top (180 degrees)
  const documentPositions: Position[] = documents.map((_, i) => {
    const totalDocs = documents.length;
    const angleSpread = Math.PI * 0.8; // 144 degrees arc
    const startAngle = -Math.PI / 2 - angleSpread / 2; // Start from top-left
    const angle = startAngle + (i / (totalDocs - 1 || 1)) * angleSpread;

    return {
      x: centerPoint.x + radius * Math.cos(angle),
      y: centerPoint.y + radius * Math.sin(angle) * 0.7, // Flatten the arc slightly
    };
  });

  const showDocuments = phase !== 'exiting';

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-h-[420px] md:min-h-[480px] bg-gradient-to-b from-muted/30 to-white rounded-2xl overflow-hidden ${className}`}
    >
      {/* Connection lines (SVG layer) */}
      <ConnectionLines
        centerPoint={centerPoint}
        documentPositions={documentPositions}
        activeConnections={scenario.activeConnections}
        phase={phase}
        reducedMotion={reducedMotion}
        containerSize={containerSize}
      />

      {/* Document cards with AnimatePresence for enter/exit */}
      <AnimatePresence mode="wait">
        {showDocuments && (
          <>
            {documents.map((doc, i) => (
              <DocumentCard
                key={`${currentScenario}-${doc.title}`}
                document={doc}
                index={i}
                position={documentPositions[i]}
                entryDirection={ENTRY_DIRECTIONS[i % ENTRY_DIRECTIONS.length]}
                isHighlighted={scenario.activeConnections.includes(i)}
                phase={phase}
                reducedMotion={reducedMotion}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Question in center */}
      <QuestionPulse
        question={scenario.question}
        phase={phase}
        reducedMotion={reducedMotion}
      />

      {/* Answer at bottom */}
      <AnswerCrystallize
        answer={scenario.answer}
        sourceCount={scenario.activeConnections.length}
        phase={phase}
        reducedMotion={reducedMotion}
      />

      {/* Progress indicator dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {QUESTION_SCENARIOS.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === currentScenario
                ? 'bg-primary w-4'
                : 'bg-primary/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default DocumentFlowHero;
