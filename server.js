const express=require("express");
const mongoose=require("mongoose");
const bodyParser=require("body-parser");
const jwt=require("jsonwebtoken");
const cookieparser=require("cookie-parser");
const { ObjectId }=require("mongodb");
const flash=require("connect-flash");
const methodoverride=require("method-override");
const ejs=require("ejs");

const app=express();

app.use(express.static("public"));
app.use(bodyParser.json())
app.set('view engine','ejs');
app.use(methodoverride("_method"));
app.use(cookieparser());
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect("mongodb://localhost:27017/shoes");

const jwtkey = "secret";

const shoeschema={
    Name:String,
    Brand:String,
    Category: String,
    Size:Number,
    Stock:Number,
    Price:Number,
    Description:String,
    Image:String
}

const userschema={
    Firstname:String,
    Lastname:String,
    Phonenumber:Number,
    Gender:String,
    Email:String,
    Address:String,
    Password:String,
    Favourites:[{Productname:String,Productid:ObjectId}]
}

const Product=mongoose.model("Product",shoeschema);
const User=mongoose.model("User",userschema);
let tmp=[];
let nice="";

const activesessions = new Map();

    function checktoken(req,res,next){

        const token = req.cookies.token;

        if(token===undefined)
        {   
            res.redirect("/login");
        }

        jwt.verify(token,jwtkey,function(err,user){
            if(err){
                console.log(err);
                return res.redirect("/login");
            }
            req.user=user;
            next();
        })
    }

    app.get("/home",checktoken,async function(req,res){
        const userid = req.user.userid;
        try{
            const pro = await Product.find({});
            const found = await User.findOne({_id:userid});
            res.render("home",{user:found,Product:pro});
        }
        catch(err){
            console.log(err);
        }
    })

    app.get("/favs",checktoken,async function(req,res){
        const userid =req.user.userid;
        try{

            const Data =[];
            const favs = await User.findOne({_id:userid},{Favourites:1});
            const vals = favs.Favourites;

            for(const val of vals){
                const info = await Product.findOne({_id:val.Productid});
                Data.push(info);
            }
            res.render("favs",{items:Data});
        }
        catch(err){
            console.log(err);
        }
    })

    app.get("/desc/:id",checktoken,async function(req,res){

        const uni = req.params.id;
        
        try{
            const shoe = await Product.findOne({_id:uni});
            const many = await Product.find({Brand:shoe.Brand,_id:{$ne:uni}});
            res.render("desc",{item:shoe,Data:many});
        }
        catch(err){
            console.log(err);
        }
    })

    app.get("/store",checktoken,async function(req,res){
        try{
            const shoes = await Product.find({});
            res.render('store',{Data: shoes,states:tmp,city:tmp,streets:nice});
        }
        catch (err){
            console.log(err);
        }
    })


    app.get("/add",async function(req,res){
        try{
            res.render("addshoe");
        }
        catch (err){
            console.log(err);
        }
    })

    app.get("/login",async function(req,res){
        try{
            res.render("login");
        }
        catch (err){
            console.log(err);
        }
    })

    app.get("/register",function (req,res){
        try{
            res.render("register");
        }
        catch (err){
            console.log(err);
        }
    } )

    app.post("/register",async function(req,res){
        const newuser = new User({
            Firstname: req.body.Firstname,
            Lastname: req.body.Lastname,
            Phonenumber: req.body.Phonenumber,
            Gender: req.body.Gender,
            Email: req.body.Email,
            Address: req.body.Address,
            Password: req.body.Password,
        });

        try{
            await newuser.save();
            res.status(200).send("User Added Successfully");
        }
        catch (err){
            console.log(err);
        }
    })

    app.post("/login",async function(req,res){
        let useremail = req.body.Email;
        let userpassword = req.body.Password;

        try{
            const found = await User.findOne({Email:useremail})
            if(found && found.Password === userpassword)
            {
                const token = jwt.sign({userid:found._id,username:found.Firstname},jwtkey,{expiresIn:"1h"});
                res.cookie("token",token,{httpOnly:true});
                res.redirect("/home");
            }
            else
            {
                res.status(500).send("Error Finding User");
                console.log(found);
                console.log(found.Password);
                console.log(userpassword);
            }
        }
        catch (err){
            console.log(err);
            res.status(500).send("Error Logging In");
        }
    })

    app.post("/add",async function(req,res){
        
        const newpro = new Product({
            Name: req.body.Name,
            Brand: req.body.Brand,
            Category: req.body.Category,
            Size: req.body.Size,
            Stock: req.body.Stock,
            Price: req.body.Price,
            Description: req.body.Description,
            Image: req.body.Image,
        });

        try{
            await newpro.save();
            res.status(200).send("Shoe added successfully");
        }
        catch (err){
            console.log(err);
            res.status(500).send("Error Creating Shoe");
        }
    })

    
    app.post("/store",checktoken,async function(req,res){

        try{
            const cats = req.body.Category;
            const birds = req.body.Brand;
            const spiders = req.body.Size;
            const mins = req.body.Minprice;
            const maxs = req.body.Maxprice;

            let query={};

            if(cats)
            query.Category = cats;
            if(birds)
            query.Brand = birds;
            if(spiders)
            query.Size = spiders;

            if(mins && maxs)
            query.Price = {$gte:mins,$lte:maxs};
            else if(mins)
            query.Price = {$gte:mins};
            else if(maxs)
            query.Price = {$lte:maxs};
            
            const shoes = await Product.find(query);
            res.render("store",{Data:shoes,states:cats,city:birds,streets:spiders});

        }
        catch (err){
            console.log(err);
        }
    })

    app.put("/favs",checktoken,async function(req,res){
        const userid = req.user.userid;
        const shoe = req.body.shoe;
        try{
            const shoedets = await Product.findOne({_id:shoe});
            const result = await User.updateOne({_id:userid},{$push:{Favourites:{Productname:shoedets.Name,Productid:shoedets._id}}});
            res.redirect("/desc/"+shoe);
        }
        catch(err){
            console.log(err);
        }
    })

    app.delete("/favs",checktoken,async function(req,res){
        const userid = req.user.userid;
        const shoe = req.body.shoe;
        try{
            const shoedets = await Product.findOne({_id:shoe});
            const result = await User.updateOne({_id:userid},{$pull:{Favourites:{Productname:shoedets.Name,Productid:shoedets._id}}});
            res.redirect("/favs");
        }
        catch(err){
            console.log(err);
        }
    })

app.listen(3000,function(){
    console.log("Server Running at Port 3000");
})

