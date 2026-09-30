module.exports = function errorHandler(err, req, res, next){
    if(err.name === 'ValidationError'){
    const messages = Object.values(err.errors).map((e) => e.name === 'CastError' ? `Invalid value for ${e.path}.` : e.message
    )
    return res.status(400).json({error: messages.join(' ')})
    }

    if(err.name === 'CastError') {
        return res.status(400).json({error: `Invalid value for ${err.path}.`})
    }

    if(err.type === 'entity.parse.failed'){
        return res.status(400).json({error: 'Request body is not valid JSON'})
    }
    console.error(err)
    res.status(500).json({error: "Something went wrong on the server."})
}


