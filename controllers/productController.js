const asyncHandler = require("express-async-handler")
const Product = require("../models/productModel");
const { fileSizeFormatter } = require("../utils/fileUpload");
const cloudinary = require("cloudinary").v2;

const createProduct = asyncHandler(async (req, res) => {
    const { name, sku, category, quantity, price, description } = req.body;

    //Validation
    if (!name || !category || !quantity || !price || !description) {
        res.status(400)
        throw new Error("Please fill in all fields");
    }

    //Handle Image upload
    let fileData = {}
    if (req.file) {
        //Save image to cloudinary
        let uploadedFile;
        try {
            uploadedFile = await cloudinary.uploader.upload(req.file.path, {
                folder: "PInvent",
                resource_type: "image"
            })
        } catch (err) {
            res.status(500);
            throw new Error("Image could not be uploaded")
        }

        fileData = {
            fileName: req.file.originalname, //it give like image/jpeg
            filePath: uploadedFile.secure_url,
            fileName: req.file.mimetype,
            filesize: fileSizeFormatter(req.file.size, 2)
        }
    }

    //Create Product
    const product = await Product.create({
        user: req.user.id,
        name,
        sku,
        category,
        quantity,
        price,
        description,
        image: fileData
    })
    // const product = 

    res.status(201).json(product);
})


//get all products
const getProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({ user: req.user.id }).sort("-createdAt");
    res.status(200).json(products);
})


//Get single product
const getProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    // if product doesnt exist
    if (!product) {
        res.status(404)
        throw new Error("product not found");
    }
    // match product with its user
    if (product.user.toString() != req.user.id) {

        res.status(404)
        throw new Error("user not authorized");
    }
    res.status(200).json(product);
})

//Delete Product
const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    // if product doesnt exist
    if (!product) {
        res.status(404)
        throw new Error("product not found");
    }
    // match product with its user
    if (product.user.toString() != req.user.id) {

        res.status(404)
        throw new Error("user not authorized");
    }
    await Product.deleteOne(product);
    res.status(200).json({ message: "Product deleted" });
})

//Update Product 
const updateProduct = asyncHandler(async (req, res) => {
    const { name, category, quantity, price, description } = req.body;
    const { id } = req.params;
    //get product by id
    const product = await Product.findById(req.params.id);
    if (!product) {
        res.status(404)
        throw new Error("product not found");
    }
    // match product with its user
    if (product.user.toString() != req.user.id) {

        res.status(404)
        throw new Error("user not authorized");
    }

    //Handle Image upload
    let fileData = {}
    if (req.file) {
        //Save image to cloudinary
        let uploadedFile;
        try {
            uploadedFile = await cloudinary.uploader.upload(req.file.path, {
                folder: "PInvent",
                resource_type: "image"
            })
        } catch (err) {
            res.status(500);
            throw new Error("Image could not be uploaded")
        }

        fileData = {
            fileName: req.file.originalname,
            filePath: uploadedFile.secure_url,
            fileName: req.file.mimetype,
            filesize: fileSizeFormatter(req.file.size, 2)
        }
    }

    //Update Product
    const updatedProduct = await Product.findByIdAndUpdate(
        { _id: id },
        {
            name,
           
            category,
            quantity,
            price,
            description,
            image: fileData || product.image,
        },
        {
            new:true,
            runValidators: true
        }
    )

    res.status(200).json(updatedProduct);


})

module.exports = {
    createProduct,
    getProducts,
    getProduct,
    deleteProduct,
    updateProduct
}
