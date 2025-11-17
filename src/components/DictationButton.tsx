import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useDictation } from '@/hooks/useDictation'
import { cn } from '@/lib/utils'

interface DictationButtonProps {
  onTranscription: (text: string) => void
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
}

export function DictationButton({
  onTranscription,
  className,
  size = 'icon',
  variant = 'ghost',
}: DictationButtonProps) {
  const { isRecording, isTranscribing, startRecording, stopRecording } = useDictation()
  const [isActive, setIsActive] = useState(false)

  const handleClick = async () => {
    if (isRecording) {
      // Stop recording and get transcription
      const transcription = await stopRecording()
      setIsActive(false)

      if (transcription) {
        onTranscription(transcription)
      }
    } else {
      // Start recording
      await startRecording()
      setIsActive(true)
    }
  }

  const getIcon = () => {
    if (isTranscribing) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }
    if (isRecording) {
      return <MicOff className="h-4 w-4 text-destructive" />
    }
    return <Mic className="h-4 w-4" />
  }

  const getTitle = () => {
    if (isTranscribing) return 'Transcribing...'
    if (isRecording) return 'Stop recording'
    return 'Start dictation'
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isTranscribing}
      title={getTitle()}
      className={cn(
        isRecording && 'animate-pulse bg-destructive/10 hover:bg-destructive/20',
        className
      )}
    >
      {getIcon()}
    </Button>
  )
}
