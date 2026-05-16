import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import logger from './logger';

export const processVideoToHLS = (inputPath: string, outputDir: string, filename: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const hlsOutputDir = path.join(outputDir, 'hls', filename);
        if (!fs.existsSync(hlsOutputDir)) {
            fs.mkdirSync(hlsOutputDir, { recursive: true });
        }

        const masterPlaylistPath = path.join(hlsOutputDir, 'master.m3u8');

        // We use fluent-ffmpeg to map multiple bitrates/resolutions to have true adaptive quality.
        ffmpeg(inputPath)
            .outputOptions([
                '-preset veryfast',
                '-g 48', '-sc_threshold 0',
                
                // Map the video/audio streams 3 times for 3 different qualities
                '-map 0:v:0', '-map 0:a:0?',
                '-map 0:v:0', '-map 0:a:0?',
                '-map 0:v:0', '-map 0:a:0?',

                // 720p
                '-s:v:0 1280x720', '-c:v:0 libx264', '-b:v:0 1500k',
                // 480p
                '-s:v:1 854x480', '-c:v:1 libx264', '-b:v:1 800k',
                // 360p
                '-s:v:2 640x360', '-c:v:2 libx264', '-b:v:2 400k',

                // Audio configuration
                '-c:a aac', '-b:a 128k', '-ac 2',

                // HLS settings
                '-f hls',
                '-hls_time 4',
                '-hls_playlist_type vod',
                '-hls_flags independent_segments',
                '-hls_segment_type mpegts',
                '-master_pl_name master.m3u8',
                '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2'
            ])
            .output(path.join(hlsOutputDir, 'stream_%v.m3u8'))
            .on('end', () => {
                logger.info(`Successfully processed video to HLS: ${masterPlaylistPath}`);
                resolve(`hls/${filename}/master.m3u8`);
            })
            .on('error', (err) => {
                logger.error(`Error processing video: ${err.message}`);
                reject(err);
            })
            .run();
    });
};