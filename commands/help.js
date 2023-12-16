// help.js
module.exports = {
    name: 'help',
    description: 'List all commands and their descriptions',
    execute(message, args, client) {
        const helpMessage = `**Help Menu**
**!play**: Play or add a song from YouTube by entering a song name or URL.
**!pause**: Toggle pause/resume for the currently playing song.
**!stop**: Stop the music, clear the queue, and disconnect from the voice channel.
**!next**: Skip to the next song in the queue.
**!back**: Play the previous song in the queue.
**!playnow**: Interupts whatever song is on to play a new song.
**!current**: Display the currently playing song.
**!upcoming**: List the upcoming songs in the queue.
**!shuffle**: Shuffle the current queue.
**!remove**: Remove a specific song from the queue.
**!help**: List all commands and their descriptions.
        `;

        message.channel.send(helpMessage);
    },
};
