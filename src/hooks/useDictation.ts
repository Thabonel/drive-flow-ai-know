import { useState, useRef, useCallback } from 'react'
import { supabase, getSupabaseUrl } from '@/integrations/supabase/client'
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

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording. Please use HTTPS or localhost.')
      }

      // Request microphone permission
      console.log('🎤 Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('✅ Microphone access granted')

      // Find a supported mimeType
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
      ]

      let selectedMimeType = ''
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType
          console.log('✅ Using mimeType:', mimeType)
          break
        }
      }

      if (!selectedMimeType) {
        // Fall back to default (let browser choose)
        console.log('⚠️ No preferred mimeType supported, using browser default')
      }

      // Create MediaRecorder instance
      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined
      const mediaRecorder = new MediaRecorder(stream, options)
      console.log('✅ MediaRecorder created with mimeType:', mediaRecorder.mimeType)

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event)
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)

      toast.success('Recording started', {
        description: 'Speak now...',
      })
    } catch (err) {
      console.error('❌ Recording error:', err)
      let errorMessage = 'Failed to access microphone'

      if (err instanceof Error) {
        errorMessage = err.message
        // Provide user-friendly messages for common errors
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.'
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.'
        } else if (err.name === 'NotSupportedError') {
          errorMessage = 'Audio recording is not supported in this browser.'
        } else if (err.name === 'SecurityError') {
          errorMessage = 'Audio recording requires HTTPS. Please use a secure connection.'
        }
      }

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

          const fetchUrl = `${getSupabaseUrl()}/functions/v1/transcribe-audio`
          console.log('🎤 Starting transcription fetch to:', fetchUrl)
          console.log('Audio file size:', audioFile.size, 'bytes')

          const response = await fetch(
            fetchUrl,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: formData,
            }
          )

          console.log('📡 Transcription response received. Status:', response.status, response.statusText)

          if (!response.ok) {
            const errorData = await response.json()
            console.error('❌ Transcription API error:', errorData, 'Status:', response.status)
            throw new Error(errorData.error || 'Transcription failed')
          }

          const data = await response.json()
          console.log('✅ Transcription response data:', data)
          console.log('📝 Extracted text:', data?.text)
          console.log('Text length:', data?.text?.length || 0, 'characters')

          toast.success('Transcription complete')
          setIsTranscribing(false)

          console.log('🔄 Resolving promise with text:', data.text ? `"${data.text.substring(0, 50)}..."` : '(empty or undefined)')
          resolve(data.text)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Transcription failed'
          console.error('💥 Transcription error caught:', err)
          console.error('Error message:', errorMessage)
          setError(errorMessage)
          toast.error('Transcription failed', {
            description: errorMessage,
          })
          setIsTranscribing(false)
          console.log('🔄 Resolving promise with null (error case)')
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
