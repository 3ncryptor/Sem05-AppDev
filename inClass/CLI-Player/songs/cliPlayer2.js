const { exec } = require('child_process');

let songs = [];

//1. List Songs
function ListSongs() {
    exec('ls ' + __dirname, (err, stdout) => {
        songs = stdout.split('\n').filter(Boolean);
        
        for (let i = 0; i < songs.length; i++) {
            console.log((i + 1) + '. ' + songs[i]);
        }
        
        console.log('\nEnter song number to play:');
    });
}

//2. Select and Play Song
function PlaySong(index) {
    const num = parseInt(index);
    const selectedSong = songs[num - 1];
    
    console.log('Playing: ' + selectedSong);
    
    exec('afplay "' + __dirname + '/' + selectedSong + '"');
}

//3. UserInput
process.stdin.on('data', (data) => {
    PlaySong(data.toString().trim());
});

ListSongs();