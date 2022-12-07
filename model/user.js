const mongoose=require('mongoose');
// creating schema
const proschema=new mongoose.Schema({
    email:{
        type:String,
        unique:true,
        require:true
    },
    username:{
        type:String,
        unique:true,
        require:true
    },
    password:{
        type:String,
        require:true
    },
    image:{
        type:String,
        require:true
    },
    status:{
        type:Number,
        default:0,
        require:true
        },    
    created_at:{
        type:Date,
        default:Date.now
    }
});
module.exports=mongoose.model("user",proschema)