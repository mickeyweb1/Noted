import { Content } from '../models/Content.js';

// @desc    Get all generated content for the logged-in user
// @route   GET /api/content/library
export const getUserLibrary = async (req, res, next) => {
    try {
        // req.user is attached by the 'protect' middleware
        const userId = req.user._id;

        // Fetch content, sorted by newest first
        const contents = await Content.find({ userId })
            .sort({ createdAt: -1 })
            .select('-rawText'); // We exclude rawText here to keep the list view lightweight

        res.status(200).json({
            success: true,
            count: contents.length,
            data: contents
        });
    } catch (error) {
        console.error('❌ Error fetching library:', error.message);
        next(error);
    }
};

// @desc    Get a single content item (to view the full raw text)
// @route   GET /api/content/:id
export const getSingleContent = async (req, res, next) => {
    try {
        const content = await Content.findById(req.params.id);

        if (!content) {
            const error = new Error('Content not found');
            error.status = 404;
            throw error;
        }

        // Ensure the user can only view their own content
        if (content.userId.toString() !== req.user._id.toString()) {
            const error = new Error('Not authorized to view this content');
            error.status = 403;
            throw error;
        }

        res.status(200).json({
            success: true,
            data: content
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a content item
// @route   DELETE /api/content/:id
export const deleteContent = async (req, res, next) => {
    try {
        const content = await Content.findById(req.params.id);

        if (!content) {
            const error = new Error('Content not found');
            error.status = 404;
            throw error;
        }

        // Ensure the user can only delete their own content
        if (content.userId.toString() !== req.user._id.toString()) {
            const error = new Error('Not authorized to delete this content');
            error.status = 403;
            throw error;
        }

        await content.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Content removed from library successfully'
        });
    } catch (error) {
        next(error);
    }
};