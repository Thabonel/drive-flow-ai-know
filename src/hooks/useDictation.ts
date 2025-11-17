import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export interface UseDictationReturn {
  isRecording: boolean
  isTranscribing: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<string | null>
  error: string | null
}

export function useDictation(): UseDictationReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      setError(null)

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)

      toast.success('Recording started', {
        description: 'Speak now...',
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone'
      setError(errorMessage)
      toast.error('Recording failed', {
        description: errorMessage,
      })
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null)
        return
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false)
        setIsTranscribing(true)

        // Stop all audio tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop())

        try {
          // Create audio blob from recorded chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

          // Convert to a format Whisper accepts (webm should work, but we'll convert to mp3 if needed)
          const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })

          // Get the current session
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            throw new Error('Not authenticated')
          }

          // Send to Edge Function for transcription
          const formData = new FormData()
          formData.append('audio', audioFile)
          formData.append('language', 'en') // Could be made configurable

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: formData,
            }
          )

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Transcription failed')
          }

          const data = await response.json()

          toast.success('Transcription complete')
          setIsTranscribing(false)
          resolve(data.text)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Transcription failed'
          setError(errorMessage)
          toast.error('Transcription failed', {
            description: errorMessage,
          })
          setIsTranscribing(false)
          resolve(null)
        }
      }

      mediaRecorder.stop()
    })
  }, [])

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error,
  }
}
