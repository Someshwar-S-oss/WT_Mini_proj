import mongoose from 'mongoose';
const fs = require('fs').promises;
const path = require('path');

const MONGO_URI = 'mongodb://localhost:27017/noteverse';
const REPOS_BASE_PATH = path.join(__dirname, '..', 'repos');

async function fixNotebookPaths() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all notebooks
    const notebooks = await mongoose.connection.collection('notebooks').find({}).toArray();
    console.log(`\nFound ${notebooks.length} notebooks\n`);

    for (const notebook of notebooks) {
      const notebookId = notebook._id.toString();
      const currentGitRepoPath = notebook.gitRepoPath;
      
      console.log(`Notebook: ${notebook.name}`);
      console.log(`  ID: ${notebookId}`);
      console.log(`  Current gitRepoPath: ${currentGitRepoPath}`);
      
      // Check if gitRepoPath matches the notebook ID
      if (currentGitRepoPath === notebookId) {
        console.log(`  ✅ Already correct, skipping\n`);
        continue;
      }
      
      // Paths
      const oldRepoPath = path.join(REPOS_BASE_PATH, currentGitRepoPath);
      const newRepoPath = path.join(REPOS_BASE_PATH, notebookId);
      
      // Check if old repo exists
      try {
        await fs.access(oldRepoPath);
        console.log(`  📁 Old repo found at: ${oldRepoPath}`);
        
        // Check if new repo already exists
        try {
          await fs.access(newRepoPath);
          console.log(`  ⚠️  New repo path already exists, will skip moving`);
        } catch {
          // New path doesn't exist, safe to move
          console.log(`  🔄 Moving repo from ${currentGitRepoPath} to ${notebookId}`);
          await fs.rename(oldRepoPath, newRepoPath);
          console.log(`  ✅ Repo moved successfully`);
        }
      } catch {
        console.log(`  ⚠️  Old repo not found, will create new path`);
      }
      
      // Update database
      console.log(`  💾 Updating database...`);
      await mongoose.connection.collection('notebooks').updateOne(
        { _id: notebook._id },
        { $set: { gitRepoPath: notebookId } }
      );
      console.log(`  ✅ Database updated\n`);
    }
    
    console.log('✅ All notebooks fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixNotebookPaths();
