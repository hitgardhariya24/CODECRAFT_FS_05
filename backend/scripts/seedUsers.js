const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/User');

const users = [
  {
    fullName: 'Aarav Patel',
    username: 'aaravpatel',
    email: 'aaravpatel@gmail.com',
    password: 'aaravpatel@1234',
    bio: 'Product designer and coffee-fueled creator sharing UI ideas, travel shots, and startup builds.',
    coverImage: '/demo-images/aaravpatel-cover.jpg',
    avatar: '/demo-images/aaravpatel-profile.jpg',
  },
  {
    fullName: 'Kiara Sharma',
    username: 'kiarasharma',
    email: 'kiarasharma@gmail.com',
    password: 'kiarasharma@1234',
    bio: 'Fashion, beauty, and lifestyle creator based in Mumbai. Obsessed with clean visuals and good lighting.',
    coverImage: '/demo-images/kiarasharma-cover.jpg',
    avatar: '/demo-images/kiarasharma-profile.jpg',
  },
  {
    fullName: 'Rohan Mehta',
    username: 'rohanmehta',
    email: 'rohanmehta@gmail.com',
    password: 'rohanmehta@1234',
    bio: 'Full-stack developer building side projects, sharing code snippets, and documenting my learning journey.',
    coverImage: '/demo-images/rohanmehta-cover.jpg',
    avatar: '/demo-images/rohanmehta-profile.jpg',
  },
  {
    fullName: 'Maya Johnson',
    username: 'mayajohnson',
    email: 'mayajohnson@gmail.com',
    password: 'mayajohnson@1234',
    bio: 'Travel storyteller capturing city walks, sunsets, and minimalist aesthetics from around the world.',
    coverImage: '/demo-images/mayajohnson-cover.jpg',
    avatar: '/demo-images/mayajohnson-profile.jpg',
  },
  {
    fullName: 'Kabir Singh',
    username: 'kabirsingh',
    email: 'kabirsingh@gmail.com',
    password: 'kabirsingh@1234',
    bio: 'Fitness creator and amateur boxer focused on discipline, training routines, and clean meal prep.',
    coverImage: '/demo-images/kabirsingh-cover.jpg',
    avatar: '/demo-images/kabirsingh-profile.jpg',
  },
  {
    fullName: 'Sana Khan',
    username: 'sanakhan',
    email: 'sanakhan@gmail.com',
    password: 'sanakhan@1234',
    bio: 'Content strategist and skincare enthusiast sharing honest routines, work notes, and daily inspiration.',
    coverImage: '/demo-images/sanakhan-cover.jpg',
    avatar: '/demo-images/sanakhan-profile.jpg',
  },
  {
    fullName: 'Ethan Brooks',
    username: 'ethanbrooks',
    email: 'ethanbrooks@gmail.com',
    password: 'ethanbrooks@1234',
    bio: 'Photographer and drone enthusiast posting moody landscapes, portraits, and behind-the-scenes edits.',
    coverImage: '/demo-images/ethanbrooks-cover.jpg',
    avatar: '/demo-images/ethanbrooks-profile.jpg',
  },
  {
    fullName: 'Ananya Roy',
    username: 'ananyaroy',
    email: 'ananyaroy@gmail.com',
    password: 'ananyaroy@1234',
    bio: 'Student creator, book lover, and part-time traveler sharing campus life, notes, and cozy edits.',
    coverImage: '/demo-images/ananyaroy-cover.jpg',
    avatar: '/demo-images/ananyaroy-profile.jpg',
  },
  {
    fullName: 'Jason Miller',
    username: 'jasonmiller',
    email: 'jasonmiller@gmail.com',
    password: 'jasonmiller@1234',
    bio: 'Gaming creator streaming FPS clips, tech reviews, and setup tours from my desk to yours.',
    coverImage: '/demo-images/jasonmiller-cover.jpg',
    avatar: '/demo-images/jasonmiller-profile.jpg',
  },
  {
    fullName: 'Priya Nair',
    username: 'priyanair',
    email: 'priyanair@gmail.com',
    password: 'priyanair@1234',
    bio: 'Marketing professional, dancer, and weekend creator sharing reels, productivity tips, and city finds.',
    coverImage: '/demo-images/priyanair-cover.jpg',
    avatar: '/demo-images/priyanair-profile.jpg',
  },
  {
    fullName: 'Lucas Anderson',
    username: 'lucasanderson',
    email: 'lucasanderson@gmail.com',
    password: 'lucasanderson@1234',
    bio: 'Startup builder, minimalist traveler, and design nerd documenting ideas, products, and daily rituals.',
    coverImage: '/demo-images/lucasanderson-cover.jpg',
    avatar: '/demo-images/lucasanderson-profile.jpg',
  },
  {
    fullName: 'Meera Iyer',
    username: 'meeraiyer',
    email: 'meeraiyer@gmail.com',
    password: 'meeraiyer@1234',
    bio: 'Digital illustrator and wellness creator mixing art, mindful routines, and aesthetic everyday moments.',
    coverImage: '/demo-images/meeraiyer-cover.jpg',
    avatar: '/demo-images/meeraiyer-profile.jpg',
  },
  {
    fullName: 'Neil Carter',
    username: 'neilcarter',
    email: 'neilcarter@gmail.com',
    password: 'neilcarter@1234',
    bio: 'Tech reviewer and maker exploring AI tools, gadgets, and clean desk setups with a premium feel.',
    coverImage: '/demo-images/neilcarter-cover.jpg',
    avatar: '/demo-images/neilcarter-profile.jpg',
  },
  {
    fullName: 'Zara Ali',
    username: 'zaraali',
    email: 'zaraali@gmail.com',
    password: 'zaraali@1234',
    bio: 'Model, travel lover, and lifestyle creator sharing polished fashion looks and premium visual storytelling.',
    coverImage: '/demo-images/zaraali-cover.jpg',
    avatar: '/demo-images/zaraali-profile.jpg',
  },
];

const run = async () => {
  try {
    await connectDB();

    const docs = await Promise.all(
      users.map(async (user) => {
        const existing = await User.findOne({ $or: [{ username: user.username }, { email: user.email }] });
        if (existing) return null;

        return User.create({
          name: user.fullName,
          username: user.username,
          email: user.email,
          password: user.password,
          bio: user.bio,
          coverImage: user.coverImage,
          avatar: user.avatar,
        });
      })
    );

    const createdCount = docs.filter(Boolean).length;
    console.log(`Seed complete. Created ${createdCount} demo users.`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

run();