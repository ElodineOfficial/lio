// help.js
module.exports = {
    name: 'help',
    description: 'List all commands or info about a specific command',
    execute(message, args, client) {
        const data = [];
        const { commands } = client;

        if (!args.length) {
            data.push('Here\'s a list of all my commands:');
            data.push(commands.map(command => command.name).join(', '));
            data.push(`\nYou can send \`!help [command name]\` to get info on a specific command!`);

            return message.channel.send(data, { split: true });
        }

        const name = args[0].toLowerCase();
        const command = commands.get(name);

        if (!command) {
            return message.reply('that\'s not a valid command!');
        }

        data.push(`**Name:** ${command.name}`);

        if (command.description) data.push(`**Description:** ${command.description}`);

        message.channel.send(data, { split: true });
    },
};
