const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxLength: [120, 'Title must be 120 characters or fewer.']
        }, 
        
        description: {
            type: String,
            trim: true,
            maxLength: [2000, 'Description must be 2000 characters or fewer.'],
            default: '',
        }, 

        location: {
            type: String,
            required: [true, 'Location is required.'], 
            trim: true,
            maxLength: [200, 'Location must be 200 characters or fewer.'],
        },

        date: { type: Date, required: [true, 'Date is required.']},
        capacity: {
            type: Number, 
            required: [true, 'Capacity is required'],
            min: [1, 'Capacity must be at least 1.'],
            validate: {
                validator: Number.isInteger,
                message: 'Capacity must be a whole number.',
            },
        },

        // number of active registrations. changed only with atomic $inc updates
        // so two people can never take the last spot at the same time
        registeredCount: {type: Number, default: 0, min: 0},
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            versionKey: false,
            transform(doc, ret){
                delete ret._id;
            },
        },
    }
)


eventSchema.index({ date: 1 })

eventSchema.virtual('spotsLeft').get(function (){
    if(this.capacity == null || this.registeredCount == null) return undefined;
    return Math.max(this.capacity - this.registeredCount, 0);
})



module.exports = mongoose.model('Event', eventSchema);