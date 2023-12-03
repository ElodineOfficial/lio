module.exports = {
    name: 'stop',
    description: 'Stop the music, clear the queue, and disconnect from the voice channel',
    execute(message, args, client) {
        const serverQueue = client.queue.get(message.guild.id);

        if (!serverQueue) {
            return message.channel.send('There is nothing playing.');
        }

        // Clear the queue
        serverQueue.songs = [];

        // Stop the music
        if (serverQueue.player) {
            serverQueue.player.stop();
        }

        // Disconnect from the voice channel
        if (serverQueue.connection) {
            serverQueue.connection.destroy();
            serverQueue.connection = null;
        }

        client.queue.delete(message.guild.id);

        message.channel.send('Stopped the music, cleared the queue, and disconnected.');
    }
};
