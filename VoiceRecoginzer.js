// Imports
import vad from 'voice-activity-detection';

const apiKey = "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"

// Class definition
export class VADAudioRecorder {
	constructor() {
		this.audioChunks = [];
		this.mediaRecorder = null;
		this.audioContext = new AudioContext();
		this.isRecordingDone = false;
		this.vadEvent = null; // To store the vad event reference
		this.hasVoiceStarted = false; // New flag to check if voice started
		this.transcriptionPromise = new Promise((resolve, reject) => {
			this.resolveTranscription = resolve;
			this.rejectTranscription = reject;
		});
		this.resetTranscriptionPromise();
		//this.stopRecording = this.stopRecording.bind(this);
	}

	resetTranscriptionPromise() {
		this.transcriptionPromise = new Promise((resolve, reject) => {
			this.resolveTranscription = resolve;
			this.rejectTranscription = reject;
		});
	}

	async manualInit() {
		console.log("manualInit()...")
		// Resetting state
		this.audioChunks = [];
		this.isRecordingDone = false;
		this.hasVoiceStarted = false;
		this.resetTranscriptionPromise(); // Reset promise for new transcription
		
		console.log("manualInit() -> getUserMedia()...")
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		console.log("manualInit() -> startRecording()...")
		this.startRecording(stream);
	}

	async init() {
		console.log("init()...")
		// Resetting state
		this.audioChunks = [];
		this.isRecordingDone = false;
		this.hasVoiceStarted = false;
		this.resetTranscriptionPromise(); // Reset promise for new transcription

		console.log("init() -> getUserMedia()...")
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

		this.vadEvent = vad(this.audioContext, stream, {
			noiseCaptureDuration: 100,

			onVoiceStart: () => {
				console.log("onVoiceStart()")
				if (!this.isRecordingDone) {
					console.log('onVoiceStart() -> if (!isRecordingDone)...');
					this.hasVoiceStarted = true;
					console.log("onVoiceStart() -> startRecording()...")
					this.startRecording(stream);
				}
			},
			onVoiceStop: () => {
				console.log("onVoiceStop()")
				if (this.hasVoiceStarted && !this.isRecordingDone) {
					console.log("onVoiceStop() -> if (hasVoiceStarted & !isRecordingDone)...")
					console.log("onVoiceStop() -> audioChunks:", this.audioChunks)
					console.log("onVoiceStop() -> stopRecording()")
					this.stopRecording();
					this.isRecordingDone = true; // Mark recording as done
					console.log("onVoiceStop() -> vadEvent.destory()")
					this.vadEvent.destroy(); // Stop VAD
				}
			},
			onUpdate: (val) => {
				//console.log('Update value:', val);
			},
		});
	}

	startRecording(stream) {
		console.log("startRecording()...")
		this.mediaRecorder = new MediaRecorder(stream);
		this.mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				console.log("startRecording() -> pushing audioChunk...")
				this.audioChunks.push(event.data);
			}
		};
		console.log("startRecording() -> starting actual recorder...")
		this.mediaRecorder.start();
	}

	// Function Definitions
	async stopRecording() {
		while (true) {
			console.log("stopRecording()...");

			if (this.mediaRecorder) {
				console.log("stopRecording() -> if (mediaRecorder)...")
				// Stop the MediaRecorder and wait for it
				const stopPromise = new Promise(resolve => this.mediaRecorder.onstop = resolve);
				try {
					console.log("stopRecording() -> stopping mediaRecorder...")
					this.mediaRecorder.stop();
					await stopPromise;
					console.log("mediaRecorder stopped");
				} catch (error) {
					console.log("error stopping mediaRecorder :(", error);
				}

				// Create an audio blob and check its size
				const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
				if (audioBlob.size >= 1550) {
					console.log("stopRecording() -> if (audioBlob.size = large enough)...")
					// If audio size is ok, break the loop
					const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
					console.log("stopRecording() -> uploadAudioToWhisper()...")
					let transcription = await this.uploadAudioToWhisper(audioFile);
					async function transformTranscription(transcription) {
						console.log("transformTranscription()")
						console.log("transformTranscription() -> transcription:", transcription)
						let result
						if (transcription.text){
							result = transcription.text
						}
						if(transcription.error){
							result = transcription.error.message
						}
						if (!result){
							result = "Transcription was empty!"
						}
						console.log("transformTranscription() -> result:", result)
						return result.toString()
					}
					transcription = transformTranscription(transcription)
					console.log("stopRecording() -> resolving transcription...")
					this.resolveTranscription(transcription);
					this.cleanup()
					break;
				} 
				else {
					console.log("stopRecording() -> Audio file too small. Restarting...");
					console.log("stopRecording() -> cleanup()")
					this.cleanup();
					console.log("stopRecording() -> init()...")
					await this.init();
				}
			}
		}

		console.log("stopRecording() -> END");
	}


	async getTranscription() {
		console.log("getTranscription()...")
		const result = await this.transcriptionPromise;
		console.log("getTranscription() -> transcription:", result)
		return result
	}

	// Upload audio to Whisper
	async uploadAudioToWhisper(audioFile) {
		console.log("uploadAudioToWhisper()...")
		console.log("uploadAudioToWhisper() -> audioFile:", audioFile)
		const formData = new FormData();
		formData.append('file', audioFile);
		formData.append('model', 'whisper-1');
		formData.append('language', `en`)
		formData.append(`prompt`, `Yo! What's up?`)

		console.log("uploadAudioToWhisper() -> fetch(openAI transcriptions)...")
		const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
			body: formData,
		});

		const result = await response.json();
		console.log("uploadAudioToWhisper() -> END")
		return result;
	}

	async stopEarly() {
		console.log("stopEarly()...")
		console.log("stopEarly() -> stopRecording()...")
			await this.stopRecording();
			this.isRecordingDone = true; // Mark recording as done
		console.log("stopEarly() -> vadEvent.destory()")
			this.vadEvent.destroy(); // Stop VAD
	}

	cleanup() {
		console.log("cleanup()...")
		// Stop MediaStream tracks
		if (this.mediaRecorder && this.mediaRecorder.stream) {
			console.log("cleanup() -> if (mediaRecorder & mediaRecorder.stream)...")
			console.log("cleanup() -> stream.getTracks.forEach(track => track.stop())")
			this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
		}
	}
}


