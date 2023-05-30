const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode ? res.statusCode : 500;

    res.status(statusCode)
    res.json({

        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : null,
        // error stack is where the error occur. path of file where error encountered

    })

}
module.exports = errorHandler