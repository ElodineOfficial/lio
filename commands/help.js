// help.js
module.exports = {
    name: 'help',
    description: 'List all commands and their descriptions',
    execute(message, args, client) {
        let helpMessage = '';
        client.commands.forEach(command => {
            helpMessage += `**${command.name}**: ${command.description}\n`;
        });

        // Check if helpMessage is empty
        if (!helpMessage) {
            return message.channel.send('No commands available.');
        }

        return message.channel.send(helpMessage);
    },
};
