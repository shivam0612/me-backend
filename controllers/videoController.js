import asyncHandler from 'express-async-handler';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
ffmpeg.setFfmpegPath('C:/Users/Administrator/Music/ffmpeg/bin/ffmpeg.exe');
ffmpeg.setFfprobePath('C:/Users/Administrator/Music/ffmpeg/bin/ffprobe.exe');
import Video from '../models/Video.js'
import Subscription from '../models/subscriptionModel.js';

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        if (ext !== '.mp4') {
            return cb(res.status(400).end('Only MP4 is supported'), false);
        }
        cb(null, true);
    },
});


var upload = multer({ storage: storage }).single('file');


  
const uploadFiles = asyncHandler(async (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.json({ success: false, err });
        }
        return res.json({
            success: true,
            filePath: res.req.file.path,
            fileName: res.req.file.filename,
        });
    });
})

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