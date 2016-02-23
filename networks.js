'use strict';

var crypto = require('crypto');

function sha256(data) {
    var hasher = crypto.createHash('sha256');
    hasher.update(data);
    return hasher.digest();
}

function hash256(data) {
    return sha256(sha256(data));
}

var format = require('../coindjs-protocol').format;

function proofOfWorkSha256d(block) {
    if (!Buffer.isBuffer(block)) {
        block = format.BlockHeaderWithoutTransactionCount.toBinary(block).slice(0, 80);
    } else {
        block = block.slice(0, 80);
    }
    return hash256(block);
}

module.exports = {
    bitcoin: {
        name: 'bitcoin',
        symbol: 'btc',

        version: 70001,

        magic: (new Buffer('f9beb4d9', 'hex')),
        port: 8333,

        wifPrefix: 0x80,

        dnsSeeds: [
            "seed.bitcoin.sipa.be:8333",
            "dnsseed.bluematt.me:8333",
            "dnsseed.bitcoin.dashjr.org:8333",
            "seed.bitcoinstats.com:8333",
            "seed.bitnodes.io:8333",
            "bitseed.xf2.org:8333",
        ],

        ircBootstrapChannel: null,

        proofOfWork: proofOfWorkSha256d,

        auxPoWStartBlock: null,

        genesisBlock: {
            version: 1,
            blockHash: new Buffer('6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000', 'hex'),
            merkleRoot: new Buffer('3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a', 'hex'),
            timestamp: 1231006505,
            bits: 0x1d00ffff,
            nonce: 2083236893,
        },

        addressPrefix: 0x00,
        p2shAddressPrefix: 0x05,

        alertPublicKeys: [
            new Buffer('04fc9702847840aaf195de8442ebecedf5b095cdbb9bc716bda9110971b28a49e0ead8564ff0db22209e0374782c093bb899692d524e9d6a6956e7c5ecbcd68284', 'hex'),
        ],
    },

    testnet: {
        name: 'testnet3',
        symbol: 'tbtc',

        version: 70001,

        magic: (new Buffer('0b110907', 'hex')),
        port: 18333,

        wifPrefix: 0xef,

        dnsSeeds: [
            "testnet-seed.alexykot.me:18333",
            "testnet-seed.bitcoin.petertodd.org:18333",
            "testnet-seed.bluematt.me:18333",
            "testnet-seed.bitcoin.schildbach.de:18333",
        ],

        ircBootstrapChannel: null,

        proofOfWork: proofOfWorkSha256d,

        auxPoWStartBlock: null,

        genesisBlock: {
            version: 1,
            blockHash: new Buffer('43497fd7f826957108f4a30fd9cec3aeba79972084e90ead01ea330900000000', 'hex'),
            merkleRoot: new Buffer('3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a', 'hex'),
            timestamp: 1296688602,
            bits: 0x1d00ffff,
            nonce: 414098458,
        },

        addressPrefix: 0x6f,
        p2shAddressPrefix: 0xc4,

        alertPublicKeys: [
            new Buffer('04302390343f91cc401d56d68b123028bf52e5fca1939df127f63c6467cdf9c8e2c14b61104cf817d0b780da337893ecc4aaff1309e536162dabbdb45200ca2b0a', 'hex'),
        ],
    },

    namecoin: {
        name: 'namecoin',
        symbol: 'nmc',

        //version: 38000,
        version: 37500,

        magic: (new Buffer('f9beb4fe', 'hex')),
        port: 8334,

        wifPrefix: 0x80,

        dnsSeeds: [
        ],

        ircBootstrapChannel: function() {
            return '#namecoin0' + parseInt(Math.random() * 2);
        },

        proofOfWork: proofOfWorkSha256d,

        auxPoWStartBlock: 19200,

        genesisBlock: {
            version: 1,
            blockHash: new Buffer('70c7a9f0a2fb3d48e635a70d5b157c807e58c8fb45eb2c5e2cb7620000000000', 'hex'),
            //blockHash: new Buffer('000000000062b72c5e2ceb45fbc8587e807c155b0da735e6483dfba2f0a9c770', 'hex'),
            merkleRoot: new Buffer('0dcbd3e6f061215bf3b3383c8ce2ec201bc65acde32595449ac86890bd2dc641', 'hex'),
            timestamp: 1303000001,
            bits: 0x1c007fff,
            nonce: 2719916434,
        },

        addressPrefix: 52,
        testAddressPrefix: 111,

        alertPublicKeys: [
            new Buffer('04ba207043c1575208f08ea6ac27ed2aedd4f84e70b874db129acb08e6109a3bbb7c479ae22565973ebf0ac0391514511a22cb9345bdb772be20cfbd38be578b0c', 'hex'),
            new Buffer('04fc4366270096c7e40adb8c3fcfbff12335f3079e5e7905bce6b1539614ae057ee1e61a25abdae4a7a2368505db3541cd81636af3f7c7afe8591ebc85b2a1acdd', 'hex'),
        ],
    }
}
