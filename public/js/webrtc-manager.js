/**
 * WebRTCManager - Handles peer-to-peer connections using WebRTC
 * Simplified for host-based room model - app controls connection initiation
 */
import { signalingClient } from './signaling-client.js';

// Extended ICE server list for better NAT traversal
// Note: For production, consider adding TURN servers for symmetric NAT support
// TURN servers require authentication and are typically paid services
// Example TURN config: { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' }
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Additional public STUN servers as fallbacks
  { urls: 'stun:stun.stunprotocol.org:3478' },
];

// Connection timeout in milliseconds
const CONNECTION_TIMEOUT = 30000;

export class WebRTCManager extends EventTarget {
  constructor() {
    super();
    this.peerConnections = new Map();   // peerId -> RTCPeerConnection
    this.dataChannels = new Map();       // peerId -> RTCDataChannel
    this.pendingCandidates = new Map();  // peerId -> ICE candidates received before connection ready
    this.connectionTimeouts = new Map(); // peerId -> timeout ID
    this.setupSignalingHandlers();
  }

  setupSignalingHandlers() {
    // Handle incoming WebRTC offers
    signalingClient.addEventListener('offer', async (e) => {
      const { fromPeerId, offer } = e.detail;
      console.log(`Received offer from: ${fromPeerId}`);
      try {
        await this.handleOffer(fromPeerId, offer);
      } catch (error) {
        console.error(`Failed to handle offer from ${fromPeerId}:`, error);
        this.closePeerConnection(fromPeerId);
      }
    });

    // Handle incoming WebRTC answers
    signalingClient.addEventListener('answer', async (e) => {
      const { fromPeerId, answer } = e.detail;
      console.log(`Received answer from: ${fromPeerId}`);
      try {
        await this.handleAnswer(fromPeerId, answer);
      } catch (error) {
        console.error(`Failed to handle answer from ${fromPeerId}:`, error);
        this.closePeerConnection(fromPeerId);
      }
    });

    // Handle incoming ICE candidates
    signalingClient.addEventListener('ice-candidate', async (e) => {
      const { fromPeerId, candidate } = e.detail;
      try {
        await this.handleIceCandidate(fromPeerId, candidate);
      } catch (error) {
        console.error(`Failed to handle ICE candidate from ${fromPeerId}:`, error);
      }
    });
  }

  // Create a connection to a peer and initiate WebRTC handshake
  async connectToPeer(peerId) {
    console.log(`Initiating connection to peer: ${peerId}`);
    try {
      return await this.createPeerConnection(peerId, true);
    } catch (error) {
      console.error(`Failed to connect to peer ${peerId}:`, error);
      this.closePeerConnection(peerId);
      throw error;
    }
  }

  // Accept a connection from a peer (wait for their offer)
  async acceptPeer(peerId) {
    console.log(`Preparing to accept connection from peer: ${peerId}`);
    // Connection will be created when offer is received
  }

  // Set up connection timeout
  startConnectionTimeout(peerId) {
    this.clearConnectionTimeout(peerId);

    const timeoutId = setTimeout(() => {
      const pc = this.peerConnections.get(peerId);
      if (pc && pc.connectionState !== 'connected') {
        console.log(`Connection to ${peerId} timed out`);
        this.closePeerConnection(peerId);
        this.dispatchEvent(new CustomEvent('connection-timeout', { detail: { peerId } }));
      }
    }, CONNECTION_TIMEOUT);

    this.connectionTimeouts.set(peerId, timeoutId);
  }

  clearConnectionTimeout(peerId) {
    const timeoutId = this.connectionTimeouts.get(peerId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.connectionTimeouts.delete(peerId);
    }
  }

  async createPeerConnection(peerId, initiator = false) {
    // Close existing connection if any
    if (this.peerConnections.has(peerId)) {
      this.closePeerConnection(peerId);
    }

    // Initialize pending candidates buffer for this peer
    this.pendingCandidates.set(peerId, []);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peerConnections.set(peerId, pc);

    // Start connection timeout
    this.startConnectionTimeout(peerId);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signalingClient.sendIceCandidate(peerId, e.candidate);
      }
    };

    pc.onicecandidateerror = (e) => {
      // Only log significant errors (not just failed STUN attempts)
      if (e.errorCode !== 701) {
        console.warn(`ICE candidate error for ${peerId}:`, e.errorText);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}: ${pc.connectionState}`);
      this.dispatchEvent(new CustomEvent('connection-state-change', {
        detail: { peerId, state: pc.connectionState }
      }));

      if (pc.connectionState === 'connected') {
        this.clearConnectionTimeout(peerId);
        this.dispatchEvent(new CustomEvent('peer-connected', { detail: { peerId } }));
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.closePeerConnection(peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerId}: ${pc.iceConnectionState}`);

      // Handle ICE restart if connection fails but peer connection is still valid
      if (pc.iceConnectionState === 'failed') {
        console.log(`ICE connection failed for ${peerId}, closing...`);
        this.closePeerConnection(peerId);
      }
    };

    pc.ondatachannel = (e) => {
      console.log(`Received data channel from ${peerId}`);
      this.setupDataChannel(peerId, e.channel);
    };

    if (initiator) {
      const channel = pc.createDataChannel('dice', { ordered: true });
      this.setupDataChannel(peerId, channel);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signalingClient.sendOffer(peerId, offer);
      } catch (error) {
        console.error(`Failed to create/send offer to ${peerId}:`, error);
        throw error;
      }
    }

    return pc;
  }

  setupDataChannel(peerId, channel) {
    this.dataChannels.set(peerId, channel);

    channel.onopen = () => {
      console.log(`Data channel with ${peerId} opened`);
      this.dispatchEvent(new CustomEvent('channel-open', {
        detail: { peerId, channel }
      }));
    };

    channel.onclose = () => {
      console.log(`Data channel with ${peerId} closed`);
      this.dataChannels.delete(peerId);
      this.dispatchEvent(new CustomEvent('channel-closed', { detail: { peerId } }));
    };

    channel.onerror = (error) => {
      console.error(`Data channel error with ${peerId}:`, error);
      this.dispatchEvent(new CustomEvent('channel-error', {
        detail: { peerId, error }
      }));
    };

    channel.onmessage = (e) => {
      try {
        const message = JSON.parse(e.data);
        this.dispatchEvent(new CustomEvent('message', {
          detail: { peerId, message }
        }));
      } catch (err) {
        console.error('Error parsing message from peer:', err);
      }
    };
  }

  async handleOffer(peerId, offer) {
    const pc = await this.createPeerConnection(peerId, false);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Apply any buffered ICE candidates now that remote description is set
    await this.applyPendingCandidates(peerId);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signalingClient.sendAnswer(peerId, answer);
  }

  async handleAnswer(peerId, answer) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Apply any buffered ICE candidates now that remote description is set
      await this.applyPendingCandidates(peerId);
    }
  }

  async handleIceCandidate(peerId, candidate) {
    if (!candidate) return;

    const pc = this.peerConnections.get(peerId);

    // If connection doesn't exist yet, or remote description isn't set, buffer the candidate
    if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
      console.log(`Buffering ICE candidate for ${peerId} (connection not ready)`);
      let pending = this.pendingCandidates.get(peerId);
      if (!pending) {
        pending = [];
        this.pendingCandidates.set(peerId, pending);
      }
      pending.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Error adding ICE candidate:', e);
    }
  }

  async applyPendingCandidates(peerId) {
    const pending = this.pendingCandidates.get(peerId);
    if (!pending || pending.length === 0) return;

    const pc = this.peerConnections.get(peerId);
    if (!pc) return;

    console.log(`Applying ${pending.length} buffered ICE candidates for ${peerId}`);

    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding buffered ICE candidate:', e);
      }
    }

    this.pendingCandidates.set(peerId, []);
  }

  closePeerConnection(peerId) {
    this.clearConnectionTimeout(peerId);
    this.pendingCandidates.delete(peerId);

    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }

    const channel = this.dataChannels.get(peerId);
    if (channel) {
      channel.close();
      this.dataChannels.delete(peerId);
    }

    this.dispatchEvent(new CustomEvent('peer-disconnected', { detail: { peerId } }));
  }

  getDataChannel(peerId) {
    return this.dataChannels.get(peerId);
  }

  sendToPeer(peerId, message) {
    const channel = this.dataChannels.get(peerId);
    if (channel && channel.readyState === 'open') {
      try {
        channel.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Failed to send to peer ${peerId}:`, error);
        return false;
      }
    }
    return false;
  }

  broadcast(message, excludePeerId = null) {
    const messageStr = JSON.stringify(message);
    for (const [peerId, channel] of this.dataChannels) {
      if (peerId !== excludePeerId && channel.readyState === 'open') {
        try {
          channel.send(messageStr);
        } catch (error) {
          console.error(`Failed to broadcast to peer ${peerId}:`, error);
        }
      }
    }
  }

  closeAll() {
    // Create a copy of keys to avoid modifying map while iterating
    const peerIds = Array.from(this.peerConnections.keys());
    for (const peerId of peerIds) {
      this.closePeerConnection(peerId);
    }
  }

  getConnectedPeers() {
    return Array.from(this.dataChannels.entries())
      .filter(([_, channel]) => channel.readyState === 'open')
      .map(([peerId]) => peerId);
  }

  isConnectedTo(peerId) {
    const channel = this.dataChannels.get(peerId);
    return channel && channel.readyState === 'open';
  }
}

// Singleton instance
export const webrtcManager = new WebRTCManager();
