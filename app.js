//Include modules
const express=require('express'); 
const exphbs=require('express-handlebars'); 
const csurf=require('csurf'); 
const multer=require('multer');
const path=require('path');
const cookieParser=require('cookie-parser');
const seceret="assd123^&*^&*ghghggh";
const oneDay=1000*60*60*24;
const sessions=require('express-session');
const mongoose=require('mongoose');
const bcrypt=require('bcrypt');
const crypto=require('crypto');
const saltRounds=10;
const nodemailer = require("nodemailer");
const hbs = require('nodemailer-express-handlebars');

// Creating storage for file uploading
const storage=multer.diskStorage({
    destination:function(req,file,cb){
      cb(null,path.join(__dirname,"/upload"))
    },
    filename:function(req,file,cb){
        fileExtension=path.extname(file.originalname);
        cb(null,file.fieldname+"-"+Date.now()+fileExtension)

    }
})

// Validation for file uploading
const upload=multer({storage:storage,
    fileFilter:(req,file,cb)=>{
        if(file.mimetype=="image/png" || file.mimetype=="image/jpeg"){
           cb(null,true)
        }
        else{
           
             cb(new Error("Only png and jpg formet allowed"))
        }
    }});

// create object    
const uploadsingle=upload.single("att")

// create transporter for sending mail
let transporter=nodemailer.createTransport({
    service:"gmail",
    port:587,
    secure:false,
    auth:{
        user:"galineelam10@gmail.com",
        pass:"swfhmwfdmqnzvkqx"
    }
});

// Mail Template
transporter.use('compile', hbs(
    {
        viewEngine:"nodemailer-express-handlebars",
        viewPath:"views/emailTemplates/",
        
    }
));

// middlewarw for csrf
const csrfMiddleware=csurf({
    cookie:true
})

const PORT=9999;
const app=express();

// Connecting database
mongoose.connect('mongodb+srv://neelamgali:Neelam2001@cluster0.ly4sype.mongodb.net/test',{
     useNewUrlParser:true,
     useUnifiedTopology:true
})
const db=mongoose.connection;
db.on('error',(err)=>{throw err});
db.once('open',()=>{console.log("Database created");
})

// Including schema
const userModel=require('./model/user');
const tokenModel=require('./model/token');

// Creting sessions
app.use(sessions({
    secret:seceret,
    saveUninitialized:true,
    cookie:{maxAge:oneDay},
    resave:false
}))

// Parsing data 
app.use(express.json());
app.use(express.urlencoded({extended:false}));

// Template engine
app.engine('handlebars',exphbs.engine())
app.set('view engine','handlebars');
app.set('views','./views');

// static files
app.use(express.static("upload"));

// Csrf 
app.use(cookieParser())
app.use(csrfMiddleware);
var session;

//routes
app.get("/",(req,res)=>{
    // Start session
    session=req.session;
    if(session.username){
    return res.render("home",{uname:session.username})
    }
    else {
        return res.render("login");
    }
})
app.get("/login",(req,res)=>{
    let auth=req.query.msg?true:false;
    if(auth){
        return res.render("login",{errMsg:'Invalid username or password'});
    }
    else{
    return res.render("login",{csrf:req.csrfToken()});
    
    }
})

app.post("/postlogindata",(req,res)=>{
     let {uname,password}=req.body;
     userModel.findOne({username:uname},(err,data) => {
        if (err){
            return res.redirect("/login?msg=fail");
        }
        else if(data == null)
        {
            return res.redirect("/login?msg=fail");
        }
        else{
            // Comparing two values
            if(bcrypt.compareSync(password,data.password)){
                session=req.session;
                session.username=uname;
                console.log(req.session);
                return res.redirect("/welcome");
            }
            else{
                return res.redirect("/login?msg=fail");
            }
        }
     })
})

app.get("/registration",(req,res)=>{
    res.render("registration",{csrf:req.csrfToken()});
    
})

app.get("/changepassword/:id",(req,res)=>{
    uid=req.params.id;
    res.render("changepassword",{id:uid,csrf:req.csrfToken()});
    
})

app.post("/changepass", async(req,res)=>{
    let{oldpass,newpass,id}=req.body;
    // finding user by id
    let data= await userModel.findById({_id:id});
        const isValid= bcrypt.compare(oldpass,data.password);  
        if(isValid){
             // making password encrupt
             const hash = bcrypt.hashSync(newpass, saltRounds);
             // update password
            userModel.updateOne({_id:id},{$set:{password:hash}},{new:true},(err)=>{
                if(err) throw console.log(err);
                else res.redirect("/welcome")
            })
        
    }
    res.render("changepassword",{csrf:req.csrfToken()});
    
})
app.post("/postdata",(req,res)=>{
    //calling object
    uploadsingle(req,res,(err)=>{
        if(err){
           res.render("registration", { errMsg: err.message })
        }
        else{
            // adding data 
            let {email,uname,password}=req.body;
            const hash = bcrypt.hashSync(password, saltRounds);
            let ins=new  userModel({ email: email,username: uname, password: hash,image:req.file.filename });  
         ins.save((err,data)=>{
        if(err) res.render("registration", { errMsg: "User Already Registered" });
        else {
            // Sending mail
            let transporter=nodemailer.createTransport({
                service:"gmail",
                port:587,
                secure:false,
                auth:{
                    user:"galineelam10@gmail.com",
                    pass:"swfhmwfdmqnzvkqx"
                }
            });
            transporter.use('compile',hbs(
                {
                    viewEngine:"nodemailer-express-handlebars",
                    viewPath:"views/emailTemplates/"
                }
            ))
            let mailOptions={
                from:'galineelam10@gmail.com',
                to:email,
                subject:"Testing Mail",
                template:'mail',
                context:{username:uname,id:data._id

                }
            }
            transporter.sendMail(mailOptions,(err,info)=>{
                if(err){ console.log(err)}
                else{
                     console.log("Mail send : "+info)
                }
            })
            res.redirect("/login")
        }
   })
        }
})
})

// welcome page
app.get("/welcome",(req,res)=>{
    let username = req.session.username;
    if (username) {
        userModel.findOne({username:username},(err,data)=>{
            if(err){}
            else {
                return res.render("welcome", { id:data._id,username: username ,path:data.image})
            }
        })
    }
    else {
        return res.redirect("/login");
    }
})

// activate account page
app.get("/activateaccount/:id",(req,res)=>{
    
        let id=req.params.id; 
        userModel.findOne({_id:id},(err,data)=>{
            if(err){
                res.send("Some Thing Went Wrong")
            }
            else {
                userModel.updateOne({_id:id},{$set:{status:1}})
                .then(data1=>{
                    res.render("activate",{username:data.username})
                })
                .catch(err=>{
                    res.send("Some Thing Went Wrong")
                })
            }
        })
})

// logout page
app.get("/logout",(req,res)=>{
    // Session deleted
    req.session.destroy();
    return res.redirect("/login");
})
app.get("/resetpassword",(req,res)=>{
    res.render("resetpassword",{csrf:req.csrfToken()});
})
app.get("/resetaccount",(req,res)=>{
    res.render("resetaccount",{csrf:req.csrfToken(),uid:req.query.id,token:req.query.token});
})


app.post("/postresetpassword",async (req,res)=>{
    let {id,token,password}=req.body;
    // find user in tokenmodel
    let passToken=await tokenModel.findOne({userId:id})
    if(!passToken){
        return res.render("resetaccount",{errMsg:"Pass : Token Expire"})
    }
   
    const isValid=await bcrypt.compare(token,passToken.token);
    if(!isValid){
       return  res.render("resetaccount",{errMsg:"Pass 1 :Token Expire"})
    }
    const hash=await bcrypt.hash(password,Number(saltRounds));
    await userModel.updateOne({
        _id:id},{$set:{password:hash}},{new:true}
    );
    return res.render("resetaccount",{succMsg:"Password Changed"})
})
app.post("/postreset",async (req,res)=>{
    let email=req.body.email;
    let user=await userModel.findOne({email:email});
    if(user){
       let token=await tokenModel.findOne({userId:user._id});
       if(token) await tokenModel.deleteOne();
       let restToken=crypto.randomBytes(32).toString("hex");
       const hash=await bcrypt.hash(restToken,Number(saltRounds));
       await new tokenModel({
        userId:user._id,
        token:hash,
        createdAt:Date.now()
       }).save();
       // Sending mail
       let mailOptions={
        from:'sumitmern123@gmail.com',
        to:email,
        subject:"Rest Link",
        template:'resettemp',
        context:{
        token:restToken,
        id:user._id,
        username:user.uname
        }
    }
    transporter.sendMail(mailOptions,(err,info)=>{
        if(err){ console.log(err)}
        else{
            return res.render("resetpassword",{succMsg:"Rest Link send to your email"});
        }
    })
    }
    else {
        return res.render("resetpassword",{errMsg:"Email is not exists"});
    }
})
app.listen(PORT,(err)=>{
    if(err) throw err 
    else {
         console.log(`Server work on ${PORT}`)
    }
})