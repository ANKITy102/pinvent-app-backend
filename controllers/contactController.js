const asyncHandler = require("express-async-handler")
const User = require("../models/userModel")
const sendEmail = require("../utils/sendEmail")


const contactUs= asyncHandler(async(req,res)=>{
    const {subject, message} = req.body;
    console.log(message)
    const user = await User.findById(req.user._id);
    if(!user){
        res.status(400)
        throw new Error("User not found, please login");
    }

    //validation
    if(!subject || !message){

        res.status(400)
        throw new Error("Please add subject and message");
    }
    
    const send_to = "mahesh9426346889@gmail.com"
    const send_from = process.env.EMAIL_USER
    const reply_to = user.email;
    try {
        await sendEmail(subject, message, send_to, send_from, reply_to);
        res.status(200).json({ success: true, meassage: "email sent" })
    } catch (error) {
        res.status(500)
        throw new Error("Email not send, please try again")
    }
})
 
module.exports ={
    contactUs
}