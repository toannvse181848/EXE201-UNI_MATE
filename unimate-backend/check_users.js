require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/unimate');
  const users = await User.find({ 'studentProfile.university': /Bách Khoa/i });
  console.log('Bách Khoa users:', JSON.stringify(users.map(u => ({ id: u._id, name: u.fullName, email: u.email, avatar: u.avatar, uni: u.studentProfile?.university })), null, 2));
  
  const all = await User.find({ role: { $in: ['student', 'user'] } });
  console.log('All students:', JSON.stringify(all.map(u => ({ id: u._id, name: u.fullName, email: u.email, avatar: u.avatar, uni: u.studentProfile?.university })), null, 2));
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
