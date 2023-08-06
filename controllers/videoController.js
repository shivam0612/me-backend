import asyncHandler from 'express-async-handler';
import multer from 'multer';
import path from 'path';
import mongoose from 'mongoose';
import Grid from 'gridfs-stream';
import { Readable } from 'stream';

import ffmpeg from 'fluent-ffmpeg';
ffmpeg.setFfmpegPath('C:/Users/Administrator/Music/ffmpeg/bin/ffmpeg.exe');
ffmpeg.setFfprobePath('C:/Users/Administrator/Music/ffmpeg/bin/ffprobe.exe');

// Import your Mongoose Video model and other necessary models here
import Video from '../models/Video.js';
import Subscription from '../models/subscriptionModel.js';
let conn; // Declare the variable outside the try block

// Create a new GridFS bucket
try {
    conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected`);
} catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
}

Grid.mongo = mongoose.mongo;
const db = conn.connection; // Assign the connection object to the db variable
const gfs = Grid(db, mongoose.mongo); // Create the Grid instance with the db object

// Multer storage setup
const storage = multer.memoryStorage();
const upload = multer({ storage }).single('file');

// ...

// Update the uploadFiles function to save the video to GridFS and the database
const uploadFiles = asyncHandler(async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.json({ success: false, err });
        }

        // Create a readable stream from the buffer of the uploaded file
        const readableStream = Readable.from(req.file.buffer);

        // Create the write stream to save the file to GridFS
        const writeStream = gfs.createWriteStream({
            filename: `${Date.now()}_${req.file.originalname}`,
        });

        // Pipe the readable stream to the write stream to save the file in GridFS
        readableStream.pipe(writeStream);

        // When the file is fully stored in GridFS, save the video data in the database
        writeStream.on('close', async (file) => {
            const video = new Video({
                user: req.user, // Replace this with the user object or user ID associated with the video
                title: req.body.title,
                description: req.body.description,
                privacy: req.body.privacy,
                filePath: file.filename,
                category: req.body.category,
                duration: req.body.duration,
                thumbnail: req.body.thumbnail,
            });

            try {
                await video.save();
                return res.json({
                    success: true,
                    filePath: file.filename,
                    fileName: file.filename,
                });
            } catch (error) {
                return res.status(400).json({ success: false, error });
            }
        });
    });
});


const tumbnailsOfVideo = asyncHandler(async (req, res) => {
    let thumbsFilePath = '';

    ffmpeg.ffprobe(req.body.filePath, function (err, metadata) {
        if (err) {
            console.error(err);
            return res.status(400).json({ success: false, error: 'Failed to probe video' });
        }

        const fileDuration = metadata.format.duration;

        ffmpeg(req.body.filePath)
            .on('filenames', function (filenames) {
                // console.log('Will generate ' + filenames.join(', '));
                thumbsFilePath = 'uploads/thumbnails/' + filenames[0];
            })
            .on('end', function () {
                console.log('Screenshots taken');
                return res.json({
                    success: true,
                    thumbsFilePath: thumbsFilePath,
                    fileDuration: fileDuration,
                });
            })
            .screenshots({
                count: 1,
                folder: 'uploads/thumbnails',
                size: '320x240',
                filename: 'thumbnail-%b.png',
            });
    });
});


const UploadVideo = asyncHandler(async (req, res) => {
    // console.log(req.body);
    const video = new Video(req.body);
    // console.log(video)

    try {
        await video.save();
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(400).json({ success: false, error });
    }
});


const getVideos = asyncHandler(async (req, res) => {
    try {
        const videos = await Video.find();
        const { userId } = req.query;
        // Check if the userId exists in the Subscription collection
        const subscription = await Subscription.findOne({ userid: userId });

        if (subscription) {
            // User is subscribed
            const videos = await Video.find()
            return res.status(200).json({ success: true, videos });
        } else {
            // User is not subscribed
            return res.status(200).json({ success: true, videos: null });
        }


    } catch (err) {
        console.log(err)
        return res.status(400).send(err);
    }
});

const getVideosToAdmin = asyncHandler(async (req, res) => {
    try {
        const videos = await Video.find();
        // console.log(videos)
        return res.status(200).json({ success: true, videos });
    } catch (err) {
        console.log(err)
        return res.status(400).send(err);
    }
});

const deleteVideo = asyncHandler(async (req, res) => {
    const videoid = req.params.videoid;
    console.log(videoid)
    try {
        const deletedVideo = await Video.deleteOne({ _id: videoid });

        if (deletedVideo.deletedCount === 0) {
            return res.status(404).json({ message: 'Video not found' });
        }

        res.json({ message: 'Video deleted successfully' });
    } catch (err) {
        // console.error(err);
        res.status(500).json({ error: 'Error deleting user' });
    }
});

export {
    uploadFiles, tumbnailsOfVideo, UploadVideo, getVideos, getVideosToAdmin, deleteVideo
}
