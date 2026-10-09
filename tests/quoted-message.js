'use strict';

const { expect } = require('chai');
const Message = require('../src/structures/Message');
const { LoadUtils } = require('../src/util/Injected/Utils');

describe('Message.getQuotedMessage', function () {
    const replyId = 'false_123@c.us_reply';
    const originalId = 'false_123@c.us_original';
    let previousWindow;

    beforeEach(function () {
        previousWindow = global.window;
    });

    afterEach(function () {
        global.window = previousWindow;
    });

    function createReply(collection, quoted) {
        global.window = {
            require(name) {
                if (name === 'WAWebCollections') return { Msg: collection };
                if (name === 'WAWebQuotedMsgModelUtils') {
                    return { getQuotedMsgObj: () => quoted };
                }
            },
            WWebJS: { getMessageModel: (model) => model },
        };
        const client = {
            pupPage: { evaluate: (callback, id) => callback(id) },
        };
        return new Message(client, {
            id: { _serialized: replyId, id: 'reply' },
            quotedMsg: true,
        });
    }

    it('returns the quoted message from the cache', async function () {
        const quoted = { id: { _serialized: originalId, id: 'original' } };
        const reply = createReply(
            {
                get: () => ({}),
                getMessagesById: () => {
                    throw new Error('The cache should be used');
                },
            },
            quoted,
        );

        expect((await reply.getQuotedMessage()).id._serialized).to.equal(
            originalId,
        );
    });

    it('returns undefined when the reply is no longer available', async function () {
        const reply = createReply({
            get: () => undefined,
            getMessagesById: async () => ({ messages: [] }),
        });

        expect(await reply.getQuotedMessage()).to.equal(undefined);
    });

    it('identifies a failure while loading the reply', async function () {
        const reply = createReply({
            get: () => undefined,
            getMessagesById: async () => {
                throw new Error('r: r');
            },
        });

        try {
            await reply.getQuotedMessage();
            throw new Error('Expected getQuotedMessage to fail');
        } catch (error) {
            expect(error.message).to.include('error al cargar el mensaje');
            expect(error.message).to.include('r: r');
        }
    });

    it('restores the serialized key used by page-side quote lookup', async function () {
        class MsgKey {
            constructor(value) {
                this.$1 = value;
            }

            toString() {
                return this.$1;
            }
        }

        const quoted = { id: { _serialized: originalId, id: 'original' } };
        const replyModel = { id: new MsgKey(replyId) };
        const reply = createReply(
            {
                get: () => replyModel,
                getMessagesById: async () => ({ messages: [] }),
            },
            quoted,
        );
        global.window.require = (name) => {
            if (name === 'WAWebMsgKey') return MsgKey;
            if (name === 'WAWebCollections') {
                return { Msg: { get: () => replyModel } };
            }
            if (name === 'WAWebQuotedMsgModelUtils') {
                return {
                    getQuotedMsgObj: (msg) => {
                        if (!msg.id._serialized) throw new Error('Missing ID');
                        return quoted;
                    },
                };
            }
        };

        expect(replyModel.id._serialized).to.equal(undefined);
        LoadUtils();
        LoadUtils();
        global.window.WWebJS.getMessageModel = (model) => model;
        expect(replyModel.id._serialized).to.equal(replyId);
        expect((await reply.getQuotedMessage()).id._serialized).to.equal(
            originalId,
        );

        replyModel.id._serialized = 'replacement';
        expect(replyModel.id._serialized).to.equal('replacement');
    });
});
