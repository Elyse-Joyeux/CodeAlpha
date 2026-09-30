// creates teh first organizer/admin account and a few sample events
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

    if((await Event.countDocuments()) === 0){
        const at = (days, hour) => {
            const d = new Date(Date.now() + days * DAY);
            d.setHours(hour, 0, 0, 0, 0);
            return d;
        };

        await Event.insertMany([
            {
                title: 'Intro to Embedded Systems Workshop',
                description: 'Hands-on session: wire up a microcontroller and blink your first LED',
                location: 'Lab 2',
                date: at(7, 14),
                capacity: 30,
                createdBy: admin._id,
            },
            {
                title: 'Weeked hackathon kickoff',
                description: 'Form teams, pick a challenge and start building.',
                location: 'Innovation room',
                date: at(21, 9),
                capacity: 3,
                createdBy: admin._id,
            }, 
            {
                title: 'Web security talk',
                description: 'Common web vurnerabilities and how to defend against them.',
                location: 'Main hall',
                date: at(14,10),
                capacity: 120,
                createdBy: admin._id,
            }
        ]);

        console.log('Created 3 sample events')
    }

    await mongoose.disconnect();
}



main().catch((err) => {
    console.error(err)
    process.exit(1);
})