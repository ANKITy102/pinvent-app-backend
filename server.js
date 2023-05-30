const dotenv = require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
// const bodyParser = require("body-parser");
const errorHandler = require("./middleware/errorMiddleware")
const cookieParser = require("cookie-parser");
const cors = require("cors");
const userRoute = require("./routes/userRoute")
const productRoute = require("./routes/productRoute")
const contactRoute = require("./routes/contactRoute")
const path = require('path');

const app = express()


//middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }))
// app.use(bodyParser.json());  //no need of body parser
app.use(cors({
    origin: ["http://localhost:3000", "https://pininvent-app.vercel.app"],
    credentials: true
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.get("/", (req, res) => {
    res.send("home page");
})




//routes middleware
app.use("/api/users", userRoute)
app.use("/api/product", productRoute)
app.use("/api/contactus", contactRoute);
//Error middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;


//Connect to mongoDb and start server
mongoose.connect(process.env.MONGO_URI).then(() => {
    app.listen(PORT, () => {
        console.log(`server running on port ${PORT}`)
    })
}).catch((err) => {
    console.log(err)
})