import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  status: { type: String, enum: ['pending', 'done', 'error'], default: 'pending' },
  prompt: { type: mongoose.Schema.Types.Mixed },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  error: { type: mongoose.Schema.Types.Mixed, default: null },
  created: { type: Date, default: Date.now },
  completed: { type: Date }
});

export default mongoose.models.Job || mongoose.model('Job', JobSchema);
