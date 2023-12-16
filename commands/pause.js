// pause.js
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
    name: 'pause',
    description: 'Toggle pause/resume for the currently playing song',
    execute(message, args, client) {
        const serverQueue = client.queue.get(message.guild.id);

        if (!serverQueue || !serverQueue.player) {
            return message.channel.send('No song is currently playing!');
        }

        const currentStatus = serverQueue.player.state.status;

        if (currentStatus === AudioPlayerStatus.Paused) {
            serverQueue.player.unpause();
            message.channel.send('Resumed the music!');
        } else if (currentStatus === AudioPlayerStatus.Playing) {
            serverQueue.player.pause();
            message.channel.send('Paused the music!');
        } else {
            message.channel.send('The player is not in a state that can be paused or resumed.');
        }
    },
};
