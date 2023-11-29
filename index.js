/*
Upcoming features
[] Conversation mode (button currently hidden)
[] change to a logTracker class
	Tracker = new LogTracker("functionName")
	Tracker.log("message") => console.log("functionName -> message")

Bugs
[] Replit, netlify, & DNS reroute blocked by IU Health firewall.
[] New user, breaks renderdropdown items, etc & server
	[] Handle users with no / empty conversations
[] Remove auto complete from modal input fields
[] New chat -> old chat = voice input speaks both


To-Do-List
[x] Improve audio playback qaulity
[] Implement an easy backup api system
[x] Move from API calls to websockets for each route
[] Add progress messages for each websocket
[] Add typing effect message css & logic
[] change the status bar & navbar on theme change
[x] stop menu button color change and outline
[x] Load up the last conversation on page load
[] Add error catching and default actions for when things don't exist, prevent the server from crashing
	[] rendering dropdown items
	[] getting conversation(s)
	[] loading conversation
	[] sending message
[x] Proper login page
[] Change stop button text (speaking and recording)
[] Greeting message on first user login

*/

// Imports
import { FetchWrapper } from "./FetchWrapper.js";
import { VADAudioRecorder } from "./VoiceRecoginzer.js"
import MarkdownIt from 'markdown-it';
import highlightjs from 'markdown-it-highlightjs';
import ClipboardJS from 'clipboard';
//import markdownItCopy from 'markdown-it-copy'; //unistall later
//import hljs from 'highlight.js'; // uninstall later

//import CopyButtonPlugin from 'highlightjs-copy' // uninstall later
//const pluginVersion = hljs.addPlugin(new CopyButtonPlugin()); // uninstall later
//import MarkdownItCodeCopy from 'markdown-it-code-copy'; // unistall later
import 'material-design-icons/iconfont/material-icons.css';
import autosize from "autosize"
import io from 'socket.io-client';




// Import Firebase modules & etc
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithEmailAndPassword, EmailAuthProvider, PhoneAuthProvider, signInAnonymously } from 'firebase/auth';



const firebaseConfig = {
	apiKey: "AIzaSyBDotDqTDLK7Li0ci4Uby94i3x6TrLZq6Q",
	authDomain: "chatbot-v10-fcbf7.firebaseapp.com",
	projectId: "chatbot-v10-fcbf7",
	storageBucket: "chatbot-v10-fcbf7.appspot.com",
	messagingSenderId: "721867213546",
	appId: "1:721867213546:web:86f013e821cc610019a593"
};
const app = initializeApp(firebaseConfig);


/// Class definitions
let baseUrl = "https://express-v8.kerryaustin.repl.co/"
baseUrl = "https://jarvis-brains-07cd480e6959.herokuapp.com/"
const socket = io(baseUrl);

const SidekickAPI = new FetchWrapper(baseUrl)

//Streaming stuff
const { writable, readable } = new TransformStream();
const writer = writable.getWriter();

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

let sourceNode = null;
let queue = [];
let hasStartedPlaying = false;
let isPlayingAudio = false;
let isDoneSendingAudio = true
let stoppedAudioId = null;
let currentAudioId = null;

console.log("socket.id (top level):", socket.id)

socket.onAny((eventName, ...args) => {
	//console.log(`got event [${eventName}] with args [${args}]`);
	//console.log("ARGS:", args)
});

socket.on('ServerToClient', () => {
	console.log('*** ServerToClient Triggered On Backend ***');
	socket.emit("ClientToServer", { message: "test", socketId: socket.id })
});



// Variable definitions
let location = {
	conversationId: "noUserGivenConvo123",
	userId: "noUserGiven"
}
let conversationOptions = {}
let currentSettings = {}

let debug_settings




const inputBox = document.querySelector("#input-box");
const inputForum = document.querySelector("#input-forum");
const inputContainer = document.querySelector("#input-container")
const messagesList = document.querySelector("#messages-container");
const newChatButton = document.querySelector("#new-chat-button")
const clearButton = document.querySelector("#clear-button");
const deleteButton = document.querySelector("#delete-button")
const conversationModeButton = document.querySelector("#conversation-mode-button")
const dropdownButton = document.querySelector("#dropdown-button")
const saveRenameButton = document.querySelector("#save-conversation-name-button")
const saveSystemMessageButton = document.querySelector("#save-system-message-button")
const saveStaticMemoryButton = document.querySelector("#save-static-memory-button")
const sendInputButton = document.querySelector("#send-input-button")
const stopButtonContainer = document.querySelector("#stop-button-container")
const stopButton = document.querySelector("#stop-button")
const stopButtonText = document.querySelector("#stop-button-text")
const voiceInputButton = document.querySelector("#voice-input-button")

let appState = "readyForVoice"

//-----------------------------------------
const auth = getAuth(app);


const changeUserButton = document.querySelector("#select-user-button")
const currentUserLabel = document.querySelector("#current-user-label")


const signInModal = new bootstrap.Modal('#sign-in-modal', {
	//keyboard: false
})

const recordingModal = new bootstrap.Modal('#recording-modal', {
	//keyboard: false
})


// Sign-out
const signInButton = document.querySelector("#sign-in-button")
const signInButtonIcon = document.querySelector("#sign-in-button-icon")
signInButton.addEventListener("click", () => {
	if (location.userId === "signedOutUser") {
		signInModal.show()
	}
	else {
		resetConversationHTML()
		signOut(auth)
			.then(() => {
				console.log("signOut() -> success")
			})
			.catch((error) => {
				console.log("signOut() -> error:", error)
			});
	}
})

// Google sign-in
const googleSignInButton = document.querySelector("#google-sign-in-button")
googleSignInButton.addEventListener("click", async () => {
	console.log("googleSignInButton.click() -> signInWithRedirect()")
	const provider = new GoogleAuthProvider();
	try {
		await signInWithRedirect(auth, provider);
	} catch (error) { console.log(error) }
	console.log("googleSignInButton.click() -> getRedirectResult()...")
	getRedirectResult(auth)
		.then((result) => {
			console.log("getRedirectResult()")
			// This gives you a Google Access Token. You can use it to access Google APIs.
			const credential = GoogleAuthProvider.credentialFromResult(result);
			const token = credential.accessToken;

			// The signed-in user info.
			const user = result.user;
			// IdP data available using getAdditionalUserInfo(result)
		})
		.catch((error) => {
			// Handle Errors here.
			console.log("GOOGLE SIGN IN ERROR!", error)
			//const errorCode = error.code;
			//const errorMessage = error.message;
			// The email of the user's account used.
			//const email = error.customData.email;
			// The AuthCredential type that was used.
			//const credential = GoogleAuthProvider.credentialFromError(error);
		});
})


// Steve, Bobby, & Joe sign-in
const bobbySignInButton = document.querySelector("#bobby-sign-in-button");
const steveSignInButton = document.querySelector("#steve-sign-in-button");
const joeSignInButton = document.querySelector("#joe-sign-in-button");
bobbySignInButton.addEventListener("click", () => {
	console.log("bobbySignInButton.click() -> set email & password")
	const email = "bobby@email.com"
	const password = "123abc"
	signInWithEmailAndPassword(auth, email, password)
		.then((userCredential) => {
			const user = userCredential.user;
		})
		.catch((error) => {
			const errorCode = error.code;
			const errorMessage = error.message;
		});
})
steveSignInButton.addEventListener("click", () => {
	console.log("steveSignInButton.click() -> set email & password")
	const email = "steve@email.com";
	const password = "123abc";
	signInWithEmailAndPassword(auth, email, password)
		.then((userCredential) => {
			const user = userCredential.user;
		})
		.catch((error) => {
			const errorCode = error.code;
			const errorMessage = error.message;
		});
});
joeSignInButton.addEventListener("click", () => {
	console.log("joeSignInButton.click() -> set email & password")
	const email = "joe@email.com";
	const password = "123abc";
	signInWithEmailAndPassword(auth, email, password)
		.then((userCredential) => {
			const user = userCredential.user;
		})
		.catch((error) => {
			const errorCode = error.code;
			const errorMessage = error.message;
		});
});


onAuthStateChanged(auth, async (user) => {
	if (user) {
		// User is signed in, see docs for a list of available properties
		// https://firebase.google.com/docs/reference/js/auth.user
		console.log("onAuthStateChanged() -> user signed in:")
		console.log(user)
		console.log("onAuthStateChanged() -> user.email:", user.email)
		location.userId = user.email.toString()
		currentUserLabel.textContent = `Signed in: ${location.userId}`
		console.log("onAuthStateChanged() -> set location.userId:", location.userId)
		console.log("onAuthStateChanged() -> prepareForUser()...")
		await prepareForUser()
		signInButtonIcon.className = "mdi mdi-logout"
		console.log("onAuthStateChanged() -> END")


	}
	else {
		console.log("onAuthStateChanged() -> USER LOGGED OUT!")
		console.log("onAuthStateChanged() -> location.userId = signedOutUser")
		signInModal.show()
		location.userId = "signedOutUser"
		currentUserLabel.textContent = "Signed In: Nobody"
		console.log("onAuthStateChanged() -> set location.userId:", location.userId)
		signInButtonIcon.className = "mdi mdi-login"
		console.log("onAuthStateChanged() -> END")
	}
});


//-----------------------------------------


// Functions
function emitEvent(socket, event, data) {
	return new Promise((resolve, reject) => {
		socket.emit(event, data, (response) => {
			if (response.success) {
				resolve(response.data);
			} else {
				reject(new Error(response.error));
			}
		});
	});
}


function scrollToBottom() {
	messagesList.scrollTop = messagesList.scrollHeight;
}

// removed toggleLoadingMessage()

async function prepareForChat() {
	console.log("prepareForChat()")
	updateProgressMessage("Preparing for chat...")

	console.log("prepareForChat() -> API.post(createDocument & createConversation)...")
	console.log("prepareForChat() -> location:", location)
	await emitEvent(socket, 'createDocument', { location })
	await emitEvent(socket, 'createConversation', { location });
	console.log("prepareForChat() -> prefillModalInputs()")
	prefillModalInputs()
	console.log("prepareForChat() -> END")
}

function prefillModalInputs(conversation = {}) {
	console.log("prefillModalInputs()")
	updateProgressMessage("Prefilling modal inputs...")
	// [BUG] Name doesn't autofill on new chat creation/auto-rename
	// [BUG] New conversations retain previous instructions

	//console.log("prefillModalInputs() -> conversation:"); console.log(conversation);
	// Destructure with default values
	const {
		name = "",
		systemMessage = "",
		staticMemory = ""
	} = conversation

	document.querySelector("#new-conversation-name").value = name
	document.querySelector("#new-system-message").value = systemMessage
	document.querySelector("#new-static-memory").value = staticMemory
}

function resetConversationHTML() {
	console.log("resetConversationHTML()")
	try {
		messagesList.innerHTML = ""
		dropdownButton.innerHTML = ""
	} catch (error) { console.error("resetConversationHTML() failed") }
}

async function getConversation() {
	console.log(`getConversation(userId: ${location.userId}, conversationId: ${location.conversationId})`)
	updateProgressMessage("Getting the conversation...")
	try {
		console.log("getConversation() -> API.get(getConversation)...")
		const response = await emitEvent(socket, 'getConversation', { location });
		const conversation = response.data
		console.log("getConversation() -> returning conversation")
		return conversation
	} catch (error) { console.error("getConversation() -> failed", error) }
}

let totalMarkdownText = '';
let currentCreationTimeId = null;

function editMessageListHTML(textChunk, messageData) {
	//console.log("editMessageListHTML()")
	//console.log(`${messageData.role.toUpperCase()} MESSAGE`)

	const md = new MarkdownIt()
		.use(highlightjs)

	// Check if it's a new message
	if (currentCreationTimeId !== messageData.creationTimeId) {
		totalMarkdownText = ''; // Reset for the new message
		currentCreationTimeId = messageData.creationTimeId; // Update current message ID
	}

	totalMarkdownText += textChunk;

	try {
		const existingMessageContainer = document.getElementById(messageData.creationTimeId);
		//console.log("editMessageListHTML() -> existigMessageContainer:", existingMessageContainer)
		let messageContentDiv;

		if (!existingMessageContainer) {
			// Make the messageContentDiv
			messageContentDiv = document.createElement("div");
			messageContentDiv.classList.add("message-content", "message", messageData.role);
			if (messageData.role === "assistant") { messageContentDiv.classList.add("from-them") }
			if (messageData.role === "user") { messageContentDiv.classList.add("from-me") }
			messageContentDiv.id = messageData.creationTimeId
			messagesList.appendChild(messageContentDiv)
		}
		else {
			messageContentDiv = existingMessageContainer
		}
		//console.log(`totalMarkdownText: ${totalMarkdownText}`)

		const convertedHTML = md.render(totalMarkdownText);
		messageContentDiv.innerHTML = convertedHTML
		// Removing the bottom empty space from the last element in the chat bubble
		const lastElement = messageContentDiv.lastElementChild;
		lastElement.classList.add("no-margin-bottom")

		// Add copy buttons
		const codeBlocks = messageContentDiv.querySelectorAll('pre code');
		codeBlocks.forEach((block, index) => {
			const button = document.createElement('button');
			button.classList.add("copy-button", "btn", "float-end")
			button.innerHTML = `<i class="mdi mdi-content-copy"></i>`;
			button.setAttribute('data-clipboard-target', `#codeBlock${index}`);
			block.setAttribute('id', `codeBlock${index}`);
			block.parentNode.appendChild(button);
		});

		// Initialize Clipboard for copy buttons
		new ClipboardJS('.copy-button')


		if (Array.isArray(messageData.removedMessages) && messageData.removedMessages.length > 0) {
			const messagesToRemove = messageData.removedMessages;
			messagesToRemove.forEach(message => {
				if (message.creationTimeId) {
					const element = document.querySelector(`#${message.creationTimeId}`);
					if (element) {
						element.remove();
					}
				}
			});
		}
		scrollToBottom()

	} catch (error) {
		console.error("editMessageListHTML() failed", error);
	}
}

async function removeMessages(messagesToRemove) {
	console.log("removeMessages()")
	updateProgressMessage("Removing messages...")
	messagesToRemove.forEach(message => {
		if (message.creationTimeId) {
			const element = document.querySelector(`#${message.creationTimeId}`);
			if (element) {
				element.remove();
				console.log("removeMessages() -> removed:", message)
				console.log("removeMessages() -> remove update message")
			} else { console.error(`removeMessages() -> ID BUT NO ELEMENT FOR:`, message) }
		} else { console.error(`removeMessages() -> NO ID FOUND FOR:`, message) }
	});
}

async function trimChatHistory(chatHistory, conversationOptions = {}) {
	console.log("trimChatHistory()")
	updateProgressMessage("Trimming chat hisotry...")
	console.log("trimChatHistory() -> API.post(trimChatHistory)...")
	const response = await emitEvent(socket, 'trimChatHistory', { location, chatHistory, conversationOptions });
	if (response.success === true) {
		console.log("trimChatHistory() -> returning response.data")
		return response.data
	}
	// {trimmedChatHistory, removedMessages, currentTokenCount}
	else { throw new Error("trimChatHistory() -> API call failed") }
}

async function loadConversation() {
	updateProgressMessage("Loading conversation...")
	console.log(`loadConversation(${location.conversationId}) -> resetConversationHTML`)
	resetConversationHTML()
	try {
		console.log("loadConversation() -> getConversation()...")
		const conversation = await getConversation()
		console.log("loadConversation() -> conversation:", conversation)
		//console.log({ conversation })
		console.log("loadConversation() -> trimChatHistory()...")
		const { trimmedChatHistory } = await trimChatHistory(conversation.messages)
		//console.log({ trimChatHistory })

		console.log("loadConversation() -> trimmedChatHistory.forEach(message) -> editMessageListHTML()")
		trimmedChatHistory.forEach(message => editMessageListHTML(message.content, message))
		dropdownButton.innerHTML = `${conversation.name} (${conversation.conversationId})`
		//console.log(conversation)
		console.log("loadConversation() -> prefillModalInputs()")
		prefillModalInputs(conversation)
		console.log("loadConversation() -> scrollToBottom()")
		scrollToBottom()
		console.log("loadConversation() -> remove update message")
		console.log(`loadConversation() -> updateSettings(lastConversation)...`)
		await updateSettings({ lastConversation: location.conversationId })
		console.log("loadConversation() -> END")
	} catch (error) { console.error("loadConversation() -> failed", error) }
}

// removed sendMessage()

async function streamResponse(sentMessage, conversationOptions) {
	console.log("streamResponse()")
	updateProgressMessage("Getting response...")

	// removed setting playCount and orderCount to 0, since they aren't used

	let assistantMessageData = {
		role: "assistant",
		content: "",
		creationTimeId: sentMessage.responseMessageId
	};
	const data = {
		type: 'textRequest',
		payload: { location, sentMessage, conversationOptions }
	};

	console.log("streamResponse() -> socket.emit(textRequest) data:", data)
	socket.emit("textRequest", data)
	updateProgressMessage("Requesting text...")
	//console.log("socket.id:", socket.id)

	socket.off('textChunk');
	socket.on('textChunk', (data) => {
		//console.log("socket.on(textChunk) -> updateProgessMessage()")
		updateProgressMessage()
		console.log("Textchunk from socket:", data)
		const textChunk = data.textChunk
		editMessageListHTML(textChunk, assistantMessageData);
		//console.log("streamResponse() -> socket.emit()")
		//socket.emit("sendTextChunk", decodedTextChunk)
		assistantMessageData.content += textChunk;
	});
	console.log("streamResponse() -> returning assistantMessageData")
	return assistantMessageData;
}

async function renderDropdownItems() {
	console.log("renderDropdownItems()")
	updateProgressMessage("Rendering dropdown items...")
	try {
		console.log("renderDropdownItems() -> API.get(getConversations)...")
		const response = await emitEvent(socket, 'getConversations', { location });
		const conversations = response.data
		//console.log(conversations)
		conversations.sort((a, b) => b.updatedAt - a.updatedAt);
		const dropdownMenu = document.querySelector("#conversation-list")
		dropdownMenu.innerHTML = ""
		for (let conversation of conversations) {
			const name = conversation.name
			const listElement = document.createElement("li")
			const linkElement = document.createElement("a")
			linkElement.classList.add("dropdown-item")
			linkElement.textContent = `${conversation.conversationId}`
			linkElement.addEventListener("click", async () => {
				console.log("linkElement.click() -> resetConversationHTML()")
				resetConversationHTML()
				console.log("linkElement.click() -> set location.conversationId")
				location.conversationId = conversation.conversationId
				console.log("linkElement.click() -> loadConversation()...")
				await loadConversation()
			})
			listElement.appendChild(linkElement)
			dropdownMenu.appendChild(listElement)
		}
		dropdownButton.innerHTML = conversations.find(convo => convo.conversationId === location.conversationId).name
		console.log("renderDropdownItems() -> END")
	} catch (error) { console.error("renderDropdownItems() -> failed") }
}

async function checkForExistingNewConvo() {
	const response = await emitEvent(socket, "getConversations", { location })
	const conversations = response.data
	console.log("checkForExistingNewConvo() -> socket(getConversations):")
	console.log(conversations)
	const existingNewConvo = conversations.find(conversation => {
		console.log("finding...", conversation)
		if (conversation.messages.length <= 1) {
			console.log("found!")
			return true
		}
	})
	console.log("checkForExistingNewConvo() -> found:", existingNewConvo)
	return existingNewConvo
}

async function startNewChat() {
	console.log(`startNewChat()`)
	updateProgressMessage("Starting a new chat...")
	try {
		console.log("startNewChat() -> resetConversationHTML()")
		resetConversationHTML()
		console.log("startNewChat -> set location.conversationId")

		const existingNewConvo = await checkForExistingNewConvo()
		console.log("startNewChat() -> checkForExistingNewConvo():", existingNewConvo)
		if (existingNewConvo) {
			console.log("if true...")
			location.conversationId = existingNewConvo.conversationId
		}
		else {
			console.log("else...")
			location.conversationId = `${location.userId}Convo${Date.now().toString()}`
		}

		console.log("startNewChat -> prepareForChat()...")
		await prepareForChat()
		console.log("startNewChat() -> renderDropdownItems()...")
		await renderDropdownItems()

		conversationOptions.systemMessage = document.querySelector("#new-system-message").value
		conversationOptions.staticMemory = document.querySelector("#new-static-memory").value

		// optional greeting, not used currently
		const greetUser = true
		if (greetUser) {
			console.log("startNewChat() -> if (greetUser)...")
			const sentMessage = {
				role: "system",
				content: "Your name is Jarvis. You're a personal assistant app that's still in development. The developer only just learned to code about 5 months ago so the app might still be a little buggy. Right now it's just kind of like having a really smart person available to talk to all times about anything. But soon the user will actually be able to do stuff like look at the calendar, browse the internet, summarize articles and videos, keep track of a budget, and pretty much anything that can be done on a phone. Be casual and conversational when replying to whoever you're speaking to. Avoid replying in more than a two paragraphs unless absolutely necessary. You also don't have to mention everything that's here on the first message.",
				creationTimeId: `user${Date.now().toString()}`,
				responseMessageId: `assistant${Date.now().toString()}`
			}
			console.log("startNewChat() -> set welcome message")
			console.log("startNewChat() -> streamResponse()...")
			await streamResponse(sentMessage, conversationOptions)
		}

		console.log("startNewChat() -> END")

	} catch (error) { console.error("startNewChat() -> failed", error) }
}

async function _renameConversation(newName) {
	// [] Move renameWithBot() and renameConversation() logic to a backend class function
	console.log(`renameConversation(${newName})`);
	updateProgressMessage("Renaming conversation...")
	try {
		// Updating the name in the backend, then re-render
		console.log("renameConversation() -> API.post(renameConversation)...")
		await emitEvent(socket, 'renameConversation', { location, newName });
		console.log("renameConversation() -> renderDropdownItems()...")
		await renderDropdownItems()
	} catch (error) {
		console.error("renameConversation() failed", error);
	}
};

async function renameWithBot(sentMessage) {
	// [] Move renameWithBot() and renameConversation() logic to a backend class function
	console.log(`renameWithBot()`)
	const conversationOptionsAPI = {
		systemMessage: "Provide a single 3 word or title for the user's message.",
		max_tokens: 5
	}
	try {
		let response = await emitEvent(socket, 'talkToAPI', { location, sentMessage, conversationOptionsAPI });
		console.log("renameWithBot() -> renameConversation()...")
		await _renameConversation(response.data.content)
	} catch (error) { console.error("autoRename() failed", error) }
}

async function handleSaveRename(event) {
	console.log("handleSaveRename()")
	event.preventDefault();
	const newConversationName = document.querySelector("#new-conversation-name").value;
	console.log("handleSaveRename() -> renameConversation()...")
	await _renameConversation(newConversationName)
	console.log(`handleSaveRename() -> new name: ${newConversationName}`);
	console.log("handleSaveRename() -> END")
};

async function handleSaveSystemMessage(event) {
	event.preventDefault();
	console.log("handleSaveSystemMessage()")
	const newSystemMessage = document.querySelector("#new-system-message").value
	const updateData = { systemMessage: newSystemMessage }
	console.log("handleSaveSystemMessage() -> API.post(updateConversation)...")
	const response = await emitEvent(socket, 'updateConversation', { location, updateData });
	if (response.data === true) {
		console.log(`handleSaveSystemMessage() -> New system message: ${newSystemMessage}`)
		console.log("handleSaveSystemMessage() -> END")
	}
};

async function handleSaveStaticMemory(event) {
	event.preventDefault();
	console.log("handleStaticMessage()")
	const newStaticMemory = document.querySelector("#new-static-memory").value
	const updateData = { staticMemory: newStaticMemory }
	const response = await emitEvent(socket, 'updateConversation', { location, updateData });
	if (response.data === true) {
		console.log(`New static memory: ${newStaticMemory}`)
	}
};

function dispatchAudioStartEvent() {
	console.log("dispatchAudioStartEvent()")
	const audioStartEvent = new Event('audioStart');
	document.dispatchEvent(audioStartEvent);
}

function dispatchAudioStopEvent() {
	console.log("dispatchAudioStopEvent()")
	const audioStopEvent = new Event('audioStop');
	document.dispatchEvent(audioStopEvent);
}

async function listener_audioEvents() {
	console.log("listener_audioEvents()")



	function playNextChunk() {
		if (!isSourceNodePlaying && queue.length > 0) {
			appendAudioBuffer(queue.shift());
		} else if (!queue.length) {
			hasStartedPlaying = false;
			dispatchAudioStopEvent(); // Dispatch stop event if the queue is empty
		}
	}

	let isSourceNodePlaying = false;

	async function appendAudioBuffer(audioChunk) {
		try {
			const audioBuffer = await audioContext.decodeAudioData(audioChunk.slice(0));
			if (!isSourceNodePlaying) {
				if (sourceNode) {
					sourceNode.disconnect(); // Disconnect the old source node
				}
				sourceNode = audioContext.createBufferSource();
				sourceNode.buffer = audioBuffer;
				sourceNode.connect(audioContext.destination);
				sourceNode.onended = () => {
					isSourceNodePlaying = false;
					playNextChunk(); // Play next chunk when this one ends
				};
				sourceNode.start();
				isSourceNodePlaying = true;
			} else {
				// If a sourceNode is currently playing, push the chunk back into the queue
				queue.unshift(audioChunk);
			}
		} catch (e) {
			console.error("Error processing audio", e);
		}
	}

	socket.on('audioChunk', (data) => {
		console.log("socket.on(audioChunk) -> data:", data);
		updateProgressMessage("Receiving audio...")
		const audioChunk = data.audioBuffer;
		currentAudioId = data.audioId;
		isPlayingAudio = true;
		isDoneSendingAudio = false

		if (currentAudioId !== stoppedAudioId) {
			queue.push(audioChunk);
			console.log("socket.on(audioChunk) -> queue.length:", queue.length)


			if (!hasStartedPlaying) {
				// Play the first chunk to start
				if (queue.length) {
					hasStartedPlaying = true;
					//console.log("socket.on(audioChunk) -> waiting for audioCompleted event..." )
					//sendProgressMessage("Waiting for all the audioChunks...")

					console.log("socket.on(audioChunk) -> playNextChunk()");
					updateProgressMessage("Playing audio chunk...")
					playNextChunk()
					console.log("socket.on(audioChunk) -> dispatchAudioStartEvent()")
					dispatchAudioStartEvent()
				}
			}
		} else {
			console.log("socket.on(audioChunk) -> Incoming audioChunk was ignored");
		}
	});

	socket.on("audioCompleted", (data) => {
		// Concerns server side audioChunks, not play back
		console.log("socket.on(audioCompleted) -> updateProgressMessage()")
		updateProgressMessage()
		console.log("socket.on(audioCompleted) -> data:", data);
		let completedAudioId = data.audioId;
		console.log("socket.on(audioCompleted) -> isDoneSendingAudio = true")
		isDoneSendingAudio = true
	})

	document.addEventListener('audioStart', () => {
		console.log("event.(audioStart) -> changeInputContainer()")
		appState = "botSpeaking";
		changeInputContainer();
		console.log('event(audioStart) -> Audio started');
	});

	document.addEventListener('audioStop', () => {
		if (!isDoneSendingAudio) {
			console.log("event.(audioStop) -> AUDIO STOPPED EARLY!")
		}
		console.log("event.(audioStop) -> changeInputContainer(readyForVoice)")
		appState = "readyForVoice"
		changeInputContainer()
		if (conversationOptions.conversationMode) {
			voiceInputButton.click()
		}
	})

}

function stopAndClearAudio(givenAudioId) {
	console.log("stopAndClearAudio()");
	stoppedAudioId = givenAudioId;
	if (sourceNode) {
		console.log("stopAndClearAudio() -> if (sourceNode)...")
		console.log("stopAndClearAudio() -> sourceNode.stop()")
		sourceNode.stop();
		console.log("stopAndClearAudio() -> dispatchAudioStopEvent()")
		dispatchAudioStopEvent()
	}

	// Clear the queue
	queue = [];

	// Reset the playback state
	hasStartedPlaying = false;
	isPlayingAudio = false;
}

// Event Listeners
const listener_ModalButtons = () => {
	console.log("listener_ModalButtons()")
	saveRenameButton.addEventListener("click", handleSaveRename);
	saveSystemMessageButton.addEventListener("click", handleSaveSystemMessage);
	saveStaticMemoryButton.addEventListener("click", handleSaveStaticMemory);
}

async function changeInputContainer() {
	console.log("changeInputContainer()")
	const iconElement = voiceInputButton.querySelector('i');
	const stopButtonIcon = document.querySelector("#stopButtonIcon")

	// reset the icon to the micophone
	iconElement.className = `mdi mdi-microphone`

	if (appState === "userSpeaking") {
		stopButtonIcon.className = 'mdi mdi-microphone-off';
		showElement("stopButton")
		stopButtonText.innerHTML = "Stop User Speaking"
	}
	if (appState === "readyForVoice") {
		stopButtonIcon.className = 'mdi mdi-microphone';
		showElement("inputForum")
	}
	if (appState === "botSpeaking") {
		stopButtonIcon.className = 'mdi mdi-volume-off';
		showElement("stopButton")
		stopButtonText.innerHTML = "Stop Bot Speaking"
	}
	if (appState === "ready") {
		stopButtonIcon.className = 'mdi mdi-microphone';
		showElement("inputForum")
		stopButtonText.innerHTML = "Ready"
	}
	if (appState === "textInside") {
		iconElement.className = `mdi mdi-close`
	}

	function showElement(element) {
		if (element === "stopButton") {
			inputContainer.classList.add("hidden")
			stopButtonContainer.classList.remove("hidden")
		}
		if (element === "inputForum") {
			inputContainer.classList.remove("hidden")
			stopButtonContainer.classList.add("hidden")
		}
	}
}

const listener_Submit = () => {
	console.log("listener_Submit()")
	const recorder = new VADAudioRecorder();
	const dynamicAction = {
		readyForVoice: async () => {
			console.log("dynamicAction(readyForVoice)...")
			appState = "userSpeaking"
			changeInputContainer()
			console.log(`readyForVoice() -> conversation mode: ${conversationOptions.conversationMode}`)
			if (conversationOptions.conversationMode === true) {
				// Changed to manual init for debugging
				/*
				console.log("readyForVoice() -> recorder.init()...")
				await recorder.init().catch((e) => console.error('Failed to initialize recorder:', e));
				*/
				console.log("readyForVoice() -> recorder.manualInit()")
				await recorder.manualInit()
			}
			else {
				console.log("readyForVoice() -> recorder.manualInit()")
				await recorder.manualInit()
			}
			//recordingModal.show()

			// Get the transcription once it's ready
			console.log("readyForVoice() -> recorder.getTranscription()...")
			let transcription = await recorder.getTranscription()
			console.log("readyForVoice() -> got transcription")

			const sentMessage = {
				role: "user",
				content: transcription,
				creationTimeId: `user${Date.now().toString()}`,
				responseMessageId: `assistant${Date.now().toString()}`
			}
			conversationOptions.systemMessage = document.querySelector("#new-system-message").value
			conversationOptions.staticMemory = document.querySelector("#new-static-memory").value

			conversationOptions.sendAudioBack = true
			if (conversationOptions.sendAudioBack) {
				appState = "botSpeaking"
				console.log("readyForVoice() -> changeInputContainer(botSpeaking)")
				changeInputContainer()
			}

			console.log("readyForVoice() -> editMessageListHTML()")
			editMessageListHTML(sentMessage.content, sentMessage)
			console.log("readyForVoice() -> streamResponse()...")
			await streamResponse(sentMessage, conversationOptions)
			console.log("readyForVoice() -> postBotResponse()...")
			await postBotResponse(sentMessage, conversationOptions)


		},
		userSpeaking: async () => {
			console.log("dynamicAction(userSpeaking)...")
			conversationOptions.sendAudioBack = false
			console.log("userSpeaking() -> recorder.stopEarly()")
			recorder.stopEarly()
			appState = "readyForVoice"
			console.log("userSpeaking() -> changeInputContainer()")
			changeInputContainer()
		},
		botSpeaking: async () => {
			console.log("dynamicAction(botSpeaking)...")
			conversationOptions.sendAudioBack = false
			console.log("botSpeaking() -> stopAndClearAudio()")
			stopAndClearAudio(currentAudioId)
			//appState = "ready"
			appState = "readyForVoice"
			console.log("botSpeaking() -> changeInputContainer(readyForVoice)")
			changeInputContainer()
		},
		ready: async () => {
			alert("readyAction() shouldn't be used")
			appState = "readyForVoice"
			changeInputContainer()
		},
		textInside: async () => {
			console.log("dynamicAction(textInside)")
			inputBox.value = ""
			appState = "readyForVoice"
			console.log("textInside() -> changeInputContainer(readyForVoice)")
			changeInputContainer()
		},
		cancelVoiceLoop: async () => {
			conversationOptions.conversationMode = false
			appState = "readyForVoice"
			changeInputContainer()
		}
	}

	inputForum.addEventListener("submit", event => {
		event.preventDefault()
	})

	inputBox.addEventListener('focus', () => {
		console.log('inputBox.focus()');
		updateProgressMessage(`Waiting for your input...`)
		// Chaning the height manually still works:
	});

	inputBox.addEventListener('blur', () => {
		console.log('inputBox.blur() -> updateProgressMessage()');
		updateProgressMessage()
	});

	inputBox.addEventListener("input", () => {
		appState = "textInside"
		changeInputContainer()
		if (inputBox.value === "") {
			appState = "readyForVoice"
			changeInputContainer()
		}
	})


	const doneButton = document.querySelector("#done-recording-button")
	doneButton.addEventListener("click", async () => {
		appState = "userSpeaking"
		await dynamicAction[appState]()
	})

	const cancelButton = document.querySelector("#cancel-recording-button")
	cancelButton.addEventListener("click", async () => {

		if (conversationOptions.conversationMode) {
			conversationModeButton.click()
		}
		conversationOptions.sendAudioBack = false
		//recordingModal.hide()
		await recorder.stopEarly()
	})



	sendInputButton.addEventListener("click", async (event) => {
		console.log(`sendInputButton()...`);
		// Make the user input object
		const sentMessage = {
			role: "user",
			content: inputBox.value.trim(),
			creationTimeId: `user${Date.now().toString()}`,
			responseMessageId: `assistant${Date.now().toString()}`
		}
		inputBox.value = ""
		appState = "readyForVoice"
		console.log("sendInputButton() -> changeInputContainer(readyForVoice)")
		changeInputContainer()
		console.log("sendInputButton() -> autosize.update(inputBox)")
		autosize.update(inputBox);

		// Add the response to the html
		console.log("sendInputButton() -> editMessageListHTML()")
		editMessageListHTML(sentMessage.content, sentMessage)

		// Stream assistant response (uses editMessageHTML under the hood)
		conversationOptions.systemMessage = document.querySelector("#new-system-message").value
		conversationOptions.staticMemory = document.querySelector("#new-static-memory").value
		conversationOptions.sendAudioBack = false
		console.log("sendInputButton() -> streamResponse()...")
		await streamResponse(sentMessage, conversationOptions)
		console.log("sendInputButton() -> postBotResponse()...")
		await postBotResponse(sentMessage, conversationOptions)
	})


	stopButton.addEventListener("click", async () => {
		console.log(`stopButton.click() -> dynamicAction(${appState})...`)
		await dynamicAction[appState]()
	})


	voiceInputButton.addEventListener("click", async () => {
		console.log(`voiceInputButton.click() -> dynamicAction(${appState})...`)
		await dynamicAction[appState]()
	})

	async function postBotResponse(sentMessage, conversationOptions) {
		console.log("postBotResponse()...")
		// Get the entire conversation object and get it's chatHistory
		console.log("postBotResponse() -> getConversation()...")
		const conversation = await getConversation()
		const chatHistory = conversation.messages

		// Get the messages that weren't used in the response & remove them
		console.log("postBotResponse() -> trimChatHistory()...")
		const { removedMessages, currentTokenCount } = await trimChatHistory(chatHistory, conversationOptions)
		console.log("postBotResponse() -> removeMessages()")
		removeMessages(removedMessages)

		// Add the token count somewhere if needed (debugging only)
		const includeTokens = false
		if (includeTokens) {
			const addTokenCount = () => {
				console.log({ currentTokenCount })
			}
			addTokenCount()
		}

		// Automatically rename the conversation if it's the first user message / bot response
		if (conversation.messageCount < 4) {
			console.log("postBotResponse() -> renameWithBot()")
			renameWithBot(sentMessage)
		}

		console.log("postBotResponse() -> scrollToBottom()")
		scrollToBottom()
	}


}

function listener_ClearButton() {
	clearButton.addEventListener("click", async () => {
		console.log("clearButton.click()")
		// Save previous behavior and memory
		const previousSystemMessage = document.querySelector("#new-system-message").value
		const previousStaticMemory = document.querySelector("#new-static-memory").value

		console.log("clearButton.click() -> API.post(deleteConversation)...")
		await emitEvent(socket, 'deleteConversation', { location });
		console.log("clearButton.click() -> resetConversationHTML()")
		resetConversationHTML();
		console.log("clearButton.click() -> prepareForChat()...")
		await prepareForChat();
		console.log("clearButton.click() -> renderDropdownItems()...")
		await renderDropdownItems();

		// Restore previous behavior and memory
		document.querySelector("#new-system-message").value = previousSystemMessage
		document.querySelector("#new-static-memory").value = previousStaticMemory
	});
}

function listener_NewChatButton() {
	newChatButton.addEventListener("click", async () => {
		console.log("newChatButton.click() -> startNewChat()...")
		await startNewChat();
	});
}

async function listener_DeleteButton() {
	deleteButton.addEventListener("click", async () => {
		console.log("deleteButton.click()")
		// Delete current convo
		console.log("deleteButton.click() -> API.post(deleteConversation)...")
		await emitEvent(socket, 'deleteConversation', { location });

		console.log("deleteButton() -> resetConversationHTML()")
		resetConversationHTML()

		newChatButton.click()
	})
}

async function listener_MessageButtons() {
	document.addEventListener("click", async (event) => {
		//console.log("EVENT TARGET:"); console.log(event.target)
		const messageElement = event.target.closest('.message');
		//console.log("MESSAGE ELEMENT:"); console.log(messageElement)
		const creationTimeId = messageElement?.id

		// Message buttons builder
		if (messageElement) {
			console.log("messageElement.click()")
			const existingButtons = messageElement.querySelector('.message-buttons');
			if (existingButtons) {
				existingButtons.remove();
			} else {
				// Edit Button
				const editMessageButton = document.createElement("button");
				editMessageButton.classList.add("btn", "m-0", "p-0");
				editMessageButton.id = "edit-message-button";
				const editIcon = document.createElement("i");
				editIcon.classList.add("mdi", "mdi-pencil");
				editIcon.style.color = "white"
				editIcon.style.fontSize = "25px"
				editMessageButton.appendChild(editIcon)

				// Speak Button
				const speakButton = document.createElement("button")
				speakButton.classList.add("btn", "m-0", "p-0")
				speakButton.id = "speak-button"
				const speakIcon = document.createElement("i")
				speakIcon.classList.add("mdi", "mdi-account-voice")
				speakIcon.style.color = ("black")
				speakIcon.style.fontSize = "25px"
				speakButton.appendChild(speakIcon)

				const buttonContainer = document.createElement("div");
				buttonContainer.classList.add("message-buttons", "d-flex", "justify-content-center");

				// Conditionals per role
				if (messageElement.classList.contains('user')) {
					buttonContainer.appendChild(editMessageButton);
				}
				if (messageElement.classList.contains("assistant")) {
					buttonContainer.appendChild(speakButton)
				}
				messageElement.appendChild(buttonContainer);
			}
		}
		// Removing buttons on outside click	
		else {
			const allButtons = document.querySelectorAll('.message-buttons');
			allButtons.forEach(button => button.remove());
		}

		// Actual button functionality
		if (event.target.closest("#edit-message-button")) {
			console.log("editButton.click()")
			const element = document.querySelector(`#${creationTimeId}.message-content`)
			inputBox.value = element.textContent.trim()
			autosize.update(inputBox)
			inputBox.focus()
			console.log("editButton.click() -> startConvoHere()")
			async function startConvoHere(creationTimeId) {
				console.log("startConvoHere()...")
				const response = await emitEvent(socket, 'startConvoHere', { location, creationTimeId });
				console.log({ response });
				return response.data // {newChatHistory, removedMessages}
			}
			startConvoHere(creationTimeId).then(responseData => {
				const { removedMessages, newChatHistory } = responseData
				console.log("startConvoHere() -> removedMessages()")
				removeMessages(removedMessages)
				//console.log(newChatHistory)
			}).catch(err => {
				console.error(err);
			})
		}
		if (event.target.closest("#speak-button")) {
			console.log("speakButton.click()")
			const element = document.querySelector(`#${creationTimeId}.message-content`)
			console.log("speakButton.click() -> socket.emit(playMessage)")
			socket.emit("playMessage", {
				payload: element.textContent.trim()
			})
		}
	});
}

function listener_redoResponseButton() {
	document.addEventListener("click", (event) => {
		//console.log("redoResponseButton.click()")
		if (event.target.matches("#redo-response-button")) {
			// Retrieve the custom data
			const creationTimeId = event.target.dataset.creationTimeId;

			// Include it in the alert
			alert(`Redo button clicked! creationTimeId is ${creationTimeId}`);
		}
	});
}

function switchTheme(themeName) {
	console.log("switchTheme()")
	currentSettings.theme = themeName
	const themes = {
		light: {
			'--background-color': 'white',
			'--text-color-general': 'black',
			'--accent-color': 'white',
			'--light': '#e9e9eb',
			'--dark': '#26252a',
			'--from-them-bg-color': '#e9e9eb',
			'--from-them-text-color': 'black',
			'--from-me-bg-color': '#2e93ff',
			'--from-me-text-color': 'white',
			'--navbar-button-icon-color': 'black',
			'--navbar-button-color': 'black',
			'--input-box-color': 'white',
			'--input-text-color': 'black',
			'--send-button-color': '#2e93ff',
		},
		dark: {
			'--background-color': 'black',
			'--text-color-general': 'white',
			'--accent-color': 'black',
			'--light': '#26252a',
			'--dark': '#e9e9eb',
			'--from-them-bg-color': '#26252a',
			'--from-them-text-color': 'white',
			'--from-me-bg-color': '#2e93ff',
			'--from-me-text-color': 'white',
			'--navbar-button-icon-color': 'white',
			'--navbar-button-color': 'white',
			'--input-box-color': 'black',
			'--input-text-color': 'white',
			'--send-button-color': '#2e93ff',
		}
	};
	const themeVariables = themes[themeName];
	Object.keys(themeVariables).forEach(variable => {
		document.documentElement.style.setProperty(variable, themeVariables[variable]);
	});
	localStorage.setItem('theme', themeName);
};

function listener_ThemeButton() {
	document.getElementById("theme-button").addEventListener("click", () => {
		console.log("themeButton.click()")
		// Actual switching logic
		const currentTheme = document.documentElement.getAttribute("data-theme");
		const newTheme = currentTheme === 'light' ? 'dark' : 'light';
		console.log("themeButton.click() -> switchTheme()")
		switchTheme(newTheme);
		document.documentElement.setAttribute("data-theme", newTheme);
	});

}

function listener_conversationModeButton() {
	conversationOptions.conversationMode = false
	const icon = conversationModeButton.querySelector("i")

	conversationModeButton.addEventListener("click", () => {
		console.log("conversationModeButton.click()")
		if (conversationOptions.conversationMode) {
			conversationOptions.conversationMode = false
			icon.className = "mdi mdi-account-voice-off"
			console.log("conversationModeButton() -> conversation mode set to false")
		}
		else {
			conversationOptions.conversationMode = true
			icon.className = "mdi mdi-account-voice"
			console.log("conversationModeButton() -> conversation mode set to true")
		}
	})
}

function autoHideNavbar() {
	console.log("autohideNavbar()");
	let lastScrollTop = 0;

	// Try using '.chat-container' or '#messages-container' here based on what you find
	const scrollContainer = document.querySelector('#messages-container');
	const navbar = document.querySelector('.navbar');

	const handleScroll = () => {
		let scrollTop = scrollContainer.scrollTop;  // Updated this line

		if (scrollTop > lastScrollTop) {
			navbar.classList.add('hide-navbar');
			navbar.style.position = "absolute";
		} else {
			navbar.classList.remove('hide-navbar');
			// Change position only when scrolled to the top
			if (scrollTop === 0) {
				navbar.style.position = "static";
			}
		}

		lastScrollTop = scrollTop;
	};

	// Updated to listen to the scroll event on scrollContainer, not window
	scrollContainer.addEventListener('scroll', handleScroll, true);

	// Inject the necessary CSS using JavaScript
	const style = document.createElement('style');
	style.innerHTML = `
		.hide-navbar {
			transform: translateY(-100%);
			transition: transform 0.3s ease-in-out;
		}
	`;
	document.head.appendChild(style);
}
function listener_autoExpandInput() {
	const textareas = document.querySelectorAll('textarea');
	autosize(textareas);
}

async function updateSettings(updateData) {
	console.log(`updateSettings()`)
	await emitEvent(socket, "updateSettings", { location, updateData })
	console.log("updateSettings() -> success")
}

async function getSettings() {
	console.log("getSettings()")
	const response = await emitEvent(socket, "getSettings", { location })
	const settings = response?.data
	console.log("getSettings() -> settings:", settings)
	return settings
}


const savedTheme = localStorage.getItem('theme') || 'light'; // Default to 'light' if nothing is saved
switchTheme(savedTheme)

async function getConversationIdFromSettings() {
	console.log("getConversationIdFromSettings() -> getSettings()")
	const settings = await getSettings()
	console.log("getConversationIdFromSettings() -> settings.lastConversation:", settings?.lastConversation)
	if (settings?.lastConversation) {
		console.log(`getConversationIdFromSettings() -> found lastConversation in settings: ${settings.lastConversation}`)
		return settings.lastConversation
	}
	else {
		console.log(`getConversationIdFromSettings() -> no lastConversation in settings`)
		return null
	}
}

async function prepareForUser() {
	console.log("prepareForUser() -> getConversationIdFromSettings()...")
	const lastConversationId = await getConversationIdFromSettings()
	if (lastConversationId) {
		console.log("prepareForUser() -> if (lastConversationId)...")
		console.log("prepareForUser() -> set conversationId")
		location.conversationId = lastConversationId
		console.log("prepareForUser() -> renderDropdownItems()...")
		await renderDropdownItems()
		console.log("prepareForUser() -> loadConversation()...")
		loadConversation()
	}
	else {
		console.log("prepareForUser() -> startNewChat()...")
		await startNewChat()
	}
}

socket.on("progressMessage", (data) => {
	console.log("socket.on(progressMessage)")
	let message = data.message
	message = `SERVER: ${message}`
	updateProgressMessage(message)
})

async function updateProgressMessage(message) {
	const myCustomEvent = new CustomEvent('progressMessage', {
		detail: { key: message }
	})

	document.dispatchEvent(myCustomEvent);
}

document.addEventListener('progressMessage', (event) => {
	const message = event.detail?.key?.toString();
	const progressMessageId = "progressMessage";
	const progressMessageElement = document.getElementById(progressMessageId);
	const typingEffectId = "typingEffectElement";
	let typingEffectElement = document.getElementById(typingEffectId) || typingEffectBuilder();

	function messageBuilder(message) {
		let messageContentDiv = document.createElement("div");
		messageContentDiv.classList.add("message-content", "message", "assistant", "from-them");
		messageContentDiv.id = progressMessageId;
		messageContentDiv.innerHTML = message;
		return messageContentDiv;
	}

	function typingEffectBuilder() {
		let typingDiv = document.createElement('div');
		typingDiv.className = "typing-indicator message-content message assistant from-them";
		typingDiv.id = typingEffectId;
		typingDiv.innerHTML = `
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>`;
		return typingDiv;
	}

	if (message) {
		if (!progressMessageElement) {
			// If there is no progress message element, create and append it along with the typing effect
			const newMessageElement = messageBuilder(message);
			messagesList.appendChild(newMessageElement);
			messagesList.appendChild(typingEffectElement);
		} else {
			// If a progress message already exists, just update its content
			progressMessageElement.innerHTML = message;
		}
	} else {
		// If there's no message, remove both the progress message and the typing effect
		progressMessageElement?.remove();
		typingEffectElement?.remove();
	}
});

let initialViewportHeight = window.innerHeight;
console.log(`INTIAL SIZE -> ${initialViewportHeight}`)

/*
window.addEventListener('resize', () => {
	const currentViewportHeight = window.innerHeight;
	console.log(`RESIZE EVENT -> current height: ${currentViewportHeight}`)
	const viewportChange = initialViewportHeight - currentViewportHeight;
	console.log(`RESIZE EVENT -> delta: ${viewportChange}`)

	if (viewportChange > 0) {
		console.log(`postive delta changing height to ${currentViewportHeight}`)
		chatContainer.style.height = `${currentViewportHeight}px`;
		console.log("changed")
	} else {
		// Keyboard probably closed
		console.log("non postive delta changing to 100%")
		chatContainer.style.height = '100%';
		console.log("changed")
	}
});
*/



document.addEventListener("DOMContentLoaded", async () => {
	listener_NewChatButton()
	listener_ClearButton()
	listener_Submit()
	listener_DeleteButton()
	listener_MessageButtons()
	listener_redoResponseButton()
	listener_audioEvents()
	listener_conversationModeButton()
	listener_ModalButtons()
	listener_autoExpandInput()
	document.documentElement.setAttribute("data-theme", savedTheme)
	listener_ThemeButton()
	prepareForUser()
})

