const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const express = require('express');
const fs = require('fs');
const inputVideoPath = 'input.mp4';
const outputDir = 'output/';

const app = express();
const port = process.env.PORT || 3000;
// Define the resolutions you want
const resolutions = [
    { name: '720p' },
    { name: '360p' },
    { name: '144p' }
];

// Transcode function
function transcode(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(inputPath)
            .output(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', error => reject(error))
            .run();
    });
}

async function main() {
    try {
        const transcodingPromises = resolutions.map(async resolution => {
            const outputFilename = `output_${resolution.name}.mp4`;
            const outputPath = path.join(outputDir, outputFilename);
            console.log(`Transcoding to ${resolution.name}...`);
            await transcode(inputVideoPath, outputPath);
            console.log(`
            https://localhost:3000/video/${outputFilename}
            `)
            console.log(`Transcoding to ${resolution.name} finished: ${outputPath}`);
        });

        await Promise.all(transcodingPromises);
        console.log('All transcoding tasks completed.');
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

// main();

app.get('/video/:id', (req, res) => {
    const videoPath = path.join(outputDir, req.params.id);
    const videoStat = fs.statSync(videoPath);
    const fileSize = videoStat.size;
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const chunkSize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });

        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/mp4',
        };

        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };

        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});