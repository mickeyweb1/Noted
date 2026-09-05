import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    inviteCode: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Organization = mongoose.model('Organization', organizationSchema);