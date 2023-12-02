// stop.js
module.exports = {
    name: 'stop',
    description: 'Stop the music and leave the channel',
    execute(message, args, client) {
        const serverQueue = client.queue.get(message.guild.id);

        if (!serverQueue || !serverQueue.connection) {
            return message.channel.send('I am not in a voice channel.');
        }

        serverQueue.songs = [];
        serverQueue.player.stop();
        serverQueue.connection.destroy();
        client.queue.delete(message.guild.id);
        message.channel.send('Stopped the music and left the channel.');
    },
};
