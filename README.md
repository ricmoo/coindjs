CoinDJs
=======

A full node implementation of bitcoin-based coins.

**Note**: This is still heavily under construction. After sitting on my hard drive collecting dust for the last 2 years, I've deciding to get it back into it. The original plan was to be pure JavaScript, however, the lack of a suitable database solution for the blockchain means I will probably use a simple library like LevelDB that, while not pure JavaScript, tends to be highly compatible.


Install
-------

```
npm install coindjs
```


Sub-Libraries
-------------

The *CoinDJs* library is carved up into several smaller pieces, as only sub-components may be necessary for many projects.
- **Bootstrap** - handles bootstrapping the initial set of nodes for the peer-to-peer network
- **Protocol** - parses and creates the binary representations of messages and data formats for the wire protocol


Use Case: Dump Headers Node
---------------------------

This is a very simple node, which will connect to a bitcoin node on the current host and dump messages.

```javascript
var Node = require('./node').Node;

var node = new Node();
node.connect('127.0.0.1', 8333);

node.on('send', function (peer, message) {
    console.log('send ', message.command);
});

node.on('message', function(peer, message) {
    console.log('message', message);
});

node.on('peerError', function (peer, error) {
    console.log('error', error);
});
```



Donations?
----------

Obviously, it's all licensed under the MIT license, so use it as you wish; but if you'd like to buy me a coffee, I won't complain. =)

- Bitcoin - `14LqHMgjUvsZqExfun9WxMDqKRzAE8RyRE`
- Dogecoin - `D6Boh5yJW5GZgXxBvBDc14abmERqPytXtu`
- Testnet3 - `msruGAUef59FYSsmVnAWxrapCKiSvRnj2J`
