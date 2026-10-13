require('dotenv').config();
const mongoose = require('mongoose');

const DEFAULT_AVATAR = 'https://res.cloudinary.com/xzjfoa0p/image/upload/v1791901630/unimate/defaults/default_avatar.png';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const filter = {
    $or: [
      { avatar: null },
      { avatar: '' },
      { avatar: { $exists: false } },
      { avatar: { $regex: 'photo-1534528741775-53994a69daeb' } }
    ]
  };

  const result = await mongoose.connection.collection('users').updateMany(filter, {
    $set: { avatar: DEFAULT_AVATAR }
  });

  console.log('UPDATED COUNT:', result.modifiedCount);

  const users = await mongoose.connection.collection('users').find({}, { projection: { email: 1, avatar: 1, fullName: 1 } }).toArray();
  users.forEach(u => console.log(u.email, '|', u.fullName, '|', u.avatar));
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
