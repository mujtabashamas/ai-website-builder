// MongoDB-based job store for AI code generation tasks
// Requires MONGODB_URI in environment variables
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI not set');

let client;
let jobsCollection;

async function getClient() {
  if (!client) {
    client = new MongoClient(uri, { useUnifiedTopology: true });
    await client.connect();
    jobsCollection = client.db().collection('ai_jobs');
  }
  return jobsCollection;
}

export async function createJob(id, prompt) {
  const jobs = await getClient();
  await jobs.insertOne({
    _id: id,
    status: 'pending',
    prompt,
    result: null,
    error: null,
    created: new Date(),
  });
}

export async function setJobResult(id, result) {
  const jobs = await getClient();
  await jobs.updateOne({ _id: id }, {
    $set: {
      status: 'done',
      result,
      completed: new Date(),
    }
  });
}

export async function setJobError(id, error) {
  const jobs = await getClient();
  await jobs.updateOne({ _id: id }, {
    $set: {
      status: 'error',
      error,
      completed: new Date(),
    }
  });
}

export async function getJob(id) {
  const jobs = await getClient();
  return jobs.findOne({ _id: id });
}

export async function jobExists(id) {
  const jobs = await getClient();
  return !!(await jobs.findOne({ _id: id }));
}