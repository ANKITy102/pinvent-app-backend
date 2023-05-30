const asyncHandler = require("express-async-handler")
const User = require("../models/userModel");
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const Token = require("../models/tokenModel");
const crypto = require("crypto")
const sendEmail = require("../utils/sendEmail")
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" })
}



// Register User
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        res.status(400)
        throw new Error("Please fill in all required fields");
    }
    if (password.length < 6) {
        res.status(400)
        throw new Error("Password must be up to 6 characters")
    }

    //Check if user email already exists
    const userExists = await User.findOne({ email })
    if (userExists) {
        res.status(400)
        throw new Error("Enter a valid Email")
    }


    // Create a new user
    const user = await User.create({
        name,
        email,
        password,
    })



    // Generate Token 
    const token = generateToken(user._id)

    //Send HTTP-only cookie
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400), // 1 day
        sameSite: "none",
        secure: true
    })

    if (user) {
        const { _id, name, email, photo, phone, bio } = user
        res.status(201).json({
            _id, name, email, photo, phone, bio, token
        })
    }
    else {
        res.status(400)
        throw new Error("Invalid user data")
    }
})



// Login User
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    //Validate Request
    if (!email || !password) {
        res.status(400)
        throw new Error("Please add email and password");
    }
    //Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
        res.status(400)
        throw new Error("User not found, please signup");
    }
    //User exists, check if password is correct
    const passwordIsCorrect = await bcrypt.compare(password, user.password);


    // Generate Token 
    const token = generateToken(user._id)
    //Send HTTP-only cookie
    if(passwordIsCorrect){
        res.cookie("token", token, {
            path: "/",
            httpOnly: true,
            expires: new Date(Date.now() + 1000 * 86400), // 1 day
            sameSite: "none",
            secure: true
        })
    }
    


    if (user && passwordIsCorrect) {
        const { _id, name, email, photo, phone, bio } = user
        res.status(200).json({
            _id, name, email, photo, phone, bio, token
        })
    }
    else {
        res.status(400)
        throw new Error("Invalid user data");
    }

});



// Logout User
const logout = asyncHandler(async (req, res) => {
    res.cookie("token", "", {
        path: "/",
        httpOnly: true,
        expires: new Date(0), // 1 day
        sameSite: "none",
        secure: true
    })
    return res.status(200).json({
        message: "successfully logout"
    })
})



//Get user data
const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        const { _id, name, email, photo, phone, bio } = user
        res.status(201).json({
            _id, name, email, photo, phone, bio
        })
    }
    else {
        res.status(400)
        throw new Error("User not found")
    }
})



// Get login Status
const loginStatus = asyncHandler(async (req, res) => {
    // const token = req.header("token");
    const token = req.cookies.token;
    if (!token) {
        return res.json(false);
    }
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (verified) {
        return res.json(true);
    }
    return res.json(false);


    // res.send("login ")
})



//Update user
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (user) {
        const { name, email, photo, phone, bio } = user;
        user.email = email;  // this is the database value we don't want the user to change the email
        user.name = req.body.name || name;
        user.phone = req.body.phone || phone;
        user.photo = req.body.photo || photo;
        user.bio = req.body.bio || bio;
        const updatedUser = await user.save();
        res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            photo: updatedUser.photo,
            phone: updatedUser.phone,
            bio: updatedUser.bio,
            token: updatedUser.token
        })
    }
    else {
        res.status(404)
        throw new Error("User not found")
    }
})



// change password
const changePassword = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        res.status(400);
        throw new Error("user not found, please signup")
    }

    const { oldPassword, password } = req.body;
    // validate
    if (!oldPassword || !password) {
        res.status(400);
        throw new Error("Please add old and new password");
    }

    //check if old password matches password in DB
    const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

    //Save new Password
    if (user && passwordIsCorrect) {
        user.password = password
        await user.save();
        // see here we directly saved the password without hashing it 
        // that's because we have add function in userModel so we don't have to right it again anywhere
        res.status(200).send("Password changed successfully")
    } else {
        res.status(400);
        throw new Error("Old password is incorrect")
    }
})


//Forgot password
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        res.status(404);
        throw new Error("User does not exist")
    }


    //Delete token if it exists in DB
    let token = await Token.findOne({ userId: user._id });
    if (token) {
        await token.deleteOne();
    }
    //Create resetToken
    let resetToken = crypto.randomBytes(32).toString("hex") + user._id
    //crypto is the inbuilt nodejs function which we used to create a token


    //Hash token before saving to DB
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");


    //Save token 
    await new Token({
        userId: user._id,
        token: hashedToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * (60 * 1000) // 30 minutes
    }).save();

    //Construct Reset Url 
    const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`

    //Reset Email
    const message = `
    <h2>Hello ${user.name} </h2>
    <p>Please use the url below to reset your password</p>
    <p>This reset link is valid for only 30 minutes</p>
    
    <a href=${resetUrl} clicktracking=off>${resetUrl}</a>

    <p> Regards...</p>
    <p> Pinvent Team</p>
    `

    //subject
    const subject = "Password Reset Request"
    const send_to = user.email
    const send_from = process.env.EMAIL_USER

    try {
        await sendEmail(subject, message, send_to, send_from);
        res.status(200).json({ success: true, meassage: "reset email send" })
    } catch (error) {
        res.status(500)
        throw new Error("Email not send, please try again")
    }
    // res.send("forgot password");
})


const resetPassword = asyncHandler(async (req, res) => {

    const { password } = req.body
    const { resetToken } = req.params

    //Hash token and then compare to token stored in Db
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    //Find token in DB
    const userToken = await Token.findOne({ // In the code snippet you provided, $gt is a       
        token: hashedToken,                 //  MongoDB query operator that stands for "greater than".               
        expiresAt: { $gt: Date.now() }      // It is used to query documents where the value            
    })                                      //  of a field is greater than a specified value. 


    if (!userToken) {
        res.status(404);
        throw new Error("Invalid or Expired Token")
    }

    // Find User
    const user = await User.findOne({ _id: userToken.userId });
    user.password = password
    await user.save()
    res.status(200).json({
        message: "password resest successful, Please Login"
    })
})

module.exports = {
    registerUser,
    loginUser,
    logout,
    getUser,
    loginStatus,
    updateUser,
    changePassword,
    forgotPassword,
    resetPassword
}