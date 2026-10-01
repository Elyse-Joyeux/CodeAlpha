// Creates the first organizer/admin account and sample events.
// usage: npm run seed

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { mongoUri } = require('../config')
const User = require('../models/User')
const Event = require('../models/Event')

const DAY = 24 * 60 * 60 * 1000;

async function main(){
    await mongoose.connect(mongoUri);

    const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
    let admin = await User.findOne({ email });
    if(!admin) {
        admin = await User.create({
            name: process.env.ADMIN_NAME || 'Organizer',
            email,
            passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin125', 10),
            role: 'admin',
        })
        console.log(`Created organizer account : ${email}`)
    } else {
        console.log(`Organizer account already exists: ${email}`);
    }

    const at = (days, hour) => {
        const d = new Date(Date.now() + days * DAY);
        d.setHours(hour, 0, 0, 0);
        return d;
    };

    const samples = [
        {
            title: 'Intro to Embedded Systems Workshop',
            description: 'Hands-on session: wire up a microcontroller and blink your first LED.',
            location: 'Lab 2', date: at(7, 14), capacity: 30,
        },
        {
            title: 'Weekend Hackathon Kickoff',
            description: 'Form teams, pick a challenge and start building.',
            location: 'Innovation Room', date: at(21, 9), capacity: 40,
        },
        {
            title: 'Web Security Talk',
            description: 'Learn common web vulnerabilities and how to defend against them.',
            location: 'Main Hall', date: at(14, 10), capacity: 120,
        },
        {
            title: 'Python for Beginners',
            description: 'A friendly, hands-on introduction to programming with Python.',
            location: 'Computer Lab', date: at(10, 11), capacity: 35,
        },
        {
            title: 'Product Design Meetup',
            description: 'Share ideas and learn practical user experience design methods.',
            location: 'Design Studio', date: at(18, 17), capacity: 50,
        },
        {
            title: 'Career Networking Evening',
            description: 'Meet local technology professionals and explore career paths.',
            location: 'Community Centre', date: at(25, 18), capacity: 80,
        },
        {
            title: 'First Aid Essentials',
            description: 'Practice useful first aid skills with a certified instructor.',
            location: 'Training Room A', date: at(30, 10), capacity: 24,
        },
    ].map((event) => ({ ...event, createdBy: admin._id }));

    const existingTitles = new Set(await Event.distinct('title'));
    const missingEvents = samples.filter((event) => !existingTitles.has(event.title));
    if (missingEvents.length) {
        await Event.insertMany(missingEvents);
        console.log(`Created ${missingEvents.length} sample event(s).`);
    } else {
        console.log('Sample events already exist.');
    }

    await mongoose.disconnect();
}



main().catch((err) => {
    console.error(err)
    process.exit(1);
})
