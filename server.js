const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 1000,           // 1 second window
  maxMessages: 50,          // Max messages per window
  maxConnectionsPerIp: 10,  // Max concurrent connections per IP
};

// Track connections per IP for rate limiting
const connectionsByIp = new Map();  // ip -> Set of ws connections
const messageRates = new Map();     // peerId -> { count, windowStart }

// Simple static file server
const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, 'public', filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// WebSocket signaling server - MINIMAL ICE BROKER
const wss = new WebSocket.Server({ server });

// Minimal room tracking: roomId -> { hostPeerId, hostWs }
const rooms = new Map();

// Peer connections: peerId -> { ws, roomId, ip }
const peers = new Map();

// Generate cryptographically secure peer ID
function generatePeerId() {
  return crypto.randomBytes(16).toString('hex');
}

// Validate room ID format (alphanumeric, 4-32 chars)
function isValidRoomId(roomId) {
  return typeof roomId === 'string' &&
         roomId.length >= 4 &&
         roomId.length <= 32 &&
         /^[a-zA-Z0-9-_]+$/.test(roomId);
}

// Validate peer ID format (32 hex chars)
function isValidPeerId(peerId) {
  return typeof peerId === 'string' &&
         peerId.length === 32 &&
         /^[a-f0-9]+$/.test(peerId);
}

// Check rate limit for a peer
function checkRateLimit(peerId) {
  const now = Date.now();
  let rateData = messageRates.get(peerId);

  if (!rateData || now - rateData.windowStart > RATE_LIMIT.windowMs) {
    rateData = { count: 0, windowStart: now };
    messageRates.set(peerId, rateData);
  }

  rateData.count++;
  return rateData.count <= RATE_LIMIT.maxMessages;
}

// Get client IP from request
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.socket?.remoteAddress ||
         'unknown';
}

// Check connection limit per IP
function checkConnectionLimit(ip) {
  const connections = connectionsByIp.get(ip);
  return !connections || connections.size < RATE_LIMIT.maxConnectionsPerIp;
}

// Track connection for an IP
function trackConnection(ip, ws) {
  if (!connectionsByIp.has(ip)) {
    connectionsByIp.set(ip, new Set());
  }
  connectionsByIp.get(ip).add(ws);
}

// Remove connection tracking for an IP
function untrackConnection(ip, ws) {
  const connections = connectionsByIp.get(ip);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      connectionsByIp.delete(ip);
    }
  }
}

function sendTo(ws, message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendToPeer(peerId, message) {
  const peer = peers.get(peerId);
  if (peer) {
    sendTo(peer.ws, message);
  }
}

function sendError(ws, errorType, reason) {
  sendTo(ws, { type: 'error', errorType, reason });
}

wss.on('connection', (ws, req) => {
  const ip = getClientIp(req);

  // Check connection limit
  if (!checkConnectionLimit(ip)) {
    sendTo(ws, { type: 'error', errorType: 'rate-limit', reason: 'Too many connections' });
    ws.close();
    return;
  }

  const peerId = generatePeerId();
  peers.set(peerId, { ws, roomId: null, ip });
  trackConnection(ip, ws);

  console.log(`Peer connected: ${peerId.substring(0, 8)}...`);

  // Send peer their ID
  sendTo(ws, { type: 'peer-id', peerId });

  ws.on('message', (data) => {
    // Check rate limit
    if (!checkRateLimit(peerId)) {
      sendError(ws, 'rate-limit', 'Too many messages');
      return;
    }

    let message;
    try {
      message = JSON.parse(data);
    } catch (e) {
      sendError(ws, 'invalid-json', 'Invalid JSON message');
      return;
    }

    // Validate message has a type
    if (!message || typeof message.type !== 'string') {
      sendError(ws, 'invalid-message', 'Message must have a type');
      return;
    }

    const peer = peers.get(peerId);

    switch (message.type) {
      // Room discovery: check if room exists and get host info
      case 'query-room': {
        const { roomId } = message;

        if (!isValidRoomId(roomId)) {
          sendTo(ws, { type: 'room-info', roomId: null, exists: false, error: 'Invalid room ID' });
          return;
        }

        const room = rooms.get(roomId);

        if (room) {
          sendTo(ws, {
            type: 'room-info',
            roomId,
            exists: true,
            hostPeerId: room.hostPeerId
          });
        } else {
          sendTo(ws, {
            type: 'room-info',
            roomId,
            exists: false
          });
        }
        break;
      }

      // Register as host for a room
      case 'register-host': {
        const { roomId } = message;

        if (!isValidRoomId(roomId)) {
          sendTo(ws, { type: 'register-host-failed', roomId, reason: 'Invalid room ID format' });
          return;
        }

        // Check if room already has a host
        if (rooms.has(roomId)) {
          sendTo(ws, { type: 'register-host-failed', roomId, reason: 'Room already has a host' });
          return;
        }

        rooms.set(roomId, { hostPeerId: peerId, hostWs: ws });
        peer.roomId = roomId;

        sendTo(ws, { type: 'register-host-success', roomId });
        console.log(`Room ${roomId} created with host ${peerId.substring(0, 8)}...`);
        break;
      }

      // Claim host role (for migration)
      case 'claim-host': {
        const { roomId } = message;

        if (!isValidRoomId(roomId)) {
          sendTo(ws, { type: 'claim-host-failed', roomId, reason: 'Invalid room ID format' });
          return;
        }

        const room = rooms.get(roomId);

        // Allow claiming if room doesn't exist or has no active host
        if (!room || !peers.has(room.hostPeerId)) {
          rooms.set(roomId, { hostPeerId: peerId, hostWs: ws });
          peer.roomId = roomId;
          sendTo(ws, { type: 'claim-host-success', roomId });
          console.log(`Room ${roomId} host migrated to ${peerId.substring(0, 8)}...`);
        } else {
          sendTo(ws, { type: 'claim-host-failed', roomId, reason: 'Room already has active host' });
        }
        break;
      }

      // Join a room (connect to its host)
      case 'join-room': {
        const { roomId } = message;

        if (!isValidRoomId(roomId)) {
          sendTo(ws, { type: 'join-room-failed', roomId, reason: 'Invalid room ID format' });
          return;
        }

        const room = rooms.get(roomId);

        if (!room) {
          sendTo(ws, { type: 'join-room-failed', roomId, reason: 'Room does not exist' });
          return;
        }

        peer.roomId = roomId;

        // Tell the peer who the host is so they can initiate WebRTC
        sendTo(ws, {
          type: 'join-room-success',
          roomId,
          hostPeerId: room.hostPeerId
        });

        // Notify host that a peer wants to connect
        sendTo(room.hostWs, {
          type: 'peer-connecting',
          peerId
        });

        console.log(`Peer ${peerId.substring(0, 8)}... joining room ${roomId}`);
        break;
      }

      // WebRTC signaling - just relay between peers
      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        const { targetPeerId } = message;

        if (!isValidPeerId(targetPeerId)) {
          sendError(ws, 'invalid-peer', 'Invalid target peer ID');
          return;
        }

        // Verify target peer exists
        if (!peers.has(targetPeerId)) {
          sendError(ws, 'peer-not-found', 'Target peer not found');
          return;
        }

        sendToPeer(targetPeerId, {
          ...message,
          fromPeerId: peerId
        });
        break;
      }

      // Leave room
      case 'leave-room': {
        if (peer.roomId) {
          const room = rooms.get(peer.roomId);

          // If this peer was the host, remove the room
          if (room && room.hostPeerId === peerId) {
            rooms.delete(peer.roomId);
            console.log(`Room ${peer.roomId} closed (host left)`);
          }

          peer.roomId = null;
        }
        break;
      }

      default:
        // Silently ignore unknown message types (don't log to prevent log spam)
        break;
    }
  });

  ws.on('close', () => {
    const peer = peers.get(peerId);

    if (peer) {
      untrackConnection(peer.ip, ws);

      if (peer.roomId) {
        const room = rooms.get(peer.roomId);

        // If this peer was the host, remove the room entry
        // (clients will handle migration via claim-host)
        if (room && room.hostPeerId === peerId) {
          rooms.delete(peer.roomId);
          console.log(`Room ${peer.roomId} host disconnected, awaiting migration`);
        }
      }
    }

    messageRates.delete(peerId);
    peers.delete(peerId);
    console.log(`Peer disconnected: ${peerId.substring(0, 8)}...`);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for peer ${peerId.substring(0, 8)}...:`, error.message);
  });
});

// Cleanup stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [peerId, rateData] of messageRates) {
    if (now - rateData.windowStart > RATE_LIMIT.windowMs * 10) {
      messageRates.delete(peerId);
    }
  }
}, 60000);

server.listen(PORT, () => {
  console.log(`DiceBox server running on http://localhost:${PORT}`);
  console.log(`Minimal ICE broker ready (host-based rooms)`);
});
