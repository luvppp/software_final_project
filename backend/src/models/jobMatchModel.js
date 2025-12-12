import mongoose from 'mongoose';

const jobMatchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    matchScore: { type: Number, default: 0 },
    missingSkills: { type: [String], default: [] },
    aiAdvice: { type: String, default: '' },
    aiAdviceFp: { type: String, default: '' },
    aiAdviceUpdatedAt: { type: Date },
    aiReason: { type: String, default: '' },
    aiReasonFp: { type: String, default: '' },
    aiReasonUpdatedAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'jobMatches' }
);

jobMatchSchema.index({ userId: 1, jobId: 1 }, { unique: true });

const JobMatch = mongoose.models.JobMatch || mongoose.model('JobMatch', jobMatchSchema);

export default JobMatch;

