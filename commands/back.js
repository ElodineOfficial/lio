const fs = require('fs');
const path = require('path');
const { createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

module.exports = {
    name: 'back',
    description: 'Play the oldest song from the cache',
    execute: async (message, args, client) => {
        const guildId = message.guild.id;
        const serverQueue = client.queue.get(guildId);
        const cacheDir = './cache'; // Replace with your cache directory path

        if (!serverQueue || !serverQueue.player) {
            console.log('Server queue or player is not initialized.');
            return message.channel.send('Cannot play the song at this moment.');
        }

        console.log('Reading the cache directory...');
        fs.readdir(cacheDir, (err, files) => {
            if (err) {
                console.error(`Error reading cache directory: ${err}`);
                return message.channel.send('Unable to read the cache directory.');
            }

            if (files.length < 2) {
                console.log('Not enough songs in the cache.');
                return message.channel.send('Not enough songs in the cache to perform the action.');
            }

            console.log(`Files in cache: ${files}`);
            
            // Get the oldest file from the cache
            let oldestFile = { name: '', mtime: new Date() };
            files.forEach(file => {
                const stats = fs.statSync(path.join(cacheDir, file));
                if (stats.mtime < oldestFile.mtime) {
                    oldestFile = { name: file, mtime: stats.mtime };
                }
            });

            const oldestSongPath = path.join(cacheDir, oldestFile.name);
            console.log(`Oldest song path: ${oldestSongPath}`);
            const stream = fs.createReadStream(oldestSongPath);
            const resource = createAudioResource(stream);

            console.log('Playing the oldest song from cache...');
            serverQueue.player.play(resource);

            serverQueue.player.once(AudioPlayerStatus.Idle, () => {
                console.log(`Finished playing: ${oldestSongPath}`);
            });

            serverQueue.player.on('error', error => {
                console.error(`Error in serverQueue.player: ${error}`);
            });

            message.channel.send(`Now playing the oldest song from the cache.`);
        });
    }
};
	
