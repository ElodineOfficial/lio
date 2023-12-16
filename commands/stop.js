const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'stop',
    description: 'Stop the music, clear the queue, disconnect from the voice channel, and clear the cache',
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

        // Delete the guild from the queue
        client.queue.delete(message.guild.id);

        // Clear the download cache
        clearDownloadCache();

        message.channel.send('Stopped the music, cleared the queue, disconnected, and cleared the cache.');
    }
};

function clearDownloadCache() {
    const cacheDir = './cache'; // Adjust if your cache directory is different

    fs.readdir(cacheDir, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(cacheDir, file), err => {
                if (err) throw err;
            });
        }
    });
}
