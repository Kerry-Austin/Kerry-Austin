export class FetchWrapper {
	constructor(baseURL, headers = {}, wsURL) {
		this.baseURL = baseURL;
		this.headers = headers;
	}

	get(endpoint) {
		return fetch(this.baseURL + endpoint)
			.then(response => response.json());
	}

	put(endpoint, body) {
		return this.#send("put", endpoint, body);
	}

	post(endpoint, body) {
		return this.#send("post", endpoint, body);
	}

	delete(endpoint, body) {
		return this.#send("delete", endpoint, body);
	}

	stream(endpoint, body, method = "post") {
		return fetch(this.baseURL + endpoint, {
			method,
			headers: {
				...this.headers,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		});
	}

	#send(method, endpoint, body) {
		return fetch(this.baseURL + endpoint, {
			method,
			headers: {
				...this.headers,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		}).then(response => response.json());
}

	// Initialize a WebSocket
	initWebSocket(endpoint) {
		const wsURL = `${this.baseURL.replace(/^http/, 'ws')}${endpoint}`;
		const ws = new WebSocket(wsURL);

		ws.onopen = () => {
			console.log('WebSocket connection opened (fetchWrapper)');
		};

		return ws;
	}

	// Close a WebSocket
	closeWebSocket() {
		if (this.ws) {
			this.ws.close();
			console.log('WebSocket connection closed');
		}
	}
}

