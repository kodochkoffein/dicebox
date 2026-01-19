/**
 * SignalingClient - Handles WebSocket connection to minimal ICE broker
 * Only handles: peer ID assignment, room queries, host registration, and WebRTC signaling
 */
export class SignalingClient extends EventTarget {
  constructor() {
    super();
    this.ws = null;
    this.peerId = null;
    this.roomId = null;
    this.isHost = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this._connectPromise = null;
  }

  connect() {
    // Prevent multiple concurrent connection attempts
    if (this._connectPromise) {
      return this._connectPromise;
    }

    this._connectPromise = new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (error) {
        this._connectPromise = null;
        reject(error);
        return;
      }

      const connectionTimeout = setTimeout(() => {
        this._connectPromise = null;
        this.ws?.close();
        reject(new Error('Connection timeout'));
      }, 10000);

      this.ws.onopen = () => {
        console.log('Connected to signaling server');
        this.reconnectAttempts = 0;
        this.dispatchEvent(new CustomEvent('connected'));
      };

      this.ws.onclose = (event) => {
        console.log('Disconnected from signaling server', event.code);
        clearTimeout(connectionTimeout);
        this._connectPromise = null;

        const wasConnected = this.peerId !== null;
        const previousRoomId = this.roomId;
        const wasHost = this.isHost;

        this.peerId = null;
        this.dispatchEvent(new CustomEvent('disconnected', {
          detail: { wasConnected, previousRoomId, wasHost }
        }));

        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        clearTimeout(connectionTimeout);
        this._connectPromise = null;
        reject(error);
      };

      this.ws.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.error('Failed to parse message from server:', error);
          return;
        }

        // Handle peer-id specially to resolve connect promise
        if (message.type === 'peer-id') {
          this.peerId = message.peerId;
          console.log('Assigned peer ID:', this.peerId);
          clearTimeout(connectionTimeout);
          this._connectPromise = null;
          resolve();
          return;
        }

        // Handle server errors
        if (message.type === 'error') {
          console.error('Server error:', message.errorType, message.reason);
          this.dispatchEvent(new CustomEvent('server-error', { detail: message }));
          return;
        }

        this.handleMessage(message);
      };
    });

    return this._connectPromise;
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.dispatchEvent(new CustomEvent('reconnect-failed'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    setTimeout(() => {
      this.connect()
        .then(() => {
          // Emit reconnected event so app can re-register if needed
          this.dispatchEvent(new CustomEvent('reconnected', {
            detail: { peerId: this.peerId }
          }));
        })
        .catch(() => {
          // Will trigger another attemptReconnect via onclose
        });
    }, delay);
  }

  handleMessage(message) {
    // Dispatch all messages as events - let the app handle them
    this.dispatchEvent(new CustomEvent(message.type, { detail: message }));
  }

  /**
   * Send a message to the server
   * @returns {boolean} true if message was sent, false if not connected
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Check if connected to the signaling server
   * @returns {boolean}
   */
  isConnected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.peerId !== null;
  }

  // Query if a room exists and who the host is
  queryRoom(roomId) {
    return this.send({ type: 'query-room', roomId });
  }

  // Register as host for a new room
  registerHost(roomId) {
    if (this.send({ type: 'register-host', roomId })) {
      this.roomId = roomId;
      this.isHost = true;
      return true;
    }
    return false;
  }

  // Claim host role (for migration)
  claimHost(roomId) {
    return this.send({ type: 'claim-host', roomId });
  }

  // Join an existing room
  joinRoom(roomId) {
    if (this.send({ type: 'join-room', roomId })) {
      this.roomId = roomId;
      this.isHost = false;
      return true;
    }
    return false;
  }

  // Leave current room
  leaveRoom() {
    const success = this.send({ type: 'leave-room' });
    this.roomId = null;
    this.isHost = false;
    return success;
  }

  // WebRTC signaling
  sendOffer(targetPeerId, offer) {
    return this.send({ type: 'offer', targetPeerId, offer });
  }

  sendAnswer(targetPeerId, answer) {
    return this.send({ type: 'answer', targetPeerId, answer });
  }

  sendIceCandidate(targetPeerId, candidate) {
    return this.send({ type: 'ice-candidate', targetPeerId, candidate });
  }

  disconnect() {
    if (this.ws) {
      this.send({ type: 'leave-room' });
      this.ws.close();
      this.ws = null;
    }
    this.peerId = null;
    this.roomId = null;
    this.isHost = false;
    this._connectPromise = null;
  }

  // Reset reconnection state (useful when user explicitly disconnects)
  resetReconnection() {
    this.reconnectAttempts = this.maxReconnectAttempts;
  }
}

// Singleton instance
export const signalingClient = new SignalingClient();
