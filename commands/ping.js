const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    StreamType, 
    entersState, 
    VoiceConnectionStatus 
} = require('@discordjs/voice');
const WebSocket = require('ws');
const { Readable } = require('stream');

let fetch;

(async () => {
    fetch = (await import('node-fetch')).default;
})();


module.exports = {
    name: 'ping',
    description: 'Ping command that plays a TTS message',
    async execute(message, args, client) {
        if (!message.member.voice.channel) {
            console.log("User is not in a voice channel");
            return message.channel.send('You need to be in a voice channel to use this command!');
        }
        console.log("User is in a voice channel");

        const voiceId = process.env.ELEVENLABS_VOICE_ID; // Ensure this is correctly set in your environment
        const xiApiKey = process.env.ELEVENLABS_API_KEY; // Ensure this is correctly set in your environment
        console.log("Environment variables fetched: ", { voiceId, xiApiKey });

        const textToSpeak = "Hello world";
        console.log("Text to speak: ", textToSpeak);
        const url = `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream`;
        console.log("Request URL: ", url);

        const requestOptions = {
            method: 'POST',
            headers: {
                'xi-api-key': xiApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model_id: "eleven_multilingual_v2", // Replace with your model id
                text: textToSpeak,
                voice_settings: {
                    similarity_boost: 1,
                    stability: 1,
                    style: 1,
                    use_speaker_boost: true
                }
            })
        };
        console.log("Request options prepared: ", requestOptions);

            fetch(url, requestOptions)
            .then(response => {
                console.log("Received response from ElevenLabs API");
                return response.arrayBuffer();
            })
            .then(buffer => {
                console.log("Received audio buffer from API");
                const readableStream = new Readable();
                readableStream._read = () => {};
                readableStream.push(Buffer.from(buffer));
                readableStream.push(null);

                const resource = createAudioResource(readableStream, { inputType: StreamType.Arbitrary });
                const connection = joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });

                const player = createAudioPlayer();
                player.on('stateChange', (oldState, newState) => {
                    console.log(`Audio player state changed from ${oldState.status} to ${newState.status}`);
                });

                player.on('error', error => {
                    console.error(`Error from audio player: ${error.message}`);
                });

                connection.subscribe(player);
                player.play(resource);
                console.log("Audio player started playing resource");

                // Ensure the voice connection is ready before attempting to play audio
                return entersState(connection, VoiceConnectionStatus.Ready, 30e3);
            })
            .catch(err => {
                console.error('Error:', err);
                message.channel.send('Error occurred while processing TTS.');
            });
    }
};