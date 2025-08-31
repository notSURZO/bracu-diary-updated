import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Club from '../lib/models/Club';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Sample club data
const sampleClubs = [
  {
    name: "BRAC University Computer Club (BUCC)",
    adminEmail: "nahid6100@gmail.com",
    secretKey: "bucc2024secret"
  },
  {
    name: "BRAC University Business Club (BUBC)",
    adminEmail: "nahid.hassan1@g.bracu.ac.bd", 
    secretKey: "bubc2024secret"
  },
  {
    name: "BRAC University Cultural Club (BUCC)",
    adminEmail: "nahidhassan6100@gmail.com",
    secretKey: "cultural2024secret"
  },
  {
    name: "BRAC University Sports Club (BUSC)",
    adminEmail: "dwnraiyan2024@gmail.com",
    secretKey: "sports2024secret"
  },
  {
    name: "BRAC University Photography Club (BUPC)",
    adminEmail: "md.raiyan.uddin@g.bracu.ac.bd",
    secretKey: "photo2024secret"
  },
  {
    name: "BRAC University Debate Club (BUDC)",
    adminEmail: "ryanhd5450@gmail.com",
    secretKey: "debate2024secret"
  },
  {
    name: "BRAC University Science Club (BUSC)",
    adminEmail: "djmolla.69@gmail.com",
    secretKey: "science2024secret"
  },
  {
    name: "BRAC University Literature Club (BULC)",
    adminEmail: "latif.mozammel123@gmail.com",
    secretKey: "literature2024secret"
  }
];

async function seedClubs() {
  try {
    console.log('Starting club seeding...');
    
    // Check if MONGODB_URI is available
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing clubs
    await Club.deleteMany({});
    console.log('Cleared existing clubs');
    
    // Insert sample clubs
    const insertedClubs = await Club.insertMany(sampleClubs);
    console.log(`Successfully seeded ${insertedClubs.length} clubs`);
    
    // Display the seeded clubs
    console.log('\nSeeded Clubs:');
    insertedClubs.forEach(club => {
      console.log(`- ${club.name}`);
      console.log(`  Admin Email: ${club.adminEmail}`);
      console.log(`  Secret Key: ${club.secretKey}`);
      console.log('');
    });
    
    console.log('Club seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding clubs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seeding
seedClubs();
