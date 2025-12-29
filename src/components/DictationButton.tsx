import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useDictation } from '@/hooks/useDictation'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
      console.log('🎙️ DictationButton: Stopping recording...')
      const transcription = await stopRecording()
      console.log('🎙️ DictationButton: Received transcription result:', transcription ? `"${transcription.substring(0, 100)}..."` : '(null or empty)')
      setIsActive(false)

      if (transcription) {
        console.log('✅ DictationButton: Calling onTranscription callback with text')
        onTranscription(transcription)
        console.log('✅ DictationButton: Callback executed successfully')
      } else {
        console.warn('⚠️ DictationButton: Transcription is null/empty, callback not executed')
      }
    } else {
      // Start recording
      console.log('🎙️ DictationButton: Starting recording...')
      await startRecording()
      setIsActive(true)
      console.log('🎙️ DictationButton: Recording started')
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
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={isTranscribing}
            className={cn(
              isRecording && 'animate-pulse bg-destructive/10 hover:bg-destructive/20',
              className
            )}
          >
            {getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {getTitle()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
