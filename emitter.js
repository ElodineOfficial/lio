const EventEmitter = require('events');
class BotEmitter extends EventEmitter {}
const botEmitter = new BotEmitter();

module.exports = botEmitter;
