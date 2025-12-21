const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

// Use memory storage for multer
const storage = multer.memoryStorage();
const uploadLogo = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.'), false);
        }
    },
});

// Upload buffer to ImgBB
const uploadToImgBB = async (buffer) => {
    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
        throw new Error('IMGBB_API_KEY is not configured');
    }

    // Convert buffer to base64
    const base64Image = buffer.toString('base64');

    // Create form data
    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('image', base64Image);

    try {
        console.log('Uploading to ImgBB...');

        const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
            headers: formData.getHeaders(),
            timeout: 30000, // 30 second timeout
        });

        if (response.data.success) {
            console.log('ImgBB upload successful:', response.data.data.url);
            return {
                secure_url: response.data.data.url,
                display_url: response.data.data.display_url,
                thumb_url: response.data.data.thumb?.url,
                delete_url: response.data.data.delete_url,
            };
        } else {
            throw new Error('ImgBB upload failed');
        }
    } catch (error) {
        console.error('ImgBB upload error:', error.response?.data || error.message);
        throw error;
    }
};

// Alias for compatibility with existing code
const uploadToCloudinary = uploadToImgBB;

module.exports = { uploadLogo, uploadToImgBB, uploadToCloudinary };
