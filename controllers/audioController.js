import asyncHandler from 'express-async-handler';
import multer from 'multer';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
      cb(null, `${Date.now()}_${file.originalname}`);
  },
  fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      if (ext !== '.mp3') {
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


const uploadAudioFiles = asyncHandler(async (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const filePath = req.file.path;
    let fileDuration;
    try {
      fileDuration = await getAudioDurationInSeconds(filePath);
    } catch (err) {
      console.error("Error getting audio duration:", err);
      fileDuration = 0;
    }

    const video = new Video(req.body);
    video.duration = fileDuration;

    try {
      await video.save();
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ success: false, error });
    }
  });
});

export { uploadAudioFiles };
