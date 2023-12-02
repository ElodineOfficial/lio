module.exports = {
    name: 'messageCreate',
    execute(message) {
        if (!message.author.bot) {
            console.log(`Message from ${message.author.tag}: ${message.content}`);
            // Here you can add more logic to handle messages
        }
    },
};
