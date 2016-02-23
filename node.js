'use strict';

var EventEmitter = require('events').EventEmitter;
var net = require('net');
var util = require('util');

var protocol = require('coindjs-protocol');

var networks = require('./networks');

var Services = {
  NodeNetwork: 1,
};


var Zero32 = new Buffer(32);
Zero32.fill(0);


var Peer = function(node, host, port, sock) {
    var self = this;

    this._node = node;

    this.host = host;
    this.port = port;

    this.services = null;
    this.startHeight = null;
    this.userAgent = null;
    this.version = null;
    this.relay = null;

    this.bytesIn = 0;
    this.bytesOut = 0;

    this.verack = false;

    this._lastBytesInTime = 0.0;
    this._lastBytesOutTime = 0.0;

    // We track what each peer *thinks* our address is to better guess
    // what it might actually be
    this._ipAddress = null;

    var greeting = new protocol.messages.version({
        version: 37500,
        services: 0,
        timestamp: (new Date()).getTime(),
        addr_recv: {services: 0, address: '127.0.0.1', port: 8333},
        addr_from: {services: 0, address: host, port: port},
        nonce: new Buffer('0011223344556677', 'hex'),   // @TODO: random nonce
        user_agent: self._node.userAgent,
        start_height: 0
    });

    // We need a new connection
    if (sock == null) {
        this.incoming = false;
        this._sock = net.createConnection({port: port, host: host}, function () {
            self._node.emit('peerConnect', self);
            self.send(greeting);
        });

    // Incoming connection; we already have a socket
    } else {
        this.incoming = true;
        this._sock = sock;
        this.send(greeting);
    }

    // When data becomes available, check for complete messages
    this._buffer = new Buffer(0);
    this._sock.on('data', function (data) {
        self._lastBytesInTime = (new Date()).getTime()
        self.bytesIn += data.length

        self._buffer = Buffer.concat([self._buffer, data]);
        self._checkBuffer();
    });

    // When a peer error occurs...
    this._sock.on('error', function (error) {
        self._node.emit('peerError', self, error);
    });

    // When the peer connection closes...
    this._sock.on('close', function() {
        self.disconnect();
    });

    // Prevent node.js from terminating as long as we have connections
    this._sock.ref();
}

Peer.prototype.send = function(message) {

    var binary = null;
    try {
        binary = message.toBinary(this._node.network.magic)

    } catch (error) {
        error._message = message;
        this._node.emit('peerError', this, error);
        return;
    }

    this._node.emit('send', this, message)

    this.bytesOut += binary.length;
    this._lastBytesOutTime = (new Date()).getTime();

    this._sock.write(binary);
}

Peer.prototype._checkBuffer = function() {

    // While there are messages...
    while (true) {

        // ...check for an available message
        var available = protocol.firstAvailableMessageLength(this._buffer);
        if (available !== null) {

            // Remove the message bytes from the buffer
            var binaryData = this._buffer.slice(0, available);
            this._buffer = new Buffer(this._buffer.slice(available));

            // Parse the message
            var message = null;
            try {
                message = this._node._parseMessage(binaryData);

            } catch (error) {
                error._binaryData = binaryData;
                this._node.emit('peerError', this, error);
                continue;
            }

            // If it is a verack or version, we fill in some details about the peer
            if (message.command == 'verack') {
                this.verack = true;

            } else if (message.command == 'version') {
                this.services = message.values.services;
                this.startHeight = message.values.start_height;
                this.userAgent = message.values.user_agent;
                this.version = message.values.version;
                //this.relay = message.relay;
                this._ipAddress = message.values.addr_recv.address;
            }

            // notify the node of this message
            this._node.emit('message', this, message);
        } else {
            break;
        }
    }
}

Peer.prototype.disconnect = function() {
    this._sock.unref();
    this._node._peerDisconnect(this);
}

Peer.prototype.toString = function() {
    return util.format('<Peer %s:%d>', this.host, this.port);
}


/*
  Events
    - message(peer, message)
    - error(error)
    - peerError(peer, error)
    - peerConnect(peer)
    - peerDisconnect(peer)
    - listening()
    - disconnect()
*/

var Node = function(options) {
    EventEmitter.call(this);

    this.network = options.network;
    if (!this.network) {
        this.network = networks.bitcoin;
    }

    this._messages = options.messages;
    if (!this._messages) {
        this._messages = protocol.messages;
    }

    this.userAgent = options.userAgent;
    if (!this.userAgent) {
        this.userAgent = "coindjs/0.0.1"; // @TODO pull verson from package.json
    }

    this._peers = [];

    this._listening = false;
    this.port = options.port || this.network.port;
}
util.inherits(Node, EventEmitter);


Node.prototype.getIPAddress = function() {
    var tally = {};
    for (var i = 0; i < this._peers.length; i++) {
        var address = this._peers[i]._externalIPAddress;
        if (address !== null) {
            if (!tally[address]) {
                tally[address] = 1;
            } else {
                tally[address]++;
            }
        }
    }

    // @TODO: return best guess
    return '127.0.0.1';
}

Node.prototype._peerDisconnect = function(peer) {
    this.emit('peerDisconnect', peer);
    var index = this._peers.indexOf(peer);
    if (index >= 0) {
        this._peers.splice(index, 1);
    }
}

Node.prototype.connect = function(host, port) {
    this._peers.push(new Peer(this, host, port, null));
};

Node.prototype.listen = function(port) {
    var self = this;

    this._server = net.createServer(function(sock) {
        var peer = new Peer(self, host, port, sock);
        self._peers.push(peer);
        self._node.emit('peerConnect', peer);
    });

    self._server.listen(port, function () {
        self.emit('listen');
    });
};

Node.prototype.randomPeer = function() {
    if (this._peers.length == 0) { return null; }
    return this._peers[parseInt(Math.random() * this._peers.length)];
}

Node.prototype._parseMessage = function(binaryData) {
    return protocol.messageFromBinary(binaryData, this._messages);
}

Node.prototype.stop = function() {
    // Remove these backward, since disconnect removes us from this._peers.
    for (var i = this._peers.length - 1; i >= 0; i++) {
        this._peers[i].disconnect();
    }
}



/*
 * Provides a default message handler for a full node
 */
function FullNode(options, database) {
    Node.call(this, options);

    var self = this;

    this._database = database;

    this._lastHeaderRequestTime = 0;

    this._database.on('ready', function() {
        self._requestHeaders(false);
    });

    this._database.on('relinked', function() {
        self._requestHeaders(false);
    });

    this.on('peerConnect', function(peer) {
        var nonce = new Buffer(8);
        for (var i = 0; i < 8; i++) {
            nonce[i] = parseInt(Math.random() * 256);
        }

        peer.send(new Messages.commands.version({
            version: self.network.version,
            timestamp: parseInt((new Date()).getTime()),
            services: (Services.NodeNetwork),
            addr_recv: {services: 1, address: peer.host, port: peer.port},
            addr_from: {services: 1, address: self.getIPAddress(), port: self.port},
            nonce: nonce,
            user_agent: 'coindjs:' + self.network.symbol,
            start_height: 0,
//            relay: 
        }));
    });

    this.on('message', function(peer, message) {
        console.log('<<<', peer.toString(), message.command);

        switch (message.command) {
            case 'version':
                peer.send(new Messages.commands.verack());
                break;

            case 'verack':
                break;

            case 'headers':
                for (var i = 0; i < message.values.headers.length; i++) {
                    self._database.addBlockHeader(message.values.headers[i]);
                }

                // We got headers, there are probably more, so force a getheaders
                var force = (message.values.headers.length > 0);
                self._requestHeaders(force);
                break;

            case 'block':
                self._database.addBlockTransactions(message.values);
        }
    });

    this.on('peerDisconnect', function(peer) {
        console.log('Peer disconnected', peer.toString());
    });

    this._heartbeatTimer = setInterval(function() { self._heartbeat() }, 10 * 1000);
}
util.inherits(FullNode, Node);


FullNode.prototype._requestHeaders = function(force) {

    // Don't request headers more than once every 30 seconds (if we got a response,
    // we reset the timer above, so this time limit will be ignored)
    var now = (new Date()).getTime();
    if (!force && this._lastHeaderRequestTime + (30 * 1000) > now) {
        return;
    }

    // Pick a random peer
    var peer = this.randomPeer();
    if (!peer) {
        console.log('No peers found.');
        return;
    }

    // And send the block locator hash
    var self = this;
    var version = this.network.version;
    this._database.getBlockLocatorHashes(function(blockLocatorHashes) {

        // The database is busy
        if (blockLocatorHashes === null) { return; }

        peer.send(new Messages.commands.getheaders({
            version: version,
            block_locator_hash: blockLocatorHashes,
            hash_stop: Zero32,
        }));

        self._lastHeaderRequestTime = now;
    });
}

FullNode.prototype._requestBlocks = function() {
    console.log('request blocks');

    // Pick a random peer
    var peer = this.randomPeer();
    if (!peer) {
        console.log('No peers found.');
        return;
    }

    this._database.getIncompleteBlocks(20000, function(blocks) {

        if (blocks.length === 0) {
            console.log('no incomplete blocks');
            return;
        }

        var inventory = [];
        for (var i = 0; i < blocks.length; i++) {
            inventory.push({type: protocol.format.InventoryVector.types.block, hash: blocks[i].hash});
        }

        peer.send(new Messages.commands.getdata({
            inventory: inventory
        }));
    });
}


FullNode.prototype._heartbeat = function() {
    var self = this;
    if (this._database.ready()) {
        self._requestHeaders(false);
        self._requestBlocks();
        console.log('Heartbeat Height', this._database.height);
    }
}



// Public Interface
module.exports = {
//    MessageHandler: MessageHandler,
//    DefaultHandler: DefaultHandler,
//    FullNode: FullNode,
    Node: Node,
//    DumpNode: DumpNode,
}
