const fs = require('fs').promises;

const genres = [
    'Pop', 'Rock', 'Hip Hop', 'Jazz', 'Blues', 'Classical', 'Country', 'Electronic', 'Dance', 'House', 
    'Techno', 'Dubstep', 'Drum and Bass', 'Ambient', 'Trance', 'Reggae', 'Ska', 'World Music', 'Folk', 
    'Soul', 'R&B', 'Funk', 'Disco', 'Grunge', 'Punk', 'Metal', 'Heavy Metal', 
    'Progressive Rock', 'Psychedelic Rock', 'Alternative Rock', 'Indie Rock', 'Soft Rock', 'Hard Rock', 'Latin', 'Salsa', 
    'Bachata', 'Merengue', 'Cumbia', 'Tango', 'Flamenco', 'Highlife', 'K-pop', 'J-pop', 'Bollywood', 
    'Classical Indian', 'Arabesque', 'Turkish Pop', 'Russian Pop', 'Chanson', 'Fado', 'Bossa Nova', 'Samba', 'New Age', 'Soundtrack', 
    'Experimental', 'Lo-fi', 'Vaporwave', 'Synthwave', 'Electro Swing', 'Chiptune', 'Glitch Hop', 'IDM (Intelligent Dance Music)', 'Breakbeat', 'Hardcore', 
    'Gabber', 'Drumstep', 'Trip Hop', 'Downtempo', 'Bluegrass', 'Americana', 'Celtic', 'Zydeco', 'Polka', 'Bolero', 
    'Ranchera', 'Norteno', 'Banda', 'Tejano', 'New Wave', 'Post-Punk', 'Britpop', 'Grime', 'UK Garage', 'Dancehall', 'Afropop'
];

const eras = [
    'Baroque Era (1600–1750)', 'Classical Era (1750–1820)', 'Romantic Era (1820–1910)', 'Jazz Age (1920s)', 'Swing Era (1930s–1940s)', 
    'Post-War Era (1945–1950s)', 'Rock n Roll Era (1950s)', 'British Invasion (1960s)', 'Psychedelic Era (Late 1960s)', 'Hippie Movement (1960s–1970s)', 
    'Disco Era (1970s)', 'Punk Rock Era (Late 1970s)', 'New Wave (Late 1970s–1980s)', 'Golden Age of Hip Hop (1980s)', 'Hair Metal Era (1980s)', 
    'Grunge Era (Early 1990s)', 'Britpop Era (1990s)', 'Golden Age of Alternative Rock (1990s)', 'Boy Band/Girl Group Era (Late 1990s–Early 2000s)', 'Y2K Era (Late 1990s–Early 2000s)', 
    'Rise of Electronic Dance Music (2000s)', 'Indie Rock Revival (2000s)', 'Social Media Era (2010s)', 'Streaming Era (2010s–Present)', 'K-pop Globalization (2010s–Present)', 
    'Trap and Mumble Rap Era (2010s–Present)', 'Vaporwave Aesthetic (2010s)', 'Bedroom Pop (Late 2010s–Present)', 'Reggaeton and Latin Pop Surge (2010s–Present)', 'Post-Internet Era (2010s–Present)', 
    'Lo-fi Hip Hop and Chillhop (2010s–Present)', 'Retro Revival (2010s–Present)', 'TikTok Music Trends (Late 2010s–Present)', 'COVID-19 Pandemic Era (2020s, marked by virtual concerts and new music trends)', 
    'AI and Tech-Driven Music (Emerging)'
];

const regions = [
    'United States', 'United Kingdom', 'Brazil', 'Jamaica', 'Germany', 'France', 'India', 'South Korea', 'Japan', 'Sweden', 
    'Italy', 'Spain', 'Russia', 'Canada', 'Mexico', 'South Africa', 'Australia', 'Colombia', 'Cuba', 'Ireland', 'China', 'Turkey', 'Egypt', 'Netherlands', 'Belgium', 'Norway', 
    'Finland', 'Denmark', 'Poland', 'Greece', 'Ukraine', 'Iran', 'Morocco', 'Lebanon', 'Ethiopia', 'Kenya', 'New Zealand', 'Puerto Rico', 'Venezuela', 'Chile', 'Peru'
];


function randomElement(array) {
    console.log('Selecting a random element from the array:', array);
    return array[Math.floor(Math.random() * array.length)];
}

async function generatePlaylistPrompt() {
    console.log('Generating playlist prompt...');

    const genre = randomElement(genres);
    console.log('Selected genre:', genre);

    const era = randomElement(eras);
    console.log('Selected era:', era);

    const region = randomElement(regions);
    console.log('Selected region:', region);

    try {
        console.log('Reading from setgenerator.txt...');
        const fileContent = await fs.readFile('setgenerator.txt', 'utf8');
        console.log('File content:', fileContent);

        const prompt = `Create a playlist with ${genre} music from the ${era}, popular in ${region}. ${fileContent}`;
        console.log('Generated prompt:', prompt);

        return prompt;
    } catch (error) {
        console.error('Error reading from setgenerator.txt:', error);
        throw error; // Rethrow the error to handle it in the calling function
    }
}

module.exports = { generatePlaylistPrompt };
