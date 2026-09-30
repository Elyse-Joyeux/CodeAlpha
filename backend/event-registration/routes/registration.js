const express = require('express')
const Event = require('../models/Event')
const Registration = require('../models/Registration')
const { authenticate } = require ('../middleware/auth')
const { isObjectId } = require('../utils')


const router = express.Router()

router.param('id', (req, res, next, id) => {
    if(!isObjectId(id)) {
        return res.status(404).json({ error: 'Registration not found.'})
    } 
    next()
})


// get /api/registration/mine - the logged in user's registrations
router.get('/mine', authenticate, async (req, res) => {
    const registrations = await Registration.find({ user: req.user._id})
        .populate('event', 'title date location')
        .sort({ createdAt: -1});

    res.json({ registrations: registrations.filter((r) => r.event) })
})


// get /api/registrations/:id one registration (owner or organizer)
router.get('/:id', authenticate, async (req, res) => {
    const registration = await Registration.findById(req.params.id).populate(
        'event', 'title date location'
    );

    if(!registration) {
        return res.status(404).json({ error: 'Registration not found.'})
    }
    if(!registration.user.equals(req.user._id) && req.user.role !== 'admin'){
        return res.status(403).json({error: 'This is not your registration.'})
    }

    res.json({ registration })
})


// delete /api/registrations/:id cancel (keeps the record, frees the spot)

router.delete('/:id', authenticate, async (req, res) => {
    const registration = await Registration.findById(req.params.id).populate(
        'event', 'title date'
    );

    if(!registration) {
        return res.status(404).json({ error: 'Registration not found.'})
    }
    if(!registration.user.equals(req.user._id) && req.user.role !== 'admin'){
        return res.status(403).json({ error: 'This is not your registration.'})
    }

    if(registration.status === 'cancelled') {
        return res.status(409).json({ error: 'This registration is already cancelled.'})
    }

    if(registration.event && registration.event.date <= new Date()){
        return res.status(400).json({ error: 'This event has already started, so it cannot be cancelled.'})
    }

    // only teh request that flips the status frees the spot
    const cancelled = await Registration.findOneAndUpdate(
        { _id: registration._id, status: 'registered' },
        { status: 'cancelled', cancelledAt: new Date() },
        { returnDocument: 'after' }
    );

    if(!cancelled) {
        return res.status(409).json({ error: 'This registration is already cancelled.'})
    }

    if(registration.event){
        await Event.updateOne(
            { _id: registration.event._id}, 
            { $inc: { registeredCount: -1}}
        );
    }

    res.json({ registration: cancelled})
})



module.exports = router;